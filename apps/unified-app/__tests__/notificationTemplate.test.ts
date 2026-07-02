import {
  assertNoUnresolvedTemplateTokens,
  findUnresolvedTemplateTokens,
  formatPaymentDueNotificationVars,
  replaceTemplateVars,
} from '@/utils/notificationTemplate';

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
    expect(() => assertNoUnresolvedTemplateTokens('Payment Due Soon', message)).toThrow(
      /unresolved placeholders/i,
    );
  });

  it('passes when all placeholders are resolved', () => {
    const vars = formatPaymentDueNotificationVars(500, '2026-08-01');
    const title = replaceTemplateVars('Payment Due Soon', vars);
    const message = replaceTemplateVars('Your payment of ₹{amount} is due on {dueDate}.', vars);
    expect(() => assertNoUnresolvedTemplateTokens(title, message)).not.toThrow();
  });
});
