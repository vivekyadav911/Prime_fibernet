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

/** Up to `limit` assigned/claimed items: today's updates first, then most recent. */
export function selectCollectionAssignmentPreview(
  items: OfficerAssignedCustomer[],
  limit = 3,
): OfficerAssignedCustomer[] {
  const work = items.filter(isAssignedWork);
  if (work.length === 0) return [];

  const ranked = [...work].sort((a, b) => {
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

  const today = ranked.filter((item) => {
    const d = parseDate(item.collectionUpdatedAt);
    return d !== null && isCalendarToday(d);
  });

  const picked: OfficerAssignedCustomer[] = [];
  const seen = new Set<string>();

  for (const item of today) {
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
