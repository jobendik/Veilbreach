import type { GameState } from "../../core/Types";
import { RELIC_DB } from "../../data/relics";

/**
 * Treasure chest screen. Displays the rolled relic and lets the player
 * take it (or leave it behind).
 */
export function renderTreasureScreen(state: GameState): string {
  const treasure = state.treasure!;
  const relicId = treasure.relicId;
  const relic = relicId ? RELIC_DB[relicId] : null;

  const relicHtml = relic
    ? `
      <div class="treasure-relic">
        <div class="relic-big"><span class="relic-icon">${relic.icon}</span></div>
        <strong>${escapeHtml(relic.name)}</strong>
        <small>${escapeHtml(relic.description)}</small>
      </div>
    `
    : `<div class="empty-note">The chest is empty — you already own every relic.</div>`;

  return `
    <main class="screen treasure-screen">
      <section class="treasure-box">
        <div class="eyebrow">Treasure</div>
        <h2>A Sealed Chest</h2>
        <p class="subtitle left-aligned">The lid swings open with a faint chime.</p>
        ${relicHtml}
        <div class="treasure-actions">
          <button class="primary"
                  data-action="treasure-take"
                  ${relic ? "" : "disabled"}
                  type="button">Take</button>
          <button class="ghost" data-action="treasure-leave" type="button">Leave</button>
        </div>
      </section>
    </main>
  `;
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
