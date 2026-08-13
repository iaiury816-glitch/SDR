'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

const ETAPAS = [
  { chave: '1', label: 'Dia 1' },
  { chave: '3', label: 'Dia 03' },
  { chave: '5', label: 'Dia 05' },
  { chave: '7', label: 'Dia 07' },
  { chave: '10', label: 'Dia 10' },
];

// Barra de cadência: total de leads em cada etapa do follow-up (Dia 1/03/05/07/10)
// + descartados, igual ao painel antigo. Cada pill é um link — clicar leva pra
// "Todos os leads" já filtrado naquela etapa (ou pra "Hoje" no caso do 1º pill).
export default function BarraCadencia({ statsCounts }) {
  const [statsProprio, setStatsProprio] = useState({});
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const etapaAtiva = searchParams.get('etapa');
  const statusAtivo = searchParams.get('status');
  const stats = statsCounts || statsProprio;

  useEffect(() => {
    if (statsCounts) return; // já veio pronto do componente pai, não busca de novo
    let cancelado = false;
    fetch('/api/hoje')
      .then((r) => r.json())
      .then((body) => { if (!cancelado && body.ok) setStatsProprio(body.statsCounts || {}); })
      .catch(() => {});
    return () => { cancelado = true; };
  }, [statsCounts]);

  return (
    <div className="stats-bar">
      <Link
        href="/"
        className={`stat-pill${pathname === '/' ? ' stat-pill-ativo' : ''}`}
      >
        <b>{stats.hoje ?? '—'}</b>
        <span className="stat-pill-label">Tarefas do dia</span>
      </Link>
      {ETAPAS.map((e) => (
        <Link
          key={e.chave}
          href={`/todos?etapa=${e.chave}`}
          className={`stat-pill${etapaAtiva === e.chave ? ' stat-pill-ativo' : ''}`}
        >
          <b>{stats[e.chave] ?? 0}</b>
          <span className="stat-pill-label">{e.label}</span>
        </Link>
      ))}
      <Link
        href="/todos?status=descartados"
        className={`stat-pill${statusAtivo === 'descartados' ? ' stat-pill-ativo' : ''}`}
      >
        <b>{stats.descartado ?? 0}</b>
        <span className="stat-pill-label">Descartados</span>
      </Link>
    </div>
  );
}
