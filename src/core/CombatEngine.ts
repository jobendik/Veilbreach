import type {
  CardInstance,
  CombatEngineLike,
  CombatState,
  DamageContext,
  Encounter,
  EnemyInstance,
  EnemyIntent,
  GameState,
  HookName,
  ResolvedCardData,
  StatusId,
  Unit,
} from "./Types";
import { ENEMY_DB } from "../data/enemies";
import { ENCOUNTERS } from "../data/encounters";
import { CARD_DB, getCardData } from "../data/cards";
import { CONFIG } from "../data/config";
import { STATUS_META, TEMPORARY_STATUSES, TICK_DAMAGE_STATUSES } from "../data/statuses";
import { RNG } from "./RNG";
import { calculateAttackDamage, calculateBlockGain, calculateEnemyAttackDamage } from "./Rules";
import { fireHook } from "./Hooks";
import { runEffect } from "./EffectResolver";

type LogFn = (message: string) => void;

/**
 * A small surface area that the combat engine needs from the outside world.
 * Passing this in avoids circular imports between CombatEngine and UI/Audio.
 */
export interface CombatEngineHost {
  log: LogFn;
  render(): void;
  updateCombat(): void;
  toastMessage(msg: string): void;
  floatAtCenter(msg: string, color?: string): void;
  floatNearUnit(unit: Unit, msg: string, color?: string): void;
  flashUnit(unit: Unit): void;
  animateCardPlay(uid: string): void;
  shakeCard(uid: string): void;
  playSound(name: "click" | "card" | "hit" | "block" | "poison" | "victory" | "defeat" | "relic" | "bossPhase"): void;
  onWin(): void;
  onLose(): void;
  onReward(): void;
  saveStable(): void;
}

export class CombatEngine implements CombatEngineLike {
  public state: GameState;
  private rng: RNG;
  private host: CombatEngineHost;

  constructor(state: GameState, rng: RNG, host: CombatEngineHost) {
    this.state = state;
    this.rng = rng;
    this.host = host;
  }

  setRng(rng: RNG): void {
    this.rng = rng;
  }

  /* -------------------------------------------------------------------- */
  /* Small helpers bridged through to the host                             */
  /* -------------------------------------------------------------------- */

  sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  toastFloatAtCenter(msg: string, color?: string): void {
    this.host.floatAtCenter(msg, color);
  }

  /* -------------------------------------------------------------------- */
  /* Encounter lifecycle                                                   */
  /* -------------------------------------------------------------------- */

  startEncounter(index: number): void {
    const encounter = ENCOUNTERS[index];
    if (!encounter) throw new Error(`Missing encounter index ${index}`);

    const enemies = encounter.enemies.map((enemyId) => this.instantiateEnemy(enemyId));
    const run = this.state.run!;

    // Re-sync the run-level unit fields so enemies and the player share a shape.
    run.block = 0;
    run.statuses = {};

    const combatDeck: CardInstance[] = run.deck.map((c) => ({
      ...c,
      tempCost: null,
    }));

    const combat: CombatState = {
      encounterIndex: index,
      encounterName: encounter.name,
      turn: 0,
      phase: "player",
      energy: CONFIG.startingEnergy,
      handSize: CONFIG.startingHandSize,
      drawPile: this.rng.shuffle(combatDeck),
      hand: [],
      discardPile: [],
      exhaustPile: [],
      enemies,
      powers: { stormEngine: 0 },
      cardsPlayedThisTurn: 0,
      firstTurn: true,
    };
    this.state.combat = combat;
    this.state.selectedCardUid = null;

    this.host.log(`Entered ${encounter.name}.`);
    this.fire("onCombatStart");
    this.ensureEnemyIntents();
    this.startPlayerTurn();
  }

