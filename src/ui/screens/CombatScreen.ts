import type { GameState } from "../../core/Types";
import { getCardData } from "../../data/cards";
import { renderCardElement } from "../components/CardView";
import { renderEnemy } from "../components/EnemyView";
import { renderPlayerPanel } from "../components/PlayerPanel";
import { renderStatuses } from "../components/StatusView";
import { renderLogPanel } from "../components/CombatLog";

/**
 * Renders the complete combat screen as an HTML string. Re-rendered only
 * on screen changes and between stable checkpoints; partial updates
 * (HP bars, energy, etc.) are handled directly by Renderer.ts via
 * targeted DOM queries.
 */
export function renderCombatScreen(state: GameState): string {
  const run = state.run!;
  const combat = state.combat!;
  const canEndTurn = combat.phase === "player" && !state.isResolving;
  const playerTurnNote = state.isResolving
    ? "Resolving…"
    : state.selectedCardUid
      ? "Target an enemy to play the selected card."
      : "Hover cards and statuses for details. Enemy intents show their next action.";

  const handHtml = combat.hand
    .map((card) => {
      const data = getCardData(card);
      const cost = card.tempCost !== null ? card.tempCost : data.cost;
      const playable =
        combat.phase === "player" && !state.isResolving && combat.energy >= cost;
      return renderCardElement(card, {
        zone: "hand",
        playable,
        selected: state.selectedCardUid === card.uid,
      });
    })
    .join("");

  const enemiesHtml = combat.enemies
    .map((enemy) => renderEnemy(enemy, !!state.selectedCardUid))
    .join("");

  return `
    <main class="screen combat-screen ${state.isResolving ? "is-resolving" : ""}">
      <div class="combat-layout">
        <header class="topbar">
          <div class="run-title">
            <span class="pill"><strong>Encounter</strong> ${combat.encounterIndex + 1}/4</span>
            <span class="pill"><strong>${escapeHtml(combat.encounterName)}</strong></span>
          </div>
          <div class="run-title">
            <span class="pill energy"><strong data-energy>${combat.energy}</strong> Energy</span>
            <span class="pill hp"><strong data-hp>${run.hp}/${run.maxHp}</strong> HP</span>
            <span class="pill block"><strong data-block>${run.block || 0}</strong> Block</span>
          </div>
          <div class="topbar-actions">
            <button class="small-btn ghost" data-action="view-deck" type="button">View Deck</button>
            <button class="small-btn ghost" data-action="save-now" type="button">Save</button>
            <button class="small-btn danger" data-action="abandon" type="button">Abandon</button>
          </div>
        </header>

        <section class="arena">
          ${renderPlayerPanel(run)}
          <div class="battlefield">
            <div class="turn-banner" data-turn-banner>
              ${combat.phase === "player" ? `Your Turn ${combat.turn}` : "Enemy Turn"}
            </div>
            <div class="enemy-area" data-enemies>${enemiesHtml}</div>
            <div class="player-stage">
              <div class="player-avatar" data-unit="player">
                <strong>Veil Pilot</strong>
                <div class="stat-row"><span>HP</span><strong data-hp-inline>${run.hp}/${run.maxHp}</strong></div>
                <div class="bar hpbar">
                  <span data-hp-inline-bar style="width:${percent(run.hp, run.maxHp)}%"></span>
                </div>
                <div style="margin-top:8px;" class="status-list">${renderStatuses(run.statuses)}</div>
              </div>
            </div>
          </div>
          ${renderLogPanel(state.log)}
        </section>

        <section class="hand-zone">
          <div class="pile-stats">
            ${renderPile("Draw", combat.drawPile.length)}
            ${renderPile("Discard", combat.discardPile.length)}
            ${renderPile("Exhaust", combat.exhaustPile.length)}
          </div>
          <div class="hand" data-hand>${handHtml}</div>
          <div class="combat-actions">
            <button class="primary"
                    data-action="end-turn"
                    type="button"
                    ${canEndTurn ? "" : "disabled"}>End Turn</button>
            <button class="ghost" data-action="view-deck" type="button">Deck</button>
            <div class="notice" data-notice>${escapeHtml(playerTurnNote)}</div>
          </div>
        </section>
      </div>
    </main>
  `;
}

function renderPile(label: string, count: number): string {
  return `<div class="pile"><b>${count}</b><span>${label}</span></div>`;
}

function percent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
