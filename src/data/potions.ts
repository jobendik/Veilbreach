import type { PotionData, PotionId } from "../core/Types";

/**
 * Potion database. Potions are consumable effects the player may carry up
 * to `maxPotionSlots` of between combats and use during combat as a free
 * action (they do not cost energy). Each potion resolves a list of Effects
 * through the same EffectResolver that cards use.
 */
export const POTION_DB: Record<PotionId, PotionData> = {
  blood_vial: {
    id: "blood_vial",
    name: "Blood Vial",
    rarity: "Common",
    icon: "♥",
    color: ["#5c1e2a", "#ff5a7a"],
    description: "Heal 10 HP.",
    scope: "any",
    target: "self",
    effects: [{ type: "heal", amount: 10 }],
  },

  swift_potion: {
    id: "swift_potion",
    name: "Swift Potion",
    rarity: "Common",
    icon: "⚡",
    color: ["#1e3d65", "#78ecff"],
    description: "Draw 3 cards.",
    scope: "combat",
    target: "self",
    effects: [{ type: "draw", amount: 3 }],
  },

  energy_potion: {
    id: "energy_potion",
    name: "Energy Potion",
    rarity: "Common",
    icon: "✦",
    color: ["#273a64", "#4ce2ff"],
    description: "Gain 2 energy.",
    scope: "combat",
    target: "self",
    effects: [{ type: "gainEnergy", amount: 2 }],
  },

  block_potion: {
    id: "block_potion",
    name: "Block Potion",
    rarity: "Common",
    icon: "⬡",
    color: ["#1b5070", "#a0e4ff"],
    description: "Gain 12 block.",
    scope: "combat",
    target: "self",
    effects: [{ type: "block", amount: 12 }],
  },

  fire_potion: {
    id: "fire_potion",
    name: "Fire Potion",
    rarity: "Common",
    icon: "🔥",
    color: ["#6a1f22", "#ff7a3a"],
    description: "Deal 20 damage to one enemy.",
    scope: "combat",
    target: "enemy",
    effects: [{ type: "damage", amount: 20, target: "enemy" }],
  },

  explosive_potion: {
    id: "explosive_potion",
    name: "Explosive Potion",
    rarity: "Uncommon",
    icon: "☄",
    color: ["#6a1f22", "#ff9752"],
    description: "Deal 10 damage to ALL enemies.",
    scope: "combat",
    target: "allEnemies",
    effects: [{ type: "damage", amount: 10, target: "allEnemies" }],
  },

  poison_potion: {
    id: "poison_potion",
    name: "Poison Potion",
    rarity: "Uncommon",
    icon: "☠",
    color: ["#20483d", "#7ef68a"],
    description: "Apply 6 Poison to one enemy.",
    scope: "combat",
    target: "enemy",
    effects: [{ type: "applyStatus", status: "poison", amount: 6, target: "enemy" }],
  },

  weak_potion: {
    id: "weak_potion",
    name: "Weak Potion",
    rarity: "Common",
    icon: "▽",
    color: ["#3b3868", "#8fa0ff"],
    description: "Apply 3 Weak to one enemy.",
    scope: "combat",
    target: "enemy",
    effects: [{ type: "applyStatus", status: "weak", amount: 3, target: "enemy" }],
  },

  fracture_potion: {
    id: "fracture_potion",
    name: "Fracture Potion",
    rarity: "Uncommon",
    icon: "◇",
    color: ["#5b325d", "#df70ff"],
    description: "Apply 3 Vulnerable to one enemy.",
    scope: "combat",
    target: "enemy",
    effects: [{ type: "applyStatus", status: "vulnerable", amount: 3, target: "enemy" }],
  },

  strength_potion: {
    id: "strength_potion",
    name: "Strength Potion",
    rarity: "Uncommon",
    icon: "✦",
    color: ["#4e315d", "#bc6cff"],
    description: "Gain 2 Strength for the rest of the combat.",
    scope: "combat",
    target: "self",
    effects: [{ type: "applyStatus", status: "strength", amount: 2, target: "self" }],
  },

  dexterity_potion: {
    id: "dexterity_potion",
    name: "Dexterity Potion",
    rarity: "Uncommon",
    icon: "✧",
    color: ["#1e3d65", "#5de3ff"],
    description: "Gain 2 Dexterity for the rest of the combat.",
    scope: "combat",
    target: "self",
    effects: [{ type: "applyStatus", status: "dexterity", amount: 2, target: "self" }],
  },

  elixir_of_purity: {
    id: "elixir_of_purity",
    name: "Elixir of Purity",
    rarity: "Rare",
    icon: "✚",
    color: ["#273b54", "#d7f0ff"],
    description: "Remove Weak, Frail, and Vulnerable from yourself.",
    scope: "combat",
    target: "self",
    effects: [
      { type: "cleanse", statuses: ["weak", "frail", "vulnerable"], target: "self" },
    ],
  },

  breach_potion: {
    id: "breach_potion",
    name: "Breach Potion",
    rarity: "Uncommon",
    icon: "✺",
    color: ["#3d2066", "#c58aff"],
    description: "Gain 5 Breach.",
    scope: "combat",
    target: "self",
    effects: [{ type: "gainBreach", amount: 5 }],
  },

  rift_potion: {
    id: "rift_potion",
    name: "Rift Potion",
    rarity: "Rare",
    icon: "✦",
    color: ["#2b1a5a", "#b088ff"],
    description: "Fill the Breach Meter.",
    scope: "combat",
    target: "self",
    effects: [{ type: "gainBreach", amount: 999 }],
  },

  distilled_void: {
    id: "distilled_void",
    name: "Distilled Void",
    rarity: "Rare",
    icon: "◈",
    color: ["#2a1f5c", "#a58cff"],
    description: "Apply 3 Vulnerable to ALL enemies.",
    scope: "combat",
    target: "allEnemies",
    effects: [{ type: "applyStatus", status: "vulnerable", amount: 3, target: "allEnemies" }],
  },
};

export const COMMON_POTION_IDS: PotionId[] = Object.values(POTION_DB)
  .filter((p) => p.rarity === "Common")
  .map((p) => p.id);

export const UNCOMMON_POTION_IDS: PotionId[] = Object.values(POTION_DB)
  .filter((p) => p.rarity === "Uncommon")
  .map((p) => p.id);

export const RARE_POTION_IDS: PotionId[] = Object.values(POTION_DB)
  .filter((p) => p.rarity === "Rare")
  .map((p) => p.id);

export function isValidPotionId(id: string): id is PotionId {
  return Object.prototype.hasOwnProperty.call(POTION_DB, id);
}
