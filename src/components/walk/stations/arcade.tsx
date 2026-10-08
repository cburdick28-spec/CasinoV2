"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  OctahedronGeometry,
  SphereGeometry,
  CircleGeometry,
} from "three";
import { C, Kit, KitMeshes, kitCache, lighten, mats, railOval, rand, shade } from "./kit";
import { Halo, Spin } from "./common";
import { tableOval } from "./tables";

const P = Math.PI;
const dummy = new Object3D();

/* ------------------------------ CRASH ------------------------------ */

const crashBase = () =>
  kitCache("crash-base", (k) => {
    k.cyl(1.2, 1.26, 0.14, "#3a3f5c", [0, 0.07, 0], { seg: 8 });
    k.cyl(1.05, 1.1, 0.04, "#555b7e", [0, 0.16, 0], { seg: 8 });
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * P * 2;
      k.box(0.2, 0.03, 0.09, i % 2 ? C.orange : C.dark, [Math.sin(a) * 0.98, 0.19, Math.cos(a) * 0.98], { rot: [0, a, 0], r: 0.01 });
    }
    k.tor(0.8, 0.02, C.cyan, [0, 0.2, 0], { rot: [P / 2, 0, 0], layer: "glow", i: 1.8, seg: 36 });
    k.cyl(0.44, 0.5, 0.2, C.steel, [0, 0.27, 0], { seg: 12 });
    k.cyl(0.3, 0.3, 0.04, C.dark, [0, 0.38, 0], { seg: 12 });
    // gantry tower
    const tx = -0.9;
    const tz = -0.2;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) k.box(0.06, 2.75, 0.06, C.tangerine, [tx + dx * 0.15, 1.5, tz + dz * 0.15], { r: 0.015 });
    for (let i = 0; i < 7; i++) {
      const y = 0.3 + i * 0.4;
      k.box(0.36, 0.04, 0.04, C.orange, [tx, y, tz + 0.15]);
      k.box(0.36, 0.04, 0.04, C.orange, [tx, y, tz - 0.15]);
      k.box(0.04, 0.04, 0.36, C.orange, [tx + 0.15, y, tz]);
      k.box(0.04, 0.04, 0.36, C.orange, [tx - 0.15, y, tz]);
      if (i < 6) {
        k.box(0.03, 0.5, 0.03, C.orange, [tx, y + 0.2, tz + 0.15], { rot: [0, 0, i % 2 ? 0.7 : -0.7] });
        k.box(0.03, 0.5, 0.03, C.orange, [tx, y + 0.2, tz - 0.15], { rot: [0, 0, i % 2 ? -0.7 : 0.7] });
      }
    }
    for (const y of [1.0, 1.8]) {
      k.box(0.8, 0.08, 0.1, C.tangerine, [tx + 0.5, y, tz], { r: 0.02 });
      k.box(0.1, 0.16, 0.2, C.dark, [tx + 0.9, y, tz], { r: 0.03 });
    }
    k.box(0.4, 0.06, 0.4, C.tangerine, [tx, 2.9, tz], { r: 0.02 });
    k.cyl(0.03, 0.03, 0.3, C.steel, [tx, 3.05, tz], { seg: 6 });
    // multiplier readout board
    k.box(0.07, 1.2, 0.07, C.steel, [0.58, 0.7, -0.45], { r: 0.02 });
    k.box(0.07, 1.2, 0.07, C.steel, [0.98, 0.7, -0.45], { r: 0.02 });
    k.box(0.64, 1.1, 0.07, C.dark, [0.78, 1.5, -0.45], { r: 0.03 });
    k.box(0.54, 0.96, 0.03, "#0b1a33", [0.78, 1.5, -0.41]);
    for (let i = 0; i < 8; i++) {
      const col = new Color("#5be37a").lerp(new Color("#ff4a3a"), i / 7);
      const h = 0.1 + i * 0.1;
      k.box(0.05, h, 0.02, "#" + col.getHexString(), [0.56 + i * 0.0 + 0.0 + (i - 3.5) * 0.065 + 0.22, 1.1 + h / 2, -0.385], { layer: i % 2 ? "a" : "glow", i: 1.6, r: 0.008 });
    }
  });

const rocketKit = () =>
  kitCache("rocket", (k) => {
    k.cyl(0.13, 0.2, 0.17, C.dark, [0, 0.085, 0], { seg: 16 });
    k.cyl(0.3, 0.3, 0.95, C.paper, [0, 0.63, 0], { seg: 24 });
    k.cyl(0.308, 0.308, 0.12, C.red, [0, 0.32, 0], { seg: 24 });
    k.cyl(0.308, 0.308, 0.12, C.red, [0, 1.0, 0], { seg: 24 });
    k.cone(0.3, 0.62, C.red, [0, 1.41, 0], { seg: 24 });
    k.sph(0.045, C.gold, [0, 1.74, 0], { seg: 8 });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * P * 2;
      k.at([0, 0, 0], [0, a, 0], null, () => {
        k.box(0.05, 0.5, 0.3, C.red, [0, 0.3, 0.37], { r: 0.02, rot: [0.35, 0, 0] });
      });
    }
    k.tor(0.1, 0.03, C.gold, [0, 0.82, 0.3], { seg: 16 });
    k.sph(0.1, C.cyan, [0, 0.82, 0.3], { seg: 12, layer: "glow", i: 1.6, scale: [1, 1, 0.4] });
    k.tor(0.07, 0.025, C.gold, [0, 0.58, 0.3], { seg: 14 });
    k.sph(0.07, C.cyan, [0, 0.58, 0.3], { seg: 10, layer: "glow", i: 1.4, scale: [1, 1, 0.4] });
  });

