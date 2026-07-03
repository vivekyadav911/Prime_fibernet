import { readFileSync } from 'node:fs';
import path from 'node:path';

import { formatCustomerAccountId } from '@/utils/customerAccount';

const repoRoot = path.resolve(__dirname, '..');

function readSrc(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('cross-app consistency', () => {
  it('customer plans API resolves identity via current_customer_user_id', () => {
    const source = readSrc('src/services/api/customerPlansApi.ts');
    expect(source).toContain("client.rpc('current_customer_user_id')");
    expect(source).not.toContain("client.rpc('get_customer_id')");
  });

  it('customer catalog only loads active plans', () => {
    const source = readSrc('src/services/api/plansApi.ts');
    expect(source).toMatch(/\.eq\('is_active',\s*true\)/);
  });

  it('getCustomerBill uses shared account id formatter', () => {
    const source = readSrc('src/services/api/paymentCollectionApi.ts');
    expect(source).toContain('formatCustomerAccountId');
    expect(source).not.toMatch(/ACC-\$\{/);
  });

  it('admin plan change review screen is registered in navigation', () => {
    const nav = readSrc('src/navigation/adminStackNavigators.tsx');
    expect(nav).toContain('PlanChangeRequests');
    expect(nav).toContain('PlanChangeRequestsScreen');
  });

  it('payment confirmation trigger updates outstanding balance', () => {
    const migration = readFileSync(
      path.join(repoRoot, '../../supabase/migrations/20260618100000_payment_collection_portal.sql'),
      'utf8',
    );
    expect(migration).toContain("NEW.status = 'confirmed'");
    expect(migration).toContain('outstanding_amount = GREATEST(0');
  });

  describe('formatCustomerAccountId', () => {
    it('prefers DB customer_id over synthetic prefix', () => {
      expect(formatCustomerAccountId('PF-10042', 'uuid-fallback')).toBe('PF-10042');
    });

    it('does not invent ACC- prefix', () => {
      expect(formatCustomerAccountId(null, 'abc-123')).toBe('abc-123');
      expect(formatCustomerAccountId('', undefined)).toBe('—');
    });
  });
});
