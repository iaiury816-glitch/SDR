import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { estaDisponivelHoje } from '../../../lib/disponibilidade';

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
