'use client';

// Badges fixos no header (Tier do dia + Tier do mês), visíveis em qualquer tela - portado de
// renderTierDoDiaHeader/renderTierDoMesHeader do artefato original. Busca /api/tiers ao montar
// e a cada 60s (o original usava throttle de fetch sob demanda; aqui um intervalo simples cobre
// o mesmo objetivo sem complicar).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { calcularTierDia, calcularTierDoMes } from '../lib/tiers';

function BadgeSkeleton() {
  return <div className="tier-dia-header-badge tier-dia-header-badge-vazio" />;
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
      <div className="tier-header-badges">
        <BadgeSkeleton />
        <BadgeSkeleton />
      </div>
    );
  }

  const tierDia = calcularTierDia(dados.dia.percentual, dados.dia.reunioesHoje);
  const tierMes = calcularTierDoMes(dados.mMes);

  return (
    <Link href="/inicio" className="tier-header-badges" title="Ver detalhes na aba Início">
      <div className="tier-dia-header-badge" title={`Tier do dia: ${tierDia.atual.nome}`}>
        <img src={tierDia.atual.img} alt={tierDia.atual.nome} />
      </div>
      <div className="tier-dia-header-texto">
        <div className="tier-dia-header-nome" style={{ color: tierDia.atual.cor }}>{tierDia.atual.nome}</div>
        <div className="tier-dia-header-sub">Tier do dia</div>
      </div>

      <div className="tier-dia-header-badge" title={`Tier do mês: ${tierMes.atual.nome}`}>
        <img src={tierMes.atual.img} alt={tierMes.atual.nome} />
      </div>
      <div className="tier-dia-header-texto">
        <div className="tier-dia-header-nome" style={{ color: tierMes.atual.cor }}>{tierMes.atual.nome}</div>
        <div className="tier-dia-header-sub">Tier do mês</div>
      </div>
    </Link>
  );
}
