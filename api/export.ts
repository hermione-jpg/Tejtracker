import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, hasSupabaseConfig } from './_lib/supabaseAdmin';
import { checkAuth, ALLOWED_TABLES } from './_lib/auth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req, res)) return;
  if (!hasSupabaseConfig()) {
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
