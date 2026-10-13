import { SimulationState } from '../simulation/engine';
import { ZONES } from '../simulation/engine';

interface Props {
  state: SimulationState;
}

/**
 * SensorOverlay renders live sensor-style telemetry on top of the simulation canvas.
 * Shows real-time readings for each treatment zone: temperature, pH, DO, turbidity, flow.
 * Styled like a modern SCADA/HMI system used in real water treatment plants.
 */
export function SensorOverlay({ state }: Props) {
  const { quality, params } = state;

  const sensors = [
    {
      zone: 'Inflow',
      x: 7,
      readings: [
        { label: 'Flow', value: `${params.flowRate.toFixed(0)} m³/h`, color: '#4a90d9' },
        { label: 'Turb', value: `${quality.influent.turbidity.toFixed(1)} NTU`, color: '#e8a838' },
        { label: 'pH', value: quality.influent.ph.toFixed(1), color: '#66bb6a' },
      ],
    },
    {
      zone: 'Coagulation',
      x: 25,
      readings: [
        { label: 'Dose', value: `${params.coagulantDose.toFixed(0)} mg/L`, color: '#e8a838' },
        { label: 'Turb', value: `${quality.afterCoagulation.turbidity.toFixed(1)} NTU`, color: '#d4782e' },
        { label: 'Mix', value: `${(params.mixingIntensity * 100).toFixed(0)}%`, color: '#ab47bc' },
      ],
    },
    {
      zone: 'Flocculation',
      x: 52,
      readings: [
        { label: 'Turb', value: `${quality.afterFlocculation.turbidity.toFixed(1)} NTU`, color: '#d4782e' },
        { label: 'Time', value: `${(params.flocculationTime / 60).toFixed(0)} min`, color: '#7cb342' },
        { label: 'Floc', value: `${(params.flocGrowthRate * 100).toFixed(0)}%`, color: '#26a69a' },
      ],
    },
    {
      zone: 'Sedimentation',
      x: 90,
      readings: [
        { label: 'Turb', value: `${quality.afterSedimentation.turbidity.toFixed(1)} NTU`, color: '#7cb342' },
        { label: 'Eff', value: `${(params.sedimentationEfficiency * 100).toFixed(0)}%`, color: '#26a69a' },
        { label: 'Sludge', value: `${params.sludgeBlanketDepth.toFixed(1)}m`, color: '#8d6e63' },
      ],
    },
    {
      zone: 'Filtration',
      x: 125,
      readings: [
        { label: 'Turb', value: `${quality.afterFiltration.turbidity.toFixed(1)} NTU`, color: '#26a69a' },
        { label: 'Rate', value: `${params.filterLoadingRate.toFixed(1)} m/h`, color: '#42a5f5' },
        { label: 'Eff', value: `${(params.filterRemovalEfficiency * 100).toFixed(0)}%`, color: '#66bb6a' },
      ],
    },
    {
      zone: 'Aeration',
      x: 157,
      readings: [
        { label: 'DO', value: `${quality.effluent.dissolvedOxygen.toFixed(1)} mg/L`, color: '#26a69a' },
        { label: 'Rate', value: `${params.aerationRate.toFixed(1)} m³/m³/h`, color: '#42a5f5' },
        { label: 'BOD', value: `${quality.effluent.bod.toFixed(1)} mg/L`, color: '#ab47bc' },
      ],
    },
    {
      zone: 'Effluent',
      x: 187,
      readings: [
        { label: 'Turb', value: `${quality.effluent.turbidity.toFixed(1)} NTU`, color: '#66bb6a' },
        { label: 'BOD', value: `${quality.effluent.bod.toFixed(1)} mg/L`, color: '#42a5f5' },
        { label: 'DO', value: `${quality.effluent.dissolvedOxygen.toFixed(1)} mg/L`, color: '#26a69a' },
      ],
    },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 30,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
    }}>
      {sensors.map(sensor => (
        <div
          key={sensor.zone}
          style={{
            position: 'absolute',
            left: `${sensor.x}%`,
            top: 10,
            transform: 'translateX(-50%)',
            background: 'rgba(6, 14, 26, 0.82)',
            borderRadius: 8,
            padding: '6px 10px',
            border: '1px solid rgba(30, 60, 100, 0.5)',
            backdropFilter: 'blur(6px)',
            minWidth: 70,
          }}
        >
          <div style={{
            fontSize: 8,
            color: '#5a8aaa',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 4,
            textAlign: 'center',
          }}>
            {sensor.zone}
          </div>
          {sensor.readings.map(r => (
            <div key={r.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 6,
              fontSize: 9,
              marginBottom: 2,
            }}>
              <span style={{ color: '#4a6a8a', fontSize: 8 }}>{r.label}</span>
              <span style={{ color: r.color, fontWeight: 700, fontFamily: 'monospace', fontSize: 9 }}>{r.value}</span>
            </div>
          ))}
          {/* Live indicator dot */}
          <div style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#66bb6a',
            boxShadow: '0 0 6px rgba(102, 187, 106, 0.6)',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        </div>
      ))}
    </div>
  );
}
