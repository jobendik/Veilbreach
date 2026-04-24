import type { RelicId } from "../core/Types";

/**
 * Event definitions drive the EventSystem. Each event declares its title,
 * narrative, and a list of choices. Choices reference effect keys that the
 * EventSystem maps to concrete behaviour; this keeps the per-event logic
 * centralized rather than scattered across per-file handlers.
 */

export type EventEffectKey =
  | "heal_small"
  | "heal_medium"
  | "lose_hp_small"
  | "lose_hp_medium"
  | "lose_max_hp_small"
  | "gain_max_hp"
  | "gain_gold_small"
  | "gain_gold_medium"
  | "lose_gold"
  | "gain_random_relic"
  | "gain_random_common_relic"
  | "upgrade_random_card"
  | "remove_card"
  | "leave";

export interface EventChoiceDef {
  id: string;
  label: string;
  /** Text shown under the label to hint at the consequence. */
  effectText: string;
  /** List of effect keys resolved in order when chosen. */
  effects: EventEffectKey[];
  /** Text displayed after the choice is resolved. */
  outcome: string;
  /** Optional: gold cost that must be paid. */
  goldCost?: number;
  /** Optional: minimum deck size required (only relevant for remove). */
  requiresRemovable?: boolean;
}

export interface EventDef {
  id: string;
  title: string;
  /** The main flavor text describing the scene. */
  text: string;
  choices: EventChoiceDef[];
  /** Optional event weight in random selection (default 10). */
  weight?: number;
}

