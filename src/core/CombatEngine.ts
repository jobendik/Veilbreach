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
  NodeType,
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
  onReward(tier: NodeType): void;
  saveStable(): void;
}

export class CombatEngine implements CombatEngineLike {
  /** Deterministic counter used for enemy UIDs. */
  private static __enemyUidCounter = 0;
  public state: GameState;
  public rng: RNG;
  private host: CombatEngineHost;
  /** Guard against recursive thorns retaliation between two thorned units. */
  private applyingThorns = false;
  /** Tier of the currently active combat, set at encounter start. */
  private currentTier: NodeType = "monster";
  /** Name of the just-cleared encounter for the reward/log message. */
  private currentName: string = "";

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
    const tier: NodeType = encounter.type === "boss" ? "boss" : "monster";
    this.currentTier = tier;
    this.currentName = encounter.name;
    this.startEncounterInternal(index, encounter.name, encounter.enemies);
  }

  /**
   * Start a combat whose enemies come from a map node rather than the flat
   * ENCOUNTERS list.
   */
  startEncounterFromNode(name: string, enemyIds: string[], tier: NodeType): void {
    this.currentTier = tier;
    this.currentName = name;
    this.startEncounterInternal(-1, name, enemyIds);
  }

  private startEncounterInternal(index: number, name: string, enemyIds: string[]): void {
    const enemies = enemyIds.map((enemyId) => this.instantiateEnemy(enemyId));
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
      encounterName: name,
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
      breach: 0,
      breachMax: 10,
      veilOpenings: 0,
      veilEmpoweredStacks: 0,
    };
    this.state.combat = combat;
    this.state.selectedCardUid = null;
    this.state.selectedPotionSlot = null;

    // Innate: pre-place innate cards from the draw pile into the opening hand
    // so they're always drawn on turn 1. Excess innate cards beyond handSize
    // still fill the hand; normal draws fill the rest.
    const innateIndices: number[] = [];
    combat.drawPile.forEach((c, i) => {
      const d = getCardData(c);
      if (d.innate) innateIndices.push(i);
    });
    // Pull from end so splice indices stay valid.
    for (let i = innateIndices.length - 1; i >= 0; i--) {
      const [card] = combat.drawPile.splice(innateIndices[i], 1);
      combat.hand.push(card);
    }

    this.host.log(`Entered ${name}.`);
    this.fire("onCombatStart");
    // NOTE: enemy intents are now generated inside startPlayerTurn() AFTER
    // the turn counter is incremented, so the displayed turn and the intent's
    // turn argument always match. Do not call ensureEnemyIntents here.
    this.startPlayerTurn();
  }

  private instantiateEnemy(enemyId: string): EnemyInstance {
    const def = ENEMY_DB[enemyId];
    if (!def) throw new Error(`Missing enemy data: ${enemyId}`);
    return {
      uid: `enemy_${++CombatEngine.__enemyUidCounter}`,
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

    // Generate enemy intents FIRST — now using the correct (already incremented)
    // turn number. Previously intents were computed against turn-1 which made
    // "turn === 1" and "turn % 3 === 0" patterns fire one action early.
    this.ensureEnemyIntents();

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
      // On turn 1, innate cards may already occupy hand slots. On later turns
      // retained cards may remain. In both cases draw up to handSize total.
      const toDraw = Math.max(0, combat.handSize - combat.hand.length);
      if (toDraw > 0) this.drawCards(toDraw);
    }

    // Fired AFTER the opening/auto draw so relics that care about the final
    // hand (e.g. Paper Moon's turn-1 extra card, Cracked Lens's per-turn
    // bonus draw, Stasis Coil's opening upgrade) don't get absorbed by the
    // auto draw-to-handsize above.
    this.fire("onAfterTurnDraw");

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
    // Let relics optionally reduce cost (e.g. Iron Will) before the check.
    this.fire("onCalculateCardCost", { card, cardData: data });
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
      // Fire the cost hook BEFORE subtracting energy so relics (e.g. Iron
      // Will) that set tempCost = 0 actually make the first card free.
      this.fire("onCalculateCardCost", { card, cardData: data });
      const cost = card.tempCost !== null ? card.tempCost : data.cost;
      combat.energy -= cost;
      combat.cardsPlayedThisTurn += 1;
      combat.hand.splice(cardIndex, 1);
      this.state.selectedCardUid = null;

      this.host.animateCardPlay(cardUid);
      this.host.playSound("card");
      this.host.log(`Played ${data.name}.`);

      this.fire("onBeforeCardPlayed", { card, cardData: data, target: targetEnemy ?? undefined });
      await this.resolveCard(card, data, targetEnemy);
      this.fire("onAfterCardPlayed", { card, cardData: data, target: targetEnemy ?? undefined });

      // Breach gain: every card played feeds the Veil meter.
      this.gainBreach(1, "card");

      if (data.exhaustSelf || (card as CardInstance & { exhaustSelf?: boolean }).exhaustSelf) {
        combat.exhaustPile.push(card);
        this.host.log(`${data.name} exhausted.`);
        this.fire("onCardExhausted", { card });
        this.gainBreach(1, "exhaust");
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
    let amount = calculateAttackDamage(baseAmount, run, target, cardData);
    // Veil empowerment: consume one stack per attack-damage call for +50%.
    const combat = this.state.combat;
    if (combat && combat.veilEmpoweredStacks > 0 && amount > 0) {
      amount = Math.round(amount * 1.5);
      combat.veilEmpoweredStacks -= 1;
    }
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
      // Guard against relic hooks setting an invalid (NaN / Infinity) amount.
      finalAmount = Number.isFinite(dmgCtx.amount) ? Math.max(0, dmgCtx.amount) : amount;
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
    // Route through applyDamage with a thorns flag so death triggers (onEnemyKilled)
    // and future hooks fire consistently. Guarded against recursion to prevent
    // two thorned units from bouncing damage forever.
    if (
      source &&
      damageType === "attack" &&
      source !== target &&
      (target.statuses.thorns ?? 0) > 0 &&
      !this.applyingThorns
    ) {
      const thornDamage = target.statuses.thorns ?? 0;
      this.applyingThorns = true;
      try {
        this.applyDamage(source, thornDamage, target, "thorns");
        this.host.floatNearUnit(source, `${thornDamage} Thorns`, "#ffae5a");
      } finally {
        this.applyingThorns = false;
      }
    }

    if (target.hp <= 0) {
      target.dead = true;
      target.block = 0;
      this.host.log(`${target.name ?? "Player"} was defeated.`);
      if (target !== this.state.run) {
        this.fire("onEnemyKilled", { target });
      }
    }

    // Notify relics that damage was dealt (after block absorption). Fires for
    // ALL damage types so hooks like Thorn Crown (which reacts to status
    // ticks) run. Listeners are expected to filter by damageType themselves.
    {
      const dmgCtx: DamageContext = {
        source,
        target,
        cardData: cardData ?? undefined,
        baseAmount: amount,
        amount: hpDamage,
        damageType,
        hits: 1,
      };
      this.fire("onAfterDamage", { damage: dmgCtx, source: source ?? undefined, target });
      if (damageType === "status") {
        this.fire("onStatusTickDamage", { damage: dmgCtx, target });
      }
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
    // Breach: applying a debuff/damage-over-time to an enemy feeds the meter.
    const combat = this.state.combat;
    const run = this.state.run;
    if (
      combat &&
      run &&
      unit !== run &&
      amount > 0 &&
      (status === "poison" ||
        status === "burn" ||
        status === "mark" ||
        status === "vulnerable" ||
        status === "weak" ||
        status === "frail")
    ) {
      this.gainBreach(1, "status");
    }
  }

  /** Add Breach to the meter. Fires `onBreachGained`; caps at breachMax. */
  gainBreach(amount: number, source: "card" | "status" | "exhaust" | "relic" | "manual" = "manual"): void {
    const combat = this.state.combat;
    if (!combat || amount <= 0) return;
    const before = combat.breach;
    combat.breach = Math.min(combat.breachMax, combat.breach + amount);
    const gained = combat.breach - before;
    if (gained <= 0) return;
    this.fire("onBreachGained");
    // Small float on the first time the meter fills.
    if (before < combat.breachMax && combat.breach >= combat.breachMax) {
      this.host.floatAtCenter("Veil Primed — Open the Veil!", "#b98cff");
      this.host.playSound("relic");
    }
    void source;
  }

  /** Spend a full Breach meter to unleash the signature ability. */
  openVeil(): void {
    const combat = this.state.combat;
    const run = this.state.run;
    if (!combat || !run) return;
    if (combat.breach < combat.breachMax) return;
    if (combat.phase !== "player") return;
    if (this.state.isResolving) return;

    combat.breach = 0;
    combat.veilOpenings += 1;
    combat.energy += 1;
    combat.veilEmpoweredStacks = Math.max(combat.veilEmpoweredStacks, 2);

    this.host.playSound("relic");
    this.host.floatAtCenter("The Veil opens.", "#c8a8ff");
    this.host.log("You tore open the Veil — +1 Energy, draw 2, empowered cards and a wave of pain.");

    // Tick all burn/poison on living enemies for one free tick.
    for (const enemy of combat.enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      const burn = enemy.statuses.burn ?? 0;
      if (burn > 0) {
        this.applyDamage(enemy, burn, null, "status");
      }
    }
    for (const enemy of combat.enemies) {
      if (enemy.dead || enemy.hp <= 0) continue;
      const poison = enemy.statuses.poison ?? 0;
      if (poison > 0) {
        this.applyDamage(enemy, poison, null, "status");
        enemy.statuses.poison = Math.max(0, poison - 1);
      }
    }

    this.drawCards(2);
    this.fire("onVeilOpened");

    // Clean up any kills that happened during the burst.
    this.checkEnemyDeaths();
    if (this.areAllEnemiesDefeated()) {
      this.winCombat();
      return;
    }
    this.host.saveStable();
    this.host.render();
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

  /** Direct pure damage used by relic hooks (bypasses strength/vulnerable). */
  dealPureDamage(target: Unit, amount: number, source: Unit | null = null): void {
    if (target.dead || target.hp <= 0) return;
    if (amount <= 0) return;
    this.applyDamage(target, amount, source, "pure");
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
      // Veil empowerment is a single-turn window — expire any leftovers.
      combat.veilEmpoweredStacks = 0;

      // Discard hand, honoring Retain (cards stay), lose leftover block.
      const retained: CardInstance[] = [];
      while (combat.hand.length) {
        const card = combat.hand.pop()!;
        const data = getCardData(card);
        if (data.retain) {
          retained.push(card);
        } else {
          combat.discardPile.push(card);
        }
      }
      // Put retained cards back in order.
      while (retained.length) combat.hand.push(retained.pop()!);
      this.state.run!.block = 0;
      this.host.log("You ended your turn.");
      this.host.render();

      await this.sleep(300);
      await this.enemyTurn();
    } finally {
      this.state.isResolving = false;
      // Re-render so the `is-resolving` CSS class (which blocks pointer
      // events on the hand and enemies) is cleared. Without this the
      // player's new turn would render with the class still attached and
      // the whole UI would appear unresponsive.
      this.host.render();
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

    // Start next player turn — intents are refreshed inside startPlayerTurn()
    // after the turn counter is incremented.
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
    const tier = this.currentTier;
    const name = this.currentName || (combat.encounterIndex >= 0 ? ENCOUNTERS[combat.encounterIndex]?.name : "") || "Combat";
    this.host.log(`${name} cleared.`);
    this.state.run!.defeated += 1;
    if (tier === "elite") this.state.run!.elitesKilled += 1;
    this.state.run!.block = 0;
    this.state.run!.statuses = {};
    this.fire("onCombatReward");

    this.state.combat = null;
    this.state.selectedCardUid = null;
    this.state.selectedPotionSlot = null;

    if (tier === "boss") {
      this.state.screen = "win";
      this.host.playSound("victory");
      this.host.render();
      this.host.onWin();
      return;
    }

    this.host.onReward(tier);
  }

  loseRun(): void {
    this.state.combat = null;
    this.state.selectedCardUid = null;
    this.state.selectedPotionSlot = null;
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
