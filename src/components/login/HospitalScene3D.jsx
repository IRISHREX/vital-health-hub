import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

function HospitalBuilding({ position = [0, 0, 0], scale = 1 }) {
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.08;
    }
  });

  const mainColor = new THREE.Color('hsl(210, 85%, 45%)');
  const accentColor = new THREE.Color('hsl(174, 75%, 42%)');
  const glassColor = new THREE.Color('hsl(210, 60%, 70%)');

  return (
    <group ref={group} position={position} scale={scale}>
      {/* Main building body */}
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 2]} />
        <meshStandardMaterial color={mainColor} transparent opacity={0.35} roughness={0.2} metalness={0.6} />
      </mesh>

      {/* Central tower */}
      <mesh position={[0, 3.5, 0]}>
        <boxGeometry args={[1.2, 2, 1.2]} />
        <meshStandardMaterial color={accentColor} transparent opacity={0.4} roughness={0.15} metalness={0.7} />
      </mesh>

      {/* Tower top dome */}
      <mesh position={[0, 4.8, 0]}>
        <sphereGeometry args={[0.7, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={accentColor} transparent opacity={0.3} roughness={0.1} metalness={0.8} />
      </mesh>

      {/* Left wing */}
      <mesh position={[-2.5, 1, 0]}>
        <boxGeometry args={[2, 2, 1.8]} />
        <meshStandardMaterial color={mainColor} transparent opacity={0.25} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Right wing */}
      <mesh position={[2.5, 1, 0]}>
        <boxGeometry args={[2, 2, 1.8]} />
        <meshStandardMaterial color={mainColor} transparent opacity={0.25} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Glass windows - main building */}
      {[-0.8, 0, 0.8].map((x, i) =>
        [0.8, 1.8, 2.5].map((y, j) => (
          <mesh key={`win-${i}-${j}`} position={[x, y, 1.01]}>
            <planeGeometry args={[0.4, 0.5]} />
            <meshStandardMaterial color={glassColor} transparent opacity={0.5} emissive={glassColor} emissiveIntensity={0.3} />
          </mesh>
        ))
      )}

      {/* Cross symbol on tower */}
      <group position={[0, 4.2, 0.61]}>
        <mesh>
          <boxGeometry args={[0.08, 0.5, 0.05]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.8} />
        </mesh>
        <mesh>
          <boxGeometry args={[0.3, 0.08, 0.05]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Entrance canopy */}
      <mesh position={[0, 0.4, 1.3]}>
        <boxGeometry args={[1.5, 0.08, 0.8]} />
        <meshStandardMaterial color={accentColor} transparent opacity={0.4} metalness={0.8} roughness={0.1} />
      </mesh>

      {/* Entrance columns */}
      {[-0.6, 0.6].map((x, i) => (
        <mesh key={`col-${i}`} position={[x, 0.2, 1.3]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
          <meshStandardMaterial color="white" transparent opacity={0.5} metalness={0.9} />
        </mesh>
      ))}

      {/* Ground / base platform */}
      <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[8, 5]} />
        <meshStandardMaterial color={mainColor} transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

function FloatingParticles({ count = 50 }) {
  const mesh = useRef();
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.03;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="hsl(174, 75%, 50%)" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function PulsingRing({ radius = 2, speed = 0.5 }) {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * speed) * 0.1;
      ref.current.scale.set(s, s, s);
      ref.current.material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * speed) * 0.1;
    }
  });

  return (
    <mesh ref={ref} position={[0, 1.5, -1]} rotation={[0, 0, 0]}>
      <torusGeometry args={[radius, 0.02, 16, 64]} />
      <meshStandardMaterial color="hsl(174, 75%, 50%)" transparent opacity={0.2} emissive="hsl(174, 75%, 50%)" emissiveIntensity={0.5} />
    </mesh>
  );
}

export default function HospitalScene3D() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 3, 9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} color="hsl(210, 85%, 75%)" />
        <directionalLight position={[-3, 5, -3]} intensity={0.3} color="hsl(174, 75%, 60%)" />
        <pointLight position={[0, 5, 0]} intensity={0.5} color="hsl(174, 75%, 50%)" distance={15} />

        <Float speed={1.2} rotationIntensity={0.1} floatIntensity={0.3}>
          <HospitalBuilding position={[0, -1, 0]} scale={1} />
        </Float>

        <FloatingParticles count={60} />
        <PulsingRing radius={3} speed={0.4} />
        <PulsingRing radius={4.5} speed={0.3} />

        <fog attach="fog" args={['hsl(215, 30%, 8%)', 8, 20]} />
      </Canvas>
    </div>
  );
}
