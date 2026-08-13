'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { IconeTelefone, IconePessoa } from '../../components/icones';
import { StatusEAcoesLead } from '../../components/AcoesLead';
import HistoricoModal from '../../components/HistoricoModal';
import Cabecalho from '../../components/Cabecalho';
import BarraCadencia from '../../components/BarraCadencia';
import { formatarTelefoneExibicao } from '../../lib/client';

const FILTROS_STATUS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'ativos', label: 'Ativos' },
  { valor: 'descartados', label: 'Descartados' },
];

const LABEL_ETAPA = { '1': 'Dia 1', '3': 'Dia 03', '5': 'Dia 05', '7': 'Dia 07', '10': 'Dia 10' };

export default function TodosOsLeadsPagina() {
  return (
    <Suspense fallback={<div className="loading">Carregando...</div>}>
      <TodosOsLeads />
    </Suspense>
  );
}

function TodosOsLeads() {
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');
  const [historicoLeadId, setHistoricoLeadId] = useState(null);
  const [statusFiltro, setStatusFiltro] = useState(() => searchParams.get('status') || 'todos');
  const [etapaFiltro, setEtapaFiltro] = useState(() => searchParams.get('etapa') || '');
  const [ordenacao, setOrdenacao] = useState('empresa'); // 'empresa' | 'recente'

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroGeral('');
    try {
      const r = await fetch('/api/todos');
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setLeads(body.leads || []);
    } catch (e) {
      setErroGeral('Não consegui carregar os leads. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function marcarTemLigacao(id, valor) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, tem_ligacao: valor } : l)));
  }

  const leadsFiltrados = useMemo(() => {
    let lista = leads;
    if (statusFiltro === 'ativos') lista = lista.filter((l) => l.status !== 'descartado');
    else if (statusFiltro === 'descartados') lista = lista.filter((l) => l.status === 'descartado');
    if (etapaFiltro) lista = lista.filter((l) => String(l.etapa_dia) === String(etapaFiltro));

    lista = [...lista];
    if (ordenacao === 'recente') {
      lista.sort((a, b) => new Date(b.ultima_atualizacao) - new Date(a.ultima_atualizacao));
    } else {
      lista.sort((a, b) => (a.empresa || '').localeCompare(b.empresa || '', 'pt-BR'));
    }
    return lista;
  }, [leads, statusFiltro, etapaFiltro, ordenacao]);

  return (
    <div>
      <Cabecalho
        titulo="Painel SDR — Legare Gestão"
        sub={`Todos os leads · ${leadsFiltrados.length} de ${leads.length}`}
        acoes={<button className="btn" onClick={carregar}>Atualizar</button>}
      />

      <div className="container">
        <BarraCadencia />

        {erroGeral ? <div className="aviso" style={{ marginBottom: 14 }}>{erroGeral}</div> : null}

        <div className="filtros-bar">
          <div className="tab-group">
            {FILTROS_STATUS.map((f) => (
              <button
                key={f.valor}
                className={`tab${statusFiltro === f.valor ? ' tab-active' : ''}`}
                onClick={() => setStatusFiltro(f.valor)}
              >
                {f.label}
              </button>
            ))}
            {etapaFiltro ? (
              <button className="tab tab-active" onClick={() => setEtapaFiltro('')}>
                {LABEL_ETAPA[etapaFiltro] || `Etapa ${etapaFiltro}`} ✕
              </button>
            ) : null}
          </div>
          <button
            className={`tab${ordenacao === 'recente' ? ' tab-active' : ''}`}
            onClick={() => setOrdenacao((o) => (o === 'recente' ? 'empresa' : 'recente'))}
          >
            Última atualização
          </button>
        </div>

        {carregando ? (
          <div className="loading">Carregando...</div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="empty">Nenhum lead nesse filtro.</div>
        ) : (
          <div className="lista-todos">
            {leadsFiltrados.map((lead) => (
              <div key={lead.id} className="card">
                <button className="empresa-nome-link" onClick={() => setHistoricoLeadId(lead.id)}>
                  {lead.empresa}{lead.sem_whatsapp ? ' · Sem WhatsApp' : ''}
                </button>
                <div className="card-meta" style={{ marginTop: 6 }}>
                  <div className="card-meta-item"><IconeTelefone /><span>{formatarTelefoneExibicao(lead.telefone)}</span></div>
                  {lead.decisor ? <div className="card-meta-item"><IconePessoa /><span>{lead.decisor}</span></div> : null}
                </div>
                <StatusEAcoesLead
                  lead={lead}
                  onLigado={() => marcarTemLigacao(lead.id, true)}
                  onRemover={carregar}
                  onNegocioCriado={carregar}
                  ocultarNome
                  semMensagem
                />
              </div>
            ))}
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
