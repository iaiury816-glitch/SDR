import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req, { params }) {
  const { id } = params;
  if (typeof id !== 'string' || !UUID_RE.test(id)) {
    return NextResponse.json({ ok: false, erro: 'Id inválido' }, { status: 400 });
  }

  try {
    const sb = supabaseAdmin();
    const [{ data: lead, error: e1 }, { data: itens, error: e2 }] = await Promise.all([
      sb.rpc('lead_detalhe', { p_lead_id: id }),
      sb.rpc('historico_lead', { p_lead_id: id }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (!lead) {
      return NextResponse.json({ ok: false, erro: 'Lead não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, lead, itens: itens || [] });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
