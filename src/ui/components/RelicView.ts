import type { RelicId } from "../../core/Types";
import { RELIC_DB } from "../../data/relics";
import { findKeywordsIn } from "../../data/keywords";

/**
 * Render a relic chip. The hover tooltip shows the relic name, rarity and
 * description, and appends short glossary entries for any keywords
 * referenced in its description (e.g. Burn, Mark, Breach, Exhaust).
 */
export function renderRelic(id: RelicId): string {
  const relic = RELIC_DB[id];
  if (!relic) return "";
  const rarity = relic.rarity ?? "Common";
  const header = `${relic.name} — ${rarity}\n${relic.description}`;
  const keywords = findKeywordsIn(relic.description);
  const tip = keywords.length
    ? `${header}\n\n${keywords.map((k) => `${k.label}: ${k.tip}`).join("\n")}`
    : header;
  return `<div class="relic" data-rarity="${rarity}" data-tip="${escapeHtml(tip)}">${relic.icon}</div>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
