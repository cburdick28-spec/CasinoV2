"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SCALE_MAX = 100;
const SCALE_WORLD_HEIGHT = 3.2;

function valueToHeight(v: number) {
  const clamped = Math.max(1, Math.min(v, SCALE_MAX));
  const t = Math.log10(clamped) / Math.log10(SCALE_MAX);
  return t * SCALE_WORLD_HEIGHT;
}

const TICKS = [1, 2, 5, 10, 25, 50, 100];

/**
 * A rocket rises along a vertical log-scaled track from 1x upward. The
 * target-multiplier line is a glowing gold ring; the rocket settles at the
 * real rolled multiplier from the server and flashes green (win, stopped
 * at/above target) or red (loss, stopped below).
 */
export default function LimboScene3D({
  display,
  target,
  result,
}: {
  display: number;
  target: number;
  result: { roll: number; won: boolean } | null;
}) {
  const rocketRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  const y = valueToHeight(display);
  const targetY = valueToHeight(target);
  const color = result ? (result.won ? "#34d399" : "#ff5470") : "#ffd54a";

  useFrame(({ clock }) => {
    if (rocketRef.current) {
      const bob = result ? Math.sin(clock.getElapsedTime() * 6) * (result.won ? 0.04 : 0.02) : 0;
      rocketRef.current.position.y = y + 0.4 + bob;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 1.4 + Math.sin(clock.getElapsedTime() * (result ? 8 : 3)) * 0.7;
    }
  });

  const ticks = useMemo(() => TICKS, []);

  return (
    <group position={[0, -1.5, 0]}>
      {/* vertical track */}
      <mesh position={[0, SCALE_WORLD_HEIGHT / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.03, SCALE_WORLD_HEIGHT, 12]} />
        <meshStandardMaterial color="#2a2d45" />
      </mesh>

      {/* scale tick marks */}
      {ticks.map((t) => (
        <mesh key={t} position={[0.25, valueToHeight(t), 0]}>
          <boxGeometry args={[0.3, 0.015, 0.03]} />
          <meshStandardMaterial color="#5a5f7a" />
        </mesh>
      ))}

      {/* target line */}
      <mesh position={[0, targetY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.45, 0.02, 8, 24]} />
        <meshStandardMaterial color="#ffd54a" emissive="#7a5c00" emissiveIntensity={0.7} />
      </mesh>

      {/* rocket */}
      <group ref={rocketRef}>
        <mesh castShadow>
          <coneGeometry args={[0.22, 0.6, 16]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} metalness={0.4} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.38, 0]}>
          <coneGeometry args={[0.26, 0.24, 16]} />
          <meshStandardMaterial color="#ff8a00" emissive="#ff6a00" emissiveIntensity={1.1} />
        </mesh>
        <pointLight ref={glowRef} color={color} intensity={1.4} distance={2.2} />
      </group>

      {/* base pad */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.6, 24]} />
        <meshStandardMaterial color="#0a0d1f" />
      </mesh>
    </group>
  );
}
