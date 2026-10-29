import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { SimulationState, ZONES } from '../../simulation/engine';
import {
  TANK_DEPTH,
  TANK_HEIGHT,
  ZONE_CENTERS,
  ZONE_WIDTHS,
  turbidityColor,
  waterLevelForZone,
} from './layout';

// RectAreaLights need the LTC lookup textures to be uploaded before they can
// shade anything - without this they render black.
RectAreaLightUniformsLib.init();

interface Props {
  stateRef: React.MutableRefObject<SimulationState>;
}

/**
 * TankScene builds the physical treatment train: one open basin per zone,
 * the water body inside it and the pipework linking them together.
 * Machinery (mixers, scrapers, diffusers) lives in Equipment3D.
 */
export const TankScene = memo(function TankScene({ stateRef }: Props) {
  const waterBodyRefs = useRef<(THREE.Mesh | null)[]>([]);
  const waterSurfaceRefs = useRef<(THREE.Mesh | null)[]>([]);
  const timeRef = useRef(0);

  const pipeSpans = useMemo(
    () => ZONE_CENTERS.slice(0, -1).map((x, i) => ({ x: (x + ZONE_CENTERS[i + 1]) / 2, width: ZONE_CENTERS[i + 1] - x })),
    []
  );

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const state = stateRef.current;

    for (let i = 0; i < ZONES.length; i++) {
      const level = waterLevelForZone(i, state.params.flowRate);
      const color = turbidityColor(zoneTurbidity(i, state));

      const surface = waterSurfaceRefs.current[i];
      if (surface) {
        surface.position.y = level + Math.sin(t * 1.0 + i * 0.7) * 0.04;
        (surface.material as THREE.MeshPhysicalMaterial).color.set(color);
      }

      const body = waterBodyRefs.current[i];
      if (body) {
        body.scale.set(ZONE_WIDTHS[i] - 0.4, level, TANK_DEPTH - 0.4);
        body.position.y = level / 2;
        (body.material as THREE.MeshPhysicalMaterial).color.set(color);
      }
    }
  });

  return (
    <group>
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[27.5, -0.3, 0]}>
        <planeGeometry args={[110, 46]} />
        <meshStandardMaterial color="#141d29" metalness={0.15} roughness={0.9} />
      </mesh>

      {ZONES.map((zone, i) => {
        const zoneWidth = ZONE_WIDTHS[i];

        return (
          <group key={zone.name} position={[ZONE_CENTERS[i], 0, 0]}>
            {/* Tank floor */}
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[zoneWidth, 0.3, TANK_DEPTH]} />
              <meshStandardMaterial color="#253545" metalness={0.3} roughness={0.6} />
            </mesh>

            {/* Back wall - faintly tinted with the zone colour so each stage
                of the train is distinguishable at a glance */}
            <mesh position={[0, TANK_HEIGHT / 2, -TANK_DEPTH / 2]}>
              <boxGeometry args={[zoneWidth, TANK_HEIGHT, 0.2]} />
              <meshStandardMaterial
                color={zone.color}
                metalness={0.25}
                roughness={0.75}
                emissive={zone.color}
                emissiveIntensity={0.12}
              />
            </mesh>

            {/* Side walls */}
            <mesh position={[-zoneWidth / 2, TANK_HEIGHT / 2, 0]}>
              <boxGeometry args={[0.2, TANK_HEIGHT, TANK_DEPTH]} />
              <meshStandardMaterial color="#354555" metalness={0.3} roughness={0.7} />
            </mesh>
            <mesh position={[zoneWidth / 2, TANK_HEIGHT / 2, 0]}>
              <boxGeometry args={[0.2, TANK_HEIGHT, TANK_DEPTH]} />
              <meshStandardMaterial color="#354555" metalness={0.3} roughness={0.7} />
            </mesh>

            {/* Front glass - a faint pane, kept off the transmission pass
                because it is barely visible and would double the draw cost */}
            <mesh position={[0, TANK_HEIGHT / 2, TANK_DEPTH / 2]}>
              <boxGeometry args={[zoneWidth, TANK_HEIGHT, 0.01]} />
              <meshStandardMaterial
                color="#ddeeff"
                transparent
                opacity={0.05}
                metalness={0}
                roughness={0.1}
              />
            </mesh>

            {/* Water body - a tinted volume that follows the water level */}
            <mesh
              ref={el => { waterBodyRefs.current[i] = el; }}
              position={[0, 1, 0]}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshPhysicalMaterial
                transparent
                opacity={0.24}
                metalness={0}
                roughness={0.15}
                transmission={0}
                thickness={0}
              />
            </mesh>

            {/* Water surface */}
            <mesh
              ref={el => { waterSurfaceRefs.current[i] = el; }}
              position={[0, 2, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[zoneWidth - 0.3, TANK_DEPTH - 0.3]} />
              <meshPhysicalMaterial
                transparent
                opacity={0.16}
                metalness={0}
                roughness={0.05}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Interior light */}
            <rectAreaLight
              position={[0, TANK_HEIGHT - 0.2, 0]}
              args={[zoneWidth * 0.8, TANK_DEPTH * 0.8]}
              intensity={4}
              color="#ffffff"
            />

            <ZoneInternals index={i} zoneWidth={zoneWidth} />

            {/* Top frame */}
            <mesh position={[0, TANK_HEIGHT, 0]}>
              <boxGeometry args={[zoneWidth + 0.15, 0.12, TANK_DEPTH + 0.15]} />
              <meshStandardMaterial color="#39485a" metalness={0.45} roughness={0.6} />
            </mesh>
          </group>
        );
      })}

      {/* Connecting pipes */}
      {pipeSpans.map((span, i) => (
        <group key={i} position={[span.x, 3, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.25, 0.25, span.width, 12]} />
            <meshStandardMaterial color="#5a7a9a" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
});

/**
 * Structural internals that belong to the basin rather than to the
 * machinery: baffles, the sloped sedimentation floor, the sludge blanket
 * and the outlet weirs.
 */
function ZoneInternals({
  index,
  zoneWidth,
}: {
  index: number;
  zoneWidth: number;
}) {
  const isFloc = index === 2;
  const isSed = index === 3;

  return (
    <>
      {isFloc && (
        <group>
          {/* Baffle walls */}
          {[-1.5, 0, 1.5].map((x, xi) => (
            <mesh key={xi} position={[x * (zoneWidth / 4), 1.8, 0]}>
              <boxGeometry args={[0.15, 3, TANK_DEPTH - 0.8]} />
              <meshStandardMaterial
                color="#6a8aaa"
                emissive="#4a6a8a"
                emissiveIntensity={0.6}
                transparent
                opacity={0.4}
              />
            </mesh>
          ))}
        </group>
      )}

      {isSed && (
        <group>
          {/* Sloped floor */}
          <mesh position={[0, 0.05, 0]} rotation={[0.15, 0, 0]}>
            <boxGeometry args={[zoneWidth - 0.3, 0.15, TANK_DEPTH - 0.3]} />
            <meshStandardMaterial color="#3a4555" roughness={0.8} />
          </mesh>
          {/* Sludge blanket */}
          <mesh position={[0, 0.25, -TANK_DEPTH / 2 + 1]}>
            <boxGeometry args={[zoneWidth * 0.6, 0.4, 1.5]} />
            <meshStandardMaterial
              color="#5a4a2a"
              emissive="#3a2a1a"
              emissiveIntensity={0.5}
              roughness={0.95}
              transparent
              opacity={0.9}
            />
          </mesh>
          {/* Outlet weirs */}
          {[-2, -0.7, 0.7, 2].map((z, zi) => (
            <mesh key={zi} position={[zoneWidth / 2 - 0.4, 1.2, z]}>
              <boxGeometry args={[0.15, 0.5, 0.15]} />
              <meshStandardMaterial color="#7a8a9a" metalness={0.6} roughness={0.3} />
            </mesh>
          ))}
          <pointLight position={[0, 1.5, 0]} color="#ffffff" intensity={3} distance={10} />
        </group>
      )}
    </>
  );
}

/** Turbidity of the water leaving each zone, used to tint the water body. */
function zoneTurbidity(index: number, state: SimulationState): number {
  const q = state.quality;
  const values = [
    q.influent.turbidity,
    q.afterCoagulation.turbidity,
    q.afterFlocculation.turbidity,
    q.afterSedimentation.turbidity,
    q.afterFiltration.turbidity,
    q.effluent.turbidity,
    q.effluent.turbidity,
  ];
  return values[index] ?? 0;
}
