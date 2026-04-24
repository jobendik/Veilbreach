import type { GameState, TreasureState, RelicId } from "./Types";
import { RELIC_DB } from "../data/relics";
import type { RNG } from "./RNG";

interface TreasureHost {
  render(): void;
  log(msg: string): void;
  playSound(name: "click" | "relic" | "victory"): void;
  saveStable(): void;
  returnToMap(): void;
}

/**
 * Treasure nodes hold a single relic the player may claim for free.
 */
export class TreasureSystem {
  constructor(
    private state: GameState,
    private rng: RNG,
    private host: TreasureHost
  ) {}

  open(): void {
    const run = this.state.run!;
    const owned = new Set(run.relics);
    const pool: RelicId[] = Object.values(RELIC_DB)
      .filter((r) => !owned.has(r.id))
      .map((r) => r.id);
    const relicId = pool.length > 0
      ? (this.rng.choice(pool) ?? pool[0])
      : null;

    const treasure: TreasureState = {
      opened: false,
      relicId,
      goldAmount: 0,
    };
    this.state.treasure = treasure;
    this.state.screen = "treasure";
    this.host.saveStable();
    this.host.render();
  }

  take(): void {
    const treasure = this.state.treasure;
    const run = this.state.run;
    if (!treasure || !run || treasure.opened) return;
    if (treasure.relicId) {
      run.relics.push(treasure.relicId);
      this.host.log(`Gained relic: ${RELIC_DB[treasure.relicId].name}.`);
      this.host.playSound("relic");
    }
    treasure.opened = true;
    this.state.treasure = null;
    this.host.returnToMap();
  }

  leave(): void {
    this.state.treasure = null;
    this.host.playSound("click");
    this.host.returnToMap();
  }
}
