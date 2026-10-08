"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Color, Group, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from "three";
import { C, Kit, KitMeshes, type Layer, kitCache, lighten, pip, rand, shade } from "./kit";
import { Halo, Spin } from "./common";

const P = Math.PI;

/* ------------------------------ shared pieces ------------------------------ */

function stool(k: Kit, x: number, z: number, cushion: string) {
  k.cyl(0.2, 0.22, 0.04, C.dark, [x, 0.02, z], { seg: 18 });
  k.cyl(0.04, 0.04, 0.42, C.steel, [x, 0.24, z], { seg: 8 });
  k.cyl(0.19, 0.19, 0.09, cushion, [x, 0.5, z], { seg: 20 });
  k.sph(0.19, cushion, [x, 0.53, z], { scale: [1, 0.35, 1], seg: 16 });
  k.tor(0.19, 0.012, C.gold, [x, 0.46, z], { rot: [P / 2, 0, 0], seg: 20 });
}

function seven(k: Kit, lite: boolean, x: number, y: number, z: number, s: number, color: string) {
  const o = lite ? { layer: "body" as const } : { layer: "glow" as const, i: 1.9 };
  k.box(0.1 * s, 0.028 * s, 0.02, color, [x, y + 0.075 * s, z], { ...o, r: 0.008 });
  k.box(0.03 * s, 0.17 * s, 0.02, color, [x + 0.0 * s, y - 0.005 * s, z], { ...o, r: 0.008, rot: [0, 0, -0.5] });
}

const REEL_COLORS = ["#e0483b", "#ffe27a", "#ff4a4a", "#2a1a2e", "#ffc94a", "#8b5cf6", "#ff7eb6", "#2fb7a6"];
const reelKit = () =>
  kitCache("reel", (k) => {
    k.cyl(0.16, 0.16, 0.19, C.cream, [0, 0, 0], { rot: [0, 0, P / 2], seg: 24 });
    for (let j = 0; j < 8; j++) {
      const a = (j / 8) * P * 2;
      k.at([0, Math.sin(a) * 0.162, Math.cos(a) * 0.162], [-a, 0, 0], null, () => {
        k.box(0.16, 0.115, 0.03, C.paper, [0, 0, 0], { r: 0.008 });
        if (j % 4 === 2) {
          seven(k, true, 0, 0, 0.018, 0.9, "#e0483b");
        } else if (j % 4 === 0) {
          k.sph(0.028, REEL_COLORS[j], [-0.025, -0.012, 0.02], { seg: 8, scale: [1, 1, 0.5] });
          k.sph(0.028, REEL_COLORS[j], [0.025, -0.012, 0.02], { seg: 8, scale: [1, 1, 0.5] });
          k.box(0.008, 0.05, 0.01, C.green, [0, 0.03, 0.02], { rot: [0, 0, 0.2] });
        } else {
          k.box(0.1, 0.04, 0.012, REEL_COLORS[j], [0, 0, 0.02], { r: 0.008 });
        }
      });
    }
    for (const s of [-1, 1]) k.cyl(0.165, 0.165, 0.012, C.goldDeep, [s * 0.098, 0, 0], { rot: [0, 0, P / 2], seg: 24 });
  });

