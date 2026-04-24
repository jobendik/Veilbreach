/**
 * Gold price tables for the shop. Prices are jittered by ±10% at shop
 * generation time so every shop feels slightly different, while the
 * base numbers here give a stable balance target.
 */
export const SHOP_BASE_PRICES = {
  card: {
    Common: 50,
    Uncommon: 75,
    Rare: 150,
  } as Record<"Common" | "Uncommon" | "Rare", number>,

  relic: {
    Common: 150,
    Uncommon: 250,
    Rare: 300,
  } as Record<"Common" | "Uncommon" | "Rare", number>,

  potion: {
    Common: 50,
    Uncommon: 75,
    Rare: 100,
  } as Record<"Common" | "Uncommon" | "Rare", number>,

  removeServiceBase: 75,
  removeServicePerUse: 25,
} as const;

export const SHOP_INVENTORY = {
  cardCount: 5,
  relicCount: 3,
  potionCount: 3,
} as const;
