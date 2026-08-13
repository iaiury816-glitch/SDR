import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { limitesMesAtualFortaleza, hojeFortalezaYmd } from '../../../lib/tiers';

// Converte o período escolhido nas pills (?tipo=tudo|hoje|dias|custom) nos limites de data que
// public.metricas_funil(p_inicio, p_fim) espera. "hoje"/"custom" tratam a(s) data(s) como dia
// cheio (00:00 a 23:59:59) no fuso America/Fortaleza - mesmo comportamento do artefato original.
function limitesPeriodo(searchParams) {
  const tipo = searchParams.get('tipo') || 'tudo';
  if (tipo === 'hoje') {
    const hoje = hojeFortalezaYmd();
    return { inicio: `${hoje}T00:00:00-03:00`, fim: `${hoje}T23:59:59-03:00` };
  }
  if (tipo === 'dias') {
    const dias = Number(searchParams.get('dias') || 0);
    const inicio = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
    return { inicio, fim: null };
  }
  if (tipo === 'custom') {
    const inicio = searchParams.get('inicio');
    const fim = searchParams.get('fim');
    if (!inicio || !fim) return { inicio: null, fim: null };
    return { inicio: `${inicio}T00:00:00-03:00`, fim: `${fim}T23:59:59-03:00` };
  }
  return { inicio: null, fim: null };
}

export async function GET(req) {
  try {
    const sb = supabaseAdmin();
    const { searchParams } = new URL(req.url);
    const { inicio, fim } = limitesPeriodo(searchParams);
    const mesInfo = limitesMesAtualFortaleza();
    const primeiroDiaMes = `${mesInfo.ano}-${String(mesInfo.mes).padStart(2, '0')}-01`;
    const hoje = hojeFortalezaYmd();

    const [{ data: m, error: e1 }, { data: mMes, error: e2 }, { data: sync, error: e3 }, { data: historicoTierDia, error: e4 }] = await Promise.all([
      sb.rpc('metricas_funil', { p_inicio: inicio, p_fim: fim }),
      sb.rpc('metricas_funil', { p_inicio: mesInfo.inicio, p_fim: mesInfo.fim }),
      sb.rpc('ultima_sincronizacao_ligacoes'),
      sb
        .from('tier_dia_historico')
        .select('data, percentual, concluidas, total, reunioes_dia, tier_idx, tier_nome')
        .gte('data', primeiroDiaMes)
        .lt('data', hoje)
        .order('data', { ascending: true }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    if (e4) throw e4;

    return NextResponse.json({
      ok: true,
      m: m || {},
      mMes: mMes || {},
      sync: sync || {},
      mesInfo,
      historicoTierDia: historicoTierDia || [],
    });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
