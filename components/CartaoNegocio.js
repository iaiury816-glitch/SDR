'use client';

import { useState } from 'react';
import { IconeTelefone, IconePessoa } from './icones';
import { BotaoLigar } from './AcoesLead';
import { chamarAcao, mensagemErro, formatarTelefoneExibicao, formatarDataHora, ETAPAS_FUNIL } from '../lib/client';

export default function CartaoNegocio({ negocio, onMudou, onAbrirHistorico, arrastavel }) {
  const [mostrarForm, setMostrarForm] = useState(false);
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
        <div className="card-meta-item"><IconeTelefone /><span>{formatarTelefoneExibicao(negocio.telefone)}</span></div>
        {negocio.decisor ? <div className="card-meta-item"><IconePessoa /><span>{negocio.decisor}</span></div> : null}
      </div>

      {mostrarForm ? (
        <FormTarefaKanban
          negocio={negocio}
          onCancelar={() => setMostrarForm(false)}
          onCriado={() => { setMostrarForm(false); onMudou(); }}
        />
      ) : negocio.proxima_tarefa ? (
        <div className="field">
          <div className="field-label">Próxima tarefa</div>
          <div className="field-value">{negocio.proxima_tarefa.texto}</div>
          {negocio.proxima_tarefa.quando ? (
            <div className="field-label">{formatarDataHora(negocio.proxima_tarefa.quando)}</div>
          ) : null}
          <div className="actions" style={{ marginTop: 8 }}>
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

function FormTarefaKanban({ negocio, onCancelar, onCriado }) {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [data, setData] = useState(amanha.toISOString().slice(0, 10));
  const [hora, setHora] = useState('09:00');
  const [texto, setTexto] = useState('Retomar contato');
  const [etapa, setEtapa] = useState(negocio.etapa);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    const quando = data && hora ? `${data}T${hora}:00-03:00` : null;
    try {
      if (etapa !== negocio.etapa) {
        await chamarAcao('mover-etapa', { negocioId: negocio.negocio_id, etapa });
      }
      await chamarAcao('criar-tarefa', { negocioId: negocio.negocio_id, texto, quando });
      onCriado();
    } catch (e) {
      setEnviando(false);
      window.alert(mensagemErro(e, 'Não consegui criar a tarefa agora. Tenta de novo em alguns segundos.'));
    }
  }

  return (
    <div className="field">
      <div className="field-label">Etapa do funil</div>
      <select className="agendor-input" value={etapa} onChange={(e) => setEtapa(e.target.value)} style={{ marginBottom: 8 }}>
        {ETAPAS_FUNIL.map((et) => <option key={et} value={et}>{et}</option>)}
      </select>
      <div className="field-label">Quando retomar o contato</div>
      <div className="agendor-form-row">
        <input type="date" className="agendor-input" value={data} onChange={(e) => setData(e.target.value)} />
        <input type="time" className="agendor-input" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <textarea className="agendor-textarea" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn btn-agendor" onClick={confirmar} disabled={enviando}>{enviando ? 'Criando...' : 'Criar tarefa'}</button>
        <button className="btn" onClick={onCancelar} disabled={enviando}>Concluir sem agendar</button>
      </div>
    </div>
  );
}
