import type {
  CardInstance,
  CombatState,
  EnemyInstance,
  GameScreen,
  GameState,
  LoadResult,
  RelicId,
  RunState,
  SaveData,
  StatusMap,
} from "./Types";
import { SAVE_VERSION } from "./Types";
import { CONFIG } from "../data/config";
import { isValidCardId, createCardInstance } from "../data/cards";
import { isValidEnemyId } from "../data/enemies";
import { isValidRelicId } from "../data/relics";

const VALID_SCREENS: GameScreen[] = ["menu", "combat", "reward", "event", "win", "lose"];

/**
 * Returns true when the current state is at a stable checkpoint where saving
 * is safe. Saving during enemy turns or mid-effect resolution is refused
 * because the async flow can't reliably be resumed from JSON.
 */
export function canSave(state: GameState): boolean {
  if (state.isResolving) return false;
  if (state.screen === "win" || state.screen === "lose") return false;
  if (state.screen === "menu") return false;
  if (state.screen === "combat") {
    if (!state.combat) return false;
    if (state.combat.phase !== "player") return false;
  }
  return !!state.run;
}

/** Writes the current state to localStorage, if it's safe to do so. */
export function saveIfStable(state: GameState): boolean {
  if (!CONFIG.autoSave) return false;
  if (!canSave(state)) return false;
  const data: SaveData = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    run: state.run!,
    screen: state.screen,
    combat: state.combat,
    reward: state.reward,
    event: state.event,
    log: state.log.slice(-20),
  };
  try {
    localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Save failed:", err);
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(CONFIG.saveKey);
    localStorage.removeItem(CONFIG.legacySaveKey);
  } catch {
    /* ignore quota/security errors */
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(CONFIG.saveKey) !== null;
  } catch {
    return false;
  }
}

/**
 * Load and validate a save. On any failure returns an `ok: false` LoadResult
 * with a reason string — the caller is responsible for showing a user-facing
 * message and clearing the bad save.
 */
export function loadSave(): LoadResult {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(CONFIG.saveKey);
  } catch (err) {
    return { ok: false, reason: "Could not access local storage." };
  }

  if (!raw) {
    // Try legacy save key as a last resort.
    try {
      raw = localStorage.getItem(CONFIG.legacySaveKey);
    } catch {
      /* ignore */
    }
  }

  if (!raw) return { ok: false, reason: "No save found." };

  return parseSave(raw);
}

/**
 * Parse and validate a raw JSON string as a `SaveData` without touching
 * `localStorage`. Useful for unit tests and offline validation tooling.
 */
export function parseSave(raw: string): LoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "Save file is not valid JSON." };
  }

  return validateSaveData(parsed);
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

function isValidStatusMap(x: unknown): x is StatusMap {
  if (!isObject(x)) return false;
  for (const [, v] of Object.entries(x)) {
    if (!isFiniteNumber(v)) return false;
  }
  return true;
}

function isValidCardInstance(x: unknown): x is CardInstance {
  if (!isObject(x)) return false;
  if (typeof x.uid !== "string") return false;
  if (typeof x.cardId !== "string" || !isValidCardId(x.cardId)) return false;
  if (typeof x.upgraded !== "boolean") return false;
  if (x.tempCost !== null && !isFiniteNumber(x.tempCost)) return false;
  return true;
}

function isValidCardArray(x: unknown): x is CardInstance[] {
  return Array.isArray(x) && x.every(isValidCardInstance);
}

function isValidEnemyInstance(x: unknown): x is EnemyInstance {
  if (!isObject(x)) return false;
  if (typeof x.uid !== "string") return false;
  if (typeof x.id !== "string" || !isValidEnemyId(x.id)) return false;
  if (typeof x.name !== "string") return false;
  if (!isFiniteNumber(x.hp) || !isFiniteNumber(x.maxHp)) return false;
  if (!isFiniteNumber(x.block)) return false;
  if (!isValidStatusMap(x.statuses)) return false;
  if (typeof x.dead !== "boolean") return false;
  if (typeof x.boss !== "boolean") return false;
  if (typeof x.phaseAnnounced !== "boolean") return false;
  // intent can be null or any object; we don't deeply validate it.
  return true;
}

