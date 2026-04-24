import { describe, it, expect } from "vitest";
import { parseSave } from "../SaveSystem";
import { SAVE_VERSION } from "../Types";
import type { SaveData, RunState, CombatState } from "../Types";
import { STARTING_DECK } from "../../data/config";
import { createCardInstance } from "../../data/cards";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function makeMinimalRun(overrides: Partial<RunState> = {}): RunState {
  const seed = 12345;
  return {
    id: "run_test",
    encounterIndex: 0,
    maxHp: 72,
    hp: 72,
    block: 0,
    statuses: {},
    deck: STARTING_DECK.map((id) => createCardInstance(id)),
    relics: [],
    defeated: 0,
    upgradedThisRun: 0,
    removedThisRun: 0,
    seed,
    rngState: seed,
    gold: 0,
    potions: [null, null, null],
    maxPotionSlots: 3,
    map: {
      nodes: {},
      rows: [],
      playerNodeId: "",
      availableNodeIds: [],
      totalRows: 0,
      act: 1,
    },
    currentNodeId: null,
    actIndex: 0,
    elitesKilled: 0,
    ...overrides,
  };
}

function makeMinimalSave(overrides: Partial<SaveData> = {}): SaveData {
  return {
    version: SAVE_VERSION,
    timestamp: 1_700_000_000_000,
    run: makeMinimalRun(),
    screen: "reward",
    combat: null,
    reward: {
      cardChoices: [],
      relicOffer: [],
      pickedCard: true,
      pickedRelic: true,
      nextIndex: 1,
      canUpgrade: false,
      canHeal: false,
      canRemove: false,
      isAdvancing: false,
      goldReward: 0,
      goldClaimed: true,
      potionDrop: null,
      potionClaimed: true,
      wasElite: false,
      wasBoss: false,
    },
    event: null,
    shop: null,
    rest: null,
    treasure: null,
    log: [],
    ...overrides,
  };
}

function roundTrip(save: SaveData): ReturnType<typeof parseSave> {
  return parseSave(JSON.stringify(save));
}

/* -------------------------------------------------------------------------- */
/* Tests                                                                       */
/* -------------------------------------------------------------------------- */

describe("parseSave – basic validation", () => {
  it("accepts a well-formed v2 save", () => {
    const result = roundTrip(makeMinimalSave());
    expect(result.ok).toBe(true);
  });

  it("rejects non-JSON input", () => {
    const result = parseSave("this is not json {{{");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/JSON/i);
  });

  it("rejects missing version field", () => {
    const save = makeMinimalSave();
    const raw = JSON.parse(JSON.stringify(save));
    delete raw.version;
    const result = parseSave(JSON.stringify(raw));
    expect(result.ok).toBe(false);
  });

  it("rejects unknown future version", () => {
    const result = roundTrip(makeMinimalSave({ version: SAVE_VERSION + 10 }));
    expect(result.ok).toBe(false);
  });

  it("rejects invalid screen value", () => {
    const save = makeMinimalSave();
    const raw = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
    raw.screen = "spaceship";
    const result = parseSave(JSON.stringify(raw));
    expect(result.ok).toBe(false);
  });

  it("rejects combat screen with missing combat state", () => {
    const result = roundTrip(makeMinimalSave({ screen: "combat", combat: null }));
    expect(result.ok).toBe(false);
  });
});

