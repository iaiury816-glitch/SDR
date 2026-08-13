'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'Hoje' },
  { href: '/todos', label: 'Todos os leads' },
  { href: '/negocios', label: 'Negócios' },
];

export default function NavTopo() {
  const pathname = usePathname();
  return (
    <div className="nav-topo">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`nav-link${pathname === l.href ? ' nav-link-ativo' : ''}`}>
          {l.label}
        </Link>
      ))}
    </div>
  );
}
