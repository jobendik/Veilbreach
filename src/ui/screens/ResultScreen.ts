import type { GameState } from "../../core/Types";
import { RELIC_DB } from "../../data/relics";

export function renderResultScreen(state: GameState, won: boolean): string {
  const run = state.run;
  const relicNames =
    (run?.relics ?? [])
      .map((id) => RELIC_DB[id]?.name)
      .filter((name): name is string => !!name)
      .join(", ") || "None";

  return `
    <main class="screen result-screen">
      <section class="logo">
        <div class="eyebrow">${won ? "Run Complete" : "Run Failed"}</div>
        <h1>${won ? "Victory" : "Defeat"}</h1>
        <p class="subtitle">
          ${
            won
              ? "The Seraph Engine collapses. Your deck survived the breach."
              : "The breach consumes the run. A new deck may yet find the path."
          }
        </p>
        <div class="menu-grid">
          <div class="feature-card">
            <strong>Encounters cleared</strong>
            <span>${run?.defeated ?? 0}</span>
          </div>
          <div class="feature-card">
            <strong>Final deck size</strong>
            <span>${run?.deck?.length ?? 0} cards</span>
          </div>
          <div class="feature-card">
            <strong>Relics</strong>
            <span>${escapeHtml(relicNames)}</span>
          </div>
        </div>
        <div class="menu-actions">
          <button class="primary" data-action="new-run" type="button">Start New Run</button>
          <button class="ghost" data-action="menu" type="button">Main Menu</button>
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
