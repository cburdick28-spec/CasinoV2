"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { C, Kit, KitMeshes, kitCache } from "./kit";
import { notifySlotSettled } from "../slotPlay";
import { FACE_COUNT, FACE_STEP, FACE_SYMBOLS, getSlotMachine, requestSpin, setRigged, setUpcomingWin, updateSlotMachine, type SymbolId } from "../slotMachines";

const P = Math.PI;

/** A "7", built from two bars. `lite` puts it on the lit body layer instead of glow. */
export function seven(k: Kit, lite: boolean, x: number, y: number, z: number, s: number, color: string) {
  const o = lite ? { layer: "body" as const } : { layer: "glow" as const, i: 1.9 };
  k.box(0.1 * s, 0.028 * s, 0.02, color, [x, y + 0.075 * s, z], { ...o, r: 0.008 });
  k.box(0.03 * s, 0.17 * s, 0.02, color, [x + 0.0 * s, y - 0.005 * s, z], { ...o, r: 0.008, rot: [0, 0, -0.5] });
}

/** Draw one symbol on a face (face plane at z = 0, art sits just in front of it). */
function drawSymbol(k: Kit, sym: SymbolId) {
  const lit = { layer: "scr" as const, i: 1.05 };
  switch (sym) {
    case "SEVEN":
      seven(k, true, 0, 0, 0.022, 0.95, "#e0483b");
      break;
    case "CHERRY":
      k.sph(0.03, "#e0283b", [-0.027, -0.014, 0.024], { seg: 10, scale: [1, 1, 0.55] });
      k.sph(0.03, "#e0283b", [0.027, -0.014, 0.024], { seg: 10, scale: [1, 1, 0.55] });
      k.box(0.008, 0.055, 0.01, C.green, [-0.012, 0.03, 0.022], { rot: [0, 0, 0.35] });
      k.box(0.008, 0.055, 0.01, C.green, [0.012, 0.03, 0.022], { rot: [0, 0, -0.35] });
      break;
    case "LEMON":
      k.sph(0.04, "#ffe03a", [0, 0, 0.024], { seg: 12, scale: [1.5, 1, 0.5] });
      k.sph(0.012, "#ffe03a", [0.062, 0.004, 0.024], { seg: 6, scale: [1, 0.8, 0.5] });
      k.box(0.03, 0.012, 0.008, C.green, [-0.012, 0.042, 0.03], { rot: [0, 0, 0.5] });
      break;
    case "MELON":
      k.sph(0.05, "#2f9e4a", [0, -0.012, 0.02], { seg: 14, scale: [1.5, 1, 0.4] });
      k.sph(0.043, "#ff4a5e", [0, -0.012, 0.03], { seg: 14, scale: [1.5, 0.9, 0.4] });
      for (const [x, y] of [[-0.025, -0.01], [0.0, 0.0], [0.025, -0.01], [-0.012, -0.03], [0.014, -0.03]]) k.box(0.008, 0.014, 0.008, "#2a1a2e", [x, y, 0.04], { rot: [0, 0, 0.3] });
      break;
    case "STAR":
      k.box(0.075, 0.075, 0.012, "#ffcf3a", [0, 0, 0.022], { ...lit, i: 1.3, r: 0.004 });
      k.box(0.075, 0.075, 0.012, "#ffe27a", [0, 0, 0.03], { ...lit, i: 1.4, rot: [0, 0, P / 4], r: 0.004 });
      break;
    case "DIAMOND":
      k.box(0.08, 0.08, 0.012, C.cyan, [0, 0, 0.022], { ...lit, i: 1.3, rot: [0, 0, P / 4], r: 0.004 });
      k.box(0.045, 0.045, 0.012, "#e8fbff", [0, 0, 0.03], { ...lit, i: 1.4, rot: [0, 0, P / 4], r: 0.004 });
      break;
  }
}

/** Cylinder with FACE_COUNT faces; face j shows when the reel's rotation.x equals j * FACE_STEP. */
const reelKit = () =>
  kitCache("reel-symbols", (k) => {
    k.cyl(0.16, 0.16, 0.19, C.cream, [0, 0, 0], { rot: [0, 0, P / 2], seg: 24 });
    for (let j = 0; j < FACE_COUNT; j++) {
      const a = j * FACE_STEP;
      k.at([0, Math.sin(a) * 0.162, Math.cos(a) * 0.162], [-a, 0, 0], null, () => {
        k.box(0.16, 0.115, 0.03, C.paper, [0, 0, 0], { r: 0.008, layer: "scr", i: 0.8 });
        drawSymbol(k, FACE_SYMBOLS[j]);
      });
    }
    for (const s of [-1, 1]) k.cyl(0.165, 0.165, 0.012, C.goldDeep, [s * 0.098, 0, 0], { rot: [0, 0, P / 2], seg: 24 });
  });