describe("parseSave – save/load round-trip", () => {
  it("preserves run fields exactly", () => {
    const run = makeMinimalRun({ hp: 40, maxHp: 72, defeated: 2 });
    const result = roundTrip(makeMinimalSave({ run }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.run.hp).toBe(40);
    expect(result.data.run.maxHp).toBe(72);
    expect(result.data.run.defeated).toBe(2);
    expect(result.data.run.seed).toBe(run.seed);
    expect(result.data.run.rngState).toBe(run.rngState);
  });

  it("preserves deck card IDs and upgrade flags", () => {
    const deck = [
      createCardInstance("strike"),
      { ...createCardInstance("guard"), upgraded: true },
    ];
    const run = makeMinimalRun({ deck });
    const result = roundTrip(makeMinimalSave({ run }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.run.deck[0].cardId).toBe("strike");
    expect(result.data.run.deck[1].upgraded).toBe(true);
  });

  it("preserves relics", () => {
    const run = makeMinimalRun({ relics: ["cracked_core", "brass_lung"] });
    const result = roundTrip(makeMinimalSave({ run }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.run.relics).toEqual(["cracked_core", "brass_lung"]);
  });

  it("preserves reward state", () => {
    const reward: SaveData["reward"] = {
      cardChoices: ["quick_cut"],
      relicOffer: [],
      pickedCard: false,
      pickedRelic: true,
      nextIndex: 1,
      canUpgrade: true,
      canHeal: true,
      canRemove: true,
      isAdvancing: false,
      goldReward: 15,
      goldClaimed: false,
      potionDrop: null,
      potionClaimed: true,
      wasElite: false,
      wasBoss: false,
    };
    const result = roundTrip(makeMinimalSave({ reward }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.reward?.cardChoices).toEqual(["quick_cut"]);
  });

  it("preserves log entries (up to the last 20 saved)", () => {
    const log = ["line 1", "line 2", "line 3"];
    const result = roundTrip(makeMinimalSave({ log }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.log).toEqual(log);
  });

  it("filters non-string log entries silently", () => {
    const raw = JSON.parse(JSON.stringify(makeMinimalSave())) as Record<string, unknown>;
    raw.log = ["ok", 42, null, "also ok"];
    const result = parseSave(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.log).toEqual(["ok", "also ok"]);
  });

  it("defaults missing timestamp to a positive number", () => {
    const raw = JSON.parse(JSON.stringify(makeMinimalSave())) as Record<string, unknown>;
    delete raw.timestamp;
    const result = parseSave(JSON.stringify(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.timestamp).toBeGreaterThan(0);
  });
});

describe("parseSave – v1 migration", () => {
  function makeV1Save(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
      version: 1,
      timestamp: 1_600_000_000_000,
      run: {
        hp: 55,
        maxHp: 72,
        deck: [
          { cardId: "strike", upgraded: false },
          { cardId: "guard", upgraded: true },
          "quick_cut", // bare string form
        ],
        relics: ["cracked_core"],
        encounterIndex: 1,
        defeated: 1,
      },
      screen: "combat",
      ...overrides,
    });
  }

  it("migrates a v1 save successfully", () => {
    const result = parseSave(makeV1Save());
    expect(result.ok).toBe(true);
  });

  it("migrates to SAVE_VERSION", () => {
    const result = parseSave(makeV1Save());
    if (!result.ok) throw new Error(result.reason);
    expect(result.data.version).toBe(SAVE_VERSION);
  });

  it("preserves HP, maxHp, deck, and relics", () => {
    const result = parseSave(makeV1Save());
    if (!result.ok) throw new Error(result.reason);
    const run = result.data.run;
    expect(run.hp).toBe(55);
    expect(run.maxHp).toBe(72);
    expect(run.deck).toHaveLength(3);
    expect(run.deck.map((c) => c.cardId)).toEqual(["strike", "guard", "quick_cut"]);
    expect(run.deck[1].upgraded).toBe(true);
    expect(run.relics).toEqual(["cracked_core"]);
  });

  it("resumes at a reward screen (combat state discarded)", () => {
    const result = parseSave(makeV1Save());
    if (!result.ok) throw new Error(result.reason);
    expect(result.data.screen).toBe("reward");
    expect(result.data.combat).toBeNull();
    expect(result.data.reward).not.toBeNull();
  });

  it("gives each migrated card a uid string", () => {
    const result = parseSave(makeV1Save());
    if (!result.ok) throw new Error(result.reason);
    for (const card of result.data.run.deck) {
      expect(typeof card.uid).toBe("string");
      expect(card.uid.length).toBeGreaterThan(0);
    }
  });

  it("provides a fresh seed and rngState", () => {
    const result = parseSave(makeV1Save());
    if (!result.ok) throw new Error(result.reason);
    expect(typeof result.data.run.seed).toBe("number");
    expect(Number.isFinite(result.data.run.seed)).toBe(true);
    expect(typeof result.data.run.rngState).toBe("number");
  });

  it("skips unknown relics in v1 run", () => {
    const result = parseSave(
      makeV1Save({ run: { hp: 72, maxHp: 72, deck: ["strike"], relics: ["not_a_relic"], encounterIndex: 0 } })
    );
    if (!result.ok) throw new Error(result.reason);
    expect(result.data.run.relics).toHaveLength(0);
  });

  it("rejects v1 save with no valid deck cards", () => {
    const result = parseSave(
      makeV1Save({ run: { hp: 72, maxHp: 72, deck: [], relics: [], encounterIndex: 0 } })
    );
    expect(result.ok).toBe(false);
  });

  it("rejects v1 save with missing run object", () => {
    const result = parseSave(JSON.stringify({ version: 1, timestamp: 0 }));
    expect(result.ok).toBe(false);
  });
});

describe("parseSave – combat state defaults", () => {
  it("defaults missing cardsPlayedThisTurn to 0", () => {
    const combat = {
      encounterIndex: 0,
      encounterName: "Test",
      turn: 1,
      phase: "player",
      energy: 3,
      handSize: 5,
      drawPile: [],
      hand: [],
      discardPile: [],
      exhaustPile: [],
      enemies: [],
      powers: { stormEngine: 0 },
      // cardsPlayedThisTurn intentionally absent
      firstTurn: true,
    } as unknown as CombatState;

    const save = makeMinimalSave({ screen: "combat", combat });
    const result = roundTrip(save);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.combat?.cardsPlayedThisTurn).toBe(0);
  });

  it("defaults missing firstTurn to false", () => {
    const combat = {
      encounterIndex: 0,
      encounterName: "Test",
      turn: 2,
      phase: "player",
      energy: 3,
      handSize: 5,
      drawPile: [],
      hand: [],
      discardPile: [],
      exhaustPile: [],
      enemies: [],
      powers: { stormEngine: 0 },
      cardsPlayedThisTurn: 0,
      // firstTurn intentionally absent
    } as unknown as CombatState;

    const save = makeMinimalSave({ screen: "combat", combat });
    const result = roundTrip(save);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.combat?.firstTurn).toBe(false);
  });
});
