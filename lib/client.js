// Helpers compartilhados entre os componentes client-side do painel.
// Nada aqui usa hooks/JSX — só lógica pura, então pode ser importado de
// componentes client e também de outros helpers sem precisar de 'use client'.

export function formatarTelefoneExibicao(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  return tel || '';
}

export async function chamarAcao(acao, params) {
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

export function mensagemErro(e, fallback) {
  const msg = (e && e.message) || '';
  if (msg.includes('SEM_LIGACAO')) {
    return 'Liga pro lead antes de continuar — essa ação só libera depois de uma ligação nova.';
  }
  return fallback;
}

export function formatarDuracao(segundos) {
  const s = Number(segundos) || 0;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// As 6 etapas do funil de negócios (quadro Kanban), na ordem — mesma lista e
// nomes usados em public.definir_etapa_negocio() (constraint no banco).
export const ETAPAS_FUNIL = [
  'CONEXÃO EMPRESA',
  'CONEXÃO DECISOR',
  'REUNIÃO AGENDADA',
  'REUNIÃO EXECUTADA',
  'FOLLOW UP',
  'FECHAMENTO',
];

export function formatarDataHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Só a hora (HH:MM), fuso de Fortaleza — usado no "Em pausa até HH:MM" do Controle de foco.
export function formatarHoraCurta(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
}

// Copia texto pra área de transferência, com fallback pra ambientes sem permissão de
// Clipboard API (ex: iframe sem gesto reconhecido) — portado de copyField() do artefato original.
export async function copiarTexto(valor) {
  if (!valor) return;
  try {
    await navigator.clipboard.writeText(valor);
    return;
  } catch {
    // fallback abaixo
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = valor;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  } catch {
    // desiste silenciosamente
  }
}

// Converte um ISO (o que fica salvo em tarefas.quando) pros valores que <input type=date> e
// <input type=time> esperam, em America/Fortaleza (-03:00 fixo, sem horário de verão) — usado
// pelo form de "Editar tarefa".
export function isoParaInputsLocais(iso) {
  if (!iso) return { data: '', hora: '09:00' };
  const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;
  const localMs = new Date(iso).getTime() + TZ_OFFSET_MS;
  const d = new Date(localMs);
  const data = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  const hora = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  return { data, hora };
}
