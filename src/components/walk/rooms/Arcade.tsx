"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ROOMS, roomAt } from "../world";
import { BARRELS, BARS, FLOOR_LANTERNS, POUFS, SOFAS, TABLES } from "./placements";
import { Bar, Barrels, Confetti, Frame, Glow, Halos, Inst, Poufs, RoundTable, SignBoard, Sofas, floorLanterns, hdr, wallLanternItems, type Item, type LanternItem } from "./kit";
import { art } from "./textures";

const R = ROOMS.arcade;
const H = R.height;
const CYAN = "#7df9ff";
const AMBER = "#ffb347";
const FLOOR_L = floorLanterns(FLOOR_LANTERNS.arcade);
const CONF = ["#ffb347", "#ff7a5a", "#ffd166", "#ffb347", "#e8fbff"];

/** Strings of warm bulbs sagging across the hall, the warm accent against all that teal. */
function BulbStrings() {
  const { bulbs, halos, wire } = useMemo(() => {
    const bulbs: Item[] = [];
    const halos: Item[] = [];
    const tubes: THREE.BufferGeometry[] = [];
    const sag = (t: number) => H - 0.55 - 0.7 * 4 * t * (1 - t);
    for (const x of [17.5, 23, 29, 34.6]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        pts.push(new THREE.Vector3(x, sag(t), -8.5 + t * 17));
      }
      tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.015, 4, false));
      for (let i = 1; i < 12; i++) {
        const t = i / 12;
        const z = -8.5 + t * 17;
        const col = i % 4 === 0 ? "#ff7a5a" : i % 4 === 2 ? "#ffd166" : AMBER;
        bulbs.push({ p: [x, sag(t) - 0.14, z], c: hdr(col, 2.3) });
        halos.push({ p: [x, sag(t) - 0.14, z], s: 0.95, c: col });
      }
    }
    return { bulbs, halos, wire: mergeTubes(tubes) };
  }, []);
  return (
    <>
      <mesh geometry={wire}>
        <meshStandardMaterial color="#14202a" roughness={0.8} />
      </mesh>
      <Inst items={bulbs}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshBasicMaterial toneMapped={false} />
      </Inst>
      <Halos items={halos} k={0.6} />
    </>
  );
}

function mergeTubes(t: THREE.BufferGeometry[]) {
  return mergeGeometries(t) ?? new THREE.BufferGeometry();
}

function CeilingWork() {
  const pipes = useMemo<Item[]>(() => [-3.8, 3.8, -7.6, 7.6].map((z) => ({ p: [24, H - 0.35, z], s: [1, 1, 1], rz: Math.PI / 2 })), []);
  const flanges = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const z of [-3.8, 3.8, -7.6, 7.6]) for (let x = 14; x <= 34; x += 4) out.push({ p: [x, H - 0.35, z], rz: Math.PI / 2 });
    return out;
  }, []);
  const beams = useMemo<Item[]>(() => [14, 22.5, 28.5, 35].map((x) => ({ p: [x, H - 0.15, 0], s: [0.4, 0.3, 17.8] })), []);
  const loops = useMemo(() => {
    const out: { p: [number, number, number]; s: [number, number, number] }[] = [];
    for (const z of [-5, 5]) {
      out.push({ p: [26, H - 0.12, z - 1.9], s: [16.4, 0.05, 0.08] });
      out.push({ p: [26, H - 0.12, z + 1.9], s: [16.4, 0.05, 0.08] });
      out.push({ p: [17.8, H - 0.12, z], s: [0.08, 0.05, 3.8] });
      out.push({ p: [34.2, H - 0.12, z], s: [0.08, 0.05, 3.8] });
    }
    return out;
  }, []);
  const loopHalos = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const z of [-5, 5]) for (const x of [19, 23, 27, 31, 33.5]) out.push({ p: [x, H - 0.5, z], s: 2.2, c: CYAN });
    return out;
  }, []);
  return (
    <>
      <Inst items={beams}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#14586c" roughness={0.6} />
      </Inst>
      <Inst items={pipes.map((p) => ({ ...p, s: [1, 21, 1] as [number, number, number] }))}>
        <cylinderGeometry args={[0.13, 0.13, 1, 10]} />
        <meshStandardMaterial color="#1a8aa4" roughness={0.4} metalness={0.2} />
      </Inst>
      <Inst items={flanges}>
        <cylinderGeometry args={[0.2, 0.2, 0.14, 10]} />
        <meshStandardMaterial color="#ff9a3a" roughness={0.5} emissive="#6a2e00" emissiveIntensity={0.5} />
      </Inst>
      {loops.map((l, i) => (
        <Glow key={i} position={l.p} size={l.s} color={CYAN} k={2.0} />
      ))}
      <Halos items={loopHalos} k={0.3} />
    </>
  );
}

