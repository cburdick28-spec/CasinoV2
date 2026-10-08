"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { ROOMS, STATIONS, roomAt } from "../world";
import { BARRELS, BARS, BENCHES, FLOOR_LANTERNS, ROPES, SOFAS, TABLES } from "./placements";
import { Bar, Barrels, Benches, Chandelier, Confetti, Frame, Glow, Halos, Inst, RoundTable, Ropes, SignBoard, Sofas, floorLanterns, hdr, wallLanternItems, type Item, type LanternItem } from "./kit";
import { art } from "./textures";

const R = ROOMS.tables;
const FLOOR_L = floorLanterns(FLOOR_LANTERNS.tables);
const BACK_ROPES = ROPES.filter((r) => r.a[1] < -30);
const CONF = ["#fbf3df", "#e0553a", "#f4c95d", "#fbf3df", "#37c98f"];
const H = R.height;

const WALL_LANTERNS = [
  ...[-12.5, -19.5, -24, -31.5].map((z) => ({ x: -15.8, y: 3.4, z, ry: Math.PI / 2, c: "#ffb347" })),
  ...[-12.5, -19.5, -24, -31.5].map((z) => ({ x: 15.8, y: 3.4, z, ry: -Math.PI / 2, c: "#ffb347" })),
  ...[-5.5, 5.5, -11.5, 11.5].map((x) => ({ x, y: 3.5, z: -33.8, ry: 0, c: "#ffb347" })),
];

function Pendants() {
  const st = useMemo(() => STATIONS.filter((s) => s.room === "tables"), []);
  const { shades, glows, cords, halos } = useMemo(() => {
    const shades: Item[] = [];
    const glows: Item[] = [];
    const cords: Item[] = [];
    const halos: Item[] = [];
    for (const s of st) {
      const [x, z] = s.position;
      shades.push({ p: [x, 4.55, z], c: "#1f7a58" });
      glows.push({ p: [x, 4.3, z], rx: Math.PI / 2 });
      cords.push({ p: [x, 5.55, z], s: [1, 2.0, 1] });
      halos.push({ p: [x, 4.2, z], s: 2.6, c: "#ffd9a0" });
    }
    return { shades, glows, cords, halos };
  }, [st]);
  return (
    <>
      <Inst items={shades}>
        <cylinderGeometry args={[0.28, 1.0, 0.6, 18, 1, true]} />
        <meshStandardMaterial roughness={0.35} side={THREE.DoubleSide} emissive="#0c3a28" />
      </Inst>
      <Inst items={shades.map((s) => ({ p: [s.p[0], 4.26, s.p[2]] as [number, number, number], rx: Math.PI / 2 }))}>
        <torusGeometry args={[1.0, 0.04, 6, 24]} />
        <meshStandardMaterial color="#f0c15a" roughness={0.4} emissive="#5a3a00" />
      </Inst>
      <Inst items={glows}>
        <circleGeometry args={[0.95, 18]} />
        <meshBasicMaterial color={hdr("#ffe3b0", 1.6)} toneMapped={false} side={THREE.DoubleSide} />
      </Inst>
      <Inst items={cords}>
        <cylinderGeometry args={[0.02, 0.02, 1, 4]} />
        <meshStandardMaterial color="#2a1a10" />
      </Inst>
      <Halos items={halos} k={0.5} />
    </>
  );
}

