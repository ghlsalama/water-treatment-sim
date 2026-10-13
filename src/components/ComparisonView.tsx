import { TreatmentParams, WaterQuality, calculateTreatment } from '../simulation/treatment';
import { calculateEnergy } from '../simulation/energy';
import { INFLUENT_QUALITY } from '../simulation/treatment';

interface Props {
  currentParams: TreatmentParams;
  optimizedParams: TreatmentParams;
  onClose: () => void;
}

/**
 * ComparisonView shows a side-by-side comparison of current vs optimized parameters,
 * with energy savings, quality improvements, and cost reductions highlighted.
 * This is the key selling point for the demo - showing tangible engineering value.
 */
export function ComparisonView({ currentParams, optimizedParams, onClose }: Props) {
  const currentQuality = calculateTreatment(currentParams, INFLUENT_QUALITY);
  const optimizedQuality = calculateTreatment(optimizedParams, INFLUENT_QUALITY);
  const currentEnergy = calculateEnergy(currentParams);
  const optimizedEnergy = calculateEnergy(optimizedParams);

  const energySavings = ((currentEnergy.total - optimizedEnergy.total) / currentEnergy.total * 100);
  const costSavings = currentEnergy.costPerDay - optimizedEnergy.costPerDay;
  const carbonSavings = currentEnergy.carbonPerDay - optimizedEnergy.carbonPerDay;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(2, 6, 12, 0.9)',
      backdropFilter: 'blur(12px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        background: 'linear-gradient(180deg, #0d1f35 0%, #0a1830 100%)',
        borderRadius: 16,
        padding: 24,
        maxWidth: 800,
        width: '90%',
        maxHeight: '85vh',
        overflowY: 'auto',
        border: '1px solid rgba(30, 60, 100, 0.5)',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 800 }}>
            Optimization Results
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(30, 60, 100, 0.3)',
              border: '1px solid rgba(30, 60, 100, 0.5)',
              color: '#8ba3c0',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            Close
          </button>
        </div>

        {/* Savings highlight cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <SavingsCard
            label="Energy Savings"
            value={`${energySavings.toFixed(1)}%`}
            subtext={`${currentEnergy.total.toFixed(3)} → ${optimizedEnergy.total.toFixed(3)} kWh/m³`}
            color="#ff9800"
          />
          <SavingsCard
            label="Cost Savings"
            value={`£${costSavings.toFixed(0)}/day`}
            subtext={`£${(costSavings * 365).toFixed(0)}/year`}
            color="#66bb6a"
          />
          <SavingsCard
            label="CO₂ Reduction"
            value={`${carbonSavings.toFixed(0)} kg/day`}
            subtext={`${(carbonSavings * 365 / 1000).toFixed(1)} tonnes/year`}
            color="#42a5f5"
          />
        </div>

        {/* Detailed comparison table */}
        <div style={{
          background: 'rgba(8, 18, 35, 0.6)',
          borderRadius: 10,
          padding: 16,
          border: '1px solid rgba(30, 60, 100, 0.3)',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, color: '#5ab4f5', textTransform: 'uppercase', letterSpacing: 1 }}>
            Parameter Changes
          </h3>
          {[
            { label: 'Coagulant Dose', key: 'coagulantDose' as const, unit: 'mg/L' },
            { label: 'Mix Intensity', key: 'mixingIntensity' as const, unit: '%', scale: 100 },
            { label: 'Aeration Rate', key: 'aerationRate' as const, unit: 'm³/m³/h' },
            { label: 'Flow Rate', key: 'flowRate' as const, unit: 'm³/h' },
            { label: 'Filter Loading', key: 'filterLoadingRate' as const, unit: 'm/h' },
          ].map(row => {
            const current = currentParams[row.key];
            const optimized = optimizedParams[row.key];
            const displayCurrent = row.scale ? current * row.scale : current;
            const displayOptimized = row.scale ? optimized * row.scale : optimized;
            const changed = Math.abs(current - optimized) > 0.01;
            return (
              <div key={row.key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 0',
                borderBottom: '1px solid rgba(30, 60, 100, 0.2)',
                fontSize: 11,
              }}>
                <span style={{ color: '#7a9ab8' }}>{row.label}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#8ba3c0', fontFamily: 'monospace' }}>
                    {displayCurrent.toFixed(1)}{row.unit}
                  </span>
                  {changed && (
                    <>
                      <span style={{ color: '#4a6a8a' }}>→</span>
                      <span style={{ color: '#66bb6a', fontFamily: 'monospace', fontWeight: 700 }}>
                        {displayOptimized.toFixed(1)}{row.unit}
                      </span>
                      <span style={{
                        color: optimized < current ? '#66bb6a' : '#ff9800',
                        fontSize: 9,
                        fontWeight: 700,
                      }}>
                        {optimized < current ? '↓' : '↑'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Water quality comparison */}
        <div style={{
          background: 'rgba(8, 18, 35, 0.6)',
          borderRadius: 10,
          padding: 16,
          marginTop: 12,
          border: '1px solid rgba(30, 60, 100, 0.3)',
        }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 12, color: '#5ab4f5', textTransform: 'uppercase', letterSpacing: 1 }}>
            Water Quality Impact
          </h3>
          {[
            { label: 'Effluent Turbidity', current: currentQuality.afterAeration.turbidity, optimized: optimizedQuality.afterAeration.turbidity, unit: 'NTU', max: 20 },
            { label: 'Effluent BOD', current: currentQuality.afterAeration.bod, optimized: optimizedQuality.afterAeration.bod, unit: 'mg/L', max: 50 },
            { label: 'Dissolved Oxygen', current: currentQuality.afterAeration.dissolvedOxygen, optimized: optimizedQuality.afterAeration.dissolvedOxygen, unit: 'mg/L', max: 10 },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                <span style={{ color: '#7a9ab8' }}>{row.label}</span>
                <span style={{ color: '#8ba3c0', fontFamily: 'monospace' }}>
                  {row.current.toFixed(1)} → <span style={{ color: '#66bb6a' }}>{row.optimized.toFixed(1)}</span> {row.unit}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                <div style={{
                  height: 4,
                  background: 'rgba(30, 60, 100, 0.3)',
                  borderRadius: 2,
                  flex: 1,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, row.current / row.max * 100)}%`,
                    background: '#e8a838',
                    borderRadius: 2,
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: 0, top: 0, bottom: 0,
                    width: `${Math.min(100, row.optimized / row.max * 100)}%`,
                    background: '#66bb6a',
                    borderRadius: 2,
                    opacity: 0.6,
                  }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SavingsCard({ label, value, subtext, color }: {
  label: string; value: string; subtext: string; color: string;
}) {
  return (
    <div style={{
      background: `linear-gradient(180deg, ${color}12 0%, ${color}05 100%)`,
      borderRadius: 10,
      padding: 14,
      textAlign: 'center',
      border: `1px solid ${color}30`,
    }}>
      <div style={{ fontSize: 9, color: '#4a6a8a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{
        fontSize: 22,
        fontWeight: 800,
        color,
        fontFamily: 'monospace',
        textShadow: `0 0 12px ${color}40`,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: '#4a6a8a', marginTop: 4 }}>{subtext}</div>
    </div>
  );
}
