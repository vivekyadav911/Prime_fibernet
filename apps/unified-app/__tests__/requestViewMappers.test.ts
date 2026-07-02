import {
  mapDbRowToServiceRequest,
  truncateRequestId,
} from '@/utils/requestViewMappers';
import { resolveCustomerName, resolvePlanName } from '@/utils/supportDisplay';

describe('truncateRequestId', () => {
  it('uses human-readable request_number when provided', () => {
    expect(truncateRequestId('44444444-4444-4444-4444-444444444401', 'REQ-2026-00001')).toBe(
      'REQ-2026-00001',
    );
  });

  it('falls back to short uuid prefix when no request_number', () => {
    expect(truncateRequestId('44444444-4444-4444-4444-444444444402')).toBe('#44444444');
  });
});

describe('resolveCustomerName', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

  afterEach(() => {
    warn.mockClear();
  });

  it('returns joined name when present', () => {
    expect(resolveCustomerName('user-1', 'Dev Customer', null, 'test')).toBe('Dev Customer');
  });

  it('warns in dev when customer_id exists but name missing', () => {
    expect(resolveCustomerName('user-1', null, null, 'test')).toBe('Unknown Customer');
    expect(warn).toHaveBeenCalled();
  });
});

describe('mapDbRowToServiceRequest', () => {
  it('resolves customer from user_name and request_number from column', () => {
    const request = mapDbRowToServiceRequest(
      {
        id: 'req-1',
        request_number: 'REQ-2026-00042',
        user_id: 'cust-1',
        user_name: 'Alice',
        status: 'pending',
        request_type: 'installation',
        created_at: '2026-01-01T00:00:00Z',
      },
      [],
    );

    expect(request.requestNumber).toBe('REQ-2026-00042');
    expect(request.customerName).toBe('Alice');
  });
});
