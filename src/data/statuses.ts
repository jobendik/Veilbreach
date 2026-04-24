import type { StatusId, StatusMeta } from "../core/Types";

export const STATUS_META: Record<StatusId, StatusMeta> = {
  strength: {
    label: "STR",
    icon: "✦",
    tip: "Strength increases attack damage by this amount.",
  },
  dexterity: {
    label: "DEX",
    icon: "✧",
    tip: "Dexterity increases block gained from cards.",
  },
  weak: {
    label: "WEAK",
    icon: "▽",
    tip: "Weak reduces attack damage dealt by 25%. Decreases each turn.",
  },
  vulnerable: {
    label: "VULN",
    icon: "◇",
    tip: "Vulnerable increases damage taken by 50%. Decreases each turn.",
  },
  frail: {
    label: "FRAIL",
    icon: "□",
    tip: "Frail reduces block gained from cards by 25%. Decreases each turn.",
  },
  poison: {
    label: "PSN",
    icon: "☠",
    tip:
      "Poison deals damage at the start of the afflicted unit's turn, then decreases.",
  },
  burn: {
    label: "BURN",
    icon: "🔥",
    tip:
      "Burn deals damage at the start of the afflicted unit's turn, then decreases.",
  },
  thorns: {
    label: "THRN",
    icon: "✹",
    tip: "Thorns deals damage back to attackers.",
  },
  mark: {
    label: "MARK",
    icon: "⌖",
    tip: "Mark makes the target take extra flat damage from attacks.",
  },
  plated: {
    label: "PLATE",
    icon: "⬡",
    tip: "Plated armor grants block at the start of each turn.",
  },
  ritual: {
    label: "RIT",
    icon: "◆",
    tip: "Ritual grants Strength at the end of the unit's turn.",
  },
};

/** Statuses that decay by 1 each turn (as opposed to statuses that persist). */
export const TEMPORARY_STATUSES: StatusId[] = [
  "weak",
  "vulnerable",
  "frail",
  "mark",
];

/** Statuses that tick damage at the start of their owner's turn. */
export const TICK_DAMAGE_STATUSES: StatusId[] = ["poison", "burn"];
