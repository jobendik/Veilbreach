import type {
  CardInstance,
  Effect,
  EffectType,
  EffectTargetOverride,
  GameState,
  ResolvedCardData,
  Unit,
} from "./Types";
import type { CombatEngine } from "./CombatEngine";
import { CARD_DB, getCardData } from "../data/cards";

/**
 * The context passed to every effect handler.
 *
 * Handlers must only read/write through this context — never reach directly
 * into global state. That keeps the effect system testable in isolation.
 */
export interface EffectContext {
  state: GameState;
  engine: CombatEngine;
  sourceCard: CardInstance | null;
  cardData: ResolvedCardData | null;
  /** For targeted effects this is the specific unit the effect is applied to. */
  target: Unit | null;
  /** For attacker-resolved effects (damage), this is the attacker (the player). */
  source: Unit;
}

export type EffectHandler = (
  ctx: EffectContext,
  effect: Effect
) => Promise<void> | void;

/**
 * Central registry of effect handlers. Adding a new effect type is a matter
 * of adding an entry in the Effect union in Types.ts and a matching handler
 * here — no other file needs to change.
 *
 * Note: `damage` and `block` are NOT in this registry. Those two effects
 * have specialized handling (multi-hit pacing for damage, block source
 * resolution for block) and are dispatched directly by `runEffect` below.
 */
export const EFFECT_HANDLERS: Partial<Record<EffectType, EffectHandler>> = {
  draw: (ctx, effect) => {
    if (effect.type !== "draw") return;
    ctx.engine.drawCards(effect.amount);
  },

  gainEnergy: (ctx, effect) => {
    if (effect.type !== "gainEnergy") return;
    const combat = ctx.state.combat;
    if (!combat) return;
    combat.energy += effect.amount;
    ctx.engine.toastFloatAtCenter(`+${effect.amount} Energy`, "#7be7ff");
  },

  applyStatus: (ctx, effect) => {
    if (effect.type !== "applyStatus") return;
    const unit = resolveStatusTarget(ctx, effect.target);
    if (!unit) return;
    ctx.engine.addStatus(unit, effect.status, effect.amount);
  },

  heal: (ctx, effect) => {
    if (effect.type !== "heal") return;
    ctx.engine.healPlayer(effect.amount);
  },

  cleanse: (ctx, effect) => {
    if (effect.type !== "cleanse") return;
    const unit =
      effect.target === "self"
        ? ctx.source
        : ctx.target ?? null;
    if (!unit) return;
    for (const s of effect.statuses) {
      delete unit.statuses[s];
    }
    ctx.engine.toastFloatAtCenter("Cleansed", "#dff6ff");
  },

  doubleStatus: (ctx, effect) => {
    if (effect.type !== "doubleStatus") return;
    const target = ctx.target;
    if (!target) return;
    const current = target.statuses[effect.status] ?? 0;
    if (current > 0) {
      ctx.engine.addStatus(target, effect.status, current);
    }
  },

  gainPower: (ctx, effect) => {
    if (effect.type !== "gainPower") return;
    const combat = ctx.state.combat;
    if (!combat) return;
    combat.powers[effect.power] =
      (combat.powers[effect.power] ?? 0) + effect.amount;
    ctx.engine.toastFloatAtCenter("Power awakened", "#b98cff");
  },

  returnDiscardToHand: (ctx, effect) => {
    if (effect.type !== "returnDiscardToHand") return;
    ctx.engine.returnDiscardToHand(effect.amount, effect.temporaryCost);
  },

  upgradeRandomInHand: (ctx, effect) => {
    if (effect.type !== "upgradeRandomInHand") return;
    ctx.engine.upgradeRandomInHand(effect.amount);
  },

  loseHp: (ctx, effect) => {
    if (effect.type !== "loseHp") return;
    ctx.engine.losePlayerHp(effect.amount);
  },
};

/**
 * Run one effect inside a fresh EffectContext.
 * Damage and block need slightly specialized paths so they're handled
 * explicitly here rather than through the generic registry above.
 */
export async function runEffect(
  engine: CombatEngine,
  state: GameState,
  effect: Effect,
  sourceCard: CardInstance | null,
  cardData: ResolvedCardData | null,
  explicitTarget: Unit | null
): Promise<void> {
  const source = state.run!;
  const targets = resolveEffectTargets(state, effect, cardData, explicitTarget);

  for (const target of targets) {
    const ctx: EffectContext = {
      state,
      engine,
      sourceCard,
      cardData,
      source,
      target,
    };

    if (effect.type === "damage") {
      if (!target) continue;
      const hits = effect.hits ?? 1;
      for (let i = 0; i < hits; i++) {
        if (target.hp <= 0 || target.dead) break;
        engine.dealAttackDamageFromPlayer(target, effect.amount, cardData);
        if (hits > 1) await engine.sleep(90);
      }
      continue;
    }

    if (effect.type === "block") {
      engine.gainBlock(source, effect.amount);
      continue;
    }

    const handler = EFFECT_HANDLERS[effect.type];
    if (handler) {
      await handler(ctx, effect);
    }
  }
  // Small pacing delay so the player can visually register the effect.
  await engine.sleep(60);
}

/** Decide which units a given effect applies to. */
function resolveEffectTargets(
  state: GameState,
  effect: Effect,
  cardData: ResolvedCardData | null,
  explicitTarget: Unit | null
): (Unit | null)[] {
  const combat = state.combat;
  if (!combat) return [null];

  const t: EffectTargetOverride | undefined =
    "target" in effect && effect.target
      ? (effect.target as EffectTargetOverride)
      : undefined;

  // Self-targeted effects (block, heal, self status, etc.)
  if (t === "self") return [state.run!];

  // Effects that target all enemies.
  if (t === "allEnemies" || cardData?.targetType === "allEnemies") {
    return combat.enemies.filter((e) => !e.dead && e.hp > 0);
  }

  // Random enemy target (used by relics/future cards).
  if (t === "randomEnemy") {
    const living = combat.enemies.filter((e) => !e.dead && e.hp > 0);
    if (!living.length) return [];
    // Note: intentionally not using run RNG here because the effect resolver
    // shouldn't own RNG state. Only the engine's public choose methods do.
    return [living[Math.floor(Math.random() * living.length)]];
  }

  // Targeted single-enemy effects.
  if (t === "enemy" || cardData?.targetType === "enemy") {
    return explicitTarget ? [explicitTarget] : [];
  }

  // Effects with no target override and no card targetType default to self,
  // unless an explicit target was supplied (rare).
  return [explicitTarget ?? state.run!];
}

function resolveStatusTarget(
  ctx: EffectContext,
  target: EffectTargetOverride
): Unit | null {
  if (target === "self") return ctx.source;
  return ctx.target;
}

/** Re-export for consumers that don't want to pull from data/cards directly. */
export { CARD_DB, getCardData };