/** A whole slot machine, front toward +z. Machine height about 2.4m to the topper. */
function slotMachine(k: Kit, body: string, trim: string, staticReels: boolean, lite = false) {
  const L = (l: Layer): Layer => (lite ? "body" : l);
  const dark = shade(body, 0.55);
  // base and lower cabinet
  k.box(0.88, 0.14, 0.78, C.dark, [0, 0.07, 0], { r: 0.03 });
  k.box(0.8, 0.84, 0.68, body, [0, 0.55, 0], { r: 0.06 });
  k.box(0.82, 0.04, 0.7, trim, [0, 0.2, 0], { r: 0.015 });
  // button deck
  k.at([0, 1.0, 0.4], [0.3, 0, 0], null, () => {
    k.box(0.8, 0.09, 0.38, dark, [0, 0, 0], { r: 0.035 });
    const cols = [C.red, C.lemon, C.lime, C.cyan, C.pink];
    cols.forEach((c, i) => {
      k.cyl(0.043, 0.047, 0.035, c, [-0.28 + i * 0.14, 0.055, 0.04], { layer: L(i % 2 ? "a" : "b"), seg: 14, i: 1.5 });
      k.cyl(0.055, 0.055, 0.02, C.dark, [-0.28 + i * 0.14, 0.038, 0.04], { seg: 14 });
    });
    k.box(0.5, 0.016, 0.07, C.gold, [0, 0.05, -0.1], { r: 0.006, layer: L("glow"), i: 1.2 });
  });
  // coin tray
  k.box(0.46, 0.17, 0.12, C.dark, [0, 0.58, 0.37], { r: 0.03 });
  k.box(0.38, 0.1, 0.02, C.gold, [0, 0.6, 0.435], { layer: L("glow"), i: 1.3, r: 0.01 });
  // upper cabinet: cheeks, header, sill, back
  k.box(0.09, 0.9, 0.64, body, [-0.355, 1.55, -0.02], { r: 0.03 });
  k.box(0.09, 0.9, 0.64, body, [0.355, 1.55, -0.02], { r: 0.03 });
  k.box(0.8, 0.2, 0.64, body, [0, 1.84, -0.02], { r: 0.04 });
  k.box(0.8, 0.18, 0.64, body, [0, 1.23, -0.02], { r: 0.04 });
  k.box(0.8, 0.9, 0.1, dark, [0, 1.55, -0.3]);
  k.box(0.62, 0.46, 0.04, "#150a22", [0, 1.55, -0.05]);
  // window frame
  k.box(0.7, 0.05, 0.05, trim, [0, 1.76, 0.31], { r: 0.015 });
  k.box(0.7, 0.05, 0.05, trim, [0, 1.33, 0.31], { r: 0.015 });
  k.box(0.05, 0.46, 0.05, trim, [-0.34, 1.545, 0.31], { r: 0.015 });
  k.box(0.05, 0.46, 0.05, trim, [0.34, 1.545, 0.31], { r: 0.015 });
  k.box(0.62, 0.012, 0.012, C.red, [0, 1.545, 0.28], { layer: L("glow"), i: 1.8 });
  for (let i = 0; i < 9; i++) {
    const x = -0.3 + i * 0.075;
    k.sph(0.016, C.lemon, [x, 1.79, 0.34], { layer: L(i % 2 ? "a" : "b"), seg: 6 });
    k.sph(0.016, C.lemon, [x, 1.30, 0.34], { layer: L(i % 2 ? "b" : "a"), seg: 6 });
  }
  if (staticReels) {
    for (let i = -1; i <= 1; i++) {
      k.at([i * 0.205, 1.545, 0.1], [i * 0.5 + 0.3, 0, 0], null, () => {
        k.cyl(0.16, 0.16, 0.19, C.cream, [0, 0, 0], { rot: [0, 0, P / 2], seg: 16 });
        for (let j = 0; j < 4; j++) {
          const a = j * (P / 2);
          k.box(0.16, 0.12, 0.03, j % 2 ? C.paper : lighten(C.red, 0.7), [0, Math.sin(a) * 0.162, Math.cos(a) * 0.162], { rot: [-a, 0, 0], r: 0.008 });
        }
      });
    }
  }
  // crown with marquee
  k.box(0.9, 0.36, 0.7, dark, [0, 2.16, 0], { r: 0.07 });
  k.box(0.94, 0.05, 0.74, trim, [0, 1.97, 0], { r: 0.02 });
  k.box(0.94, 0.05, 0.74, trim, [0, 2.36, 0], { r: 0.02 });
  k.box(0.74, 0.24, 0.02, "#1b0f2c", [0, 2.16, 0.355]);
  seven(k, lite, -0.2, 2.16, 0.37, 1.1, "#ff5a4a");
  seven(k, lite, 0.0, 2.16, 0.37, 1.1, "#ffd24a");
  seven(k, lite, 0.2, 2.16, 0.37, 1.1, "#ff5a4a");
  for (let i = 0; i < 12; i++) {
    const x = -0.4 + i * (0.8 / 11);
    k.sph(0.025, C.lemon, [x, 2.3, 0.37], { layer: L(i % 2 ? "a" : "b"), seg: 6, i: 1.8 });
    k.sph(0.025, C.lemon, [x, 2.02, 0.37], { layer: L(i % 2 ? "b" : "a"), seg: 6, i: 1.8 });
  }
  for (let i = 0; i < 4; i++) {
    const y = 2.07 + i * 0.07;
    k.sph(0.025, C.lemon, [-0.4, y, 0.37], { layer: L(i % 2 ? "a" : "b"), seg: 6, i: 1.8 });
    k.sph(0.025, C.lemon, [0.4, y, 0.37], { layer: L(i % 2 ? "b" : "a"), seg: 6, i: 1.8 });
  }
  // topper
  k.cyl(0.1, 0.14, 0.06, trim, [0, 2.42, 0], { seg: 16 });
  k.sph(0.1, C.red, [0, 2.5, 0], { layer: L("glow"), i: 1.8, seg: 14 });
  // lever socket
  k.box(0.07, 0.2, 0.16, C.dark, [0.43, 1.04, 0], { r: 0.025 });
  k.cyl(0.04, 0.04, 0.08, trim, [0.47, 1.04, 0], { rot: [0, 0, P / 2], seg: 10 });
}

