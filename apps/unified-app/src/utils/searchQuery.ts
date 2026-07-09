/** Escape user input for PostgREST `ilike` patterns inside quoted filter values. */
export function escapeIlikePattern(term: string): string {
  return term.replace(/\\/g, '\\\\').replace(/"/g, '""').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function buildUserSearchOrFilter(search: string): string {
  const trimmed = search.trim();
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  const clauses = [
    `name.ilike."${pattern}"`,
    `email.ilike."${pattern}"`,
    `phone.ilike."${pattern}"`,
    `username.ilike."${pattern}"`,
    `customer_id.ilike."${pattern}"`,
  ];

  if (/^\d+$/.test(trimmed)) {
    clauses.push(`legacy_user_id.eq.${trimmed}`);
  }

  return clauses.join(',');
}

/** Collection assignments: name, account (customer_id), phone only — avoids email/username false positives. */
export function buildCollectionAssignmentSearchFilter(search: string): string {
  const trimmed = search.trim();
  const pattern = `%${escapeIlikePattern(trimmed)}%`;
  return [
    `name.ilike."${pattern}"`,
    `phone.ilike."${pattern}"`,
    `customer_id.ilike."${pattern}"`,
  ].join(',');
}