const flameOuter = new MeshBasicMaterial({ color: new Color("#ff7a2a").multiplyScalar(1.6), toneMapped: false, transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false });
const flameInner = new MeshBasicMaterial({ color: new Color("#fff0a0").multiplyScalar(1.8), toneMapped: false, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false });
const flameGeoO = new ConeGeometry(0.17, 0.62, 14, 1, true).rotateX(P).translate(0, -0.31, 0);
const flameGeoI = new ConeGeometry(0.09, 0.4, 12, 1, true).rotateX(P).translate(0, -0.2, 0);
const puffGeo = new SphereGeometry(0.12, 10, 8);
const puffMat = new MeshBasicMaterial({ color: "#f6e3c0", transparent: true, opacity: 0.55, depthWrite: false });
const NP = 8;

export function Crash() {
  const rocket = useRef<Group>(null);
  const flame = useRef<Group>(null);
  const puffs = useRef<InstancedMesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (rocket.current) {
      rocket.current.position.y = 0.58 + Math.sin(t * 1.7) * 0.07 + Math.sin(t * 23) * 0.004;
      rocket.current.rotation.z = Math.sin(t * 1.1) * 0.025;
      rocket.current.rotation.x = Math.sin(t * 0.9 + 1) * 0.02;
    }
    if (flame.current) {
      const f = 1 + Math.sin(t * 31) * 0.14 + Math.sin(t * 17) * 0.1;
      flame.current.scale.set(1 + Math.sin(t * 27) * 0.08, f, 1 + Math.cos(t * 29) * 0.08);
    }
    const m = puffs.current;
    if (m) {
      for (let i = 0; i < NP; i++) {
        const u = (t * 0.45 + i / NP) % 1;
        const a = (i / NP) * P * 2 + i * 1.7;
        const r = 0.15 + u * 0.8;
        dummy.position.set(Math.sin(a) * r, 0.25 + u * 0.35, Math.cos(a) * r);
        const s = 0.5 + u * 1.5;
        dummy.scale.set(s, s * (1 - u * 0.5), s);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    }
  });
  return (
    <>
      <KitMeshes built={crashBase()} />
      <group ref={rocket} position={[0, 0.58, 0]}>
        <KitMeshes built={rocketKit()} />
        <group ref={flame}>
          <mesh geometry={flameGeoO} material={flameOuter} />
          <mesh geometry={flameGeoI} material={flameInner} />
        </group>
        <Halo position={[0, -0.25, 0]} size={1.5} color="#ff9a3a" opacity={0.55} />
      </group>
      <instancedMesh ref={puffs} args={[puffGeo, puffMat, NP]} frustumCulled={false} />
    </>
  );
}

/* ------------------------------ LIMBO ------------------------------ */

const limboBase = () =>
  kitCache("limbo-base", (k) => {
    k.cyl(1.2, 1.25, 0.12, C.plum, [0, 0.06, 0], { seg: 32 });
    k.cyl(1.1, 1.1, 0.03, shade(C.plum, 0.25), [0, 0.13, 0], { seg: 32 });
    k.tor(0.98, 0.025, C.pink, [0, 0.15, 0], { rot: [P / 2, 0, 0], layer: "glow", i: 1.7, seg: 40 });
    k.cyl(0.6, 0.6, 0.01, C.pink, [0, 0.145, 0], { layer: "glow", i: 0.55, seg: 28 });
    for (const s of [-1, 1]) {
      const x = s * 0.85;
      k.box(0.26, 0.14, 0.26, C.woodDark, [x, 0.19, 0], { r: 0.04 });
      k.cyl(0.062, 0.07, 2.4, C.orange, [x, 1.4, 0], { seg: 12 });
      for (let i = 0; i < 6; i++) k.tor(0.066, 0.016, C.tangerine, [x, 0.45 + i * 0.42, 0], { rot: [P / 2, 0, 0], seg: 12 });
      // tiki torch cup
      k.cyl(0.15, 0.08, 0.14, C.woodDark, [x, 2.66, 0], { seg: 12 });
      k.tor(0.15, 0.022, C.gold, [x, 2.73, 0], { rot: [P / 2, 0, 0], seg: 14 });
      k.cone(0.1, 0.3, s < 0 ? "#ff8a3a" : "#ffb03a", [x, 2.9, 0], { layer: s < 0 ? "a" : "b", i: 1.9, seg: 10 });
      // height ticks
      for (let i = 0; i < 14; i++) {
        const y = 0.4 + i * 0.11;
        const col = new Color("#5de6ff").lerp(new Color("#ff7eb6"), i / 13);
        k.box(0.14, 0.02, 0.02, "#" + col.getHexString(), [x - s * 0.1, y, 0.07], { layer: "glow", i: 1.5 });
      }
    }
  });
