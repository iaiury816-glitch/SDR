import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// "Buscar leads": dispara o workflow n8n "SDR - Sourcing completo" (Google Maps via Apify)
// direto do painel, via public.disparar_sourcing() — que já cuida do round-robin de área e
// grava o histórico em public.sourcing_disparos (sucesso ou falha).

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.rpc('ultimo_disparo_sourcing');
    if (error) throw error;
    return NextResponse.json({ ok: true, ultimo: data || null });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}

export async function POST() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.rpc('disparar_sourcing');
    if (error) throw error;
    return NextResponse.json({ ok: true, resultado: data });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
