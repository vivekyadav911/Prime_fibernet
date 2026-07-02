jest.mock('@/utils/slaUtils', () => ({
  isOpenTicketSlaBreached: () => false,
}));

import {
  buildPortalItems,
  computePortalStats,
  requestToPortalItem,
  ticketToPortalItem,
} from '@/utils/portalTicketMappers';
import type { ServiceRequest } from '@/types/requests';
import type { Ticket } from '@/types/tickets';

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 't1',
    ticketNumber: 'TKT-2026-00001',
    title: 'No Internet',
    contactName: 'Alice',
    contactPhone: '999',
    contactEmail: 'a@test.com',
    address: '1 Main St',
    city: 'Delhi',
    complaintType: 'No Internet',
    priority: 'High',
    status: 'Open',
    source: 'portal',
    description: 'Down',
    assignedOfficerId: null,
    assignedOfficerName: null,
    assignedOfficerRole: null,
    assignedAt: null,
    respondedAt: null,
    resolvedAt: null,
    closedAt: null,
    responseSlaStatus: 'pending',
    resolutionSlaStatus: 'pending',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdByAdminId: 'admin',
    createdByAdminName: 'Admin',
    linkedRequestId: null,
    linkedRequestNumber: null,
    customerId: 'c1',
    tags: [],
    internalNotes: [],
    activityTimeline: [],
    attachments: [],
    slaPolicy: { priorityLevel: 'High', responseTimeHours: 1, resolutionTimeHours: 4 },
    slaStatus: {
      responseStatus: 'pending',
      resolutionStatus: 'pending',
      responseLive: 'pending',
      resolutionLive: 'pending',
      responseBreached: false,
      resolutionBreached: false,
      responseDeadline: new Date('2026-01-02'),
      resolutionDeadline: new Date('2026-01-03'),
      responseRemainingMs: 3600000,
      resolutionRemainingMs: 7200000,
      respondedAt: null,
      resolvedAt: null,
    },
    resolutionSummary: null,
    customerNotified: false,
    subCategory: null,
    accountNumber: null,
    firstResponseAt: null,
    escalationLevel: 0,
    csatScore: null,
    csatComment: null,
    csatSentAt: null,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 'r1',
    requestNumber: 'REQ-2026-00001',
    type: 'New Connection',
    status: 'Pending',
    source: 'customer',
    customerId: 'c1',
    customerName: 'Bob',
    customerEmail: 'b@test.com',
    customerPhone: '888',
    customerAddress: '2 Oak Ave',
    planId: 'p1',
    planName: '100 Mbps',
    planIsActive: true,
    assignedOfficerId: null,
    assignedOfficerName: null,
    assignedOfficerRole: null,
    createdAt: '2026-01-02T00:00:00Z',
    assignedAt: null,
    completedAt: null,
    activityTimeline: [],
    notes: [],
    ...overrides,
  };
}

describe('portalTicketMappers', () => {
  it('deduplicates linked request rows when a ticket exists', () => {
    const ticket = makeTicket({ linkedRequestId: 'r-linked' });
    const linkedRequest = makeRequest({ id: 'r-linked', linkedTicketId: ticket.id });
    const orphan = makeRequest({ id: 'r-orphan' });

    const items = buildPortalItems([ticket], [linkedRequest, orphan]);
    expect(items).toHaveLength(2);
    expect(items.map((i) => i.id).sort()).toEqual(['r-orphan', 't1'].sort());
  });

  it('computePortalStats aggregates open and unassigned counts', () => {
    const items = [
      ticketToPortalItem(makeTicket({ status: 'Open' })),
      requestToPortalItem(makeRequest({ status: 'Pending' })),
      ticketToPortalItem(
        makeTicket({ id: 't2', assignedOfficerId: 'o1', assignedOfficerName: 'Officer' }),
      ),
    ];

    const stats = computePortalStats(items, 3, 4.5);
    expect(stats.totalOpen).toBe(3);
    expect(stats.unassigned).toBe(2);
    expect(stats.assigned).toBe(1);
    expect(stats.today).toBe(3);
    expect(stats.avgCsatScore).toBe(4.5);
  });
});
