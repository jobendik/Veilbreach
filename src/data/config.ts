import type { CardId } from "../core/Types";

export const DEBUG_MODE = false;

export const CONFIG = {
  saveKey: "veilbreach_relic_deck_save_v2",
  /** The old single-file save key, checked during load for migration. */
  legacySaveKey: "veilbreach_relic_deck_save_v1",
  startingMaxHp: 72,
  startingEnergy: 3,
  startingHandSize: 5,
  rewardCardChoices: 3,
  normalEncountersBeforeBoss: 3,
  autoSave: true,
  minDeckSize: 6,
  /** Number of log entries kept in-memory. Older lines scroll off. */
  maxLogLines: 80,
} as const;

export const STARTING_DECK: CardId[] = [
  "strike",
  "strike",
  "strike",
  "strike",
  "guard",
  "guard",
  "guard",
  "quick_cut",
  "focus",
  "ember_spark",
];

export const RARITY_WEIGHT: Record<"Common" | "Uncommon" | "Rare", number> = {
  Common: 68,
  Uncommon: 25,
  Rare: 7,
};

export const TYPE_SIGIL: Record<string, string> = {
  Attack: "⚔",
  Skill: "◆",
  Power: "✦",
  Status: "☄",
};
