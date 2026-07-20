import type { OfficerAssignedCustomer } from '@/types/payments';

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isCalendarToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function assignmentRecencyTimestamp(item: OfficerAssignedCustomer): number {
  return parseDate(item.collectionUpdatedAt)?.getTime() ?? 0;
}

function isAssignedWork(item: OfficerAssignedCustomer): boolean {
  return item.assignmentType === 'assigned' || item.assignmentType === 'claimed';
}

function rankCollectionPreviewItems(items: OfficerAssignedCustomer[]): OfficerAssignedCustomer[] {
  return [...items].sort((a, b) => {
    const aToday = parseDate(a.collectionUpdatedAt);
    const bToday = parseDate(b.collectionUpdatedAt);
    const aIsToday = aToday !== null && isCalendarToday(aToday);
    const bIsToday = bToday !== null && isCalendarToday(bToday);
    if (aIsToday !== bIsToday) return aIsToday ? -1 : 1;
    const timeDiff = assignmentRecencyTimestamp(b) - assignmentRecencyTimestamp(a);
    if (timeDiff !== 0) return timeDiff;
    const dueA = parseDate(a.next_due_date)?.getTime() ?? Infinity;
    const dueB = parseDate(b.next_due_date)?.getTime() ?? Infinity;
    return dueA - dueB;
  });
}

function pickUniquePreviewItems(
  ranked: OfficerAssignedCustomer[],
  limit: number,
  preferToday: boolean,
): OfficerAssignedCustomer[] {
  const picked: OfficerAssignedCustomer[] = [];
  const seen = new Set<string>();

  const candidates = preferToday
    ? ranked.filter((item) => {
        const d = parseDate(item.collectionUpdatedAt);
        return d !== null && isCalendarToday(d);
      })
    : ranked;

  for (const item of candidates) {
    if (picked.length >= limit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    picked.push(item);
  }

  if (picked.length < limit) {
    for (const item of ranked) {
      if (picked.length >= limit) break;
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      picked.push(item);
    }
  }

  return picked;
}

/** Up to `limit` assigned/claimed items: today's updates first, then most recent. */
export function selectCollectionAssignmentPreview(
  items: OfficerAssignedCustomer[],
  limit = 3,
): OfficerAssignedCustomer[] {
  const work = items.filter(isAssignedWork);
  if (work.length === 0) return [];
  return pickUniquePreviewItems(rankCollectionPreviewItems(work), limit, true);
}

function rankOpenPoolPreview(items: OfficerAssignedCustomer[]): OfficerAssignedCustomer[] {
  return [...items].sort((a, b) => {
    const dueA = parseDate(a.next_due_date)?.getTime() ?? Infinity;
    const dueB = parseDate(b.next_due_date)?.getTime() ?? Infinity;
    if (dueA !== dueB) return dueA - dueB;
    return b.outstanding_amount - a.outstanding_amount;
  });
}

/**
 * Dashboard preview: direct assignments first, then open-pool items (same pattern as ticket pool + mine).
 */
export function selectCollectionDashboardPreview(
  myWork: OfficerAssignedCustomer[],
  openPool: OfficerAssignedCustomer[],
  limit = 3,
): OfficerAssignedCustomer[] {
  const assigned = pickUniquePreviewItems(
    rankCollectionPreviewItems(myWork.filter(isAssignedWork)),
    limit,
    true,
  );

  if (assigned.length >= limit) return assigned.slice(0, limit);

  const pool = rankOpenPoolPreview(openPool);
  const seen = new Set(assigned.map((item) => item.id));
  const merged = [...assigned];

  for (const item of pool) {
    if (merged.length >= limit) break;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}