const slotMain = () => kitCache("slot-main", (k) => { slotMachine(k, "#d8403a", C.gold, false); stool(k, 0, 0.98, C.pink); });
const slotSide = (key: string, body: string) => kitCache("slot-side-" + key, (k) => slotMachine(k, body, C.gold, true, true));
const leverKit = () =>
  kitCache("lever", (k) => {
    k.cyl(0.022, 0.022, 0.5, C.steel, [0, 0.25, 0], { seg: 8 });
    k.sph(0.07, C.red, [0, 0.54, 0], { seg: 14 });
  });

const EASE = (u: number) => 1 - Math.pow(1 - u, 3);
const REEL_N = [P * 2 * 3 + (P / 4) * 3, P * 2 * 4 + (P / 4) * 2, P * 2 * 5 + (P / 4) * 5];

export function Slots() {
  const reels = useRef<Group>(null);
  const lever = useRef<Group>(null);
  const reel = useMemo(() => reelKit(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const PER = 6.5;
    const cyc = Math.floor(t / PER);
    const local = t - cyc * PER;
    for (let i = 0; i < 3; i++) {
      const u = Math.min(1, Math.max(0, (local - 0.45) / (2.0 + i * 0.7)));
      const g = reels.current?.children[i];
      if (g) g.rotation.x = (cyc + EASE(u)) * REEL_N[i];
    }
    if (lever.current) {
      const l = local < 0.9 ? Math.sin((local / 0.9) * P) : 0;
      lever.current.rotation.x = l * 1.15 - 0.05;
    }
  });
  return (
    <>
      <KitMeshes built={slotMain()} />
      <group ref={reels}>
        {[-0.205, 0, 0.205].map((x) => (
          <group key={x} position={[x, 1.545, 0.1]}>
            <KitMeshes built={reel} />
          </group>
        ))}
      </group>
      <group ref={lever} position={[0.5, 1.04, 0]}>
        <KitMeshes built={leverKit()} />
      </group>
      <Halo position={[0, 2.5, 0.05]} size={0.9} color="#ff6a5a" opacity={0.6} />
      <group position={[-0.74, 0, -0.14]} rotation={[0, 0.45, 0]} scale={0.76}>
        <KitMeshes built={slotSide("v", "#7a4fd6")} />
      </group>
      <group position={[0.74, 0, -0.14]} rotation={[0, -0.45, 0]} scale={0.76}>
        <KitMeshes built={slotSide("t", "#2aa391")} />
      </group>
    </>
  );
}