export const EVENT_DB: Record<string, EventDef> = {
  mirror_camp: {
    id: "mirror_camp",
    title: "The Mirror Camp",
    text:
      "A quiet camp flickers inside a cracked reflection. The air hums softly, offering a moment of choice before the path bends onward.",
    choices: [
      {
        id: "rest",
        label: "Rest",
        effectText: "Heal 18 HP.",
        effects: ["heal_medium"],
        outcome: "You breathe deep. The warmth of the mirror stitches you back together.",
      },
      {
        id: "refine",
        label: "Refine",
        effectText: "Permanently upgrade a random upgradable card in your deck.",
        effects: ["upgrade_random_card"],
        outcome: "The mirror sharpens your memory into something finer.",
      },
      {
        id: "sacrifice",
        label: "Sacrifice",
        effectText: "Remove a random card from your deck. Gain 40 gold.",
        effects: ["remove_card", "gain_gold_medium"],
        outcome: "The mirror takes a piece of you and leaves coins in its place.",
        requiresRemovable: true,
      },
      {
        id: "leave",
        label: "Leave",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You step around the mirror without looking back.",
      },
    ],
  },

  golden_idol: {
    id: "golden_idol",
    title: "The Golden Idol",
    text:
      "A heavy golden idol sits on a cracked pedestal. Motes of dust drift around it. Taking it feels like it will anger something.",
    choices: [
      {
        id: "take",
        label: "Take the idol",
        effectText: "Gain 60 gold. Lose 5 HP.",
        effects: ["gain_gold_medium", "gain_gold_small", "lose_hp_small"],
        outcome: "The idol is warm in your hands. Something watches you leave.",
      },
      {
        id: "leave",
        label: "Leave it alone",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You let the idol rest on its pedestal.",
      },
    ],
    weight: 8,
  },

  starving_traveler: {
    id: "starving_traveler",
    title: "The Starving Traveler",
    text:
      "A ragged figure kneels by the path, thin and shivering. They ask for anything you can spare.",
    choices: [
      {
        id: "gold",
        label: "Give 30 gold",
        effectText: "Pay 30 gold. Gain a common relic.",
        effects: ["gain_random_common_relic"],
        goldCost: 30,
        outcome: "The traveler hands you a token before vanishing into the mist.",
      },
      {
        id: "blood",
        label: "Give blood",
        effectText: "Lose 5 HP. Gain 40 gold.",
        effects: ["lose_hp_small", "gain_gold_medium"],
        outcome: "They bind your wound and press a clink of coins into your palm.",
      },
      {
        id: "leave",
        label: "Walk past",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You walk past without looking back.",
      },
    ],
  },

  whispering_well: {
    id: "whispering_well",
    title: "The Whispering Well",
    text:
      "A stone well murmurs with voices. The water at the bottom glints in three colors at once.",
    choices: [
      {
        id: "drink",
        label: "Drink deep",
        effectText: "Gain 8 max HP. Heal 18 HP.",
        effects: ["gain_max_hp", "heal_medium"],
        outcome: "Strength flows through your limbs. The well goes silent.",
      },
      {
        id: "listen",
        label: "Listen to the whispers",
        effectText: "Upgrade a random card in your deck.",
        effects: ["upgrade_random_card"],
        outcome: "A whisper settles into your thoughts and sharpens a memory.",
      },
      {
        id: "spit",
        label: "Throw gold in",
        effectText: "Pay 20 gold. Gain a random common relic.",
        effects: ["gain_random_common_relic"],
        goldCost: 20,
        outcome: "Something rises from the water and presses a relic into your palm.",
      },
      {
        id: "leave",
        label: "Leave",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "The voices fade as you walk away.",
      },
    ],
  },

  null_altar: {
    id: "null_altar",
    title: "The Null Altar",
    text:
      "A featureless black slab sits cold in the corridor. A hand-shaped depression is carved into its surface, inviting pressure.",
    choices: [
      {
        id: "press",
        label: "Press your palm in",
        effectText: "Remove a random card from your deck. Gain 40 gold.",
        effects: ["remove_card", "gain_gold_medium"],
        outcome: "The altar drinks something of you and spits coins in return.",
        requiresRemovable: true,
      },
      {
        id: "study",
        label: "Study the carving",
        effectText: "Heal 8 HP.",
        effects: ["heal_small"],
        outcome: "The shape of the carving calms you for a moment.",
      },
      {
        id: "leave",
        label: "Leave",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You step around the altar and continue.",
      },
    ],
  },

  shrine_of_ash: {
    id: "shrine_of_ash",
    title: "Shrine of Ash",
    text:
      "A shrine of embers whispers prayers you half-remember. The ash at its base feels warm, waiting.",
    choices: [
      {
        id: "offer_hp",
        label: "Offer blood",
        effectText: "Lose 5 HP. Gain a random common relic.",
        effects: ["lose_hp_small", "gain_random_common_relic"],
        outcome: "The ash accepts the offering and presses a relic into your palm.",
      },
      {
        id: "offer_gold",
        label: "Offer 40 gold",
        effectText: "Pay 40 gold. Upgrade a random card.",
        effects: ["upgrade_random_card"],
        goldCost: 40,
        outcome: "The ash glows; a memory in your deck burns bright and clear.",
      },
      {
        id: "leave",
        label: "Leave",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You step past the shrine without a word.",
      },
    ],
  },

  cursed_blade: {
    id: "cursed_blade",
    title: "The Cursed Blade",
    text:
      "A jagged blade is driven into the stone. Pulling it free looks tempting, but the grip is crusted with dried blood.",
    choices: [
      {
        id: "take",
        label: "Take the blade",
        effectText: "Gain a random relic. Lose 8 HP.",
        effects: ["gain_random_relic", "lose_hp_medium"],
        outcome: "The blade leaves the stone. Your hand throbs.",
      },
      {
        id: "leave",
        label: "Leave the blade",
        effectText: "Gain 20 gold from a nearby corpse.",
        effects: ["gain_gold_small"],
        outcome: "You check the fallen warrior's purse instead and keep moving.",
      },
    ],
  },

  forgotten_locker: {
    id: "forgotten_locker",
    title: "The Forgotten Locker",
    text:
      "A rusted locker sits open in the dust. Inside, an old coin pouch is nestled beside something that looks alive.",
    choices: [
      {
        id: "coins",
        label: "Take the coins",
        effectText: "Gain 40 gold.",
        effects: ["gain_gold_medium"],
        outcome: "The locker rattles shut behind you.",
      },
      {
        id: "relic",
        label: "Take the thing",
        effectText: "Gain a random common relic. Lose 4 HP.",
        effects: ["gain_random_common_relic", "lose_hp_small"],
        outcome: "The thing bites once before settling into your pack.",
      },
      {
        id: "leave",
        label: "Leave the locker",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You leave the locker to its dust.",
      },
    ],
  },

  veil_fountain: {
    id: "veil_fountain",
    title: "The Veil Fountain",
    text:
      "A pool of glassy violet light ripples without wind. Something beyond the surface seems to watch back.",
    choices: [
      {
        id: "drink",
        label: "Drink deeply",
        effectText: "Gain 6 max HP. Lose 20 gold.",
        effects: ["gain_max_hp", "lose_gold"],
        outcome: "The violet runs cold through your veins. You feel reinforced.",
        goldCost: 20,
      },
      {
        id: "bathe",
        label: "Bathe in it",
        effectText: "Heal fully. Lose 8 max HP.",
        effects: ["heal_medium", "lose_max_hp_small"],
        outcome: "You leave whole, but something was taken in trade.",
      },
      {
        id: "leave",
        label: "Walk past",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "The pool quiets as you pass.",
      },
    ],
  },

  abandoned_forge: {
    id: "abandoned_forge",
    title: "The Abandoned Forge",
    text:
      "Coals still glow beneath a cold hammer. A workbench holds scraps, dust, and a half-finished blade.",
    choices: [
      {
        id: "work",
        label: "Work the forge",
        effectText: "Upgrade a random card. Lose 4 HP.",
        effects: ["upgrade_random_card", "lose_hp_small"],
        outcome: "The heat costs something, but your craft is sharpened.",
      },
      {
        id: "loot",
        label: "Loot the bench",
        effectText: "Gain 30 gold.",
        effects: ["gain_gold_small"],
        outcome: "You pocket what's left and move on.",
      },
      {
        id: "leave",
        label: "Leave",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "The coals are already dying as you go.",
      },
    ],
  },

  soul_merchant: {
    id: "soul_merchant",
    title: "The Soul Merchant",
    text:
      "A hooded figure offers a relic of unusual shape. 'A piece of you,' he says, 'for a piece of it.'",
    choices: [
      {
        id: "trade",
        label: "Accept the trade",
        effectText: "Lose 10 HP. Gain a random relic.",
        effects: ["lose_hp_medium", "gain_random_relic"],
        outcome: "He pockets the breath you didn't know you owed.",
      },
      {
        id: "refuse",
        label: "Refuse politely",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "He nods, already forgetting you.",
      },
    ],
  },

  dice_of_fate: {
    id: "dice_of_fate",
    title: "Dice of Fate",
    text:
      "A pair of bone dice rest on an altar. The runes on each face squirm when you aren't looking directly at them.",
    choices: [
      {
        id: "roll_hp",
        label: "Roll for vigor",
        effectText: "Gain 6 max HP, but lose 15 gold.",
        effects: ["gain_max_hp", "lose_gold"],
        outcome: "The dice still, glowing with your luck.",
        goldCost: 15,
      },
      {
        id: "roll_relic",
        label: "Roll for treasure",
        effectText: "Gain a random common relic. Lose 6 HP.",
        effects: ["gain_random_common_relic", "lose_hp_small"],
        outcome: "A relic clatters free from between the dice.",
      },
      {
        id: "leave",
        label: "Leave them",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "The runes still as you turn away.",
      },
    ],
  },

  lost_traveler: {
    id: "lost_traveler",
    title: "The Lost Traveler",
    text:
      "A weary traveler leans on a staff beside the road. She offers to teach you a trick she learned beyond the veil.",
    choices: [
      {
        id: "learn",
        label: "Listen closely",
        effectText: "Upgrade a random card.",
        effects: ["upgrade_random_card"],
        outcome: "You tuck the lesson away.",
      },
      {
        id: "tip",
        label: "Tip her generously",
        effectText: "Lose 30 gold. Gain 8 max HP.",
        effects: ["lose_gold", "gain_max_hp"],
        outcome: "She smiles, and you feel somehow steadier.",
        goldCost: 30,
      },
      {
        id: "leave",
        label: "Walk on",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "She waves at your back.",
      },
    ],
  },

  shattered_mirror: {
    id: "shattered_mirror",
    title: "The Shattered Mirror",
    text:
      "A tall mirror hangs cracked across its length. Your reflection's eyes don't quite move with yours.",
    choices: [
      {
        id: "touch",
        label: "Touch the crack",
        effectText: "Remove a card from your deck.",
        effects: ["remove_card"],
        outcome: "A card fades out of your memory as the crack widens.",
        requiresRemovable: true,
      },
      {
        id: "break",
        label: "Shatter it fully",
        effectText: "Lose 6 HP. Gain a random common relic.",
        effects: ["lose_hp_small", "gain_random_common_relic"],
        outcome: "Glass bites — but something falls out with it.",
      },
      {
        id: "leave",
        label: "Turn away",
        effectText: "Nothing happens.",
        effects: ["leave"],
        outcome: "You catch your reflection smiling as you leave.",
      },
    ],
  },
};

export const EVENT_IDS: string[] = Object.keys(EVENT_DB);

export function isValidEventId(id: string): id is keyof typeof EVENT_DB {
  return Object.prototype.hasOwnProperty.call(EVENT_DB, id);
}

/** Relics considered "common" for event rewards — excludes powerful boss-tier picks. */
export const COMMON_EVENT_RELICS: RelicId[] = [
  "brass_lung",
  "paper_moon",
  "cleric_vial",
  "cracked_lens",
  "mirror_seed",
  "obsidian_scale",
];
