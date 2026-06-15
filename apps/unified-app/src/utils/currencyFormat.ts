export function formatINR(amount: number, options?: { showSymbol?: boolean }): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return options?.showSymbol === false ? formatted : `₹${formatted}`;
}

export function parseAmountInput(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}
