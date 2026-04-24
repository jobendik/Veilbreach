import type { CardId, GameState, RelicId, ShopCardItem, ShopPotionItem, ShopRelicItem, ShopState } from "./Types";
import { CARD_DB, createCardInstance, getCardData } from "../data/cards";
import { RELIC_DB } from "../data/relics";
import { POTION_DB, COMMON_POTION_IDS, UNCOMMON_POTION_IDS, RARE_POTION_IDS } from "../data/potions";
import { SHOP_BASE_PRICES, SHOP_INVENTORY } from "../data/shop";
import { CONFIG } from "../data/config";
import type { RNG } from "./RNG";

interface ShopHost {
  render(): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  playSound(name: "click" | "card" | "victory" | "relic"): void;
  saveStable(): void;
  /** Returns to the map after the player leaves the shop. */
  returnToMap(): void;
  /** Add a potion to the player's slots if space exists. */
  addPotion(id: string): boolean;
}

/**
 * Handles shop generation and purchases. A shop is tied to the specific
 * map node the player entered; leaving the shop returns to the map but
 * leaves the shop state in place so revisits are cheap (though the StS
 * rule is you cannot revisit — see Game.visitNode).
 */
export class ShopSystem {
  constructor(
    private state: GameState,
    private rng: RNG,
    private host: ShopHost
  ) {}

  open(): void {
    this.state.shop = this.generateShop();
    this.state.screen = "shop";
    this.host.saveStable();
    this.host.render();
  }

  close(): void {
    this.host.playSound("click");
    this.state.shop = null;
    this.host.returnToMap();
  }

  private generateShop(): ShopState {
    const run = this.state.run!;
    const owned = new Set(run.relics);

    // Cards — 5 by weighted rarity, excluding starters the player already has too many of.
    const cardPool = Object.values(CARD_DB).filter(
      (c) => c.id !== "strike" && c.id !== "guard"
    );
    const pickedCards = this.rng.sample(cardPool, SHOP_INVENTORY.cardCount);
    const cards: ShopCardItem[] = pickedCards.map((c) => ({
      kind: "card",
      cardId: c.id,
      price: this.jitter(SHOP_BASE_PRICES.card[c.rarity]),
    }));

    // Relics — up to 3, skipping anything already owned.
    const relicPool = Object.values(RELIC_DB).filter((r) => !owned.has(r.id));
    const pickedRelics = this.rng.sample(relicPool, SHOP_INVENTORY.relicCount);
    const relics: ShopRelicItem[] = pickedRelics.map((r) => ({
      kind: "relic",
      relicId: r.id,
      // Shop relics don't carry a rarity field, so use a base average price.
      price: this.jitter(SHOP_BASE_PRICES.relic.Uncommon),
    }));

    // Potions — 3 mixed by rarity.
    const potionPool = [...COMMON_POTION_IDS, ...UNCOMMON_POTION_IDS, ...RARE_POTION_IDS];
    const pickedPotions = this.rng.sample(potionPool, SHOP_INVENTORY.potionCount);
    const potions: ShopPotionItem[] = pickedPotions.map((p) => ({
      kind: "potion",
      potionId: p,
      price: this.jitter(SHOP_BASE_PRICES.potion[POTION_DB[p].rarity]),
    }));

    return {
      cards,
      relics,
      potions,
      removeServicePrice: SHOP_BASE_PRICES.removeServiceBase,
      removeUsed: false,
    };
  }

  private jitter(base: number): number {
    const delta = 0.1;
    const factor = 1 + (this.rng.next() * 2 - 1) * delta;
    return Math.max(1, Math.round(base * factor));
  }

  buyCard(cardId: CardId): void {
    const shop = this.state.shop;
    const run = this.state.run;
    if (!shop || !run) return;
    const item = shop.cards.find((c) => c.cardId === cardId && !c.sold);
    if (!item) return;
    if (run.gold < item.price) {
      this.host.toastMessage("Not enough gold.");
      return;
    }
    run.gold -= item.price;
    run.deck.push(createCardInstance(cardId));
    item.sold = true;
    this.host.log(`Bought ${CARD_DB[cardId].name} (-${item.price} gold).`);
    this.host.playSound("card");
    this.host.saveStable();
    this.host.render();
  }

  buyRelic(relicId: RelicId): void {
    const shop = this.state.shop;
    const run = this.state.run;
    if (!shop || !run) return;
    const item = shop.relics.find((r) => r.relicId === relicId && !r.sold);
    if (!item) return;
    if (run.gold < item.price) {
      this.host.toastMessage("Not enough gold.");
      return;
    }
    run.gold -= item.price;
    run.relics.push(relicId);
    item.sold = true;
    this.host.log(`Bought relic: ${RELIC_DB[relicId].name} (-${item.price} gold).`);
    this.host.playSound("relic");
    this.host.saveStable();
    this.host.render();
  }

  buyPotion(potionId: string): void {
    const shop = this.state.shop;
    const run = this.state.run;
    if (!shop || !run) return;
    const item = shop.potions.find((p) => p.potionId === potionId && !p.sold);
    if (!item) return;
    if (run.gold < item.price) {
      this.host.toastMessage("Not enough gold.");
      return;
    }
    if (!run.potions.some((p) => p === null)) {
      this.host.toastMessage("Potion slots are full.");
      return;
    }
    run.gold -= item.price;
    this.host.addPotion(potionId);
    item.sold = true;
    this.host.saveStable();
    this.host.render();
  }

  /** Called when the player chooses a card to remove. */
  removeCard(cardUid: string): void {
    const shop = this.state.shop;
    const run = this.state.run;
    if (!shop || !run || shop.removeUsed) return;
    if (run.gold < shop.removeServicePrice) {
      this.host.toastMessage("Not enough gold.");
      return;
    }
    if (run.deck.length <= CONFIG.minDeckSize) {
      this.host.toastMessage("Deck is too small to remove more cards.");
      return;
    }
    const idx = run.deck.findIndex((c) => c.uid === cardUid);
    if (idx < 0) return;
    run.gold -= shop.removeServicePrice;
    const removed = run.deck.splice(idx, 1)[0];
    run.removedThisRun += 1;
    shop.removeUsed = true;
    this.host.log(`Removed ${getCardData(removed).name} at the shop.`);
    this.host.playSound("click");
    this.host.saveStable();
    this.host.render();
  }
}
