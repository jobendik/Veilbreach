import type { GameState } from "../../core/Types";
import { getCardData } from "../../data/cards";
import { renderCardElement } from "../components/CardView";
import { renderEnemy } from "../components/EnemyView";
import { renderPlayerPanel } from "../components/PlayerPanel";
import { renderStatuses } from "../components/StatusView";
import { renderLogPanel } from "../components/CombatLog";
import { ENCOUNTERS } from "../../data/encounters";
import { POTION_DB } from "../../data/potions";
import type { EnemyInstance } from "../../core/Types";

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
    : state.selectedPotionSlot !== null
      ? "Target an enemy to use the selected potion."
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
    .map((enemy) => renderEnemy(enemy, !!state.selectedCardUid || state.selectedPotionSlot !== null, run))
    .join("");

  const potionBar = renderPotionBar(run.potions, combat.enemies, state.selectedPotionSlot);

  // Header pill: legacy linear-encounter mode shows "Encounter N/M"; the
  // branching map (encounterIndex = -1) uses act/row coordinates pulled from
  // the map state instead of a bogus 0/N counter.
  const headerPill = (() => {
    if (combat.encounterIndex >= 0) {
      return `<span class="pill"><strong>Encounter</strong> ${combat.encounterIndex + 1}/${ENCOUNTERS.length}</span>`;
    }
    const nodeId = run.currentNodeId;
    const node = nodeId ? run.map.nodes[nodeId] : null;
    const row = node ? node.row + 1 : 0;
    return `<span class="pill"><strong>Act ${run.map.act}</strong> · Row ${row}/${run.map.totalRows}</span>`;
  })();

  return `
    <main class="screen combat-screen ${state.isResolving ? "is-resolving" : ""}">
      <div class="combat-layout">
        <header class="topbar">
          <div class="run-title">
            ${headerPill}
            <span class="pill"><strong>${escapeHtml(combat.encounterName)}</strong></span>
          </div>
          <div class="run-title">
            <span class="pill energy"><strong data-energy>${combat.energy}</strong> Energy</span>
            <span class="pill hp"><strong data-hp>${run.hp}/${run.maxHp}</strong> HP</span>
            <span class="pill block"><strong data-block>${run.block || 0}</strong> Block</span>
            <span class="pill gold"><strong>${run.gold}</strong> Gold</span>
            ${renderBreachPill(combat.breach, combat.breachMax)}
          </div>
          <div class="combat-potion-bar">${potionBar}</div>
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
            <button class="primary veil-btn ${combat.breach >= combat.breachMax ? "is-ready" : ""}"
                    data-action="open-veil"
                    type="button"
                    ${canEndTurn && combat.breach >= combat.breachMax ? "" : "disabled"}
                    title="Open the Veil: +1 Energy, draw 2 cards, tick Burn/Poison, next 2 attacks are empowered (+50%).">
              Open the Veil ${combat.veilEmpoweredStacks > 0 ? `· ${combat.veilEmpoweredStacks}⚡` : ""}
            </button>
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

function renderBreachPill(breach: number, breachMax: number): string {
  const pct = Math.min(100, Math.max(0, (breach / Math.max(1, breachMax)) * 100));
  const ready = breach >= breachMax;
  return `
    <span class="pill breach ${ready ? "ready" : ""}" title="Breach Meter: fills from playing cards, applying statuses and exhausting. When full, click Open the Veil.">
      <strong>${breach}/${breachMax}</strong> Breach
      <span class="breach-bar"><span class="breach-fill" style="width:${pct}%"></span></span>
    </span>
  `;
}

function renderPotionBar(
  potions: (string | null)[],
  enemies: EnemyInstance[],
  selectedSlot: number | null
): string {
  const aliveEnemies = enemies.filter((e) => !e.dead && e.hp > 0);
  const defaultEnemyUid =
    aliveEnemies.length === 1 ? aliveEnemies[0].uid : "";
  return potions
    .map((id, slot) => {
      if (!id) return `<div class="potion-slot empty" title="Empty slot"></div>`;
      const data = POTION_DB[id];
      if (!data) return `<div class="potion-slot empty"></div>`;
      // Enemy-target potions with multiple living enemies arm a target-
      // selection flow instead of being disabled outright: the button sets
      // selectedPotionSlot and the next enemy click consumes the potion.
      const needsEnemyPick =
        data.target === "enemy" && aliveEnemies.length > 1;
      const isArmed = selectedSlot === slot;
      const icon = data.icon;
      const gradient = `background:linear-gradient(180deg, ${data.color[0]}, ${data.color[1]});`;
      return `
        <div class="potion-slot filled ${isArmed ? "is-armed" : ""}" data-slot="${slot}" title="${escapeHtml(data.name)} — ${escapeHtml(data.description)}">
          <button class="potion-use"
                  data-action="${needsEnemyPick ? "arm-potion" : "use-potion"}"
                  data-slot="${slot}"
                  ${defaultEnemyUid && !needsEnemyPick ? `data-enemy="${defaultEnemyUid}"` : ""}
                  style="${gradient}"
                  type="button">${icon}</button>
          <button class="potion-discard small-btn ghost"
                  data-action="discard-potion"
                  data-slot="${slot}"
                  type="button"
                  title="Discard">×</button>
        </div>
      `;
    })
    .join("");
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