const leverKit = () =>
  kitCache("lever", (k) => {
    k.cyl(0.022, 0.022, 0.5, C.steel, [0, 0.25, 0], { seg: 8 });
    k.sph(0.07, C.red, [0, 0.54, 0], { seg: 14 });
  });

const REEL_X = [-0.205, 0, 0.205] as const;

/**
 * The three physical reels, the pull lever and the win flash of one cabinet. All motion is
 * driven by the pure state machine in slotMachines.ts; this component only samples it.
 * Nothing here triggers a React render per frame.
 */
export function SlotMachineReels({ machineId }: { machineId: string }) {
  const reelsRef = useRef<Group>(null);
  const notified = useRef(0);
  const leverRef = useRef<Group>(null);
  const flashMesh = useRef<Mesh>(null);
  const flashMat = useRef<MeshBasicMaterial>(null);
  const reel = useMemo(() => reelKit(), []);
  const lever = useMemo(() => leverKit(), []);

  // Debug handle for the sandbox (/floor?debug=1): window.__casinoSlots.rig(true) forces the next spin to win.
  useEffect(() => {
    if (typeof window === "undefined" || !/[?&]debug=1/.test(window.location.search)) return;
    const w = window as unknown as { __casinoSlots?: unknown };
    const api = {
      rig: (v = true) => setUpcomingWin(machineId, v),
      alwaysRig: (v = true) => setRigged(machineId, v),
      spin: () => requestSpin(getSlotMachine(machineId)!),
      state: () => {
        const m = getSlotMachine(machineId)!;
        return JSON.parse(JSON.stringify({ phase: m.phase, elapsed: m.elapsed, result: m.result, angles: m.reels.map((r) => r.angle), isRigged: m.isRigged, upcomingWin: m.upcomingWin }));
      },
    };
    w.__casinoSlots = api;
    return () => {
      if (w.__casinoSlots === api) delete w.__casinoSlots;
    };
  }, [machineId]);

  useFrame((_, delta) => {
    const m = getSlotMachine(machineId);
    if (!m) return;
    updateSlotMachine(m, delta);
    // Tell the HUD side once per round, the first frame the machine is SETTLED.
    if (m.phase === "SETTLED" && m.result && notified.current !== m.round) {
      notified.current = m.round;
      notifySlotSettled(machineId, m.result);
    }
    for (let i = 0; i < 3; i++) {
      const g = reelsRef.current?.children[i];
      if (g) g.rotation.x = m.reels[i].angle;
    }
    const lv = leverRef.current;
    if (lv) {
      const t = m.phase === "IDLE" ? 1 : m.elapsed;
      // Down and back up over the first 0.9 s of a pull.
      lv.rotation.x = (t < 0.9 ? Math.sin((t / 0.9) * P) : 0) * 1.15 - 0.05;
    }
    // Win flash: a pulsing gold wash over the reel window while the winning line is on show.
    const mat = flashMat.current;
    const mesh = flashMesh.current;
    if (mat && mesh) {
      const showing = m.phase === "SETTLED" && !!m.result?.win;
      const pulse = 0.5 + 0.5 * Math.sin(m.elapsed * 14);
      mat.opacity += ((showing ? 0.18 + 0.22 * pulse : 0) - mat.opacity) * (1 - Math.exp(-12 * Math.min(delta, 0.1)));
      mesh.visible = mat.opacity > 0.01;
    }
  });

  return (
    <>
      <group ref={reelsRef}>
        {REEL_X.map((x) => (
          <group key={x} position={[x, 1.545, 0.1]}>
            <KitMeshes built={reel} />
          </group>
        ))}
      </group>
      <group ref={leverRef} position={[0.5, 1.04, 0]}>
        <KitMeshes built={lever} />
      </group>
      <mesh ref={flashMesh} position={[0, 1.545, 0.285]} visible={false} renderOrder={5}>
        <planeGeometry args={[0.62, 0.44]} />
        <meshBasicMaterial ref={flashMat} color="#ffd24a" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} toneMapped={false} side={DoubleSide} />
      </mesh>
    </>
  );
}
