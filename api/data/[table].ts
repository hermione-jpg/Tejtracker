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

const RESERVED_PARAMS = new Set(['order', 'ascending', 'limit']);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!checkAuth(req, res)) return;
  const supabaseAdmin = getAdmin();
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Server misconfigured: Supabase env vars are missing.' });
    return;
  }

  const tableParam = req.query.table;
  const table = Array.isArray(tableParam) ? tableParam[0] : tableParam;
  if (!table || !isAllowedTable(table)) {
    res.status(400).json({ error: `Unknown or disallowed table: ${table}` });
    return;
  }

  try {
    if (req.method === 'GET') {
      let query = supabaseAdmin.from(table).select('*');
      for (const [key, value] of Object.entries(req.query)) {
        if (key === 'table' || RESERVED_PARAMS.has(key)) continue;
        if (typeof value === 'string') {
          if (value.startsWith('gte.')) query = query.gte(key, value.slice(4));
          else if (value.startsWith('lte.')) query = query.lte(key, value.slice(4));
          else if (value.startsWith('neq.')) query = query.neq(key, value.slice(4));
          else query = query.eq(key, value);
        }
      }
      const order = typeof req.query.order === 'string' ? req.query.order : 'created_at';
      const ascending = req.query.ascending === 'true';
      query = query.order(order, { ascending });
      if (typeof req.query.limit === 'string') {
        query = query.limit(Number(req.query.limit));
      }
      const { data, error } = await query;
      if (error) throw error;
      res.status(200).json({ data });
      return;
    }

    if (req.method === 'POST') {
      const payload = req.body;
      const { data, error } = await supabaseAdmin.from(table).insert(payload).select();
      if (error) throw error;
      res.status(201).json({ data });
      return;
    }

    if (req.method === 'PATCH') {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      if (!id) {
        res.status(400).json({ error: 'Missing ?id=' });
        return;
      }
      const { data, error } = await supabaseAdmin.from(table).update(req.body).eq('id', id).select();
      if (error) throw error;
      res.status(200).json({ data });
      return;
    }

    if (req.method === 'DELETE') {
      const id = typeof req.query.id === 'string' ? req.query.id : undefined;
      if (!id) {
        res.status(400).json({ error: 'Missing ?id=' });
        return;
      }
      const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
      if (error) throw error;
      res.status(204).end();
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error(`[api/data/${table}]`, err);
    res.status(500).json({ error: err?.message ?? 'Unknown server error' });
  }
}