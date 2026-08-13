'use client';

// Badges fixos no header (Tier do dia + Tier do mês), visíveis em qualquer tela - portado de
// renderTierDoDiaHeader/renderTierDoMesHeader do artefato original. Busca /api/tiers ao montar
// e a cada 60s (o original usava throttle de fetch sob demanda; aqui um intervalo simples cobre
// o mesmo objetivo sem complicar).
//
// Redesenhado em 13/08 (pedido do Iury: "quero que fique do jeito que está aqui no claude" —
// referência ao card grande do artefato original, .tier-dia-header/.tier-mes-header) - cada
// tier vira seu próprio card com borda, badge de 66px e nome em destaque, em vez do badge
// pequeno inline que tinha antes.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { calcularTierDia, calcularTierDoMes, textoProximoTierDia } from '../lib/tiers';

function BadgeSkeleton({ className }) {
  return <div className={`${className} tier-dia-header-vazio`} />;
}

export default function TierHeaderBadges() {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const r = await fetch('/api/tiers');
        const body = await r.json();
        if (ativo && body.ok) setDados(body);
      } catch {
        // badge do header não deve travar o resto do painel
      }
    }
    carregar();
    const id = setInterval(carregar, 60000);
    return () => { ativo = false; clearInterval(id); };
  }, []);

  if (!dados) {
    return (
      <div className="topo-com-tier-wrap">
        <BadgeSkeleton className="tier-dia-header" />
        <BadgeSkeleton className="tier-mes-header" />
      </div>
    );
  }

  const tierDia = calcularTierDia(dados.dia.percentual, dados.dia.reunioesHoje);
  const tierMes = calcularTierDoMes(dados.mMes);
  const contadorDia = textoProximoTierDia(dados.dia);

  return (
    <div className="topo-com-tier-wrap">
      <Link href="/inicio" className="tier-dia-header" title={`Tier do dia: ${tierDia.atual.nome} — clique pra ver detalhes`}>
        <div className="tier-dia-header-badge">
          <img src={tierDia.atual.img} alt={tierDia.atual.nome} />
        </div>
        <div className="tier-dia-header-texto">
          <div className="tier-dia-header-nome" style={{ color: tierDia.atual.cor }}>{tierDia.atual.nome}</div>
          <div className="tier-dia-header-sub">Tier do dia</div>
          <div className="tier-dia-header-contador">{contadorDia}</div>
        </div>
      </Link>

      <Link href="/inicio" className="tier-mes-header" title={`Tier do mês: ${tierMes.atual.nome} — clique pra ver detalhes`}>
        <div className="tier-dia-header-badge">
          <img src={tierMes.atual.img} alt={tierMes.atual.nome} />
        </div>
        <div className="tier-dia-header-texto">
          <div className="tier-dia-header-nome" style={{ color: tierMes.atual.cor }}>{tierMes.atual.nome}</div>
          <div className="tier-dia-header-sub">Tier do mês</div>
        </div>
      </Link>
    </div>
  );
}
