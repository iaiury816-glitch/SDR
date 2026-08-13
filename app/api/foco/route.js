import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// "Controle de foco": widget do header que mostra pausa/reunião/ligação e a penalidade de
// ociosidade do dia. Toda a lógica de estado já mora no Supabase (public.painel_atividade +
// RPCs) — este endpoint só chama a RPC certa e devolve o jsonb pronto.

export async function GET() {
  try {
    const sb = supabaseAdmin();
    const { data, error } = await sb.rpc('checar_penalidade_painel');
    if (error) throw error;
    return NextResponse.json({ ok: true, foco: data });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}

const RPC_POR_ACAO = {
  pausa: 'iniciar_pausa_painel',
  'pausa-rapida': 'iniciar_pausa_rapida_painel',
  'voltar-pausa-rapida': 'voltar_pausa_rapida_painel',
  reuniao: 'iniciar_reuniao_painel',
  'sair-reuniao': 'sair_reuniao_painel',
  'terminar-ligacao': 'terminar_ligacao_painel',
};

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: 'Requisição inválida' }, { status: 400 });
  }

  const { acao } = body || {};
  const sb = supabaseAdmin();

  try {
    if (acao === 'recorrer') {
      const { motivo, quantidade } = body;
      if (!motivo || !String(motivo).trim()) {
        return NextResponse.json({ ok: false, erro: 'Escreve o motivo antes de enviar.' }, { status: 400 });
      }
      const { data, error } = await sb.rpc('recorrer_penalidade_painel', {
        p_motivo: motivo,
        p_quantidade: Number(quantidade) || 1,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true, resultado: data });
    }

    const rpcNome = RPC_POR_ACAO[acao];
    if (!rpcNome) return NextResponse.json({ ok: false, erro: 'Ação desconhecida' }, { status: 400 });

    const { data, error } = await sb.rpc(rpcNome);
    if (error) throw error;
    return NextResponse.json({ ok: true, resultado: data });
  } catch (e) {
    return NextResponse.json({ ok: false, erro: String((e && e.message) || e) }, { status: 500 });
  }
}
