import type { GameState, EventChoice, EventState, RelicId, CardInstance } from "./Types";
import { CARD_DB, getCardData } from "../data/cards";
import { CONFIG } from "../data/config";
import { EVENT_DB, COMMON_EVENT_RELICS, type EventChoiceDef, type EventEffectKey } from "../data/events";
import { RELIC_DB } from "../data/relics";
import type { CombatEngine } from "./CombatEngine";
import type { RNG } from "./RNG";

interface EventHost {
  render(): void;
  closeModal(): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  saveStable(): void;
  playSound(name: "victory" | "click" | "relic" | "card"): void;
  returnToMap(): void;
}

/**
 * Pool-driven random event system. Each event definition lives in
 * `data/events.ts`. When a player visits an event node the Game dispatches
 * to `show(eventId)`; the player picks a choice, the EventSystem resolves
 * its effect keys against the run state, and the outcome is shown on the
 * same screen before returning to the map.
 */
export class EventSystem {
  constructor(
    private state: GameState,
    private engine: CombatEngine,
    private rng: RNG,
    private host: EventHost
  ) {}

  /**
   * Show the event for a given eventId. When eventId is null the default
   * Mirror Camp is shown; this is kept for save-file back-compat.
   */
  show(eventId: string | null): void {
    const run = this.state.run!;
    const def = eventId && EVENT_DB[eventId] ? EVENT_DB[eventId] : EVENT_DB.mirror_camp;
    const choices = def.choices.map((c) => this.buildChoice(c, run.gold, run.deck));

    const event: EventState = {
      eventId: def.id,
      title: def.title,
      text: def.text,
      choices,
      resolved: false,
      outcomeText: "",
      used: false,
    };
    this.state.event = event;
    this.state.screen = "event";
    this.host.saveStable();
    this.host.render();
  }

  private buildChoice(def: EventChoiceDef, gold: number, deck: CardInstance[]): EventChoice {
    let disabled = false;
    let reason: string | undefined;
    if (def.goldCost !== undefined && gold < def.goldCost) {
      disabled = true;
      reason = `Needs ${def.goldCost} gold.`;
    }
    if (def.requiresRemovable && deck.length <= CONFIG.minDeckSize) {
      disabled = true;
      reason = "Deck too small to sacrifice a card.";
    }
    return {
      id: def.id,
      label: def.label,
      effectText: def.effectText,
      disabled,
      disabledReason: reason,
    };
  }

  choose(choiceId: string): void {
    const ev = this.state.event;
    if (!ev || ev.resolved || this.state.isResolving) return;
    const def = ev.eventId && EVENT_DB[ev.eventId] ? EVENT_DB[ev.eventId] : null;
    if (!def) {
      this.leave();
      return;
    }
    const choice = def.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const run = this.state.run!;
    if (choice.goldCost !== undefined && run.gold < choice.goldCost) {
      this.host.toastMessage("Not enough gold.");
      return;
    }
    if (choice.requiresRemovable && run.deck.length <= CONFIG.minDeckSize) {
      this.host.toastMessage("Deck is too small to sacrifice.");
      return;
    }

    if (choice.goldCost !== undefined) {
      run.gold -= choice.goldCost;
    }

    for (const key of choice.effects) {
      this.applyEffect(key);
    }

    // An event choice can reduce the player's HP below zero (e.g. Cursed
    // Blade's "lose 8 HP"). Transition to the lose screen immediately rather
    // than leaving the run in a zombie state where the map still renders.
    if (run.hp <= 0) {
      run.hp = 0;
      this.state.event = null;
      this.state.screen = "lose";
      this.host.log("You succumbed to the event's toll.");
      this.host.saveStable();
      this.host.render();
      return;
    }

    ev.resolved = true;
    ev.used = true;
    ev.outcomeText = choice.outcome;
    this.host.playSound("victory");
    this.host.saveStable();
    this.host.render();
  }

  leave(): void {
    this.state.event = null;
    this.host.playSound("click");
    this.host.returnToMap();
  }

  private applyEffect(key: EventEffectKey): void {
    const run = this.state.run!;
    switch (key) {
      case "heal_small":
        this.engine.healPlayer(8);
        this.host.log("Healed 8 HP.");
        break;
      case "heal_medium":
        this.engine.healPlayer(18);
        this.host.log("Healed 18 HP.");
        break;
      case "lose_hp_small":
        this.engine.dealPureDamage(run, 5, null);
        this.host.log("Lost 5 HP.");
        break;
      case "lose_hp_medium":
        this.engine.dealPureDamage(run, 8, null);
        this.host.log("Lost 8 HP.");
        break;
      case "lose_max_hp_small":
        run.maxHp = Math.max(1, run.maxHp - 4);
        run.hp = Math.min(run.hp, run.maxHp);
        this.host.log("Lost 4 max HP.");
        break;
      case "gain_max_hp":
        run.maxHp += 8;
        this.host.log("Gained 8 max HP.");
        break;
      case "gain_gold_small":
        run.gold += 20;
        this.host.log("Gained 20 gold.");
        break;
      case "gain_gold_medium":
        run.gold += 40;
        this.host.log("Gained 40 gold.");
        break;
      case "lose_gold":
        run.gold = Math.max(0, run.gold - 20);
        this.host.log("Lost 20 gold.");
        break;
      case "gain_random_relic":
        this.grantRelic(this.pickRelic(false));
        break;
      case "gain_random_common_relic":
        this.grantRelic(this.pickRelic(true));
        break;
      case "upgrade_random_card": {
        const upgradeable = run.deck.filter((c) => !c.upgraded && CARD_DB[c.cardId]?.upgrade);
        if (upgradeable.length === 0) {
          this.host.log("No upgradeable cards in deck.");
          break;
        }
        const pick = this.rng.choice(upgradeable);
        if (pick) {
          pick.upgraded = true;
          run.upgradedThisRun += 1;
          this.host.log(`Upgraded ${getCardData(pick).name}.`);
          this.host.playSound("card");
        }
        break;
      }
      case "remove_card": {
        if (run.deck.length <= CONFIG.minDeckSize) {
          this.host.log("Deck too small to remove a card.");
          break;
        }
        const pickIdx = Math.floor(this.rng.next() * run.deck.length);
        const removed = run.deck.splice(pickIdx, 1)[0];
        run.removedThisRun += 1;
        this.host.log(`Removed ${getCardData(removed).name}.`);
        break;
      }
      case "leave":
        break;
    }
  }

  private pickRelic(commonOnly: boolean): RelicId | null {
    const run = this.state.run!;
    const owned = new Set(run.relics);
    const pool: RelicId[] = commonOnly
      ? COMMON_EVENT_RELICS.filter((id) => !owned.has(id))
      : Object.values(RELIC_DB).filter((r) => !owned.has(r.id)).map((r) => r.id);
    if (pool.length === 0) return null;
    return this.rng.choice(pool) ?? null;
  }

  private grantRelic(id: RelicId | null): void {
    if (!id) {
      this.host.log("No relic to gain.");
      return;
    }
    this.state.run!.relics.push(id);
    this.host.log(`Gained relic: ${RELIC_DB[id].name}.`);
    this.host.playSound("relic");
  }
}