const limboBar = () =>
  kitCache("limbo-bar", (k) => {
    k.cyl(0.035, 0.035, 1.62, C.pink, [0, 0, 0], { rot: [0, 0, P / 2], layer: "glow", i: 2.2, seg: 10 });
    for (const s of [-1, 1]) k.sph(0.065, C.lemon, [s * 0.81, 0, 0], { layer: "glow", i: 1.8, seg: 10 });
    for (let i = 0; i < 9; i++) k.box(0.1, 0.012, 0.012, C.paper, [-0.72 + i * 0.18, 0.045, 0], { layer: "glow", i: 1.4 });
  });
const limboFigure = () =>
  kitCache("limbo-figure", (k) => {
    const skin = C.teal;
    for (const s of [-1, 1]) {
      k.cyl(0.045, 0.04, 0.5, skin, [s * 0.09, 0.28, 0], { seg: 8, rot: [0, 0, s * 0.12] });
      k.box(0.1, 0.05, 0.16, C.red, [s * 0.11, 0.03, 0.04], { r: 0.02 });
    }
    k.sph(0.11, C.pink, [0, 0.58, 0], { seg: 10, scale: [1.2, 0.8, 1] });
    k.at([0, 0.58, 0], [-0.9, 0, 0], null, () => {
      k.cyl(0.085, 0.1, 0.5, C.pink, [0, 0.25, 0], { seg: 10 });
      k.sph(0.095, skin, [0, 0.58, 0], { seg: 10 });
      k.cone(0.1, 0.12, C.gold, [0, 0.66, 0], { seg: 10 });
      for (const s of [-1, 1]) k.cyl(0.03, 0.03, 0.4, skin, [s * 0.2, 0.42, 0], { seg: 6, rot: [0, 0, s * -1.1] });
    });
  });
const beamGeo = new ConeGeometry(0.95, 2.7, 28, 1, true);
const beamMat = new MeshBasicMaterial({ color: new Color("#ffc4f0").multiplyScalar(1.1), transparent: true, opacity: 0.09, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false });

export function Limbo() {
  const bar = useRef<Group>(null);
  const fig = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const w = 0.5 + 0.5 * Math.sin(t * 0.7);
    if (bar.current) bar.current.position.y = 0.75 + w * w * 1.1 + w * 0.2;
    if (fig.current) {
      fig.current.position.z = Math.sin(t * 0.7) * 0.0 + 0.1;
      fig.current.rotation.x = Math.sin(t * 0.7 + 0.6) * 0.1;
      fig.current.position.y = 0.15 + Math.abs(Math.sin(t * 1.4)) * 0.03;
    }
  });
  return (
    <>
      <KitMeshes built={limboBase()} />
      <mesh geometry={beamGeo} material={beamMat} position={[0, 1.5, 0]} />
      <group ref={bar} position={[0, 1.2, 0]}>
        <KitMeshes built={limboBar()} />
        <Halo position={[0, 0, 0.05]} size={1.4} color="#ff7eb6" opacity={0.25} />
      </group>
      <group ref={fig} position={[0, 0.15, 0.1]}>
        <KitMeshes built={limboFigure()} />
      </group>
    </>
  );
}

/* ------------------------------ MINES ------------------------------ */

const REVEALED = new Set([2, 6, 8, 12, 14, 18, 22]);
const minesBase = () =>
  kitCache("mines-base", (k) => {
    // pedestal
    k.cyl(0.5, 0.58, 0.1, C.dark, [0, 0.05, 0], { seg: 20 });
    k.box(0.9, 0.78, 0.55, "#17566a", [0, 0.5, 0.05], { r: 0.06 });
    k.box(0.94, 0.05, 0.58, C.cyan, [0, 0.7, 0.05], { r: 0.02, layer: "glow", i: 1.3 });
    // bomb stand behind
    k.cyl(0.1, 0.16, 1.15, C.dark, [0, 0.58, -0.78], { seg: 10 });
    k.cyl(0.26, 0.3, 0.1, C.goldDeep, [0, 0.05, -0.78], { seg: 14 });
  });
const minesConsole = () =>
  kitCache("mines-console", (k) => {
    k.box(1.4, 0.12, 1.2, "#134a5a", [0, 0, 0], { r: 0.05 });
    k.box(1.44, 0.04, 1.24, C.cyan, [0, -0.04, 0], { r: 0.02, layer: "glow", i: 1.3 });
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const i = r * 5 + c;
        const x = (c - 2) * 0.24;
        const z = (r - 2) * 0.22;
        if (REVEALED.has(i)) {
          k.box(0.2, 0.02, 0.18, "#0a2a36", [x, 0.066, z], { r: 0.008 });
        } else {
          k.box(0.21, 0.07, 0.19, i % 2 ? C.teal : lighten(C.teal, 0.12), [x, 0.09, z], { r: 0.025 });
          k.box(0.14, 0.012, 0.12, lighten(C.teal, 0.45), [x, 0.128, z], { r: 0.005 });
        }
      }
    }
    // the mine that was hit
    const bx = (3 - 2) * 0.24;
    const bz = (1 - 2) * 0.22 + 0.22;
    void bx;
    void bz;
    k.sph(0.075, C.dark, [0.24, 0.15, -0.22 + 0.22 * 0 + 0.44 * 0 - 0.0], { seg: 12 });
    k.cyl(0.02, 0.02, 0.03, C.steel, [0.24, 0.225, -0.22], { seg: 6 });
    k.sph(0.022, C.lemon, [0.24, 0.26, -0.22], { seg: 6, layer: "a", i: 2 });
  });
