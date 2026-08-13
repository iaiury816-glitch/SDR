'use client';

// Form inline de edição de tarefa (data/hora/texto) — compartilhado entre Follow ups do dia,
// Kanban e o modal de Histórico. Porta editarTarefaCard/editarTarefaHistorico do artefato
// original: mesmo padrão visual (.agendor-form) e mesma RPC (public.editar_tarefa).
import { useState } from 'react';
import { chamarAcao, mensagemErro, isoParaInputsLocais } from '../lib/client';

export default function EditarTarefaForm({ tarefaId, textoAtual, quandoAtual, onSalvo, onCancelar }) {
  const inicial = isoParaInputsLocais(quandoAtual);
  const [data, setData] = useState(inicial.data);
  const [hora, setHora] = useState(inicial.hora);
  const [texto, setTexto] = useState(textoAtual || '');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!data || !hora) { window.alert('Preenche data e hora antes de salvar.'); return; }
    setSalvando(true);
    const quandoIso = `${data}T${hora}:00-03:00`;
    try {
      await chamarAcao('editar-tarefa', { tarefaId, texto: texto.trim(), quando: quandoIso });
      onSalvo(texto.trim(), quandoIso);
    } catch (e) {
      setSalvando(false);
      window.alert(mensagemErro(e, 'Não consegui salvar a alteração agora. Tenta de novo em alguns segundos.'));
    }
  }

  return (
    <div className="agendor-form">
      <div className="field-label">Editar tarefa</div>
      <div className="agendor-form-row">
        <input type="date" className="agendor-input" value={data} onChange={(e) => setData(e.target.value)} />
        <input type="time" className="agendor-input" value={hora} onChange={(e) => setHora(e.target.value)} />
      </div>
      <textarea className="agendor-textarea" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="actions" style={{ marginTop: 8 }}>
        <button className="btn btn-agendor" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
        <button className="btn btn-secondary" onClick={onCancelar} disabled={salvando}>Cancelar</button>
      </div>
    </div>
  );
}
