import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';
import { criarEventoCalendario } from '../../../lib/calendario';
import { registrarInteracaoPainel, iniciarLigacaoPainel } from '../../../lib/controleFoco';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_RE.test(id);
}

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
    if (acao === 'enviado') {
      const { id } = body;
      if (!isValidUuid(id)) return erroInput();
      const { data, error } = await sb.rpc('marcar_enviado', { p_lead_id: id });
      if (error) throw error;
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'sem-whatsapp') {
      const { id } = body;
      if (!isValidUuid(id)) return erroInput();
      const { data, error } = await sb.rpc('marcar_sem_whatsapp', { p_id: id });
      if (error) throw error;
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'descartar') {
      const { id, motivo, tarefaId } = body;
      if (!isValidUuid(id) || !motivo) return erroInput();
      const { data, error } = await sb.rpc('descartar_lead', {
        p_lead_id: id,
        p_motivo: motivo,
        p_tarefa_id: isValidUuid(tarefaId) ? tarefaId : null,
      });
      if (error) throw error;
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'ligar') {
      const { id } = body;
      if (!isValidUuid(id)) return erroInput();
      const { data, error } = await sb.rpc('ligar_api4com', { p_lead_id: id });
      if (error) throw error;
      // Uma ligação de verdade pode passar dos 5min sem nenhum clique no painel — entra no
      // estado 'ligacao' (não acumula ociosidade) em vez de só registrar uma interação pontual.
      await iniciarLigacaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'negocio') {
      const { id, texto, quando, empresa, decisor, telefone } = body;
      if (!isValidUuid(id)) return erroInput();
      const { data, error } = await sb.rpc('criar_negocio', {
        p_lead_id: id,
        p_tarefa_texto: texto || null,
        p_tarefa_quando: quando || null,
      });
      if (error) throw error;
      if (quando) await criarEventoCalendario({ empresa, decisor, telefone, texto, quando });
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'concluir-tarefa') {
      const { tarefaId, ignorarLigacao } = body;
      if (!isValidUuid(tarefaId)) return erroInput();
      const { data, error } = await sb.rpc('concluir_tarefa', {
        p_tarefa_id: tarefaId,
        p_ignorar_ligacao: !!ignorarLigacao,
      });
      if (error) throw error;
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'mover-etapa') {
      const { negocioId, etapa } = body;
      if (!isValidUuid(negocioId) || !etapa) return erroInput();
      const { data, error } = await sb.rpc('definir_etapa_negocio', {
        p_negocio_id: negocioId,
        p_etapa: etapa,
      });
      if (error) throw error;
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'editar-tarefa') {
      const { tarefaId, texto, quando } = body;
      if (!isValidUuid(tarefaId) || !quando) return erroInput();
      const { data, error } = await sb.rpc('editar_tarefa', {
        p_tarefa_id: tarefaId,
        p_texto: texto || null,
        p_quando: quando,
      });
      if (error) throw error;
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    if (acao === 'criar-tarefa') {
      const { negocioId, texto, quando, empresa, decisor, telefone } = body;
      if (!isValidUuid(negocioId)) return erroInput();
      const { data, error } = await sb.rpc('criar_tarefa', {
        p_negocio_id: negocioId,
        p_texto: texto || null,
        p_quando: quando || null,
      });
      if (error) throw error;
      if (quando) await criarEventoCalendario({ empresa, decisor, telefone, texto, quando });
      await registrarInteracaoPainel();
      return NextResponse.json({ ok: true, resultado: data });
    }

    return NextResponse.json({ ok: false, erro: 'Ação desconhecida' }, { status: 400 });
  } catch (e) {
    const msg = String((e && e.message) || e);
    const status = msg.includes('SEM_LIGACAO') ? 409 : 500;
    return NextResponse.json({ ok: false, erro: msg }, { status });
  }
}

function erroInput() {
  return NextResponse.json({ ok: false, erro: 'Parâmetros inválidos' }, { status: 400 });
}
