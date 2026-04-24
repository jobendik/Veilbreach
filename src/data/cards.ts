import type { CardData, CardId, CardInstance, ResolvedCardData } from "../core/Types";

/**
 * All cards in the game. Each card is pure data — its effects are a list
 * of discriminated union entries interpreted by the EffectResolver at runtime.
 *
 * Add `imagePath` to any card to replace the procedural sigil with a PNG.
 */
export const CARD_DB: Record<CardId, CardData> = {
  strike: {
    id: "strike",
    name: "Void Strike",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#314477", "#7b4df1"],
    imagePath: "",
    assetKey: "void_strike",
    description: "Deal 7 damage.",
    effects: [{ type: "damage", amount: 7 }],
    upgrade: {
      name: "Void Strike+",
      description: "Deal 10 damage.",
      effects: [{ type: "damage", amount: 10 }],
    },
  },

  guard: {
    id: "guard",
    name: "Phase Guard",
    cost: 1,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#213f68", "#2c96d1"],
    imagePath: "",
    assetKey: "phase_guard",
    description: "Gain 6 block.",
    effects: [{ type: "block", amount: 6 }],
    upgrade: {
      description: "Gain 9 block.",
      effects: [{ type: "block", amount: 9 }],
    },
  },

  quick_cut: {
    id: "quick_cut",
    name: "Quick Cut",
    cost: 0,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#47417d", "#8f68ff"],
    imagePath: "",
    assetKey: "quick_cut",
    description: "Deal 4 damage. Draw 1 card.",
    effects: [
      { type: "damage", amount: 4 },
      { type: "draw", amount: 1 },
    ],
    upgrade: {
      description: "Deal 6 damage. Draw 1 card.",
      effects: [
        { type: "damage", amount: 6 },
        { type: "draw", amount: 1 },
      ],
    },
  },

  focus: {
    id: "focus",
    name: "Focus",
    cost: 0,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#21405a", "#49d7ff"],
    imagePath: "",
    assetKey: "focus",
    description: "Gain 1 energy. Draw 1 card. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "gainEnergy", amount: 1 },
      { type: "draw", amount: 1 },
    ],
    upgrade: {
      description: "Gain 1 energy. Draw 2 cards. Exhaust.",
      effects: [
        { type: "gainEnergy", amount: 1 },
        { type: "draw", amount: 2 },
      ],
    },
  },

  ember_spark: {
    id: "ember_spark",
    name: "Ember Spark",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#76323a", "#ff8b45"],
    imagePath: "",
    assetKey: "ember_spark",
    description: "Deal 5 damage. Apply 2 Burn.",
    effects: [
      { type: "damage", amount: 5 },
      { type: "applyStatus", status: "burn", amount: 2, target: "enemy" },
    ],
    upgrade: {
      description: "Deal 7 damage. Apply 3 Burn.",
      effects: [
        { type: "damage", amount: 7 },
        { type: "applyStatus", status: "burn", amount: 3, target: "enemy" },
      ],
    },
  },

  heavy_cleave: {
    id: "heavy_cleave",
    name: "Heavy Cleave",
    cost: 2,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#53283c", "#e54f75"],
    imagePath: "",
    assetKey: "heavy_cleave",
    description: "Deal 14 damage.",
    effects: [{ type: "damage", amount: 14 }],
    upgrade: {
      description: "Deal 19 damage.",
      effects: [{ type: "damage", amount: 19 }],
    },
  },

  shield_burst: {
    id: "shield_burst",
    name: "Shield Burst",
    cost: 2,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#1c5370", "#65d5ff"],
    imagePath: "",
    assetKey: "shield_burst",
    description: "Gain 12 block.",
    effects: [{ type: "block", amount: 12 }],
    upgrade: {
      description: "Gain 16 block.",
      effects: [{ type: "block", amount: 16 }],
    },
  },

  twin_lash: {
    id: "twin_lash",
    name: "Twin Lash",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#363360", "#d05cff"],
    imagePath: "",
    assetKey: "twin_lash",
    description: "Deal 4 damage twice.",
    effects: [{ type: "damage", amount: 4, hits: 2 }],
    upgrade: {
      description: "Deal 5 damage twice.",
      effects: [{ type: "damage", amount: 5, hits: 2 }],
    },
  },

  venom_dart: {
    id: "venom_dart",
    name: "Venom Dart",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#204831", "#62e87f"],
    imagePath: "",
    assetKey: "venom_dart",
    description: "Deal 4 damage. Apply 4 Poison.",
    effects: [
      { type: "damage", amount: 4 },
      { type: "applyStatus", status: "poison", amount: 4, target: "enemy" },
    ],
    upgrade: {
      description: "Deal 5 damage. Apply 6 Poison.",
      effects: [
        { type: "damage", amount: 5 },
        { type: "applyStatus", status: "poison", amount: 6, target: "enemy" },
      ],
    },
  },

  scan: {
    id: "scan",
    name: "Scan",
    cost: 1,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#1f435b", "#64b5ff"],
    imagePath: "",
    assetKey: "scan",
    description: "Draw 2 cards.",
    effects: [{ type: "draw", amount: 2 }],
    upgrade: {
      cost: 0,
      description: "Draw 2 cards.",
      effects: [{ type: "draw", amount: 2 }],
    },
  },

  weaken_ray: {
    id: "weaken_ray",
    name: "Weaken Ray",
    cost: 1,
    type: "Skill",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#3b3868", "#8fa0ff"],
    imagePath: "",
    assetKey: "weaken_ray",
    description: "Apply 3 Weak.",
    effects: [{ type: "applyStatus", status: "weak", amount: 3, target: "enemy" }],
    upgrade: {
      description: "Apply 4 Weak and 1 Vulnerable.",
      effects: [
        { type: "applyStatus", status: "weak", amount: 4, target: "enemy" },
        { type: "applyStatus", status: "vulnerable", amount: 1, target: "enemy" },
      ],
    },
  },

  fracture: {
    id: "fracture",
    name: "Fracture",
    cost: 1,
    type: "Skill",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#5b325d", "#df70ff"],
    imagePath: "",
    assetKey: "fracture",
    description: "Apply 2 Vulnerable.",
    effects: [
      { type: "applyStatus", status: "vulnerable", amount: 2, target: "enemy" },
    ],
    upgrade: {
      description: "Apply 3 Vulnerable.",
      effects: [
        { type: "applyStatus", status: "vulnerable", amount: 3, target: "enemy" },
      ],
    },
  },

  arc_wave: {
    id: "arc_wave",
    name: "Arc Wave",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "allEnemies",
    fallbackColor: ["#22425c", "#4ce2ff"],
    imagePath: "",
    assetKey: "arc_wave",
    description: "Deal 6 damage to all enemies.",
    effects: [{ type: "damage", amount: 6, target: "allEnemies" }],
    upgrade: {
      description: "Deal 9 damage to all enemies.",
      effects: [{ type: "damage", amount: 9, target: "allEnemies" }],
    },
  },

  overclock: {
    id: "overclock",
    name: "Overclock",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#314477", "#78ecff"],
    imagePath: "",
    assetKey: "overclock",
    description: "Gain 2 energy. Apply 1 Frail to yourself. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "gainEnergy", amount: 2 },
      { type: "applyStatus", status: "frail", amount: 1, target: "self" },
    ],
    upgrade: {
      description: "Gain 2 energy. Draw 1 card. Exhaust.",
      effects: [
        { type: "gainEnergy", amount: 2 },
        { type: "draw", amount: 1 },
      ],
    },
  },

  blade_dance: {
    id: "blade_dance",
    name: "Blade Dance",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#3d2955", "#ff68d8"],
    imagePath: "",
    assetKey: "blade_dance",
    description: "Deal 3 damage four times.",
    effects: [{ type: "damage", amount: 3, hits: 4 }],
    upgrade: {
      description: "Deal 4 damage four times.",
      effects: [{ type: "damage", amount: 4, hits: 4 }],
    },
  },

  siphon: {
    id: "siphon",
    name: "Siphon",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#20483d", "#7ef6c7"],
    imagePath: "",
    assetKey: "siphon",
    description: "Deal 7 damage. Heal 3 HP.",
    effects: [
      { type: "damage", amount: 7 },
      { type: "heal", amount: 3, target: "self" },
    ],
    upgrade: {
      description: "Deal 10 damage. Heal 4 HP.",
      effects: [
        { type: "damage", amount: 10 },
        { type: "heal", amount: 4, target: "self" },
      ],
    },
  },

  mirror_plate: {
    id: "mirror_plate",
    name: "Mirror Plate",
    cost: 1,
    type: "Power",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1b5060", "#9adfff"],
    imagePath: "",
    assetKey: "mirror_plate",
    description: "Gain 3 Thorns. Exhaust.",
    exhaustSelf: true,
    effects: [{ type: "applyStatus", status: "thorns", amount: 3, target: "self" }],
    upgrade: {
      description: "Gain 5 Thorns. Exhaust.",
      effects: [
        { type: "applyStatus", status: "thorns", amount: 5, target: "self" },
      ],
    },
  },

  battle_trance: {
    id: "battle_trance",
    name: "Battle Trance",
    cost: 1,
    type: "Power",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#4e315d", "#bc6cff"],
    imagePath: "",
    assetKey: "battle_trance",
    description: "Gain 2 Strength. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "applyStatus", status: "strength", amount: 2, target: "self" },
    ],
    upgrade: {
      description: "Gain 3 Strength. Exhaust.",
      effects: [
        { type: "applyStatus", status: "strength", amount: 3, target: "self" },
      ],
    },
  },

  kinetic_form: {
    id: "kinetic_form",
    name: "Kinetic Form",
    cost: 1,
    type: "Power",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1e3d65", "#5de3ff"],
    imagePath: "",
    assetKey: "kinetic_form",
    description: "Gain 2 Dexterity. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "applyStatus", status: "dexterity", amount: 2, target: "self" },
    ],
    upgrade: {
      description: "Gain 3 Dexterity. Exhaust.",
      effects: [
        { type: "applyStatus", status: "dexterity", amount: 3, target: "self" },
      ],
    },
  },

  mark_prey: {
    id: "mark_prey",
    name: "Mark Prey",
    cost: 0,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#4b3c1f", "#f4c35b"],
    imagePath: "",
    assetKey: "mark_prey",
    description: "Apply 3 Mark. Draw 1 card.",
    effects: [
      { type: "applyStatus", status: "mark", amount: 3, target: "enemy" },
      { type: "draw", amount: 1 },
    ],
    upgrade: {
      description: "Apply 5 Mark. Draw 1 card.",
      effects: [
        { type: "applyStatus", status: "mark", amount: 5, target: "enemy" },
        { type: "draw", amount: 1 },
      ],
    },
  },

  purge: {
    id: "purge",
    name: "Purge",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#273b54", "#d7f0ff"],
    imagePath: "",
    assetKey: "purge",
    description: "Remove Weak, Frail, and Vulnerable from yourself. Draw 1.",
    effects: [
      {
        type: "cleanse",
        statuses: ["weak", "frail", "vulnerable"],
        target: "self",
      },
      { type: "draw", amount: 1 },
    ],
    upgrade: {
      cost: 0,
      description: "Remove Weak, Frail, and Vulnerable from yourself. Draw 1.",
      effects: [
        {
          type: "cleanse",
          statuses: ["weak", "frail", "vulnerable"],
          target: "self",
        },
        { type: "draw", amount: 1 },
      ],
    },
  },

  void_bomb: {
    id: "void_bomb",
    name: "Void Bomb",
    cost: 2,
    type: "Attack",
    rarity: "Rare",
    targetType: "allEnemies",
    fallbackColor: ["#221b45", "#ff4ed2"],
    imagePath: "",
    assetKey: "void_bomb",
    description: "Deal 13 damage to all enemies. Exhaust.",
    exhaustSelf: true,
    effects: [{ type: "damage", amount: 13, target: "allEnemies" }],
    upgrade: {
      description: "Deal 18 damage to all enemies. Exhaust.",
      effects: [{ type: "damage", amount: 18, target: "allEnemies" }],
    },
  },

  singularity: {
    id: "singularity",
    name: "Singularity",
    cost: 3,
    type: "Attack",
    rarity: "Rare",
    targetType: "enemy",
    fallbackColor: ["#1e193f", "#7a4dff"],
    imagePath: "",
    assetKey: "singularity",
    description: "Deal 30 damage. Apply 3 Vulnerable. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "damage", amount: 30 },
      { type: "applyStatus", status: "vulnerable", amount: 3, target: "enemy" },
    ],
    upgrade: {
      cost: 2,
      description: "Deal 30 damage. Apply 3 Vulnerable. Exhaust.",
      effects: [
        { type: "damage", amount: 30 },
        { type: "applyStatus", status: "vulnerable", amount: 3, target: "enemy" },
      ],
    },
  },

  catalyst: {
    id: "catalyst",
    name: "Catalyst",
    cost: 1,
    type: "Skill",
    rarity: "Rare",
    targetType: "enemy",
    fallbackColor: ["#1e4e3e", "#8dff93"],
    imagePath: "",
    assetKey: "catalyst",
    description: "Double enemy Poison. Exhaust.",
    exhaustSelf: true,
    effects: [{ type: "doubleStatus", status: "poison", target: "enemy" }],
    upgrade: {
      cost: 0,
      description: "Double enemy Poison. Exhaust.",
      effects: [{ type: "doubleStatus", status: "poison", target: "enemy" }],
    },
  },

  storm_engine: {
    id: "storm_engine",
    name: "Storm Engine",
    cost: 2,
    type: "Power",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#273a64", "#4ce2ff"],
    imagePath: "",
    assetKey: "storm_engine",
    description: "Gain 1 energy at the start of each turn. Exhaust.",
    exhaustSelf: true,
    effects: [{ type: "gainPower", power: "stormEngine", amount: 1 }],
    upgrade: {
      cost: 1,
      description: "Gain 1 energy at the start of each turn. Exhaust.",
      effects: [{ type: "gainPower", power: "stormEngine", amount: 1 }],
    },
  },

  recursion: {
    id: "recursion",
    name: "Recursion",
    cost: 1,
    type: "Skill",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#2e2a5c", "#b06bff"],
    imagePath: "",
    assetKey: "recursion",
    description:
      "Return a random card from discard to hand. It costs 0 this turn. Exhaust.",
    exhaustSelf: true,
    effects: [{ type: "returnDiscardToHand", amount: 1, temporaryCost: 0 }],
    upgrade: {
      description:
        "Return 2 random cards from discard to hand. They cost 0 this turn. Exhaust.",
      effects: [{ type: "returnDiscardToHand", amount: 2, temporaryCost: 0 }],
    },
  },

  forge_memory: {
    id: "forge_memory",
    name: "Forge Memory",
    cost: 1,
    type: "Skill",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#4f381c", "#ffc55c"],
    imagePath: "",
    assetKey: "forge_memory",
    description: "Upgrade a random card in hand for this combat. Draw 1. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "upgradeRandomInHand", amount: 1 },
      { type: "draw", amount: 1 },
    ],
    upgrade: {
      cost: 0,
      description:
        "Upgrade a random card in hand for this combat. Draw 1. Exhaust.",
      effects: [
        { type: "upgradeRandomInHand", amount: 1 },
        { type: "draw", amount: 1 },
      ],
    },
  },

  blood_contract: {
    id: "blood_contract",
    name: "Blood Contract",
    cost: 0,
    type: "Skill",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#562133", "#ff5777"],
    imagePath: "",
    assetKey: "blood_contract",
    description: "Lose 4 HP. Gain 2 energy. Draw 2. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "loseHp", amount: 4 },
      { type: "gainEnergy", amount: 2 },
      { type: "draw", amount: 2 },
    ],
    upgrade: {
      description: "Lose 2 HP. Gain 2 energy. Draw 2. Exhaust.",
      effects: [
        { type: "loseHp", amount: 2 },
        { type: "gainEnergy", amount: 2 },
        { type: "draw", amount: 2 },
      ],
    },
  },
};

