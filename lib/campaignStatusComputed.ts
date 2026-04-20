/**
 * Computes campaign status dynamically from dates instead of storing as a mutable column.
 * This avoids ClickHouse key column UPDATE errors.
 */
export const computeStatusSQL = `
  multiIf(
    now() <= invitation_deadline, 'inviting',
    now() >= start_date AND now() < end_date, 'active',
    now() >= end_date, 'closed',
    'inviting'
  )
`;

/**
 * Replace a SELECT status with computed status.
 * Usage in queries:
 *   OLD: SELECT c.status FROM campaigns c WHERE ...
 *   NEW: SELECT ${replaceStatusSelect('c.status')} FROM campaigns c WHERE ...
 */
export function replaceStatusSelect(columnAlias: string = "status"): string {
  return `${computeStatusSQL} as ${columnAlias}`;
}

/**
 * Replace WHERE status = 'active' with date-based logic.
 * Usage: WHERE ${replaceStatusWhere('active')}
 */
export function replaceStatusWhere(targetStatus: string): string {
  switch (targetStatus) {
    case "inviting":
      return `now() <= invitation_deadline`;
    case "active":
      return `now() >= start_date AND now() < end_date`;
    case "closed":
      return `now() >= end_date`;
    default:
      return "true";
  }
}