/* ------------------------------ VIDEO POKER ------------------------------ */

const vpKit = () =>
  kitCache("vp", (k) => {
    const body = "#2c4bb8";
    const dark = "#16245f";
    k.box(0.92, 0.14, 0.8, C.dark, [0, 0.07, 0], { r: 0.03 });
    k.box(0.86, 0.92, 0.72, body, [0, 0.6, 0], { r: 0.07 });
    k.box(0.88, 0.04, 0.74, C.cyan, [0, 0.24, 0], { r: 0.015, layer: "glow", i: 1.3 });
    k.box(0.03, 0.8, 0.03, C.cyan, [-0.44, 0.6, 0.34], { layer: "glow", i: 1.3 });
    k.box(0.03, 0.8, 0.03, C.cyan, [0.44, 0.6, 0.34], { layer: "glow", i: 1.3 });
    // button deck
    k.at([0, 1.07, 0.38], [0.28, 0, 0], null, () => {
      k.box(0.9, 0.09, 0.46, dark, [0, 0, 0], { r: 0.035 });
      const cols = [C.red, C.lemon, C.lime, C.cyan, C.pink];
      cols.forEach((c, i) => {
        k.cyl(0.05, 0.055, 0.04, c, [-0.3 + i * 0.15, 0.06, 0.11], { layer: i % 2 ? "a" : "b", seg: 14, i: 1.6 });
        k.cyl(0.062, 0.062, 0.02, C.dark, [-0.3 + i * 0.15, 0.04, 0.11], { seg: 14 });
      });
      k.cyl(0.07, 0.075, 0.045, C.gold, [-0.2, 0.06, -0.08], { seg: 16, layer: "glow", i: 1.4 });
      k.cyl(0.07, 0.075, 0.045, C.gold, [0.2, 0.06, -0.08], { seg: 16, layer: "glow", i: 1.4 });
    });
    // tilted screen housing
    k.at([0, 1.62, 0.05], [-0.2, 0, 0], null, () => {
      k.box(0.92, 0.84, 0.2, dark, [0, 0, 0], { r: 0.06 });
      k.box(0.78, 0.7, 0.03, "#0b2c8a", [0, 0, 0.1], { layer: "scr", i: 0.85 });
      // paytable bars
      for (let i = 0; i < 4; i++) k.box(0.62 - i * 0.08, 0.012, 0.01, i === 0 ? C.gold : C.lemon, [0, 0.31 - i * 0.03, 0.12], { layer: "scr", i: 1.4 });
      // five cards
      const suits = ["h", "s", "d", "s", "h"] as const;
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.145;
        k.box(0.125, 0.2, 0.012, C.paper, [x, -0.02, 0.125], { r: 0.008, layer: "scr", i: 1.15 });
        k.at([x, -0.02, 0.134], null, null, () => pip(k, suits[i], 0.1, suits[i] === "s" ? "#222233" : "#e8352d", { layer: "scr", i: 1 }));
        if (i === 0 || i === 2 || i === 3) k.box(0.1, 0.03, 0.01, C.lemon, [x, -0.18, 0.125], { layer: i === 2 ? "a" : "b", i: 1.7 });
      }
      for (let i = 0; i < 10; i++) {
        const x = -0.4 + i * 0.089;
        k.sph(0.015, C.cyan, [x, 0.4, 0.1], { layer: i % 2 ? "a" : "b", seg: 6 });
        k.sph(0.015, C.cyan, [x, -0.4, 0.1], { layer: i % 2 ? "b" : "a", seg: 6 });
      }
    });
    // topper
    k.box(0.96, 0.3, 0.46, dark, [0, 2.2, -0.03], { r: 0.06 });
    k.box(1.0, 0.045, 0.5, C.cyan, [0, 2.06, -0.03], { r: 0.015, layer: "glow", i: 1.3 });
    k.box(1.0, 0.045, 0.5, C.cyan, [0, 2.36, -0.03], { r: 0.015, layer: "glow", i: 1.3 });
    const suits2 = ["h", "s", "d", "c"] as const;
    suits2.forEach((s, i) => {
      k.at([-0.33 + i * 0.22, 2.2, 0.21], null, null, () => pip(k, s, 0.2, i % 2 ? C.cyan : C.pink, { layer: "glow", i: 1.9 }));
    });
    k.sph(0.07, C.cyan, [0, 2.43, -0.03], { layer: "glow", i: 1.9, seg: 12 });
    stool(k, 0, 1.0, C.cyan);
  });

