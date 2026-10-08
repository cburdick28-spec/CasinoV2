import type { RoomId } from "../world";

/**
 * Pure data for everything the room dressing puts on the floor. Kept free of three/react
 * so a node script can import it and check clearances against world.ts.
 */
export type P2 = [number, number];

export interface PlantSpot {
  x: number;
  z: number;
  s?: number;
  pot?: string;
}
export interface BenchSpot {
  x: number;
  z: number;
  ry: number;
  len: number;
  c: string;
}
export interface CrateSpot {
  x: number;
  z: number;
  ry: number;
  s: number;
  c: string;
  stack?: number;
}
export interface LanternSpot {
  x: number;
  z: number;
  c: string;
  post: number;
}
export interface BarSpot {
  x: number;
  z: number;
  ry: number;
  len: number;
  kind: "bar" | "cage";
  room: RoomId;
}
export interface SofaSpot {
  x: number;
  z: number;
  ry: number;
  len: number;
  c: string;
}
export interface TableSpot {
  x: number;
  z: number;
  r: number;
  c: string;
}
export interface PoufSpot {
  x: number;
  z: number;
  r: number;
  c: string;
}
export interface BarrelSpot {
  x: number;
  z: number;
  s: number;
}
export interface RopeSpot {
  a: P2;
  b: P2;
  n: number;
}

const TERRA = ["#c4623a", "#d9803f", "#a9503a", "#d8a05a"];
const pot = (i: number) => TERRA[i % TERRA.length];

export const PLANTS: Record<RoomId, PlantSpot[]> = {
  lobby: [
    [-11.2, -9.0],
    [11.2, -9.0],
    [-11.2, 9.0],
    [11.2, 9.0],
    [-11.2, -3.6],
    [-11.2, 3.6],
    [11.2, -3.6],
    [11.2, 3.6],
    [-3.7, -9.0],
    [3.7, -9.0],
    [-5.8, 9.0],
    [5.8, 9.0],
  ].map(([x, z], i) => ({ x, z, s: i % 3 === 0 ? 1.25 : 1, pot: pot(i) })),
  tables: [
    [-15.2, -11.2],
    [15.2, -11.2],
    [-15.2, -18.0],
    [15.2, -18.0],
    [-15.2, -24.5],
    [15.2, -24.5],
    [-15.2, -33.0],
    [15.2, -33.0],
    [-8, -24.5],
    [8, -24.5],
    [-8, -14],
    [8, -14],
    [-8, -33],
    [8, -33],
  ].map(([x, z], i) => ({ x, z, s: i % 4 === 0 ? 1.3 : 1.05, pot: pot(i + 1) })),
  slots: [
    [-35, -8.2],
    [-35, 8.2],
    [-13.2, -8.2],
    [-13.2, 8.2],
    [-24, -8.3],
    [-24, 8.3],
    [-35, -3.6],
    [-35, 3.6],
    [-19, -8.3],
    [-19, 8.3],
    [-29.5, -8.3],
    [-29.5, 8.3],
  ].map(([x, z], i) => ({ x, z, s: 1.1, pot: ["#d76aa8", "#8f6be0", "#e2528f", "#6f5ac7"][i % 4] })),
  arcade: [
    [13.3, -8.2],
    [13.3, 8.2],
    [35.2, -3.8],
    [35.2, 3.8],
    [35.2, -8.2],
    [35.2, 8.2],
    [23, -8.2],
    [23, 8.2],
    [29, -8.2],
    [29, 8.2],
  ].map(([x, z], i) => ({ x, z, s: 1.05, pot: ["#e0883a", "#c4623a", "#2fb5a0", "#d8a05a"][i % 4] })),
};

export const BENCHES: BenchSpot[] = [
  { x: -11.0, z: -6.4, ry: Math.PI / 2, len: 2.6, c: "#b4423f" },
  { x: -11.0, z: 6.4, ry: Math.PI / 2, len: 2.6, c: "#b4423f" },
  { x: 11.0, z: -6.4, ry: -Math.PI / 2, len: 2.6, c: "#b4423f" },
  { x: 11.0, z: 6.4, ry: -Math.PI / 2, len: 2.6, c: "#b4423f" },
  { x: -3.6, z: 9.2, ry: Math.PI, len: 2.2, c: "#b4423f" },
  { x: 3.6, z: 9.2, ry: Math.PI, len: 2.2, c: "#b4423f" },
  { x: -15.2, z: -28, ry: Math.PI / 2, len: 2.6, c: "#2f7a5a" },
  { x: 15.2, z: -28, ry: -Math.PI / 2, len: 2.6, c: "#2f7a5a" },
  { x: -15.2, z: -21.5, ry: Math.PI / 2, len: 1.8, c: "#2f7a5a" },
  { x: 15.2, z: -21.5, ry: -Math.PI / 2, len: 1.8, c: "#2f7a5a" },
];

