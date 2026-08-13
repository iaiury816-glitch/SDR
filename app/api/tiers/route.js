import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { estaDisponivelHoje } from '../../../lib/disponibilidade';
import { limitesMesAtualFortaleza } from '../../../lib/tiers';

// Alimenta os badges fixos do header (Tier do dia / Tier do mês) e a tela /inicio. Tier do dia
// ainda não considera penalidade por ociosidade (ver nota em lib/tiers.js e tier_dia_ao_vivo()).
export async function GET() {
  try {
    const sb = supabaseAdmin();
    const mesInfo = limitesMesAtualFortaleza();

    const [{ data: dados, error: e1 }, { data: tarefas, error: e2 }, { data: aoVivo, error: e3 }, { data: mMes, error: e4 }] = await Promise.all([
      sb.rpc('dados_leads_do_dia'),
      sb.rpc('listar_tarefas_hoje'),
      sb.rpc('tier_dia_ao_vivo'),
      sb.rpc('metricas_funil', { p_inicio: mesInfo.inicio, p_fim: mesInfo.fim }),
    ]);
    if (e1) throw e1;
    if (e2) throw e2;
    if (e3) throw e3;
    if (e4) throw e4;

    const prontos = (dados && dados.prontos) || [];
    const aguardandoCandidatos = (dados && dados.aguardando) || [];
    const aguardandoHoje = aguardandoCandidatos.filter(estaDisponivelHoje);

    const leadsPendentesHoje = prontos.length + aguardandoHoje.length;
    const tarefasPendentesHoje = (tarefas || []).length;
    const leadsConcluidosHoje = Number((aoVivo && aoVivo.leads_concluidos_hoje) || 0);
    const tarefasConcluidasHoje = Number((aoVivo && aoVivo.tarefas_concluidas_hoje) || 0);
    const reunioesHoje = Number((aoVivo && aoVivo.reunioes_hoje) || 0);

    const concluidas = leadsConcluidosHoje + tarefasConcluidasHoje;
    const total = concluidas + leadsPendentesHoje + tarefasPendentesHoje;
    const percentual = total > 0 ? (concluidas / total) * 100 : 0;

    return NextResponse.json({
      ok: true,
      dia: { percentual, concluidas, total, reunioesHoje },
      mMes: mMes || {},
      mesInfo,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
