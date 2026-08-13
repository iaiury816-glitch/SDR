'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { IconeTelefone, IconePessoa } from '../components/icones';
import { BotaoLigar, ModalDescarte, StatusEAcoesLead } from '../components/AcoesLead';
import BotaoCopiar from '../components/BotaoCopiar';
import EditarTarefaForm from '../components/EditarTarefaForm';
import FormProximaTarefa from '../components/FormProximaTarefa';
import HistoricoModal from '../components/HistoricoModal';
import Cabecalho from '../components/Cabecalho';
import BarraCadencia from '../components/BarraCadencia';
import { formatarTelefoneExibicao, chamarAcao, mensagemErro } from '../lib/client';

export default function Home() {
  const [leads, setLeads] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [statsCounts, setStatsCounts] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');
  const [removendo, setRemovendo] = useState({});
  const [historicoLeadId, setHistoricoLeadId] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroGeral('');
    try {
      const r = await fetch('/api/hoje');
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setLeads(body.leads || []);
      setTarefas(body.tarefas || []);
      setStatsCounts(body.statsCounts || {});
    } catch (e) {
      setErroGeral('Não consegui carregar os dados. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function removerComAnimacao(id, tipo) {
    setRemovendo((r) => ({ ...r, [id]: true }));
    setTimeout(() => {
      if (tipo === 'lead') setLeads((ls) => ls.filter((l) => l.id !== id));
      else setTarefas((ts) => ts.filter((t) => t.tarefa_id !== id));
    }, 320);
  }

  function marcarTemLigacao(id, valor) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, tem_ligacao: valor } : l)));
    setTarefas((ts) => ts.map((t) => (t.lead_id === id ? { ...t, tem_ligacao: valor } : t)));
  }

  return (
    <div>
      <Cabecalho
        titulo="Painel SDR — Legare Gestão"
        sub={`Leads do dia · ${statsCounts.hoje || 0} pendências`}
        acoes={<button className="btn" onClick={carregar}>Atualizar</button>}
      />

      <div className="container">
        <Suspense fallback={null}>
          <BarraCadencia statsCounts={statsCounts} />
        </Suspense>

        {erroGeral ? <div className="aviso" style={{ marginBottom: 14 }}>{erroGeral}</div> : null}

        {carregando ? (
          <div className="loading">Carregando...</div>
        ) : (
          <div className="split">
            <div>
              <div className="col-titulo">Leads do dia ({leads.length})</div>
              {leads.length === 0 ? (
                <div className="empty">Nenhum lead pra contactar hoje.</div>
              ) : (
                leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    removendo={!!removendo[lead.id]}
                    onLigado={() => marcarTemLigacao(lead.id, true)}
                    onRemover={() => removerComAnimacao(lead.id, 'lead')}
                    onAbrirHistorico={() => setHistoricoLeadId(lead.id)}
                  />
                ))
              )}
            </div>
            <div>
              <div className="col-titulo">Follow ups do dia ({tarefas.length})</div>
              {tarefas.length === 0 ? (
                <div className="empty">Nenhuma tarefa de follow-up hoje.</div>
              ) : (
                tarefas.map((t) => (
                  <TarefaCard
                    key={t.tarefa_id}
                    t={t}
                    removendo={!!removendo[t.tarefa_id]}
                    onLigado={() => marcarTemLigacao(t.lead_id, true)}
                    onRemover={() => removerComAnimacao(t.tarefa_id, 'tarefa')}
                    onAbrirHistorico={() => setHistoricoLeadId(t.lead_id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {historicoLeadId ? (
        <HistoricoModal
          leadId={historicoLeadId}
          onClose={() => setHistoricoLeadId(null)}
          onLeadMudou={carregar}
        />
      ) : null}
    </div>
  );
}

function LeadCard({ lead, removendo, onLigado, onRemover, onAbrirHistorico }) {
  return (
    <div className="card" style={removendo ? { opacity: 0, transform: 'scale(.97)' } : undefined}>
      <button className="empresa-nome-link" onClick={onAbrirHistorico}>
        {lead.empresa}{lead.sem_whatsapp ? ' · Sem WhatsApp' : ''}
      </button>
      <div className="card-meta" style={{ marginTop: 6 }}>
        <div className="card-meta-item"><IconeTelefone /><span>{formatarTelefoneExibicao(lead.telefone)}</span><BotaoCopiar valor={lead.telefone} /></div>
        {lead.decisor ? <div className="card-meta-item"><IconePessoa /><span>{lead.decisor}</span></div> : null}
      </div>
      <StatusEAcoesLead lead={lead} onLigado={onLigado} onRemover={onRemover} ocultarNome />
    </div>
  );
}

function TarefaCard({ t, removendo, onLigado, onRemover, onAbrirHistorico }) {
  const [mostrarDescarte, setMostrarDescarte] = useState(false);
  const [editando, setEditando] = useState(false);
  const [concluida, setConcluida] = useState(false);
  const [texto, setTexto] = useState(t.tarefa_texto);
  const [ocupado, setOcupado] = useState(false);
  const semLigacao = !t.tem_ligacao;

  async function concluir() {
    setOcupado(true);
    try {
      await chamarAcao('concluir-tarefa', { tarefaId: t.tarefa_id, ignorarLigacao: true });
      if (t.negocio_id) {
        setOcupado(false);
        setConcluida(true);
      } else {
        onRemover();
      }
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui concluir a tarefa agora. Tenta de novo em alguns segundos.'));
    }
  }

  async function confirmarDescarte(motivo) {
    setMostrarDescarte(false);
    setOcupado(true);
    try {
      await chamarAcao('descartar', { id: t.lead_id, motivo, tarefaId: t.tarefa_id });
      onRemover();
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui descartar o lead agora. Tenta de novo em alguns segundos.'));
    }
  }

  return (
    <div className="card" style={removendo ? { opacity: 0, transform: 'scale(.97)' } : undefined}>
      <div className="card-top-row">
        <button className="empresa-nome-link" onClick={onAbrirHistorico}>
          {t.empresa}{t.sem_whatsapp ? ' · Sem WhatsApp' : ''}
        </button>
        <span className="status-badge">{t.etapa}</span>
      </div>
      <div className="card-meta">
        <div className="card-meta-item"><IconeTelefone /><span>{formatarTelefoneExibicao(t.telefone)}</span><BotaoCopiar valor={t.telefone} /></div>
        {t.decisor ? <div className="card-meta-item"><IconePessoa /><span>{t.decisor}</span></div> : null}
      </div>

      {concluida ? (
        <FormProximaTarefa
          negocioId={t.negocio_id}
          etapaAtual={t.etapa}
          empresa={t.empresa}
          decisor={t.decisor}
          telefone={t.telefone}
          onCriado={onRemover}
          onPular={onRemover}
        />
      ) : editando ? (
        <EditarTarefaForm
          tarefaId={t.tarefa_id}
          textoAtual={texto}
          quandoAtual={t.quando}
          onSalvo={(novoTexto) => { setTexto(novoTexto); setEditando(false); }}
          onCancelar={() => setEditando(false)}
        />
      ) : (
        <>
          <div className="field">
            <div className="field-label">O que fazer</div>
            <div className="field-value">{texto}</div>
          </div>
          {semLigacao ? <div className="aviso">Liga pro lead antes de Descartar.</div> : null}
          <div className="actions">
            {t.telefone ? <BotaoLigar id={t.lead_id} onLigado={onLigado} /> : null}
            <button className="btn btn-secondary" onClick={() => setEditando(true)} disabled={ocupado}>Editar</button>
            <button className="btn btn-secondary" onClick={concluir} disabled={ocupado}>Marcar concluída</button>
            <button className="btn btn-danger" onClick={() => setMostrarDescarte(true)} disabled={ocupado || semLigacao}>Descartar</button>
          </div>
        </>
      )}

      {mostrarDescarte ? (
        <ModalDescarte
          empresa={t.empresa}
          onCancelar={() => setMostrarDescarte(false)}
          onConfirmar={confirmarDescarte}
        />
      ) : null}
    </div>
  );
}
