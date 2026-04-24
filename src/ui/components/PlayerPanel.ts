import type { EnemyInstance, EnemyIntent, RunState } from "../../core/Types";
import { ENEMY_DB } from "../../data/enemies";
import { renderRelic } from "./RelicView";
import { renderStatuses } from "./StatusView";

export function renderPlayerPanel(run: RunState): string {
  return `
    <aside class="panel player-panel" data-unit="player">
      <div class="panel-header">
        <h3>Player</h3>
        <span class="pill">Veil Pilot</span>
      </div>
      <div class="panel-body">
        <div class="stat-row"><span>HP</span><strong data-hp-label>${run.hp}/${run.maxHp}</strong></div>
        <div class="bar hpbar"><span data-hp-bar style="width:${percent(run.hp, run.maxHp)}%"></span></div>
        <div class="stat-row"><span>Block</span><strong data-block-label>${run.block || 0}</strong></div>
        <div class="stat-row"><span>Deck</span><strong>${run.deck.length} cards</strong></div>
        <div style="margin-top:14px;">
          <div class="status-list" data-player-statuses>${renderStatuses(run.statuses)}</div>
        </div>
        <div class="relic-row">
          ${
            (run.relics || []).map((id) => renderRelic(id)).join("") ||
            `<span class="pill">No relics yet</span>`
          }
        </div>
      </div>
    </aside>
  `;
}

export function renderEnemy(
  enemy: EnemyInstance,
  isTargetable: boolean
): string {
  const def = ENEMY_DB[enemy.id];
  const intent: EnemyIntent | { icon: string; label: string; text: string } =
    enemy.intent ?? { icon: "?", label: "Thinking", text: "Unknown" };
  const targetableClass = isTargetable && !enemy.dead ? "targetable" : "";
  const deadClass = enemy.dead ? "dead" : "";
  const colorStyle = def
    ? `background:linear-gradient(135deg, ${def.color[0]}, ${def.color[1]});`
    : "";

  return `
    <div class="enemy ${targetableClass} ${deadClass}"
         data-enemy="${enemy.uid}"
         data-unit="${enemy.uid}"
         role="button"
         tabindex="0"
         aria-label="${escapeHtml(enemy.name)}">
      <div class="enemy-name"><span>${escapeHtml(enemy.name)}</span><span>${enemy.hp}/${enemy.maxHp}</span></div>
      <div class="${enemy.boss ? "bar bossbar" : "bar enemybar"}">
        <span style="width:${percent(enemy.hp, enemy.maxHp)}%"></span>
      </div>
      <div class="enemy-silhouette" style="${colorStyle}"></div>
      <div class="intent">
        <span style="font-size:22px;">${intent.icon}</span>
        <div><strong>${escapeHtml(intent.label)}</strong><br>${escapeHtml(intent.text)}</div>
      </div>
      <div class="stat-row"><span>Block</span><strong>${enemy.block || 0}</strong></div>
      <div class="status-list">${renderStatuses(enemy.statuses)}</div>
    </div>
  `;
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