function CeilingWork() {
  const beams = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const z of [-11, -17, -23, -29, -33.6]) out.push({ p: [0, H - 0.22, z], s: [31.8, 0.44, 0.5] });
    for (const x of [-15.6, -8, 0, 8, 15.6]) out.push({ p: [x, H - 0.22, -22], s: [0.5, 0.44, 23.8] });
    return out;
  }, []);
  const strips = useMemo<Item[]>(() => [-17, -23, -29].map((z) => ({ p: [0, H - 0.47, z + 0.0], s: [31, 0.03, 0.08] })), []);
  const stripHalos = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const z of [-17, -23, -29]) for (let x = -12; x <= 12; x += 6) out.push({ p: [x, H - 0.6, z], s: 2.4, c: "#ffcf80" });
    return out;
  }, []);
  return (
    <>
      <Inst items={beams}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6b3d22" roughness={0.65} />
      </Inst>
      <Inst items={strips}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color={hdr("#ffcf80", 1.4)} toneMapped={false} />
      </Inst>
      <Halos items={stripHalos} k={0.28} />
      <Chandelier position={[0, H - 0.7, -14]} radius={1.5} bulbs={12} tiers={2} drop={0.4} color="#ffd9a0" />
      <Chandelier position={[0, H - 0.7, -25.5]} radius={1.5} bulbs={12} tiers={2} drop={0.4} color="#ffd9a0" />
    </>
  );
}

const inTables = (x: number, z: number) => roomAt(x, z) === "tables";

const WL = wallLanternItems(WALL_LANTERNS);
export const TABLES_LANTERNS: LanternItem[] = [...FLOOR_L, ...WL.lanterns];
export const TABLES_BRACKETS: Item[] = WL.brackets;

export default function Tables() {
  const bars = BARS.filter((b) => b.room === "tables");
  const benches = BENCHES.filter((b) => inTables(b.x, b.z));
  const sofas = SOFAS.filter((c) => inTables(c.x, c.z));
  const tables = TABLES.filter((c) => inTables(c.x, c.z));
  return (
    <>
      <Pendants />
      <CeilingWork />
      {bars.map((b, i) => (
        <Bar key={i} x={b.x} z={b.z} ry={b.ry} len={b.len} kind={b.kind} accent={R.theme.accent} />
      ))}
      <SignBoard position={[-15.78, 3.5, -14.35]} ry={Math.PI / 2} w={3.2} h={0.7} text="HIGH CARD BAR" color="#37e8a0" />
      <Sofas spots={sofas} />
      {tables.map((t, i) => (
        <RoundTable key={i} x={t.x} z={t.z} r={t.r} c={t.c} />
      ))}
      <Benches spots={benches} />
      <Barrels spots={BARRELS.filter((b) => inTables(b.x, b.z))} />
      <Confetti bounds={R.bounds} count={45} colors={CONF} seed={5} />
      <Ropes spots={BACK_ROPES} rope="#8a1f2c" />
      {/* back wall showpiece */}
      <SignBoard position={[0, 3.7, -33.78]} ry={0} w={9} h={1.4} text="CARDS, DICE AND THE WHEEL" color="#ffd166" border="#37e8a0" k={1.2} />
      <Frame position={[-8.8, 3.5, -33.8]} ry={0} w={1.8} h={2.25} texture={art("cards")} />
      <Frame position={[8.8, 3.5, -33.8]} ry={0} w={1.8} h={2.25} texture={art("dice")} />
      <Frame position={[-13.8, 3.5, -33.8]} ry={0} w={1.6} h={2.0} texture={art("wheel")} />
      <Frame position={[13.8, 3.5, -33.8]} ry={0} w={1.6} h={2.0} texture={art("sun")} />
      {/* east lounge art */}
      <Frame position={[15.8, 3.3, -14.4]} ry={-Math.PI / 2} w={1.6} h={2.0} texture={art("horse")} />
      <Frame position={[15.8, 3.3, -11.8]} ry={-Math.PI / 2} w={1.2} h={1.5} texture={art("crown")} />
      <Frame position={[-15.8, 3.3, -28.0]} ry={Math.PI / 2} w={1.6} h={2.0} texture={art("seven")} />
      <Frame position={[15.8, 3.3, -28.0]} ry={-Math.PI / 2} w={1.6} h={2.0} texture={art("rocket")} />
      {/* velvet showcase cabinet lights along the back wall */}
      <Glow position={[0, 0.05, -33.55]} size={[30, 0.04, 0.06]} color="#37e8a0" k={1.4} />
    </>
  );
}
