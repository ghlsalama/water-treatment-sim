import { TreatmentParams } from '../simulation/treatment';
import { OptimizationResult } from '../simulation/engine';

interface Props {
  params: TreatmentParams;
  onParamChange: (key: keyof TreatmentParams, value: number) => void;
  onOptimize: () => void;
  onToggle: () => void;
  onReset: () => void;
  running: boolean;
  optimizedResult: OptimizationResult | null;
}

interface SliderConfig {
  key: keyof TreatmentParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  description: string;
  icon: string;
}

const SLIDERS: SliderConfig[] = [
  { key: 'flowRate', label: 'Flow Rate', min: 50, max: 200, step: 5, unit: 'm³/h', description: 'Influent flow rate', icon: '🌊' },
  { key: 'coagulantDose', label: 'Coagulant Dose', min: 5, max: 60, step: 1, unit: 'mg/L', description: 'Alum equivalent dose', icon: '🧪' },
  { key: 'mixingIntensity', label: 'Rapid Mix Intensity', min: 0.1, max: 1.0, step: 0.05, unit: '', description: 'Coagulation mixing energy', icon: '🌀' },
  { key: 'flocculationTime', label: 'Flocculation Time', min: 600, max: 3600, step: 60, unit: 's', description: 'Slow mix residence time', icon: '⏱' },
  { key: 'flocGrowthRate', label: 'Floc Growth Rate', min: 0.1, max: 0.8, step: 0.05, unit: '', description: 'Flocculation effectiveness', icon: '🔗' },
  { key: 'sedimentationEfficiency', label: 'Sedimentation Efficiency', min: 0.5, max: 0.98, step: 0.01, unit: '', description: 'Clarifier performance', icon: '⬇' },
  { key: 'filterLoadingRate', label: 'Filter Loading Rate', min: 4, max: 15, step: 0.5, unit: 'm/h', description: 'Filtration hydraulic loading', icon: '🔽' },
  { key: 'filterRemovalEfficiency', label: 'Filter Removal', min: 0.8, max: 0.99, step: 0.01, unit: '', description: 'Filter capture efficiency', icon: '🧹' },
  { key: 'aerationRate', label: 'Aeration Rate', min: 0.5, max: 6.0, step: 0.1, unit: 'm³/m³/h', description: 'Air supply rate', icon: '💨' },
  { key: 'oxygenTransferEfficiency', label: 'O₂ Transfer Efficiency', min: 0.1, max: 0.5, step: 0.01, unit: '', description: 'Aerator effectiveness', icon: '🫧' },
  { key: 'dissolvedOxygen', label: 'Target DO', min: 2, max: 10, step: 0.5, unit: 'mg/L', description: 'Dissolved oxygen target', icon: '⭕' },
];

export function ControlPanel({ params, onParamChange, onOptimize, onToggle, onReset, running, optimizedResult }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(13, 28, 50, 0.95) 0%, rgba(10, 22, 40, 0.95) 100%)',
      borderRadius: 10,
      padding: 14,
      border: '1px solid rgba(30, 60, 100, 0.5)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(100, 180, 255, 0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <span style={{ fontSize: 14 }}>🎛</span>
        <h3 style={{ margin: 0, fontSize: 11, color: '#5ab4f5', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
          Process Controls
        </h3>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          onClick={onToggle}
          style={{
            flex: 1,
            padding: '8px 14px',
            background: running
              ? 'linear-gradient(180deg, #c62828 0%, #a01818 100%)'
              : 'linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: running
              ? '0 2px 8px rgba(198, 40, 40, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 2px 8px rgba(46, 125, 50, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          {running ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button
          onClick={onReset}
          style={{
            flex: 1,
            padding: '8px 14px',
            background: 'linear-gradient(180deg, #1565c0 0%, #0d47a1 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(21, 101, 192, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          ↺ Reset
        </button>
        <button
          onClick={onOptimize}
          style={{
            flex: 1.5,
            padding: '8px 14px',
            background: 'linear-gradient(180deg, #ff8f00 0%, #e65100 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 800,
            boxShadow: '0 2px 12px rgba(255, 143, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        >
          ⚡ Optimize Energy
        </button>
      </div>

      {/* Optimized result banner */}
      {optimizedResult && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255, 143, 0, 0.12) 0%, rgba(230, 81, 0, 0.08) 100%)',
          border: '1px solid rgba(255, 143, 0, 0.35)',
          borderRadius: 8,
          padding: 10,
          marginBottom: 14,
          boxShadow: '0 0 20px rgba(255, 143, 0, 0.1)',
        }}>
          <div style={{ color: '#ff9800', fontWeight: 800, marginBottom: 6, fontSize: 12 }}>
            ⚡ Optimized Settings Applied
          </div>
          <div style={{ color: '#8ba3c0', lineHeight: 1.8, fontSize: 11 }}>
            <div>Energy: <span style={{ color: '#66bb6a', fontWeight: 700 }}>{optimizedResult.energy.total.toFixed(3)} kWh/m³</span></div>
            <div>Turbidity: <span style={{ color: '#66bb6a', fontWeight: 700 }}>{optimizedResult.quality.turbidity.toFixed(1)} NTU</span>
              {' · '}BOD: <span style={{ color: '#66bb6a', fontWeight: 700 }}>{optimizedResult.quality.bod.toFixed(1)} mg/L</span></div>
          </div>
        </div>
      )}

      {/* Sliders */}
      <div style={{ maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
        {SLIDERS.map(s => (
          <div key={s.key} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ color: '#7a9ab8', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12 }}>{s.icon}</span>
                <span title={s.description}>{s.label}</span>
              </span>
              <span style={{
                color: '#5ab4f5',
                fontFamily: 'monospace',
                fontWeight: 700,
                fontSize: 12,
                background: 'rgba(90, 180, 245, 0.1)',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                {params[s.key].toFixed(s.step < 0.1 ? 2 : s.step < 1 ? 1 : 0)}{s.unit}
              </span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={params[s.key]}
              onChange={e => onParamChange(s.key, parseFloat(e.target.value))}
              style={{
                width: '100%',
                height: 20,
                accentColor: '#5ab4f5',
                cursor: 'pointer',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