export function VideoPoker() {
  return (
    <>
      <KitMeshes built={vpKit()} />
      <Halo position={[0, 1.65, 0.45]} size={1.7} color="#4d8cff" opacity={0.28} />
      <Halo position={[0, 2.2, 0.35]} size={1.6} color="#7df9ff" opacity={0.22} />
    </>
  );
}

/* ------------------------------ KENO ------------------------------ */

const kenoBase = () =>
  kitCache("keno-base", (k) => {
    // counter drum
    k.cyl(0.62, 0.68, 0.1, C.dark, [0, 0.05, 0], { seg: 28 });
    k.cyl(0.52, 0.52, 0.64, C.pink, [0, 0.42, 0], { seg: 28 });
    k.cyl(0.535, 0.535, 0.045, C.gold, [0, 0.3, 0], { seg: 28 });
    k.cyl(0.535, 0.535, 0.045, C.gold, [0, 0.62, 0], { seg: 28 });
    k.cyl(0.6, 0.58, 0.07, C.goldDeep, [0, 0.78, 0], { seg: 28 });
    // forks holding the cage
    for (const s of [-1, 1]) {
      k.box(0.06, 0.72, 0.1, C.goldDeep, [s * 0.58, 1.15, 0], { r: 0.02 });
      k.box(0.1, 0.1, 0.16, C.gold, [s * 0.58, 1.5, 0], { r: 0.03 });
      k.box(0.12, 0.06, 0.2, C.goldDeep, [s * 0.58, 0.82, 0], { r: 0.02 });
    }
    // ball chute + tray
    k.cyl(0.05, 0.05, 0.5, "#cfeaff", [0.3, 1.1, 0.42], { rot: [P / 2 - 0.4, 0, 0], seg: 10 });
    k.box(0.5, 0.05, 0.16, C.goldDeep, [0.25, 0.86, 0.5], { r: 0.02 });
    for (let i = 0; i < 4; i++) k.sph(0.048, [C.red, C.lemon, C.cyan, C.lime][i], [0.07 + i * 0.1, 0.93, 0.5], { seg: 10 });
    // numbered board
    k.box(0.07, 1.0, 0.07, C.goldDeep, [-0.55, 0.5, -0.86], { r: 0.02 });
    k.box(0.07, 1.0, 0.07, C.goldDeep, [0.55, 0.5, -0.86], { r: 0.02 });
    k.box(1.22, 1.38, 0.09, C.goldDeep, [0, 1.62, -0.86], { r: 0.04 });
    k.box(1.08, 1.24, 0.03, "#10163a", [0, 1.62, -0.8], { layer: "scr", i: 0.6 });
    for (let c = 0; c < 8; c++) {
      for (let r = 0; r < 10; r++) {
        const n = r * 8 + c;
        const hot = [3, 9, 14, 17, 22, 28, 31, 37, 40, 44, 49, 53, 58, 61, 66, 70, 72, 75, 77, 79].includes(n);
        k.box(0.1, 0.1, 0.012, hot ? (n % 2 ? "#ffd24a" : "#ff7eb6") : "#4560c8", [-0.4 + c * 0.114, 2.14 - r * 0.114, -0.78], { layer: hot ? (n % 2 ? "a" : "b") : "glow", i: hot ? 1.8 : 0.75, r: 0.01 });
      }
    }
  });
