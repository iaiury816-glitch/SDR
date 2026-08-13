'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BotaoLigar } from './AcoesLead';
import { formatarTelefoneExibicao, formatarDataHora } from '../lib/client';

const CHAVE_LIGADO = 'sdr_alarme_ligado';
const CHAVE_VISTOS = 'sdr_alarme_vistos';
const INTERVALO_MS = 30000;

function hojeStr() {
  return new Date().toISOString().slice(0, 10);
}

function carregarVistos() {
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE_VISTOS) || 'null');
    if (bruto && bruto.data === hojeStr()) return new Set(bruto.ids);
  } catch { /* localStorage indisponível ou json inválido, começa vazio */ }
  return new Set();
}

function salvarVistos(set) {
  try {
    localStorage.setItem(CHAVE_VISTOS, JSON.stringify({ data: hojeStr(), ids: [...set] }));
  } catch { /* ignora falha de storage (modo privado etc.) */ }
}

function apitar() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tom = (freq, inicio, duracao) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracao);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao);
    };
    tom(880, 0, 0.16);
    tom(1108, 0.18, 0.18);
  } catch { /* Web Audio indisponível, só perde o som */ }
}

function notificar(tarefa) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    new Notification(`Tarefa: ${tarefa.empresa}`, {
      body: `${tarefa.tarefa_texto}${tarefa.decisor ? ' · ' + tarefa.decisor : ''}`,
    });
  } catch { /* navegador pode recusar silenciosamente */ }
}

export default function AlarmeTarefas() {
  const [ligado, setLigado] = useState(false);
  const [toasts, setToasts] = useState([]);
  const vistosRef = useRef(new Set());
  const primeiraChecagemRef = useRef(true);

  useEffect(() => {
    try {
      setLigado(localStorage.getItem(CHAVE_LIGADO) === '1');
    } catch { /* ignora */ }
    vistosRef.current = carregarVistos();
  }, []);

  const verificar = useCallback(async () => {
    try {
      const r = await fetch('/api/hoje');
      const body = await r.json();
      if (!body.ok) return;
      const agora = Date.now();
      const vencidas = (body.tarefas || []).filter((t) => t.quando && new Date(t.quando).getTime() <= agora);

      const primeiraVez = primeiraChecagemRef.current;
      primeiraChecagemRef.current = false;

      let mudou = false;
      const novasParaAlarmar = [];
      for (const t of vencidas) {
        if (vistosRef.current.has(t.tarefa_id)) continue;
        vistosRef.current.add(t.tarefa_id);
        mudou = true;
        if (!primeiraVez) novasParaAlarmar.push(t);
      }
      if (mudou) salvarVistos(vistosRef.current);

      if (novasParaAlarmar.length > 0) {
        apitar();
        novasParaAlarmar.forEach(notificar);
        setToasts((ts) => [...ts, ...novasParaAlarmar]);
      }
    } catch { /* falha de rede numa checagem não deve derrubar o alarme */ }
  }, []);

  useEffect(() => {
    if (!ligado) return;
    verificar();
    const id = setInterval(verificar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [ligado, verificar]);

  async function alternar() {
    const novoEstado = !ligado;
    if (novoEstado && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignora recusa */ }
    }
    setLigado(novoEstado);
    try { localStorage.setItem(CHAVE_LIGADO, novoEstado ? '1' : '0'); } catch { /* ignora */ }
  }

  function dispensar(tarefaId) {
    setToasts((ts) => ts.filter((t) => t.tarefa_id !== tarefaId));
  }

  return (
    <>
      <button
        className="btn"
        onClick={alternar}
        title={ligado ? 'Alarme de tarefas ligado' : 'Alarme de tarefas desligado'}
      >
        {ligado ? '🔔' : '🔕'}
      </button>

      {toasts.length > 0 ? (
        <div className="alarme-toasts-container">
          {toasts.map((t) => (
            <div key={t.tarefa_id} className="alarme-toast" data-lead-id={t.lead_id}>
              <button className="alarme-toast-fechar" onClick={() => dispensar(t.tarefa_id)} aria-label="Fechar">×</button>
              <div className="empresa-nome">{t.empresa}</div>
              <div className="field-label">{formatarDataHora(t.quando)}</div>
              <div className="field-value" style={{ marginTop: 4 }}>{t.tarefa_texto}</div>
              <div className="field-label" style={{ marginTop: 4 }}>
                {formatarTelefoneExibicao(t.telefone)}{t.decisor ? ` · ${t.decisor}` : ''}
              </div>
              <div className="actions" style={{ marginTop: 8 }}>
                <BotaoLigar id={t.lead_id} onLigado={() => {}} />
                <button className="btn" onClick={() => dispensar(t.tarefa_id)}>Dispensar</button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
