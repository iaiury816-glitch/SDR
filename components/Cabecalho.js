'use client';

import NavTopo from './NavTopo';
import AlarmeTarefas from './AlarmeTarefas';
import TierHeaderBadges from './TierHeaderBadges';
import ControleFoco from './ControleFoco';
import BannerPausaCadencia from './BannerPausaCadencia';

export default function Cabecalho({ titulo, sub, acoes }) {
  async function sair() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <>
      <BannerPausaCadencia />
      <div className="topo">
        <div>
          <h1>{titulo}</h1>
          {sub ? <div className="sub">{sub}</div> : null}
          <NavTopo />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <TierHeaderBadges />
          <ControleFoco />
          {acoes}
          <AlarmeTarefas />
          <button className="btn" onClick={sair}>Sair</button>
        </div>
      </div>
    </>
  );
}
