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

  /* ------------------------------------------------------------------ */
  /* New content: combo / exhaust / retain / scaling / anti-status      */
  /* ------------------------------------------------------------------ */

  void_echo: {
    id: "void_echo",
    name: "Void Echo",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#2b2355", "#9a6bff"],
    assetKey: "void_echo",
    description: "Deal 5 + 2 damage per card played this turn.",
    effects: [
      { type: "scalingDamage", base: 5, perUnit: 2, scaling: "cardsPlayed" },
    ],
    upgrade: {
      description: "Deal 7 + 3 damage per card played this turn.",
      effects: [
        { type: "scalingDamage", base: 7, perUnit: 3, scaling: "cardsPlayed" },
      ],
    },
  },

  ash_bloom: {
    id: "ash_bloom",
    name: "Ash Bloom",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#7a2f25", "#ff8c4d"],
    assetKey: "ash_bloom",
    description: "Deal 6 damage. Apply 4 Burn. If enemy already has Burn, draw 1.",
    effects: [
      { type: "damage", amount: 6 },
      { type: "drawIf", amount: 1, condition: "targetHasBurn" },
      { type: "applyStatus", status: "burn", amount: 4, target: "enemy" },
    ],
    upgrade: {
      description: "Deal 8 damage. Apply 5 Burn. If enemy already has Burn, draw 1.",
      effects: [
        { type: "damage", amount: 8 },
        { type: "drawIf", amount: 1, condition: "targetHasBurn" },
        { type: "applyStatus", status: "burn", amount: 5, target: "enemy" },
      ],
    },
  },

  mirror_step: {
    id: "mirror_step",
    name: "Mirror Step",
    cost: 0,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1e4057", "#7ee0ff"],
    assetKey: "mirror_step",
    description: "Gain 4 block. Retain.",
    retain: true,
    effects: [{ type: "block", amount: 4 }],
    upgrade: {
      description: "Gain 7 block. Retain.",
      effects: [{ type: "block", amount: 7 }],
    },
  },

  system_purge: {
    id: "system_purge",
    name: "System Purge",
    cost: 2,
    type: "Attack",
    rarity: "Rare",
    targetType: "allEnemies",
    fallbackColor: ["#1a2d52", "#4fd1ff"],
    assetKey: "system_purge",
    description: "Exhaust your hand. Deal 4 damage to ALL enemies per card exhausted this way.",
    exhaustSelf: true,
    effects: [
      { type: "exhaustHand" },
      {
        type: "scalingDamage",
        base: 0,
        perUnit: 4,
        scaling: "exhaustSize",
        target: "allEnemies",
      },
    ],
    upgrade: {
      description: "Exhaust your hand. Deal 6 damage to ALL enemies per card exhausted this way.",
      effects: [
        { type: "exhaustHand" },
        {
          type: "scalingDamage",
          base: 0,
          perUnit: 6,
          scaling: "exhaustSize",
          target: "allEnemies",
        },
      ],
    },
  },

  deep_scan: {
    id: "deep_scan",
    name: "Deep Scan",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1b4767", "#5dbcff"],
    assetKey: "deep_scan",
    description: "Draw 3 cards.",
    effects: [{ type: "draw", amount: 3 }],
    upgrade: {
      cost: 0,
      description: "Draw 3 cards.",
      effects: [{ type: "draw", amount: 3 }],
    },
  },

  detonate_toxins: {
    id: "detonate_toxins",
    name: "Detonate Toxins",
    cost: 1,
    type: "Skill",
    rarity: "Rare",
    targetType: "enemy",
    fallbackColor: ["#18482e", "#63f29a"],
    assetKey: "detonate_toxins",
    description: "Deal damage equal to 2x enemy Poison. Consume all poison. Exhaust.",
    exhaustSelf: true,
    effects: [
      {
        type: "scalingDamage",
        base: 0,
        perUnit: 2,
        scaling: "enemyPoison",
        target: "enemy",
      },
      { type: "cleanse", statuses: ["poison"], target: "enemy" },
    ],
    upgrade: {
      description: "Deal damage equal to 3x enemy Poison. Consume all poison. Exhaust.",
      effects: [
        {
          type: "scalingDamage",
          base: 0,
          perUnit: 3,
          scaling: "enemyPoison",
          target: "enemy",
        },
        { type: "cleanse", statuses: ["poison"], target: "enemy" },
      ],
    },
  },

  bulwark: {
    id: "bulwark",
    name: "Bulwark",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1c5570", "#9fe1ff"],
    assetKey: "bulwark",
    description: "Gain 5 block. Gain 2 block for each card in your hand.",
    effects: [
      { type: "scalingBlock", base: 5, perUnit: 2, scaling: "handSize" },
    ],
    upgrade: {
      description: "Gain 8 block. Gain 3 block for each card in your hand.",
      effects: [
        { type: "scalingBlock", base: 8, perUnit: 3, scaling: "handSize" },
      ],
    },
  },

  last_stand: {
    id: "last_stand",
    name: "Last Stand",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#5b1e2a", "#ff6e77"],
    assetKey: "last_stand",
    description: "Deal 6 damage, plus 3 for every 10 HP you are missing.",
    effects: [
      { type: "scalingDamage", base: 6, perUnit: 3, scaling: "missingHpTen" },
    ],
    upgrade: {
      description: "Deal 8 damage, plus 4 for every 10 HP you are missing.",
      effects: [
        { type: "scalingDamage", base: 8, perUnit: 4, scaling: "missingHpTen" },
      ],
    },
  },

  aegis: {
    id: "aegis",
    name: "Aegis",
    cost: 2,
    type: "Power",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#1c4570", "#a0e1ff"],
    assetKey: "aegis",
    description: "Gain 3 Plated. Exhaust.",
    exhaustSelf: true,
    effects: [{ type: "applyStatus", status: "plated", amount: 3, target: "self" }],
    upgrade: {
      description: "Gain 5 Plated. Exhaust.",
      effects: [
        { type: "applyStatus", status: "plated", amount: 5, target: "self" },
      ],
    },
  },

  ritual_knife: {
    id: "ritual_knife",
    name: "Ritual Knife",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#3f1e48", "#c965ff"],
    assetKey: "ritual_knife",
    description: "Lose 2 HP. Deal 12 damage. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "loseHp", amount: 2 },
      { type: "damage", amount: 12 },
    ],
    upgrade: {
      description: "Lose 2 HP. Deal 18 damage. Exhaust.",
      effects: [
        { type: "loseHp", amount: 2 },
        { type: "damage", amount: 18 },
      ],
    },
  },

  prime_target: {
    id: "prime_target",
    name: "Prime Target",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#3b3416", "#ffd96b"],
    assetKey: "prime_target",
    description: "Apply 2 Vulnerable and 3 Mark. Retain.",
    retain: true,
    effects: [
      { type: "applyStatus", status: "vulnerable", amount: 2, target: "enemy" },
      { type: "applyStatus", status: "mark", amount: 3, target: "enemy" },
    ],
    upgrade: {
      cost: 0,
      description: "Apply 2 Vulnerable and 3 Mark. Retain.",
      effects: [
        { type: "applyStatus", status: "vulnerable", amount: 2, target: "enemy" },
        { type: "applyStatus", status: "mark", amount: 3, target: "enemy" },
      ],
    },
  },

  opening_strike: {
    id: "opening_strike",
    name: "Opening Strike",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#2b4177", "#6a9cff"],
    assetKey: "opening_strike",
    description: "Innate. Deal 8 damage. Apply 1 Vulnerable.",
    innate: true,
    effects: [
      { type: "damage", amount: 8 },
      { type: "applyStatus", status: "vulnerable", amount: 1, target: "enemy" },
    ],
    upgrade: {
      description: "Innate. Deal 10 damage. Apply 2 Vulnerable.",
      effects: [
        { type: "damage", amount: 10 },
        { type: "applyStatus", status: "vulnerable", amount: 2, target: "enemy" },
      ],
    },
  },

  overcharge: {
    id: "overcharge",
    name: "Overcharge",
    cost: 2,
    type: "Attack",
    rarity: "Rare",
    targetType: "enemy",
    fallbackColor: ["#2b3d78", "#6df1ff"],
    assetKey: "overcharge",
    description: "Deal 8 damage twice. Draw 1.",
    effects: [
      { type: "damage", amount: 8, hits: 2 },
      { type: "draw", amount: 1 },
    ],
    upgrade: {
      description: "Deal 10 damage twice. Draw 1.",
      effects: [
        { type: "damage", amount: 10, hits: 2 },
        { type: "draw", amount: 1 },
      ],
    },
  },

  wildfire: {
    id: "wildfire",
    name: "Wildfire",
    cost: 2,
    type: "Attack",
    rarity: "Rare",
    targetType: "allEnemies",
    fallbackColor: ["#6a2a20", "#ff9752"],
    assetKey: "wildfire",
    description: "Deal 4 damage to all enemies. Apply 3 Burn to all.",
    effects: [
      { type: "damage", amount: 4, target: "allEnemies" },
      { type: "applyStatus", status: "burn", amount: 3, target: "allEnemies" },
    ],
    upgrade: {
      description: "Deal 6 damage to all enemies. Apply 4 Burn to all.",
      effects: [
        { type: "damage", amount: 6, target: "allEnemies" },
        { type: "applyStatus", status: "burn", amount: 4, target: "allEnemies" },
      ],
    },
  },

  /* ------------------------------------------------------------------ */
  /* Breach-themed cards — signature mechanic support                    */
  /* ------------------------------------------------------------------ */

  veil_tap: {
    id: "veil_tap",
    name: "Veil Tap",
    cost: 0,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#3d2a66", "#b98cff"],
    assetKey: "veil_tap",
    description: "Gain 2 Breach.",
    effects: [{ type: "gainBreach", amount: 2 }],
    upgrade: {
      description: "Gain 4 Breach.",
      effects: [{ type: "gainBreach", amount: 4 }],
    },
  },

  breach_strike: {
    id: "breach_strike",
    name: "Breach Strike",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#2a1d55", "#c28aff"],
    assetKey: "breach_strike",
    description: "Deal 6 damage. Gain 2 Breach.",
    effects: [
      { type: "damage", amount: 6 },
      { type: "gainBreach", amount: 2 },
    ],
    upgrade: {
      description: "Deal 9 damage. Gain 2 Breach.",
      effects: [
        { type: "damage", amount: 9 },
        { type: "gainBreach", amount: 2 },
      ],
    },
  },

  veiled_guard: {
    id: "veiled_guard",
    name: "Veiled Guard",
    cost: 1,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#1d3e66", "#8ab8ff"],
    assetKey: "veiled_guard",
    description: "Gain 5 block. Gain 2 Breach.",
    effects: [
      { type: "block", amount: 5 },
      { type: "gainBreach", amount: 2 },
    ],
    upgrade: {
      description: "Gain 8 block. Gain 2 Breach.",
      effects: [
        { type: "block", amount: 8 },
        { type: "gainBreach", amount: 2 },
      ],
    },
  },

  rift_volley: {
    id: "rift_volley",
    name: "Rift Volley",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "allEnemies",
    fallbackColor: ["#2e2056", "#a56cff"],
    assetKey: "rift_volley",
    description: "Deal 3 damage to all enemies. Gain 3 Breach.",
    effects: [
      { type: "damage", amount: 3, target: "allEnemies" },
      { type: "gainBreach", amount: 3 },
    ],
    upgrade: {
      description: "Deal 5 damage to all enemies. Gain 3 Breach.",
      effects: [
        { type: "damage", amount: 5, target: "allEnemies" },
        { type: "gainBreach", amount: 3 },
      ],
    },
  },

  veil_anchor: {
    id: "veil_anchor",
    name: "Veil Anchor",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#213057", "#7fa9ff"],
    assetKey: "veil_anchor",
    description: "Gain 4 block. Draw 1 card. Gain 3 Breach.",
    effects: [
      { type: "block", amount: 4 },
      { type: "draw", amount: 1 },
      { type: "gainBreach", amount: 3 },
    ],
    upgrade: {
      description: "Gain 6 block. Draw 1 card. Gain 4 Breach.",
      effects: [
        { type: "block", amount: 6 },
        { type: "draw", amount: 1 },
        { type: "gainBreach", amount: 4 },
      ],
    },
  },

  rupture: {
    id: "rupture",
    name: "Rupture",
    cost: 2,
    type: "Attack",
    rarity: "Rare",
    targetType: "enemy",
    fallbackColor: ["#431a5c", "#d87bff"],
    assetKey: "rupture",
    description: "Deal 16 damage. Gain 4 Breach.",
    effects: [
      { type: "damage", amount: 16 },
      { type: "gainBreach", amount: 4 },
    ],
    upgrade: {
      description: "Deal 22 damage. Gain 4 Breach.",
      effects: [
        { type: "damage", amount: 22 },
        { type: "gainBreach", amount: 4 },
      ],
    },
  },

  unravel: {
    id: "unravel",
    name: "Unravel",
    cost: 1,
    type: "Skill",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#3e1f5c", "#c995ff"],
    assetKey: "unravel",
    description: "Gain 6 Breach. Draw 2 cards. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "gainBreach", amount: 6 },
      { type: "draw", amount: 2 },
    ],
    upgrade: {
      cost: 0,
      description: "Gain 6 Breach. Draw 2 cards. Exhaust.",
      effects: [
        { type: "gainBreach", amount: 6 },
        { type: "draw", amount: 2 },
      ],
    },
  },

  /* ------------------------------------------------------------------ */
  /* Additional depth: more attacks, skills, and a few oddballs          */
  /* ------------------------------------------------------------------ */

  warding_step: {
    id: "warding_step",
    name: "Warding Step",
    cost: 0,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#1c4d60", "#6fd5ff"],
    assetKey: "warding_step",
    description: "Gain 3 block.",
    effects: [{ type: "block", amount: 3 }],
    upgrade: {
      description: "Gain 5 block. Draw 1.",
      effects: [
        { type: "block", amount: 5 },
        { type: "draw", amount: 1 },
      ],
    },
  },

  cinder_spike: {
    id: "cinder_spike",
    name: "Cinder Spike",
    cost: 0,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#6a2216", "#ff8d50"],
    assetKey: "cinder_spike",
    description: "Deal 3 damage. Apply 1 Burn.",
    effects: [
      { type: "damage", amount: 3 },
      { type: "applyStatus", status: "burn", amount: 1, target: "enemy" },
    ],
    upgrade: {
      description: "Deal 5 damage. Apply 2 Burn.",
      effects: [
        { type: "damage", amount: 5 },
        { type: "applyStatus", status: "burn", amount: 2, target: "enemy" },
      ],
    },
  },

  soul_wound: {
    id: "soul_wound",
    name: "Soul Wound",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#3c1f4a", "#b56bff"],
    assetKey: "soul_wound",
    description: "Deal 8 damage. Apply 2 Weak and 2 Frail.",
    effects: [
      { type: "damage", amount: 8 },
      { type: "applyStatus", status: "weak", amount: 2, target: "enemy" },
      { type: "applyStatus", status: "frail", amount: 2, target: "enemy" },
    ],
    upgrade: {
      description: "Deal 10 damage. Apply 3 Weak and 3 Frail.",
      effects: [
        { type: "damage", amount: 10 },
        { type: "applyStatus", status: "weak", amount: 3, target: "enemy" },
        { type: "applyStatus", status: "frail", amount: 3, target: "enemy" },
      ],
    },
  },

  iron_chorus: {
    id: "iron_chorus",
    name: "Iron Chorus",
    cost: 2,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1c476a", "#8ad9ff"],
    assetKey: "iron_chorus",
    description: "Gain 10 block. Apply 2 Plated.",
    effects: [
      { type: "block", amount: 10 },
      { type: "applyStatus", status: "plated", amount: 2, target: "self" },
    ],
    upgrade: {
      description: "Gain 14 block. Apply 3 Plated.",
      effects: [
        { type: "block", amount: 14 },
        { type: "applyStatus", status: "plated", amount: 3, target: "self" },
      ],
    },
  },

  pyre_wave: {
    id: "pyre_wave",
    name: "Pyre Wave",
    cost: 1,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "allEnemies",
    fallbackColor: ["#56231e", "#ff8a4d"],
    assetKey: "pyre_wave",
    description: "Apply 2 Burn to all enemies. Deal damage equal to target Burn.",
    effects: [
      { type: "applyStatus", status: "burn", amount: 2, target: "allEnemies" },
      {
        type: "scalingDamage",
        base: 0,
        perUnit: 1,
        scaling: "enemyBurn",
        target: "enemy",
      },
    ],
    upgrade: {
      description: "Apply 3 Burn to all enemies. Deal damage equal to target Burn.",
      effects: [
        { type: "applyStatus", status: "burn", amount: 3, target: "allEnemies" },
        {
          type: "scalingDamage",
          base: 0,
          perUnit: 1,
          scaling: "enemyBurn",
          target: "enemy",
        },
      ],
    },
  },

  whisper_edge: {
    id: "whisper_edge",
    name: "Whisper Edge",
    cost: 0,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#2b2e55", "#9a9dff"],
    assetKey: "whisper_edge",
    description: "Deal 5 damage. If target has Mark, draw 1.",
    effects: [
      { type: "damage", amount: 5 },
      { type: "drawIf", amount: 1, condition: "targetHasMark" },
    ],
    upgrade: {
      description: "Deal 7 damage. If target has Mark, draw 1.",
      effects: [
        { type: "damage", amount: 7 },
        { type: "drawIf", amount: 1, condition: "targetHasMark" },
      ],
    },
  },

  phase_vault: {
    id: "phase_vault",
    name: "Phase Vault",
    cost: 1,
    type: "Skill",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#1b3566", "#6ea7ff"],
    assetKey: "phase_vault",
    description: "Gain 8 block. Gain 2 Dexterity. Exhaust.",
    exhaustSelf: true,
    effects: [
      { type: "block", amount: 8 },
      { type: "applyStatus", status: "dexterity", amount: 2, target: "self" },
    ],
    upgrade: {
      description: "Gain 12 block. Gain 3 Dexterity. Exhaust.",
      effects: [
        { type: "block", amount: 12 },
        { type: "applyStatus", status: "dexterity", amount: 3, target: "self" },
      ],
    },
  },

  flurry: {
    id: "flurry",
    name: "Flurry",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#562a1a", "#ff9360"],
    assetKey: "flurry",
    description: "Deal 3 damage 3 times.",
    effects: [{ type: "damage", amount: 3, hits: 3 }],
    upgrade: {
      description: "Deal 4 damage 3 times.",
      effects: [{ type: "damage", amount: 4, hits: 3 }],
    },
  },

  bulwark_stance: {
    id: "bulwark_stance",
    name: "Bulwark Stance",
    cost: 1,
    type: "Skill",
    rarity: "Common",
    targetType: "self",
    fallbackColor: ["#1f4767", "#72cbff"],
    assetKey: "bulwark_stance",
    description: "Gain 7 block.",
    effects: [{ type: "block", amount: 7 }],
    upgrade: {
      description: "Gain 10 block.",
      effects: [{ type: "block", amount: 10 }],
    },
  },

  poisoned_edge: {
    id: "poisoned_edge",
    name: "Poisoned Edge",
    cost: 1,
    type: "Attack",
    rarity: "Common",
    targetType: "enemy",
    fallbackColor: ["#1f4a38", "#7ef09a"],
    assetKey: "poisoned_edge",
    description: "Deal 5 damage. Apply 2 Poison.",
    effects: [
      { type: "damage", amount: 5 },
      { type: "applyStatus", status: "poison", amount: 2, target: "enemy" },
    ],
    upgrade: {
      description: "Deal 7 damage. Apply 3 Poison.",
      effects: [
        { type: "damage", amount: 7 },
        { type: "applyStatus", status: "poison", amount: 3, target: "enemy" },
      ],
    },
  },

  tactical_draw: {
    id: "tactical_draw",
    name: "Tactical Draw",
    cost: 1,
    type: "Skill",
    rarity: "Uncommon",
    targetType: "self",
    fallbackColor: ["#1e3d65", "#78ecff"],
    assetKey: "tactical_draw",
    description: "Draw 2 cards.",
    effects: [{ type: "draw", amount: 2 }],
    upgrade: {
      cost: 0,
      description: "Draw 2 cards.",
      effects: [{ type: "draw", amount: 2 }],
    },
  },

  echo_blade: {
    id: "echo_blade",
    name: "Echo Blade",
    cost: 2,
    type: "Attack",
    rarity: "Uncommon",
    targetType: "enemy",
    fallbackColor: ["#25415e", "#7fbcff"],
    assetKey: "echo_blade",
    description: "Deal 8 damage twice.",
    effects: [{ type: "damage", amount: 8, hits: 2 }],
    upgrade: {
      description: "Deal 11 damage twice.",
      effects: [{ type: "damage", amount: 11, hits: 2 }],
    },
  },

  rally_cry: {
    id: "rally_cry",
    name: "Rally Cry",
    cost: 2,
    type: "Power",
    rarity: "Rare",
    targetType: "self",
    fallbackColor: ["#4e315d", "#bc6cff"],
    assetKey: "rally_cry",
    description: "Gain 2 Strength and 2 Dexterity.",
    effects: [
      { type: "applyStatus", status: "strength", amount: 2, target: "self" },
      { type: "applyStatus", status: "dexterity", amount: 2, target: "self" },
    ],
    upgrade: {
      description: "Gain 3 Strength and 3 Dexterity.",
      effects: [
        { type: "applyStatus", status: "strength", amount: 3, target: "self" },
        { type: "applyStatus", status: "dexterity", amount: 3, target: "self" },
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
    ...(up.retain !== undefined ? { retain: up.retain } : {}),
    ...(up.innate !== undefined ? { innate: up.innate } : {}),
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
