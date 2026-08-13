import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Banner "WhatsApp fora do ar" — pausa manual do avanço de cadência (public.app_config).
// Só tem toggle pra DESLIGAR aqui de propósito, espelhando o artefato original: pra pausar de
// novo no futuro, é só pedir (evita um botão de "pausar" visível o tempo todo por engano).

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb
      .from('app_config')
      .select('pausar_avanco_cadencia')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: true, pausado: !!(data && data.pausar_avanco_cadencia) });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Requisição inválida' }, { status: 400 });
  }
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.rpc('definir_pausa_cadencia', { p_pausar: !!body.pausar });
    if (error) throw error;
    return NextResponse.json({ ok: true, resultado: data });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
