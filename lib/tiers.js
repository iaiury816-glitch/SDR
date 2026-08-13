// Sistema de "Tiers" (estilo elo, tipo League of Legends) portado do artefato original
// (fila_aprovacao_whatsapp.html). Lógica pura, isomórfica (roda tanto em app/api/* no server
// quanto em componentes client) - nada aqui depende de window/document.
//
// Duas escalas independentes, ambas Ferro..Desafiante (TIER_DEFINICOES, em tierBadges.js):
//   - "Tier do dia": % de tarefas do dia (Leads do dia + Follow ups) concluídas, com cada
//     reunião marcada no dia subindo 1 elo imediatamente (calcularTierDia).
//   - "Tier do mês": por etapa do funil (ETAPAS_METRICAS), comparando volume/taxa de conversão
//     contra os limiares de benchmark (tierInfoEtapa) - e a média ponderada das 8 (calcularTierDoMes,
//     Fechamento pesa 3x).
//
// Nota (13/08): a versão original também reduzia o Tier do dia por "penalidade de ociosidade"
// (Controle de Foco - pausas, cronômetro etc.), ainda não portada pro painel Next.js. Por ora
// o Tier do dia aqui roda sem esse fator.

import { TIER_DEFINICOES } from './tierBadges';

export { TIER_DEFINICOES };

export const ETAPAS_METRICAS = [
  { key: 'total_leads', label: 'Leads Gerados' },
  { key: 'alcancou_contatado', label: 'Contatado' },
  { key: 'alcancou_conectado', label: 'Conectado (negócio)' },
  { key: 'alcancou_conexao_decisor', label: 'Conexão decisor' },
  { key: 'alcancou_reuniao_agendada', label: 'Reunião agendada' },
  { key: 'alcancou_reuniao_executada', label: 'Reunião executada' },
  { key: 'alcancou_followup', label: 'Follow up' },
  { key: 'alcancou_fechamento', label: 'Fechamento' },
];

export const PERIODOS_METRICAS = [
  { tipo: 'tudo', label: 'Tudo' },
  { tipo: 'hoje', label: 'Hoje' },
  { tipo: 'dias', dias: 7, label: '7 dias' },
  { tipo: 'dias', dias: 15, label: '15 dias' },
  { tipo: 'dias', dias: 30, label: '30 dias' },
];

export const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const DIAS_SEMANA_ABREV = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const LIMIARES_VOLUME = {
  total_leads: [0, 10, 25, 50, 80, 160, 220, 280, 350],
};

const LIMIARES_TAXA = {
  alcancou_contatado: { base: 'total_leads', limiares: [0, 20, 40, 60, 70, 88, 95, 97, 99] },
  alcancou_conectado: { base: 'alcancou_contatado', limiares: [0, 3, 7, 10, 15, 28, 35, 45, 55] },
  alcancou_conexao_decisor: { base: 'alcancou_conectado', limiares: [0, 11, 22, 33, 44, 56, 67, 78, 89] },
  alcancou_reuniao_agendada: { base: 'alcancou_conectado', limiares: [0, 5, 10, 15, 23, 38, 45, 55, 65] },
  alcancou_reuniao_executada: { base: 'alcancou_reuniao_agendada', limiares: [0, 22, 43, 65, 73, 85, 90, 95, 98] },
  alcancou_followup: { base: 'alcancou_reuniao_executada', limiares: [0, 23, 47, 70, 78, 90, 95, 97, 99] },
  alcancou_fechamento: { base: 'alcancou_followup', limiares: [0, 7, 13, 20, 30, 50, 60, 75, 90] },
};

// Fechamento pesa mais (resultado que realmente importa) - as outras 6 etapas contam igual entre si.
export const PESO_ETAPA_TIER_MES = {
  total_leads: 1,
  alcancou_contatado: 1,
  alcancou_conectado: 1,
  alcancou_reuniao_agendada: 1,
  alcancou_reuniao_executada: 1,
  alcancou_followup: 1,
  alcancou_fechamento: 3,
};

function calcularTierPorLimiares(valor, limiares) {
  let idx = 0;
  for (let i = 0; i < limiares.length; i++) {
    if (valor >= limiares[i]) idx = i;
  }
  const atual = { ...TIER_DEFINICOES[idx], min: limiares[idx] };
  const proximo = idx + 1 < TIER_DEFINICOES.length ? { ...TIER_DEFINICOES[idx + 1], min: limiares[idx + 1] } : null;
  return { idx, atual, proximo };
}

// Monta as infos de tier pra uma etapa do funil no mês - decide se é volume (Leads Gerados) ou
// taxa de conversão (as outras 7), calculando a taxa contra a etapa anterior quando aplicável.
export function tierInfoEtapa(mMes, etapaKey) {
  const qtd = (mMes && mMes[etapaKey]) || 0;
  if (etapaKey === 'total_leads') {
    const { idx, atual, proximo } = calcularTierPorLimiares(qtd, LIMIARES_VOLUME.total_leads);
    return { tipo: 'volume', qtd, idx, atual, proximo };
  }
  const cfg = LIMIARES_TAXA[etapaKey];
  const baseQtd = cfg ? ((mMes && mMes[cfg.base]) || 0) : 0;
  const taxa = baseQtd > 0 ? (qtd / baseQtd) * 100 : (qtd > 0 ? 100 : 0);
  const limiares = cfg ? cfg.limiares : LIMIARES_TAXA.alcancou_reuniao_executada.limiares;
  const { idx, atual, proximo } = calcularTierPorLimiares(taxa, limiares);
  return { tipo: 'taxa', qtd, baseQtd, taxa, idx, atual, proximo };
}

