const TEMPLATE_TOKEN_PATTERN = /\{(\w+)\}/g;

export function replaceTemplateVars(template: string, vars: Record<string, string>): string {
  return template.replace(TEMPLATE_TOKEN_PATTERN, (match, key: string) => vars[key] ?? match);
}

/** Returns unresolved `{token}` placeholders still present after substitution. */
export function findUnresolvedTemplateTokens(text: string): string[] {
  const tokens = new Set<string>();
  let match: RegExpExecArray | null;
  const pattern = new RegExp(TEMPLATE_TOKEN_PATTERN.source, 'g');
  while ((match = pattern.exec(text)) !== null) {
    tokens.add(match[0]);
  }
  return [...tokens];
}

export function assertNoUnresolvedTemplateTokens(title: string, message: string): void {
  const unresolved = [...findUnresolvedTemplateTokens(title), ...findUnresolvedTemplateTokens(message)];
  if (unresolved.length > 0) {
    throw new Error(
      `Notification still contains unresolved placeholders: ${unresolved.join(', ')}. Fill in all template variables before sending.`,
    );
  }
}

export function formatPaymentDueNotificationVars(amount: number, dueDate: string): Record<string, string> {
  return {
    amount: amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    dueDate: new Date(dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  };
}
