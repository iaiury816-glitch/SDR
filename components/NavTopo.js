'use client';

// Menu de navegação, com botão pra esconder/mostrar (pedido do Iury) — mesmo padrão do
// artefato original: estado guardado no localStorage, então persiste entre reloads.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/inicio', label: 'Início' },
  { href: '/', label: 'Hoje' },
  { href: '/todos', label: 'Todos os leads' },
  { href: '/negocios', label: 'Negócios' },
  { href: '/metricas', label: 'Métricas' },
  { href: '/buscar-leads', label: 'Buscar leads' },
];

const LS_MENU_ESCONDIDO = 'sdrMenuEscondido';

export default function NavTopo() {
  const pathname = usePathname();
  const [escondido, setEscondido] = useState(false);

  useEffect(() => {
    try { setEscondido(localStorage.getItem(LS_MENU_ESCONDIDO) === '1'); } catch {}
  }, []);

  function alternar() {
    setEscondido((atual) => {
      const novo = !atual;
      try { localStorage.setItem(LS_MENU_ESCONDIDO, novo ? '1' : '0'); } catch {}
      return novo;
    });
  }

  return (
    <div className="nav-topo-wrap">
      <button className="sidebar-toggle" onClick={alternar} title={escondido ? 'Mostrar menu' : 'Esconder menu'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {escondido ? null : (
        <div className="nav-topo">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? ' nav-link-ativo' : ''}`}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
