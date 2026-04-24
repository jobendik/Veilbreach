import type { StatusId, StatusMap } from "../../core/Types";
import { STATUS_META } from "../../data/statuses";

export function renderStatuses(statuses: StatusMap | undefined): string {
  const entries = Object.entries(statuses ?? {}).filter(
    ([, v]) => typeof v === "number" && v > 0
  ) as [StatusId, number][];

  if (!entries.length) {
    return `<span class="status" data-tip="No active statuses.">Clear</span>`;
  }
  return entries
    .map(([key, value]) => {
      const meta = STATUS_META[key] ?? {
        label: String(key).toUpperCase(),
        icon: "•",
        tip: String(key),
      };
      return `<span class="status" data-tip="${escapeHtml(meta.tip)}">${meta.icon} ${meta.label} ${value}</span>`;
    })
    .join("");
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
