import type { GameState, PotionId, EnemyInstance } from "./Types";
import type { CombatEngine } from "./CombatEngine";
import type { RNG } from "./RNG";
import { POTION_DB, COMMON_POTION_IDS, UNCOMMON_POTION_IDS, RARE_POTION_IDS, isValidPotionId } from "../data/potions";
import { runEffect } from "./EffectResolver";

interface PotionHost {
  render(): void;
  log(msg: string): void;
  toastMessage(msg: string): void;
  playSound(name: "click" | "card" | "victory" | "block" | "relic"): void;
  saveStable(): void;
}

/**
 * Orchestrates using, discarding, adding, and rolling potions.
 *
 * Potions live in a fixed-length slots array on the run (with `null`
 * representing empty slots). Using a potion resolves its Effect list
 * through the normal EffectResolver so damage, block, and status calcs
 * go through the same pipeline as cards.
 */
export class PotionSystem {
  constructor(
    private state: GameState,
    private engine: CombatEngine,
    private rng: RNG,
    private host: PotionHost
  ) {}

  /** True if the player has room to pick up another potion. */
  canPickUp(): boolean {
    const run = this.state.run;
    if (!run) return false;
    return run.potions.some((p) => p === null);
  }

  /**
   * Add a potion to the first empty slot. Returns true on success.
   * If there is no room the caller is responsible for discarding.
   */
  add(id: PotionId): boolean {
    if (!isValidPotionId(id)) return false;
    const run = this.state.run;
    if (!run) return false;
    for (let i = 0; i < run.potions.length; i++) {
      if (run.potions[i] === null) {
        run.potions[i] = id;
        this.host.log(`Gained potion: ${POTION_DB[id].name}.`);
        this.host.playSound("relic");
        return true;
      }
    }
    return false;
  }

  /** Remove the potion in a slot without using it. */
  discard(slotIndex: number): void {
    const run = this.state.run;
    if (!run) return;
    const id = run.potions[slotIndex];
    if (!id) return;
    run.potions[slotIndex] = null;
    this.host.log(`Discarded ${POTION_DB[id].name}.`);
    this.host.playSound("click");
    this.host.saveStable();
    this.host.render();
  }

  /**
   * Use a potion. The optional enemyUid targets one enemy for single-target
   * potions; omit it for self / AoE potions.
   */
  async use(slotIndex: number, enemyUid?: string): Promise<void> {
    const run = this.state.run;
    if (!run) return;
    const id = run.potions[slotIndex];
    if (!id) return;
    const data = POTION_DB[id];
    if (!data) return;
    if (this.state.isResolving) return;

    // Enforce scope — some potions are combat-only, others out-of-combat only.
    if (data.scope === "combat" && !this.state.combat) {
      this.host.toastMessage("This potion can only be used in combat.");
      return;
    }
    if (data.scope === "map" && this.state.combat) {
      this.host.toastMessage("This potion cannot be used in combat.");
      return;
    }

    let target: EnemyInstance | null = null;
    if (data.target === "enemy") {
      const combat = this.state.combat;
      const alive = combat?.enemies.filter((e) => !e.dead && e.hp > 0) ?? [];
      if (alive.length === 0) return;
      if (enemyUid) {
        target = alive.find((e) => e.uid === enemyUid) ?? null;
      }
      if (!target && alive.length === 1) target = alive[0];
      if (!target) {
        this.host.toastMessage("Target an enemy for this potion.");
        return;
      }
    }

    // Remove potion BEFORE resolving so a killing shot can't double-consume.
    run.potions[slotIndex] = null;
    this.host.log(`Used ${data.name}.`);
    this.host.playSound("card");

    this.state.isResolving = true;
    try {
      for (const effect of data.effects) {
        await runEffect(this.engine, this.state, effect, null, null, target);
      }
    } finally {
      this.state.isResolving = false;
    }

    // After use, refresh the UI and check for combat end.
    if (this.state.combat) {
      this.engine.checkEnemyDeaths();
      if (this.engine.areAllEnemiesDefeated()) {
        this.engine.winCombat();
        return;
      }
    }
    this.host.saveStable();
    this.host.render();
  }

  /** Roll a random potion id, weighted by rarity (Common > Uncommon > Rare). */
  rollRandom(): PotionId {
    const roll = this.rng.next();
    if (roll < 0.65) return this.rng.choice(COMMON_POTION_IDS) ?? COMMON_POTION_IDS[0];
    if (roll < 0.92) return this.rng.choice(UNCOMMON_POTION_IDS) ?? UNCOMMON_POTION_IDS[0];
    return this.rng.choice(RARE_POTION_IDS) ?? RARE_POTION_IDS[0];
  }
}
