"use client";

import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { ROOMS, roomAt } from "../world";
import { FLOOR_LANTERNS, POUFS, TABLES } from "./placements";
import { Blobs, Frame, Glow, Halos, Inst, Poufs, RoundTable, SignBoard, floorLanterns, hdr, wallLanternItems, type Item, type LanternItem, type Vec3 } from "./kit";
import { art } from "./textures";

const R = ROOMS.slots;
const H = R.height;
const PINK = "#ff8fd1";
const CYAN = "#7df9ff";

const RINGS: { x: number; z: number; r: number; c: string }[] = [
  { x: -30, z: -5, r: 1.7, c: PINK },
  { x: -18, z: -5, r: 1.7, c: CYAN },
  { x: -30, z: 5, r: 1.7, c: CYAN },
  { x: -18, z: 5, r: 1.7, c: PINK },
  { x: -24, z: 0, r: 2.2, c: "#ffd166" },
  { x: -14.5, z: 0, r: 1.2, c: PINK },
  { x: -33.5, z: 0, r: 1.2, c: CYAN },
];

const _a = new THREE.Color(PINK);
const _b = new THREE.Color(CYAN);

function NeonCeiling() {
  const pinkMat = useRef<THREE.MeshBasicMaterial>(null);
  const cyanMat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (pinkMat.current) pinkMat.current.color.copy(_a).multiplyScalar(2.0 + Math.sin(t * 2.0) * 0.6);
    if (cyanMat.current) cyanMat.current.color.copy(_b).multiplyScalar(2.0 + Math.sin(t * 2.0 + 2.0) * 0.6);
  });
  const stars = useMemo(() => {
    const out: Item[] = [];
    const cols = ["#ffffff", PINK, CYAN, "#ffd166", "#b78cff"];
    let s = 1337;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    for (let i = 0; i < 110; i++) {
      const x = -35.5 + rnd() * 23;
      const z = -8.5 + rnd() * 17;
      out.push({ p: [x, H - 0.04, z], s: 0.5 + rnd() * 1.1, c: hdr(cols[i % cols.length], 2.2) });
    }
    return out;
  }, []);
  const starHalos = useMemo<Item[]>(() => stars.filter((_, i) => i % 5 === 0).map((s) => ({ p: [s.p[0], s.p[1] - 0.1, s.p[2]], s: 0.9, c: "#ffd9f0" })), [stars]);
  const ringsPink = useMemo<Item[]>(() => RINGS.filter((r) => r.c === PINK).map((r) => ({ p: [r.x, H - 0.25, r.z], s: r.r, rx: Math.PI / 2 })), []);
  const ringsCyan = useMemo<Item[]>(() => RINGS.filter((r) => r.c === CYAN).map((r) => ({ p: [r.x, H - 0.25, r.z], s: r.r, rx: Math.PI / 2 })), []);
  const ringsGold = useMemo<Item[]>(() => RINGS.filter((r) => r.c !== PINK && r.c !== CYAN).map((r) => ({ p: [r.x, H - 0.25, r.z], s: r.r, rx: Math.PI / 2 })), []);
  const inner = useMemo<Item[]>(() => RINGS.map((r) => ({ p: [r.x, H - 0.2, r.z], s: r.r * 0.55, rx: Math.PI / 2 })), []);
  const ringHalos = useMemo<Item[]>(() => RINGS.map((r) => ({ p: [r.x, H - 0.6, r.z], s: r.r * 2.0, c: r.c })), []);
  const beams = useMemo<Item[]>(() => [-9, -3, 3, 9].map((z) => ({ p: [-24, H - 0.15, z], s: [24, 0.3, 0.4] })), []);
  return (
    <>
      <Inst items={beams}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#3a2470" roughness={0.7} />
      </Inst>
      <Inst items={ringsPink}>
        <torusGeometry args={[1, 0.045, 6, 40]} />
        <meshBasicMaterial ref={pinkMat} color={hdr(PINK, 2.0)} toneMapped={false} />
      </Inst>
      <Inst items={ringsCyan}>
        <torusGeometry args={[1, 0.045, 6, 40]} />
        <meshBasicMaterial ref={cyanMat} color={hdr(CYAN, 2.0)} toneMapped={false} />
      </Inst>
      <Inst items={ringsGold}>
        <torusGeometry args={[1, 0.05, 6, 40]} />
        <meshBasicMaterial color={hdr("#ffd166", 2.2)} toneMapped={false} />
      </Inst>
      <Inst items={inner}>
        <torusGeometry args={[1, 0.03, 6, 30]} />
        <meshBasicMaterial color={hdr("#ffffff", 1.6)} toneMapped={false} />
      </Inst>
      <Inst items={stars}>
        <sphereGeometry args={[0.07, 6, 4]} />
        <meshBasicMaterial toneMapped={false} />
      </Inst>
      <Halos items={starHalos} k={0.5} />
      <Halos items={ringHalos} k={0.38} />
      {/* ceiling guide strips along the clear centre aisle */}
      <Glow position={[-24.3, H - 0.1, -2.2]} size={[23.4, 0.05, 0.08]} color={PINK} k={2} />
      <Glow position={[-24.3, H - 0.1, 2.2]} size={[23.4, 0.05, 0.08]} color={CYAN} k={2} />
      {/* floor guide lines, same colours */}
      <Glow position={[-24.3, 0.02, -2.3]} size={[23.4, 0.02, 0.07]} color={CYAN} k={1.8} />
      <Glow position={[-24.3, 0.02, 2.3]} size={[23.4, 0.02, 0.07]} color={PINK} k={1.8} />
    </>
  );
}

