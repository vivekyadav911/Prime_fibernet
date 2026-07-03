import {
  findUnresolvedTemplateTokens,
  formatPaymentDueNotificationVars,
  replaceTemplateVars,
} from '@/utils/notificationTemplate';
import {
  isJunkPortalNotification,
  resolveNotificationText,
} from '@/utils/portalNotificationDisplay';
import type { PortalNotification } from '@/types/payments';

describe('notificationTemplate', () => {
  it('substitutes all known payment due variables', () => {
    const vars = formatPaymentDueNotificationVars(1299, '2026-07-15');
    const message = replaceTemplateVars(
      'Your payment of ₹{amount} is due on {dueDate}. Please pay to avoid service interruption.',
      vars,
    );
    expect(findUnresolvedTemplateTokens(message)).toEqual([]);
    expect(message).toContain('1,299.00');
    expect(message).toContain('Jul');
  });

  it('detects unresolved placeholders', () => {
    const message = 'Your payment of ₹{amount} is due on {dueDate}.';
    expect(findUnresolvedTemplateTokens(message)).toEqual(['{amount}', '{dueDate}']);
  });
});

describe('portalNotificationDisplay', () => {
  it('resolves payment placeholders from notification data when present', () => {
    const body = resolveNotificationText('Your payment of ₹{amount} is due on {dueDate}', {
      amount: 500,
      dueDate: '2026-08-01',
    });
    expect(findUnresolvedTemplateTokens(body)).toEqual([]);
  });

  it('does not surface raw template tokens to officers', () => {
    const body = resolveNotificationText('Your payment of ₹{amount} is due on {dueDate}');
    expect(body).not.toMatch(/\{amount\}/);
    expect(body).not.toMatch(/\{dueDate\}/);
  });

  it('filters junk test notifications from the production feed', () => {
    const junk: PortalNotification = {
      id: '1',
      recipient_auth_id: 'a',
      recipient_officer_id: null,
      type: 'system',
      category: 'system',
      title: 'Hello guys',
      body: 'Haha Jake kaka',
      action_url: null,
      data: {},
      is_read: false,
      created_at: new Date().toISOString(),
    };
    expect(isJunkPortalNotification(junk)).toBe(true);
  });
});
