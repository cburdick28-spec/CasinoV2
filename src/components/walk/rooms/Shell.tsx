"use client";

import * as THREE from "three";
import { useMemo } from "react";
import { DOORS, DOOR_HEIGHT, ROOMS, ROOM_ORDER, WALLS, WALL_THICKNESS, roomAt, type Door, type RoomId } from "../world";
import { Boxes, Glow, Halos, bakeBoxes, hdr, neonFrame, tiledPlane, type BoxSpec, type Item, type LanternItem } from "./kit";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { feltBrass, floorShade, glossTiles, label, lobbyCarpet, medallion, mix, neonCarpet, runner, wainscot, wallShade, wallpaper } from "./textures";

/* ---------------------------------------------------------------- floors */

function useFloorMats() {
  return useMemo(() => {
    const neon = neonCarpet();
    const m: Record<RoomId, THREE.MeshStandardMaterial> = {
      lobby: new THREE.MeshStandardMaterial({ map: lobbyCarpet(), roughness: 0.95 }),
      tables: new THREE.MeshStandardMaterial({ map: feltBrass(), roughness: 1 }),
      slots: new THREE.MeshStandardMaterial({ map: neon.map, emissiveMap: neon.glow, emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0.55, roughness: 0.95 }),
      arcade: new THREE.MeshStandardMaterial({ map: glossTiles(), roughness: 0.28, metalness: 0.12 }),
    };
    return m;
  }, []);
}

const TILE: Record<RoomId, number> = { lobby: 4, tables: 4, slots: 3, arcade: 3 };

function Floors() {
  const mats = useFloorMats();
  const geos = useMemo(() => {
    const out = {} as Record<RoomId, THREE.PlaneGeometry>;
    for (const id of ROOM_ORDER) {
      const b = ROOMS[id].bounds;
      out[id] = tiledPlane(b.maxX - b.minX, b.maxZ - b.minZ, TILE[id], TILE[id]);
    }
    return out;
  }, []);
  const decals = useMemo(() => {
    const med = new THREE.MeshStandardMaterial({ map: medallion(), transparent: true, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1, depthWrite: false });
    const mk = (base: string, trim: string, roughness: number) => new THREE.MeshStandardMaterial({ map: runner(base, trim), roughness, polygonOffset: true, polygonOffsetFactor: -1 });
    return {
      med,
      lobbyRun: mk("#8a2433", "#f0c866", 0.95),
      tableRun: mk("#7a1f2c", "#f0c866", 0.95),
      slotRun: mk("#2a1560", "#ff8fd1", 0.9),
      arcRun: mk("#0a3a4a", "#7df9ff", 0.4),
    };
  }, []);
  const runnerGeos = useMemo(
    () => ({
      lobby: tiledPlane(2.4, 6.2, 2.4, 4),
      tables: tiledPlane(2.4, 24, 2.4, 4),
      side: tiledPlane(2.4, 24, 2.4, 4),
    }),
    []
  );
  return (
    <>
      {ROOM_ORDER.map((id) => {
        const b = ROOMS[id].bounds;
        return <mesh key={id} geometry={geos[id]} material={mats[id]} rotation-x={-Math.PI / 2} position={[(b.minX + b.maxX) / 2, 0, (b.minZ + b.maxZ) / 2]} />;
      })}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.012, -1]} material={decals.med}>
        <planeGeometry args={[13, 13]} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.011, -6.9]} geometry={runnerGeos.lobby} material={decals.lobbyRun} />
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.011, -22]} geometry={runnerGeos.tables} material={decals.tableRun} />
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-24, 0.011, 0]} geometry={runnerGeos.side} material={decals.slotRun} />
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[24, 0.011, 0]} geometry={runnerGeos.side} material={decals.arcRun} />
    </>
  );
}

/* -------------------------------------------------------------- ceilings */

const CEIL: Record<RoomId, string> = { lobby: "#f0d8a8", tables: "#b98a62", slots: "#6a4aa0", arcade: "#2a8aa4" };

