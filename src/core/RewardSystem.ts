import type { CardId, GameState, NodeType, RelicId, RewardState } from "./Types";
import { CARD_DB, createCardInstance } from "../data/cards";
import { CONFIG, RARITY_WEIGHT } from "../data/config";
import { RELIC_DB } from "../data/relics";
import { RNG } from "./RNG";
import type { CombatEngine } from "./CombatEngine";
import type { PotionSystem } from "./PotionSystem";

interface RewardHost {
  render(): void;
  playSound(name: "click" | "card" | "victory" | "block" | "relic"): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  closeModal(): void;
  saveStable(): void;
  advance(): void; // advances back to the map / ends the run on boss
}

/**
 * Manages the post-combat reward screen.
 *
 * StS-style reward composition:
 *   - Gold (always, amount scales by encounter tier)
 *   - Card choice (3 by default; may skip)
 *   - Potion drop (40% normal, 100% elite/boss)
 *   - Relic (only after elites and the boss)
 *
 * Camp services (heal / upgrade / remove) live at rest sites and shops
 * respectively, not here. This matches StS structure.
 */
export class RewardSystem {
  private potionSystem: PotionSystem | null = null;

  constructor(
    private state: GameState,
    private engine: CombatEngine,
    private rng: RNG,
    private host: RewardHost
  ) {}

  setPotionSystem(ps: PotionSystem): void {
    this.potionSystem = ps;
  }

  /**
   * Build and show the reward for a combat that just ended. The caller
   * passes the combat type ("monster", "elite", or "boss") so gold/potion/
   * relic rolls can be tier-appropriate.
   */
  createReward(tier: NodeType): void {
    const wasElite = tier === "elite";
    const wasBoss = tier === "boss";

    const cardChoices = wasBoss ? [] : this.generateCardChoices(wasElite);
    const relicOffer: RelicId[] = wasElite || wasBoss ? this.generateRelicChoices(wasBoss ? 3 : 1) : [];
    const goldReward = this.rollGold(tier);
    const potionDrop = this.rollPotion(tier);

    const reward: RewardState = {
      cardChoices,
      relicOffer,
      pickedCard: cardChoices.length === 0,
      pickedRelic: relicOffer.length === 0,
      nextIndex: 0,
      canUpgrade: false,
      canHeal: false,
      canRemove: false,
      isAdvancing: false,
      goldReward,
      goldClaimed: false,
      potionDrop,
      potionClaimed: potionDrop === null,
      wasElite,
      wasBoss,
    };
    this.state.reward = reward;
    this.state.screen = "reward";
    this.engine.fire("onRewardGenerated");
    this.host.saveStable();
    this.host.render();
  }

  private rollGold(tier: NodeType): number {
    if (tier === "boss") return this.rng.int(95, 105);
    if (tier === "elite") return this.rng.int(25, 35);
    return this.rng.int(10, 20);
  }

  private rollPotion(tier: NodeType): string | null {
    if (!this.potionSystem) return null;
    const run = this.state.run;
    if (!run) return null;
    const hasRoom = run.potions.some((p) => p === null);
    if (!hasRoom) return null;
    if (tier === "elite" || tier === "boss") return this.potionSystem.rollRandom();
    if (this.rng.next() < 0.4) return this.potionSystem.rollRandom();
    return null;
  }

  private generateCardChoices(wasElite: boolean): CardId[] {
    const eliteBias = wasElite ? 1.4 : 1.0;
    const entries = Object.values(CARD_DB)
      .filter((c) => c.id !== "strike" && c.id !== "guard")
      .map((card) => ({
        item: card.id,
        weight:
          (RARITY_WEIGHT[card.rarity] ?? 10) *
          (card.rarity === "Common" ? 1 : eliteBias),
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

  private generateRelicChoices(count: number): RelicId[] {
    const owned = new Set(this.state.run!.relics);
    const available = Object.values(RELIC_DB)
      .filter((r) => !owned.has(r.id))
      .map((r) => r.id);
    return this.rng.sample(available, count);
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

  claimGold(): void {
    const reward = this.state.reward;
    const run = this.state.run;
    if (!reward || !run || reward.goldClaimed) return;
    run.gold += reward.goldReward;
    reward.goldClaimed = true;
    this.host.log(`+${reward.goldReward} gold.`);
    this.host.playSound("click");
    this.host.saveStable();
    this.host.render();
  }

  claimPotion(): void {
    const reward = this.state.reward;
    if (!reward || reward.potionClaimed || !reward.potionDrop) return;
    if (!this.potionSystem) return;
    const ok = this.potionSystem.add(reward.potionDrop);
    if (!ok) {
      this.host.toastMessage("Potion slots are full.");
      return;
    }
    reward.potionClaimed = true;
    this.host.saveStable();
    this.host.render();
  }

  /** Called by the Continue button. Advances exactly once. */
  continueReward(): void {
    const reward = this.state.reward;
    if (!reward || reward.isAdvancing) return;
    if (!reward.pickedCard) this.skipCard();
    if (!reward.pickedRelic) reward.pickedRelic = true;
    if (!reward.goldClaimed) this.claimGold();
    reward.isAdvancing = true;
    this.host.advance();
  }

  /* Legacy no-ops kept so any UI button still wired to these can't crash. */
  upgradeDeckCard(_uid: string): void { /* rest-site only */ }
  removeDeckCard(_uid: string): void { /* shop-only */ }
  heal(): void { /* rest-site only */ }
}
