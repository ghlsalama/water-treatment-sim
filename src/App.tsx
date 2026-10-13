import { useState, useEffect, useRef, useCallback } from 'react';
import { SimulationEngine, SimulationState, OptimizationResult } from './simulation/engine';
import { SimulationCanvas } from './components/SimulationCanvas';
import { Dashboard } from './components/Dashboard';
import { ControlPanel } from './components/ControlPanel';
import { SensorOverlay } from './components/SensorOverlay';
import { ComparisonView } from './components/ComparisonView';
import { AIAssistant } from './components/AIAssistant';
import { ExportButton } from './components/ExportButton';
import { TreatmentParams } from './simulation/treatment';
import { optimizeEnergy } from './simulation/energy';
import { INFLUENT_QUALITY } from './simulation/treatment';

export default function App() {
  const engineRef = useRef<SimulationEngine | null>(null);
  const [state, setState] = useState<SimulationState | null>(null);
  const [optimizedResult, setOptimizedResult] = useState<OptimizationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'controls'>('dashboard');
  const [showComparison, setShowComparison] = useState(false);
  const [optimizedParams, setOptimizedParams] = useState<TreatmentParams | null>(null);

  if (!engineRef.current) {
    engineRef.current = new SimulationEngine();
  }

  useEffect(() => {
    const engine = engineRef.current!;
    let animFrame: number;
    const loop = () => {
      engine.step();
      setState(engine.getState());
      animFrame = requestAnimationFrame(loop);
    };
    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const handleParamChange = useCallback((key: keyof TreatmentParams, value: number) => {
    engineRef.current!.setParams({ [key]: value });
    setOptimizedResult(null);
  }, []);

  const handleOptimize = useCallback(() => {
    const engine = engineRef.current!;
    const result = optimizeEnergy(
      engine.params,
      { maxTurbidity: 5, maxBod: 25, minDO: 4 },
      { turbidity: INFLUENT_QUALITY.turbidity, bod: INFLUENT_QUALITY.bod }
    );
    setOptimizedParams({ ...engine.params });
    engine.setParams(result.params);
    setOptimizedResult(result);
  }, []);

  const handleToggle = useCallback(() => {
    engineRef.current!.toggleRunning();
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current!.reset();
    setOptimizedResult(null);
    setOptimizedParams(null);
  }, []);

  if (!state) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #040a14 0%, #060e1a 50%, #040a14 100%)',
      color: '#d0e0f0',
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, rgba(10, 22, 40, 0.98) 0%, rgba(13, 34, 64, 0.98) 100%)',
        borderBottom: '1px solid rgba(30, 60, 100, 0.6)',
        padding: '18px 28px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, color: '#fff', fontWeight: 800, letterSpacing: -0.5 }}>
              <span style={{
                background: 'linear-gradient(135deg, #5ab4f5 0%, #3498db 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Arcadis</span>
              <span style={{ color: '#8ba3c0', fontWeight: 400, marginLeft: 8 }}>Water Treatment</span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#4a6a8a', letterSpacing: 0.3 }}>
              Energy Optimization Demo · Live Process Simulation
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <ExportButton state={state} />
            <button
              onClick={() => setShowComparison(true)}
              style={{
                padding: '6px 14px',
                background: optimizedParams
                  ? 'linear-gradient(180deg, rgba(46, 125, 50, 0.3) 0%, rgba(46, 125, 50, 0.15) 100%)'
                  : 'rgba(30, 60, 100, 0.2)',
                color: optimizedParams ? '#66bb6a' : '#4a6a8a',
                border: `1px solid ${optimizedParams ? 'rgba(46, 125, 50, 0.4)' : 'rgba(30, 60, 100, 0.4)'}`,
                borderRadius: 6,
                cursor: optimizedParams ? 'pointer' : 'not-allowed',
                fontSize: 10,
                fontWeight: 700,
              }}
            >
              Compare
            </button>
            <StatusPill
              active={state.running}
              label={state.running ? 'LIVE' : 'PAUSED'}
              color={state.running ? '#66bb6a' : '#ef5350'}
            />
            <div style={{
              padding: '5px 12px',
              borderRadius: 14,
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(90, 180, 245, 0.08)',
              color: '#5ab4f5',
              border: '1px solid rgba(90, 180, 245, 0.2)',
              fontFamily: 'monospace',
            }}>
              t = {state.time.toFixed(1)}s
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 28px' }}>
        {/* Simulation canvas with overlays */}
        <div style={{ marginBottom: 20, position: 'relative' }}>
          <SimulationCanvas engine={engineRef.current} />
          <SensorOverlay state={state} />
          <AIAssistant state={state} />
        </div>

        {/* Bottom panels */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 20,
        }}>
          {/* Left: Tabbed panels */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 0 }}>
              {(['dashboard', 'controls'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 20px',
                    background: activeTab === tab
                      ? 'linear-gradient(180deg, rgba(26, 58, 95, 0.95) 0%, rgba(20, 45, 75, 0.95) 100%)'
                      : 'rgba(13, 28, 50, 0.6)',
                    color: activeTab === tab ? '#5ab4f5' : '#4a6a8a',
                    border: '1px solid rgba(30, 60, 100, 0.5)',
                    borderBottom: activeTab === tab ? 'none' : '1px solid rgba(30, 60, 100, 0.5)',
                    borderRadius: '8px 8px 0 0',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {tab === 'dashboard' ? 'Dashboard' : 'Controls'}
                </button>
              ))}
            </div>

            <div style={{
              background: 'rgba(13, 28, 50, 0.5)',
              borderRadius: '0 8px 8px 8px',
              border: '1px solid rgba(30, 60, 100, 0.5)',
              padding: 16,
            }}>
              {activeTab === 'dashboard' ? (
                <Dashboard state={state} />
              ) : (
                <ControlPanel
                  params={state.params}
                  onParamChange={handleParamChange}
                  onOptimize={handleOptimize}
                  onToggle={handleToggle}
                  onReset={handleReset}
                  running={state.running}
                  optimizedResult={optimizedResult}
                />
              )}
            </div>
          </div>

          {/* Right: Quick info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: 'linear-gradient(180deg, rgba(13, 28, 50, 0.95) 0%, rgba(10, 22, 40, 0.95) 100%)',
              borderRadius: 10,
              padding: 14,
              border: '1px solid rgba(30, 60, 100, 0.5)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(100, 180, 255, 0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 11, color: '#5ab4f5', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                  Key Metrics
                </h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <MetricCard
                  label="Energy Intensity"
                  value={state.energy.total.toFixed(3)}
                  unit="kWh/m³"
                  color="#ff9800"
                  glow="rgba(255, 152, 0, 0.15)"
                />
                <MetricCard
                  label="BOD Removal"
                  value={`${(state.treatmentResults.overallRemovalEfficiency * 100).toFixed(1)}`}
                  unit="%"
                  color="#66bb6a"
                  glow="rgba(102, 187, 106, 0.15)"
                />
                <MetricCard
                  label="Daily Cost"
                  value={`£${state.energy.costPerDay.toFixed(0)}`}
                  unit=""
                  color="#42a5f5"
                  glow="rgba(66, 165, 245, 0.15)"
                />
                <MetricCard
                  label="CO₂ Emissions"
                  value={state.energy.carbonPerDay.toFixed(0)}
                  unit="kg/day"
                  color="#ab47bc"
                  glow="rgba(171, 71, 188, 0.15)"
                />
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(180deg, rgba(13, 28, 50, 0.95) 0%, rgba(10, 22, 40, 0.95) 100%)',
              borderRadius: 10,
              padding: 14,
              border: '1px solid rgba(30, 60, 100, 0.5)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(100, 180, 255, 0.05)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 11, color: '#5ab4f5', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                  Treatment Train
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, flexWrap: 'wrap' }}>
                {['Inflow', 'Coag', 'Floc', 'Sed', 'Filt', 'Aer', 'Effluent'].map((stage, i, arr) => (
                  <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: ['#4a90d9', '#e8a838', '#d4782e', '#7cb342', '#26a69a', '#42a5f5', '#66bb6a'][i] + '18',
                      color: ['#4a90d9', '#e8a838', '#d4782e', '#7cb342', '#26a69a', '#42a5f5', '#66bb6a'][i],
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      fontSize: 9,
                      border: `1px solid ${['#4a90d9', '#e8a838', '#d4782e', '#7cb342', '#26a69a', '#42a5f5', '#66bb6a'][i]}30`,
                    }}>
                      {stage}
                    </span>
                    {i < arr.length - 1 && <span style={{ color: '#2a4a6a', fontSize: 10 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 28, 50, 0.95) 0%, rgba(26, 45, 69, 0.95) 100%)',
              borderRadius: 10,
              padding: 14,
              border: '1px solid rgba(30, 60, 100, 0.5)',
              textAlign: 'center',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}>
              <div style={{
                fontSize: 11,
                color: '#5a7a9a',
                marginBottom: 6,
                letterSpacing: 0.5,
              }}>
                Sustainable Design · Engineering · Consultancy
              </div>
              <div style={{
                fontSize: 10,
                color: '#3a5a7a',
                fontStyle: 'italic',
              }}>
                "Improving Quality of Life"
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Comparison modal */}
      {showComparison && optimizedParams && (
        <ComparisonView
          currentParams={state.params}
          optimizedParams={optimizedParams}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

function StatusPill({ active, label, color }: { active: boolean; label: string; color: string }) {
  return (
    <span style={{
      padding: '5px 14px',
      borderRadius: 14,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1,
      background: active ? 'rgba(46, 125, 50, 0.15)' : 'rgba(198, 40, 40, 0.15)',
      color: color,
      border: `1px solid ${active ? 'rgba(46, 125, 50, 0.4)' : 'rgba(198, 40, 40, 0.4)'}`,
      boxShadow: active ? '0 0 12px rgba(46, 125, 50, 0.2)' : '0 0 12px rgba(198, 40, 40, 0.2)',
    }}>
      {active ? '●' : '○'} {label}
    </span>
  );
}

function MetricCard({ label, value, unit, color, glow }: {
  label: string; value: string; unit: string; color: string; glow: string;
}) {
  return (
    <div style={{
      background: `linear-gradient(180deg, rgba(8, 18, 35, 0.8) 0%, rgba(6, 14, 28, 0.8) 100%)`,
      borderRadius: 8,
      padding: 10,
      textAlign: 'center',
      border: '1px solid rgba(30, 60, 100, 0.3)',
      boxShadow: `0 0 20px ${glow}, inset 0 1px 0 rgba(100, 180, 255, 0.03)`,
    }}>
      <div style={{ fontSize: 9, color: '#4a6a8a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{
        fontSize: 18,
        fontWeight: 800,
        color,
        fontFamily: 'monospace',
        textShadow: `0 0 10px ${color}40`,
      }}>
        {value}
        {unit && <span style={{ fontSize: 9, color: '#4a6a8a', marginLeft: 3, fontWeight: 400 }}>{unit}</span>}
      </div>
    </div>
  );
}