function Ceilings() {
  return (
    <>
      {ROOM_ORDER.map((id) => {
        const r = ROOMS[id];
        const b = r.bounds;
        return (
          <mesh key={id} rotation-x={Math.PI / 2} position={[(b.minX + b.maxX) / 2, r.height, (b.minZ + b.maxZ) / 2]}>
            <planeGeometry args={[b.maxX - b.minX, b.maxZ - b.minZ]} />
            <meshStandardMaterial color={CEIL[id]} roughness={1} side={THREE.DoubleSide} emissive={CEIL[id]} emissiveIntensity={0.12} />
          </mesh>
        );
      })}
    </>
  );
}

/* ----------------------------------------------------------------- walls */

interface Piece {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y0: number;
  y1: number;
  room: RoomId;
}

function buildPieces(): Piece[] {
  const t = WALL_THICKNESS / 2;
  const pieces: Piece[] = WALLS.map((w, i) => ({ id: w.id, minX: w.minX, maxX: w.maxX, minZ: w.minZ, maxZ: w.maxZ, y0: 0, y1: w.height + 0.04 + i * 0.002, room: w.room }));
  for (const d of DOORS) {
    const [cx, cz] = d.center;
    const h = Math.max(ROOMS[d.between[0]].height, ROOMS[d.between[1]].height);
    pieces.push({
      id: "lintel-" + d.id,
      minX: d.axis === "x" ? cx - d.width / 2 : cx - t,
      maxX: d.axis === "x" ? cx + d.width / 2 : cx + t,
      minZ: d.axis === "x" ? cz - t : cz - d.width / 2,
      maxZ: d.axis === "x" ? cz + t : cz + d.width / 2,
      y0: d.height,
      y1: h + 0.04,
      room: d.between[0],
    });
  }
  return pieces;
}

interface Face {
  key: string;
  cx: number;
  cz: number;
  nx: number;
  nz: number;
  len: number;
  room: RoomId;
  H: number;
  yLo: number;
}

function buildFaces(pieces: Piece[]): Face[] {
  const faces: Face[] = [];
  const t = WALL_THICKNESS / 2;
  for (const p of pieces) {
    const sx = p.maxX - p.minX;
    const sz = p.maxZ - p.minZ;
    const alongX = sx > sz;
    const midX = (p.minX + p.maxX) / 2;
    const midZ = (p.minZ + p.maxZ) / 2;
    for (const s of [1, -1]) {
      const px = alongX ? midX : midX + s * (t + 0.6);
      const pz = alongX ? midZ + s * (t + 0.6) : midZ;
      const room = roomAt(px, pz);
      if (!room) continue;
      const rb = ROOMS[room].bounds;
      const a0 = Math.max(alongX ? p.minX : p.minZ, alongX ? rb.minX : rb.minZ);
      const a1 = Math.min(alongX ? p.maxX : p.maxZ, alongX ? rb.maxX : rb.maxZ);
      if (a1 - a0 < 0.05) continue;
      const H = Math.min(ROOMS[room].height, p.y1);
      faces.push({
        key: `${p.id}:${s}`,
        cx: alongX ? (a0 + a1) / 2 : midX + s * t,
        cz: alongX ? midZ + s * t : (a0 + a1) / 2,
        nx: alongX ? 0 : s,
        nz: alongX ? s : 0,
        len: a1 - a0,
        room,
        H,
        yLo: p.y0,
      });
    }
  }
  return faces;
}

const PIECES = buildPieces();
const FACES = buildFaces(PIECES);

function yawOf(nx: number, nz: number) {
  if (nz > 0) return 0;
  if (nz < 0) return Math.PI;
  return nx > 0 ? Math.PI / 2 : -Math.PI / 2;
}

const _fm = new THREE.Matrix4();
const _fq = new THREE.Quaternion();
const _fy = new THREE.Vector3(0, 1, 0);

function plane(w: number, h: number, tw: number, th: number, y: number, z: number, m: THREE.Matrix4, flat = false) {
  const g = tiledPlane(w, h, tw, th);
  if (flat) g.rotateX(-Math.PI / 2);
  g.translate(0, y, z);
  g.applyMatrix4(m);
  return g;
}

