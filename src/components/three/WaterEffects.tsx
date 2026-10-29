import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationState } from '../../simulation/engine';
import { ZONES } from '../../simulation/engine';
import { ZONE_CENTERS, ZONE_WIDTHS, waterLevelForZone } from './layout';

interface Props {
  stateRef: React.MutableRefObject<SimulationState>;
}

/**
 * WaterEffects adds the moving light and dosing detail that sells the scene:
 * caustic patterns that track the water surface in every zone, chemical
 * injection streams whose strength follows the coagulant dose, and surface
 * ripples over the aeration grid.
 */
export const WaterEffects = memo(function WaterEffects({ stateRef }: Props) {
  const causticRefs = useRef<(THREE.Mesh | null)[]>([]);
  const chemicalRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  const zoneColors = useMemo(() => ZONES.map(zone => new THREE.Color(zone.color)), []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;
    const { params } = stateRef.current;

    // Caustic patterns ride the water surface of their zone.
    causticRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.opacity = 0.08 + Math.sin(t * 2 + i * 1.5) * 0.04 + Math.sin(t * 3.7 + i * 0.8) * 0.025;
      }
      mesh.rotation.z = t * 0.1 * (i % 2 === 0 ? 1 : -1);
      mesh.position.y = waterLevelForZone(i, params.flowRate) + 0.02;
    });

    // Chemical injection streams pulse with the coagulant dose.
    if (chemicalRef.current) {
      const doseRatio = Math.min(1, params.coagulantDose / 40);
      chemicalRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat) {
          mat.opacity = (0.2 + Math.sin(t * 4 + i * 0.5) * 0.15) * doseRatio;
        }
        mesh.position.y = 2.3 + Math.sin(t * 2 + i * 0.3) * 0.25;
      });
    }
  });

  return (
    <group>
      {/* Caustic light patterns on the water surfaces */}
      {ZONES.map((zone, i) => (
        <mesh
          key={`caustic-${i}`}
          ref={el => { causticRefs.current[i] = el; }}
          position={[ZONE_CENTERS[i], 2.6, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[Math.max(0.5, ZONE_WIDTHS[i] - 0.5), 5.5]} />
          <meshStandardMaterial
            color={zoneColors[i]}
            transparent
            opacity={0.1}
            emissive={zoneColors[i]}
            emissiveIntensity={0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}

      {/* Chemical injection in the coagulation zone */}
      <group ref={chemicalRef} position={[ZONE_CENTERS[1], 0, 0]}>
        {/* Injection pipe */}
        <mesh position={[0, 3.2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 1, 8]} />
          <meshStandardMaterial color="#d4a030" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Chemical streams */}
        {[0, 1, 2, 3, 4].map(i => (
          <mesh key={i} position={[(i - 2) * 0.15, 2.3, 0]}>
            <cylinderGeometry args={[0.02, 0.01, 1.5, 6]} />
            <meshStandardMaterial
              color="#ffc832"
              transparent
              opacity={0.4}
              emissive="#ffc832"
              emissiveIntensity={0.5}
            />
          </mesh>
        ))}
        {/* Drip points */}
        {[0, 1, 2, 3, 4].map(i => (
          <mesh key={i} position={[(i - 2) * 0.15, 1.5, 0]}>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshStandardMaterial
              color="#ffd842"
              emissive="#ffc832"
              emissiveIntensity={0.8}
            />
          </mesh>
        ))}
      </group>

      {/* Surface ripple rings in the aeration zone */}
      <group position={[ZONE_CENTERS[5], 0, 0]}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <RippleRing key={i} index={i} />
        ))}
      </group>
    </group>
  );
});

function RippleRing({ index }: { index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const offset = index * 0.8;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + offset;
    const scale = 0.5 + (t % 2) * 1.5;
    const opacity = Math.max(0, 0.3 - (t % 2) * 0.15);

    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, 1);
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.opacity = opacity;
    }
  });

  return (
    <mesh ref={meshRef} position={[(index % 3 - 1) * 1.2, 2.4, (Math.floor(index / 3) - 0.5) * 2]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.35, 16]} />
      <meshStandardMaterial color="#96d2ff" transparent opacity={0.3} side={THREE.DoubleSide} />
    </mesh>
  );
}
