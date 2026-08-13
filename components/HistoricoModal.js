'use client';

import { useEffect, useState, useCallback } from 'react';
import { IconeTelefone, IconePessoa } from './icones';
import { StatusEAcoesLead } from './AcoesLead';
import BotaoCopiar from './BotaoCopiar';
import EditarTarefaForm from './EditarTarefaForm';
import FormProximaTarefa from './FormProximaTarefa';
import { chamarAcao, mensagemErro, formatarTelefoneExibicao, formatarDuracao, formatarDataHora } from '../lib/client';

// Modal de histórico: clicar no nome da empresa em qualquer lugar do painel
// abre a linha do tempo daquele lead (mensagens/ligações/tarefas), com os
// mesmos botões de ação do card (Ligar/Enviado/Avançar/Sem WhatsApp/Descartar).
export default function HistoricoModal({ leadId, onClose, onLeadMudou }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [lead, setLead] = useState(null);
  const [itens, setItens] = useState([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const r = await fetch(`/api/historico/${leadId}`);
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setLead(body.lead);
      setItens(body.itens || []);
    } catch (e) {
      setErro('Não consegui carregar o histórico. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, [leadId]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    function aoTeclar(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [onClose]);

  function marcarLigado() {
    setLead((l) => (l ? { ...l, tem_ligacao: true } : l));
  }

  function aoMudarAlgo() {
    // Recarrega o histórico (novo item na timeline, negócio criado, etc.)
    // e avisa a lista de fundo pra também atualizar.
    carregar();
    onLeadMudou && onLeadMudou();
  }

  return (
    <div className="modal-fundo aberto" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-caixa historico-caixa">
        <div className="historico-topo">
          <div className="field-label">Histórico do lead</div>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>

        {carregando ? (
          <div className="loading">Carregando...</div>
        ) : erro ? (
          <div className="aviso">{erro}</div>
        ) : !lead ? (
          <div className="empty">Lead não encontrado.</div>
        ) : (
          <div data-lead-id={lead.id}>
            <StatusEAcoesLead
              lead={lead}
              onLigado={marcarLigado}
              onRemover={aoMudarAlgo}
              onNegocioCriado={aoMudarAlgo}
            />

            <div className="card-meta" style={{ marginTop: 10 }}>
              <div className="card-meta-item"><IconeTelefone /><span>{formatarTelefoneExibicao(lead.telefone)}</span><BotaoCopiar valor={lead.telefone} /></div>
              {lead.decisor ? <div className="card-meta-item"><IconePessoa /><span>{lead.decisor}</span></div> : null}
            </div>

            <div className="field-label" style={{ marginTop: 18, marginBottom: 8 }}>Linha do tempo</div>
            {itens.length === 0 ? (
              <div className="empty">Nenhum evento registrado ainda.</div>
            ) : (
              <div className="historico-timeline">
                {itens.map((item, i) => (
                  <ItemTimeline
                    key={i}
                    item={item}
                    lead={lead}
                    onConcluido={aoMudarAlgo}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ItemTimeline({ item, lead, onConcluido }) {
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [concluida, setConcluida] = useState(false);

  async function concluir() {
    setOcupado(true);
    try {
      await chamarAcao('concluir-tarefa', { tarefaId: item.tarefa_id });
      if (item.negocio_id) {
        setOcupado(false);
        setConcluida(true);
      } else {
        onConcluido();
      }
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui concluir a tarefa agora. Tenta de novo em alguns segundos.'));
    }
  }

  if (item.tipo === 'mensagem') {
    return (
      <div className="historico-item">
        <div className="historico-item-topo">
          <span className="status-badge">Mensagem{item.etapa_dia != null ? ` · Dia ${item.etapa_dia}` : ''}</span>
          <span className="field-label">{formatarDataHora(item.data)}</span>
        </div>
        <div className="mensagem">{item.texto}</div>
      </div>
    );
  }

  if (item.tipo === 'ligacao') {
    const atendida = item.texto === 'Ligação atendida';
    return (
      <div className="historico-item">
        <div className="historico-item-topo">
          <span className={`status-badge ${atendida ? 'status-pronto' : 'status-descartado'}`}>{item.texto}</span>
          <span className="field-label">{formatarDataHora(item.data)}</span>
        </div>
        {atendida && item.gravacao_url ? (
          <div className="field-value">
            <a href={item.gravacao_url} target="_blank" rel="noreferrer">Ouvir gravação ({formatarDuracao(item.duracao_segundos)})</a>
          </div>
        ) : !atendida && item.motivo_encerramento ? (
          <div className="field-value">Motivo: {item.motivo_encerramento}</div>
        ) : null}
        {item.resumo_status === 'concluido' && item.resumo_ia ? (
          <div className="historico-resumo">{item.resumo_ia}</div>
        ) : item.resumo_status === 'processando' ? (
          <div className="historico-resumo-aguardando">Gerando resumo da ligação...</div>
        ) : item.resumo_status === 'pendente' && (item.duracao_segundos || 0) >= 15 ? (
          <div className="historico-resumo-aguardando">Resumo da ligação na fila...</div>
        ) : item.resumo_status === 'erro' ? (
          <div className="historico-resumo-erro">Não consegui gerar o resumo dessa ligação.</div>
        ) : null}
      </div>
    );
  }

  // tarefa
  if (concluida) {
    return (
      <div className="historico-item">
        <div className="historico-item-topo">
          <span className="status-badge status-pronto">Tarefa concluída</span>
        </div>
        <FormProximaTarefa
          negocioId={item.negocio_id}
          etapaAtual={lead.negocio_etapa}
          empresa={lead.empresa}
          decisor={lead.decisor}
          telefone={lead.telefone}
          onCriado={onConcluido}
          onPular={onConcluido}
        />
      </div>
    );
  }

  return (
    <div className="historico-item">
      <div className="historico-item-topo">
        <span className={`status-badge ${item.concluida ? 'status-pronto' : 'status-aguardando'}`}>
          {item.concluida ? 'Tarefa concluída' : 'Tarefa pendente'}
        </span>
        <span className="field-label">{formatarDataHora(item.data)}</span>
      </div>
      {editando ? (
        <EditarTarefaForm
          tarefaId={item.tarefa_id}
          textoAtual={item.texto}
          quandoAtual={item.data}
          onSalvo={onConcluido}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <div className="field-value">{item.texto}</div>
          {!item.concluida && item.tarefa_id ? (
            <div className="actions" style={{ marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setEditando(true)} disabled={ocupado}>Editar</button>
              <button className="btn btn-secondary" onClick={concluir} disabled={ocupado || !lead.tem_ligacao}>
                Marcar concluída
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