/** Bakes every wall face of every room into one geometry per material, so the walls cost a handful of draw calls. */
function bakeWalls() {
  const rooms = {} as Record<RoomId, { wain: THREE.BufferGeometry[]; paper: THREE.BufferGeometry[]; shade: THREE.BufferGeometry[]; floorShade: THREE.BufferGeometry[]; trim: THREE.BufferGeometry[]; glow: THREE.BufferGeometry[] }>;
  for (const id of ROOM_ORDER) rooms[id] = { wain: [], paper: [], shade: [], floorShade: [], trim: [], glow: [] };
  for (const f of FACES) {
    const th = ROOMS[f.room].theme;
    const R = rooms[f.room];
    _fm.compose(new THREE.Vector3(f.cx, 0, f.cz), _fq.setFromAxisAngle(_fy, yawOf(f.nx, f.nz)), new THREE.Vector3(1, 1, 1));
    const m = _fm.clone();
    if (f.H - f.yLo < 0.4) continue;
    const low = f.yLo < 0.5;
    const pLo = Math.max(1.2, f.yLo);
    const pH = f.H - 0.35 - pLo;
    const trimSpecs: BoxSpec[] = [];
    const dark = mix(th.trim, "#1a0c08", 0.62);
    const crown = mix(th.wall, "#1a0c08", 0.35);
    if (low) {
      trimSpecs.push({ p: [0, 0.11, 0.035], s: [f.len, 0.22, 0.07], c: dark });
      trimSpecs.push({ p: [0, 1.15, 0.06], s: [f.len, 0.1, 0.12], c: th.trim });
      R.wain.push(plane(f.len, 1.1, 1.5, 1.1, 0.55, 0.012, m));
      R.floorShade.push(plane(f.len, 0.9, f.len, 0.9, 0.014, 0.45, m, true));
    }
    if (pH > 0.2) R.paper.push(plane(f.len, pH, 2, 2, pLo + pH / 2, 0.01, m));
    trimSpecs.push({ p: [0, f.H - 0.15, 0.08], s: [f.len, 0.3, 0.16], c: crown });
    trimSpecs.push({ p: [0, f.H - 0.33, 0.1], s: [f.len, 0.06, 0.2], c: th.trim });
    const g1 = bakeBoxes(trimSpecs, m);
    if (g1) R.trim.push(g1);
    const g2 = bakeBoxes([{ p: [0, f.H - 0.4, 0.06], s: [f.len, 0.05, 0.05], c: hdr(th.accent, 1.7) }], m);
    if (g2) R.glow.push(g2);
    R.shade.push(plane(f.len, f.H, f.len, f.H, f.H / 2, 0.03, m));
  }
  const out = {} as Record<RoomId, { wain?: THREE.BufferGeometry | null; paper?: THREE.BufferGeometry | null; shade?: THREE.BufferGeometry | null; floorShade?: THREE.BufferGeometry | null; trim?: THREE.BufferGeometry | null; glow?: THREE.BufferGeometry | null }>;
  for (const id of ROOM_ORDER) {
    const R = rooms[id];
    const mg = (a: THREE.BufferGeometry[]) => (a.length ? mergeGeometries(a) : null);
    out[id] = { wain: mg(R.wain), paper: mg(R.paper), shade: mg(R.shade), floorShade: mg(R.floorShade), trim: mg(R.trim), glow: mg(R.glow) };
  }
  return out;
}

