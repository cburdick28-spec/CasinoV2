"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Sparkles } from "@react-three/drei";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GAMES, type GameMeta } from "@/lib/gameList";

// Deterministic layout: lay the games out in a grid on the casino floor,
// leaving an aisle down the middle and a little breathing room at the edges.
function layoutPositions(count: number) {
  const cols = Math.ceil(Math.sqrt(count * 1.4));
  const rows = Math.ceil(count / cols);
  const spacingX = 5.5;
  const spacingZ = 6;
  const positions: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = (col - (cols - 1) / 2) * spacingX;
    const z = (row - (rows - 1) / 2) * spacingZ;
    positions.push([x, z]);
  }
  return positions;
}

function Pedestal({
  game,
  position,
  hovered,
  onHover,
  onClick,
}: {
  game: GameMeta;
  position: [number, number];
  hovered: boolean;
  onHover: (v: boolean) => void;
  onClick: () => void;
}) {
  const signRef = useRef<THREE.Group>(null);
  const bobRef = useRef(0);

  useFrame((_, delta) => {
    bobRef.current += delta;
    if (signRef.current) {
      signRef.current.position.y = 2.65 + Math.sin(bobRef.current * 1.5) * 0.06;
      signRef.current.rotation.y = Math.sin(bobRef.current * 0.6) * 0.15;
    }
  });

  const [x, z] = position;

  return (
    <group
      position={[x, 0, z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      {/* Podium */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.3, 1, 24]} />
        <meshStandardMaterial color={hovered ? "#ffd54a" : "#171c38"} emissive={hovered ? "#4a3a00" : "#000000"} metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.85, 1.1, 0.1, 24]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Floating sign */}
      <group ref={signRef} position={[0, 2.65, 0]}>
        <Text fontSize={0.62} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {game.emoji}
        </Text>
        <Text position={[0, -0.55, 0]} fontSize={0.26} color={hovered ? "#ffd54a" : "#f1f3fb"} anchorX="center" anchorY="middle" maxWidth={2.2} textAlign="center">
          {game.name}
        </Text>
      </group>

      {hovered && <Sparkles count={20} scale={1.8} size={3} speed={0.6} color="#ffd54a" position={[0, 1.2, 0]} />}

      <pointLight position={[0, 1.4, 0]} intensity={hovered ? 2.2 : 0.7} distance={3.5} color={hovered ? "#ffd54a" : "#7c5cff"} />
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[80, 80]} />
      <meshStandardMaterial color="#0d1026" roughness={0.6} metalness={0.2} />
    </mesh>
  );
}

function Scene({ onEnter }: { onEnter: (slug: string) => void }) {
  const positions = useMemo(() => layoutPositions(GAMES.length), []);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  return (
    <>
      <color attach="background" args={["#060712"]} />
      <fog attach="fog" args={["#060712", 20, 55]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[8, 14, 6]} intensity={0.6} castShadow />
      <hemisphereLight args={["#2a2060", "#060712", 0.5]} />

      <Floor />

      {GAMES.map((g, i) => (
        <Pedestal
          key={g.slug}
          game={g}
          position={positions[i]}
          hovered={hoveredSlug === g.slug}
          onHover={(v) => setHoveredSlug(v ? g.slug : null)}
          onClick={() => onEnter(g.slug)}
        />
      ))}

      <Text position={[0, 6, -20]} fontSize={1.6} color="#ffd54a" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
        ULTIMATE CASINO FLOOR
      </Text>

      <OrbitControls
        enablePan
        minDistance={6}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1, 0]}
      />
    </>
  );
}

export default function CasinoFloor3D() {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  function onEnter(slug: string) {
    setPending(slug);
    router.push(`/games/${slug}`);
  }

  return (
    <div className="relative w-full rounded-[18px] overflow-hidden border border-[var(--border)]" style={{ height: "70vh", minHeight: 420 }}>
      <Canvas shadows camera={{ position: [0, 11, 18], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene onEnter={onEnter} />
        </Suspense>
      </Canvas>
      <div className="absolute top-3 left-3 panel px-3 py-2 text-xs text-muted pointer-events-none">
        Drag to orbit &middot; scroll to zoom &middot; click a podium to play
      </div>
      {pending && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-lg font-bold">
          Walking over to {GAMES.find((g) => g.slug === pending)?.name}...
        </div>
      )}
    </div>
  );
}
