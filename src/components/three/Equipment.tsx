import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationState } from '../../simulation/engine';
import { ZONE_CENTERS } from './layout';

interface Props {
  stateRef: React.MutableRefObject<SimulationState>;
}

/**
 * Equipment3D places the rotating machinery of the plant: the rapid mixer,
 * the flocculator paddles, the sedimentation scraper bridge, the filter bed
 * and the aeration diffuser grid, plus the inlet and outlet pipework.
 */
export const Equipment3D = memo(function Equipment3D({ stateRef }: Props) {
  const mixerRef = useRef<THREE.Group>(null);
  const paddleRef = useRef<THREE.Group>(null);
  const scraperRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const { params } = stateRef.current;

    if (mixerRef.current) {
      mixerRef.current.rotation.y += delta * (2 + params.mixingIntensity * 10);
    }
    if (paddleRef.current) {
      paddleRef.current.rotation.y += delta * (0.3 + params.flocGrowthRate * 2);
    }
    if (scraperRef.current) {
      scraperRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group>
      {/* Coagulation rapid mixer */}
      <group ref={mixerRef} position={[ZONE_CENTERS[1], 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.1, 2.5, 8]} />
          <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.2} />
        </mesh>
        {[0, 1, 2, 3].map(i => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, -0.8, 0]}>
            <boxGeometry args={[1.2, 0.06, 0.2]} />
            <meshStandardMaterial color="#ccc" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}
        {[0, 1].map(i => (
          <mesh key={i} rotation={[0, i * Math.PI, 0.3]} position={[0, -0.3, 0]}>
            <boxGeometry args={[0.9, 0.04, 0.15]} />
            <meshStandardMaterial color="#bbb" metalness={0.7} roughness={0.35} />
          </mesh>
        ))}
      </group>

      {/* Flocculation paddle mixer */}
      <group ref={paddleRef} position={[ZONE_CENTERS[2], 1.8, 0]}>
        <mesh>
          <cylinderGeometry args={[0.08, 0.08, 2.2, 8]} />
          <meshStandardMaterial color="#999" metalness={0.8} roughness={0.25} />
        </mesh>
        {[0, 1, 2].map(i => (
          <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
            <mesh position={[0.8, -0.5, 0]}>
              <boxGeometry args={[1.6, 0.05, 0.25]} />
              <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.4} />
            </mesh>
            <mesh position={[-0.8, 0.3, 0]}>
              <boxGeometry args={[1.6, 0.05, 0.25]} />
              <meshStandardMaterial color="#aaa" metalness={0.7} roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Sedimentation scraper bridge */}
      <group ref={scraperRef} position={[ZONE_CENTERS[3], 0.2, 0]}>
        <mesh>
          <boxGeometry args={[7, 0.2, 0.2]} />
          <meshStandardMaterial color="#777" metalness={0.75} roughness={0.35} />
        </mesh>
        {[-3, -2, -1, 0, 1, 2, 3].map((x, i) => (
          <mesh key={i} position={[x, -0.4, 0]} rotation={[0, 0, 0.15]}>
            <boxGeometry args={[0.1, 0.7, 0.1]} />
            <meshStandardMaterial color="#666" metalness={0.65} roughness={0.45} />
          </mesh>
        ))}
        {[-3.2, 3.2].map((x, i) => (
          <mesh key={i} position={[x, 0.5, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 1, 6]} />
            <meshStandardMaterial color="#888" metalness={0.8} roughness={0.25} />
          </mesh>
        ))}
        {/* Drive motor */}
        <mesh position={[0, 0.3, 0]}>
          <boxGeometry args={[0.4, 0.3, 0.4]} />
          <meshStandardMaterial color="#555" metalness={0.7} roughness={0.4} />
        </mesh>
      </group>

      {/* Filtration bed */}
      <group position={[ZONE_CENTERS[4], 0.5, 0]}>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[4.5, 0.4, 4.5]} />
          <meshStandardMaterial color="#3a5a7a" metalness={0.15} roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[4.5, 0.2, 4.5]} />
          <meshStandardMaterial color="#5a7a9a" metalness={0.1} roughness={0.75} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[4.5, 0.15, 4.5]} />
          <meshStandardMaterial color="#7a9aba" metalness={0.1} roughness={0.65} />
        </mesh>
        {/* Support pillars */}
        {[-1.8, 1.8].map((x, i) =>
          [-1.8, 1.8].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, -0.3, z]}>
              <cylinderGeometry args={[0.08, 0.08, 0.6, 6]} />
              <meshStandardMaterial color="#666" metalness={0.7} roughness={0.35} />
            </mesh>
          ))
        )}
        {/* Backwash nozzles */}
        {[-1.5, -0.5, 0.5, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 0.6, 0]}>
            <cylinderGeometry args={[0.05, 0.08, 0.25, 8]} />
            <meshStandardMaterial color="#bbb" metalness={0.85} roughness={0.2} />
          </mesh>
        ))}
      </group>

      {/* Aeration diffuser grid */}
      <group position={[ZONE_CENTERS[5], 0.25, 0]}>
        {[-1.5, -0.75, 0, 0.75, 1.5].map((z, i) => (
          <mesh key={i} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 5, 8]} />
            <meshStandardMaterial color="#777" metalness={0.75} roughness={0.3} />
          </mesh>
        ))}
        {[-1.5, -0.75, 0, 0.75, 1.5].map((z, i) =>
          [-1.8, -0.9, 0, 0.9, 1.8].map((x, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.15, z]}>
              <cylinderGeometry args={[0.1, 0.05, 0.2, 8]} />
              <meshStandardMaterial color="#999" metalness={0.7} roughness={0.35} />
            </mesh>
          ))
        )}
        {/* Air supply pipe */}
        <mesh position={[0, 0.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 5.5, 8]} />
          <meshStandardMaterial color="#5a7a9a" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>

      {/* Inflow pipe */}
      <group position={[ZONE_CENTERS[0] - 2, 2.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 3, 12]} />
          <meshStandardMaterial color="#4a6a8a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.15, 12]} />
          <meshStandardMaterial color="#5a7a9a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Effluent outlet pipe */}
      <group position={[ZONE_CENTERS[6] + 2, 1.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.2, 0.2, 3, 12]} />
          <meshStandardMaterial color="#3a7a6a" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[1.5, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.25, 0.25, 0.15, 12]} />
          <meshStandardMaterial color="#4a8a7a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
});