function Walls() {
  const baked = useMemo(() => bakeWalls(), []);
  const mats = useMemo(() => {
    const ws = wallShade();
    const fs = floorShade();
    const out = {} as Record<RoomId, { wain: THREE.Material; paper: THREE.Material }>;
    for (const id of ROOM_ORDER) {
      const th = ROOMS[id].theme;
      out[id] = {
        wain: new THREE.MeshStandardMaterial({ map: wainscot(id), roughness: id === "arcade" ? 0.45 : 0.85, side: THREE.DoubleSide }),
        paper: new THREE.MeshStandardMaterial({ map: wallpaper(id, th.wall), roughness: 0.95, side: THREE.DoubleSide }),
      };
    }
    return {
      rooms: out,
      trim: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }),
      glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      shade: new THREE.MeshBasicMaterial({ map: ws, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -1 }),
      floorShade: new THREE.MeshBasicMaterial({ map: fs, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    };
  }, []);
  const bodies = useMemo(() => {
    const m = {} as Record<RoomId, THREE.MeshStandardMaterial>;
    for (const id of ROOM_ORDER) m[id] = new THREE.MeshStandardMaterial({ color: ROOMS[id].theme.wall, roughness: 0.95 });
    return m;
  }, []);
  return (
    <>
      {PIECES.map((p) => (
        <mesh key={p.id} material={bodies[p.room]} position={[(p.minX + p.maxX) / 2, (p.y0 + p.y1) / 2, (p.minZ + p.maxZ) / 2]}>
          <boxGeometry args={[p.maxX - p.minX, p.y1 - p.y0, p.maxZ - p.minZ]} />
        </mesh>
      ))}
      {ROOM_ORDER.map((id) => {
        const b = baked[id];
        return (
          <group key={id}>
            {b.wain && <mesh geometry={b.wain} material={mats.rooms[id].wain} />}
            {b.paper && <mesh geometry={b.paper} material={mats.rooms[id].paper} />}
            {b.trim && <mesh geometry={b.trim} material={mats.trim} />}
            {b.glow && <mesh geometry={b.glow} material={mats.glow} />}
            {b.shade && <mesh geometry={b.shade} material={mats.shade} />}
            {b.floorShade && <mesh geometry={b.floorShade} material={mats.floorShade} />}
          </group>
        );
      })}
    </>
  );
}

/* ----------------------------------------------------------------- doors */

function DoorSide({ door, s, hereRoom, destRoom }: { door: Door; s: number; hereRoom: RoomId; destRoom: RoomId }) {
  const t = WALL_THICKNESS / 2;
  const alongX = door.axis === "x";
  const nx = alongX ? 0 : s;
  const nz = alongX ? s : 0;
  const here = ROOMS[hereRoom].theme;
  const dest = ROOMS[destRoom];
  const accent = dest.theme.accent;
  const W = door.width;
  const H = door.height;
  const labelTex = useMemo(() => label(dest.name.toUpperCase(), accent, { w: 1024, h: 256 }), [dest.name, accent]);
  const arc = (80 * Math.PI) / 180;
  const { std, glow } = useMemo(() => {
    const stone = mix(here.wall, "#000000", 0.12);
    const stoneD = mix(stone, "#000000", 0.25);
    const std: BoxSpec[] = [];
    const glow: BoxSpec[] = [];
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 + 0.3);
      std.push({ p: [x, H / 2, 0.17], s: [0.64, H, 0.34], c: stone });
      std.push({ p: [x, 0.2, 0.2], s: [0.84, 0.4, 0.4], c: stoneD });
      std.push({ p: [x, H - 0.16, 0.2], s: [0.84, 0.32, 0.4], c: stoneD });
      std.push({ p: [x, 1.1, 0.19], s: [0.72, 0.09, 0.38], c: here.trim });
      std.push({ p: [x, 2.4, 0.19], s: [0.72, 0.09, 0.38], c: here.trim });
      glow.push({ p: [x - sx * 0.33, H / 2, 0.2], s: [0.04, H - 0.7, 0.04], c: hdr(accent, 1.6) });
    }
    std.push({ p: [0, H + 0.21, 0.2], s: [W + 1.6, 0.42, 0.4], c: mix(stone, "#000", 0.2) });
    std.push({ p: [0, H + 0.03, 0.2], s: [W + 1.7, 0.06, 0.44], c: here.trim });
    std.push({ p: [0, H + 0.82, 0.22], s: [W + 1.7, 0.08, 0.44], c: here.trim });
    std.push({ p: [0, H + 1.45, 0.14], s: [3.5, 0.9, 0.1], c: "#1a1020" });
    std.push({ p: [0, H + 1.45, 0.1], s: [3.64, 1.04, 0.08], c: here.trim });
    for (const g of neonFrame(3.4, 0.82, accent, 2, 0.035, 0.2)) glow.push({ ...g, p: [g.p[0], g.p[1] + H + 1.45, g.p[2]] });
    return { std, glow };
  }, [here.wall, here.trim, W, H, accent]);
  return (
    <group position={[door.center[0] + nx * t, 0, door.center[1] + nz * t]} rotation={[0, yawOf(nx, nz), 0]}>
      <Boxes specs={std} roughness={0.75} />
      <Boxes specs={glow} glow />
      <mesh position={[0, 1.83, 0.2]} rotation={[0, 0, Math.PI / 2 - arc / 2]}>
        <torusGeometry args={[2.6, 0.07, 6, 28, arc]} />
        <meshStandardMaterial color={here.trim} roughness={0.4} emissive={here.trim} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0, H + 1.47, 0.2]}>
        <planeGeometry args={[3.4, 0.85]} />
        <meshBasicMaterial map={labelTex} transparent toneMapped={false} color={hdr("#ffffff", 1.35)} depthWrite={false} />
      </mesh>
    </group>
  );
}

