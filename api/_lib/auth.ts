import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Single-user access control.
 *
 * There's no login system -- instead, every request to /api/* must carry
 * `Authorization: Bearer <APP_ACCESS_TOKEN>`. The token is a passcode you
 * set once as a Vercel env var; the frontend asks for it once and caches it
 * in localStorage. This is intentionally simple (it's a private, single-
 * user app) but it is enough to stop anyone who finds the URL from reading
 * or writing your data, and it keeps the real secret (the Supabase service
 * role key) off the client entirely.
 */
export function checkAuth(req: VercelRequest, res: VercelResponse): boolean {
  const expected = process.env.APP_ACCESS_TOKEN;
  if (!expected) {
    res.status(500).json({ error: 'Server misconfigured: APP_ACCESS_TOKEN is not set.' });
    return false;
  }
  const header = req.headers['authorization'];
  const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '') : '';
  if (token !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// Every table the generic /api/data/[table] route is allowed to touch.
// Anything not in this list is rejected -- this is what stops the dynamic
// route from being an arbitrary SQL door.
export const ALLOWED_TABLES = [
  'goals',
  'projects',
  'tasks',
  'time_entries',
  'notes',
  'routines',
  'routine_logs',
  'daily_reflections',
] as const;

export type AllowedTable = (typeof ALLOWED_TABLES)[number];

export function isAllowedTable(table: string): table is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(table);
}
