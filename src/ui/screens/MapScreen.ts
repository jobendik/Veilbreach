import type { GameState, MapNode, MapState } from "../../core/Types";

/**
 * Renders the branching act map. Each row is a flex row; nodes are
 * positioned by their `col` within a fixed column count so that edges
 * drawn as SVG overlays line up with the node centers.
 */
export function renderMapScreen(state: GameState): string {
  const run = state.run!;
  const map = run.map;
  const available = new Set(map.availableNodeIds);
  const current = map.playerNodeId;
  const columns = estimateColumns(map);

  const rowsHtml = map.rows
    .slice()
    .reverse() // top of screen = boss (last row); bottom = start
    .map((rowIds, displayIdx) => {
      const realRow = map.rows.length - 1 - displayIdx;
      const rowNodes = rowIds.map((id) => map.nodes[id]);
      return `
        <div class="map-row" data-row="${realRow}">
          ${renderRowCells(rowNodes, columns, available, current)}
        </div>
      `;
    })
    .join("");

  const potionBar = renderPotionBar(run.potions);

  return `
    <main class="screen map-screen">
      <header class="topbar map-topbar">
        <div class="run-title">
          <span class="pill"><strong>Act ${map.act}</strong></span>
          <span class="pill"><strong>${run.hp}/${run.maxHp}</strong> HP</span>
          <span class="pill gold"><strong>${run.gold}</strong> Gold</span>
          <span class="pill"><strong>${run.relics.length}</strong> Relics</span>
        </div>
        <div class="map-potion-bar">${potionBar}</div>
        <div class="topbar-actions">
          <button class="small-btn ghost" data-action="view-deck" type="button">View Deck</button>
          <button class="small-btn ghost" data-action="save-now" type="button">Save</button>
          <button class="small-btn danger" data-action="abandon" type="button">Abandon</button>
        </div>
      </header>

      <section class="map-body">
        <div class="map-grid">${rowsHtml}</div>
      </section>
    </main>
  `;
}

function estimateColumns(map: MapState): number {
  let max = 0;
  for (const id of Object.keys(map.nodes)) {
    const col = map.nodes[id].col;
    if (col > max) max = col;
  }
  return max + 1;
}

function renderRowCells(
  rowNodes: MapNode[],
  columns: number,
  available: Set<string>,
  currentId: string
): string {
  const byCol = new Map<number, MapNode>();
  for (const n of rowNodes) byCol.set(n.col, n);
  const cells: string[] = [];
  for (let c = 0; c < columns; c++) {
    const node = byCol.get(c);
    if (!node) {
      cells.push(`<div class="map-cell empty"></div>`);
      continue;
    }
    cells.push(renderNode(node, available, currentId));
  }
  return cells.join("");
}

function renderNode(node: MapNode, available: Set<string>, currentId: string): string {
  const isAvailable = available.has(node.id);
  const isCurrent = node.id === currentId;
  const isCleared = !!node.cleared;
  const classes = [
    "map-node",
    `node-${node.type}`,
    isAvailable ? "is-available" : "",
    isCurrent ? "is-current" : "",
    isCleared ? "is-cleared" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const disabled = isAvailable && !isCurrent ? "" : "disabled";
  const icon = nodeIcon(node.type);
  const label = node.name ?? nodeLabel(node.type);
  return `
    <div class="map-cell">
      <button class="${classes}"
              data-action="visit-node"
              data-node="${node.id}"
              title="${escapeHtml(label)}"
              ${disabled}
              type="button">
        <span class="node-icon">${icon}</span>
      </button>
      <div class="node-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function nodeIcon(type: MapNode["type"]): string {
  switch (type) {
    case "monster": return "⚔";
    case "elite": return "☠";
    case "boss": return "👑";
    case "shop": return "$";
    case "rest": return "🔥";
    case "treasure": return "◆";
    case "event": return "?";
    case "start": return "●";
  }
}

function nodeLabel(type: MapNode["type"]): string {
  switch (type) {
    case "monster": return "Enemy";
    case "elite": return "Elite";
    case "boss": return "Boss";
    case "shop": return "Shop";
    case "rest": return "Rest Site";
    case "treasure": return "Treasure";
    case "event": return "Unknown";
    case "start": return "Start";
  }
}

function renderPotionBar(potions: (string | null)[]): string {
  return potions
    .map((id, slot) => {
      if (!id) return `<div class="potion-slot empty" title="Empty slot"></div>`;
      return `
        <div class="potion-slot filled" data-slot="${slot}">
          <button class="potion-use"
                  data-action="use-potion"
                  data-slot="${slot}"
                  type="button"
                  title="Use potion">${escapeHtml(id)}</button>
          <button class="potion-discard ghost small-btn"
                  data-action="discard-potion"
                  data-slot="${slot}"
                  type="button"
                  title="Discard potion">×</button>
        </div>
      `;
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
