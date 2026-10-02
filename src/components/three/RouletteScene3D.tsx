"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Same European wheel pocket order + colors as the page's bet-resolution
// logic (src/app/games/roulette/page.tsx) — keep these in sync with it.
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const N = WHEEL_ORDER.length;
const POCKET_ANGLE = (Math.PI * 2) / N;
const SPIN_DURATION = 2.5; // seconds — matches the page's post-fetch reveal delay

function pocketColor(n: number): string {
  if (n === 0) return "#1f8f5f";
  return RED_NUMBERS.has(n) ? "#c1273a" : "#14141f";
}

/**
 * A 3D roulette wheel + ball. The wheel rotates so the pocket of
 * `winningNumber` (the real server result) always ends up aligned with the
 * fixed gold pointer at the front of the table (world angle 0, +Z), and the
 * ball independently spins around the rim and settles at that exact same
 * world angle — so whichever pocket lands there (determined purely by the
 * wheel's rotation, computed from the true result) is where the ball rests.
 * Neither the wheel's nor the ball's final position is random: both tween to
 * angles computed from `winningNumber`.
 */
export default function RouletteScene3D({
  spinning,
  winningNumber,
}: {
  spinning: boolean;
  winningNumber: number | null;
}) {
  const wheelRef = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Group>(null);

  const state = useRef({
    wheelAngle: 0,
    wheelFrom: 0,
    wheelTo: 0,
    ballAngle: 0,
    ballFrom: 0,
    ballTo: 0,
    tweenStart: 0,
    tweening: false,
    lastWinning: null as number | null,
  });

  useFrame(({ clock }, delta) => {
    const s = state.current;

    if (winningNumber !== null && winningNumber !== s.lastWinning) {
      s.lastWinning = winningNumber;
      const idx = Math.max(0, WHEEL_ORDER.indexOf(winningNumber));
      const extraTurns = 4;

      // Wheel: rotate so pocket `idx` ends up at world angle 0 (the pointer).
      const desiredWheelMod = THREE.MathUtils.euclideanModulo(-idx * POCKET_ANGLE, Math.PI * 2);
      const wheelFromMod = THREE.MathUtils.euclideanModulo(s.wheelAngle, Math.PI * 2);
      let wheelStep = desiredWheelMod - wheelFromMod;
      if (wheelStep < 0) wheelStep += Math.PI * 2;
      s.wheelFrom = s.wheelAngle;
      s.wheelTo = s.wheelAngle + wheelStep + extraTurns * Math.PI * 2;

      // Ball: always settles at world angle 0 too — since the wheel has just
      // been rotated so the winning pocket sits there, the ball lands in it.
      const ballFromMod = THREE.MathUtils.euclideanModulo(s.ballAngle, Math.PI * 2);
      let ballStep = -ballFromMod;
      if (ballStep < 0) ballStep += Math.PI * 2;
      s.ballFrom = s.ballAngle;
      s.ballTo = s.ballAngle + ballStep + (extraTurns + 3) * Math.PI * 2;

      s.tweenStart = clock.getElapsedTime();
      s.tweening = true;
    }

    if (s.tweening) {
      const t = Math.min(1, (clock.getElapsedTime() - s.tweenStart) / SPIN_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      s.wheelAngle = THREE.MathUtils.lerp(s.wheelFrom, s.wheelTo, eased);
      s.ballAngle = THREE.MathUtils.lerp(s.ballFrom, s.ballTo, eased);
      if (t >= 1) s.tweening = false;
    } else if (spinning) {
      // Waiting on the server result — idle spin, no destination yet.
      s.wheelAngle += delta * 0.7;
      s.ballAngle -= delta * 3.4;
    }

    if (wheelRef.current) wheelRef.current.rotation.y = s.wheelAngle;
    if (ballRef.current) {
      const r = 1.0;
      const lift = s.tweening || spinning ? 0.09 : 0;
      ballRef.current.position.set(Math.sin(s.ballAngle) * r, 0.22 + lift, Math.cos(s.ballAngle) * r);
    }
  });

  return (
    <group>
      {/* Table base */}
      <mesh position={[0, -0.08, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.55, 1.6, 0.3, 48]} />
        <meshStandardMaterial color="#2a1c0d" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Rotating wheel */}
      <group ref={wheelRef} position={[0, 0.1, 0]}>
        <mesh receiveShadow>
          <cylinderGeometry args={[1.3, 1.3, 0.14, 48]} />
          <meshStandardMaterial color="#0d0d1a" roughness={0.5} metalness={0.3} />
        </mesh>
        {WHEEL_ORDER.map((n, i) => {
          const a = i * POCKET_ANGLE;
          const r = 1.08;
          return (
            <mesh key={n} position={[Math.sin(a) * r, 0.09, Math.cos(a) * r]} rotation={[0, -a, 0]} castShadow>
              <boxGeometry args={[0.16, 0.12, POCKET_ANGLE * r * 0.85]} />
              <meshStandardMaterial color={pocketColor(n)} roughness={0.5} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.3, 0.32, 0.22, 24]} />
          <meshStandardMaterial color="#f2c14e" metalness={0.7} roughness={0.25} />
        </mesh>
      </group>

      {/* Ball */}
      <group ref={ballRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#f5f5f5" metalness={0.3} roughness={0.15} />
        </mesh>
      </group>

      {/* Fixed pointer at world angle 0 (+Z) marking where results land */}
      <mesh position={[0, 0.45, 1.45]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.1, 0.25, 4]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.5} roughness={0.3} />
      </mesh>
    </group>
  );
}
