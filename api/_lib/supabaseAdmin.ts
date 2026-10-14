import { createClient } from '@supabase/supabase-js';

// These two env vars must NOT be prefixed with VITE_ -- that prefix is what
// tells Vite to inline a value into the browser bundle. Keeping them
// unprefixed means they only ever exist on the server, inside these
// serverless functions.
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Thrown at request time (not import time in most bundlers), which is
  // why every handler also does its own explicit check and returns a
  // clear 500 instead of a confusing crash.
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
}

export const supabaseAdmin = createClient(url ?? '', serviceKey ?? '', {
  auth: { persistSession: false },
});

export function hasSupabaseConfig(): boolean {
  return Boolean(url && serviceKey);
}
