import type { GameState } from "../../core/Types";
import { renderMiniCard } from "../components/CardView";

export function renderEventScreen(state: GameState): string {
  const event = state.event!;
  const run = state.run!;
  const used = event.used;
  return `
    <main class="screen event-screen">
      <section class="event-box">
        <div class="eyebrow">Branch Event</div>
        <h2>${escapeHtml(event.title)}</h2>
        <p class="subtitle left-aligned">${escapeHtml(event.text)}</p>
        <div class="event-actions">
          <button class="primary" data-action="event-rest" ${used ? "disabled" : ""} type="button">Rest: Heal 18 HP</button>
          <button data-action="event-upgrade" ${used ? "disabled" : ""} type="button">Refine: Upgrade a Card</button>
          <button data-action="event-remove" ${used ? "disabled" : ""} type="button">Sacrifice: Remove a Card</button>
        </div>
        <div class="event-deck-section">
          <h3>Your Deck</h3>
          <div class="deck-view">
            ${run.deck.map((card) => renderMiniCard(card)).join("")}
          </div>
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