function Pods() {
  const pods = useMemo(() => TABLES.filter((t) => roomAt(t.x, t.z) === "slots"), []);
  const { seats, backs, lampRings, cords, halos } = useMemo(() => {
    const seats: Item[] = [];
    const backs: Item[] = [];
    const lampRings: Item[] = [];
    const cords: Item[] = [];
    const halos: Item[] = [];
    for (const p of pods) {
      const open = p.z < 0 ? Math.PI / 2 : -Math.PI / 2; // angle (in xz) that points toward the centre aisle
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const d = Math.abs(Math.atan2(Math.sin(a - open), Math.cos(a - open)));
        if (d < 0.9) continue;
        const sx = Math.cos(a);
        const sz = Math.sin(a);
        seats.push({ p: [p.x + sx * 1.35, 0.25, p.z + sz * 1.35], s: [0.86, 1, 0.55], ry: -a + Math.PI / 2, c: i % 2 ? "#c24aa0" : "#a2388a" });
        backs.push({ p: [p.x + sx * 1.65, 0.55, p.z + sz * 1.65], s: [0.88, 0.75, 0.14], ry: -a + Math.PI / 2, c: "#c14aa8" });
      }
      lampRings.push({ p: [p.x, 3.3, p.z], rx: Math.PI / 2 });
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + 0.5;
        cords.push({ p: [p.x + Math.cos(a) * 1.5, 3.3 + (H - 3.3) / 2, p.z + Math.sin(a) * 1.5], s: [1, H - 3.3, 1] });
      }
      halos.push({ p: [p.x, 3.3, p.z], s: 3.4, c: PINK });
    }
    return { seats, backs, lampRings, cords, halos };
  }, [pods]);
  return (
    <>
      <Inst items={seats}>
        <boxGeometry args={[1, 0.5, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </Inst>
      <Inst items={backs}>
        <boxGeometry args={[1, 0.9, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </Inst>
      <Inst items={lampRings}>
        <torusGeometry args={[1.5, 0.05, 6, 34]} />
        <meshBasicMaterial color={hdr(PINK, 2.2)} toneMapped={false} />
      </Inst>
      <Inst items={cords}>
        <cylinderGeometry args={[0.012, 0.012, 1, 4]} />
        <meshStandardMaterial color="#2a1a40" />
      </Inst>
      <Halos items={halos} k={0.45} />
      {pods.map((p, i) => (
        <group key={i}>
          <RoundTable x={p.x} z={p.z} r={p.r + 0.2} c={p.c} />
          <Blobs spots={[{ x: p.x, z: p.z, r: 2.3 }]} />
        </group>
      ))}
    </>
  );
}

function MirrorBall() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.5;
  });
  const halos = useMemo<Item[]>(() => [{ p: [-24, 3.9, 0], s: 3.6, c: "#ffd1f2" }], []);
  return (
    <>
      <mesh position={[-24, 4.9, 0]}>
        <cylinderGeometry args={[0.012, 0.012, H - 4.9, 4]} />
        <meshStandardMaterial color="#2a1a40" />
      </mesh>
      <group ref={g} position={[-24, 3.9, 0]}>
        <mesh>
          <icosahedronGeometry args={[0.7, 1]} />
          <meshStandardMaterial color="#f3e6ff" emissive="#ff9ad8" emissiveIntensity={0.55} roughness={0.15} flatShading />
        </mesh>
      </group>
      <Halos items={halos} k={0.5} />
    </>
  );
}

