import { Droplets, TrendingUp, Waves, Users } from 'lucide-react';

function FormulaPillar({ icon, title, weight, desc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        <span className="card-label" style={{ color: 'var(--text-primary)' }}>{title}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--glass-bg)', padding: '2px 6px', borderRadius: '4px' }}>{weight}</span>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

export default function FormulaExplanation({ showFormulaInfo }) {
  if (!showFormulaInfo) return null;

  return (
    <div className="glass-card" style={{ padding: '32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', border: '1px solid var(--accent-blue)40' }}>
      <FormulaPillar icon={<Droplets color="var(--accent-blue)" />} title="Rainfall Deficit (RDI)" weight="35%" desc="Compares current 30-day precip vs 10yr historical baseline for this month." />
      <FormulaPillar icon={<TrendingUp color="var(--accent-amber)" />} title="Dry Streak (CDD)" weight="20%" desc="Measures consecutive days <1mm rain and total dry frequency streak." />
      <FormulaPillar icon={<Waves color="var(--accent-cyan)" />} title="Soil Anomaly (SMA)" weight="30%" desc="Deviation from expected soil moisture based on annual rainfall class." />
      <FormulaPillar icon={<Users color="#8b5cf6" />} title="Pop. Demand (PPA)" weight="10%" desc="Modeled water supply vs population demand (WHO 55L/day standard)." />
    </div>
  );
}