  private instantiateEnemy(enemyId: string): EnemyInstance {
    const def = ENEMY_DB[enemyId];
    if (!def) throw new Error(`Missing enemy data: ${enemyId}`);
    return {
      uid: `enemy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      id: enemyId,
      name: def.name,
      maxHp: def.maxHp,
      hp: def.maxHp,
      block: 0,
      statuses: {},
      intent: null,
      dead: false,
      boss: !!def.boss,
      phaseAnnounced: false,
    };
  }

  ensureEnemyIntents(): void {
    const combat = this.state.combat;
    if (!combat) return;
    for (const enemy of combat.enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      enemy.intent = ENEMY_DB[enemy.id].chooseIntent(enemy, combat, combat.turn);
    }
  }

  /* -------------------------------------------------------------------- */
  /* Turn structure                                                       */
  /* -------------------------------------------------------------------- */

  startPlayerTurn(): void {
    const combat = this.state.combat!;
    const run = this.state.run!;
    combat.turn += 1;
    combat.phase = "player";
    combat.cardsPlayedThisTurn = 0;
    combat.energy = CONFIG.startingEnergy + (combat.powers.stormEngine || 0);

    // PLAYER_TURN_START
    this.processStartOfTurnStatuses(run);

    // If poison/burn killed the player on their own turn, end the run now.
    if (run.hp <= 0) {
      this.loseRun();
      return;
    }

    this.resetTempCosts();
    this.gainBlockFromPlated(run);
    this.fire("onTurnStart");

    if (run.hp > 0) {
      this.drawCards(combat.handSize);
    }

    this.host.log(`Turn ${combat.turn}: Your turn.`);
    this.host.saveStable();
    this.host.render();
  }

  resetTempCosts(): void {
    const combat = this.state.combat!;
    const zones: (keyof CombatState)[] = ["hand", "drawPile", "discardPile", "exhaustPile"];
    for (const zone of zones) {
      const pile = combat[zone] as CardInstance[];
      if (!Array.isArray(pile)) continue;
      pile.forEach((c) => {
        c.tempCost = null;
      });
    }
  }

  /* -------------------------------------------------------------------- */
  /* Drawing                                                              */
  /* -------------------------------------------------------------------- */

  drawCards(amount: number): void {
    const combat = this.state.combat;
    if (!combat) return;
    for (let i = 0; i < amount; i++) {
      if (combat.drawPile.length === 0) {
        if (combat.discardPile.length === 0) break;
        combat.drawPile = this.rng.shuffle(combat.discardPile);
        combat.discardPile = [];
        this.host.log("Discard pile reshuffled into draw pile.");
      }
      const card = combat.drawPile.pop();
      if (card) {
        combat.hand.push(card);
        this.fire("onCardDrawn", { card });
      }
    }
  }

  /* -------------------------------------------------------------------- */
  /* Card play                                                            */
  /* -------------------------------------------------------------------- */

  canPlayCard(card: CardInstance): boolean {
    const combat = this.state.combat;
    if (!combat || combat.phase !== "player") return false;
    if (this.state.isResolving) return false;
    const data = getCardData(card);
    const cost = card.tempCost !== null ? card.tempCost : data.cost;
    return combat.energy >= cost;
  }

  /**
   * Entry point when the player clicks a card in hand.
   * If the card targets an enemy and there's only one, auto-play;
   * otherwise, select the card so the player can click an enemy next.
   */
  async selectOrPlayCard(cardUid: string): Promise<void> {
    if (this.state.isResolving) return;
    const combat = this.state.combat;
    if (!combat) return;
    const card = combat.hand.find((c) => c.uid === cardUid);
    if (!card) return;
    const data = getCardData(card);

    if (!this.canPlayCard(card)) {
      this.host.shakeCard(cardUid);
      this.host.toastMessage("Not enough energy.");
      return;
    }

    this.host.playSound("click");

    if (data.targetType === "enemy") {
      const living = combat.enemies.filter((e) => !e.dead && e.hp > 0);
      if (living.length === 1) {
        await this.playCard(cardUid, living[0].uid);
      } else {
        this.state.selectedCardUid =
          this.state.selectedCardUid === cardUid ? null : cardUid;
        this.host.render();
      }
      return;
    }

    await this.playCard(cardUid, null);
  }

  async playSelectedCardOnEnemy(enemyUid: string): Promise<void> {
    if (this.state.isResolving) return;
    const selected = this.state.selectedCardUid;
    if (!selected) return;
    await this.playCard(selected, enemyUid);
  }

  /**
   * Fully resolve playing a card. Wrapped in the global action lock so
   * the player can't spam clicks during animations.
   */
  async playCard(cardUid: string, enemyUid: string | null): Promise<void> {
    const combat = this.state.combat;
    if (!combat || combat.phase !== "player") return;
    if (this.state.isResolving) return;

    const cardIndex = combat.hand.findIndex((c) => c.uid === cardUid);
    if (cardIndex < 0) return;
    const card = combat.hand[cardIndex];
    if (!this.canPlayCard(card)) return;

    const data = getCardData(card);
    const targetEnemy = enemyUid
      ? combat.enemies.find((e) => e.uid === enemyUid && !e.dead) ?? null
      : null;

    if (data.targetType === "enemy" && !targetEnemy) {
      this.host.toastMessage("Choose a target.");
      return;
    }

    this.state.isResolving = true;
    try {
      const cost = card.tempCost !== null ? card.tempCost : data.cost;
      combat.energy -= cost;
      combat.cardsPlayedThisTurn += 1;
      combat.hand.splice(cardIndex, 1);
      this.state.selectedCardUid = null;

      this.host.animateCardPlay(cardUid);
      this.host.playSound("card");
      this.host.log(`Played ${data.name}.`);

      this.fire("onBeforeCardPlayed", { card, cardData: data });
      await this.resolveCard(card, data, targetEnemy);
      this.fire("onAfterCardPlayed", { card, cardData: data });

      if (data.exhaustSelf || (card as CardInstance & { exhaustSelf?: boolean }).exhaustSelf) {
        combat.exhaustPile.push(card);
        this.host.log(`${data.name} exhausted.`);
        this.fire("onCardExhausted", { card });
      } else {
        combat.discardPile.push(card);
      }

      this.checkEnemyDeaths();

      // If the player was killed by thorns or a card effect, end the run.
      if (this.state.run!.hp <= 0) {
        this.loseRun();
        return;
      }

      // If everything is dead, transition to reward after a beat.
      if (this.areAllEnemiesDefeated()) {
        await this.sleep(240);
        this.winCombat();
        return;
      }
    } finally {
      this.state.isResolving = false;
    }
    this.host.saveStable();
    this.host.render();
  }

  private async resolveCard(
    card: CardInstance,
    data: ResolvedCardData,
    explicitTarget: EnemyInstance | null
  ): Promise<void> {
    for (const effect of data.effects) {
      await runEffect(this, this.state, effect, card, data, explicitTarget);
      this.host.updateCombat();
    }
  }

  /* -------------------------------------------------------------------- */
  /* Damage, block, statuses                                              */
  /* -------------------------------------------------------------------- */

  /** Compute and apply attack damage from the player to a target. */
  dealAttackDamageFromPlayer(
    target: Unit,
    baseAmount: number,
    cardData: ResolvedCardData | null
  ): number {
    const run = this.state.run!;
    const amount = calculateAttackDamage(baseAmount, run, target, cardData);
    return this.applyDamage(target, amount, run, "attack", cardData);
  }

  /**
   * Generic damage application. Fires `onBeforeDamage` / `onAfterDamage` hooks
   * for attack-type damage so relics can modify or react to the hit.
   */
  applyDamage(
    target: Unit,
    amount: number,
    source: Unit | null,
    damageType: "attack" | "status" | "thorns" | "pure",
    cardData?: ResolvedCardData | null
  ): number {
    if (!target || target.dead) return 0;

    // Allow relics to modify the incoming damage amount before it is applied.
    let finalAmount = amount;
    if (damageType === "attack" && source) {
      const dmgCtx: DamageContext = {
        source,
        target,
        cardData: cardData ?? undefined,
        baseAmount: amount,
        amount,
        damageType,
        hits: 1,
      };
      this.fire("onBeforeDamage", { damage: dmgCtx, source, target });
      finalAmount = Math.max(0, dmgCtx.amount);
    }

    const blocked = Math.min(target.block || 0, finalAmount);
    target.block = Math.max(0, (target.block || 0) - blocked);
    const hpDamage = Math.max(0, finalAmount - blocked);
    target.hp = Math.max(0, target.hp - hpDamage);

    this.host.playSound("hit");
    this.host.floatNearUnit(
      target,
      hpDamage > 0 ? `-${hpDamage}` : "Blocked",
      hpDamage > 0 ? "#ff617d" : "#7bd6ff"
    );
    this.host.flashUnit(target);

    // Thorns retaliation: only on real attack damage, from a different unit.
    if (
      source &&
      damageType === "attack" &&
      source !== target &&
      (target.statuses.thorns ?? 0) > 0
    ) {
      const thornDamage = target.statuses.thorns ?? 0;
      source.hp = Math.max(0, source.hp - thornDamage);
      this.host.floatNearUnit(source, `-${thornDamage} Thorns`, "#ffae5a");
      this.host.flashUnit(source);
    }

    if (target.hp <= 0) {
      target.dead = true;
      target.block = 0;
      this.host.log(`${target.name ?? "Player"} was defeated.`);
      if (target !== this.state.run) {
        this.fire("onEnemyKilled", { target });
      }
    }

    // Notify relics that attack damage was dealt (after block absorption).
    if (damageType === "attack" && source) {
      const dmgCtx: DamageContext = {
        source,
        target,
        cardData: cardData ?? undefined,
        baseAmount: amount,
        amount: hpDamage,
        damageType,
        hits: 1,
      };
      this.fire("onAfterDamage", { damage: dmgCtx, source, target });
    }

    return hpDamage;
  }

  gainBlock(unit: Unit, rawAmount: number): void {
    const amount = calculateBlockGain(rawAmount, unit);
    unit.block = (unit.block || 0) + amount;
    this.host.playSound("block");
    this.host.floatNearUnit(unit, `+${amount} Block`, "#7bd6ff");
    this.host.log(`${unit.name ?? "Player"} gained ${amount} block.`);
  }

  addStatus(unit: Unit, status: StatusId, amount: number): void {
    if (!unit.statuses) unit.statuses = {};
    unit.statuses[status] = (unit.statuses[status] ?? 0) + amount;
    const meta = STATUS_META[status];
    const signed = amount >= 0 ? `+${amount}` : String(amount);
    this.host.floatNearUnit(unit, `${meta.label} ${signed}`, "#f5c35b");
    this.host.log(`${unit.name ?? "Player"} gained ${amount} ${status}.`);
  }

  healPlayer(amount: number): void {
    const run = this.state.run!;
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + amount);
    const healed = run.hp - before;
    if (healed > 0) {
      this.host.floatAtCenter(`Healed ${healed}`, "#7af6a3");
      this.host.log(`Healed ${healed} HP.`);
    }
  }

  losePlayerHp(amount: number): void {
    const run = this.state.run!;
    run.hp = Math.max(0, run.hp - amount);
    this.host.floatNearUnit(run, `-${amount} HP`, "#ff617d");
    if (run.hp <= 0) this.loseRun();
  }

  returnDiscardToHand(amount: number, temporaryCost: number): void {
    const combat = this.state.combat;
    if (!combat) return;
    for (let i = 0; i < amount; i++) {
      if (!combat.discardPile.length) break;
      const idx = Math.floor(this.rng.next() * combat.discardPile.length);
      const card = combat.discardPile.splice(idx, 1)[0];
      card.tempCost = temporaryCost;
      combat.hand.push(card);
      this.host.log(`${getCardData(card).name} returned from discard.`);
    }
  }

  upgradeRandomInHand(amount: number): void {
    const combat = this.state.combat;
    if (!combat) return;
    const candidates = combat.hand.filter(
      (c) => !c.upgraded && CARD_DB[c.cardId]?.upgrade
    );
    const chosen = this.rng.sample(candidates, amount);
    for (const card of chosen) {
      card.upgraded = true;
      this.host.log(`${getCardData(card).name} upgraded for this combat.`);
    }
    if (chosen.length) this.host.floatAtCenter("Card upgraded", "#f5c35b");
  }

  gainBlockFromPlated(unit: Unit): void {
    const p = unit.statuses.plated ?? 0;
    if (p > 0) {
      unit.block = (unit.block || 0) + p;
      this.host.floatNearUnit(unit, `+${p} Plate`, "#7bd6ff");
    }
  }

  /* -------------------------------------------------------------------- */
  /* Turn-phase status processing                                         */
  /* -------------------------------------------------------------------- */

  /** Poison/burn tick at start of the afflicted unit's own turn. */
  processStartOfTurnStatuses(unit: Unit): void {
    if (!unit.statuses) unit.statuses = {};
    for (const s of TICK_DAMAGE_STATUSES) {
      const amount = unit.statuses[s] ?? 0;
      if (amount > 0) {
        if (s === "poison") this.host.playSound("poison");
        this.applyDamage(unit, amount, null, "status");
        unit.statuses[s] = Math.max(0, amount - 1);
        if (unit.statuses[s] === 0) delete unit.statuses[s];
      }
    }
  }

  /**
   * Decay temporary statuses (Weak/Vuln/Frail/Mark) at end of the affected
   * unit's own turn. This keeps the "lasts through your turn" feel intuitive.
   */
  processEndOfTurnStatuses(unit: Unit): void {
    if (!unit.statuses) return;
    for (const s of TEMPORARY_STATUSES) {
      const amount = unit.statuses[s] ?? 0;
      if (amount > 0) {
        unit.statuses[s] = amount - 1;
        if ((unit.statuses[s] ?? 0) <= 0) delete unit.statuses[s];
      }
    }
  }

  /* -------------------------------------------------------------------- */
  /* End turn / enemy turn                                                */
  /* -------------------------------------------------------------------- */

  async endTurn(): Promise<void> {
    if (this.state.isResolving) return;
    const combat = this.state.combat;
    if (!combat || combat.phase !== "player") return;

    this.state.isResolving = true;
    try {
      this.host.playSound("click");
      combat.phase = "enemy";
      this.state.selectedCardUid = null;

      // PLAYER_TURN_END
      this.processEndOfTurnStatuses(this.state.run!);
      this.fire("onTurnEnd");

      // Discard hand, lose leftover block.
      while (combat.hand.length) combat.discardPile.push(combat.hand.pop()!);
      this.state.run!.block = 0;
      this.host.log("You ended your turn.");
      this.host.render();

      await this.sleep(300);
      await this.enemyTurn();
    } finally {
      this.state.isResolving = false;
    }
  }

  private async enemyTurn(): Promise<void> {
    const combat = this.state.combat;
    const player = this.state.run;
    if (!combat || !player) return;

    for (const enemy of combat.enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      enemy.block = 0;

      // ENEMY_TURN_START
      this.processStartOfTurnStatuses(enemy);
      if (enemy.hp <= 0) {
        enemy.dead = true;
        continue;
      }
      this.gainBlockFromPlated(enemy);

      // ENEMY_ACTION
      await this.executeEnemyIntent(enemy);

      if (player.hp <= 0) {
        this.loseRun();
        return;
      }

      // ENEMY_TURN_END — ritual triggers here before decay.
      if ((enemy.statuses.ritual ?? 0) > 0) {
        this.addStatus(enemy, "strength", enemy.statuses.ritual!);
      }
      this.processEndOfTurnStatuses(enemy);

      await this.sleep(240);
    }

    this.checkEnemyDeaths();
    if (this.areAllEnemiesDefeated()) {
      this.winCombat();
      return;
    }

    // Start next player turn.
    this.ensureEnemyIntents();
    this.startPlayerTurn();
  }

  private async executeEnemyIntent(enemy: EnemyInstance): Promise<void> {
    const combat = this.state.combat!;
    const player = this.state.run!;
    const intent: EnemyIntent =
      enemy.intent ?? ENEMY_DB[enemy.id].chooseIntent(enemy, combat, combat.turn);

    this.host.log(`${enemy.name} uses ${intent.label}.`);
    this.host.floatNearUnit(enemy, intent.label, "#d8e6ff");

    switch (intent.type) {
      case "attack": {
        this.enemyAttack(enemy, intent.amount);
        break;
      }
      case "multiAttack": {
        for (let i = 0; i < intent.hits; i++) {
          this.enemyAttack(enemy, intent.amount);
          await this.sleep(120);
          if (player.hp <= 0) break;
        }
        break;
      }
      case "defend": {
        enemy.block = (enemy.block || 0) + intent.amount;
        this.host.floatNearUnit(enemy, `+${intent.amount} Block`, "#7bd6ff");
        break;
      }
      case "buff": {
        this.addStatus(enemy, intent.status, intent.amount);
        break;
      }
      case "debuff": {
        this.addStatus(player, intent.status, intent.amount);
        break;
      }
      case "attackDebuff": {
        this.enemyAttack(enemy, intent.amount);
        if (player.hp > 0) this.addStatus(player, intent.status, intent.statusAmount);
        break;
      }
      case "defendBuff": {
        enemy.block = (enemy.block || 0) + intent.amount;
        this.addStatus(enemy, intent.status, intent.statusAmount);
        this.host.floatNearUnit(enemy, `+${intent.amount} Block`, "#7bd6ff");
        break;
      }
      case "bossPhase": {
        enemy.block = (enemy.block || 0) + intent.blockGain;
        this.addStatus(enemy, intent.status, intent.amount);
        enemy.phaseAnnounced = true;
        this.host.playSound("bossPhase");
        this.host.floatAtCenter("The Seraph awakens", "#ff70bd");
        break;
      }
    }

    this.host.updateCombat();
  }

  private enemyAttack(enemy: EnemyInstance, base: number): void {
    const player = this.state.run!;
    const amount = calculateEnemyAttackDamage(base, enemy, player);
    this.applyDamage(player, amount, enemy, "attack");
  }

  /* -------------------------------------------------------------------- */
  /* Win/lose                                                             */
  /* -------------------------------------------------------------------- */

  checkEnemyDeaths(): void {
    const combat = this.state.combat;
    if (!combat) return;
    for (const enemy of combat.enemies) {
      if (enemy.hp <= 0 && !enemy.dead) {
        enemy.dead = true;
        enemy.block = 0;
      }
    }
  }

  areAllEnemiesDefeated(): boolean {
    const combat = this.state.combat;
    if (!combat) return false;
    return combat.enemies.every((e) => e.dead || e.hp <= 0);
  }

  winCombat(): void {
    const combat = this.state.combat!;
    const encounter: Encounter = ENCOUNTERS[combat.encounterIndex];
    this.host.log(`${encounter.name} cleared.`);
    this.state.run!.defeated += 1;
    this.state.run!.block = 0;
    this.state.run!.statuses = {};
    this.fire("onCombatReward");

    if (encounter.type === "boss") {
      this.state.screen = "win";
      this.host.playSound("victory");
      this.host.render();
      this.host.onWin();
      return;
    }

    this.host.onReward();
  }

  loseRun(): void {
    this.state.screen = "lose";
    this.host.playSound("defeat");
    this.host.render();
    this.host.onLose();
  }

  /* -------------------------------------------------------------------- */
  /* Hook helper                                                          */
  /* -------------------------------------------------------------------- */

  fire(hook: HookName, extra: Parameters<typeof fireHook>[3] = {}): void {
    fireHook(this.state, this, hook, extra);
  }
}
