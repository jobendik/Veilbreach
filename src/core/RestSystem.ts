import type { GameState, RestState } from "./Types";
import { CARD_DB, getCardData } from "../data/cards";
import type { CombatEngine } from "./CombatEngine";

interface RestHost {
  render(): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  playSound(name: "click" | "card" | "block" | "victory"): void;
  saveStable(): void;
  returnToMap(): void;
}

const DEFAULT_HEAL_FRACTION = 0.3;

/**
 * Rest sites let the player choose ONE of two camp services: heal 30% of
 * max HP, or upgrade a card. Once they pick, the rest site is consumed
 * and they return to the map.
 */
export class RestSystem {
  constructor(
    private state: GameState,
    private engine: CombatEngine,
    private host: RestHost
  ) {}

  open(): void {
    const run = this.state.run!;
    const rest: RestState = {
      used: false,
      healAmount: Math.max(1, Math.floor(run.maxHp * DEFAULT_HEAL_FRACTION)),
      canUpgrade: run.deck.some((c) => !c.upgraded && CARD_DB[c.cardId]?.upgrade),
    };
    this.state.rest = rest;
    this.state.screen = "rest";
    this.host.saveStable();
    this.host.render();
  }

  heal(): void {
    const rest = this.state.rest;
    if (!rest || rest.used) return;
    this.engine.healPlayer(rest.healAmount);
    rest.used = true;
    this.host.playSound("block");
    this.host.log(`Rested. Healed ${rest.healAmount} HP.`);
    this.leave();
  }

  finishUpgrade(cardUid: string): void {
    const rest = this.state.rest;
    if (!rest || rest.used) return;
    const card = this.state.run!.deck.find((c) => c.uid === cardUid);
    if (!card || card.upgraded) return;
    if (!CARD_DB[card.cardId]?.upgrade) {
      this.host.toastMessage("That card cannot be upgraded.");
      return;
    }
    card.upgraded = true;
    this.state.run!.upgradedThisRun += 1;
    rest.used = true;
    this.host.log(`Upgraded ${getCardData(card).name} at the campfire.`);
    this.host.playSound("card");
    this.leave();
  }

  leave(): void {
    this.state.rest = null;
    this.host.returnToMap();
  }
}