const gemGeo = new OctahedronGeometry(1, 0);
const gemKit = (key: string, color: string) =>
  kitCache("gem-" + key, (k) => {
    k.add(gemGeo.clone(), color, [0, 0, 0], { layer: "glow", i: 1.7, scale: [0.5, 0.78, 0.5] });
    k.add(new OctahedronGeometry(1, 0), lighten(color, 0.5), [0, 0, 0], { layer: "glow", i: 2.4, scale: [0.28, 0.5, 0.28] });
  });
const bombKit = () =>
  kitCache("bomb", (k) => {
    k.sph(0.42, "#252a3a", [0, 0, 0], { seg: 24 });
    k.sph(0.12, "#7080a8", [-0.17, 0.18, 0.3], { seg: 10, scale: [1, 0.7, 0.5] });
    k.cyl(0.13, 0.15, 0.12, C.goldDeep, [0, 0.42, 0], { seg: 14 });
    k.tor(0.17, 0.02, C.woodDark, [0.14, 0.56, 0], { arc: P * 0.9, seg: 12, rot: [0, 0, 0.2] });
    k.sph(0.055, C.lemon, [-0.03, 0.62, 0], { layer: "glow", i: 2.6, seg: 8 });
  });

export function Mines() {
  const gems = useRef<InstancedMesh>(null);
  const spark = useRef<Group>(null);
  const bombG = useRef<Group>(null);
  const gemA = useMemo(() => gemKit("cyan", C.cyan), []);
  const big = useMemo(() => gemKit("big", C.cyan), []);
  const gp: [number, number, number, number][] = [
    [-0.24, 0.17, 0, 0.1],
    [0.24, 0.17, 0.22, 0.1],
    [-0.24, 0.17, -0.44, 0.1],
  ];
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const gm = gems.current;
    if (gm) {
      for (let i = 0; i < 3; i++) {
        dummy.position.set(gp[i][0], gp[i][1] + 0.05 + Math.sin(t * 2.2 + i) * 0.03, gp[i][2]);
        dummy.rotation.set(0, t * (1.4 + i * 0.3), 0);
        dummy.scale.setScalar(0.14);
        dummy.updateMatrix();
        gm.setMatrixAt(i, dummy.matrix);
      }
      gm.instanceMatrix.needsUpdate = true;
    }
    if (spark.current) {
      const s = 0.8 + Math.abs(Math.sin(t * 18)) * 0.5;
      spark.current.scale.setScalar(s);
    }
    if (bombG.current) {
      bombG.current.position.y = 1.62 + Math.sin(t * 1.4) * 0.04;
      bombG.current.rotation.z = Math.sin(t * 1.1) * 0.06;
    }
  });
  return (
    <>
      <KitMeshes built={minesBase()} />
      <group position={[0, 1.1, 0.12]} rotation={[0.36, 0, 0]}>
        <KitMeshes built={minesConsole()} />
        <instancedMesh ref={gems} args={[gemA.glow, mats.glow, 3]} frustumCulled={false} />
      </group>
      <group ref={bombG} position={[0, 1.62, -0.78]}>
        <KitMeshes built={bombKit()} />
        <group ref={spark} position={[-0.03, 0.62, 0]}>
          <Halo position={[0, 0, 0]} size={0.6} color="#ffd24a" opacity={0.9} />
        </group>
      </group>
      <Spin axis="y" speed={1.2} position={[0.92, 1.55, 0.05]}>
        <group scale={0.34}>
          <KitMeshes built={big} />
        </group>
      </Spin>
      <Halo position={[0.92, 1.55, 0.05]} size={1.3} color="#5de6ff" opacity={0.35} />
    </>
  );
}

/* ------------------------------ COIN FLIP ------------------------------ */

