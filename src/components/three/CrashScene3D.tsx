"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";

/** Maps the real live multiplier to a climb height so a 50x doesn't fly off-screen. */
function heightForMultiplier(m: number) {
  return Math.min(5.2, Math.log2(Math.max(1, m)) * 1.9);
}

/**
 * A 3D rocket climbing on the SAME multiplier value the page already polls
 * from `/api/games/crash`. No separate fake loop: height is a pure function
 * of `multiplier`, so the rocket is always exactly where the real round is.
 */
export default function CrashScene3D({
  active,
  multiplier,
  crashed,
  cashedOutAt,
}: {
  /** Round is currently live (between bet and crash/cashout). */
  active: boolean;
  /** Current live multiplier (ticks via the page's poll loop). */
  multiplier: number;
  /** The real crash point once the round has busted, else null. */
  crashed: number | null;
  /** The real multiplier the player cashed out at, else null. */
  cashedOutAt: number | null;
}) {
  const rocketRef = useRef<THREE.Group>(null);
  const tiltRef = useRef(0);
  const flourishRef = useRef(0);

  useEffect(() => {
    if (active) {
      tiltRef.current = 0;
      flourishRef.current = 0;
      if (rocketRef.current) {
        rocketRef.current.position.set(0, 0.2, 0);
        rocketRef.current.rotation.z = -0.08;
        rocketRef.current.scale.setScalar(1);
      }
    }
  }, [active]);

  useFrame((state, delta) => {
    const g = rocketRef.current;
    if (!g) return;

    if (crashed !== null) {
      // Busted: tip the rocket over and let it fall, with a burst at the bust height.
      tiltRef.current = Math.min(Math.PI / 2.1, tiltRef.current + delta * 3.2);
      g.rotation.z = -tiltRef.current;
      g.position.y = Math.max(0.15, g.position.y - delta * 1.4);
      g.position.x += delta * 0.7;
      return;
    }

    if (cashedOutAt !== null) {
      // Cashed out in time: a little victory flourish in place.
      flourishRef.current += delta;
      const targetY = 0.2 + heightForMultiplier(cashedOutAt);
      g.position.y = targetY + Math.sin(flourishRef.current * 6) * 0.15;
      g.rotation.z = Math.sin(flourishRef.current * 4) * 0.12;
      g.position.x = 0;
      return;
    }

    const targetY = 0.2 + heightForMultiplier(multiplier);
    g.position.y = THREE.MathUtils.lerp(g.position.y, targetY, active ? 0.15 : 0.25);
    g.position.x = THREE.MathUtils.lerp(g.position.x, 0, 0.2);
    g.rotation.z = active ? Math.sin(state.clock.getElapsedTime() * 2.2) * 0.04 - 0.08 : -0.08;
  });

  const liveHeight = 0.2 + heightForMultiplier(multiplier);

  return (
    <group>
      {/* launch pad */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[1.1, 1.1, 0.15, 28]} />
        <meshStandardMaterial color="#1a1030" />
      </mesh>

      {/* climb trail, height tied to the real multiplier */}
      {active && crashed === null && cashedOutAt === null && (
        <mesh position={[0, liveHeight / 2, 0]}>
          <cylinderGeometry args={[0.03, 0.06, liveHeight, 8]} />
          <meshStandardMaterial color="#ffb703" emissive="#ff8a00" emissiveIntensity={0.6} transparent opacity={0.45} />
        </mesh>
      )}

      <group ref={rocketRef} position={[0, 0.2, 0]}>
        <mesh castShadow>
          <coneGeometry args={[0.3, 0.85, 16]} />
          <meshStandardMaterial color="#e5e5e5" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.48, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.55, 16]} />
          <meshStandardMaterial color={crashed !== null ? "#7a1020" : "#d32f2f"} metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.8, 0]}>
          <coneGeometry args={[0.38, 0.32, 16]} />
          <meshStandardMaterial
            color="#ff8a00"
            emissive="#ff6a00"
            emissiveIntensity={active && crashed === null ? 1.4 : 0.25}
          />
        </mesh>
      </group>

      {crashed !== null && (
        <Sparkles count={60} scale={2.4} size={5} speed={1.1} color="#ff5470" position={[0, 0.2 + heightForMultiplier(crashed), 0]} />
      )}
      {cashedOutAt !== null && (
        <Sparkles count={40} scale={1.8} size={4} speed={0.6} color="#ffd54a" position={[0, 0.2 + heightForMultiplier(cashedOutAt), 0]} />
      )}
    </group>
  );
}
