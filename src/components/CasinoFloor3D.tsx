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
  const spacingX = 6;
  const spacingZ = 6.5;
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

/* ---------------------------------------------------------------------- */
/* Actual 3D models for each game — built from primitives, not flat signs */
/* ---------------------------------------------------------------------- */

function Dice({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const pipMat = <meshStandardMaterial color="#1a1a1a" />;
  const pipPositions: [number, number, number][] = [
    [0.12, 0.12, 0.26],
    [-0.12, -0.12, 0.26],
    [0.12, -0.12, 0.26],
    [-0.12, 0.12, 0.26],
    [0, 0, 0.26],
  ];
  return (
    <group position={position} scale={scale} rotation={[0.3, 0.5, 0.1]}>
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>
      {pipPositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.045, 8, 8]} />
          {pipMat}
        </mesh>
      ))}
    </group>
  );
}

function SlotsModel() {
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[1.3, 2.2, 1]} />
        <meshStandardMaterial color="#7c1f3a" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.5, 0.52]}>
        <boxGeometry args={[1.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>
      {[-0.32, 0, 0.32].map((x, i) => (
        <mesh key={i} position={[x, 1.5, 0.56]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.14, 0.08, 16]} />
          <meshStandardMaterial color={["#ffd54a", "#ff5470", "#34d399"][i]} emissive={["#ffd54a", "#ff5470", "#34d399"][i]} emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0.8, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.9, 8]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.8, 1.76, 0]} castShadow>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.15, 0.52]}>
        <boxGeometry args={[1.1, 0.3, 0.06]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

function RouletteModel({ spin }: { spin?: boolean }) {
  const wheelRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (wheelRef.current && spin) wheelRef.current.rotation.y += delta * 1.4;
  });
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.1, 1, 32]} />
        <meshStandardMaterial color="#1b2a1b" roughness={0.6} />
      </mesh>
      <group ref={wheelRef} position={[0, 1.05, 0]}>
        <mesh>
          <cylinderGeometry args={[0.95, 0.95, 0.12, 32]} />
          <meshStandardMaterial color="#3a2a12" metalness={0.5} roughness={0.4} />
        </mesh>
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.7, 0.07, Math.sin(a) * 0.7]}>
              <boxGeometry args={[0.16, 0.05, 0.16]} />
              <meshStandardMaterial color={i % 2 === 0 ? "#c62828" : "#111111"} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.1, 0]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshStandardMaterial color="#ffd54a" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function CardTableModel({ felt = "#14532d" }: { felt?: string }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 1.3, 0.15, 32]} />
        <meshStandardMaterial color={felt} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[1.32, 1.32, 0.05, 32]} />
        <meshStandardMaterial color="#3a2210" roughness={0.6} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[-0.25 + i * 0.25, 0.6 + i * 0.012, 0.2]} rotation={[-Math.PI / 2, 0, (i - 1) * 0.15]}>
          <boxGeometry args={[0.32, 0.46, 0.02]} />
          <meshStandardMaterial color="#f4f4f4" />
        </mesh>
      ))}
      {[0.2, 0.36, 0.52].map((y, i) => (
        <mesh key={i} position={[0.5, 0.58 + y * 0.12, -0.3]}>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 24]} />
          <meshStandardMaterial color={["#c62828", "#1565c0", "#2e7d32"][i]} />
        </mesh>
      ))}
    </group>
  );
}

function CrashModel() {
  const rocketRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (rocketRef.current) rocketRef.current.position.y = 1.4 + Math.sin(clock.getElapsedTime() * 2) * 0.12;
  });
  return (
    <group>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.2, 24]} />
        <meshStandardMaterial color="#1a1030" />
      </mesh>
      <group ref={rocketRef} rotation={[0, 0, -0.15]}>
        <mesh castShadow>
          <coneGeometry args={[0.28, 0.8, 16]} />
          <meshStandardMaterial color="#e5e5e5" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.28, 0.28, 0.5, 16]} />
          <meshStandardMaterial color="#d32f2f" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.75, 0]}>
          <coneGeometry args={[0.35, 0.3, 16]} />
          <meshStandardMaterial color="#ff8a00" emissive="#ff6a00" emissiveIntensity={1.2} />
        </mesh>
      </group>
    </group>
  );
}

function PlinkoModel() {
  const pegs: [number, number][] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      pegs.push([(col - row / 2) * 0.26, 1.9 - row * 0.26]);
    }
  }
  return (
    <group>
      <mesh position={[0, 1, -0.15]} castShadow>
        <boxGeometry args={[1.6, 2, 0.1]} />
        <meshStandardMaterial color="#171c38" />
      </mesh>
      {pegs.map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.05]}>
          <sphereGeometry args={[0.06, 10, 10]} />
          <meshStandardMaterial color="#ffd54a" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0.15, 0.05]}>
        <boxGeometry args={[1.6, 0.25, 0.1]} />
        <meshStandardMaterial color="#34d399" emissive="#0d2e1f" />
      </mesh>
    </group>
  );
}

