import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set');
}

/** Server-side client using the secret key — bypasses RLS, never sent to the browser */
export const db = createClient(url, key, {
  auth: { persistSession: false },
});
