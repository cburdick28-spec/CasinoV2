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

const TRAIL = 6;

/** A glossy ball that eases toward its (x, y) target with a little hop per row, a glow and a short trail,
 * so every ball reads as its own object even when several share a row. */
function Ball({ x, y, color, index }: { x: number; y: number; color: string; index: number }) {
  const group = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Group>(null);
  const hist = useRef<{ x: number; y: number }[]>([]);
  const jx = ((index * 37) % 11) / 11 * 0.08 - 0.04;
  const z = 0.14 + index * 0.012;
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const tx = x + jx;
    g.position.x = THREE.MathUtils.lerp(g.position.x, tx, 0.22);
    const dy = g.position.y - y;
    g.position.y = THREE.MathUtils.lerp(g.position.y, y, 0.22);
    // hop: a bounce proportional to how far the ball still has to fall
    g.position.z = z + Math.min(0.06, Math.abs(dy) * 0.25);
    const h = hist.current;
    h.unshift({ x: g.position.x, y: g.position.y });
    if (h.length > TRAIL * 2) h.pop();
    const t = trail.current;
    if (t) t.children.forEach((c, i) => {
      const p = h[Math.min(h.length - 1, (i + 1) * 2 - 1)];
      if (p) c.position.set(p.x - g.position.x, p.y - g.position.y, -0.01);
    });
  });
  return (
    <>
      <group ref={group} position={[x, y, z]}>
        <mesh castShadow>
          <sphereGeometry args={[0.115, 28, 28]} />
          <meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.12} clearcoat={1} metalness={0.2} />
        </mesh>
        <mesh scale={1.9}>
          <sphereGeometry args={[0.115, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} toneMapped={false} />
        </mesh>
        <group ref={trail}>
          {Array.from({ length: TRAIL }, (_, i) => (
            <mesh key={i} scale={1 - i * 0.14}>
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshBasicMaterial color={color} transparent opacity={0.32 - i * 0.045} depthWrite={false} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    </>
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
  bucketColors,
}: {
  rows: number;
  liveBalls: LiveBall[];
  bucketCount: number;
  /** Optional per-bucket colours (e.g. by payout). */
  bucketColors?: string[];
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
        <meshStandardMaterial color="#0c1024" roughness={0.9} />
      </mesh>
      {/* chrome side rails */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} position={[sd * (BOARD_HALF_WIDTH + 0.3), (topY + bottomY) / 2, 0.05]}>
          <boxGeometry args={[0.12, topY - bottomY + 1, 0.3]} />
          <meshStandardMaterial color="#c9ced8" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}

      {pegs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.16, 12]} />
          <meshStandardMaterial color="#e8ecf4" metalness={0.95} roughness={0.15} />
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
      {bucketColors && bucketColors.map((c, i) => {
        const x0 = bucketDividers[i], x1 = bucketDividers[i + 1];
        if (x1 === undefined) return null;
        return (
          <mesh key={i} position={[(x0 + x1) / 2, bottomY - 0.12, 0.0]}>
            <boxGeometry args={[Math.abs(x1 - x0) - 0.04, 0.3, 0.05]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.45} roughness={0.4} />
          </mesh>
        );
      })}

      {liveBalls.map((b, i) => {
        const worldX = ((b.x - 50) / 50) * BOARD_HALF_WIDTH;
        const worldY = b.row < 0 ? topY + 0.35 : topY - 0.4 - b.row * ROW_SPACING;
        return <Ball key={i} index={i} x={worldX} y={worldY} color={b.color} />;
      })}
    </group>
  );
}