function DiceCupModel({ count = 2 }: { count?: number }) {
  return (
    <group position={[0, 0.3, 0]}>
      {Array.from({ length: count }).map((_, i) => (
        <Dice key={i} position={[(i - (count - 1) / 2) * 0.55, 0.3, 0]} />
      ))}
    </group>
  );
}

function HorseTrackModel() {
  const horseRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (horseRef.current) {
      const t = clock.getElapsedTime() * 0.6;
      horseRef.current.position.x = Math.cos(t) * 0.9;
      horseRef.current.position.z = Math.sin(t) * 0.5;
      horseRef.current.rotation.y = -t - Math.PI / 2;
    }
  });
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} receiveShadow>
        <ringGeometry args={[0.65, 1.05, 32]} />
        <meshStandardMaterial color="#8d6e3a" side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[0.65, 32]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
      <group ref={horseRef} position={[0.9, 0.22, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.4, 0.22, 0.16]} />
          <meshStandardMaterial color="#6b4226" />
        </mesh>
        <mesh position={[0.22, 0.14, 0]}>
          <boxGeometry args={[0.1, 0.22, 0.12]} />
          <meshStandardMaterial color="#6b4226" />
        </mesh>
      </group>
    </group>
  );
}

function CoinflipModel() {
  const coinRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (coinRef.current) coinRef.current.rotation.y += delta * 1.8;
  });
  return (
    <group ref={coinRef} position={[0, 1.1, 0]} rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

function HigherLowerModel() {
  return (
    <group position={[0, 0.9, 0]}>
      <mesh position={[0, -0.25, 0]} rotation={[0, 0, -0.05]} castShadow>
        <boxGeometry args={[0.5, 0.72, 0.03]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>
      <mesh position={[0.1, 0.25, 0.1]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[0.5, 0.72, 0.03]} />
        <meshStandardMaterial color="#f4f4f4" />
      </mesh>
      <mesh position={[0, 0.85, 0.15]}>
        <coneGeometry args={[0.15, 0.3, 4]} />
        <meshStandardMaterial color="#34d399" emissive="#0d2e1f" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function MinesModel() {
  const [hit] = useState(() => Math.floor(Math.random() * 9));
  return (
    <group position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: 9 }).map((_, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        return (
          <mesh key={i} position={[(col - 1) * 0.42, (row - 1) * 0.42, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.36, 0.36, 0.14]} />
            <meshStandardMaterial color={i === hit ? "#ff5470" : "#2a3a6a"} emissive={i === hit ? "#5a0010" : "#000000"} />
          </mesh>
        );
      })}
    </group>
  );
}

function WheelModel() {
  const wheelRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (wheelRef.current) wheelRef.current.rotation.z += delta * 0.8;
  });
  const colors = ["#c62828", "#1565c0", "#f9a825", "#2e7d32", "#6a1b9a"];
  return (
    <group position={[0, 1.3, 0]}>
      <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.6, 8]} />
        <meshStandardMaterial color="#8d6e3a" />
      </mesh>
      <group ref={wheelRef}>
        {colors.map((c, i) => (
          <mesh key={i} rotation={[0, 0, (i / colors.length) * Math.PI * 2]}>
            <coneGeometry args={[0.85, 0.3, 8, 1, false, 0, (Math.PI * 2) / colors.length]} />
            <meshStandardMaterial color={c} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.32, 16]} />
          <meshStandardMaterial color="#ffd54a" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, 0.95, 0]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.08, 0.18, 8]} />
        <meshStandardMaterial color="#ffd54a" />
      </mesh>
    </group>
  );
}

function KenoModel() {
  const cageRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (cageRef.current) cageRef.current.rotation.z += delta * 0.9;
  });
  const balls: [number, number, number][] = [
    [0.3, 0.1, 0], [-0.3, -0.1, 0.1], [0, 0.3, -0.2], [0.15, -0.3, 0.15], [-0.2, 0.2, 0.25],
  ];
  return (
    <group position={[0, 1.2, 0]}>
      <group ref={cageRef}>
        <mesh>
          <sphereGeometry args={[0.65, 12, 8]} />
          <meshStandardMaterial color="#9ca3af" wireframe />
        </mesh>
        {balls.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.12, 12, 12]} />
            <meshStandardMaterial color={["#ffd54a", "#ff5470", "#34d399", "#60a5fa", "#c084fc"][i]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function WarModel() {
  return (
    <group>
      <CardTableModel felt="#7a1020" />
      <group position={[0, 1.5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.07, 1.1, 0.07]} />
          <meshStandardMaterial color="#c9c9c9" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
          <boxGeometry args={[0.07, 1.1, 0.07]} />
          <meshStandardMaterial color="#c9c9c9" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

function VideoPokerModel() {
  return (
    <group>
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.1, 1.8, 0.7]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.4, 0.36]}>
        <boxGeometry args={[0.9, 0.9, 0.05]} />
        <meshStandardMaterial color="#0b3d2e" emissive="#0b3d2e" emissiveIntensity={0.4} />
      </mesh>
      {[-0.32, -0.1, 0.12, 0.34].map((x, i) => (
        <mesh key={i} position={[x, 1.1, 0.5]}>
          <boxGeometry args={[0.16, 0.06, 0.02]} />
          <meshStandardMaterial color="#ffd54a" />
        </mesh>
      ))}
    </group>
  );
}

