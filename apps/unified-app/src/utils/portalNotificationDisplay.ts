import type { PortalNotification } from '@/types/payments';

import {
  findUnresolvedTemplateTokens,
  formatPaymentDueNotificationVars,
  replaceTemplateVars,
} from '@/utils/notificationTemplate';

const TEST_CONTENT_PATTERNS = [/hello guys/i, /haha jake/i, /^test\b/i];

function varsFromNotificationData(data: Record<string, unknown>): Record<string, string> {
  const vars: Record<string, string> = {};
  if (data.amount != null) {
    const amount = Number(data.amount);
    if (!Number.isNaN(amount)) {
      Object.assign(vars, formatPaymentDueNotificationVars(amount, String(data.dueDate ?? data.due_date ?? '')));
    }
  }
  if (data.dueDate != null) vars.dueDate = String(data.dueDate);
  if (data.due_date != null) vars.dueDate = String(data.due_date);
  if (data.ticketNumber != null) vars.ticketNumber = String(data.ticketNumber);
  if (data.message != null) vars.message = String(data.message);
  return vars;
}

export function resolveNotificationText(
  text: string | null | undefined,
  data?: Record<string, unknown>,
): string {
  if (!text) return '';
  const vars = data ? varsFromNotificationData(data) : {};
  const resolved = Object.keys(vars).length > 0 ? replaceTemplateVars(text, vars) : text;
  if (findUnresolvedTemplateTokens(resolved).length > 0) {
    return 'Open the relevant section in the app for full details.';
  }
  return resolved;
}

export function isJunkPortalNotification(item: PortalNotification): boolean {
  if (item.data?.is_test === true) return true;
  const haystack = `${item.title} ${item.body ?? ''}`;
  return TEST_CONTENT_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function portalNotificationCategoryLabel(
  category: PortalNotification['category'],
): string {
  if (category === 'request') return 'Ticket';
  if (!category) return 'Alert';
  return category.charAt(0).toUpperCase() + category.slice(1);
}
