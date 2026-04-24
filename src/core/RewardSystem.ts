import type { CardId, GameState, RelicId, RewardState } from "./Types";
import { CARD_DB, createCardInstance, getCardData } from "../data/cards";
import { CONFIG, RARITY_WEIGHT } from "../data/config";
import { RELIC_DB } from "../data/relics";
import { RNG } from "./RNG";
import type { CombatEngine } from "./CombatEngine";

interface RewardHost {
  render(): void;
  playSound(name: "click" | "card" | "victory" | "block" | "relic"): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  closeModal(): void;
  saveStable(): void;
  advance(): void; // advances to next encounter or to the event screen
}

/**
 * Manages the reward screen and its optional services.
 *
 * Reward progression is intentionally deterministic:
 *   - choosing or skipping a card marks the card reward resolved
 *   - choosing a relic marks the relic reward resolved
 *   - the player must click "Continue" to advance (no auto-advance timers)
 *   - the isAdvancing flag prevents double clicks from double-starting
 *     the next encounter.
 */
export class RewardSystem {
  constructor(
    private state: GameState,
    private engine: CombatEngine,
    private rng: RNG,
    private host: RewardHost
  ) {}

  createReward(): void {
    const run = this.state.run!;
    const nextIndex = run.encounterIndex + 1;
    const cardChoices = this.generateCardChoices();
    // Offer a relic every two clears; the original game used `defeated === 2`.
    const relicOffer: RelicId[] = run.defeated === 2 ? this.generateRelicChoices() : [];
    const reward: RewardState = {
      cardChoices,
      relicOffer,
      pickedCard: false,
      pickedRelic: relicOffer.length === 0,
      nextIndex,
      canUpgrade: true,
      canHeal: true,
      canRemove: true,
      isAdvancing: false,
    };
    this.state.reward = reward;
    this.state.screen = "reward";
    this.engine.fire("onRewardGenerated");
    this.host.saveStable();
    this.host.render();
  }

  private generateCardChoices(): CardId[] {
    const entries = Object.values(CARD_DB)
      .filter((c) => c.id !== "strike" && c.id !== "guard")
      .map((card) => ({
        item: card.id,
        weight: RARITY_WEIGHT[card.rarity] ?? 10,
      }));

    const chosen: CardId[] = [];
    let guard = 0;
    while (chosen.length < CONFIG.rewardCardChoices && guard < 200) {
      guard++;
      const id = this.rng.weightedChoice(entries);
      if (!chosen.includes(id)) chosen.push(id);
    }
    return chosen;
  }

  private generateRelicChoices(): RelicId[] {
    const owned = new Set(this.state.run!.relics);
    const available = Object.values(RELIC_DB)
      .filter((r) => !owned.has(r.id))
      .map((r) => r.id);
    return this.rng.sample(available, 3);
  }

  chooseCard(cardId: CardId): void {
    const reward = this.state.reward;
    if (!reward || reward.pickedCard || this.state.isResolving) return;
    this.state.run!.deck.push(createCardInstance(cardId));
    reward.pickedCard = true;
    this.host.log(`Added ${CARD_DB[cardId].name} to deck.`);
    this.host.playSound("card");
    this.host.saveStable();
    this.host.render();
  }

  skipCard(): void {
    const reward = this.state.reward;
    if (!reward || reward.pickedCard || this.state.isResolving) return;
    reward.pickedCard = true;
    this.host.log("Skipped card reward.");
    this.host.playSound("click");
    this.host.saveStable();
    this.host.render();
  }

  chooseRelic(relicId: RelicId): void {
    const reward = this.state.reward;
    if (!reward || reward.pickedRelic || this.state.isResolving) return;
    if (!RELIC_DB[relicId]) return;
    this.state.run!.relics.push(relicId);
    reward.pickedRelic = true;
    this.host.log(`Gained relic: ${RELIC_DB[relicId].name}.`);
    this.host.playSound("victory");
    this.host.saveStable();
    this.host.render();
  }

  upgradeDeckCard(cardUid: string): void {
    const reward = this.state.reward;
    if (!reward?.canUpgrade || this.state.isResolving) return;
    const card = this.state.run!.deck.find((c) => c.uid === cardUid);
    if (!card || card.upgraded) return;
    if (!CARD_DB[card.cardId]?.upgrade) {
      this.host.toastMessage("That card cannot be upgraded.");
      return;
    }
    card.upgraded = true;
    this.state.run!.upgradedThisRun += 1;
    reward.canUpgrade = false;
    this.host.log(`Upgraded ${getCardData(card).name}.`);
    this.host.playSound("card");
    this.host.closeModal();
    this.host.saveStable();
    this.host.render();
  }

  removeDeckCard(cardUid: string): void {
    const reward = this.state.reward;
    if (!reward?.canRemove || this.state.isResolving) return;
    const deck = this.state.run!.deck;
    if (deck.length <= CONFIG.minDeckSize) {
      this.host.toastMessage("Deck is too small to remove more cards.");
      return;
    }
    const idx = deck.findIndex((c) => c.uid === cardUid);
    if (idx < 0) return;
    const removed = deck.splice(idx, 1)[0];
    this.state.run!.removedThisRun += 1;
    reward.canRemove = false;
    this.host.log(`Removed ${getCardData(removed).name}.`);
    this.host.playSound("click");
    this.host.closeModal();
    this.host.saveStable();
    this.host.render();
  }

  heal(): void {
    const reward = this.state.reward;
    if (!reward?.canHeal || this.state.isResolving) return;
    this.engine.healPlayer(10);
    reward.canHeal = false;
    this.host.playSound("block");
    this.host.saveStable();
    this.host.render();
  }

  /**
   * Called by the Continue button. Advances exactly once.
   */
  continueReward(): void {
    const reward = this.state.reward;
    if (!reward || reward.isAdvancing) return;
    // Auto-skip any un-chosen required selections so Continue always works.
    if (!reward.pickedCard) this.skipCard();
    if (!reward.pickedRelic) {
      // If a relic was offered but the player never chose, treat as skipped.
      reward.pickedRelic = true;
    }
    reward.isAdvancing = true;
    this.host.advance();
  }
}
