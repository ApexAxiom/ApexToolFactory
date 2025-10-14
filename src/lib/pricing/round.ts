/**
 * Applies the configured rounding rule to a numeric value.
 * @param value The raw amount to round.
 * @param rule The rounding rule selected by the user.
 * @returns The rounded amount.
 * @example
 * const total = applyRoundingRule(101.23, 'psychological_9');
 */
export function applyRoundingRule(
  value: number,
  rule: 'nearest_1' | 'nearest_5' | 'psychological_9',
): number {
  if (!Number.isFinite(value)) return 0;
  if (rule === 'nearest_1') return Math.round(value);
  if (rule === 'nearest_5') return Math.round(value / 5) * 5;
  const floored = Math.floor(value);
  if (floored <= 0) return 0;
  if (floored < 10) return 9;
  return Math.max(0, Math.floor(floored / 10) * 10 + 9);
}
