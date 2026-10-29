import { memo, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SimulationState } from '../../simulation/engine';
import { ParticleType } from '../../simulation/particles';
import {
  clampToWater,
  gridToWorldX,
  gridToWorldY,
  gridZToWorldZ,
  waterLevelForZone,
  zoneIndexForGridX,
} from './layout';

interface Props {
  stateRef: React.MutableRefObject<SimulationState>;
}

const MAX_INSTANCES = 800;

/** Visual identity of each particle class. */
const STYLES: Record<ParticleType, { color: THREE.Color; radius: number }> = {
  solid: { color: new THREE.Color('#b48c50'), radius: 0.11 },
  floc: { color: new THREE.Color('#a0783c'), radius: 0.11 },
  bubble: { color: new THREE.Color('#96d2ff'), radius: 0.14 },
  chemical: { color: new THREE.Color('#ffc832'), radius: 0.14 },
  tracer: { color: new THREE.Color('#7ce8b8'), radius: 0.14 },
};

const TYPES: ParticleType[] = ['solid', 'floc', 'bubble', 'chemical', 'tracer'];

/**
 * Instanced colours need `vertexColors` on the material (three only samples
 * vColor in the fragment stage for USE_COLOR) plus a white `color` attribute
 * on the geometry, otherwise the mesh renders black.
 */
function withVertexColors(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const count = geometry.attributes.position.count;
  geometry.setAttribute(
    'color',
    new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3)
  );
  return geometry;
}

export const Particles3D = memo(function Particles3D({ stateRef }: Props) {
  const meshRefs = useRef<Partial<Record<ParticleType, THREE.InstancedMesh | null>>>({});
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const scratch = useMemo(() => new THREE.Color(), []);
  const fadeColor = useMemo(() => new THREE.Color('#0d1524'), []);

  const resources = useMemo(() => {
    const solid = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.8, metalness: 0.1,
    });
    const floc = new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.9, metalness: 0.05, transparent: true, opacity: 0.85,
    });
    const bubble = new THREE.MeshPhysicalMaterial({
      vertexColors: true, roughness: 0.1, metalness: 0, transmission: 0.6,
      thickness: 0.2, transparent: true, opacity: 0.7,
    });
    const chemical = new THREE.MeshStandardMaterial({
      vertexColors: true, emissive: new THREE.Color('#ffb300'), emissiveIntensity: 2, roughness: 0.4,
    });
    const tracer = new THREE.MeshStandardMaterial({
      vertexColors: true, emissive: new THREE.Color('#2fbf8a'), emissiveIntensity: 1.6,
      roughness: 0.3, transparent: true, opacity: 0.85,
    });

    return {
      solid: { geometry: withVertexColors(new THREE.DodecahedronGeometry(1, 0)), material: solid },
      floc: { geometry: withVertexColors(new THREE.IcosahedronGeometry(1, 0)), material: floc },
      bubble: { geometry: withVertexColors(new THREE.SphereGeometry(1, 8, 8)), material: bubble },
      chemical: { geometry: withVertexColors(new THREE.SphereGeometry(1, 6, 6)), material: chemical },
      tracer: { geometry: withVertexColors(new THREE.SphereGeometry(1, 8, 8)), material: tracer },
    };
  }, []);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const state = stateRef.current;
    const counts: Record<string, number> = {};

    for (const particle of state.particles) {
      const mesh = meshRefs.current[particle.type];
      if (!mesh) continue;

      const index = counts[particle.type] ?? 0;
      if (index >= MAX_INSTANCES) continue;
      counts[particle.type] = index + 1;

      const style = STYLES[particle.type];
      const zoneIndex = zoneIndexForGridX(particle.x);
      const waterLevel = waterLevelForZone(zoneIndex, state.params.flowRate);

      const worldX = gridToWorldX(particle.x);
      const worldY = clampToWater(gridToWorldY(particle.y), waterLevel);
      const worldZ = gridZToWorldZ(particle.z);

      // Fading particles shrink towards nothing.
      const scale = style.radius * particle.size * (0.35 + particle.opacity * 0.65);

      dummy.position.set(worldX, worldY, worldZ);
      dummy.rotation.set(
        particle.type === 'floc' ? time * 0.4 + particle.x : 0,
        particle.type === 'solid' ? time * 0.2 : 0,
        particle.type === 'bubble' ? 0 : time * 0.3 + particle.y
      );
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();

      mesh.setMatrixAt(index, dummy.matrix);

      // Tint towards the scene background as the particle fades out.
      scratch.copy(style.color).lerp(fadeColor, 1 - particle.opacity);
      mesh.setColorAt(index, scratch);
    }

    for (const type of TYPES) {
      const mesh = meshRefs.current[type];
      if (!mesh) continue;
      mesh.count = counts[type] ?? 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group>
      {TYPES.map(type => (
        <instancedMesh
          key={type}
          ref={el => { meshRefs.current[type] = el; }}
          args={[resources[type].geometry, resources[type].material, MAX_INSTANCES]}
          frustumCulled={false}
        />
      ))}
    </group>
  );
});
