import { describe, it, expect, vi } from "vitest";
import { CombatEngine, type CombatEngineHost } from "../CombatEngine";
import { RNG } from "../RNG";
import { createInitialState } from "../GameState";
import type { RunState, Unit } from "../Types";
import { CONFIG, STARTING_DECK } from "../../data/config";
import { createCardInstance } from "../../data/cards";
import { calculateAttackDamage, calculateBlockGain, calculateEnemyAttackDamage } from "../Rules";

/* -------------------------------------------------------------------------- */
/* Minimal engine factory                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Creates a CombatEngine with a no-op host, useful for testing pure
 * combat-state mutations in isolation.
 */
function makeEngine() {
  const state = createInitialState();

  const seed = 1;
  const run: RunState = {
    id: "test_run",
    encounterIndex: 0,
    maxHp: CONFIG.startingMaxHp,
    hp: CONFIG.startingMaxHp,
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
  };
  state.run = run;

  const host: CombatEngineHost = {
    log: () => {},
    render: () => {},
    updateCombat: () => {},
    toastMessage: () => {},
    floatAtCenter: () => {},
    floatNearUnit: () => {},
    flashUnit: () => {},
    animateCardPlay: () => {},
    shakeCard: () => {},
    playSound: () => {},
    onWin: () => {},
    onLose: () => {},
    onReward: () => {},
    saveStable: () => {},
  };

  const rng = new RNG(seed);
  return { engine: new CombatEngine(state, rng, host), state, run };
}

function makeUnit(hp = 30): Unit {
  return { hp, maxHp: hp, block: 0, statuses: {}, name: "TestUnit" };
}

/* -------------------------------------------------------------------------- */
/* Rules.ts — pure damage math                                                 */
/* -------------------------------------------------------------------------- */

describe("calculateAttackDamage", () => {
  it("returns base damage with no modifiers", () => {
    const src = makeUnit();
    const tgt = makeUnit();
    expect(calculateAttackDamage(10, src, tgt, null)).toBe(10);
  });

  it("adds source strength to attack damage", () => {
    const src: Unit = { ...makeUnit(), statuses: { strength: 3 } };
    expect(calculateAttackDamage(10, src, makeUnit(), null)).toBe(13);
  });

  it("applies 25% reduction for weak on the attacker", () => {
    const src: Unit = { ...makeUnit(), statuses: { weak: 1 } };
    expect(calculateAttackDamage(8, src, makeUnit(), null)).toBe(6);
  });

  it("applies 50% increase for vulnerable on the target", () => {
    const tgt: Unit = { ...makeUnit(), statuses: { vulnerable: 1 } };
    expect(calculateAttackDamage(8, makeUnit(), tgt, null)).toBe(12);
  });

  it("stacks weak and vulnerable correctly", () => {
    const src: Unit = { ...makeUnit(), statuses: { weak: 2 } };
    const tgt: Unit = { ...makeUnit(), statuses: { vulnerable: 2 } };
    // 10 * 0.75 = 7 (floor), then * 1.5 = 10 (floor)
    expect(calculateAttackDamage(10, src, tgt, null)).toBe(10);
  });

  it("adds mark bonus to attack damage", () => {
    const tgt: Unit = { ...makeUnit(), statuses: { mark: 4 } };
    expect(calculateAttackDamage(6, makeUnit(), tgt, null)).toBe(10);
  });

  it("never returns negative damage", () => {
    const src: Unit = { ...makeUnit(), statuses: { weak: 99 } };
    expect(calculateAttackDamage(0, src, makeUnit(), null)).toBe(0);
  });
});

describe("calculateBlockGain", () => {
  it("returns base block with no modifiers", () => {
    expect(calculateBlockGain(6, makeUnit())).toBe(6);
  });

  it("adds dexterity to block gain", () => {
    const unit: Unit = { ...makeUnit(), statuses: { dexterity: 2 } };
    expect(calculateBlockGain(6, unit)).toBe(8);
  });

  it("applies 25% reduction for frail", () => {
    const unit: Unit = { ...makeUnit(), statuses: { frail: 1 } };
    expect(calculateBlockGain(8, unit)).toBe(6);
  });

  it("never returns negative block", () => {
    expect(calculateBlockGain(0, makeUnit())).toBe(0);
  });
});

