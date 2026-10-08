"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

function CageBall({ seed }: { seed: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const radius = 0.4;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.9 + seed * 6.28;
    if (ref.current) {
      ref.current.position.set(Math.sin(t) * radius, Math.cos(t * 1.3) * radius * 0.6, Math.cos(t) * radius);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.09, 10, 10]} />
      <meshStandardMaterial color="#9ca3af" roughness={0.5} />
    </mesh>
  );
}

/** One drawn number, animated flying out of the cage into its resting slot in the tray below. */
function EjectedBall({
  number,
  index,
  matched,
  total,
  font,
  spacing,
  trayZ,
  trayY,
  ballScale,
}: {
  number: number;
  index: number;
  matched: boolean;
  total: number;
  font?: string;
  spacing: number;
  trayZ: number;
  trayY: number;
  ballScale: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const startX = -((total - 1) * spacing) / 2;
  const targetX = startX + index * spacing;

  useFrame((_, delta) => {
    progress.current = Math.min(1, progress.current + delta * 2.2);
    const t = progress.current;
    const eased = 1 - Math.pow(1 - t, 3);
    if (ref.current) {
      ref.current.position.x = THREE.MathUtils.lerp(0, targetX, eased);
      ref.current.position.y = THREE.MathUtils.lerp(1.3, trayY, eased) + Math.sin(t * Math.PI) * 0.5;
      ref.current.position.z = THREE.MathUtils.lerp(0, trayZ, eased);
      ref.current.rotation.y += delta * (1 - t) * 6;
    }
  });

  return (
    <group ref={ref} scale={ballScale}>
      <mesh castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={matched ? "#ffd54a" : "#4b5566"}
          emissive={matched ? "#7a5c00" : "#000000"}
          emissiveIntensity={matched ? 0.8 : 0}
          roughness={0.3}
          metalness={matched ? 0.5 : 0.1}
        />
      </mesh>
      <Text font={font} position={[0, 0, 0.17]} fontSize={0.16} color={matched ? "#1a1400" : "#dbe0ea"} anchorX="center" anchorY="middle">
        {String(number)}
      </Text>
    </group>
  );
}

/**
 * Tumbling wireframe cage that spins faster while the server draw is "in
 * flight", with the real drawn numbers (from the page's staggered reveal)
 * ejecting out one at a time into a collection tray, matched picks glowing
 * gold.
 */
export default function KenoScene3D({
  drawn,
  picks,
  spinning,
  drawCount = 10,
  font,
  spacing = 0.5,
  trayZ = 0.95,
  trayY = 0.16,
  ballScale = 1,
  tray = true,
}: {
  drawn: number[];
  picks: number[];
  spinning: boolean;
  drawCount?: number;
  /** Local font file for the ball numbers (the default CDN font hangs offline). */
  font?: string;
  /** Distance between resting balls, and where they land (scene units). */
  spacing?: number;
  trayZ?: number;
  trayY?: number;
  ballScale?: number;
  /** The dark floor slab under the tray. */
  tray?: boolean;
}) {
  const cageRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (cageRef.current) {
      cageRef.current.rotation.y += delta * (spinning ? 2.4 : 0.35);
      cageRef.current.rotation.z += delta * 0.25;
    }
  });

  const cageBalls = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);

  return (
    <group>
      <group ref={cageRef} position={[0, 1.3, 0]}>
        <mesh>
          <sphereGeometry args={[0.55, 16, 12]} />
          <meshStandardMaterial color="#9ca3af" wireframe />
        </mesh>
        {cageBalls.map((i) => (
          <CageBall key={i} seed={i} />
        ))}
      </group>

      {/* collection tray */}
      {tray && (
        <mesh position={[0, 0.02, 0.95]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6, 1.2]} />
          <meshStandardMaterial color="#0a0d1f" />
        </mesh>
      )}

      {drawn.map((n, i) => (
        <EjectedBall key={n} number={n} index={i} matched={picks.includes(n)} total={drawCount} font={font} spacing={spacing} trayZ={trayZ} trayY={trayY} ballScale={ballScale} />
      ))}
    </group>
  );
}
