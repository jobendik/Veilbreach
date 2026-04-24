/**
 * Deterministic seeded random number generator.
 *
 * Uses mulberry32 — a tiny, fast, good-enough 32-bit PRNG whose internal
 * state is a single uint32. That single-number state is trivial to serialize
 * into save files, so a reloaded run can reproduce the same random sequence
 * that the original session would have produced.
 */
export class RNG {
  private seed: number;
  private state: number;

  constructor(seed: number, state?: number) {
    this.seed = seed >>> 0;
    this.state = (state ?? this.seed) >>> 0;
  }

  /** The seed used to initialize this RNG. */
  getSeed(): number {
    return this.seed;
  }

  /** The current mutable state — save this to resume the sequence later. */
  getState(): number {
    return this.state;
  }

  /** Resume a previously captured state. */
  setState(state: number): void {
    this.state = state >>> 0;
  }

  /** Returns a float in [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Returns a random element of items, or undefined if items is empty. */
  choice<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[Math.floor(this.next() * items.length)];
  }

  /** Fisher–Yates shuffle returning a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const arr = items.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /** Picks `count` unique items without replacement. */
  sample<T>(items: readonly T[], count: number): T[] {
    const pool = items.slice();
    const out: T[] = [];
    while (pool.length && out.length < count) {
      const idx = Math.floor(this.next() * pool.length);
      out.push(pool.splice(idx, 1)[0]);
    }
    return out;
  }

  /**
   * Weighted random choice. `entries` must be non-empty and all weights
   * must be positive. Falls back to the last entry to avoid returning undefined
   * in the presence of floating-point rounding errors.
   */
  weightedChoice<T>(entries: readonly { item: T; weight: number }[]): T {
    if (entries.length === 0) {
      throw new Error("weightedChoice called with empty entries");
    }
    const total = entries.reduce((sum, e) => sum + e.weight, 0);
    let roll = this.next() * total;
    for (const entry of entries) {
      roll -= entry.weight;
      if (roll <= 0) return entry.item;
    }
    return entries[entries.length - 1].item;
  }
}

/** Generate a reasonably unpredictable 32-bit seed at run-start. */
export function randomSeed(): number {
  return (Math.floor(Math.random() * 0xffffffff) ^ Date.now()) >>> 0;
}
