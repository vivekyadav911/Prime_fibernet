import type { CollectionAssignmentRow } from '@/types/api/admin';

/** Customer is in the assignment queue (open pool, officer-assigned, or claimed). */
export function isCollectionRowInAssignmentQueue(row: CollectionAssignmentRow): boolean {
  if (row.assignedOfficerId || row.claimedByOfficerId) return true;
  const status = row.collectionStatus;
  return status === 'open' || status === 'assigned' || status === 'claimed';
}

export function splitCollectionAssignmentRows(rows: CollectionAssignmentRow[]): {
  available: CollectionAssignmentRow[];
  assigned: CollectionAssignmentRow[];
} {
  const available: CollectionAssignmentRow[] = [];
  const assigned: CollectionAssignmentRow[] = [];
  for (const row of rows) {
    if (isCollectionRowInAssignmentQueue(row)) assigned.push(row);
    else available.push(row);
  }
  return { available, assigned };
}

export function collectionAssignmentLabel(row: CollectionAssignmentRow): string {
  if (row.assignedOfficerName) return row.assignedOfficerName;
  if (row.claimedByOfficerName) return `Claimed · ${row.claimedByOfficerName}`;
  if (row.collectionStatus === 'open') return 'Open pool';
  return 'Unassigned';
}