function isValidRun(x: unknown): x is RunState {
  if (!isObject(x)) return false;
  if (typeof x.id !== "string") return false;
  if (!isFiniteNumber(x.encounterIndex)) return false;
  if (!isFiniteNumber(x.maxHp) || !isFiniteNumber(x.hp)) return false;
  if (!isFiniteNumber(x.block)) return false;
  if (!isValidStatusMap(x.statuses)) return false;
  if (!isValidCardArray(x.deck)) return false;
  if (!Array.isArray(x.relics)) return false;
  for (const r of x.relics) {
    if (typeof r !== "string" || !isValidRelicId(r)) return false;
  }
  if (!isFiniteNumber(x.defeated)) return false;
  if (!isFiniteNumber(x.upgradedThisRun) || !isFiniteNumber(x.removedThisRun))
    return false;
  if (!isFiniteNumber(x.seed)) return false;
  if (!isFiniteNumber(x.rngState)) return false;
  return true;
}

function isValidCombat(x: unknown): x is CombatState {
  if (!isObject(x)) return false;
  if (!isFiniteNumber(x.encounterIndex)) return false;
  if (typeof x.encounterName !== "string") return false;
  if (!isFiniteNumber(x.turn)) return false;
  if (x.phase !== "player" && x.phase !== "enemy") return false;
  if (!isFiniteNumber(x.energy) || !isFiniteNumber(x.handSize)) return false;
  if (!isValidCardArray(x.drawPile)) return false;
  if (!isValidCardArray(x.hand)) return false;
  if (!isValidCardArray(x.discardPile)) return false;
  if (!isValidCardArray(x.exhaustPile)) return false;
  if (!Array.isArray(x.enemies)) return false;
  for (const e of x.enemies) {
    if (!isValidEnemyInstance(e)) return false;
  }
  if (!isObject(x.powers) || !isFiniteNumber(x.powers.stormEngine)) return false;
  // cardsPlayedThisTurn may be absent in older v2 snapshots; default to 0 on load.
  if (x.cardsPlayedThisTurn !== undefined && !isFiniteNumber(x.cardsPlayedThisTurn)) return false;
  return true;
}

function validateSaveData(parsed: unknown): LoadResult {
  if (!isObject(parsed)) {
    return { ok: false, reason: "Save file is not an object." };
  }
  if (!isFiniteNumber(parsed.version)) {
    return { ok: false, reason: "Save file has no version." };
  }
  if (parsed.version !== SAVE_VERSION) {
    if (parsed.version === 1) {
      return migrateV1Save(parsed);
    }
    // Unknown future version — reject safely.
    return {
      ok: false,
      reason: `Save file is from an unrecognized version (${parsed.version}) and cannot be loaded.`,
    };
  }
  if (!isValidRun(parsed.run)) {
    return { ok: false, reason: "Run data is invalid or corrupted." };
  }
  if (
    typeof parsed.screen !== "string" ||
    !VALID_SCREENS.includes(parsed.screen as GameScreen)
  ) {
    return { ok: false, reason: "Screen value is invalid." };
  }
  const screen = parsed.screen as GameScreen;

  // combat must be present on combat screen, and internally valid if present.
  if (parsed.combat !== null && parsed.combat !== undefined) {
    if (!isValidCombat(parsed.combat)) {
      return { ok: false, reason: "Combat state is invalid or corrupted." };
    }
  } else if (screen === "combat") {
    return { ok: false, reason: "Combat screen save is missing combat state." };
  }

  // Reward/event are lightly validated — we check they're objects if present.
  if (screen === "reward" && !isObject(parsed.reward)) {
    return { ok: false, reason: "Reward screen save is missing reward state." };
  }
  if (screen === "event" && !isObject(parsed.event)) {
    return { ok: false, reason: "Event screen save is missing event state." };
  }

  const log = Array.isArray(parsed.log) ? parsed.log.filter((l): l is string => typeof l === "string") : [];

  // Ensure optional CombatState fields added after v2.0 are defaulted so that
  // saves written before these fields existed still load cleanly.
  let combat = (parsed.combat as CombatState | null) ?? null;
  if (combat) {
    combat = {
      ...combat,
      cardsPlayedThisTurn: isFiniteNumber(combat.cardsPlayedThisTurn) ? combat.cardsPlayedThisTurn : 0,
      firstTurn: typeof combat.firstTurn === "boolean" ? combat.firstTurn : false,
    };
  }

  const data: SaveData = {
    version: parsed.version,
    timestamp: isFiniteNumber(parsed.timestamp) ? parsed.timestamp : Date.now(),
    run: parsed.run as RunState,
    screen,
    combat,
    reward: (parsed.reward as SaveData["reward"]) ?? null,
    event: (parsed.event as SaveData["event"]) ?? null,
    log,
  };
  return { ok: true, data };
}

