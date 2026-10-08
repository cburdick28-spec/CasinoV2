"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ACESFilmicToneMapping } from "three";
import { GAMES } from "@/lib/gameList";
import HUD from "./HUD";
import PlayerController from "./PlayerController";
import Rooms from "./Rooms";
import Stations from "./Stations";
import { SPAWN, EYE_HEIGHT } from "./world";
import { enterFocus, getFocus, isInWorldGame } from "./inworld";
import { getSlotMachine, requestSpin, type ServerOutcome } from "./slotMachines";
import { getSlotPlay, onSlotSettled, patchSlotPlay } from "./slotPlay";
import { useUser } from "@/lib/UserContext";

const BG = "#1a0f1c";

export default function CasinoWalk() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const { user, refresh, pushToast, celebrate } = useUser();

  // Latest account + helpers for the callbacks below, without re-creating them on every balance change.
  const live = useRef({ user, refresh, pushToast, celebrate });
  useEffect(() => {
    live.current = { user, refresh, pushToast, celebrate };
    patchSlotPlay({ balance: user?.money ?? 0 });
  }, [user, refresh, pushToast, celebrate]);

  // The stake of the round in flight, so the result line can say what was won or lost.
  const round = useRef<{ bet: number } | null>(null);

  // When the reels have fully stopped: reveal the result, move the balance, celebrate.
  useEffect(
    () =>
      onSlotSettled((_id, result) => {
        const r = round.current;
        round.current = null;
        patchSlotPlay({ busy: false });
        if (!r || result.source !== "server") return;
        const money = (n: number) => `$${n.toLocaleString()}`;
        if (result.jackpotWon > 0) {
          patchSlotPlay({ message: { kind: "win", text: `JACKPOT! +${money(result.payout)}` } });
          live.current.pushToast("win", `JACKPOT +${money(result.payout)}`);
          live.current.celebrate();
        } else if (result.win) {
          const net = result.payout - r.bet;
          patchSlotPlay({ message: { kind: "win", text: `Winner! +${money(net)}` } });
          live.current.pushToast("win", `+${money(net)}`);
          live.current.celebrate();
        } else {
          patchSlotPlay({ message: { kind: "lose", text: `No match  -${money(r.bet)}` } });
          live.current.pushToast("lose", `-${money(r.bet)}`);
        }
        void live.current.refresh();
      }),
    []
  );

  /** Place the bet with the server, then aim the reels at what it says. The balance moves when they stop. */
  const spinSlot = useCallback(async (slug: string) => {
    const machine = getSlotMachine(slug);
    const sp = getSlotPlay();
    if (!machine || sp.busy) return;
    const u = live.current.user;
    if (!u) {
      patchSlotPlay({ message: { kind: "info", text: "Log in to place a bet" } });
      live.current.pushToast("info", "Log in to play");
      return;
    }
    const bet = Math.floor(sp.bet);
    if (bet < 1 || bet > u.money) {
      patchSlotPlay({ message: { kind: "lose", text: "Not enough balance for that bet" } });
      return;
    }
    patchSlotPlay({ busy: true, message: null });
    try {
      const res = await fetch("/api/games/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet }),
      });
      const data = (await res.json().catch(() => null)) as (ServerOutcome & { error?: string }) | null;
      if (!res.ok || !data || !Array.isArray(data.reels)) {
        patchSlotPlay({ busy: false, message: { kind: "lose", text: data?.error || "The machine jammed, try again" } });
        return;
      }
      round.current = { bet };
      if (!requestSpin(machine, undefined, data)) {
        // Reels were somehow still moving; the bet is already placed, so refresh the balance.
        round.current = null;
        patchSlotPlay({ busy: false });
        void live.current.refresh();
      }
    } catch {
      patchSlotPlay({ busy: false, message: { kind: "lose", text: "Could not reach the casino, try again" } });
    }
  }, []);

  const onInteract = useCallback(
    (slug: string, openFullGame = false) => {
      // Slot machines play right here in the 3D world: first E sits you down at the machine (set your
      // bet with the arrow keys), every E after that pulls the lever.
      if (!openFullGame && isInWorldGame(slug)) {
        if (getFocus() !== slug) enterFocus(slug);
        else void spinSlot(slug);
        return;
      }
      if (busy.current) return;
      busy.current = true;
      const game = GAMES.find((g) => g.slug === slug);
      setLeaving(game ? `${game.emoji} ${game.name}` : slug);
      if (typeof document !== "undefined" && document.pointerLockElement) document.exitPointerLock();
      setTimeout(() => router.push(`/games/${slug}`), 450);
    },
    [router, spinSlot]
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
