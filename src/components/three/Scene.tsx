import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { SimulationState } from '../../simulation/engine';
import { TankScene } from './TankScene';
import { Equipment3D } from './Equipment';
import { Particles3D } from './Particles3D';
import { WaterEffects } from './WaterEffects';
import { Labels3D } from './Labels3D';

interface Props {
  state: SimulationState;
  hideLabels?: boolean;
}

export function Scene({ state, hideLabels }: Props) {
  // The engine publishes a new state object every tick. The animated parts of
  // the scene read from this ref inside useFrame instead of re-rendering, so
  // the 3D tree stays static while the simulation keeps running.
  const stateRef = useRef(state);
  stateRef.current = state;

  return (
    <div style={{ position: 'relative', width: '100%', height: 520, borderRadius: 16, overflow: 'hidden' }}>
      <Canvas gl={{ antialias: true, alpha: false }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={['#12182a']} />

        <PerspectiveCamera makeDefault position={[27.5, 13, 24]} fov={45} near={0.1} far={200} />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={12}
          maxDistance={70}
          minPolarAngle={0.25}
          maxPolarAngle={Math.PI / 2.1}
          target={[27.5, 2, 0]}
          enableDamping={true}
          dampingFactor={0.08}
        />

        {/* Daylight rig: a key light from the front-right, a fill from the
            left and a cool rim from behind so the basins read clearly. */}
        <ambientLight intensity={0.9} color="#dce8f5" />
        <hemisphereLight intensity={0.5} color="#9fc4e8" groundColor="#16202c" />
        <directionalLight position={[25, 35, 25]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-20, 30, 20]} intensity={1.1} color="#cfe2f5" />
        <directionalLight position={[0, 25, -20]} intensity={0.8} color="#9fd8ff" />

        <TankScene stateRef={stateRef} />
        <Equipment3D stateRef={stateRef} />
        <WaterEffects stateRef={stateRef} />
        <Particles3D stateRef={stateRef} />
        {!hideLabels && <Labels3D state={state} />}
      </Canvas>
    </div>
  );
}
