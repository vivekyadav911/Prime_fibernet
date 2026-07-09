import { formatRequestTypeLabel, normalizeRequestType, REQUEST_TYPE_LABELS } from '@/constants/requestTypes';
import { computeOfficerPortalDashboardStats } from '@/utils/officerDashboardStats';
import {
  applyOfficerTicketListFilters,
  matchesOfficerTicketFilter,
  selectTodayAssignmentPreview,
} from '@/utils/officerTicketFilters';
import { officerDisplayInitials, resolveOfficerName } from '@/utils/resolveOfficerName';
import type { PortalTicketItem } from '@/types/portalTicket';

describe('formatRequestTypeLabel', () => {
  it('maps legacy DB values to canonical admin labels', () => {
    expect(formatRequestTypeLabel('installation')).toBe('New Connection');
    expect(formatRequestTypeLabel('repair')).toBe('Issue');
    expect(formatRequestTypeLabel('complaint')).toBe('Issue');
  });

  it('normalizes canonical snake_case values', () => {
    expect(normalizeRequestType('new_connection')).toBe('new_connection');
    expect(REQUEST_TYPE_LABELS.new_connection).toBe('New Connection');
  });
});

describe('resolveOfficerName', () => {
  it('prefers officers.full_name over users.name', () => {
    expect(
      resolveOfficerName('off-1', {
        fullName: 'Harsh Sharma',
        userName: 'Ha sh',
      }),
    ).toBe('Harsh Sharma');
  });

  it('handles single-word names without corruption', () => {
    expect(resolveOfficerName('off-2', { fullName: 'Madonna' })).toBe('Madonna');
    expect(officerDisplayInitials('Madonna')).toBe('MA');
  });

  it('handles hyphenated names', () => {
    expect(resolveOfficerName('off-3', { fullName: 'Mary-Jane Watson' })).toBe('Mary-Jane Watson');
    expect(officerDisplayInitials('Mary-Jane Watson')).toBe('MW');
  });

  it('falls back to denormalized name when join missing', () => {
    expect(resolveOfficerName('off-4', { denormalizedName: 'Dev Officer' })).toBe('Dev Officer');
  });
});

function portalItem(
  id: string,
  statusBucket: PortalTicketItem['statusBucket'],
  resolvedAt?: Date,
): PortalTicketItem {
  return {
    id,
    kind: 'ticket',
    ticketId: id,
    requestId: null,
    displayNumber: `TKT-${id}`,
    categoryLabel: 'Issue',
    statusBucket,
    source: 'customer',
    customerName: 'Customer',
    customerAddress: 'Addr',
    planName: '—',
    priority: 'Medium',
    assignedOfficerId: 'o1',
    assignedOfficerName: 'Officer',
    assignedOfficerRole: 'Field Technician',
    createdAt: new Date().toISOString(),
    assignedAt: new Date().toISOString(),
    slaBreached: false,
    ticket: resolvedAt
      ? ({
          id,
          ticketNumber: `TKT-${id}`,
          status: statusBucket,
          resolvedAt,
        } as PortalTicketItem['ticket'])
      : null,
    request: null,
  };
}