const kenoCage = () =>
  kitCache("keno-cage", (k) => {
    for (let i = 0; i < 5; i++) k.tor(0.5, 0.014, C.gold, [0, 0, 0], { rot: [(i * P) / 5, 0, 0], seg: 36 });
    for (const s of [-0.34, 0, 0.34]) {
      const r = Math.sqrt(0.25 - s * s);
      k.tor(r, 0.014, C.gold, [s, 0, 0], { rot: [0, P / 2, 0], seg: 28 });
    }
    k.cyl(0.02, 0.02, 1.3, C.goldDeep, [0, 0, 0], { rot: [0, 0, P / 2], seg: 8 });
    // crank
    k.cyl(0.14, 0.14, 0.03, C.pink, [0.7, 0, 0], { rot: [0, 0, P / 2], seg: 16 });
    k.cyl(0.015, 0.015, 0.1, C.goldDeep, [0.74, 0.12, 0], { rot: [0, 0, P / 2], seg: 6 });
    k.sph(0.04, C.red, [0.8, 0.12, 0], { seg: 10 });
  });

const NB = 26;
const ballGeo = new SphereGeometry(0.07, 12, 9);
const ballMat = new MeshStandardMaterial({ roughness: 0.4, metalness: 0.05, emissive: new Color("#302018") });
const BALL_COLORS = [C.red, C.lemon, C.cyan, C.lime, C.pink, C.orange, C.violet, C.paper];
const dummy = new Object3D();

