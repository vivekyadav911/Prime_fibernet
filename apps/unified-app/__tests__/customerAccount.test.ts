import { formatCustomerAccountId, formatInstallationAddress } from '@/utils/customerAccount';

describe('formatCustomerAccountId', () => {
  it('returns customer_id from database without prefix', () => {
    expect(formatCustomerAccountId('PF-10294')).toBe('PF-10294');
  });

  it('returns em dash when missing', () => {
    expect(formatCustomerAccountId(null)).toBe('—');
  });
});

describe('formatInstallationAddress', () => {
  it('composes address, city, district, and pincode', () => {
    expect(
      formatInstallationAddress({
        address: '12 MG Road',
        city: 'Pune',
        district: 'Pune',
        pincode: '411001',
      }),
    ).toBe('12 MG Road, Pune, Pune — 411001');
  });

  it('returns empty string when user is missing', () => {
    expect(formatInstallationAddress(null)).toBe('');
  });

  it('uses line only when locality missing', () => {
    expect(formatInstallationAddress({ address: 'Flat 4B, Tower A' })).toBe('Flat 4B, Tower A');
  });
});
