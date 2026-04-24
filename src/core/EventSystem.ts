import type { GameState } from "./Types";
import { CARD_DB, getCardData } from "../data/cards";
import { CONFIG } from "../data/config";
import type { CombatEngine } from "./CombatEngine";

interface EventHost {
  render(): void;
  closeModal(): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  saveStable(): void;
  startEncounter(index: number): void;
  playSound(name: "victory" | "click"): void;
}

/**
 * The mid-run "Mirror Camp" event. The player may rest, refine a card,
 * or sacrifice a card before progressing to the final encounter.
 */
export class EventSystem {
  constructor(
    private state: GameState,
    private engine: CombatEngine,
    private host: EventHost
  ) {}

  show(): void {
    this.state.screen = "event";
    this.state.event = {
      title: "The Mirror Camp",
      text:
        "A quiet camp flickers inside a cracked reflection. You may rest, refine a card, or sacrifice a memory before the path bends toward the final gate.",
      used: false,
    };
    this.host.saveStable();
    this.host.render();
  }

  rest(): void {
    const ev = this.state.event;
    if (!ev || ev.used || this.state.isResolving) return;
    this.engine.healPlayer(18);
    ev.used = true;
    this.continueAfter();
  }

  finishUpgrade(cardUid: string): void {
    const ev = this.state.event;
    if (!ev || ev.used || this.state.isResolving) return;
    const card = this.state.run!.deck.find((c) => c.uid === cardUid);
    if (!card || card.upgraded) return;
    if (!CARD_DB[card.cardId]?.upgrade) {
      this.host.toastMessage("That card cannot be upgraded.");
      return;
    }
    card.upgraded = true;
    ev.used = true;
    this.host.log(`The mirror upgraded ${getCardData(card).name}.`);
    this.host.closeModal();
    this.continueAfter();
  }

  finishRemove(cardUid: string): void {
    const ev = this.state.event;
    if (!ev || ev.used || this.state.isResolving) return;
    const deck = this.state.run!.deck;
    if (deck.length <= CONFIG.minDeckSize) {
      this.host.toastMessage("Deck is too small to sacrifice more cards.");
      return;
    }
    const idx = deck.findIndex((c) => c.uid === cardUid);
    if (idx < 0) return;
    const removed = deck.splice(idx, 1)[0];
    ev.used = true;
    this.host.log(`Sacrificed ${getCardData(removed).name}.`);
    this.host.closeModal();
    this.continueAfter();
  }

  private continueAfter(): void {
    // Flow: the event fires AFTER winning encounter 1 (nextIndex === 2),
    // and continuing from it advances the run to encounter 2 (Chapel of Wires).
    // The boss (encounter 3) comes after that encounter's own reward.
    this.host.playSound("victory");
    this.state.run!.encounterIndex = 2;
    this.state.reward = null;
    this.state.event = null;
    this.state.screen = "combat";
    this.host.saveStable();
    // A tiny pause so the UI can animate the transition.
    setTimeout(() => this.host.startEncounter(2), 300);
  }
}
