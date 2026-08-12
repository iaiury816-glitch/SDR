import { createClient } from '@supabase/supabase-js';

let client;

export function supabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY não configuradas nas variáveis de ambiente.');
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
