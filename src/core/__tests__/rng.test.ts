import { describe, it, expect } from "vitest";
import { RNG } from "../RNG";

describe("RNG determinism", () => {
  it("same seed produces the same sequence", () => {
    const a = new RNG(42);
    const b = new RNG(42);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it("different seeds produce different sequences", () => {
    const a = new RNG(1);
    const b = new RNG(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("getState/setState round-trips the sequence", () => {
    const rng = new RNG(99);
    // Advance a few steps.
    rng.next();
    rng.next();
    const savedState = rng.getState();
    const expectedNext = rng.next();

    // Resume from the saved state.
    const resumed = new RNG(99, savedState);
    expect(resumed.next()).toBe(expectedNext);
  });

  it("saving state mid-sequence replays identically", () => {
    const rng = new RNG(7);
    for (let i = 0; i < 5; i++) rng.next();
    const midState = rng.getState();

    // Record the rest of the original sequence.
    const original = Array.from({ length: 15 }, () => rng.next());

    // Replay from mid-state.
    const replay = new RNG(7, midState);
    const replayed = Array.from({ length: 15 }, () => replay.next());

    expect(replayed).toEqual(original);
  });

  it("int() stays within [min, max] inclusive", () => {
    const rng = new RNG(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it("int() handles inverted min/max", () => {
    const rng = new RNG(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(9, 3);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });

  it("choice() returns undefined for empty array", () => {
    const rng = new RNG(1);
    expect(rng.choice([])).toBeUndefined();
  });

  it("choice() always returns a member of the array", () => {
    const rng = new RNG(100);
    const items = ["a", "b", "c"] as const;
    for (let i = 0; i < 50; i++) {
      expect(items).toContain(rng.choice(items));
    }
  });

  it("shuffle() produces a permutation of the original", () => {
    const rng = new RNG(55);
    const input = [1, 2, 3, 4, 5];
    const result = rng.shuffle(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort()).toEqual([...input].sort());
  });

  it("shuffle() does not mutate the input array", () => {
    const rng = new RNG(55);
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    rng.shuffle(input);
    expect(input).toEqual(copy);
  });

  it("sample() returns the requested count without duplicates", () => {
    const rng = new RNG(77);
    const items = [10, 20, 30, 40, 50];
    const result = rng.sample(items, 3);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
    for (const v of result) expect(items).toContain(v);
  });

  it("sample() clamps to available items when count exceeds pool", () => {
    const rng = new RNG(77);
    const result = rng.sample([1, 2], 10);
    expect(result).toHaveLength(2);
  });

  it("weightedChoice() always returns an item", () => {
    const rng = new RNG(33);
    const entries = [
      { item: "a", weight: 1 },
      { item: "b", weight: 10 },
      { item: "c", weight: 100 },
    ] as const;
    for (let i = 0; i < 50; i++) {
      const result = rng.weightedChoice(entries);
      expect(["a", "b", "c"]).toContain(result);
    }
  });

  it("weightedChoice() throws for empty entries", () => {
    const rng = new RNG(1);
    expect(() => rng.weightedChoice([])).toThrow();
  });

  it("getSeed() returns the original seed", () => {
    const rng = new RNG(9999);
    rng.next();
    rng.next();
    expect(rng.getSeed()).toBe(9999);
  });
});
