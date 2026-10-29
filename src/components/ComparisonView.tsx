import { TreatmentParams, WaterQuality, calculateTreatment } from '../simulation/treatment';
import { calculateEnergy } from '../simulation/energy';
import { INFLUENT_QUALITY } from '../simulation/treatment';

interface Props {
  currentParams: TreatmentParams;
  optimizedParams: TreatmentParams;
  onClose: () => void;
}

export function ComparisonView({ currentParams, optimizedParams, onClose }: Props) {
  const currentQuality = calculateTreatment(currentParams, INFLUENT_QUALITY);
  const optimizedQuality = calculateTreatment(optimizedParams, INFLUENT_QUALITY);
  const currentEnergy = calculateEnergy(currentParams);
  const optimizedEnergy = calculateEnergy(optimizedParams);

  const energySavings = currentEnergy.total > 0
    ? ((currentEnergy.total - optimizedEnergy.total) / currentEnergy.total * 100)
    : 0;
  const costSavings = currentEnergy.costPerDay - optimizedEnergy.costPerDay;
  const carbonSavings = currentEnergy.carbonPerDay - optimizedEnergy.carbonPerDay;

  const hasData = currentEnergy.total > 0 && optimizedEnergy.total > 0;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 12, 0.92)',
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
        maxWidth: 900,
        width: '92%',
        maxHeight: '88vh',
        overflowY: 'auto',
        border: '1px solid rgba(30, 60, 100, 0.5)',
        boxShadow: '0 24px 80px rgba(0, 0, 0, 0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, color: '#fff', fontWeight: 800 }}>
            Before vs After Optimization
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(30, 60, 100, 0.3)',
            border: '1px solid rgba(30, 60, 100, 0.5)',
            color: '#8ba3c0',
            borderRadius: 6,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 600,
          }}>
            Close
          </button>
        </div>

        {!hasData ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#5a8aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No optimization data available</div>
            <div style={{ fontSize: 11, marginTop: 6 }}>
              Click "Optimize Energy" first, then return to compare results.
            </div>
          </div>
        ) : (
          <>
            {/* Savings cards */}
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

            {/* Left vs Right comparison */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 1fr', gap: 0, marginBottom: 20 }}>
              {/* Before */}
              <div style={{
                background: 'rgba(232, 168, 56, 0.06)',
                borderRadius: '10px 0 0 10px',
                padding: 16,
                border: '1px solid rgba(232, 168, 56, 0.2)',
              }}>
                <div style={{
                  fontSize: 11,
                  color: '#e8a838',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  Before Optimization
                </div>
                <ParamRow label="Coagulant Dose" value={`${currentParams.coagulantDose.toFixed(0)} mg/L`} />
                <ParamRow label="Mix Intensity" value={`${(currentParams.mixingIntensity * 100).toFixed(0)}%`} />
                <ParamRow label="Aeration Rate" value={`${currentParams.aerationRate.toFixed(1)} m³/m³/h`} />
                <ParamRow label="Flow Rate" value={`${currentParams.flowRate.toFixed(0)} m³/h`} />
                <ParamRow label="Filter Loading" value={`${currentParams.filterLoadingRate.toFixed(1)} m/h`} />
                <ParamRow label="Target DO" value={`${currentParams.dissolvedOxygen.toFixed(1)} mg/L`} />
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(232, 168, 56, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}>
                  <span style={{ color: '#e8a838' }}>Energy</span>
                  <span style={{ color: '#e8a838', fontWeight: 800, fontFamily: 'monospace' }}>
                    {currentEnergy.total.toFixed(3)} kWh/m³
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
                  <span style={{ color: '#8ba3c0' }}>Effluent Turbidity</span>
                  <span style={{ color: '#8ba3c0', fontFamily: 'monospace' }}>
                    {currentQuality.afterAeration.turbidity.toFixed(1)} NTU
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2 }}>
                  <span style={{ color: '#8ba3c0' }}>Effluent BOD</span>
                  <span style={{ color: '#8ba3c0', fontFamily: 'monospace' }}>
                    {currentQuality.afterAeration.bod.toFixed(1)} mg/L
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(30, 60, 100, 0.2)',
                borderTop: '1px solid rgba(30, 60, 100, 0.3)',
                borderBottom: '1px solid rgba(30, 60, 100, 0.3)',
              }}>
                <span style={{ fontSize: 24, color: '#5ab4f5' }}>→</span>
              </div>

              {/* After */}
              <div style={{
                background: 'rgba(102, 187, 106, 0.06)',
                borderRadius: '0 10px 10px 0',
                padding: 16,
                border: '1px solid rgba(102, 187, 106, 0.2)',
              }}>
                <div style={{
                  fontSize: 11,
                  color: '#66bb6a',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 12,
                  textAlign: 'center',
                }}>
                  After Optimization
                </div>
                <ParamRow label="Coagulant Dose" value={`${optimizedParams.coagulantDose.toFixed(0)} mg/L`} />
                <ParamRow label="Mix Intensity" value={`${(optimizedParams.mixingIntensity * 100).toFixed(0)}%`} />
                <ParamRow label="Aeration Rate" value={`${optimizedParams.aerationRate.toFixed(1)} m³/m³/h`} />
                <ParamRow label="Flow Rate" value={`${optimizedParams.flowRate.toFixed(0)} m³/h`} />
                <ParamRow label="Filter Loading" value={`${optimizedParams.filterLoadingRate.toFixed(1)} m/h`} />
                <ParamRow label="Target DO" value={`${optimizedParams.dissolvedOxygen.toFixed(1)} mg/L`} />
                <div style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(102, 187, 106, 0.2)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 12,
                }}>
                  <span style={{ color: '#66bb6a' }}>Energy</span>
                  <span style={{ color: '#66bb6a', fontWeight: 800, fontFamily: 'monospace' }}>
                    {optimizedEnergy.total.toFixed(3)} kWh/m³
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 4 }}>
                  <span style={{ color: '#8ba3c0' }}>Effluent Turbidity</span>
                  <span style={{ color: '#8ba3c0', fontFamily: 'monospace' }}>
                    {optimizedQuality.afterAeration.turbidity.toFixed(1)} NTU
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 2 }}>
                  <span style={{ color: '#8ba3c0' }}>Effluent BOD</span>
                  <span style={{ color: '#8ba3c0', fontFamily: 'monospace' }}>
                    {optimizedQuality.afterAeration.bod.toFixed(1)} mg/L
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ParamRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 0',
      borderBottom: '1px solid rgba(30, 60, 100, 0.15)',
      fontSize: 11,
    }}>
      <span style={{ color: '#7a9ab8' }}>{label}</span>
      <span style={{ color: '#d0e0f0', fontFamily: 'monospace', fontWeight: 600 }}>{value}</span>
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