/** Quick existence check used during save validation. */
export function isValidCardId(id: string): id is CardId {
  return Object.prototype.hasOwnProperty.call(CARD_DB, id);
}

/** Resolve a card instance to the correct view of its data (base or upgrade). */
export function getCardData(instance: CardInstance): ResolvedCardData {
  const base = CARD_DB[instance.cardId];
  if (!base) throw new Error(`Missing card data: ${instance.cardId}`);
  if (!instance.upgraded || !base.upgrade) return base;

  const up = base.upgrade;
  return {
    ...base,
    ...(up.name !== undefined ? { name: up.name } : {}),
    ...(up.cost !== undefined ? { cost: up.cost } : {}),
    ...(up.description !== undefined ? { description: up.description } : {}),
    ...(up.effects !== undefined ? { effects: up.effects } : {}),
    ...(up.exhaustSelf !== undefined ? { exhaustSelf: up.exhaustSelf } : {}),
    upgraded: true,
  };
}

let __uidCounter = 0;
function nextUid(prefix: string): string {
  __uidCounter++;
  return `${prefix}_${Date.now().toString(36)}_${__uidCounter.toString(36)}`;
}

export function createCardInstance(cardId: CardId, upgraded = false): CardInstance {
  return { uid: nextUid("card"), cardId, upgraded, tempCost: null };
}