/* -------------------------------------------------------------------------- */
/* V1 → V2 migration                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Best-effort migration of a v1 save (the original single-file prototype).
 *
 * V1 runs lacked `id`, `seed`, `rngState`, `defeated`, `upgradedThisRun`,
 * `removedThisRun`, and sometimes `block`/`statuses`. Cards in the deck may
 * be plain card-ID strings or objects without `uid`/`tempCost`.
 *
 * Because the original RNG state can't be recovered the migrated run uses a
 * freshly-seeded RNG. Mid-combat state is discarded; the player resumes at a
 * skippable reward screen for their current encounter so their deck and HP are
 * preserved.
 */
function migrateV1Save(parsed: Record<string, unknown>): LoadResult {
  const run1 = isObject(parsed.run) ? parsed.run : null;
  if (!run1) {
    return { ok: false, reason: "V1 save has no run data — cannot migrate." };
  }

  // --- Deck ---
  const deck: CardInstance[] = [];
  let uidCounter = 0;
  const makeUid = (): string => `migrated_${Date.now().toString(36)}_${uidCounter++}`;

  if (Array.isArray(run1.deck)) {
    for (const item of run1.deck) {
      if (typeof item === "string" && isValidCardId(item)) {
        // v1 stored bare card-ID strings
        deck.push(createCardInstance(item));
      } else if (isObject(item) && typeof item.cardId === "string" && isValidCardId(item.cardId)) {
        deck.push({
          uid: typeof item.uid === "string" ? item.uid : makeUid(),
          cardId: item.cardId,
          upgraded: item.upgraded === true,
          tempCost: null,
        });
      }
    }
  }

  if (deck.length === 0) {
    return { ok: false, reason: "V1 save has no valid cards in deck — cannot migrate." };
  }

  // --- Relics ---
  const relics: RelicId[] = [];
  if (Array.isArray(run1.relics)) {
    for (const r of run1.relics) {
      if (typeof r === "string" && isValidRelicId(r)) relics.push(r as RelicId);
    }
  }

  // --- Numeric fields with safe defaults ---
  const encounterIndex = isFiniteNumber(run1.encounterIndex)
    ? Math.max(0, run1.encounterIndex as number)
    : 0;
  const maxHp = isFiniteNumber(run1.maxHp) ? (run1.maxHp as number) : CONFIG.startingMaxHp;
  const hp = isFiniteNumber(run1.hp) ? Math.max(1, run1.hp as number) : maxHp;

  const seed = (isFiniteNumber(run1.seed) ? run1.seed as number : Date.now()) >>> 0;

  const migratedRun: RunState = {
    id: `run_migrated_${Date.now().toString(36)}`,
    encounterIndex,
    maxHp,
    hp,
    block: isFiniteNumber(run1.block) ? (run1.block as number) : 0,
    statuses: isValidStatusMap(run1.statuses) ? (run1.statuses as StatusMap) : {},
    deck,
    relics,
    defeated: isFiniteNumber(run1.defeated) ? (run1.defeated as number) : encounterIndex,
    upgradedThisRun: isFiniteNumber(run1.upgradedThisRun) ? (run1.upgradedThisRun as number) : 0,
    removedThisRun: isFiniteNumber(run1.removedThisRun) ? (run1.removedThisRun as number) : 0,
    seed,
    // RNG state cannot be recovered from v1 — resume from seed.
    rngState: seed,
  };

  // Resume at a skippable reward screen for the current encounter.
  // This preserves the player's deck and HP while discarding any
  // mid-combat state that would be unsafe to resume without a v2 combat snapshot.
  const reward: SaveData["reward"] = {
    cardChoices: [],
    relicOffer: [],
    pickedCard: true,   // no card choices — player just clicks Continue
    pickedRelic: true,
    nextIndex: encounterIndex,
    canUpgrade: false,
    canHeal: false,
    canRemove: false,
    isAdvancing: false,
  };

  const data: SaveData = {
    version: SAVE_VERSION,
    timestamp: isFiniteNumber(parsed.timestamp) ? (parsed.timestamp as number) : Date.now(),
    run: migratedRun,
    screen: "reward",
    combat: null,
    reward,
    event: null,
    log: ["(Run migrated from an older save format. Combat progress was reset.)"],
  };

  return { ok: true, data };
}