interface DoorSideInfo {
  door: Door;
  s: number;
  here: RoomId;
  dest: RoomId;
}

const DOOR_SIDES: DoorSideInfo[] = (() => {
  const out: DoorSideInfo[] = [];
  for (const d of DOORS) {
    for (const s of [1, -1]) {
      const alongX = d.axis === "x";
      const here = roomAt(d.center[0] + (alongX ? 0 : s * 1.0), d.center[1] + (alongX ? s * 1.0 : 0));
      if (!here) continue;
      const dest = d.between.find((r) => r !== here);
      if (dest) out.push({ door: d, s, here, dest });
    }
  }
  return out;
})();

const DOOR_HALOS: Item[] = [];
export const DOOR_LANTERNS: LanternItem[] = [];
for (const { door, s, dest } of DOOR_SIDES) {
  const t = WALL_THICKNESS / 2;
  const alongX = door.axis === "x";
  const nx = alongX ? 0 : s;
  const nz = alongX ? s : 0;
  const fx = door.center[0] + nx * (t + 0.3);
  const fz = door.center[1] + nz * (t + 0.3);
  DOOR_HALOS.push({ p: [fx, door.height + 1.45, fz], s: 3.2, c: ROOMS[dest].theme.accent });
  for (const sx of [-1, 1]) {
    const ox = (door.width / 2 + 0.55) * sx;
    DOOR_LANTERNS.push({ p: [fx + (alongX ? ox : 0), door.height + 0.7, fz + (alongX ? 0 : ox)], c: "#ffb347", s: 0.9 });
  }
}

function Doors() {
  return (
    <>
      {DOOR_SIDES.map(({ door, s, here, dest }) => (
        <DoorSide key={door.id + s} door={door} s={s} hereRoom={here} destRoom={dest} />
      ))}
      <Halos items={DOOR_HALOS} k={0.5} />
      {DOORS.map((d) => (
        <group key={d.id} position={[d.center[0], 0, d.center[1]]} rotation={[0, d.axis === "x" ? 0 : Math.PI / 2, 0]}>
          <Glow position={[0, DOOR_HEIGHT - 0.04, 0]} size={[d.width - 0.1, 0.06, 0.34]} color="#ffd9a0" k={1.6} />
          <mesh position={[0, 0.014, 0]}>
            <boxGeometry args={[d.width, 0.03, 0.5]} />
            <meshStandardMaterial color="#e5b64a" roughness={0.4} emissive="#5a3a00" />
          </mesh>
        </group>
      ))}
    </>
  );
}

export default function Shell() {
  return (
    <>
      <Floors />
      <Ceilings />
      <Walls />
      <Doors />
    </>
  );
}
