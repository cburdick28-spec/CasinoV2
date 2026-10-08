"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useRef, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import { GAMES } from "@/lib/gameList";
import HUD from "./HUD";
import PlayerController from "./PlayerController";
import Rooms from "./Rooms";
import Stations from "./Stations";
import { SPAWN, EYE_HEIGHT } from "./world";
import { enterFocus, isInWorldGame } from "./inworld";
import { getSlotMachine, requestSpin } from "./slotMachines";

const BG = "#1a0f1c";

export default function CasinoWalk() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [leaving, setLeaving] = useState<string | null>(null);

  const onInteract = useCallback(
    (slug: string, openFullGame = false) => {
      // Slot machines play right here in the 3D world: frame the reels and pull the lever.
      if (!openFullGame && isInWorldGame(slug)) {
        enterFocus(slug);
        const machine = getSlotMachine(slug);
        if (machine) requestSpin(machine);
        return;
      }
      if (busy.current) return;
      busy.current = true;
      const game = GAMES.find((g) => g.slug === slug);
      setLeaving(game ? `${game.emoji} ${game.name}` : slug);
      if (typeof document !== "undefined" && document.pointerLockElement) document.exitPointerLock();
      setTimeout(() => router.push(`/games/${slug}`), 450);
    },
    [router]
  );

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden"
      style={{
        height: "calc(100vh - 140px)",
        minHeight: 520,
        borderRadius: 18,
        background: BG,
        border: "1px solid var(--border)",
        touchAction: "none",
      }}
    >
      <Canvas
        dpr={[1, 1.5]}
        shadows={false}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping }}
        camera={{ fov: 70, near: 0.1, far: 200, position: [SPAWN.x, EYE_HEIGHT, SPAWN.z] }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 18, 60]} />
        <ambientLight intensity={0.22} color="#cfd8ff" />
        <hemisphereLight args={["#ffd9b0", "#2a1822", 0.3]} />
        <Suspense fallback={null}>
          <Rooms />
          <Stations />
        </Suspense>
        <PlayerController onInteract={onInteract} />
        <EffectComposer multisampling={0}>
          <Bloom intensity={0.28} luminanceThreshold={1.05} luminanceSmoothing={0.2} mipmapBlur />
          <Vignette eskil={false} offset={0.3} darkness={0.65} />
        </EffectComposer>
      </Canvas>

      <HUD containerRef={wrapRef} onInteract={onInteract} />

      <div
        className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center"
        style={{
          background: BG,
          opacity: leaving ? 1 : 0,
          transition: "opacity .4s ease",
        }}
      >
        {leaving && (
          <div className="text-center">
            <div className="font-extrabold" style={{ fontSize: 28, color: "#ffd54a" }}>
              Walking to {leaving}...
            </div>
            <div className="mt-2 text-sm" style={{ color: "#c9b79a" }}>
              Hold on to your chips
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