const coinPed = () =>
  kitCache("coin-ped", (k) => {
    k.cyl(1.12, 1.18, 0.14, C.dark, [0, 0.07, 0], { seg: 32 });
    k.cyl(0.92, 1.0, 0.16, C.tangerine, [0, 0.22, 0], { seg: 32 });
    k.cyl(0.74, 0.8, 0.12, C.gold, [0, 0.36, 0], { seg: 32 });
    k.tor(0.9, 0.02, C.gold, [0, 0.31, 0], { rot: [P / 2, 0, 0], layer: "glow", i: 1.8, seg: 36 });
    // tall plinth the coin lands on
    k.cyl(0.4, 0.48, 0.55, C.crimson, [0, 0.68, 0], { seg: 24 });
    k.cyl(0.43, 0.43, 0.04, C.gold, [0, 0.55, 0], { seg: 24 });
    k.cyl(0.43, 0.43, 0.04, C.gold, [0, 0.84, 0], { seg: 24 });
    k.cyl(0.5, 0.5, 0.06, C.gold, [0, 0.98, 0], { seg: 28 });
    k.cyl(0.4, 0.4, 0.01, "#fff1c0", [0, 1.015, 0], { layer: "glow", i: 1.0, seg: 24 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * P * 2 + 0.3;
      k.cyl(0.06, 0.06, 0.048, C.gold, [Math.sin(a) * 1.05, 0.19, Math.cos(a) * 1.05], { seg: 10 });
    }
    for (let j = 0; j < 5; j++) k.cyl(0.11, 0.11, 0.03, j % 2 ? C.goldDeep : C.gold, [-0.86, 0.45 + j * 0.032, 0.4], { seg: 14 });
    for (let j = 0; j < 3; j++) k.cyl(0.11, 0.11, 0.03, j % 2 ? C.goldDeep : C.gold, [0.88, 0.45 + j * 0.032, 0.3], { seg: 14 });
  });
const coinKit = () =>
  kitCache("coin", (k) => {
    k.at([0, 0, 0], [P / 2, 0, 0], null, () => {
      k.cyl(0.5, 0.5, 0.08, C.gold, [0, 0, 0], { seg: 40 });
      k.cyl(0.43, 0.43, 0.09, lighten(C.gold, 0.12), [0, 0, 0], { seg: 40 });
    });
    k.tor(0.5, 0.04, C.goldDeep, [0, 0, 0], { seg: 40 });
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * P * 2;
      k.box(0.03, 0.045, 0.1, C.goldDeep, [Math.cos(a) * 0.51, Math.sin(a) * 0.51, 0], { rot: [0, 0, a] });
    }
    for (const s of [1, -1]) {
      k.at([0, 0, 0.047 * s], s < 0 ? [0, P, 0] : null, null, () => {
        k.tor(0.36, 0.014, C.goldDeep, [0, 0, 0], { seg: 32 });
        if (s > 0) {
          // heads: a big star
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * P * 2;
            k.cone(0.09, 0.22, C.goldDeep, [Math.sin(a) * 0.14, Math.cos(a) * 0.14, 0], { rot: [0, 0, -a], seg: 4, scale: [1, 1, 0.4] });
          }
          k.cyl(0.1, 0.1, 0.02, C.goldDeep, [0, 0, 0], { rot: [P / 2, 0, 0], seg: 5 });
        } else {
          // tails: crown
          k.box(0.3, 0.1, 0.025, C.goldDeep, [0, -0.08, 0], { r: 0.01 });
          for (let i = -1; i <= 1; i++) {
            k.cone(0.06, 0.16, C.goldDeep, [i * 0.12, 0.05, 0], { seg: 4, scale: [1, 1, 0.4], rot: [0, 0, 0] });
            k.sph(0.022, C.red, [i * 0.12, 0.15, 0.01], { seg: 6 });
          }
        }
      });
    }
  });
const beamCyl = new ConeGeometry(0.8, 3.4, 28, 1, true);
const beamGold = new MeshBasicMaterial({ color: new Color("#ffd060").multiplyScalar(1.2), transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false });
const shadowGeo = new CircleGeometry(0.45, 24).rotateX(-P / 2);
const shadowMat = new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.4, depthWrite: false });

export function CoinFlip() {
  const coin = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const halo = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const PER = 3.4;
    const cyc = Math.floor(t / PER);
    const local = t - cyc * PER;
    const u = Math.min(1, Math.max(0, (local - 0.3) / 2.1));
    const rest = 1.06;
    const h = 4 * u * (1 - u);
    const R0 = -P / 2 + P * Math.floor(cyc / 2);
    const turn = P * 2 * 4 + P * (cyc % 2);
    if (coin.current) {
      coin.current.position.y = rest + 0.5 + h * 1.0 + (u === 0 || u === 1 ? Math.sin(t * 2) * 0.01 : 0);
      coin.current.rotation.x = R0 + u * turn;
      coin.current.rotation.z = Math.sin(u * P) * 0.12;
    }
    if (shadow.current) {
      const s = (1 - h * 0.6) * 0.8;
      shadow.current.scale.set(s, 1, s);
    }
    if (halo.current) halo.current.position.y = rest + 0.5 + h * 1.0;
  });
  return (
    <>
      <KitMeshes built={coinPed()} />
      <mesh ref={shadow} geometry={shadowGeo} material={shadowMat} position={[0, 1.022, 0]} scale={0.8} />
      <mesh geometry={beamCyl} material={beamGold} position={[0, 1.8, 0]} />
      <group ref={coin} position={[0, 1.5, 0]}>
        <KitMeshes built={coinKit()} />
      </group>
      <group ref={halo} position={[0, 1.5, 0]}>
        <Halo position={[0, 0, 0]} size={2.2} color="#ffd24a" opacity={0.4} />
      </group>
    </>
  );
}

