import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_TABLES = [
  'goals',
  'projects',
  'tasks',
  'time_entries',
  'notes',
  'routines',
  'routine_logs',
  'daily_reflections',
] as const;
type AllowedTable = (typeof ALLOWED_TABLES)[number];
function isAllowedTable(table: string): table is AllowedTable {
  return (ALLOWED_TABLES as readonly string[]).includes(table);
}

function getAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

function checkAuth(req: VercelRequest, res: VercelResponse): boolean {
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

function isValidRow(row: unknown): row is Record<string, unknown> {
  return (
    typeof row === 'object' &&
    row !== null &&
    typeof (row as any).id === 'string' &&
    (row as any).id.length > 0
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req, res)) return;
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Server misconfigured: Supabase env vars are missing.' });
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || typeof body.tables !== 'object') {
    res.status(400).json({ error: 'Expected { tables: { <table>: [rows...] } } -- is this a valid export file?' });
    return;
  }

  const summary: Record<string, { upserted: number; skipped: number }> = {};
  const errors: string[] = [];

  for (const [table, rows] of Object.entries(body.tables as Record<string, unknown>)) {
    if (!isAllowedTable(table)) {
      errors.push(`Skipped unknown table "${table}".`);
      continue;
    }
    if (!Array.isArray(rows)) {
      errors.push(`Table "${table}" was not an array -- skipped.`);
      continue;
    }
    const validRows = rows.filter(isValidRow);
    const skipped = rows.length - validRows.length;
    if (validRows.length === 0) {
      summary[table] = { upserted: 0, skipped };
      continue;
    }
    const { error } = await supabaseAdmin.from(table).upsert(validRows, { onConflict: 'id' });
    if (error) {
      errors.push(`"${table}": ${error.message}`);
      summary[table] = { upserted: 0, skipped: rows.length };
      continue;
    }
    summary[table] = { upserted: validRows.length, skipped };
  }

  res.status(errors.length > 0 && Object.values(summary).every((s) => s.upserted === 0) ? 500 : 200).json({
    summary,
    errors,
  });
}