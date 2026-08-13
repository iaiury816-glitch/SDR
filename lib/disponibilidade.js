// Filtro de "disponível hoje" pra leads em cadência (etapas 3/5/7/10 dias) - extraído de
// app/api/hoje/route.js pra poder ser reaproveitado também em app/api/tiers/route.js (o Tier
// do dia precisa da mesma contagem de leads pendentes que a fila "Leads do dia" usa).
const GAP_DIAS = { 3: 2, 5: 2, 7: 2, 10: 3 };
const TZ_OFFSET_MS = -3 * 60 * 60 * 1000;

function diaCalendarioMs(dataIso) {
  const localMs = new Date(dataIso).getTime() + TZ_OFFSET_MS;
  const d = new Date(localMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function ehFimDeSemanaMs(diaMs) {
  const diaSemana = new Date(diaMs).getUTCDay();
  return diaSemana === 0 || diaSemana === 6;
}

function diasUteisDiff(inicioMs, fimMs) {
  let count = 0;
  for (let cursor = inicioMs + 86400000; cursor <= fimMs; cursor += 86400000) {
    if (!ehFimDeSemanaMs(cursor)) count++;
  }
  return count;
}

export function estaDisponivelHoje(lead) {
  if (!lead.data_ultimo_contato || !GAP_DIAS[lead.etapa_dia]) return false;
  const diaContatoMs = diaCalendarioMs(lead.data_ultimo_contato);
  const hojeMs = diaCalendarioMs(new Date().toISOString());
  const diasUteisPassados = diasUteisDiff(diaContatoMs, hojeMs);
  return diasUteisPassados >= GAP_DIAS[lead.etapa_dia];
}
