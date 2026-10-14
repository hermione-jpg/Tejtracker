import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, hasSupabaseConfig } from './_lib/supabaseAdmin';
import { checkAuth, isAllowedTable } from './_lib/auth';

// Very light shape validation -- enough to reject garbage before it ever
// reaches the database, without being a full schema validator.
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
  if (!hasSupabaseConfig()) {
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
    // Upsert on primary key (id) -- importing the same export twice never
    // creates duplicates, it just re-writes the same rows.
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
