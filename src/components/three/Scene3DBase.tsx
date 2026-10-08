"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, MeshReflectorMaterial, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { ReactNode } from "react";

/**
 * Shared Canvas shell used by every in-game 3D scene. Keeps lighting,
 * a glossy reflective casino floor, soft contact shadows and a light
 * bloom/vignette post-process consistent across games so each game only
 * has to describe its own objects.
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
      <Canvas shadows camera={{ position: cameraPosition, fov }} dpr={[1, 1.75]}>
        <color attach="background" args={["#07081a"]} />
        <fog attach="fog" args={["#07081a", 11, 24]} />

        {/* Lighting: warm key, cool rim, soft overhead fill */}
        <ambientLight intensity={0.38} />
        <directionalLight
          position={[4.5, 7, 4]}
          intensity={1.1}
          color="#fff1d6"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0005}
        />
        <pointLight position={[-5, 3.2, -3]} intensity={10} color="#7c5cff" distance={12} decay={2} />
        <spotLight position={[0, 6.5, 1]} angle={0.5} penumbra={0.8} intensity={18} color="#ffd54a" distance={14} decay={2} />
        <hemisphereLight args={["#342a66", "#05060f", 0.45]} />

        {/* Glossy casino floor beneath every game's own table/board */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
          <planeGeometry args={[26, 26]} />
          <MeshReflectorMaterial
            blur={[260, 90]}
            resolution={512}
            mixBlur={1.1}
            mixStrength={28}
            roughness={0.92}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color="#06070f"
            metalness={0.55}
            mirror={0}
          />
        </mesh>
        <ContactShadows position={[0, -0.075, 0]} opacity={0.55} scale={14} blur={2.2} far={3} />

        {children}

        {orbit && <OrbitControls enablePan={false} minDistance={4} maxDistance={12} maxPolarAngle={Math.PI / 2.1} />}

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.55} luminanceThreshold={0.35} luminanceSmoothing={0.25} mipmapBlur radius={0.6} />
          <Vignette eskil={false} offset={0.22} darkness={0.55} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
