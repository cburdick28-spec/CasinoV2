"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Pip layouts for each face, 1-6, on a unit square from -0.3..0.3.
const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-0.18, 0.18], [0.18, -0.18]],
  3: [[-0.18, 0.18], [0, 0], [0.18, -0.18]],
  4: [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]],
  5: [[-0.18, 0.18], [0.18, 0.18], [0, 0], [-0.18, -0.18], [0.18, -0.18]],
  6: [[-0.18, 0.18], [0.18, 0.18], [-0.18, 0], [0.18, 0], [-0.18, -0.18], [0.18, -0.18]],
};

// Face rotations so the given pip count ends up facing +Y (up).
const FACE_UP_ROTATION: Record<number, [number, number, number]> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  2: [Math.PI / 2, 0, 0],
  5: [-Math.PI / 2, 0, 0],
  3: [0, 0, -Math.PI / 2],
  4: [0, 0, Math.PI / 2],
};

function Face({ rotation, value }: { rotation: [number, number, number]; value: number }) {
  return (
    <group rotation={rotation} position={[0, 0.251, 0]}>
      {PIPS[value].map(([x, y], i) => (
        <mesh key={i} position={[x, 0, y]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.045, 12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A single 3D die that tumbles while `rolling` is true and settles on `value`
 * (1-6) once rolling stops. Positions/values come straight from the server
 * result — this component is purely the visualization.
 */
export function Die3D({
  value,
  rolling,
  position = [0, 0.3, 0],
  seed = 0,
}: {
  value: number;
  rolling: boolean;
  position?: [number, number, number];
  seed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const clamped = Math.min(6, Math.max(1, value));
  const settleRot = useMemo(() => new THREE.Euler(...FACE_UP_ROTATION[clamped]), [clamped]);

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;
    if (rolling) {
      const t = clock.getElapsedTime() + seed;
      groupRef.current.rotation.x += delta * (6 + seed);
      groupRef.current.rotation.y += delta * (5 + seed * 0.7);
      groupRef.current.rotation.z += delta * (4 + seed * 0.4);
      groupRef.current.position.y = position[1] + Math.abs(Math.sin(t * 8)) * 0.35;
    } else {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, settleRot.x, 0.25);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, settleRot.y, 0.25);
      groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, settleRot.z, 0.25);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, position[1], 0.25);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#f4f4f4" roughness={0.4} />
      </mesh>
      {[1, 2, 3, 4, 5, 6].map((v) => (
        <Face key={v} rotation={FACE_UP_ROTATION[v]} value={v} />
      ))}
    </group>
  );
}

export function DiceTray3D({ values, rolling }: { values: number[]; rolling: boolean }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[2, 40]} />
        <meshStandardMaterial color="#14532d" roughness={0.9} />
      </mesh>
      {values.map((v, i) => (
        <Die3D key={i} value={v} rolling={rolling} seed={i * 1.7} position={[(i - (values.length - 1) / 2) * 0.75, 0.3, 0]} />
      ))}
    </>
  );
}