// Texto "valor — faltam X pra {próximo}", reaproveitado no card compacto (Métricas) e no card
// grande (Início) - centraliza a diferença volume vs. taxa.
export function formatarProgressoTier(info) {
  const { tipo, atual, proximo } = info;
  if (tipo === 'volume') {
    const valorStr = `${info.qtd}`;
    const progresso = proximo ? `faltam ${proximo.min - info.qtd} pra ${proximo.nome}` : 'tier máximo!';
    return { valorStr, progresso };
  }
  const valorStr = `${info.taxa.toFixed(0)}% (${info.qtd}/${info.baseQtd})`;
  const progresso = proximo ? `faltam ${(proximo.min - info.taxa).toFixed(0)}pp pra ${proximo.nome}` : 'tier máximo!';
  return { valorStr, progresso };
}

// Média PONDERADA da posição (idx 0..8) de cada uma das 8 etapas - Tier do mês (geral).
export function calcularTierDoMes(mMes) {
  let somaPonderada = 0;
  let somaPesos = 0;
  const detalhes = ETAPAS_METRICAS.map((etapa) => {
    const info = tierInfoEtapa(mMes, etapa.key);
    const peso = PESO_ETAPA_TIER_MES[etapa.key] || 1;
    somaPonderada += info.idx * peso;
    somaPesos += peso;
    return { etapa, info, peso };
  });
  const idxBruto = somaPesos > 0 ? Math.round(somaPonderada / somaPesos) : 0;
  const idx = Math.max(0, Math.min(TIER_DEFINICOES.length - 1, idxBruto));
  return { idx, atual: TIER_DEFINICOES[idx], detalhes };
}

// Tier do dia: cada reunião marcada hoje sobe 1 elo imediatamente; as atividades pendentes
// dividem em partes iguais os elos restantes até o topo (Desafiante). 0 reuniões = 8 elos pra
// dividir a % (Ferro..Desafiante); 1 reunião = já começa no Bronze, sobra 7 elos; etc.
export function calcularTierDia(percentual, reunioesHoje) {
  const topoIdx = TIER_DEFINICOES.length - 1;
  const reuniaoElos = Math.min(reunioesHoje, topoIdx);
  const passosRestantes = topoIdx - reuniaoElos;

  if (passosRestantes <= 0) {
    return { idx: topoIdx, atual: TIER_DEFINICOES[topoIdx], proximo: null };
  }

  const tamanhoPasso = 100 / passosRestantes;
  const idxDentroBanda = Math.min(passosRestantes, Math.floor(percentual / tamanhoPasso));
  const idx = reuniaoElos + idxDentroBanda;
  const atual = TIER_DEFINICOES[idx];

  let proximo = null;
  if (idx < topoIdx) {
    const proximoLimiarPct = (idxDentroBanda + 1) * tamanhoPasso;
    proximo = { ...TIER_DEFINICOES[idx + 1], min: proximoLimiarPct };
  }
  return { idx, atual, proximo };
}

// Texto do "faltam X atividades (ou 1 reunião) p/ {próximo tier}" do badge de Tier do dia no
// header - portado de textoProximoTierDia() do artefato original (pedido do Iury: deixar claro
// quanto falta pra subir de elo hoje, não só a % bruta).
export function textoProximoTierDia(dados) {
  const { percentual, concluidas, total, reunioesHoje } = dados;
  const { proximo } = calcularTierDia(percentual, reunioesHoje);
  if (!proximo) return 'tier máximo do dia!';
  if (total === 0) return 'pegue tarefas ou marque uma reunião pra subir de tier';
  const alvoConcluidas = Math.ceil((proximo.min / 100) * total);
  const faltam = Math.max(0, alvoConcluidas - concluidas);
  if (faltam === 0) return `atualize a lista p/ ${proximo.nome}`;
  return `falta${faltam === 1 ? '' : 'm'} ${faltam} atividade${faltam === 1 ? '' : 's'} (ou 1 reunião) p/ ${proximo.nome}`;
}

// Primeiro/último dia do mês corrente no fuso America/Fortaleza - usado tanto pra filtrar
// metricas_funil() do mês quanto pro histórico de tier_dia_historico.
const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

export function limitesMesAtualFortaleza() {
  const d = new Date(Date.now() + TZ_OFFSET_MS);
  const ano = d.getUTCFullYear();
  const mesIdx = d.getUTCMonth();
  const mesStr = String(mesIdx + 1).padStart(2, '0');
  const ultimoDia = new Date(Date.UTC(ano, mesIdx + 1, 0)).getUTCDate();
  return {
    ano,
    mes: mesIdx + 1,
    inicio: `${ano}-${mesStr}-01T00:00:00-03:00`,
    fim: `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}T23:59:59-03:00`,
  };
}

export function hojeFortalezaYmd() {
  const d = new Date(Date.now() + TZ_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function formatarDataBrCurta(dataYmd) {
  const [, mes, dia] = String(dataYmd || '').split('-');
  return dia && mes ? `${dia}/${mes}` : '';
}

export function periodosIguais(a, b) {
  if (!a || !b || a.tipo !== b.tipo) return false;
  if (a.tipo === 'dias') return a.dias === b.dias;
  if (a.tipo === 'custom') return a.inicio === b.inicio && a.fim === b.fim;
  return true;
}