export const SOFAS: SofaSpot[] = [
  { x: 15.0, z: -14.4, ry: -Math.PI / 2, len: 3.6, c: "#b8503f" },
  { x: 15.0, z: 8.25, ry: Math.PI, len: 3.8, c: "#e0883a" },
  { x: 13.0, z: -15.6, ry: 0, len: 2.2, c: "#b8503f" },
];

export const TABLES: TableSpot[] = [
  { x: 12.9, z: -13.4, r: 0.55, c: "#6b3a20" },
  { x: 15.0, z: 6.4, r: 0.6, c: "#2a2f3a" },
  { x: -24, z: -5.5, r: 0.45, c: "#2a1a52" },
  { x: -24, z: 5.5, r: 0.45, c: "#2a1a52" },
];

export const CRATES: CrateSpot[] = [
  { x: -11.1, z: 8.3, ry: 0.3, s: 0.8, c: "#c98a4c", stack: 2 },
  { x: 11.1, z: -8.4, ry: -0.2, s: 0.7, c: "#c98a4c", stack: 2 },
  { x: -15.2, z: -15.2, ry: 0.4, s: 0.7, c: "#a9663a", stack: 1 },
  { x: 14.8, z: -33.1, ry: -0.3, s: 0.8, c: "#a9663a", stack: 2 },
  { x: -34.8, z: 6.0, ry: 0.2, s: 0.7, c: "#6a4aa8", stack: 2 },
  { x: -34.8, z: -6.0, ry: -0.3, s: 0.7, c: "#6a4aa8", stack: 1 },
  { x: 35.0, z: -6.2, ry: 0.35, s: 0.8, c: "#c98a4c", stack: 2 },
  { x: 35.0, z: 6.2, ry: -0.25, s: 0.7, c: "#e0883a", stack: 2 },
];

export const POUFS: PoufSpot[] = [
  { x: -21.2, z: -7.4, r: 0.45, c: "#e2528f" },
  { x: -26.8, z: -7.4, r: 0.45, c: "#7df9ff" },
  { x: -21.2, z: 7.4, r: 0.45, c: "#7df9ff" },
  { x: -26.8, z: 7.4, r: 0.45, c: "#e2528f" },
  { x: -33.6, z: -7.2, r: 0.5, c: "#ffd166" },
  { x: -33.6, z: 7.2, r: 0.5, c: "#ffd166" },
  { x: 13.8, z: -3.7, r: 0.45, c: "#ff9a3a" },
  { x: 16.4, z: -3.5, r: 0.45, c: "#2fe0c2" },
  { x: 14.6, z: 3.4, r: 0.4, c: "#ff9a3a" },
  { x: 10.3, z: -15.2, r: 0.0, c: "#000" },
].filter((p) => p.r > 0);

export const BARRELS: BarrelSpot[] = [
  { x: -14.2, z: -32.3, s: 1 },
  { x: -13.35, z: -32.8, s: 0.9 },
  { x: -14.4, z: -31.4, s: 0.85 },
  { x: 13.3, z: -32.4, s: 1 },
  { x: 12.5, z: -32.9, s: 0.9 },
  { x: 15.0, z: -29.7, s: 0.9 },
  { x: -15.0, z: -29.9, s: 0.9 },
  { x: 11.2, z: -8.4, s: 0.9 },
  { x: -11.1, z: -8.4, s: 0.0 },
].filter((b) => b.s > 0);

