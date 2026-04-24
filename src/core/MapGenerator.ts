import type { MapNode, MapState, NodeType } from "./Types";
import type { RNG } from "./RNG";
import { ENCOUNTER_POOLS } from "../data/encounters";
import { EVENT_IDS } from "../data/events";

/**
 * Generate a Slay-the-Spire-style branching map for a single act.
 *
 * The map has a fixed number of rows. Row 0 is the single start node,
 * the last row is the single boss node, and the rows in between contain
 * 3–5 nodes each. Paths connect parents on row R to 1–2 children on row
 * R+1. Connections never cross one another (i.e. if parent columns are
 * a and b with a<b, a's rightmost child column must be <= b's leftmost
 * child column). This is the same non-crossing rule StS uses to keep the
 * map readable.
 */

export interface MapGenOptions {
  rows?: number;
  pathsToCarve?: number;
  columns?: number;
  act?: number;
}

const DEFAULT_OPTIONS: Required<MapGenOptions> = {
  rows: 15,
  pathsToCarve: 6,
  columns: 7,
  act: 1,
};

export function generateMap(rng: RNG, opts: MapGenOptions = {}): MapState {
  const cfg = { ...DEFAULT_OPTIONS, ...opts };
  const { rows, pathsToCarve, columns, act } = cfg;

  // occupancy[row] = set of columns that have a node on that row
  const occupancy: Set<number>[] = Array.from({ length: rows }, () => new Set<number>());
  // edges[row] = list of [fromCol, toCol] pairs connecting row -> row+1
  const edges: [number, number][][] = Array.from({ length: rows - 1 }, () => []);

  // Row 0 and final row are singletons at the middle column.
  const mid = Math.floor(columns / 2);
  occupancy[0].add(mid);
  occupancy[rows - 1].add(mid);

  // Carve `pathsToCarve` paths from row 0 to row rows-2 (then all converge on boss).
  for (let p = 0; p < pathsToCarve; p++) {
    // Starting column on row 1 spread across the map width.
    let col = p < pathsToCarve / 2
      ? Math.max(0, p)
      : Math.min(columns - 1, columns - 1 - (pathsToCarve - 1 - p));
    occupancy[1].add(col);
    edges[0].push([mid, col]);

    for (let r = 1; r < rows - 2; r++) {
      const options = [col - 1, col, col + 1].filter((c) => c >= 0 && c < columns);
      // Non-crossing rule: pick a next column that doesn't cross an existing edge on this row.
      const legal = options.filter((nc) => !edgeCrosses(edges[r], col, nc));
      const pick = legal.length ? legal[Math.floor(rng.next() * legal.length)] : col;
      occupancy[r + 1].add(pick);
      edges[r].push([col, pick]);
      col = pick;
    }
    // Connect the last carved node to the boss at the top.
    occupancy[rows - 2].add(col);
    edges[rows - 2].push([col, mid]);
  }

  // Build MapNode records row by row.
  const nodes: Record<string, MapNode> = {};
  const rowsList: string[][] = [];
  const rowColToId: Map<string, string> = new Map();
  let counter = 0;
  const newId = (): string => `n${++counter}`;

  for (let r = 0; r < rows; r++) {
    const sortedCols = Array.from(occupancy[r]).sort((a, b) => a - b);
    const rowIds: string[] = [];
    for (const c of sortedCols) {
      const id = newId();
      rowIds.push(id);
      rowColToId.set(`${r}:${c}`, id);
      const type = decideNodeType(r, rows, rng);
      const node: MapNode = { id, type, row: r, col: c, next: [] };
      nodes[id] = node;
    }
    rowsList.push(rowIds);
  }

  // Deduplicate edges and wire up node.next.
  for (let r = 0; r < edges.length; r++) {
    const seen = new Set<string>();
    for (const [fromCol, toCol] of edges[r]) {
      const key = `${fromCol}->${toCol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const fromId = rowColToId.get(`${r}:${fromCol}`);
      const toId = rowColToId.get(`${r + 1}:${toCol}`);
      if (!fromId || !toId) continue;
      const from = nodes[fromId];
      if (!from.next.includes(toId)) from.next.push(toId);
    }
  }

  // Overwrite fixed rows: start = "start" on row 0; boss = "boss" on last row.
  for (const id of rowsList[0]) nodes[id].type = "start";
  for (const id of rowsList[rows - 1]) nodes[id].type = "boss";

  // Enforce StS structural rules:
  // - Row 1 & 2: guaranteed monster.
  // - Row rows-3 (pre-rest): rest.
  // - A dedicated treasure row near the middle.
  for (const id of rowsList[1] ?? []) nodes[id].type = "monster";
  for (const id of rowsList[2] ?? []) nodes[id].type = "monster";
  for (const id of rowsList[rows - 3] ?? []) nodes[id].type = "rest";
  const treasureRow = Math.floor(rows / 2);
  for (const id of rowsList[treasureRow] ?? []) nodes[id].type = "treasure";

  // No two adjacent elites/shops in the same column; eliminate trivial duplicates.
  for (let r = 3; r < rows - 3; r++) {
    const rowIds = rowsList[r];
    const prevRowIds = rowsList[r - 1] ?? [];
    const prevTypesByCol = new Map(prevRowIds.map((id) => [nodes[id].col, nodes[id].type] as const));
    for (const id of rowIds) {
      const n = nodes[id];
      if (n.type === "elite" && prevTypesByCol.get(n.col) === "elite") n.type = "monster";
      if (n.type === "shop" && prevTypesByCol.get(n.col) === "shop") n.type = "monster";
    }
  }

  // Assign concrete payloads (enemies for combat, eventIds for events).
  for (const id of Object.keys(nodes)) {
    const n = nodes[id];
    if (n.type === "monster") {
      const pick = ENCOUNTER_POOLS.normal[Math.floor(rng.next() * ENCOUNTER_POOLS.normal.length)];
      n.enemies = pick.enemies.slice();
      n.name = pick.name;
    } else if (n.type === "elite") {
      const pick = ENCOUNTER_POOLS.elite[Math.floor(rng.next() * ENCOUNTER_POOLS.elite.length)];
      n.enemies = pick.enemies.slice();
      n.name = pick.name;
    } else if (n.type === "boss") {
      const pick = ENCOUNTER_POOLS.boss[Math.floor(rng.next() * ENCOUNTER_POOLS.boss.length)];
      n.enemies = pick.enemies.slice();
      n.name = pick.name;
    } else if (n.type === "event") {
      n.eventId = EVENT_IDS[Math.floor(rng.next() * EVENT_IDS.length)];
      n.name = "Unknown";
    } else if (n.type === "shop") {
      n.name = "Shop";
    } else if (n.type === "rest") {
      n.name = "Rest Site";
    } else if (n.type === "treasure") {
      n.name = "Treasure";
    } else if (n.type === "start") {
      n.name = "Start";
    }
  }

  const startId = rowsList[0][0];
  return {
    nodes,
    rows: rowsList,
    playerNodeId: startId,
    availableNodeIds: nodes[startId].next.slice(),
    totalRows: rows,
    act,
  };
}

/**
 * Randomly choose a node type for a mid-map row. Rows 1–2 and the pre-boss
 * rows are overwritten by the generator, so this distribution is only used
 * for the middle section of the map.
 */
function decideNodeType(row: number, totalRows: number, rng: RNG): NodeType {
  // Early rows prefer monster; elites only after row 4.
  const roll = rng.next();
  if (row < 4) {
    if (roll < 0.7) return "monster";
    if (roll < 0.9) return "event";
    return "shop";
  }
  if (row < Math.floor(totalRows * 0.6)) {
    if (roll < 0.5) return "monster";
    if (roll < 0.7) return "event";
    if (roll < 0.85) return "elite";
    return "shop";
  }
  // Late middle: higher elite density.
  if (roll < 0.45) return "monster";
  if (roll < 0.65) return "event";
  if (roll < 0.85) return "elite";
  return "shop";
}

function edgeCrosses(rowEdges: [number, number][], fromCol: number, toCol: number): boolean {
  for (const [ofc, otc] of rowEdges) {
    if (ofc === fromCol && otc === toCol) continue;
    // Edges cross when (fromCol - ofc) and (toCol - otc) have opposite signs.
    const dFrom = fromCol - ofc;
    const dTo = toCol - otc;
    if (dFrom === 0 || dTo === 0) continue;
    if (dFrom * dTo < 0) return true;
  }
  return false;
}

/** Compute the list of nodes the player can click next based on current node. */
export function computeAvailableNodes(map: MapState): string[] {
  const node = map.nodes[map.playerNodeId];
  if (!node) return [];
  return node.next.slice();
}
