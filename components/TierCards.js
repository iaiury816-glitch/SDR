// Peças visuais do sistema de tiers (badges/cards), reaproveitadas pelo header (Cabecalho),
// pela tela Início e pela tela Métricas. Portado de renderTierCard/renderTierCardGrande do
// artefato original.
import { formatarProgressoTier } from '../lib/tiers';

export function TierCard({ label, info }) {
  const { atual } = info;
  const { valorStr, progresso } = formatarProgressoTier(info);
  return (
    <div className="tier-card">
      <div className="tier-badge-sm" title={atual.nome}>
        <img src={atual.img} alt={atual.nome} />
      </div>
      <div className="tier-info-sm">
        <div className="tier-card-label">{label}</div>
        <div className="tier-nome-sm" style={{ color: atual.cor }}>{atual.nome}</div>
        <div className="tier-progresso-sm">{valorStr} — {progresso}</div>
      </div>
    </div>
  );
}

export function TierCardGrande({ label, info }) {
  const { atual } = info;
  const { valorStr, progresso } = formatarProgressoTier(info);
  return (
    <div className="tier-card-grande">
      <div className="tier-badge-grande" title={atual.nome}>
        <img src={atual.img} alt={atual.nome} />
      </div>
      <div className="tier-info-grande">
        <div className="tier-card-label-grande">{label}</div>
        <div className="tier-nome-grande" style={{ color: atual.cor }}>{atual.nome}</div>
        <div className="tier-progresso-grande">{valorStr} — {progresso}</div>
      </div>
    </div>
  );
}
