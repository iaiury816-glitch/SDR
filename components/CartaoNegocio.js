'use client';

import { useState } from 'react';
import { IconeTelefone, IconePessoa } from './icones';
import { BotaoLigar } from './AcoesLead';
import BotaoCopiar from './BotaoCopiar';
import EditarTarefaForm from './EditarTarefaForm';
import FormProximaTarefa from './FormProximaTarefa';
import { chamarAcao, mensagemErro, formatarTelefoneExibicao, formatarDataHora, ETAPAS_FUNIL } from '../lib/client';

export default function CartaoNegocio({ negocio, onMudou, onAbrirHistorico, arrastavel }) {
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editando, setEditando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const idx = ETAPAS_FUNIL.indexOf(negocio.etapa);

  async function mover(direcao) {
    const novoIdx = idx + direcao;
    if (novoIdx < 0 || novoIdx >= ETAPAS_FUNIL.length) return;
    setOcupado(true);
    try {
      await chamarAcao('mover-etapa', { negocioId: negocio.negocio_id, etapa: ETAPAS_FUNIL[novoIdx] });
      onMudou();
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui mover o negócio agora. Tenta de novo em alguns segundos.'));
    }
  }

  async function concluirTarefa() {
    setOcupado(true);
    try {
      await chamarAcao('concluir-tarefa', { tarefaId: negocio.proxima_tarefa.id });
      setOcupado(false);
      setMostrarForm(true);
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui concluir a tarefa agora. Tenta de novo em alguns segundos.'));
    }
  }

  function aoArrastar(e) {
    if (!arrastavel) return;
    e.dataTransfer.setData('text/plain', negocio.negocio_id);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div className="card kanban-card" draggable={arrastavel} onDragStart={aoArrastar}>
      <button className="empresa-nome-link" onClick={() => onAbrirHistorico(negocio.lead_id)}>
        {negocio.empresa}{negocio.sem_whatsapp ? ' · Sem WhatsApp' : ''}
      </button>
      <div className="card-meta" style={{ marginTop: 6 }}>
        <div className="card-meta-item"><IconeTelefone /><span>{formatarTelefoneExibicao(negocio.telefone)}</span><BotaoCopiar valor={negocio.telefone} /></div>
        {negocio.decisor ? <div className="card-meta-item"><IconePessoa /><span>{negocio.decisor}</span></div> : null}
      </div>

      {mostrarForm ? (
        <FormProximaTarefa
          negocioId={negocio.negocio_id}
          etapaAtual={negocio.etapa}
          empresa={negocio.empresa}
          decisor={negocio.decisor}
          telefone={negocio.telefone}
          onCriado={() => { setMostrarForm(false); onMudou(); }}
          onPular={() => { setMostrarForm(false); onMudou(); }}
        />
      ) : editando && negocio.proxima_tarefa ? (
        <EditarTarefaForm
          tarefaId={negocio.proxima_tarefa.id}
          textoAtual={negocio.proxima_tarefa.texto}
          quandoAtual={negocio.proxima_tarefa.quando}
          onSalvo={() => { setEditando(false); onMudou(); }}
          onCancelar={() => setEditando(false)}
        />
      ) : negocio.proxima_tarefa ? (
        <div className="field">
          <div className="field-label">Próxima tarefa</div>
          <div className="field-value">{negocio.proxima_tarefa.texto}</div>
          {negocio.proxima_tarefa.quando ? (
            <div className="field-label">{formatarDataHora(negocio.proxima_tarefa.quando)}</div>
          ) : null}
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={() => setEditando(true)} disabled={ocupado}>Editar</button>
            <button className="btn btn-secondary" onClick={concluirTarefa} disabled={ocupado || !negocio.tem_ligacao}>
              Concluir
            </button>
          </div>
        </div>
      ) : (
        <div className="actions" style={{ marginTop: 8 }}>
          <button className="btn btn-agendor" onClick={() => setMostrarForm(true)} disabled={ocupado}>+ Tarefa</button>
        </div>
      )}

      <div className="actions" style={{ marginTop: 8 }}>
        <BotaoLigar id={negocio.lead_id} onLigado={onMudou} />
        <button className="btn" onClick={() => mover(-1)} disabled={ocupado || idx <= 0}>← Etapa</button>
        <button className="btn" onClick={() => mover(1)} disabled={ocupado || idx >= ETAPAS_FUNIL.length - 1}>Etapa →</button>
      </div>
    </div>
  );
}
