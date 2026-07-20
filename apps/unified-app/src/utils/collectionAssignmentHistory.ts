import type { CollectionAssignmentHistoryRow } from '@/types/api/admin';

export function formatCollectionHistoryAssignment(row: CollectionAssignmentHistoryRow): string {
  if (row.assignedOfficerName) return `Assigned to ${row.assignedOfficerName}`;
  if (row.status === 'open') return 'Placed in open pool';
  if (row.claimedByOfficerName) return `Claimed by ${row.claimedByOfficerName}`;
  if (row.notes?.trim()) return row.notes.trim();
  return row.status;
}
