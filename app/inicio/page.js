'use client';

import { useEffect, useState, useCallback } from 'react';
import Cabecalho from '../../components/Cabecalho';
import { TierCardGrande } from '../../components/TierCards';
import { ETAPAS_METRICAS, NOMES_MES, calcularTierDoMes, tierInfoEtapa } from '../../lib/tiers';

export default function Inicio() {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroGeral('');
    try {
      const r = await fetch('/api/tiers');
      const body = await r.json();
      if (!body.ok) throw new Error(body.erro);
      setDados(body);
    } catch (e) {
      setErroGeral('Não consegui carregar os tiers agora. ' + ((e && e.message) || ''));
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const tierMes = dados ? calcularTierDoMes(dados.mMes) : null;

  return (
    <div>
      <Cabecalho
        titulo="Painel SDR — Legare Gestão"
        sub="Início"
        acoes={<button className="btn" onClick={carregar}>Atualizar</button>}
      />

      <div className="container">
        {erroGeral ? <div className="aviso" style={{ marginBottom: 14 }}>{erroGeral}</div> : null}

        {carregando ? (
          <div className="loading">Carregando tiers...</div>
        ) : !dados ? null : (
          <>
            <div className="tier-dia-wrap">
              <div className="tier-grid-titulo">
                Tier do mês (geral) <span className="metrica-card-sub">(média ponderada das 8 etapas — Fechamento pesa 3x, as demais 1x cada)</span>
              </div>
              <div className="tier-card-grande tier-card-dia">
                <div className="tier-badge-grande" title={tierMes.atual.nome}>
                  <img src={tierMes.atual.img} alt={tierMes.atual.nome} />
                </div>
                <div className="tier-info-grande">
                  <div className="tier-nome-grande" style={{ color: tierMes.atual.cor }}>{tierMes.atual.nome}</div>
                  <div className="tier-progresso-grande">
                    {tierMes.detalhes
                      .map((d) => `${d.etapa.label}: ${d.info.atual.nome}${d.peso > 1 ? ` (peso ${d.peso}x)` : ''}`)
                      .join(' · ')}
                  </div>
                </div>
              </div>
            </div>

            <div className="tier-grid-wrap tier-grid-wrap-grande" style={{ marginTop: 20 }}>
              <div className="tier-grid-titulo">Tiers do mês — {NOMES_MES[dados.mesInfo.mes - 1]}/{dados.mesInfo.ano}</div>
              <div className="tier-grid-grande">
                {ETAPAS_METRICAS.map((etapa) => (
                  <TierCardGrande key={etapa.key} label={etapa.label} info={tierInfoEtapa(dados.mMes, etapa.key)} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