function LimboModel() {
  return (
    <group>
      <mesh position={[-0.6, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.8, 10]} />
        <meshStandardMaterial color="#8d6e3a" />
      </mesh>
      <mesh position={[0.6, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.8, 10]} />
        <meshStandardMaterial color="#8d6e3a" />
      </mesh>
      <mesh position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 1.3, 12]} />
        <meshStandardMaterial color="#ff5470" emissive="#5a0010" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function GameModel({ slug }: { slug: string }) {
  switch (slug) {
    case "slots":
      return <SlotsModel />;
    case "roulette":
      return <RouletteModel spin />;
    case "blackjack":
      return <CardTableModel felt="#14532d" />;
    case "poker":
      return <CardTableModel felt="#1b3a5c" />;
    case "baccarat":
      return <CardTableModel felt="#5c1b3a" />;
    case "crash":
      return <CrashModel />;
    case "plinko":
      return <PlinkoModel />;
    case "craps":
      return <DiceCupModel count={2} />;
    case "sicbo":
      return <DiceCupModel count={3} />;
    case "horse-racing":
      return <HorseTrackModel />;
    case "coinflip":
      return <CoinflipModel />;
    case "higherlower":
      return <HigherLowerModel />;
    case "mines":
      return <MinesModel />;
    case "wheel":
      return <WheelModel />;
    case "keno":
      return <KenoModel />;
    case "war":
      return <WarModel />;
    case "videopoker":
      return <VideoPokerModel />;
    case "limbo":
      return <LimboModel />;
    default:
      return (
        <mesh position={[0, 0.9, 0]} castShadow>
          <boxGeometry args={[0.8, 1.6, 0.8]} />
          <meshStandardMaterial color="#7c5cff" />
        </mesh>
      );
  }
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
  const liftRef = useRef<THREE.Group>(null);
  const bobRef = useRef(Math.random() * 10);

  useFrame((_, delta) => {
    bobRef.current += delta;
    if (liftRef.current) {
      liftRef.current.position.y = hovered ? 0.1 + Math.sin(bobRef.current * 2) * 0.03 : 0;
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
      {/* Floor plate under each station */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[1.7, 32]} />
        <meshStandardMaterial color={hovered ? "#2a2200" : "#0d1026"} emissive={hovered ? "#4a3a00" : "#000000"} />
      </mesh>

      <group ref={liftRef}>
        <GameModel slug={game.slug} />
      </group>

      <Text position={[0, -0.02, 1.35]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color={hovered ? "#ffd54a" : "#f1f3fb"} anchorX="center" anchorY="middle" maxWidth={2.2} textAlign="center">
        {game.name}
      </Text>

      {hovered && <Sparkles count={24} scale={2} size={3} speed={0.6} color="#ffd54a" position={[0, 1.2, 0]} />}

      <pointLight position={[0, 1.8, 0]} intensity={hovered ? 2.4 : 0.5} distance={4} color={hovered ? "#ffd54a" : "#7c5cff"} />
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[90, 90]} />
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
      <fog attach="fog" args={["#060712", 20, 60]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 14, 6]} intensity={0.65} castShadow />
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

      <Text position={[0, 6, -22]} fontSize={1.6} color="#ffd54a" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
        ULTIMATE CASINO FLOOR
      </Text>

      <OrbitControls enablePan minDistance={6} maxDistance={45} maxPolarAngle={Math.PI / 2.1} target={[0, 1, 0]} />
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
      <Canvas shadows camera={{ position: [0, 12, 20], fov: 50 }}>
        <Suspense fallback={null}>
          <Scene onEnter={onEnter} />
        </Suspense>
      </Canvas>
      <div className="absolute top-3 left-3 panel px-3 py-2 text-xs text-muted pointer-events-none">
        Drag to orbit &middot; scroll to zoom &middot; click a game station to play
      </div>
      {pending && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-lg font-bold">
          Walking over to {GAMES.find((g) => g.slug === pending)?.name}...
        </div>
      )}
    </div>
  );
}
