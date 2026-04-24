import type { ResolvedCardData, Unit } from "./Types";

/**
 * Pure functions that compute the numbers used in combat.
 *
 * Keeping these in one place means balance changes (e.g., "Weak now reduces
 * damage by 33% instead of 25%") only need to be made once.
 */

export function calculateAttackDamage(
  base: number,
  source: Unit,
  target: Unit,
  cardData: ResolvedCardData | null
): number {
  let amount = base;
  if (!cardData || cardData.type === "Attack") {
    amount += source.statuses.strength ?? 0;
  }
  if ((source.statuses.weak ?? 0) > 0) {
    amount = Math.floor(amount * 0.75);
  }
  if ((target.statuses.vulnerable ?? 0) > 0) {
    amount = Math.floor(amount * 1.5);
  }
  if (
    (target.statuses.mark ?? 0) > 0 &&
    (!cardData || cardData.type === "Attack")
  ) {
    amount += target.statuses.mark ?? 0;
  }
  return Math.max(0, amount);
}

/**
 * Enemy attack damage. Mirrors calculateAttackDamage but without card context
 * (enemies don't play cards) and without Mark (only player attacks trigger it).
 */
export function calculateEnemyAttackDamage(
  base: number,
  source: Unit,
  target: Unit
): number {
  let amount = base + (source.statuses.strength ?? 0);
  if ((source.statuses.weak ?? 0) > 0) {
    amount = Math.floor(amount * 0.75);
  }
  if ((target.statuses.vulnerable ?? 0) > 0) {
    amount = Math.floor(amount * 1.5);
  }
  return Math.max(0, amount);
}

export function calculateBlockGain(base: number, unit: Unit): number {
  let amount = base + (unit.statuses.dexterity ?? 0);
  if ((unit.statuses.frail ?? 0) > 0) {
    amount = Math.floor(amount * 0.75);
  }
  return Math.max(0, amount);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
