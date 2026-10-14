import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin, hasSupabaseConfig } from './_lib/supabaseAdmin';
import { checkAuth } from './_lib/auth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req, res)) return;
  if (!hasSupabaseConfig()) {
    res.status(500).json({ error: 'Server misconfigured: Supabase env vars are missing.' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabaseAdmin.from('timer_state').select('*').eq('id', 1).single();
      if (error) throw error;
      res.status(200).json({ data });
      return;
    }

    if (req.method === 'PATCH') {
      const { data, error } = await supabaseAdmin
        .from('timer_state')
        .update({ ...req.body, updated_at: new Date().toISOString() })
        .eq('id', 1)
        .select()
        .single();
      if (error) throw error;
      res.status(200).json({ data });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/timer]', err);
    res.status(500).json({ error: err?.message ?? 'Unknown server error' });
  }
}
