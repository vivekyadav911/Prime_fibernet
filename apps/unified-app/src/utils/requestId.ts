const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRequestUuid(id: string): boolean {
  return UUID_RE.test(id.trim());
}

/** Dev-only guard when navigation passes a display id instead of the primary key. */
export function warnInvalidRequestId(id: string, context: string): void {
  if (__DEV__ && !isRequestUuid(id)) {
    console.error(
      `[requests] Expected UUID primary key in ${context}, got "${id}". ` +
        'Navigation must pass service_requests.id — request_number is display-only.',
    );
  }
}