export const FLOOR_LANTERNS: Record<RoomId, LanternSpot[]> = {
  lobby: [
    { x: -9.4, z: 9.2, c: "#ffb347", post: 1.0 },
    { x: 9.4, z: 9.2, c: "#ffb347", post: 1.0 },
    { x: -11.3, z: -1.0, c: "#ffb347", post: 0 },
  ].filter((l) => l.post > 0),
  tables: [
    { x: -15.4, z: -22.0, c: "#ffb347", post: 1.1 },
    { x: 15.4, z: -22.0, c: "#ffb347", post: 1.1 },
    { x: -15.4, z: -26.6, c: "#ffb347", post: 1.1 },
    { x: 15.4, z: -26.6, c: "#ffb347", post: 1.1 },
    { x: -15.4, z: -30.5, c: "#ffb347", post: 1.1 },
    { x: 15.4, z: -30.5, c: "#ffb347", post: 1.1 },
  ],
  slots: [
    { x: -13.4, z: -5.4, c: "#ff8fd1", post: 1.1 },
    { x: -13.4, z: 5.4, c: "#ff8fd1", post: 1.1 },
    { x: -35.3, z: -1.0 - 4, c: "#7df9ff", post: 1.1 },
    { x: -35.3, z: 5.0, c: "#7df9ff", post: 1.1 },
  ],
  arcade: [
    { x: 13.4, z: -5.4, c: "#ffb347", post: 1.1 },
    { x: 13.4, z: 3.6, c: "#ffb347", post: 1.1 },
    { x: 35.3, z: -5.2, c: "#ffb347", post: 1.1 },
    { x: 35.3, z: 5.4, c: "#ffb347", post: 1.1 },
  ],
};

export const BARS: BarSpot[] = [
  { room: "lobby", x: -7.5, z: -8.63, ry: 0, len: 6, kind: "bar" },
  { room: "lobby", x: 7.5, z: -8.63, ry: 0, len: 6, kind: "cage" },
  { room: "tables", x: -14.63, z: -14.35, ry: Math.PI / 2, len: 4.3, kind: "bar" },
  { room: "arcade", x: 15.2, z: -7.67, ry: 0, len: 5, kind: "bar" },
];

export const ROPES: RopeSpot[] = [
  { a: [-2.55, -9.2], b: [-2.55, -4.6], n: 4 },
  { a: [2.55, -9.2], b: [2.55, -4.6], n: 4 },
  { a: [-13, -32.9], b: [-5, -32.9], n: 4 },
  { a: [5, -32.9], b: [13, -32.9], n: 4 },
];

/** Disc footprints (x, z, radius) of every non-colliding thing standing on the floor. */
export function footprints(): { tag: string; x: number; z: number; r: number }[] {
  const out: { tag: string; x: number; z: number; r: number }[] = [];
  (Object.keys(PLANTS) as RoomId[]).forEach((rm) => PLANTS[rm].forEach((p, i) => out.push({ tag: `plant:${rm}:${i}`, x: p.x, z: p.z, r: 0.45 * (p.s ?? 1) })));
  BENCHES.forEach((b, i) => alongLine(out, `bench:${i}`, b.x, b.z, b.ry, b.len, 0.32));
  SOFAS.forEach((b, i) => alongLine(out, `sofa:${i}`, b.x, b.z, b.ry, b.len, 0.45));
  TABLES.forEach((t, i) => out.push({ tag: `table:${i}`, x: t.x, z: t.z, r: t.r }));
  POUFS.forEach((c, i) => out.push({ tag: `pouf:${i}`, x: c.x, z: c.z, r: c.r }));
  BARRELS.forEach((c, i) => out.push({ tag: `barrel:${i}`, x: c.x, z: c.z, r: 0.42 * c.s }));
  CRATES.forEach((c, i) => out.push({ tag: `crate:${i}`, x: c.x, z: c.z, r: c.s * 0.7 }));
  (Object.keys(FLOOR_LANTERNS) as RoomId[]).forEach((rm) => FLOOR_LANTERNS[rm].forEach((l, i) => out.push({ tag: `lantern:${rm}:${i}`, x: l.x, z: l.z, r: 0.2 })));
  BARS.forEach((b, i) => alongLine(out, `bar:${i}`, b.x, b.z, b.ry, b.len, 1.15, 0.0));
  ROPES.forEach((rp, i) => {
    for (let k = 0; k <= rp.n; k++) out.push({ tag: `rope:${i}:${k}`, x: rp.a[0] + ((rp.b[0] - rp.a[0]) * k) / rp.n, z: rp.a[1] + ((rp.b[1] - rp.a[1]) * k) / rp.n, r: 0.1 });
  });
  return out;
}

function alongLine(out: { tag: string; x: number; z: number; r: number }[], tag: string, x: number, z: number, ry: number, len: number, r: number, off = 0) {
  // the item's long axis is local x, rotated by ry about y
  const steps = Math.max(1, Math.round(len / 0.5));
  for (let k = 0; k <= steps; k++) {
    const lx = -len / 2 + (len * k) / steps;
    out.push({ tag: `${tag}:${k}`, x: x + Math.cos(ry) * lx + Math.sin(ry) * off, z: z - Math.sin(ry) * lx + Math.cos(ry) * off, r });
  }
}
