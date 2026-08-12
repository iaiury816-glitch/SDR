'use client';

import { useEffect, useState, useCallback } from 'react';

const ICONE_TELEFONE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);
const ICONE_PESSOA = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

function formatarTelefoneExibicao(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return tel || '';
}

async function chamarAcao(acao, params) {
  const r = await fetch('/api/acoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ acao, ...params }),
  });
  const body = await r.json();
  if (!body.ok) {
    const err = new Error(body.erro || 'Erro desconhecido');
    throw err;
  }
  return body.resultado;
}

function mensagemErro(e, fallback) {
  const msg = (e && e.message) || '';
  if (msg.includes('SEM_LIGACAO')) {
    return 'Liga pro lead antes de continuar — essa ação só libera depois de uma ligação nova.';
  }
  return fallback;
}

export default function Home() {
  const [leads, setLeads] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [statsCounts, setStatsCounts] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');
  const [removendo, setRemovendo] = useState({});

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

  async function sair() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div>
      <div className="topo">
        <div>
          <h1>Painel SDR — Legare Gestão</h1>
          <div className="sub">Leads do dia · {statsCounts.hoje || 0} pendências</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" onClick={carregar}>Atualizar</button>
          <button className="btn" onClick={sair}>Sair</button>
        </div>
      </div>

      <div className="container">
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
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BotaoLigar({ id, onLigado }) {
  const [estado, setEstado] = useState('Ligar');
  const [desabilitado, setDesabilitado] = useState(false);

  async function ligar() {
    setDesabilitado(true);
    setEstado('Ligando...');
    try {
      await chamarAcao('ligar', { id });
      setEstado('Chamando seu ramal...');
      onLigado();
      setTimeout(() => { setDesabilitado(false); setEstado('Ligar'); }, 8000);
    } catch (e) {
      setDesabilitado(false);
      setEstado('Ligar');
      window.alert('Não consegui iniciar a ligação agora. Confere se o ramal está disponível e tenta de novo.');
    }
  }

  return <button className="btn btn-ligar" onClick={ligar} disabled={desabilitado}>{estado}</button>;
}

function ModalDescarte({ empresa, onCancelar, onConfirmar }) {
  const [motivo, setMotivo] = useState('Sem interesse');
  const [outro, setOutro] = useState('');

  function confirmar() {
    const valor = motivo === 'outro' ? outro.trim() : motivo;
    if (!valor) { window.alert('Descreve o motivo antes de confirmar.'); return; }
    onConfirmar(valor);
  }

  return (
    <div className="modal-fundo aberto">
      <div className="modal-caixa">
        <div className="field-value" style={{ marginBottom: 14 }}>Por que &quot;{empresa}&quot; está sendo descartado?</div>
        <div className="descarte-opcoes">
          <label><input type="radio" checked={motivo === 'Sem interesse'} onChange={() => setMotivo('Sem interesse')} /> Sem interesse</label>
          <label><input type="radio" checked={motivo === 'Sem contato válido'} onChange={() => setMotivo('Sem contato válido')} /> Sem contato válido</label>
          <label><input type="radio" checked={motivo === 'outro'} onChange={() => setMotivo('outro')} /> Outro:</label>
        </div>
        {motivo === 'outro' ? (
          <textarea className="agendor-textarea" style={{ marginTop: 8 }} placeholder="Descreva o motivo" value={outro} onChange={(e) => setOutro(e.target.value)} />
        ) : null}
        <div className="actions" style={{ marginTop: 14 }}>
          <button className="btn btn-danger" onClick={confirmar}>Descartar</button>
          <button className="btn" onClick={onCancelar}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function FormNegocio({ id, onCancelar, onCriado }) {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [data, setData] = useState(amanha.toISOString().slice(0, 10));
  const [hora, setHora] = useState('09:00');
  const [texto, setTexto] = useState('Retomar contato');
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    setEnviando(true);
    const quando = data && hora ? `${data}T${hora}:00-03:00` : null;
    try {
      const r = await chamarAcao('negocio', { id, texto, quando });
      onCriado(r);
    } catch (e) {
      setEnviando(false);
      window.alert(mensagemErro(e, 'Não consegui criar o negócio agora. Tenta de novo em alguns segundos.'));
    }
  }

  return (
    <div className="field">
      <div className="field-label">Quando retomar o contato</div>
      <div className="agendor-form-row">
        <input type="date" className="agendor-input" value={data} onChange={(e) => setData(e.target.value)} />
        <input type="time" className="agendor-input" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <textarea className="agendor-textarea" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn btn-agendor" onClick={confirmar} disabled={enviando}>{enviando ? 'Criando...' : 'Avançar'}</button>
        <button className="btn" onClick={onCancelar} disabled={enviando}>Cancelar</button>
      </div>
    </div>
  );
}

function LeadCard({ lead, removendo, onLigado, onRemover }) {
  const [mostrarDescarte, setMostrarDescarte] = useState(false);
  const [mostrarNegocio, setMostrarNegocio] = useState(false);
  const [negocioEtapa, setNegocioEtapa] = useState(lead.negocio_etapa || null);
  const [ocupado, setOcupado] = useState(false);

  const semLigacao = !lead.tem_ligacao;
  const bloqueado = semLigacao || ocupado;

  function exigirLigacao() {
    if (semLigacao) {
      window.alert('Liga pro lead antes de continuar — essa ação só libera depois de pelo menos 1 ligação registrada.');
      return false;
    }
    return true;
  }

  async function enviado() {
    if (!exigirLigacao()) return;
    setOcupado(true);
    try {
      await chamarAcao('enviado', { id: lead.id });
      onRemover();
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui marcar como enviado agora. Tenta de novo em alguns segundos.'));
    }
  }

  async function semWhatsapp() {
    if (!exigirLigacao()) return;
    setOcupado(true);
    try {
      await chamarAcao('sem-whatsapp', { id: lead.id });
      onRemover();
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui marcar "Sem WhatsApp" agora. Tenta de novo em alguns segundos.'));
    }
  }

  async function confirmarDescarte(motivo) {
    setMostrarDescarte(false);
    setOcupado(true);
    try {
      await chamarAcao('descartar', { id: lead.id, motivo });
      onRemover();
    } catch (e) {
      setOcupado(false);
      window.alert(mensagemErro(e, 'Não consegui descartar o lead agora. Tenta de novo em alguns segundos.'));
    }
  }

  let statusBadge;
  if (lead.status === 'mensagem_pronta') statusBadge = <span className="status-badge status-pronto">Pronto pra enviar</span>;
  else if (lead.status === 'contatado') statusBadge = <span className="status-badge status-aguardando">Follow-up pronto pra gerar (rode o workflow)</span>;
  else statusBadge = <span className="status-badge">{lead.status}</span>;

  return (
    <div className="card" style={removendo ? { opacity: 0, transform: 'scale(.97)' } : undefined}>
      <div className="card-top-row">
        <div className="empresa-nome">{lead.empresa}{lead.sem_whatsapp ? ' · Sem WhatsApp' : ''}</div>
        {statusBadge}
      </div>
      <div className="card-meta">
        <div className="card-meta-item">{ICONE_TELEFONE}<span>{formatarTelefoneExibicao(lead.telefone)}</span></div>
        {lead.decisor ? <div className="card-meta-item">{ICONE_PESSOA}<span>{lead.decisor}</span></div> : null}
      </div>

      {lead.status === 'mensagem_pronta' && lead.mensagem_whatsapp ? (
        <div className="field">
          <div className="field-label">Mensagem</div>
          <div className="mensagem">{lead.mensagem_whatsapp}</div>
        </div>
      ) : null}

      {semLigacao ? <div className="aviso">Liga pro lead antes de Enviado/Avançar/Sem WhatsApp/Descartar.</div> : null}

      {negocioEtapa ? (
        <div className="actions">
          <span className="btn btn-agendor">Negócio: {negocioEtapa}</span>
        </div>
      ) : mostrarNegocio ? (
        <FormNegocio
          id={lead.id}
          onCancelar={() => setMostrarNegocio(false)}
          onCriado={(r) => { setNegocioEtapa(r.etapa); setMostrarNegocio(false); }}
        />
      ) : (
        <div className="actions">
          <BotaoLigar id={lead.id} onLigado={onLigado} />
          {lead.status === 'mensagem_pronta' ? (
            <button className="btn btn-secondary" onClick={enviado} disabled={bloqueado}>Enviado</button>
          ) : null}
          <button className="btn btn-agendor" onClick={() => { if (exigirLigacao()) setMostrarNegocio(true); }} disabled={ocupado}>Avançar</button>
          <button className="btn" onClick={semWhatsapp} disabled={bloqueado}>Sem WhatsApp</button>
          <button className="btn btn-danger" onClick={() => { if (exigirLigacao()) setMostrarDescarte(true); }} disabled={ocupado}>Descartar</button>
        </div>
      )}

      {mostrarDescarte ? (
        <ModalDescarte
          empresa={lead.empresa}
          onCancelar={() => setMostrarDescarte(false)}
          onConfirmar={confirmarDescarte}
        />
      ) : null}
    </div>
  );
}

function TarefaCard({ t, removendo, onLigado, onRemover }) {
  const [mostrarDescarte, setMostrarDescarte] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const semLigacao = !t.tem_ligacao;

  async function concluir() {
    setOcupado(true);
    try {
      await chamarAcao('concluir-tarefa', { tarefaId: t.tarefa_id, ignorarLigacao: true });
      onRemover();
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
        <div className="empresa-nome">{t.empresa}{t.sem_whatsapp ? ' · Sem WhatsApp' : ''}</div>
        <span className="status-badge">{t.etapa}</span>
      </div>
      <div className="card-meta">
        <div className="card-meta-item">{ICONE_TELEFONE}<span>{formatarTelefoneExibicao(t.telefone)}</span></div>
        {t.decisor ? <div className="card-meta-item">{ICONE_PESSOA}<span>{t.decisor}</span></div> : null}
      </div>
      <div className="field">
        <div className="field-label">O que fazer</div>
        <div className="field-value">{t.tarefa_texto}</div>
      </div>
      {semLigacao ? <div className="aviso">Liga pro lead antes de Descartar.</div> : null}
      <div className="actions">
        {t.telefone ? <BotaoLigar id={t.lead_id} onLigado={onLigado} /> : null}
        <button className="btn btn-secondary" onClick={concluir} disabled={ocupado}>Marcar concluída</button>
        <button className="btn btn-danger" onClick={() => setMostrarDescarte(true)} disabled={ocupado || semLigacao}>Descartar</button>
      </div>
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
