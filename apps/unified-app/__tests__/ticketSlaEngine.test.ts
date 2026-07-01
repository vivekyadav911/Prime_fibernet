jest.mock('@/services/supabase', () => ({
  getSupabase: jest.fn(),
}));

import type { Ticket } from '@/types/tickets';
import {
  buildSlaStatusFromTicket,
  computeTicketStats,
  getEffectiveResolutionSlaStatus,
  getEffectiveResponseSlaStatus,
  isOpenTicketSlaBreached,
  isTicketTerminal,
} from '@/utils/slaUtils';

function makeTicket(overrides: Partial<Ticket> & Pick<Ticket, 'status'>): Ticket {
  const createdAt = overrides.createdAt ?? new Date('2026-06-01T11:13:00+05:30');
  const responseDeadline = overrides.slaStatus?.responseDeadline ?? new Date('2026-06-01T12:13:00+05:30');
  const resolutionDeadline = overrides.slaStatus?.resolutionDeadline ?? new Date('2026-06-01T23:13:00+05:30');
  return {
    id: 't1',
    ticketNumber: 'TKT-2026-00001',
    title: 'Test',
    contactName: 'Test User',
    contactPhone: '9999999999',
    contactEmail: '',
    address: '',
    city: '',
    complaintType: 'Technical Issue',
    priority: 'Medium',
    source: 'admin',
    description: 'Test',
    assignedOfficerId: 'o1',
    assignedOfficerName: 'Officer',
    assignedOfficerRole: 'Field',
    assignedAt: createdAt,
    respondedAt: new Date('2026-06-01T11:20:00+05:30'),
    resolvedAt: new Date('2026-06-01T19:33:00+05:30'),
    closedAt: new Date('2026-06-01T19:34:00+05:30'),
    responseSlaStatus: 'met',
    resolutionSlaStatus: 'met',
    createdAt,
    updatedAt: createdAt,
    createdByAdminId: 'a1',
    createdByAdminName: 'Admin',
    linkedRequestId: null,
    linkedRequestNumber: null,
    customerId: null,
    tags: [],
    internalNotes: [],
    activityTimeline: [],
    attachments: [],
    slaPolicy: { priorityLevel: 'Medium', responseTimeHours: 4, resolutionTimeHours: 24 },
    slaStatus: {
      responseStatus: 'met',
      resolutionStatus: 'met',
      responseLive: 'met',
      resolutionLive: 'met',
      responseBreached: false,
      resolutionBreached: false,
      responseDeadline,
      resolutionDeadline,
      responseRemainingMs: 0,
      resolutionRemainingMs: 0,
      respondedAt: new Date('2026-06-01T11:20:00+05:30'),
      resolvedAt: new Date('2026-06-01T19:33:00+05:30'),
    },
    resolutionSummary: null,
    customerNotified: false,
    subCategory: null,
    accountNumber: null,
    firstResponseAt: new Date('2026-06-01T11:20:00+05:30'),
    escalationLevel: 0,
    csatScore: null,
    csatComment: null,
    csatSentAt: null,
    ...overrides,
  };
}

describe('ticket SLA engine', () => {
  it('TKT-2026-00001 closed on time shows met, not live breach', () => {
    const ticket = makeTicket({ status: 'Closed' });
    const now = new Date('2026-07-01T00:00:00+05:30');
    expect(getEffectiveResponseSlaStatus(ticket, now)).toBe('met');
    expect(getEffectiveResolutionSlaStatus(ticket, now)).toBe('met');
    expect(isOpenTicketSlaBreached(ticket, now)).toBe(false);
    const sla = buildSlaStatusFromTicket(ticket, now);
    expect(sla.responseBreached).toBe(false);
    expect(sla.resolutionBreached).toBe(false);
  });

  it('open ticket past deadline is breached live', () => {
    const ticket = makeTicket({
      status: 'Open',
      respondedAt: null,
      resolvedAt: null,
      closedAt: null,
      responseSlaStatus: 'pending',
      resolutionSlaStatus: 'pending',
    });
    const now = new Date('2026-06-02T12:00:00+05:30');
    expect(getEffectiveResponseSlaStatus(ticket, now)).toBe('breached');
    expect(isOpenTicketSlaBreached(ticket, now)).toBe(true);
  });

  it('resolved after deadline locks breached permanently', () => {
    const ticket = makeTicket({
      status: 'Resolved',
      resolutionSlaStatus: 'breached',
      resolvedAt: new Date('2026-06-02T01:00:00+05:30'),
    });
    const now = new Date('2026-07-01T00:00:00+05:30');
    expect(getEffectiveResolutionSlaStatus(ticket, now)).toBe('breached');
    expect(isOpenTicketSlaBreached(ticket, now)).toBe(false);
  });

  it('computeTicketStats only counts open breaches', () => {
    const closedMet = makeTicket({ status: 'Closed' });
    const openBreached = makeTicket({
      status: 'Open',
      id: 't2',
      ticketNumber: 'TKT-2026-00002',
      responseSlaStatus: 'pending',
      resolutionSlaStatus: 'pending',
      respondedAt: null,
      resolvedAt: null,
      closedAt: null,
    });
    const now = new Date('2026-06-02T12:00:00+05:30');
    const stats = computeTicketStats([closedMet, openBreached], now);
    expect(stats.slaBreaches).toBe(1);
    expect(isTicketTerminal(closedMet.status)).toBe(true);
  });
});
