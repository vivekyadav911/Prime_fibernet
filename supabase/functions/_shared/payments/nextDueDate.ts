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