/* ------------------------------ PLINKO ------------------------------ */

const ROWS = 11;
const DX = 0.19;
const ROW_Y = (r: number) => 2.2 - r * 0.145;
const BUCKET_COLORS = ["#ff4a3a", "#ff8a3a", "#ffc94a", "#9be564", "#35e08a", "#9be564", "#ffc94a", "#ff8a3a", "#ff4a3a"];
const plinkoKit = () =>
  kitCache("plinko", (k) => {
    // frame + panel
    k.box(1.92, 2.45, 0.1, "#2a1a5a", [0, 1.4, -0.02], { r: 0.04 });
    k.box(1.78, 2.3, 0.04, "#171040", [0, 1.4, 0.04], { r: 0.02 });
    k.box(0.12, 2.5, 0.16, C.pink, [-0.97, 1.4, 0.0], { r: 0.05 });
    k.box(0.12, 2.5, 0.16, C.pink, [0.97, 1.4, 0.0], { r: 0.05 });
    k.box(2.06, 0.14, 0.16, C.pink, [0, 2.66, 0.0], { r: 0.05 });
    k.box(2.06, 0.14, 0.16, C.pink, [0, 0.14, 0.0], { r: 0.05 });
    // legs
    for (const s of [-1, 1]) {
      k.box(0.1, 0.12, 0.8, C.dark, [s * 0.8, 0.06, -0.1], { r: 0.03 });
      k.box(0.08, 1.2, 0.08, C.dark, [s * 0.8, 0.6, -0.55], { rot: [-0.55, 0, 0], r: 0.02 });
    }
    // pegs
    for (let r = 0; r < ROWS; r++) {
      const n = r % 2 ? 8 : 9;
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * DX;
        k.cyl(0.018, 0.018, 0.08, "#59c8ff", [x, ROW_Y(r), 0.08], { rot: [P / 2, 0, 0], seg: 8, layer: "glow", i: 0.9 });
        k.sph(0.022, "#fff4d0", [x, ROW_Y(r), 0.12], { seg: 6, layer: "glow", i: 1.3 });
      }
    }
    // buckets
    for (let j = 0; j <= 9; j++) k.box(0.025, 0.46, 0.14, "#ffe9b0", [-0.855 + j * DX, 0.44, 0.07], { r: 0.008 });
    for (let j = 0; j < 9; j++) {
      k.box(0.16, 0.07, 0.05, BUCKET_COLORS[j], [-0.76 + j * DX, 0.27, 0.1], { layer: j % 2 ? "a" : "b", i: 1.6, r: 0.01 });
      k.box(0.16, 0.18, 0.012, BUCKET_COLORS[j], [-0.76 + j * DX, 0.5, 0.045], { layer: "scr", i: 0.45 });
    }
    // hopper
    k.cone(0.26, 0.4, C.pink, [0, 2.9, 0.0], { rot: [P, 0, 0], seg: 16 });
    k.cyl(0.28, 0.28, 0.06, C.gold, [0, 3.12, 0], { seg: 16 });
    k.cyl(0.06, 0.06, 0.18, C.gold, [0, 2.68, 0.0], { seg: 10 });
    k.sph(0.07, C.lemon, [0, 3.22, 0.0], { layer: "glow", i: 2, seg: 8 });
  });

const discGeo = new CylinderGeometry(0.072, 0.072, 0.06, 18).rotateX(P / 2);
const discMat = new MeshBasicMaterial({ toneMapped: false });
const ND = 7;
const DISC_COLORS = [C.red, C.lemon, C.cyan, C.lime, C.pink, C.orange, C.violet];
const SEG = 0.3;
const NSEG = ROWS + 1;
function makePaths() {
  const wx = new Float32Array(ND * (NSEG + 1));
  const wy = new Float32Array(ND * (NSEG + 1));
  for (let d = 0; d < ND; d++) {
    let x = 0;
    wx[d * (NSEG + 1)] = 0;
    wy[d * (NSEG + 1)] = 2.78;
    for (let r = 0; r < ROWS; r++) {
      const dir = rand(d * 31 + r * 7 + 2) < 0.5 ? -1 : 1;
      x += dir * DX * 0.5;
      const lim = 0.8;
      if (x > lim) x -= DX;
      if (x < -lim) x += DX;
      wx[d * (NSEG + 1) + r + 1] = x;
      wy[d * (NSEG + 1) + r + 1] = ROW_Y(r) - 0.09;
    }
    wx[d * (NSEG + 1) + NSEG] = x;
    wy[d * (NSEG + 1) + NSEG] = 0.45;
  }
  return { wx, wy };
}
const PATHS = makePaths();

