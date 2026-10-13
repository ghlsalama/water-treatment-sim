import { SimulationState } from '../simulation/engine';

interface Props {
  state: SimulationState;
}

function QualityGauge({ label, value, unit, target, max, color }: {
  label: string; value: number; unit: string; target?: string; max: number; color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: '#7a9ab8' }}>{label}</span>
        <span style={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{value.toFixed(1)} <span style={{ fontSize: 9, opacity: 0.7 }}>{unit}</span></span>
      </div>
      <div style={{
        height: 6,
        background: 'rgba(10, 25, 45, 0.8)',
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 3,
          transition: 'width 0.3s ease',
          boxShadow: `0 0 8px ${color}40`,
        }} />
      </div>
      {target && <div style={{ fontSize: 9, color: '#4a6a8a', marginTop: 2, textAlign: 'right' }}>{target}</div>}
    </div>
  );
}

function EnergyBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
        <span style={{ color: '#7a9ab8' }}>{label}</span>
        <span style={{ color, fontFamily: 'monospace', fontWeight: 600 }}>{value.toFixed(3)}</span>
      </div>
      <div style={{
        height: 4,
        background: 'rgba(10, 25, 45, 0.8)',
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}60, ${color})`,
          borderRadius: 2,
          transition: 'width 0.3s ease',
          boxShadow: `0 0 6px ${color}30`,
        }} />
      </div>
    </div>
  );
}

export function Dashboard({ state }: Props) {
  const { quality, energy, particleStats } = state;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Water Quality Panel */}
      <Panel title="Water Quality" icon="💧">
        <QualityGauge
          label="Influent Turbidity"
          value={quality.influent.turbidity}
          unit="NTU"
          max={60}
          color="#e8a838"
        />
        <QualityGauge
          label="Effluent Turbidity"
          value={quality.effluent.turbidity}
          unit="NTU"
          target="Target: < 5 NTU"
          max={60}
          color="#66bb6a"
        />
        <QualityGauge
          label="Effluent BOD"
          value={quality.effluent.bod}
          unit="mg/L"
          target="Target: < 25 mg/L"
          max={200}
          color="#42a5f5"
        />
        <QualityGauge
          label="Dissolved Oxygen"
          value={quality.effluent.dissolvedOxygen}
          unit="mg/L"
          target="Target: > 4 mg/L"
          max={12}
          color="#26a69a"
        />
        <QualityGauge
          label="Suspended Solids"
          value={quality.effluent.suspendedSolids}
          unit="mg/L"
          max={150}
          color="#ab47bc"
        />
      </Panel>

      {/* Energy Panel */}
      <Panel title="Energy Consumption" icon="⚡" subtitle="kWh/m³">
        <EnergyBar label="Aeration" value={energy.aeration} max={3} color="#42a5f5" />
        <EnergyBar label="Pumping" value={energy.pumping} max={1} color="#66bb6a" />
        <EnergyBar label="Coagulation" value={energy.coagulation} max={0.5} color="#e8a838" />
        <EnergyBar label="Filtration" value={energy.filtration} max={0.5} color="#26a69a" />
        <EnergyBar label="Flocculation" value={energy.flocculation} max={0.5} color="#d4782e" />
        <EnergyBar label="Chemical" value={energy.chemical} max={0.5} color="#ab47bc" />
        <EnergyBar label="Sedimentation" value={energy.sedimentation} max={0.5} color="#7cb342" />
        <div style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid rgba(30, 60, 100, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Total</span>
          <span style={{
            color: '#ff9800',
            fontWeight: 800,
            fontSize: 18,
            fontFamily: 'monospace',
            textShadow: '0 0 20px rgba(255, 152, 0, 0.3)',
          }}>
            {energy.total.toFixed(3)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a6a8a', marginTop: 6 }}>
          <span>£{energy.costPerDay.toFixed(0)}/day</span>
          <span>{energy.carbonPerDay.toFixed(0)} kg CO₂/day</span>
        </div>
      </Panel>

      {/* Treatment Stages */}
      <Panel title="Treatment Stages" icon="🔄">
        {[
          { name: 'Coag', from: quality.influent.turbidity, to: quality.afterCoagulation.turbidity, max: 60 },
          { name: 'Floc', from: quality.afterCoagulation.turbidity, to: quality.afterFlocculation.turbidity, max: 60 },
          { name: 'Sed', from: quality.afterFlocculation.turbidity, to: quality.afterSedimentation.turbidity, max: 60 },
          { name: 'Filt', from: quality.afterSedimentation.turbidity, to: quality.afterFiltration.turbidity, max: 60 },
          { name: 'Aer', from: quality.afterFiltration.bod, to: quality.effluent.bod, max: 200, unit: 'BOD' },
        ].map(stage => (
          <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
            <span style={{
              width: 32,
              color: '#5ab4f5',
              fontWeight: 600,
              fontSize: 10,
              textTransform: 'uppercase',
            }}>{stage.name}</span>
            <span style={{ color: '#6a8aaa', fontFamily: 'monospace' }}>{stage.from.toFixed(1)}</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(30, 60, 100, 0.5)', position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: 0, right: 0, top: '50%',
                height: 1,
                background: 'linear-gradient(90deg, #3a6a9a, #5ab4f5)',
                transform: 'translateY(-50%)',
              }} />
            </div>
            <span style={{ color: '#3a6a9a' }}>→</span>
            <span style={{ color: '#66bb6a', fontFamily: 'monospace', fontWeight: 700 }}>{stage.to.toFixed(1)}</span>
            <span style={{ color: '#3a5a7a', marginLeft: 'auto', fontSize: 9 }}>{stage.unit || 'NTU'}</span>
          </div>
        ))}
      </Panel>

      {/* Particle Stats */}
      <Panel title="Particle Tracking" icon="🔬">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <ParticleStat color="#c4a060" label="Solids" count={particleStats.solids} />
          <ParticleStat color="#a0783c" label="Flocs" count={particleStats.flocs} />
          <ParticleStat color="#96d2ff" label="Bubbles" count={particleStats.bubbles} />
          <ParticleStat color="#6a8aaa" label="Settled" count={particleStats.settled} />
        </div>
      </Panel>
    </div>
  );
}

function Panel({ title, icon, subtitle, children }: {
  title: string; icon: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(13, 28, 50, 0.95) 0%, rgba(10, 22, 40, 0.95) 100%)',
      borderRadius: 10,
      padding: 14,
      border: '1px solid rgba(30, 60, 100, 0.5)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(100, 180, 255, 0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 11, color: '#5ab4f5', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
          {title}
        </h3>
        {subtitle && <span style={{ fontSize: 9, color: '#4a6a8a', marginLeft: 'auto' }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function ParticleStat({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div style={{
      background: 'rgba(8, 18, 35, 0.6)',
      borderRadius: 6,
      padding: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <div style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}60`,
      }} />
      <div>
        <div style={{ fontSize: 9, color: '#6a8aaa' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: 'monospace' }}>{count}</div>
      </div>
    </div>
  );
}
