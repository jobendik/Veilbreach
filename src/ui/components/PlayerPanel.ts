import type { EnemyInstance, EnemyIntent, RunState, Unit } from "../../core/Types";
import { ENEMY_DB } from "../../data/enemies";
import { calculateEnemyAttackDamage } from "../../core/Rules";
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
  isTargetable: boolean,
  player?: Unit
): string {
  const def = ENEMY_DB[enemy.id];
  const intent: EnemyIntent | { icon: string; label: string; text: string } =
    enemy.intent ?? { icon: "?", label: "Thinking", text: "Unknown" };
  const targetableClass = isTargetable && !enemy.dead ? "targetable" : "";
  const deadClass = enemy.dead ? "dead" : "";
  const colorStyle = def
    ? `background:linear-gradient(135deg, ${def.color[0]}, ${def.color[1]});`
    : "";
  const intentText = buildIntentText(enemy, intent, player);
  const intentKind = (enemy.intent?.type ?? "unknown") as string;

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
      <div class="intent" data-intent-kind="${escapeHtml(intentKind)}">
        <span class="intent-icon">${intent.icon}</span>
        <div class="intent-body"><strong>${escapeHtml(intent.label)}</strong><br>${intentText}</div>
      </div>
      <div class="stat-row"><span>Block</span><strong>${enemy.block || 0}</strong></div>
      <div class="status-list">${renderStatuses(enemy.statuses)}</div>
    </div>
  `;
}

/**
 * Build the intent description line. Attack intents are shown with the
 * actual post-modifier damage the player will take (accounting for the
 * enemy's Strength/Weak and the player's Vulnerable), so players can plan
 * block precisely. Non-attack intents show their original descriptive text.
 */
function buildIntentText(
  enemy: EnemyInstance,
  intent: EnemyIntent | { icon: string; label: string; text: string },
  player?: Unit
): string {
  if (!player || !enemy.intent) return escapeHtml(intent.text);
  const live = enemy.intent;
  switch (live.type) {
    case "attack": {
      const dmg = calculateEnemyAttackDamage(live.amount, enemy, player);
      return `<span class="intent-dmg">⚔ ${dmg}</span>`;
    }
    case "multiAttack": {
      const dmg = calculateEnemyAttackDamage(live.amount, enemy, player);
      return `<span class="intent-dmg">⚔ ${dmg}×${live.hits}</span>
              <small class="intent-sub">(${dmg * live.hits})</small>`;
    }
    case "attackDebuff": {
      const dmg = calculateEnemyAttackDamage(live.amount, enemy, player);
      return `<span class="intent-dmg">⚔ ${dmg}</span>
              <small class="intent-sub">+ ${live.statusAmount} ${escapeHtml(live.status)}</small>`;
    }
    case "defend": {
      return `<span class="intent-def">⬡ ${live.amount}</span>`;
    }
    case "defendBuff": {
      return `<span class="intent-def">⬡ ${live.amount}</span>
              <small class="intent-sub">+ ${live.statusAmount} ${escapeHtml(live.status)}</small>`;
    }
    case "buff":
    case "debuff": {
      return `<small class="intent-sub">${live.amount} ${escapeHtml(live.status)}</small>`;
    }
    case "bossPhase": {
      return `<span class="intent-def">⬡ ${live.blockGain}</span>
              <small class="intent-sub">+ ${live.amount} ${escapeHtml(live.status)}</small>`;
    }
    default:
      return escapeHtml((live as { text: string }).text);
  }
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
