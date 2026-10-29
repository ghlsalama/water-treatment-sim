import { Html } from '@react-three/drei';
import { SimulationState } from '../../simulation/engine';
import { ZONES } from '../../simulation/engine';
import { ZONE_CENTERS } from './layout';

interface Props {
  state: SimulationState;
}

/**
 * Labels3D renders zone labels anchored to 3D positions above each tank.
 * Uses drei Html so labels always track the correct tank regardless of camera angle.
 */
export function Labels3D({ state }: Props) {
  return (
    <group>
      {ZONES.map((zone, i) => {
        const x = ZONE_CENTERS[i];
        const isCoag = i === 1;
        const isFloc = i === 2;
        const isSed = i === 3;
        const isFilt = i === 4;
        const isAer = i === 5;

        return (
          <Html
            key={zone.name}
            position={[x, 5.8, 0]}
            center
            distanceFactor={28}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{
              background: 'rgba(10, 18, 30, 0.88)',
              border: `1px solid ${zone.color}60`,
              borderRadius: 6,
              padding: '6px 10px',
              minWidth: 90,
              textAlign: 'center',
              fontFamily: 'system-ui, sans-serif',
              boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 800,
                color: zone.color,
                textTransform: 'uppercase',
                letterSpacing: 1,
                marginBottom: 3,
              }}>
                {zone.name}
              </div>
              {isCoag && (
                <div style={{ fontSize: 9, color: '#8ba3c0', fontFamily: 'monospace' }}>
                  Dose: {state.params.coagulantDose.toFixed(0)} mg/L
                </div>
              )}
              {isFloc && (
                <div style={{ fontSize: 9, color: '#8ba3c0', fontFamily: 'monospace' }}>
                  {(state.params.flocculationTime / 60).toFixed(0)} min
                </div>
              )}
              {isSed && (
                <div style={{ fontSize: 9, color: '#8ba3c0', fontFamily: 'monospace' }}>
                  {(state.params.sedimentationEfficiency * 100).toFixed(0)}% eff
                </div>
              )}
              {isFilt && (
                <div style={{ fontSize: 9, color: '#8ba3c0', fontFamily: 'monospace' }}>
                  {state.params.filterLoadingRate.toFixed(1)} m/h
                </div>
              )}
              {isAer && (
                <div style={{ fontSize: 9, color: '#8ba3c0', fontFamily: 'monospace' }}>
                  DO: {state.quality.effluent.dissolvedOxygen.toFixed(1)} mg/L
                </div>
              )}
            </div>
          </Html>
        );
      })}
    </group>
  );
}
