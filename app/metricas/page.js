'use client';

import { useEffect, useState, useCallback } from 'react';
import Cabecalho from '../../components/Cabecalho';
import GraficoFunil from '../../components/GraficoFunil';
import { TierCard } from '../../components/TierCards';
import { formatarDataHora } from '../../lib/client';
import {
  ETAPAS_METRICAS,
  PERIODOS_METRICAS,
  NOMES_MES,
  DIAS_SEMANA_ABREV,
  TIER_DEFINICOES,
  formatarDataBrCurta,
  periodosIguais,
  tierInfoEtapa,
} from '../../lib/tiers';

function queryStringPeriodo(periodo) {
  const p = new URLSearchParams();
  p.set('tipo', periodo.tipo);
  if (periodo.tipo === 'dias') p.set('dias', String(periodo.dias));
  if (periodo.tipo === 'custom') { p.set('inicio', periodo.inicio); p.set('fim', periodo.fim); }
  return p.toString();
}

export default function Metricas() {
  const [periodo, setPeriodo] = useState({ tipo: 'tudo' });
  const [formCustomAberto, setFormCustomAberto] = useState(false);
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');

  const carregar = useCallback(async (periodoAlvo) => {
    setCarregando(true);
    setErroGeral('');
    try {
      const r = await fetch(`/api/metricas?${queryStringPeriodo(periodoAlvo)}`);
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setDados(body);
    } catch (e) {
      setErroGeral('Não consegui carregar as métricas agora. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(periodo); }, [carregar, periodo]);

  function escolherPeriodo(novo) {
    setFormCustomAberto(false);
    setPeriodo(novo);
  }

  function aplicarCustom() {
    if (!customInicio || !customFim) { window.alert('Preenche as duas datas.'); return; }
    if (customInicio > customFim) { window.alert('A data inicial não pode ser depois da final.'); return; }
    escolherPeriodo({ tipo: 'custom', inicio: customInicio, fim: customFim });
  }

  const m = (dados && dados.m) || {};
  const mMes = (dados && dados.mMes) || {};
  const sync = (dados && dados.sync) || {};
  const mesInfo = dados && dados.mesInfo;
  const historicoTierDia = (dados && dados.historicoTierDia) || [];

  const customAtivo = periodo.tipo === 'custom';
  const labelCustom = customAtivo
    ? `Personalizado (${formatarDataBrCurta(periodo.inicio)}–${formatarDataBrCurta(periodo.fim)})`
    : 'Personalizado';

  let notaPeriodo = '';
  if (periodo.tipo === 'hoje') {
    notaPeriodo = 'Filtrado por atividade de hoje (00:00 às 23:59:59, fuso de Fortaleza) — cada número conta o que aconteceu hoje, não só leads sourced hoje.';
  } else if (periodo.tipo === 'dias') {
    notaPeriodo = `Filtrado por atividade nos últimos ${periodo.dias} dia${periodo.dias === 1 ? '' : 's'} — cada número conta o que aconteceu nesse período (mensagem enviada, ligação feita, negócio criado/avançado), não só leads sourced nele.`;
  } else if (periodo.tipo === 'custom') {
    notaPeriodo = `Filtrado por atividade entre ${formatarDataBrCurta(periodo.inicio)} e ${formatarDataBrCurta(periodo.fim)} (dia cheio, fuso de Fortaleza) — mesma lógica dos presets, cada número conta o que aconteceu no intervalo.`;
  }

  const syncTexto = sync && sync.executado_em
    ? `Última sincronização de ligações: ${formatarDataHora(sync.executado_em)} (${sync.leads_ok || 0} leads verificados${sync.leads_erro ? `, ${sync.leads_erro} com erro` : ''})`
    : 'Ainda não rodou nenhuma sincronização automática de ligações.';

  const cartoesStatus = [
    { label: 'Não contatado ainda', valor: m.nao_contatado || 0, cor: '' },
    { label: 'Aguardando resposta (em cadência)', valor: m.aguardando_resposta || 0, cor: '' },
    { label: 'Contatos atrasados (passou o prazo, workflow não rodou)', valor: m.contatos_atrasados || 0, cor: 'aviso' },
    { label: 'Sem conexão (cadência esgotada)', valor: m.sem_conexao || 0, cor: 'alerta' },
    { label: 'Descartado (resposta negativa)', valor: m.descartado || 0, cor: 'alerta' },
  ];

  const porTier = {};
  historicoTierDia.forEach((d) => { porTier[d.tier_nome] = (porTier[d.tier_nome] || 0) + 1; });

  return (
    <div>
      <Cabecalho titulo="Painel SDR — Legare Gestão" sub="Métricas" />

      <div className="container">
        {erroGeral ? <div className="aviso" style={{ marginBottom: 14 }}>{erroGeral}</div> : null}

        {carregando && !dados ? (
          <div className="loading">Carregando métricas...</div>
        ) : !dados ? null : (
          <div className="metricas-wrap">
            <div className="tier-grid-wrap">
              <div className="tier-grid-titulo">Tiers do mês — {NOMES_MES[mesInfo.mes - 1]}/{mesInfo.ano}</div>
              <div className="tier-grid">
                {ETAPAS_METRICAS.map((etapa) => (
                  <TierCard key={etapa.key} label={etapa.label} info={tierInfoEtapa(mMes, etapa.key)} />
                ))}
              </div>
            </div>

            <div className="tier-grid-wrap">
              <div className="tier-grid-titulo">Histórico de tiers do dia — {NOMES_MES[mesInfo.mes - 1]}/{mesInfo.ano}</div>
              {historicoTierDia.length === 0 ? (
                <div className="field-value" style={{ color: 'var(--cor-texto-fraco)' }}>
                  Ainda não tem nenhum dia salvo esse mês (grava sozinho todo dia, perto da meia-noite).
                </div>
              ) : (
                <>
                  <div className="tier-historico-resumo">
                    {TIER_DEFINICOES.filter((t) => porTier[t.nome]).map((t) => (
                      <span key={t.nome} style={{ color: t.cor, marginRight: 10 }}>{porTier[t.nome]}x {t.nome}</span>
                    ))}
                  </div>
                  <table className="tier-historico-table">
                    <thead>
                      <tr><th>Dia</th><th>Elo</th><th>% tarefas</th><th>Concluídas</th><th>Reuniões</th></tr>
                    </thead>
                    <tbody>
                      {historicoTierDia.map((d) => {
                        const def = TIER_DEFINICOES[d.tier_idx] || TIER_DEFINICOES[0];
                        const [, mesNum, diaNum] = String(d.data).split('-');
                        const diaSemana = DIAS_SEMANA_ABREV[new Date(`${d.data}T12:00:00`).getDay()];
                        return (
                          <tr key={d.data}>
                            <td>{diaNum}/{mesNum} <span className="tier-historico-dia-semana">{diaSemana}</span></td>
                            <td>
                              <div className="tier-historico-elo">
                                <img src={def.img} alt={def.nome} />
                                <span style={{ color: def.cor }}>{def.nome}</span>
                              </div>
                            </td>
                            <td>{Number(d.percentual).toFixed(0)}%</td>
                            <td>{d.concluidas}/{d.total}</td>
                            <td>{d.reunioes_dia}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </>
              )}
            </div>

            <div className="metricas-cabecalho">
              <nav className="tab-group">
                {PERIODOS_METRICAS.map((p) => {
                  const alvo = p.tipo === 'dias' ? { tipo: 'dias', dias: p.dias } : { tipo: p.tipo };
                  const ativo = periodosIguais(periodo, alvo);
                  return (
                    <button key={p.label} className={`tab${ativo ? ' tab-active' : ''}`} onClick={() => escolherPeriodo(alvo)}>
                      {p.label}
                    </button>
                  );
                })}
                <button
                  className={`tab${customAtivo || formCustomAberto ? ' tab-active' : ''}`}
                  onClick={() => setFormCustomAberto((v) => !v)}
                >
                  {labelCustom}
                </button>
              </nav>
              <button className="btn btn-secondary" onClick={() => carregar(periodo)}>Atualizar</button>
            </div>

            {formCustomAberto ? (
              <div className="agendor-form" style={{ marginTop: 8, marginBottom: 12 }}>
                <div className="agendor-form-row">
                  <input type="date" className="agendor-input" value={customInicio} onChange={(e) => setCustomInicio(e.target.value)} />
                  <input type="date" className="agendor-input" value={customFim} onChange={(e) => setCustomFim(e.target.value)} />
                </div>
                <div className="actions" style={{ marginTop: 8 }}>
                  <button className="btn btn-agendor" onClick={aplicarCustom}>Aplicar</button>
                  <button className="btn" onClick={() => setFormCustomAberto(false)}>Cancelar</button>
                </div>
              </div>
            ) : null}

            {notaPeriodo ? <div className="metricas-nota">{notaPeriodo}</div> : null}

            <div className="funil-box">
              <GraficoFunil m={m} />
              <div className="funil-detalhes">
                {ETAPAS_METRICAS.map((etapa, idx) => {
                  const valor = m[etapa.key] || 0;
                  const anteriorKey = idx > 0 ? ETAPAS_METRICAS[idx - 1].key : null;
                  const anteriorValor = anteriorKey ? (m[anteriorKey] || 0) : null;
                  const taxaStr = anteriorValor !== null && anteriorValor > 0
                    ? `${((valor / anteriorValor) * 100).toFixed(0)}% da etapa anterior`
                    : (idx === 0 ? 'ponto de partida' : '—');
                  return (
                    <div className="funil-etapa" key={etapa.key}>
                      <div className="funil-etapa-label">{etapa.label}</div>
                      <div className="funil-etapa-numeros"><span className="funil-etapa-valor">{valor}</span>{taxaStr}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="metricas-cards">
              <div className="metrica-card">
                <div className="metrica-card-valor">{m.total_mensagens || 0}</div>
                <div className="metrica-card-label">Mensagens enviadas</div>
              </div>
              <div className="metrica-card">
                <div className="metrica-card-valor">{m.total_ligacoes || 0}</div>
                <div className="metrica-card-label">
                  Ligações realizadas <span className="metrica-card-sub">({m.ligacoes_atendidas || 0} atendidas)</span>
                </div>
              </div>
            </div>
            <div className="metricas-nota">{syncTexto} — roda sozinha, de hora em hora.</div>

            <div className="metricas-cards">
              {cartoesStatus.map((c) => (
                <div key={c.label} className={`metrica-card${c.cor ? ' metrica-' + c.cor : ''}`}>
                  <div className="metrica-card-valor">{c.valor}</div>
                  <div className="metrica-card-label">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="metricas-nota">
              &quot;Conectado&quot; e as etapas seguintes contam negócios criados/avançados, mesmo que o lead tenha sido descartado depois.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
