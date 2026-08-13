import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.rpc('listar_negocios_kanban');
    if (error) throw error;
    return NextResponse.json({ ok: true, negocios: data || [] });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