describe('selectTodayAssignmentPreview', () => {
  const todayIso = new Date().toISOString();
  const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString();

  function item(
    id: string,
    statusBucket: PortalTicketItem['statusBucket'],
    opts?: { assignedAt?: string; createdAt?: string; priority?: PortalTicketItem['priority'] },
  ): PortalTicketItem {
    return {
      ...portalItem(id, statusBucket),
      assignedAt: opts?.assignedAt ?? todayIso,
      createdAt: opts?.createdAt ?? todayIso,
      priority: opts?.priority ?? 'Medium',
    };
  }

  it('returns only open/active items assigned or created today', () => {
    const items: PortalTicketItem[] = [
      item('1', 'Open'),
      item('2', 'Resolved', { assignedAt: todayIso }),
      item('3', 'In Progress', { assignedAt: yesterdayIso, createdAt: yesterdayIso }),
      item('4', 'Closed', { assignedAt: todayIso }),
    ];

    const preview = selectTodayAssignmentPreview(items, 3);
    expect(preview.map((i) => i.id)).toEqual(['1']);
  });

  it('caps at limit without padding resolved tickets', () => {
    const items: PortalTicketItem[] = [
      item('1', 'Open'),
      item('2', 'In Progress'),
      item('3', 'Resolved', { assignedAt: todayIso }),
    ];

    expect(selectTodayAssignmentPreview(items, 3)).toHaveLength(2);
  });

  it('sorts unopened before in-progress, then most recent', () => {
    const earlier = new Date(Date.now() - 3_600_000).toISOString();
    const later = new Date(Date.now() - 1_800_000).toISOString();
    const items: PortalTicketItem[] = [
      item('active-old', 'In Progress', { assignedAt: earlier }),
      item('open-new', 'Open', { assignedAt: later }),
      item('open-old', 'Open', { assignedAt: earlier }),
    ];

    const preview = selectTodayAssignmentPreview(items, 3);
    expect(preview.map((i) => i.id)).toEqual(['open-new', 'open-old', 'active-old']);
  });
});
describe('applyOfficerTicketListFilters', () => {
  const todayIso = new Date().toISOString();
  const yesterdayIso = new Date(Date.now() - 86_400_000).toISOString();

  function item(id: string, statusBucket: PortalTicketItem['statusBucket'], at: string): PortalTicketItem {
    return {
      ...portalItem(id, statusBucket),
      assignedAt: at,
      createdAt: at,
      customerName: id === 'alpha' ? 'Alpha Customer' : 'Beta Customer',
    };
  }

  it('filters by search query and date', () => {
    const items = [item('alpha', 'Open', todayIso), item('beta', 'Open', yesterdayIso)];
    const result = applyOfficerTicketListFilters(items, {
      statusFilter: 'all',
      dateFilter: 'today',
      sortBy: 'newest',
      searchQuery: 'alpha',
    });
    expect(result.map((i) => i.id)).toEqual(['alpha']);
  });

  it('sorts oldest first when requested', () => {
    const earlier = new Date(Date.now() - 3_600_000).toISOString();
    const later = new Date(Date.now() - 1_800_000).toISOString();
    const items = [item('newer', 'Open', later), item('older', 'Open', earlier)];
    const result = applyOfficerTicketListFilters(items, {
      statusFilter: 'all',
      dateFilter: 'all',
      sortBy: 'oldest',
      searchQuery: '',
    });
    expect(result.map((i) => i.id)).toEqual(['older', 'newer']);
  });
});
describe('computeOfficerPortalDashboardStats', () => {
  it('counts new, active, and resolved-today from portal status buckets', () => {
    const today = new Date();
    const items: PortalTicketItem[] = [
      portalItem('1', 'Open'),
      portalItem('2', 'In Progress'),
      portalItem('3', 'Resolved', today),
    ];

    const stats = computeOfficerPortalDashboardStats(items);
    expect(stats.newTickets).toBe(1);
    expect(stats.activeTickets).toBe(1);
    expect(stats.resolvedToday).toBe(1);
  });

  it('maps officer filter tabs to the same buckets as admin Ticket Portal', () => {
    const open = portalItem('1', 'Open');
    const inProgress = portalItem('2', 'In Progress');
    const awaiting = portalItem('3', 'Awaiting Customer');
    const resolved = portalItem('4', 'Resolved');

    expect(matchesOfficerTicketFilter(open, 'new')).toBe(true);
    expect(matchesOfficerTicketFilter(inProgress, 'active')).toBe(true);
    expect(matchesOfficerTicketFilter(awaiting, 'active')).toBe(true);
    expect(matchesOfficerTicketFilter(resolved, 'done')).toBe(true);
  });
});
