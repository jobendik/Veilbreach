/**
 * Keyword glossary. Card and relic descriptions reference these terms; the
 * CardView and RelicView append matching definitions to their hover tooltips
 * so new players never have to guess what "Scry", "Exhaust" or "Breach" do.
 *
 * Keep entries short (one sentence), lowercase-keyed by the canonical term,
 * and thematically consistent with Veilbreach's mystical sci-fi tone.
 */

export interface KeywordDef {
  /** Display label (rendered Title-Case in the tooltip). */
  label: string;
  /** One-line explanation. */
  tip: string;
}

export const KEYWORDS: Record<string, KeywordDef> = {
  // Card flow
  exhaust: {
    label: "Exhaust",
    tip: "Remove the card from play for the rest of this combat.",
  },
  retain: {
    label: "Retain",
    tip: "Stays in your hand at end of turn instead of being discarded.",
  },
  innate: {
    label: "Innate",
    tip: "Placed into your opening hand at the start of combat.",
  },
  scry: {
    label: "Scry",
    tip: "Look at the top cards of your draw pile; choose any to discard.",
  },

  // Signature mechanic
  breach: {
    label: "Breach",
    tip: "Fills your Breach Meter. At full charge you may Open the Veil for bonus damage.",
  },
  veil: {
    label: "Veil",
    tip: "Opening the Veil consumes a full Breach Meter and empowers the next few cards.",
  },

  // Statuses (mirror STATUS_META tips, so description-only cards still explain them)
  burn: {
    label: "Burn",
    tip: "Deals damage at the start of the afflicted unit's turn, then decays.",
  },
  poison: {
    label: "Poison",
    tip: "Deals damage at the start of the afflicted unit's turn, then decreases by 1.",
  },
  mark: {
    label: "Mark",
    tip: "The marked target takes extra flat damage from attacks.",
  },
  thorns: {
    label: "Thorns",
    tip: "Deals this much damage back to any attacker.",
  },
  plated: {
    label: "Plated",
    tip: "Grants block at the start of each turn.",
  },
  ritual: {
    label: "Ritual",
    tip: "Grants Strength at the end of the unit's turn.",
  },
  vulnerable: {
    label: "Vulnerable",
    tip: "Takes 50% more damage from attacks. Decreases each turn.",
  },
  weak: {
    label: "Weak",
    tip: "Deals 25% less attack damage. Decreases each turn.",
  },
  frail: {
    label: "Frail",
    tip: "Gains 25% less block from cards. Decreases each turn.",
  },
  strength: {
    label: "Strength",
    tip: "Increases attack damage dealt by this amount.",
  },
  dexterity: {
    label: "Dexterity",
    tip: "Increases block gained from cards by this amount.",
  },
};

/** Word-boundary regex keyed by lowercase term, shared across lookups. */
const KEYWORD_REGEX: Record<string, RegExp> = Object.fromEntries(
  Object.keys(KEYWORDS).map((key) => [key, new RegExp(`\\b${key}\\b`, "i")])
);

/**
 * Scan `text` for any known keyword. Returns each keyword at most once,
 * in insertion order of the `KEYWORDS` dictionary.
 */
export function findKeywordsIn(text: string): KeywordDef[] {
  if (!text) return [];
  const out: KeywordDef[] = [];
  for (const key of Object.keys(KEYWORDS)) {
    if (KEYWORD_REGEX[key].test(text)) out.push(KEYWORDS[key]);
  }
  return out;
}