describe("calculateEnemyAttackDamage", () => {
  it("adds enemy strength", () => {
    const enemy: Unit = { ...makeUnit(), statuses: { strength: 4 } };
    expect(calculateEnemyAttackDamage(5, enemy, makeUnit())).toBe(9);
  });

  it("applies weak to enemy", () => {
    const enemy: Unit = { ...makeUnit(), statuses: { weak: 1 } };
    expect(calculateEnemyAttackDamage(8, enemy, makeUnit())).toBe(6);
  });

  it("applies vulnerable on target", () => {
    const player: Unit = { ...makeUnit(), statuses: { vulnerable: 1 } };
    expect(calculateEnemyAttackDamage(8, makeUnit(), player)).toBe(12);
  });
});

/* -------------------------------------------------------------------------- */
/* CombatEngine — status timing                                                */
/* -------------------------------------------------------------------------- */

describe("processStartOfTurnStatuses – tick damage", () => {
  it("poison ticks at turn start and decreases by 1", () => {
    const { engine, run } = makeEngine();
    run.statuses = { poison: 4 };
    engine.processStartOfTurnStatuses(run);
    expect(run.hp).toBe(CONFIG.startingMaxHp - 4);
    expect(run.statuses.poison).toBe(3);
  });

  it("burn ticks at turn start and decreases by 1", () => {
    const { engine, run } = makeEngine();
    run.statuses = { burn: 3 };
    engine.processStartOfTurnStatuses(run);
    expect(run.hp).toBe(CONFIG.startingMaxHp - 3);
    expect(run.statuses.burn).toBe(2);
  });

  it("poison with stacks of 1 is removed after ticking", () => {
    const { engine, run } = makeEngine();
    run.statuses = { poison: 1 };
    engine.processStartOfTurnStatuses(run);
    expect(run.hp).toBe(CONFIG.startingMaxHp - 1);
    expect(run.statuses.poison).toBeUndefined();
  });

  it("strength and dexterity do NOT tick as damage", () => {
    const { engine, run } = makeEngine();
    run.statuses = { strength: 5, dexterity: 5 };
    engine.processStartOfTurnStatuses(run);
    expect(run.hp).toBe(CONFIG.startingMaxHp);
  });
});

describe("processEndOfTurnStatuses – temporary status decay", () => {
  it("weak decreases by 1 at end of turn", () => {
    const { engine, run } = makeEngine();
    run.statuses = { weak: 3 };
    engine.processEndOfTurnStatuses(run);
    expect(run.statuses.weak).toBe(2);
  });

  it("vulnerable decreases by 1 at end of turn", () => {
    const { engine, run } = makeEngine();
    run.statuses = { vulnerable: 2 };
    engine.processEndOfTurnStatuses(run);
    expect(run.statuses.vulnerable).toBe(1);
  });

  it("frail with stacks of 1 is removed at end of turn", () => {
    const { engine, run } = makeEngine();
    run.statuses = { frail: 1 };
    engine.processEndOfTurnStatuses(run);
    expect(run.statuses.frail).toBeUndefined();
  });

  it("mark with stacks of 1 is removed at end of turn", () => {
    const { engine, run } = makeEngine();
    run.statuses = { mark: 1 };
    engine.processEndOfTurnStatuses(run);
    expect(run.statuses.mark).toBeUndefined();
  });

  it("poison does NOT decay at end of turn (only at turn start)", () => {
    const { engine, run } = makeEngine();
    run.statuses = { poison: 5 };
    engine.processEndOfTurnStatuses(run);
    expect(run.statuses.poison).toBe(5);
  });

  it("strength does NOT decay at end of turn", () => {
    const { engine, run } = makeEngine();
    run.statuses = { strength: 4 };
    engine.processEndOfTurnStatuses(run);
    expect(run.statuses.strength).toBe(4);
  });
});

