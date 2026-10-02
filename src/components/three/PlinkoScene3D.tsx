"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const ROW_SPACING = 0.32;
const BOARD_HALF_WIDTH = 2.6;

interface LiveBall {
  x: number; // 0-100, same percentage space the page's CSS version uses
  row: number; // -1 before the first step, then 0..rows-1
  color: string;
}

/** A single ball, lerping toward its current (x, y) target each frame so the
 * discrete per-row steps the page computes still read as smooth motion. */
function Ball({ x, y, color }: { x: number; y: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    m.position.x = THREE.MathUtils.lerp(m.position.x, x, 0.28);
    m.position.y = THREE.MathUtils.lerp(m.position.y, y, 0.28);
  });
  return (
    <mesh ref={ref} position={[x, y, 0.12]} castShadow>
      <sphereGeometry args={[0.1, 14, 14]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
  );
}

/**
 * A 3D peg board. Takes the page's own `liveBalls` state — already stepped
 * row-by-row from the server's real `path` arrays on the page's existing
 * 180ms interval — and just renders it in 3D instead of as CSS `left`/`top`.
 */
export default function PlinkoScene3D({
  rows,
  liveBalls,
  bucketCount,
}: {
  rows: number;
  liveBalls: LiveBall[];
  bucketCount: number;
}) {
  const topY = (rows / 2) * ROW_SPACING + 0.4;
  const bottomY = topY - 0.4 - (rows - 1) * ROW_SPACING;

  const pegs = useMemo(() => {
    const list: { x: number; y: number }[] = [];
    for (let r = 0; r < rows; r++) {
      const count = r + 2;
      for (let c = 0; c < count; c++) {
        const frac = (c - (count - 1) / 2) / ((rows + 2) / 2);
        list.push({ x: frac * BOARD_HALF_WIDTH, y: topY - 0.4 - r * ROW_SPACING });
      }
    }
    return list;
  }, [rows, topY]);

  const bucketDividers = useMemo(() => {
    const list: number[] = [];
    for (let i = 0; i <= bucketCount; i++) {
      const frac = (i - bucketCount / 2) / ((rows + 2) / 2);
      list.push(frac * BOARD_HALF_WIDTH);
    }
    return list;
  }, [bucketCount, rows]);

  return (
    <group position={[0, -0.9, 0]}>
      {/* backboard */}
      <mesh position={[0, (topY + bottomY) / 2, -0.2]}>
        <boxGeometry args={[BOARD_HALF_WIDTH * 2 + 0.6, topY - bottomY + 1, 0.12]} />
        <meshStandardMaterial color="#171c38" />
      </mesh>

      {pegs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0.05]}>
          <sphereGeometry args={[0.07, 10, 10]} />
          <meshStandardMaterial color="#ffd54a" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}

      {bucketDividers.map((x, i) => (
        <mesh key={i} position={[x, bottomY - 0.05, 0.05]}>
          <boxGeometry args={[0.03, 0.34, 0.14]} />
          <meshStandardMaterial color="#34d399" emissive="#0d2e1f" />
        </mesh>
      ))}
      <mesh position={[0, bottomY - 0.22, 0.05]}>
        <boxGeometry args={[BOARD_HALF_WIDTH * 2 + 0.2, 0.12, 0.14]} />
        <meshStandardMaterial color="#34d399" emissive="#0d2e1f" emissiveIntensity={0.4} />
      </mesh>

      {liveBalls.map((b, i) => {
        const worldX = ((b.x - 50) / 50) * BOARD_HALF_WIDTH;
        const worldY = b.row < 0 ? topY + 0.35 : topY - 0.4 - b.row * ROW_SPACING;
        return <Ball key={i} x={worldX} y={worldY} color={b.color} />;
      })}
    </group>
  );
}
