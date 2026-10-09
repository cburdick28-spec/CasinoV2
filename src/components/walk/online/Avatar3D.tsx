"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AvatarConfig } from "@/lib/avatar";

/** Low-poly person, ~1.7m tall, origin at the feet, facing +z. `walk` (0..1) swings the limbs; `seated` bends the legs. */
export default function Avatar3D({ config, walk = 0, seated = false }: { config: AvatarConfig; walk?: number; seated?: boolean }) {
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt * (4 + walk * 5);
    const sw = Math.sin(t.current) * 0.7 * walk;
    if (seated) {
      if (legL.current) legL.current.rotation.x = -1.45;
      if (legR.current) legR.current.rotation.x = -1.45;
      if (armL.current) armL.current.rotation.x = -0.8;
      if (armR.current) armR.current.rotation.x = -0.8;
    } else {
      if (legL.current) legL.current.rotation.x = sw;
      if (legR.current) legR.current.rotation.x = -sw;
      if (armL.current) armL.current.rotation.x = -sw;
      if (armR.current) armR.current.rotation.x = sw;
    }
  });

  const { skin, shirt, pants, hair, hairStyle, hat } = config;
  const gloss = { roughness: 0.55, metalness: 0.05 } as const;

  return (
    <group position={[0, seated ? -0.28 : 0, 0]}>
      {/* legs: pivot at the hip */}
      {[-0.1, 0.1].map((x, i) => (
        <group key={x} ref={i === 0 ? legL : legR} position={[x, 0.86, 0]}>
          <mesh position={[0, -0.4, 0]} castShadow>
            <capsuleGeometry args={[0.075, 0.68, 4, 10]} />
            <meshStandardMaterial color={pants} {...gloss} />
          </mesh>
          <mesh position={[0, -0.82, 0.04]}>
            <boxGeometry args={[0.13, 0.07, 0.24]} />
            <meshStandardMaterial color="#17131a" roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* torso */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.32, 6, 14]} />
        <meshStandardMaterial color={shirt} {...gloss} />
      </mesh>
      {/* arms: pivot at the shoulder */}
      {[-0.28, 0.28].map((x, i) => (
        <group key={x} ref={i === 0 ? armL : armR} position={[x, 1.33, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.36, 4, 10]} />
            <meshStandardMaterial color={shirt} {...gloss} />
          </mesh>
          <mesh position={[0, -0.52, 0]}>
            <sphereGeometry args={[0.055, 12, 12]} />
            <meshStandardMaterial color={skin} {...gloss} />
          </mesh>
        </group>
      ))}
      {/* neck + head */}
      <mesh position={[0, 1.45, 0]}>
        <cylinderGeometry args={[0.06, 0.07, 0.1, 10]} />
        <meshStandardMaterial color={skin} {...gloss} />
      </mesh>
      <group position={[0, 1.6, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.15, 20, 20]} />
          <meshStandardMaterial color={skin} {...gloss} />
        </mesh>
        {[-0.055, 0.055].map((x) => (
          <mesh key={x} position={[x, 0.02, 0.13]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#14141c" roughness={0.3} />
          </mesh>
        ))}
        {hairStyle > 0 && (
          <group>
            <mesh position={[0, 0.04, -0.01]} scale={[1.04, hairStyle === 1 ? 0.9 : 1, 1.04]}>
              <sphereGeometry args={[0.15, 20, 20, 0, Math.PI * 2, 0, Math.PI * (hairStyle === 1 ? 0.5 : 0.62)]} />
              <meshStandardMaterial color={hair} roughness={0.8} />
            </mesh>
            {hairStyle === 2 && (
              <mesh position={[0, -0.1, -0.08]}>
                <capsuleGeometry args={[0.13, 0.2, 4, 12]} />
                <meshStandardMaterial color={hair} roughness={0.8} />
              </mesh>
            )}
            {hairStyle === 3 &&
              [0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2;
                return (
                  <mesh key={i} position={[Math.sin(a) * 0.09, 0.17, Math.cos(a) * 0.09]} rotation={[Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5]}>
                    <coneGeometry args={[0.04, 0.12, 6]} />
                    <meshStandardMaterial color={hair} roughness={0.8} />
                  </mesh>
                );
              })}
          </group>
        )}
        {hat === 1 && (
          <group position={[0, 0.13, 0]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.2, 0.02, 24]} />
              <meshStandardMaterial color="#14141c" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.11, 0]}>
              <cylinderGeometry args={[0.12, 0.13, 0.2, 24]} />
              <meshStandardMaterial color="#14141c" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.04, 0]}>
              <cylinderGeometry args={[0.132, 0.132, 0.04, 24]} />
              <meshStandardMaterial color="#c1273a" roughness={0.5} />
            </mesh>
          </group>
        )}
        {hat === 2 && (
          <group position={[0, 0.07, 0]}>
            <mesh>
              <sphereGeometry args={[0.16, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
              <meshStandardMaterial color={shirt} roughness={0.7} />
            </mesh>
            <mesh position={[0, 0.0, 0.17]} rotation={[0.1, 0, 0]}>
              <boxGeometry args={[0.2, 0.015, 0.14]} />
              <meshStandardMaterial color={shirt} roughness={0.7} />
            </mesh>
          </group>
        )}
        {hat === 3 && (
          <group position={[0, 0.17, 0]}>
            <mesh>
              <cylinderGeometry args={[0.13, 0.11, 0.1, 5]} />
              <meshStandardMaterial color="#f2c14e" metalness={0.9} roughness={0.2} />
            </mesh>
            {[0, 1, 2, 3, 4].map((i) => {
              const a = (i / 5) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.sin(a) * 0.12, 0.09, Math.cos(a) * 0.12]}>
                  <coneGeometry args={[0.035, 0.1, 4]} />
                  <meshStandardMaterial color="#f2c14e" metalness={0.9} roughness={0.2} />
                </mesh>
              );
            })}
          </group>
        )}
      </group>
    </group>
  );
}
