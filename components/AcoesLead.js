'use client';

import { useState } from 'react';
import { chamarAcao, mensagemErro } from '../lib/client';

export function BotaoLigar({ id, onLigado }) {
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

export function ModalDescarte({ empresa, onCancelar, onConfirmar }) {
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

export function FormNegocio({ id, onCancelar, onCriado }) {
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

// Bloco de status + ações de um lead (Ligar/Enviado/Avançar/Sem WhatsApp/Descartar),
// reaproveitado pelo card da lista (LeadCard) e pelo modal de histórico —
// mesma lógica de bloqueio "precisa ligar antes", um só lugar pra manter certo.
export function StatusEAcoesLead({ lead, onLigado, onRemover, onNegocioCriado, semMensagem, ocultarNome }) {
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
      onRemover && onRemover();
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
      onRemover && onRemover();
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
      onRemover && onRemover();
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
    <div>
      <div className="card-top-row" style={ocultarNome ? { justifyContent: 'flex-end' } : undefined}>
        {ocultarNome ? null : (
          <div className="empresa-nome">{lead.empresa}{lead.sem_whatsapp ? ' · Sem WhatsApp' : ''}</div>
        )}
        {statusBadge}
      </div>

      {!semMensagem && lead.status === 'mensagem_pronta' && lead.mensagem_whatsapp ? (
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
          onCriado={(r) => { setNegocioEtapa(r.etapa); setMostrarNegocio(false); onNegocioCriado && onNegocioCriado(r); }}
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
