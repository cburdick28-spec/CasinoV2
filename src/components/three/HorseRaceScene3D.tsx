"use client";

import { useMemo } from "react";

const PALETTE = ["#ffd54a", "#60a5fa", "#ff5470", "#34d399", "#c084fc", "#fb923c", "#f472b6", "#38bdf8"];

function HorseModel({ color, highlight, leading }: { color: string; highlight: boolean; leading: boolean }) {
  const scale = leading ? 1.08 : 1;
  return (
    <group scale={scale}>
      <mesh castShadow position={[0, 0.18, 0]}>
        <boxGeometry args={[0.42, 0.2, 0.16]} />
        <meshStandardMaterial color={color} emissive={highlight ? color : "#000000"} emissiveIntensity={highlight ? 0.5 : 0} />
      </mesh>
      <mesh castShadow position={[0.24, 0.3, 0]}>
        <boxGeometry args={[0.12, 0.2, 0.12]} />
        <meshStandardMaterial color={color} emissive={highlight ? color : "#000000"} emissiveIntensity={highlight ? 0.5 : 0} />
      </mesh>
      {highlight && <pointLight position={[0, 0.6, 0]} color={color} intensity={0.8} distance={1.6} />}
    </group>
  );
}

/**
 * Straight 3D track: one lane per horse, each horse's x position driven
 * directly by the real race-progress array the page already animates
 * (the same `positions` state that used to drive a CSS left-offset bar).
 */
export default function HorseRaceScene3D({
  horses,
  positions,
  trackLength,
  selected,
}: {
  horses: { name: string }[];
  positions: number[];
  trackLength: number;
  selected: number;
}) {
  const trackWorldLength = 5;
  const laneGap = 0.5;
  const laneCount = horses.length;
  const offsetZ = ((laneCount - 1) * laneGap) / 2;
  const maxPos = Math.max(...positions, 0);

  const laneLines = useMemo(() => Array.from({ length: laneCount + 1 }, (_, i) => i), [laneCount]);

  return (
    <group position={[-trackWorldLength / 2, 0, 0]}>
      {/* track surface */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[trackWorldLength / 2, -0.02, 0]}
        receiveShadow
      >
        <planeGeometry args={[trackWorldLength + 1.4, laneCount * laneGap + 0.6]} />
        <meshStandardMaterial color="#163d1a" roughness={0.9} />
      </mesh>

      {/* lane dividers */}
      {laneLines.map((i) => (
        <mesh key={i} position={[trackWorldLength / 2, 0.005, i * laneGap - offsetZ - laneGap / 2]}>
          <boxGeometry args={[trackWorldLength + 1.4, 0.01, 0.015]} />
          <meshStandardMaterial color="#ffffff" transparent opacity={0.35} />
        </mesh>
      ))}

      {/* start line */}
      <mesh position={[0, 0.01, 0]}>
        <boxGeometry args={[0.05, 0.02, laneCount * laneGap]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
      </mesh>

      {/* finish line */}
      <mesh position={[trackWorldLength, 0.01, 0]}>
        <boxGeometry args={[0.06, 0.02, laneCount * laneGap]} />
        <meshStandardMaterial color="#ffd54a" emissive="#7a5c00" emissiveIntensity={0.5} />
      </mesh>

      {horses.map((h, i) => {
        const pos = positions[i] ?? 0;
        const x = Math.min(pos / trackLength, 1) * trackWorldLength;
        const z = i * laneGap - offsetZ;
        const leading = pos > 0 && pos === maxPos;
        return (
          <group key={h.name} position={[x, 0, z]}>
            <HorseModel color={PALETTE[i % PALETTE.length]} highlight={i === selected} leading={leading} />
          </group>
        );
      })}
    </group>
  );
}