const WALL_LANTERNS: { x: number; y: number; z: number; ry: number; c: string }[] = [
  ...[-33, -27, -21, -15].map((x, i) => ({ x, y: 3.4, z: -8.8, ry: 0, c: i % 2 ? PINK : "#ffb347" })),
  ...[-33, -27, -21, -15].map((x, i) => ({ x, y: 3.4, z: 8.8, ry: Math.PI, c: i % 2 ? CYAN : "#ffb347" })),
];

const WL = wallLanternItems(WALL_LANTERNS);
export const SLOTS_LANTERNS: LanternItem[] = [...floorLanterns(FLOOR_LANTERNS.slots), ...WL.lanterns];
export const SLOTS_BRACKETS: Item[] = WL.brackets;

export default function Slots() {
  const bigSeven = useMemo<Vec3>(() => [-35.78, 3.2, 0], []);
  return (
    <>
      <NeonCeiling />
      <Pods />
      <MirrorBall />
      <Poufs spots={POUFS.filter((p) => roomAt(p.x, p.z) === "slots")} />
      {/* the end wall: a big neon 777 down the clear aisle */}
      <SignBoard position={bigSeven} ry={Math.PI / 2} w={8.6} h={2.6} text="7  7  7" color="#ff6fc0" border="#7df9ff" k={1.4} />
      <Frame position={[-35.8, 3.2, -6.6]} ry={Math.PI / 2} w={1.5} h={1.9} texture={art("seven")} />
      <Frame position={[-35.8, 3.2, 6.6]} ry={Math.PI / 2} w={1.5} h={1.9} texture={art("wheel")} />
      <SignBoard position={[-30, 3.9, -8.78]} ry={0} w={3.2} h={0.75} text="LUCKY SPIN" color="#ff8fd1" />
      <SignBoard position={[-24, 3.9, -8.78]} ry={0} w={3.2} h={0.75} text="JACKPOT" color="#ffd166" />
      <SignBoard position={[-18, 3.9, -8.78]} ry={0} w={3.2} h={0.75} text="BIG WIN" color="#7df9ff" />
      <SignBoard position={[-30, 3.9, 8.78]} ry={Math.PI} w={3.2} h={0.75} text="HIT IT" color="#7df9ff" />
      <SignBoard position={[-24, 3.9, 8.78]} ry={Math.PI} w={3.2} h={0.75} text="KENO NIGHTS" color="#ffd166" />
      <SignBoard position={[-18, 3.9, 8.78]} ry={Math.PI} w={3.2} h={0.75} text="SPIN TO WIN" color="#ff8fd1" />
      <Frame position={[-24, 2.5, -8.8]} ry={0} w={1.2} h={1.0} texture={art("crown")} lit={false} frame="#ff8fd1" />
      <Frame position={[-24, 2.5, 8.8]} ry={Math.PI} w={1.2} h={1.0} texture={art("cards")} lit={false} frame="#7df9ff" />
    </>
  );
}