/** Low-poly golden crown over the east-wall sign. */
function Crown() {
  const spikes = useMemo<Item[]>(() => Array.from({ length: 5 }, (_, i) => ({ p: [-1.5 + i * 0.75, 0.55, 0], s: [1, i % 2 ? 0.8 : 1.15, 1] })), []);
  const orbs = useMemo<Item[]>(() => Array.from({ length: 5 }, (_, i) => ({ p: [-1.5 + i * 0.75, i % 2 ? 0.95 : 1.15, 0] })), []);
  const halos = useMemo<Item[]>(() => [{ p: [35.3, 4.7, 0], s: 3.6, c: "#ffd166" }], []);
  return (
    <>
      <group position={[35.3, 4.1, 0]} rotation={[0, -Math.PI / 2, 0]} scale={0.8}>
        <mesh position={[0, 0.12, 0]}>
          <boxGeometry args={[3.5, 0.34, 0.5]} />
          <meshStandardMaterial color="#f0c15a" roughness={0.35} metalness={0.3} emissive="#5a3a00" emissiveIntensity={0.6} />
        </mesh>
        <Inst items={spikes}>
          <coneGeometry args={[0.36, 0.9, 4]} />
          <meshStandardMaterial color="#f0c15a" roughness={0.35} metalness={0.3} emissive="#5a3a00" emissiveIntensity={0.6} flatShading />
        </Inst>
        <Inst items={orbs}>
          <sphereGeometry args={[0.13, 8, 6]} />
          <meshBasicMaterial color={hdr(CYAN, 2.4)} toneMapped={false} />
        </Inst>
      </group>
      <Halos items={halos} k={0.5} />
    </>
  );
}

const WALL_LANTERNS = [
  ...[13.5, 20, 26, 32].map((x, i) => ({ x, y: 3.5, z: -8.8, ry: 0, c: i % 2 ? CYAN : AMBER })),
  ...[13.5, 20, 26, 32].map((x, i) => ({ x, y: 3.5, z: 8.8, ry: Math.PI, c: i % 2 ? CYAN : AMBER })),
  ...[-6.5, 6.5].map((z) => ({ x: 35.8, y: 3.3, z, ry: -Math.PI / 2, c: AMBER })),
];

const WL = wallLanternItems(WALL_LANTERNS);
export const ARCADE_LANTERNS: LanternItem[] = [...FLOOR_L, ...WL.lanterns];
export const ARCADE_BRACKETS: Item[] = WL.brackets;

export default function Arcade() {
  const bars = BARS.filter((b) => b.room === "arcade");
  const sofas = SOFAS.filter((c) => roomAt(c.x, c.z) === "arcade");
  const tables = TABLES.filter((c) => roomAt(c.x, c.z) === "arcade");
  return (
    <>
      <BulbStrings />
      <CeilingWork />
      <Crown />
      {bars.map((b, i) => (
        <Bar key={i} x={b.x} z={b.z} ry={b.ry} len={b.len} kind={b.kind} accent={CYAN} />
      ))}
      <SignBoard position={[15.2, 3.7, -8.78]} ry={0} w={3.4} h={0.75} text="VIP LOUNGE" color="#ffd166" border={CYAN} />
      <Sofas spots={sofas} />
      {tables.map((t, i) => (
        <RoundTable key={i} x={t.x} z={t.z} r={t.r} c={t.c} />
      ))}
      <Poufs spots={POUFS.filter((p) => roomAt(p.x, p.z) === "arcade")} />
      <Barrels spots={BARRELS.filter((b) => roomAt(b.x, b.z) === "arcade")} />
      <Confetti bounds={R.bounds} count={30} colors={CONF} seed={9} />
      <SignBoard position={[35.78, 3.1, 0]} ry={-Math.PI / 2} w={7.6} h={1.5} text="HIGH ROLLER" color="#ffd166" border={CYAN} k={1.3} />
      <Frame position={[35.8, 3.1, -5.2]} ry={-Math.PI / 2} w={1.4} h={1.75} texture={art("rocket")} />
      <Frame position={[35.8, 3.1, 5.2]} ry={-Math.PI / 2} w={1.4} h={1.75} texture={art("horse")} />
      <Frame position={[23, 3.5, -8.8]} ry={0} w={1.4} h={1.75} texture={art("rocket")} lit />
      <Frame position={[29, 3.5, -8.8]} ry={0} w={1.4} h={1.75} texture={art("dice")} />
      <Frame position={[23, 3.5, 8.8]} ry={Math.PI} w={1.4} h={1.75} texture={art("horse")} />
      <Frame position={[29, 3.5, 8.8]} ry={Math.PI} w={1.4} h={1.75} texture={art("sun")} />
      <Frame position={[13.0, 3.5, 8.8]} ry={Math.PI} w={1.5} h={1.9} texture={art("crown")} />
      <Frame position={[17.2, 3.5, 8.8]} ry={Math.PI} w={1.5} h={1.9} texture={art("seven")} />
    </>
  );
}
