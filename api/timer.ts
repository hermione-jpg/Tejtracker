import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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