export function computeNextDueDate(billingCycleDay: number, fromDate = new Date()): string {
  const day = Math.min(Math.max(billingCycleDay, 1), 28);
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();
  const candidate = new Date(year, month + 1, day);
  if (candidate <= fromDate) {
    return new Date(year, month + 2, day).toISOString().slice(0, 10);
  }
  return candidate.toISOString().slice(0, 10);
}

export function validateDenominationTotal(
  denominations: Record<string, number>,
  expectedAmount: number,
  tolerancePercent = 5,
): { valid: boolean; total: number; difference: number } {
  const total = Object.entries(denominations).reduce(
    (sum, [note, count]) => sum + Number(note) * Number(count),
    0,
  );
  const tolerance = expectedAmount * (tolerancePercent / 100);
  const difference = total - expectedAmount;
  return {
    valid: Math.abs(difference) <= tolerance || Math.abs(difference) <= 5,
    total,
    difference,
  };
}
