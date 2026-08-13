'use client';

import NavTopo from './NavTopo';

export default function Cabecalho({ titulo, sub, acoes }) {
  async function sair() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="topo">
      <div>
        <h1>{titulo}</h1>
        {sub ? <div className="sub">{sub}</div> : null}
        <NavTopo />
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        {acoes}
        <button className="btn" onClick={sair}>Sair</button>
      </div>
    </div>
  );
}