export function Keno() {
  const balls = useRef<InstancedMesh>(null);
  const params = useMemo(() => {
    const a = new Float32Array(NB * 6);
    for (let i = 0; i < NB; i++) {
      a[i * 6] = 1.2 + rand(i + 1) * 2.4;
      a[i * 6 + 1] = 1.1 + rand(i + 30) * 2.6;
      a[i * 6 + 2] = 1.0 + rand(i + 60) * 2.8;
      a[i * 6 + 3] = rand(i + 90) * 6.28;
      a[i * 6 + 4] = rand(i + 120) * 6.28;
      a[i * 6 + 5] = rand(i + 150) * 6.28;
    }
    return a;
  }, []);
  useEffect(() => {
    const m = balls.current;
    if (!m) return;
    const c = new Color();
    for (let i = 0; i < NB; i++) m.setColorAt(i, c.set(BALL_COLORS[i % BALL_COLORS.length]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const m = balls.current;
    if (!m) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < NB; i++) {
      const o = i * 6;
      dummy.position.set(Math.sin(t * params[o] + params[o + 3]) * 0.25, Math.sin(t * params[o + 1] + params[o + 4]) * 0.24, Math.sin(t * params[o + 2] + params[o + 5]) * 0.25);
      dummy.rotation.set(t, t * 0.7, 0);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <KitMeshes built={kenoBase()} />
      <group position={[0, 1.5, 0]}>
        <Spin axis="x" speed={0.9}>
          <KitMeshes built={kenoCage()} />
        </Spin>
        <instancedMesh ref={balls} args={[ballGeo, ballMat, NB]} frustumCulled={false} />
      </group>
      <Halo position={[0, 1.5, 0.1]} size={1.7} color="#ff9ad0" opacity={0.2} />
    </>
  );
}

/* ------------------------------ WHEEL ------------------------------ */

const WEDGE_COLORS = ["#e0483b", "#fff1d0", "#2fb7a6", "#ffc94a", "#ff7eb6", "#8b5cf6"];
const wheelFace = () =>
  kitCache("wheel-face", (k) => {
    const N = 12;
    const step = (P * 2) / N;
    k.at([0, 0, 0], [P / 2, 0, 0], null, () => {
      for (let i = 0; i < N; i++) {
        const col = i === 0 ? C.gold : WEDGE_COLORS[i % 6];
        k.wedge(0.93, 0.09, i * step, step * 0.985, col, [0, 0, 0], { seg: 6, layer: "glow", i: 0.82 });
      }
      k.cyl(0.95, 0.95, 0.07, C.goldDeep, [0, -0.01, 0], { seg: 40 });
    });
    for (let i = 0; i < N; i++) {
      const a = (i + 0.5) * step;
      const sx = Math.sin(a);
      const sy = -Math.cos(a);
      k.at([sx * 0.7, sy * 0.7, 0.05], [0, 0, a], null, () => {
        k.box(0.1, 0.22, 0.02, i === 0 ? C.red : C.paper, [0, 0, 0], { r: 0.015 });
        k.sph(0.025, i === 0 ? C.gold : C.ink, [0, 0.04, 0.015], { seg: 8, scale: [1, 1, 0.5] });
        k.sph(0.025, i === 0 ? C.gold : C.ink, [0, -0.04, 0.015], { seg: 8, scale: [1, 1, 0.5] });
      });
      k.sph(0.03, C.paper, [sx * 0.88, sy * 0.88, 0.05], { seg: 8, layer: "glow", i: 1.2 });
      // pegs at wedge borders
      const b = i * step;
      k.cyl(0.018, 0.018, 0.08, C.gold, [Math.sin(b) * 0.97, -Math.cos(b) * 0.97, 0.06], { rot: [P / 2, 0, 0], seg: 6 });
    }
    k.cyl(0.18, 0.2, 0.12, C.goldDeep, [0, 0, 0.07], { rot: [P / 2, 0, 0], seg: 20 });
    k.sph(0.1, C.gold, [0, 0, 0.13], { seg: 14, layer: "glow", i: 1.5 });
  });
const wheelFrame = () =>
  kitCache("wheel-frame", (k) => {
    k.tor(1.0, 0.07, C.gold, [0, 1.38, 0.0], { seg: 48 });
    k.tor(1.04, 0.025, C.goldDeep, [0, 1.38, 0.0], { seg: 48, scale: [1, 1, 3] });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * P * 2;
      k.sph(0.04, C.lemon, [Math.sin(a) * 1.0, 1.38 + Math.cos(a) * 1.0, 0.07], { layer: i % 2 ? "a" : "b", seg: 8, i: 1.8 });
    }
    // stand
    k.box(1.3, 0.12, 0.8, C.dark, [0, 0.06, 0], { r: 0.04 });
    k.box(1.1, 0.06, 0.64, C.red, [0, 0.14, 0], { r: 0.02 });
    for (const s of [-1, 1]) {
      k.box(0.09, 1.45, 0.12, C.goldDeep, [s * 0.5, 0.78, -0.07], { r: 0.03, rot: [0, 0, s * -0.38] });
    }
    k.box(0.3, 1.25, 0.2, C.goldDeep, [0, 0.72, -0.14], { r: 0.06 });
    k.box(0.5, 0.3, 0.26, C.gold, [0, 1.38, -0.14], { r: 0.08 });
    // pointer flapper
    k.cone(0.09, 0.3, C.red, [0, 2.4, 0.1], { rot: [0, 0, P], seg: 4, scale: [1, 1, 0.5] });
    k.sph(0.06, C.gold, [0, 2.5, 0.1], { seg: 10, layer: "glow", i: 1.5 });
  });

export function Wheel() {
  const wheel = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const PER = 9;
    const cyc = Math.floor(t / PER);
    const u = Math.min(1, (t - cyc * PER - 0.4) / 6.2);
    const e = u <= 0 ? 0 : 1 - Math.pow(1 - u, 3.2);
    const T = P * 2 * 3 + 1.3;
    if (wheel.current) wheel.current.rotation.z = -(cyc + e) * T;
  });
  return (
    <>
      <KitMeshes built={wheelFrame()} />
      <group ref={wheel} position={[0, 1.38, 0.0]}>
        <KitMeshes built={wheelFace()} />
      </group>
      <Halo position={[0, 1.4, 0.2]} size={3} color="#ffb04a" opacity={0.18} />
    </>
  );
}

