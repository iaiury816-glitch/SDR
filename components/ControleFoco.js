'use client';

// Widget "Controle de foco" no header — pausa/reunião/ligação + penalidade de ociosidade
// (sistema de "redução de elo" do Tier do dia). Porta renderControleFocoPainel/
// atualizarTimerFocoDisplay do artefato original: aqui, o cronômetro de 1s só recalcula um texto
// local a partir de âncoras (ms) trazidas do servidor a cada 30s, sem bater no banco toda hora.
import { useEffect, useRef, useState, useCallback } from 'react';
import { formatarHoraCurta } from '../lib/client';

export default function ControleFoco() {
  const [foco, setFoco] = useState(null);
  const [, forcarTick] = useState(0);
  const [formRecursoAberto, setFormRecursoAberto] = useState(false);
  const [motivoRecurso, setMotivoRecurso] = useState('');
  const [qtdRecurso, setQtdRecurso] = useState(1);
  const [enviandoRecurso, setEnviandoRecurso] = useState(false);
  const ultimaInteracaoMsRef = useRef(null);
  const pausaRapidaFimMsRef = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch('/api/foco');
      const body = await r.json();
      if (!body.ok) return;
      const dados = body.foco || {};
      if ((dados.estado || 'ativo') === 'ativo') {
        ultimaInteracaoMsRef.current = Date.now() - Number(dados.minutos_ociosos || 0) * 60000;
      }
      if (dados.pausa_rapida_termina_em) {
        pausaRapidaFimMsRef.current = new Date(dados.pausa_rapida_termina_em).getTime();
      }
      setFoco(dados);
      setFormRecursoAberto(false);
    } catch {
      // widget de foco não deve travar o resto do painel
    }
  }, []);

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 30000);
    return () => clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    const id = setInterval(() => forcarTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function chamarFoco(acao, extra) {
    try {
      const r = await fetch('/api/foco', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, ...extra }),
      });
      const body = await r.json();
      return body;
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e) };
    }
  }

  async function fazerPausa() {
    const r = await chamarFoco('pausa');
    if (r.resultado && r.resultado.ok === false && r.resultado.motivo === 'sem_pausas') {
      window.alert('Você já usou as 4 pausas de hoje.');
    } else if (r.resultado && r.resultado.ok === false) {
      window.alert('Não dá pra iniciar uma pausa agora (você já está em pausa, ligação ou reunião).');
    }
    carregar();
  }

  async function pausaRapida() {
    const r = await chamarFoco('pausa-rapida');
    if (r.resultado && r.resultado.ok === false) {
      window.alert('Não dá pra iniciar uma pausa rápida agora (você já está em pausa, ligação ou reunião).');
    }
    carregar();
  }

  async function voltarPausaRapida() {
    await chamarFoco('voltar-pausa-rapida');
    carregar();
  }

  async function entrarReuniao() {
    const r = await chamarFoco('reuniao');
    if (r.resultado && r.resultado.ok === false) {
      window.alert('Não dá pra marcar reunião agora (você já está em pausa, ligação ou reunião).');
    }
    carregar();
  }

  async function sairReuniao() {
    await chamarFoco('sair-reuniao');
    carregar();
  }

  async function terminarLigacao() {
    await chamarFoco('terminar-ligacao');
    carregar();
  }

  async function confirmarRecurso() {
    const motivo = motivoRecurso.trim();
    if (!motivo) { window.alert('Escreve rapidinho o motivo (fica registrado no histórico de recursos).'); return; }
    setEnviandoRecurso(true);
    const r = await chamarFoco('recorrer', { motivo, quantidade: qtdRecurso });
    setEnviandoRecurso(false);
    if (!r.ok) window.alert('Não consegui registrar o recurso agora. Tenta de novo em alguns segundos.');
    carregar();
  }

  if (!foco) return <div className="controle-foco" />;

  const estado = foco.estado || 'ativo';
  const pausasUsadas = Number(foco.pausas_usadas_hoje || 0);
  const pausasRestantes = Math.max(0, 4 - pausasUsadas);
  const penalidadeHoje = Number(foco.penalidade_hoje || 0);

  if (estado === 'ativo' && foco.fora_expediente && foco.motivo_fora_expediente === 'almoco') {
    return (
      <div className="controle-foco">
        <span className="controle-foco-estado controle-foco-almoco">Almoço até 13:20</span>
      </div>
    );
  }

  if (estado === 'pausa') {
    const termina = foco.pausa_termina_em ? formatarHoraCurta(foco.pausa_termina_em) : '';
    return (
      <div className="controle-foco">
        <span className="controle-foco-estado controle-foco-pausa">Em pausa{termina ? ` até ${termina}` : ''}</span>
      </div>
    );
  }

  if (estado === 'reuniao') {
    return (
      <div className="controle-foco">
        <span className="controle-foco-estado controle-foco-reuniao">Em reunião</span>
        <button className="btn btn-secondary" onClick={sairReuniao}>Sair da reunião</button>
      </div>
    );
  }

  if (estado === 'ligacao') {
    return (
      <div className="controle-foco">
        <span className="controle-foco-estado controle-foco-ligacao">Em ligação</span>
        <button className="btn btn-secondary" onClick={terminarLigacao}>Terminei a ligação</button>
      </div>
    );
  }

  if (estado === 'pausa_rapida') {
    const restante = pausaRapidaFimMsRef.current ? Math.max(0, Math.floor((pausaRapidaFimMsRef.current - Date.now()) / 1000)) : 240;
    const min = Math.floor(restante / 60);
    const seg = restante % 60;
    return (
      <div className="controle-foco">
        <span className="controle-foco-timer">{`volta em ${min}:${String(seg).padStart(2, '0')}`}</span>
        <button className="btn btn-secondary" onClick={voltarPausaRapida}>Avisei que voltei</button>
      </div>
    );
  }

  // estado === 'ativo'
  const segundos = ultimaInteracaoMsRef.current ? Math.max(0, Math.floor((Date.now() - ultimaInteracaoMsRef.current) / 1000)) : 0;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  const alerta = segundos >= 240 && segundos % 300 < 60;

  return (
    <div className="controle-foco">
      <span className={`controle-foco-timer${alerta ? ' controle-foco-timer-alerta' : ''}`}>{`parado há ${min}:${String(seg).padStart(2, '0')}`}</span>

      {penalidadeHoje > 0 ? (
        <div className="controle-foco-penalidade">
          Penalidade hoje: <strong>{penalidadeHoje}</strong>
          <button className="btn btn-secondary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => { setQtdRecurso(penalidadeHoje); setFormRecursoAberto((v) => !v); }}>Recorrer</button>
        </div>
      ) : null}

      {formRecursoAberto ? (
        <div className="agendor-form" style={{ marginTop: 2, width: '100%' }}>
          <textarea
            className="agendor-textarea"
            placeholder="Por quê? Ex: respondendo lead direto no WhatsApp"
            style={{ minHeight: 40 }}
            value={motivoRecurso}
            onChange={(e) => setMotivoRecurso(e.target.value)}
          />
          <div className="agendor-form-row" style={{ marginTop: 6 }}>
            <div className="field-label" style={{ alignSelf: 'center' }}>Pontos a perdoar</div>
            <input
              type="number"
              className="agendor-input"
              min={1}
              max={penalidadeHoje}
              value={qtdRecurso}
              onChange={(e) => setQtdRecurso(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="actions" style={{ marginTop: 8 }}>
            <button className="btn btn-agendor" onClick={confirmarRecurso} disabled={enviandoRecurso}>{enviandoRecurso ? 'Enviando...' : 'Recorrer'}</button>
            <button className="btn" onClick={() => setFormRecursoAberto(false)} disabled={enviandoRecurso}>Cancelar</button>
          </div>
        </div>
      ) : null}

      <div className="controle-foco-botoes">
        <button className="btn btn-secondary" onClick={pausaRapida}>Pausa rápida (4min)</button>
        <button className="btn btn-secondary" onClick={fazerPausa} disabled={pausasRestantes === 0} title={pausasRestantes === 0 ? 'Sem pausas sobrando hoje' : undefined}>
          Fazer pausa ({pausasRestantes}/4 hoje)
        </button>
        <button className="btn btn-secondary" onClick={entrarReuniao}>Entrar em reunião</button>
      </div>
    </div>
  );
}
