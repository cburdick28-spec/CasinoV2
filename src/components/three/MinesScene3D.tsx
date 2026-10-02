"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MinesTileProps {
  index: number;
  position: [number, number];
  isRevealed: boolean;
  isMine: boolean;
  isDimmed: boolean;
  justRevealed: boolean;
  disabled: boolean;
  onReveal: (tile: number) => void;
}

/**
 * A single 3D mines tile. Renders a solid "cover" block while hidden, and
 * sinks/flips it away to expose either a glowing gem (safe) or a spiky mine
 * when the real server state says this tile has been revealed.
 */
function MinesTile({ index, position, isRevealed, isMine, isDimmed, justRevealed, disabled, onReveal }: MinesTileProps) {
  const coverRef = useRef<THREE.Group>(null);
  const contentRef = useRef<THREE.Group>(null);
  const mineMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const gemMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const flashLightRef = useRef<THREE.PointLight>(null);
  const progress = useRef(0);
  const flashRef = useRef(0);

  const open = isRevealed || isMine;

  useFrame((_, delta) => {
    const target = open ? 1 : 0;
    progress.current += (target - progress.current) * Math.min(1, delta * 7);

    if (coverRef.current) {
      coverRef.current.position.y = 0.18 - progress.current * 0.5;
      coverRef.current.rotation.x = progress.current * (Math.PI / 2.1);
    }

    if (contentRef.current) {
      const s = progress.current;
      contentRef.current.scale.setScalar(s);
      contentRef.current.position.y = 0.12 + Math.sin(progress.current * Math.PI) * 0.08;
      if (isMine) contentRef.current.rotation.y += delta * 1.6;
      else contentRef.current.rotation.y += delta * 0.8;
    }

    flashRef.current = justRevealed ? Math.min(1, flashRef.current + delta * 10) : Math.max(0, flashRef.current - delta * 4);

    if (mineMatRef.current) mineMatRef.current.emissiveIntensity = 0.6 + flashRef.current * 1.4;
    if (gemMatRef.current) gemMatRef.current.emissiveIntensity = 0.7 + flashRef.current * 0.8;
    if (flashLightRef.current) flashLightRef.current.intensity = flashRef.current * 5;
  });

  const [x, z] = position;

  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(e) => {
        if (disabled || isRevealed || isMine) return;
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && !isRevealed && !isMine) onReveal(index);
      }}
    >
      {/* socket the tile sits in */}
      <mesh position={[0, -0.02, 0]} receiveShadow>
        <boxGeometry args={[0.78, 0.05, 0.78]} />
        <meshStandardMaterial color="#05060f" />
      </mesh>

      {/* cover block — solid while hidden, sinks/flips away on reveal */}
      <group ref={coverRef} position={[0, 0.18, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.72, 0.3, 0.72]} />
          <meshStandardMaterial
            color={isDimmed ? "#161a2e" : "#2a3a6a"}
            emissive={isDimmed ? "#000000" : "#16214d"}
            emissiveIntensity={0.45}
            transparent
            opacity={isDimmed ? 0.32 : 1}
            roughness={0.5}
            metalness={0.2}
          />
        </mesh>
      </group>

      {/* revealed content: gem (safe) or mine */}
      <group ref={contentRef} position={[0, 0.12, 0]} scale={0}>
        {isMine ? (
          <group>
            <mesh castShadow>
              <icosahedronGeometry args={[0.22, 0]} />
              <meshStandardMaterial ref={mineMatRef} color="#ff5470" emissive="#7a0018" emissiveIntensity={0.6} roughness={0.4} />
            </mesh>
            <pointLight ref={flashLightRef} color="#ff5470" intensity={0} distance={2.2} />
          </group>
        ) : (
          <mesh castShadow>
            <octahedronGeometry args={[0.2, 0]} />
            <meshStandardMaterial ref={gemMatRef} color="#34d399" emissive="#0d7a53" emissiveIntensity={0.7} roughness={0.2} metalness={0.3} />
          </mesh>
        )}
      </group>
    </group>
  );
}

export default function MinesScene3D({
  gridSize,
  cols = 5,
  revealed,
  mines,
  flashTile,
  disabled,
  onReveal,
}: {
  gridSize: number;
  cols?: number;
  revealed: number[];
  mines: number[] | null;
  flashTile: number | null;
  disabled: boolean;
  onReveal: (tile: number) => void;
}) {
  const positions = useMemo(() => {
    const spacing = 0.86;
    const rows = Math.ceil(gridSize / cols);
    const arr: [number, number][] = [];
    for (let i = 0; i < gridSize; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      arr.push([(col - (cols - 1) / 2) * spacing, (row - (rows - 1) / 2) * spacing]);
    }
    return arr;
  }, [gridSize, cols]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#0a0d1f" />
      </mesh>
      {positions.map(([x, z], i) => {
        const isRevealed = revealed.includes(i);
        const isMine = !!mines?.includes(i);
        const isDimmed = !!mines && !isRevealed && !isMine;
        return (
          <MinesTile
            key={i}
            index={i}
            position={[x, z]}
            isRevealed={isRevealed}
            isMine={isMine}
            isDimmed={isDimmed}
            justRevealed={flashTile === i}
            disabled={disabled}
            onReveal={onReveal}
          />
        );
      })}
    </group>
  );
}
