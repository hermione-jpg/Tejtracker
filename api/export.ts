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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req, res)) return;
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Server misconfigured: Supabase env vars are missing.' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const result: Record<string, unknown[]> = {};
    for (const table of ALLOWED_TABLES) {
      const { data, error } = await supabaseAdmin.from(table).select('*');
      if (error) throw error;
      result[table] = data ?? [];
    }
    res.status(200).json({
      exported_at: new Date().toISOString(),
      version: 1,
      tables: result,
    });
  } catch (err: any) {
    console.error('[api/export]', err);
    res.status(500).json({ error: err?.message ?? 'Unknown server error' });
  }
}