export function Plinko() {
  const discs = useRef<InstancedMesh>(null);
  useEffect(() => {
    const m = discs.current;
    if (!m) return;
    const c = new Color();
    for (let i = 0; i < ND; i++) m.setColorAt(i, c.set(DISC_COLORS[i]));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);
  useFrame(({ clock }) => {
    const m = discs.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const PER = SEG * NSEG + 1.0;
    for (let d = 0; d < ND; d++) {
      const local = (t + d * (PER / ND)) % PER;
      const seg = local / SEG;
      if (seg >= NSEG) {
        dummy.scale.setScalar(0.0001);
      } else {
        const i = Math.floor(seg);
        const s = seg - i;
        const o = d * (NSEG + 1) + i;
        const x = PATHS.wx[o] + (PATHS.wx[o + 1] - PATHS.wx[o]) * s;
        const y = PATHS.wy[o] + (PATHS.wy[o + 1] - PATHS.wy[o]) * s + Math.sin(s * P) * (i === NSEG - 1 ? 0.02 : 0.04);
        dummy.position.set(x, y, 0.1);
        dummy.scale.setScalar(1);
      }
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      m.setMatrixAt(d, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <KitMeshes built={plinkoKit()} />
      <instancedMesh ref={discs} args={[discGeo, discMat, ND]} frustumCulled={false} />
      <Halo position={[0, 3.22, 0.05]} size={0.8} color="#ffe27a" opacity={0.7} />
      <Halo position={[0, 0.3, 0.2]} size={2.4} color="#ffc94a" opacity={0.18} />
    </>
  );
}

/* ------------------------------ HORSE RACING ------------------------------ */

const TRACK_Y = 0.9;
const horseTable = () =>
  kitCache("horse-table", (k) => {
    tableOval(k, 1.22, 0.86, "#d9a066", C.paper, C.gold, "#1d6a62");
    // infield
    k.cyl(1, 1, 0.012, "#58b558", [0, 0.88, 0], { scale: [0.62, 1, 0.34], seg: 32 });
    k.cyl(1, 1, 0.006, "#58c8d8", [0.2, 0.888, 0.03], { scale: [0.2, 1, 0.1], seg: 20 });
    railOval(k, 0.66, 0.38, 0.925, 0.012, C.paper);
    railOval(k, 1.06, 0.74, 0.925, 0.012, C.paper);
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * P * 2;
      k.cyl(0.014, 0.014, 0.08, C.paper, [Math.cos(a) * 1.06, 0.9, Math.sin(a) * 0.74], { seg: 6 });
      if (i % 2 === 0) k.cyl(0.014, 0.014, 0.08, C.paper, [Math.cos(a) * 0.66, 0.9, Math.sin(a) * 0.38], { seg: 6 });
    }
    // bushes
    for (const [x, z, s] of [[-0.35, -0.08, 1], [-0.1, 0.1, 0.7], [0.4, -0.12, 0.8], [-0.45, 0.06, 0.6]] as const) k.sph(0.07 * s, "#2f8f4a", [x, 0.92, z], { seg: 8 });
    // finish line checkers on the front straight
    for (let i = 0; i < 3; i++) for (let j = 0; j < 12; j++) k.box(0.03, 0.004, 0.03, (i + j) % 2 ? C.paper : C.ink, [-0.07 + i * 0.03, 0.886, 0.4 + j * 0.028]);
    // trophy
    k.cyl(0.1, 0.12, 0.05, C.goldDeep, [0, 0.9, 0], { seg: 14 });
    k.cyl(0.03, 0.05, 0.14, C.gold, [0, 1.0, 0], { seg: 10 });
    k.cyl(0.13, 0.05, 0.2, C.gold, [0, 1.17, 0], { seg: 16 });
    for (const s of [-1, 1]) k.tor(0.07, 0.015, C.gold, [s * 0.14, 1.19, 0], { arc: P, seg: 10, rot: [0, 0, s > 0 ? -P / 2 : P / 2] });
    k.sph(0.045, C.red, [0, 1.19, 0.12], { seg: 8, layer: "glow", i: 1.5 });
    // finish flag pole
    k.cyl(0.012, 0.012, 0.8, C.paper, [-0.07, 1.3, 0.34], { seg: 6 });
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) k.box(0.07, 0.07, 0.008, (i + j) % 2 ? C.paper : C.ink, [-0.07 + 0.035 + i * 0.07, 1.64 - j * 0.07, 0.34]);
    // bunting
    for (const s of [-1, 1]) k.cyl(0.02, 0.02, 1.0, C.woodDark, [s * 1.0, 1.4, -0.7], { seg: 8 });
    const cols = [C.red, C.gold, C.cyan, C.pink, C.lime, C.orange];
    for (let i = 0; i < 13; i++) {
      const x = -0.98 + i * 0.163;
      const y = 1.86 - Math.sin((i / 12) * P) * 0.28;
      k.cone(0.06, 0.13, cols[i % 6], [x, y - 0.06, -0.7], { rot: [0, 0, P], seg: 3, scale: [1, 1, 0.3] });
    }
    k.box(2.0, 0.012, 0.012, C.paper, [0, 1.8, -0.7], { rot: [0, 0, 0] });
  });

const horseGeo = (() => {
  const k = new Kit();
  const body = "#e8d4bc";
  const dark = "#4a2c20";
  k.sph(1, body, [0, 0.2, 0], { scale: [0.17, 0.085, 0.075], seg: 12 });
  k.sph(0.09, body, [0.1, 0.215, 0], { seg: 8 });
  k.sph(0.09, body, [-0.11, 0.215, 0], { seg: 8 });
  k.box(0.075, 0.2, 0.07, body, [0.16, 0.31, 0], { r: 0.025, rot: [0, 0, -0.55] });
  k.box(0.14, 0.07, 0.065, body, [0.25, 0.4, 0], { r: 0.03, rot: [0, 0, -0.3] });
  k.box(0.05, 0.05, 0.055, "#d9b8a0", [0.31, 0.385, 0], { r: 0.02, rot: [0, 0, -0.3] });
  for (const s of [-1, 1]) k.cone(0.014, 0.05, dark, [0.2, 0.46, s * 0.025], { seg: 5 });
  k.box(0.028, 0.2, 0.025, dark, [0.13, 0.34, 0], { r: 0.01, rot: [0, 0, -0.55] });
  k.cone(0.035, 0.22, dark, [-0.2, 0.17, 0], { rot: [0, 0, 2.1], seg: 6 });
  for (const s of [-1, 1]) {
    k.cyl(0.02, 0.016, 0.19, body, [0.14, 0.1, s * 0.04], { rot: [0, 0, 0.5], seg: 6 });
    k.cyl(0.02, 0.016, 0.19, body, [-0.14, 0.1, s * 0.04], { rot: [0, 0, -0.5], seg: 6 });
    k.sph(0.02, dark, [0.19, 0.01, s * 0.04], { seg: 6 });
    k.sph(0.02, dark, [-0.19, 0.01, s * 0.04], { seg: 6 });
  }
  k.box(0.1, 0.012, 0.09, "#c04030", [0.0, 0.285, 0], { r: 0.005 });
  return k.build().body as import("three").BufferGeometry;
})();
const jockeyGeo = (() => {
  const k = new Kit();
  k.cone(0.06, 0.15, "#ffffff", [0.03, 0.37, 0], { rot: [0, 0, -0.75], seg: 8 });
  k.sph(0.045, "#ffe0c0", [0.11, 0.43, 0], { seg: 8 });
  k.sph(0.05, "#ffffff", [0.105, 0.455, 0], { seg: 8, scale: [1, 0.7, 1] });
  for (const s of [-1, 1]) k.cyl(0.015, 0.015, 0.1, "#ffffff", [0.11, 0.34, s * 0.05], { rot: [0, 0, 1.1], seg: 5 });
  return k.build().body as import("three").BufferGeometry;
})();
const horseMat = new MeshStandardMaterial({ vertexColors: true, roughness: 0.7, emissive: new Color("#241810") });
const NH = 4;
const HORSE_TINTS = ["#c98a5a", "#7a4a32", "#e8c27a", "#9a9aa8"];
const SILKS = ["#e0483b", "#3d6fe0", "#ffc94a", "#2fb7a6"];

export function HorseRacing() {
  const horses = useRef<InstancedMesh>(null);
  const jockeys = useRef<InstancedMesh>(null);
  useEffect(() => {
    const c = new Color();
    const h = horses.current;
    const j = jockeys.current;
    if (h) {
      HORSE_TINTS.forEach((col, i) => h.setColorAt(i, c.set(col)));
      if (h.instanceColor) h.instanceColor.needsUpdate = true;
    }
    if (j) {
      SILKS.forEach((col, i) => j.setColorAt(i, c.set(col)));
      if (j.instanceColor) j.instanceColor.needsUpdate = true;
    }
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const h = horses.current;
    const j = jockeys.current;
    if (!h || !j) return;
    for (let i = 0; i < NH; i++) {
      const a = 0.85 + i * 0.045;
      const b = 0.5 + i * 0.045;
      const sp = 0.33 + i * 0.012;
      const th = -(t * sp + Math.sin(t * 0.5 + i * 2.1) * 0.35 + i * 0.12) + P * 0.5;
      const x = Math.cos(th) * a;
      const z = Math.sin(th) * b;
      const dx = Math.sin(th) * a;
      const dz = -Math.cos(th) * b;
      const yaw = Math.atan2(-dz, dx);
      const g = t * 9 + i * 1.7;
      dummy.position.set(x, TRACK_Y + Math.abs(Math.sin(g)) * 0.03, z);
      dummy.rotation.set(0, yaw, Math.sin(g) * 0.07);
      dummy.scale.setScalar(1.35);
      dummy.updateMatrix();
      h.setMatrixAt(i, dummy.matrix);
      j.setMatrixAt(i, dummy.matrix);
    }
    h.instanceMatrix.needsUpdate = true;
    j.instanceMatrix.needsUpdate = true;
  });
  return (
    <>
      <KitMeshes built={horseTable()} />
      <instancedMesh ref={horses} args={[horseGeo, horseMat, NH]} frustumCulled={false} />
      <instancedMesh ref={jockeys} args={[jockeyGeo, horseMat, NH]} frustumCulled={false} />
      <Halo position={[0, 1.19, 0.05]} size={1.0} color="#ffd24a" opacity={0.4} />
    </>
  );
}

