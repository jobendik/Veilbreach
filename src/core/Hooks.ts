import type {
  CombatEngineLike,
  GameState,
  HookContext,
  HookName,
  HookListener,
} from "./Types";
import { RELIC_DB } from "../data/relics";

/**
 * Fire a named hook. All relics the player currently owns that register a
 * listener on this hook will be called in the order they were acquired.
 *
 * Hook listeners are free to mutate `ctx` in place — that's how the
 * damage-calculation hooks (`onBeforeDamage`) modify the outgoing amount.
 */
export function fireHook(
  state: GameState,
  engine: CombatEngineLike,
  hook: HookName,
  extra: Partial<HookContext> = {}
): void {
  const relicIds = state.run?.relics ?? [];
  if (relicIds.length === 0) return;
  const baseCtx: HookContext = { state, engine, ...extra };
  for (const id of relicIds) {
    const relic = RELIC_DB[id];
    if (!relic) continue;
    const listener: HookListener | undefined = relic.hooks[hook];
    if (listener) {
      try {
        listener(baseCtx);
      } catch (err) {
        console.error(`Relic ${id} hook ${hook} threw`, err);
      }
    }
  }
}
