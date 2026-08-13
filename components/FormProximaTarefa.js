'use client';

// Form de "próxima tarefa" (data/hora/texto + etapa do funil) — compartilhado pelo Kanban
// (+ Tarefa / Concluir), Follow ups do dia e o modal de Histórico. Porta
// mostrarFormTarefaKanban/mostrarFormProximaTarefaHoje/mostrarFormProximaTarefaHistorico do
// artefato original: os 3 lugares usam o mesmo form, só muda o que acontece depois (onCriado).
import { useState } from 'react';
import { chamarAcao, mensagemErro, ETAPAS_FUNIL } from '../lib/client';

export default function FormProximaTarefa({ negocioId, etapaAtual, empresa, decisor, telefone, onCriado, onPular }) {
  const amanha = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [data, setData] = useState(amanha.toISOString().slice(0, 10));
  const [hora, setHora] = useState('09:00');
  const [texto, setTexto] = useState('Retomar contato');
  const [etapa, setEtapa] = useState(etapaAtual || ETAPAS_FUNIL[0]);
  const [enviando, setEnviando] = useState(false);

  async function confirmar() {
    if (!data || !hora) { window.alert('Preenche data e hora.'); return; }
    setEnviando(true);
    const quando = `${data}T${hora}:00-03:00`;
    try {
      if (etapa && etapa !== etapaAtual) {
        await chamarAcao('mover-etapa', { negocioId, etapa });
      }
      await chamarAcao('criar-tarefa', {
        negocioId,
        texto: texto.trim() || 'Retomar contato',
        quando,
        empresa,
        decisor,
        telefone,
      });
      onCriado();
    } catch (e) {
      setEnviando(false);
      window.alert(mensagemErro(e, 'Não consegui salvar a próxima tarefa agora. Tenta de novo em alguns segundos.'));
    }
  }

  return (
    <div className="field">
      <div className="field-label">Quando retomar o contato (próxima tarefa)</div>
      <div className="agendor-form-row">
        <input type="date" className="agendor-input" value={data} onChange={(e) => setData(e.target.value)} />
        <input type="time" className="agendor-input" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <textarea className="agendor-textarea" placeholder="O que fazer nesse retorno?" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="field-label" style={{ marginTop: 8 }}>Etapa do funil</div>
      <select className="agendor-input agendor-select" value={etapa} onChange={(e) => setEtapa(e.target.value)}>
        {ETAPAS_FUNIL.map((et) => <option key={et} value={et}>{et}</option>)}
      </select>
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn btn-agendor" onClick={confirmar} disabled={enviando}>{enviando ? 'Salvando...' : 'Salvar'}</button>
        <button className="btn btn-secondary" onClick={onPular} disabled={enviando}>Concluir sem agendar</button>
      </div>
    </div>
  );
}
