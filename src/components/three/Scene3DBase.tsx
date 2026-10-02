"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { ReactNode } from "react";

/**
 * Shared Canvas shell used by every in-game 3D scene. Keeps lighting,
 * background and sizing consistent across games so each game only has to
 * describe its own objects.
 */
export default function Scene3DBase({
  children,
  height = 340,
  cameraPosition = [0, 3.4, 6.2],
  fov = 42,
  orbit = false,
}: {
  children: ReactNode;
  height?: number;
  cameraPosition?: [number, number, number];
  fov?: number;
  orbit?: boolean;
}) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-[var(--border)]" style={{ height }}>
      <Canvas shadows camera={{ position: cameraPosition, fov }}>
        <color attach="background" args={["#0a0d1f"]} />
        <fog attach="fog" args={["#0a0d1f", 10, 26]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 7, 4]} intensity={0.85} castShadow />
        <hemisphereLight args={["#2a2060", "#060712", 0.5]} />
        {children}
        {orbit && <OrbitControls enablePan={false} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.1} />}
      </Canvas>
    </div>
  );
}
