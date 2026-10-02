"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SPIN_DURATION = 3; // seconds — matches the page's post-fetch reveal delay

function segmentColor(mult: number) {
  if (mult === 0) return "#3a1520";
  if (mult < 1) return "#274a8f";
  if (mult === 1) return "#1f8f5f";
  if (mult < 3) return "#a8791f";
  return "#c1273a";
}

/**
 * A vertical prize wheel made of flat pie-slice wedges (one per entry in
 * `segments`, colored the same way as the page's old 2D wheel), spinning
 * around the Z axis and settling so the fixed pointer at the top lands on
 * the wedge at `winningIndex` — the real index the server returned. The
 * wheel's final rotation is computed directly from `winningIndex`, so the
 * pointer always ends up over the true result, never a random-looking stop.
 */
export default function WheelScene3D({
  segments,
  winningIndex,
  spinning,
}: {
  segments: number[];
  winningIndex: number | null;
  spinning: boolean;
}) {
  const wheelRef = useRef<THREE.Group>(null);
  const N = segments.length;
  const segAngle = (Math.PI * 2) / N;

  const state = useRef({
    angle: 0,
    from: 0,
    to: 0,
    tweenStart: 0,
    tweening: false,
    lastIndex: null as number | null,
  });

  useFrame(({ clock }, delta) => {
    const s = state.current;

    if (winningIndex !== null && winningIndex !== s.lastIndex) {
      s.lastIndex = winningIndex;
      const extraTurns = 5;
      // The pointer is fixed at the top (world angle 0, +Y). Segment `i`
      // occupies local angle [i*segAngle, (i+1)*segAngle) around Z, centered
      // at (i + 0.5) * segAngle. Rotate the wheel so that center lands at
      // the pointer's angle.
      const segCenter = (winningIndex + 0.5) * segAngle;
      const desiredMod = THREE.MathUtils.euclideanModulo(-segCenter, Math.PI * 2);
      const fromMod = THREE.MathUtils.euclideanModulo(s.angle, Math.PI * 2);
      let step = desiredMod - fromMod;
      if (step < 0) step += Math.PI * 2;
      s.from = s.angle;
      s.to = s.angle + step + extraTurns * Math.PI * 2;
      s.tweenStart = clock.getElapsedTime();
      s.tweening = true;
    }

    if (s.tweening) {
      const t = Math.min(1, (clock.getElapsedTime() - s.tweenStart) / SPIN_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      s.angle = THREE.MathUtils.lerp(s.from, s.to, eased);
      if (t >= 1) s.tweening = false;
    } else if (spinning) {
      s.angle += delta * 3.5;
    }

    if (wheelRef.current) wheelRef.current.rotation.z = s.angle;
  });

  return (
    <group>
      {/* Backing rim */}
      <mesh position={[0, 0, -0.08]}>
        <circleGeometry args={[1.42, 48]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>

      {/* Spinning wedges */}
      <group ref={wheelRef}>
        {segments.map((mult, i) => (
          <mesh key={i} position={[0, 0, 0]}>
            <circleGeometry args={[1.35, 8, i * segAngle, segAngle * 0.97]} />
            <meshStandardMaterial color={segmentColor(mult)} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.18, 24]} />
          <meshStandardMaterial color="#f2c14e" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>

      {/* Fixed pointer at the top (world angle 0, +Y) */}
      <mesh position={[0, 1.55, 0.05]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.12, 0.26, 4]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}
