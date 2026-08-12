import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const GAP_DIAS = { 3: 2, 5: 2, 7: 2, 10: 3 };
const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

function diaCalendarioMs(dataIso) {
  const localMs = new Date(dataIso).getTime() + TZ_OFFSET_MS;
  const d = new Date(localMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function ehFimDeSemanaMs(diaMs) {
  const diaSemana = new Date(diaMs).getUTCDay();
  return diaSemana === 0 || diaSemana === 6;
}

function diasUteisDiff(inicioMs, fimMs) {
  let count = 0;
  for (let cursor = inicioMs + 86400000; cursor <= fimMs; cursor += 86400000) {
    if (!ehFimDeSemanaMs(cursor)) count++;
  }
  return count;
}

function estaDisponivelHoje(lead) {
  if (!lead.data_ultimo_contato || !GAP_DIAS[lead.etapa_dia]) return false;
  const diaContatoMs = diaCalendarioMs(lead.data_ultimo_contato);
  const hojeMs = diaCalendarioMs(new Date().toISOString());
  const diasUteisPassados = diasUteisDiff(diaContatoMs, hojeMs);
  return diasUteisPassados >= GAP_DIAS[lead.etapa_dia];
}

export async function GET() {
  try {
    const sb = supabaseAdmin();

    const [{ data: dados, error: e1 }, { data: tarefas, error: e2 }] = await Promise.all([
      sb.rpc('dados_leads_do_dia'),
      sb.rpc('listar_tarefas_hoje'),
    ]);

    if (e1) throw e1;
    if (e2) throw e2;

    const prontos = (dados && dados.prontos) || [];
    const aguardandoCandidatos = (dados && dados.aguardando) || [];
    const contagem = (dados && dados.contagem) || [];

    const aguardandoHoje = aguardandoCandidatos.filter(estaDisponivelHoje);
    const leads = [...aguardandoHoje, ...prontos];

    const statsCounts = {};
    contagem.forEach((c) => { statsCounts[c.chave] = Number(c.total); });
    statsCounts.hoje = leads.length + (tarefas || []).length;

    return NextResponse.json({ ok: true, leads, tarefas: tarefas || [], statsCounts });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
