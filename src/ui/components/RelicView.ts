import type { RelicId } from "../../core/Types";
import { RELIC_DB } from "../../data/relics";

export function renderRelic(id: RelicId): string {
  const relic = RELIC_DB[id];
  if (!relic) return "";
  return `<div class="relic" data-tip="${escapeHtml(
    `${relic.name}: ${relic.description}`
  )}">${relic.icon}</div>`;
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