/* -------------------------------------------------------------------------- */
/* CombatEngine — applyDamage                                                  */
/* -------------------------------------------------------------------------- */

describe("applyDamage", () => {
  it("reduces target hp by the damage amount after block absorption", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(20);
    target.block = 5;
    engine.applyDamage(target, 8, run, "attack");
    expect(target.block).toBe(0);
    expect(target.hp).toBe(17);
  });

  it("block fully absorbs damage that doesn't exceed it", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(20);
    target.block = 10;
    engine.applyDamage(target, 5, run, "attack");
    expect(target.block).toBe(5);
    expect(target.hp).toBe(20);
  });

  it("marks target as dead when hp drops to 0", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(5);
    engine.applyDamage(target, 10, run, "attack");
    expect(target.hp).toBe(0);
    expect(target.dead).toBe(true);
  });

  it("skips dead units without applying damage", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(10);
    target.dead = true;
    engine.applyDamage(target, 999, run, "attack");
    expect(target.hp).toBe(10);
  });

  it("thorns deal retaliation damage to the attacker", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(20);
    target.statuses = { thorns: 3 };
    const attackerHpBefore = run.hp;
    engine.applyDamage(target, 5, run, "attack");
    expect(run.hp).toBe(attackerHpBefore - 3);
  });

  it("thorns do not trigger on status damage", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(20);
    target.statuses = { thorns: 5 };
    const attackerHpBefore = run.hp;
    engine.applyDamage(target, 5, null, "status");
    expect(run.hp).toBe(attackerHpBefore);
  });
});

/* -------------------------------------------------------------------------- */
/* CombatEngine — onBeforeDamage / onAfterDamage hooks                        */
/* -------------------------------------------------------------------------- */

describe("damage hooks", () => {
  it("onBeforeDamage fires for attack damage and receives correct context", () => {
    const { engine, state, run } = makeEngine();
    const target = makeUnit(20);
    // Give the player a dummy relic that listens on onBeforeDamage.
    state.run!.relics = ["cracked_core"]; // doesn't hook damage — spy only

    // Directly patch fireHook on the engine instance by spying on engine.fire.
    const fireSpy = vi.spyOn(engine as unknown as { fire: (...args: unknown[]) => void }, "fire");

    engine.applyDamage(target, 10, run, "attack");

    const calls = fireSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain("onBeforeDamage");
    expect(calls).toContain("onAfterDamage");

    fireSpy.mockRestore();
  });

  it("status damage fires onAfterDamage + onStatusTickDamage but not onBeforeDamage", () => {
    const { engine } = makeEngine();
    const target = makeUnit(20);
    const fireSpy = vi.spyOn(engine as unknown as { fire: (...args: unknown[]) => void }, "fire");

    engine.applyDamage(target, 5, null, "status");

    const calls = fireSpy.mock.calls.map((c) => c[0]);
    // onBeforeDamage is still attack-only (relics must not rewrite status
    // ticks), but onAfterDamage / onStatusTickDamage fire so relics like
    // Thorn Crown can react to poison/burn ticks.
    expect(calls).not.toContain("onBeforeDamage");
    expect(calls).toContain("onAfterDamage");
    expect(calls).toContain("onStatusTickDamage");

    fireSpy.mockRestore();
  });

  it("a relic modifying ctx.damage.amount via onBeforeDamage changes the actual damage dealt", () => {
    const { engine, run } = makeEngine();
    const target = makeUnit(50);

    // Inject a synthetic relic that doubles incoming damage amount via the hook.
    // We do this by monkey-patching the engine's fire method for this test.
    const originalFire = engine.fire.bind(engine);
    engine.fire = function (hook, extra) {
      if (hook === "onBeforeDamage" && extra?.damage) {
        // Triple the damage amount.
        extra.damage.amount = extra.damage.amount * 3;
      }
      return originalFire(hook, extra);
    };

    const dealt = engine.applyDamage(target, 5, run, "attack");
    expect(dealt).toBe(15); // 5 * 3
    expect(target.hp).toBe(35);

    // Restore.
    engine.fire = originalFire;
  });
});
