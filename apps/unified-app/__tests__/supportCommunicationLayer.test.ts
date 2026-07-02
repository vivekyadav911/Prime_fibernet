import { formatRequestTypeLabel, normalizeRequestType, REQUEST_TYPE_LABELS } from '@/constants/requestTypes';
import { computeOfficerDashboardStats } from '@/utils/officerDashboardStats';
import { officerDisplayInitials, resolveOfficerName } from '@/utils/resolveOfficerName';
import type { ServiceRequest } from '@prime/types';

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

describe('computeOfficerDashboardStats', () => {
  const base = {
    userId: 'u1',
    officerId: 'o1',
    requestType: 'installation' as const,
    priority: 'P2' as const,
    address: 'Addr',
    createdAt: new Date().toISOString(),
  };

  it('counts new, active, and resolved-today from the same assignment list', () => {
    const today = new Date().toISOString();
    const requests: ServiceRequest[] = [
      { ...base, id: '1', status: 'assigned', requestTypeLabel: 'New Connection' },
      { ...base, id: '2', status: 'working', requestTypeLabel: 'Issue' },
      {
        ...base,
        id: '3',
        status: 'resolved',
        completedAt: today,
        requestTypeLabel: 'New Connection',
      },
    ];

    const stats = computeOfficerDashboardStats(requests);
    expect(stats.newRequests).toBe(1);
    expect(stats.activeRequests).toBe(1);
    expect(stats.resolvedToday).toBe(1);
  });
});
