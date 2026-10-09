"use client";

import { Suspense, useMemo, useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Same European wheel pocket order + colors as the page's bet-resolution
// logic (src/app/games/roulette/page.tsx) — keep these in sync with it.
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26,
];
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
import { FONT_URL } from "../walk/stations/common";
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
  base = true,
}: {
  spinning: boolean;
  winningNumber: number | null;
  /** Draw the scene's own round table base (the 2D page wants it; the in-world table already has a felt). */
  base?: boolean;
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

    // A new spin starts with no result; forget the last one so the same number twice in a row still tweens.
    if (winningNumber === null) s.lastWinning = null;

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
      // Ball rides the outer track, then drops into the pockets as the spin runs out.
      const t = s.tweening ? Math.min(1, (clock.getElapsedTime() - s.tweenStart) / SPIN_DURATION) : spinning ? 0 : 1;
      const drop = THREE.MathUtils.smoothstep(t, 0.55, 0.95);
      const r = THREE.MathUtils.lerp(1.2, 0.9, drop);
      const hop = drop > 0 && drop < 1 ? Math.abs(Math.sin(drop * Math.PI * 5)) * 0.05 * (1 - drop) : 0;
      const y = THREE.MathUtils.lerp(0.2, 0.15, drop) + hop;
      ballRef.current.position.set(Math.sin(s.ballAngle) * r, y, Math.cos(s.ballAngle) * r);
    }
  });

  const bowl = useMemo(() => {
    const pts = [
      [0.0, -0.1], [1.2, -0.1], [1.52, -0.02], [1.58, 0.1], [1.58, 0.26], [1.5, 0.3],
      [1.42, 0.27], [1.36, 0.2], [1.3, 0.15], [1.12, 0.1], [0.0, 0.1],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 96);
  }, []);
  const pockets = useMemo(
    () =>
      WHEEL_ORDER.map((n, i) => {
        const a = i * POCKET_ANGLE;
        const half = POCKET_ANGLE / 2;
        // RingGeometry lives in XY; rotateX(PI/2) maps angle phi -> world (cos phi, sin phi) on (x, z); we want (sin a, cos a).
        const geo = new THREE.RingGeometry(0.62, 1.08, 1, 1, Math.PI / 2 - (a + half), POCKET_ANGLE);
        geo.rotateX(Math.PI / 2);
        return { n, a, geo };
      }),
    [],
  );

  return (
    <group>
      {base && (
        <mesh position={[0, -0.08, 0]} receiveShadow castShadow>
          <cylinderGeometry args={[1.55, 1.6, 0.3, 48]} />
          <meshStandardMaterial color="#2a1c0d" roughness={0.6} metalness={0.2} />
        </mesh>
      )}

      {/* Static polished wooden bowl with ball track */}
      <mesh geometry={bowl} position={[0, 0.02, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial color="#5b2a10" roughness={0.35} clearcoat={1} clearcoatRoughness={0.12} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5, 0.025, 10, 96]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.12, 0.018, 8, 96]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Rotating wheel */}
      <group ref={wheelRef} position={[0, 0.1, 0]}>
        <mesh>
          <cylinderGeometry args={[1.12, 1.12, 0.06, 64]} />
          <meshStandardMaterial color="#1a0f08" roughness={0.5} metalness={0.3} />
        </mesh>
        {pockets.map(({ n, geo }) => (
          <mesh key={n} geometry={geo} position={[0, 0.045, 0]} receiveShadow>
            <meshStandardMaterial color={pocketColor(n)} roughness={0.35} metalness={0.15} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* metal frets between pockets */}
        {WHEEL_ORDER.map((n, i) => {
          const a = (i + 0.5) * POCKET_ANGLE;
          const rm = 0.85;
          return (
            <mesh key={n} position={[Math.sin(a) * rm, 0.065, Math.cos(a) * rm]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.012, 0.045, 0.46]} />
              <meshStandardMaterial color="#e8e2d0" metalness={0.95} roughness={0.2} />
            </mesh>
          );
        })}
        <Suspense fallback={null}>
          {pockets.map(({ n, a }) => (
            <group key={n} rotation={[0, a, 0]}>
              <Text
                font={FONT_URL}
                position={[0, 0.072, 0.93]}
                rotation={[-Math.PI / 2, 0, Math.PI]}
                fontSize={0.085}
                anchorX="center"
                anchorY="middle"
                color="#ffffff"
                material-toneMapped={false}
              >
                {String(n)}
              </Text>
            </group>
          ))}
        </Suspense>
        {/* inner cone + turret */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.18, 0.62, 0.14, 48]} />
          <meshPhysicalMaterial color="#6b3414" roughness={0.3} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <cylinderGeometry args={[0.05, 0.12, 0.12, 24]} />
          <meshStandardMaterial color="#f2c14e" metalness={0.95} roughness={0.18} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.055, 20, 20]} />
          <meshStandardMaterial color="#f2c14e" metalness={0.95} roughness={0.15} />
        </mesh>
        {[0, Math.PI / 2].map((r) => (
          <mesh key={r} position={[0, 0.24, 0]} rotation={[0, r, 0]}>
            <boxGeometry args={[0.7, 0.018, 0.018]} />
            <meshStandardMaterial color="#f2c14e" metalness={0.95} roughness={0.18} />
          </mesh>
        ))}
      </group>

      {/* Ball */}
      <group ref={ballRef}>
        <mesh castShadow>
          <sphereGeometry args={[0.045, 24, 24]} />
          <meshPhysicalMaterial color="#fdfdfb" roughness={0.08} clearcoat={1} metalness={0.05} />
        </mesh>
      </group>

      {/* Fixed pointer at world angle 0 (+Z) marking where results land */}
      <mesh position={[0, 0.4, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.07, 0.18, 4]} />
        <meshStandardMaterial color="#f2c14e" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
}
