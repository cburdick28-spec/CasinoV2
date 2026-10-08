"use client";

import * as THREE from "three";
import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { blob, dotSprite, label } from "./textures";
import type { BarrelSpot, BenchSpot, CrateSpot, LanternSpot, PlantSpot, PoufSpot, RopeSpot, SofaSpot } from "./placements";

/* ------------------------------------------------------------ basics */

const hdrCache = new Map<string, THREE.Color>();
/** Over-bright colour for emissive-looking basic materials (toneMapped=false, feeds the bloom). */
export function hdr(hex: string, k = 1.8): THREE.Color {
  const key = hex + k;
  let c = hdrCache.get(key);
  if (!c) {
    c = new THREE.Color(hex).multiplyScalar(k);
    hdrCache.set(key, c);
  }
  return c;
}

export type Vec3 = [number, number, number];
export interface Item {
  p: Vec3;
  s?: number | Vec3;
  rx?: number;
  ry?: number;
  rz?: number;
  c?: THREE.ColorRepresentation;
}

const _o = new THREE.Object3D();
const _c = new THREE.Color();

export function fill(m: THREE.InstancedMesh | null, items: Item[]) {
  if (!m) return;
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    _o.position.set(it.p[0], it.p[1], it.p[2]);
    _o.rotation.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0);
    const s = it.s ?? 1;
    if (typeof s === "number") _o.scale.setScalar(s);
    else _o.scale.set(s[0], s[1], s[2]);
    _o.updateMatrix();
    m.setMatrixAt(i, _o.matrix);
    if (it.c !== undefined) {
      _c.set(it.c);
      m.setColorAt(i, _c);
    }
  }
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  // real frustum culling for the whole batch (instances are room-local), padded for halo quads
  if (m.geometry.attributes.position) {
    m.computeBoundingSphere();
    if (m.boundingSphere) m.boundingSphere.radius += 3;
    m.frustumCulled = true;
  } else {
    m.frustumCulled = false;
  }
}

/** One draw call for many copies of the geometry/material given as children. */
export function Inst({ items, children }: { items: Item[]; children: ReactNode }) {
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={(m) => fill(m, items)} args={[undefined, undefined, items.length]}>
      {children}
    </instancedMesh>
  );
}

/** Plane whose UVs tile every tw x th metres. */
export function tiledPlane(w: number, h: number, tw: number, th: number) {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w) / tw, (uv.getY(i) * h) / th);
  return g;
}

/* ------------------------------------------------------------ boxes */

export interface BoxSpec {
  p: Vec3;
  s: Vec3;
  c: THREE.ColorRepresentation;
  rx?: number;
  ry?: number;
  rz?: number;
}

const _bm = new THREE.Matrix4();
const _be = new THREE.Euler();
const _bq = new THREE.Quaternion();
const _bp = new THREE.Vector3();
const _bs = new THREE.Vector3();
const _bc = new THREE.Color();

/** Bakes many coloured boxes into one geometry (vertex colours), optionally under a parent transform. */
export function bakeBoxes(specs: BoxSpec[], parent?: THREE.Matrix4): THREE.BufferGeometry | null {
  const parts: THREE.BufferGeometry[] = [];
  for (const b of specs) {
    const g = new THREE.BoxGeometry(1, 1, 1);
    _be.set(b.rx ?? 0, b.ry ?? 0, b.rz ?? 0);
    _bq.setFromEuler(_be);
    _bm.compose(_bp.set(b.p[0], b.p[1], b.p[2]), _bq, _bs.set(b.s[0], b.s[1], b.s[2]));
    g.applyMatrix4(_bm);
    if (parent) g.applyMatrix4(parent);
    _bc.set(b.c);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = _bc.r;
      arr[i * 3 + 1] = _bc.g;
      arr[i * 3 + 2] = _bc.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    parts.push(g);
  }
  return parts.length ? mergeGeometries(parts) : null;
}

/** One draw call for a set of boxes. `glow` boxes use unlit HDR vertex colours (feed the bloom). */
export function Boxes({ specs, glow = false, roughness = 0.65 }: { specs: BoxSpec[]; glow?: boolean; roughness?: number }) {
  const geo = useMemo(() => bakeBoxes(specs), [specs]);
  if (!geo) return null;
  return (
    <mesh geometry={geo}>
      {glow ? <meshBasicMaterial vertexColors toneMapped={false} /> : <meshStandardMaterial vertexColors roughness={roughness} />}
    </mesh>
  );
}

export const GOLDC = "#f0c15a";
export const WOOD = "#6a3a22";
export const DARKWOOD = "#3a2417";

/** Rectangular neon frame as four thin glow boxes (local, centred on the origin, facing +z). */
export function neonFrame(w: number, h: number, color: string, k = 2, t = 0.035, z = 0): BoxSpec[] {
  const c = hdr(color, k);
  return [
    { p: [0, h / 2 - t, z], s: [w - 2 * t, t, 0.03], c },
    { p: [0, -h / 2 + t, z], s: [w - 2 * t, t, 0.03], c },
    { p: [-w / 2 + t, 0, z], s: [t, h - 2 * t, 0.03], c },
    { p: [w / 2 - t, 0, z], s: [t, h - 2 * t, 0.03], c },
  ];
}

/* ------------------------------------------------------------ halos */

const HALO_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vCol;
varying float vPh;
void main(){
  vUv = uv;
  #ifdef USE_INSTANCING_COLOR
    vCol = instanceColor;
  #else
    vCol = vec3(1.0);
  #endif
  mat4 im = instanceMatrix;
  float s = length(im[0].xyz);
  vPh = dot(im[3].xyz, vec3(12.9898, 78.233, 37.719));
  vec4 mv = modelViewMatrix * im * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * s;
  gl_Position = projectionMatrix * mv;
}`;
const HALO_FRAG = /* glsl */ `
uniform float uTime;
uniform float uK;
varying vec2 vUv;
varying vec3 vCol;
varying float vPh;
void main(){
  float d = length(vUv - 0.5) * 2.0;
  float a = pow(clamp(1.0 - d, 0.0, 1.0), 2.2);
  float f = 0.9 + 0.1 * sin(uTime * 2.3 + vPh);
  gl_FragColor = vec4(vCol * a * uK * f, 1.0);
}`;

/** Soft additive billboards: the "bloom halo" that makes emissive props read as lit. */
export function Halos({ items, k = 0.9 }: { items: Item[]; k?: number }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uK: { value: k } },
        vertexShader: HALO_VERT,
        fragmentShader: HALO_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [k]
  );
  const ref = useRef<THREE.ShaderMaterial>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.uniforms.uTime.value = clock.elapsedTime;
  });
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={(m) => fill(m, items)} args={[undefined, undefined, items.length]} renderOrder={5}>
      <planeGeometry args={[2, 2]} />
      <primitive object={mat} ref={ref} attach="material" />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------ blobs */

/** Fake contact shadows: dark radial blobs laid on the floor. */
export function Blobs({ spots }: { spots: { x: number; z: number; r: number; y?: number }[] }) {
  const items = useMemo<Item[]>(() => spots.map((s) => ({ p: [s.x, s.y ?? 0.014, s.z], s: s.r * 2, rx: -Math.PI / 2 })), [spots]);
  const map = useMemo(() => blob(), []);
  return (
    <Inst items={items}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-2} toneMapped={false} />
    </Inst>
  );
}

/* ------------------------------------------------------------ plants */

const GREENS = ["#5fae4e", "#7cc15a", "#3f8f45", "#a2cf62", "#4aa05a", "#8fb94a"];
const LEAF_OFFS: [number, number, number, number][] = [
  [0, 1.0, 0, 0.58],
  [0.3, 0.72, 0.14, 0.4],
  [-0.28, 1.38, -0.1, 0.42],
  [-0.22, 0.7, 0.26, 0.36],
  [0.18, 1.42, 0.22, 0.32],
];

export function Plants({ spots }: { spots: PlantSpot[] }) {
  const { pots, leaves, trunks } = useMemo(() => {
    const pots: Item[] = [];
    const leaves: Item[] = [];
    const trunks: Item[] = [];
    spots.forEach((sp, i) => {
      const s = sp.s ?? 1;
      pots.push({ p: [sp.x, 0.26 * s, sp.z], s, c: sp.pot ?? "#c4623a" });
      trunks.push({ p: [sp.x, 0.7 * s, sp.z], s: [s, s, s] });
      // three silhouettes: round bush, tall slender palm, low wide fern
      const v = i % 3;
      const spreadXZ = v === 1 ? 0.55 : v === 2 ? 1.5 : 1;
      const stretchY = v === 1 ? 1.45 : v === 2 ? 0.6 : 1;
      LEAF_OFFS.forEach(([ox, oy, oz, r], j) => {
        const rr = r * s * (1 + 0.08 * ((i + j) % 3));
        leaves.push({
          p: [sp.x + ox * s * spreadXZ, oy * s * stretchY + 0.2 * s, sp.z + oz * s * spreadXZ],
          s: v === 1 ? [rr * 0.7, rr * 1.5, rr * 0.7] : v === 2 ? [rr * 1.25, rr * 0.55, rr * 1.25] : rr,
          ry: i + j,
          rx: j * 0.4,
          c: GREENS[(i * 2 + j) % GREENS.length],
        });
      });
    });
    return { pots, leaves, trunks };
  }, [spots]);
  return (
    <>
      <Inst items={pots}>
        <cylinderGeometry args={[0.36, 0.26, 0.52, 10]} />
        <meshStandardMaterial roughness={0.8} />
      </Inst>
      <Inst items={trunks}>
        <cylinderGeometry args={[0.04, 0.06, 0.8, 5]} />
        <meshStandardMaterial color="#5a3a22" roughness={0.9} />
      </Inst>
      <Inst items={leaves}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial roughness={0.85} flatShading />
      </Inst>
      <Blobs spots={spots.map((p) => ({ x: p.x, z: p.z, r: 0.85 * (p.s ?? 1) }))} />
    </>
  );
}

/* ---------------------------------------------------------- lanterns */

let lanternBody: THREE.BufferGeometry | null = null;
/** Bars, cap and base of the cage lantern merged into one geometry with vertex colours. */
function lanternBodyGeo() {
  if (lanternBody) return lanternBody;
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, col: string) => {
    const c = new THREE.Color(col);
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
    parts.push(g);
  };
  for (const [ox, oz] of [
    [0.16, 0.16],
    [-0.16, 0.16],
    [0.16, -0.16],
    [-0.16, -0.16],
  ])
    add(new THREE.BoxGeometry(0.04, 0.46, 0.04).translate(ox, 0, oz), "#3a2417");
  add(new THREE.ConeGeometry(0.28, 0.2, 4).rotateY(Math.PI / 4).translate(0, 0.33, 0), "#7a3f22");
  add(new THREE.BoxGeometry(0.22, 0.06, 0.22).translate(0, -0.24, 0), "#3a2417");
  lanternBody = mergeGeometries(parts);
  return lanternBody!;
}

export interface LanternItem {
  p: Vec3; // centre of the glowing core
  c?: string;
  post?: number; // standing lantern: post height from the floor
  cord?: number; // hanging lantern: cord length above the lantern
  s?: number;
  ry?: number;
}

/** Bruno-style cage lanterns: glowing core, dark frame, cap, halo. */
export function Lanterns({ items, halo = 1.5 }: { items: LanternItem[]; halo?: number }) {
  const d = useMemo(() => {
    const core: Item[] = [];
    const body: Item[] = [];
    const posts: Item[] = [];
    const cords: Item[] = [];
    const halos: Item[] = [];
    for (const l of items) {
      const s = l.s ?? 1;
      const [x, y, z] = l.p;
      const col = l.c ?? "#ffb347";
      core.push({ p: l.p, s, c: hdr(col, 2.1) });
      body.push({ p: l.p, s, ry: l.ry ?? 0 });
      if (l.post) {
        const h = y - 0.27 * s;
        posts.push({ p: [x, h / 2, z], s: [1, h, 1] });
      }
      if (l.cord) cords.push({ p: [x, y + 0.43 * s + l.cord / 2, z], s: [1, l.cord, 1] });
      halos.push({ p: [x, y, z], s: halo * s, c: col });
    }
    return { core, body, posts, cords, halos };
  }, [items, halo]);
  return (
    <>
      <Inst items={d.core}>
        <boxGeometry args={[0.3, 0.4, 0.3]} />
        <meshBasicMaterial toneMapped={false} />
      </Inst>
      <Inst items={d.body}>
        <primitive object={lanternBodyGeo()} attach="geometry" />
        <meshStandardMaterial vertexColors roughness={0.75} />
      </Inst>
      <Inst items={d.posts}>
        <boxGeometry args={[0.13, 1, 0.13]} />
        <meshStandardMaterial color="#5b3a8a" roughness={0.7} />
      </Inst>
      <Inst items={d.cords}>
        <cylinderGeometry args={[0.012, 0.012, 1, 4]} />
        <meshStandardMaterial color="#2a1a10" />
      </Inst>
      <Halos items={d.halos} k={0.85} />
      <Blobs spots={items.filter((l) => l.post).map((l) => ({ x: l.p[0], z: l.p[2], r: 0.5 }))} />
    </>
  );
}

export function floorLanterns(spots: LanternSpot[]): LanternItem[] {
  return spots.map((l) => ({ p: [l.x, l.post + 0.25, l.z], c: l.c, post: l.post }));
}

/* ------------------------------------------------------- small props */

export function Crates({ spots }: { spots: CrateSpot[] }) {
  const { boxes, bands } = useMemo(() => {
    const boxes: Item[] = [];
    const bands: Item[] = [];
    for (const c of spots) {
      const n = c.stack ?? 1;
      for (let i = 0; i < n; i++) {
        const ox = i === 0 ? 0 : 0.12;
        const y = c.s * (0.5 + i * 1.0);
        boxes.push({ p: [c.x + ox, y, c.z], s: c.s, ry: c.ry + i * 0.35, c: i % 2 ? "#d6a063" : c.c });
        bands.push({ p: [c.x + ox, y, c.z], s: c.s * 1.02, ry: c.ry + i * 0.35 });
      }
    }
    return { boxes, bands };
  }, [spots]);
  return (
    <>
      <Inst items={boxes}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.85} />
      </Inst>
      <Inst items={bands}>
        <boxGeometry args={[1.04, 0.12, 1.04]} />
        <meshStandardMaterial color="#3a2417" roughness={0.8} />
      </Inst>
      <Blobs spots={spots.map((c) => ({ x: c.x, z: c.z, r: c.s * 1.2 }))} />
    </>
  );
}

export function Benches({ spots }: { spots: BenchSpot[] }) {
  return (
    <>
      {spots.map((b, i) => (
        <BenchOne key={i} b={b} />
      ))}
      <Blobs spots={spots.map((b) => ({ x: b.x, z: b.z, r: b.len * 0.62 }))} />
    </>
  );
}

function BenchOne({ b }: { b: BenchSpot }) {
  const specs = useMemo<BoxSpec[]>(
    () => [
      { p: [0, 0.44, 0], s: [b.len, 0.16, 0.6], c: b.c },
      { p: [0, 0.7, -0.27], s: [b.len, 0.5, 0.12], c: b.c, rx: -0.15 },
      { p: [0, 0.2, 0], s: [b.len - 0.2, 0.36, 0.5], c: DARKWOOD },
      { p: [-(b.len / 2 + 0.04), 0.5, -0.05], s: [0.1, 0.62, 0.7], c: GOLDC },
      { p: [b.len / 2 + 0.04, 0.5, -0.05], s: [0.1, 0.62, 0.7], c: GOLDC },
    ],
    [b]
  );
  return (
    <group position={[b.x, 0, b.z]} rotation={[0, b.ry, 0]}>
      <Boxes specs={specs} roughness={0.75} />
    </group>
  );
}

function SofaOne({ b }: { b: SofaSpot }) {
  const specs = useMemo<BoxSpec[]>(
    () => [
      { p: [0, 0.25, 0], s: [b.len, 0.4, 0.9], c: "#7a4a2a" },
      { p: [0, 0.55, 0.08], s: [b.len - 0.5, 0.3, 0.7], c: b.c },
      { p: [0, 0.85, -0.34], s: [b.len, 0.7, 0.22], c: b.c },
      { p: [-(b.len / 2 - 0.14), 0.62, 0], s: [0.28, 0.6, 0.9], c: b.c },
      { p: [b.len / 2 - 0.14, 0.62, 0], s: [0.28, 0.6, 0.9], c: b.c },
      { p: [b.len / 2 - 0.9, 0.78, 0.0], s: [0.4, 0.4, 0.14], c: "#f4c95d", ry: 0.4, rz: 0.2 },
    ],
    [b]
  );
  return (
    <group position={[b.x, 0, b.z]} rotation={[0, b.ry, 0]}>
      <Boxes specs={specs} roughness={0.9} />
    </group>
  );
}

export function Sofas({ spots }: { spots: SofaSpot[] }) {
  return (
    <>
      {spots.map((b, i) => (
        <SofaOne key={i} b={b} />
      ))}
      <Blobs spots={spots.map((b) => ({ x: b.x, z: b.z, r: b.len * 0.65 }))} />
    </>
  );
}

/** A thin glowing bar (neon tube / cove light). */
export function Glow({ position, size, color, k = 2.0, rotation }: { position: Vec3; size: Vec3; color: string; k?: number; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={hdr(color, k)} toneMapped={false} />
    </mesh>
  );
}

/** Round café table with a glossy top. */
export function RoundTable({ x, z, r, c }: { x: number; z: number; r: number; c: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[r, r, 0.07, 14]} />
        <meshStandardMaterial color={c} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.7, 6]} />
        <meshStandardMaterial color="#f0c15a" roughness={0.45} emissive="#3a2600" />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[r * 0.55, r * 0.6, 0.05, 12]} />
        <meshStandardMaterial color="#f0c15a" roughness={0.45} emissive="#3a2600" />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------- bars */

const BOTTLES = ["#3fae6b", "#e0883a", "#c4283a", "#e8d27a", "#4a7bd0", "#b06ad0"];

/** Bar counter with a back shelf of bottles. Local +z faces the customers, long axis is x. */
export function Bar({ x, z, ry, len, kind, accent }: { x: number; z: number; ry: number; len: number; kind: "bar" | "cage"; accent: string }) {
  const { bottles, stools, std, glow } = useMemo(() => {
    const bottles: Item[] = [];
    const stools: Item[] = [];
    const n = Math.floor(len / 0.32);
    for (let i = 0; i < n; i++) {
      const bx = -len / 2 + 0.25 + (i * (len - 0.5)) / Math.max(1, n - 1);
      for (const [y, off] of [
        [1.38, 0],
        [1.98, 1],
      ])
        bottles.push({ p: [bx, y + 0.17, -0.95], s: [1, 0.85 + ((i + off) % 3) * 0.12, 1], c: BOTTLES[(i * 2 + off) % BOTTLES.length] });
    }
    const sn = Math.max(2, Math.floor(len / 1.3));
    for (let i = 0; i < sn; i++) stools.push({ p: [-len / 2 + 0.7 + (i * (len - 1.4)) / Math.max(1, sn - 1), 0.55, 0.95] });
    const std: BoxSpec[] = [
      { p: [0, 0.55, 0], s: [len, 1.1, 0.7], c: WOOD },
      { p: [0, 0.55, 0.36], s: [len - 0.3, 0.8, 0.04], c: "#8a4f2e" },
      { p: [0, 1.13, 0.05], s: [len + 0.2, 0.1, 0.95], c: "#2a2230" },
      { p: [0, 0.3, 0.52], s: [len, 0.07, 0.07], c: GOLDC },
      { p: [0, 1.4, -0.95], s: [len, 0.07, 0.4], c: WOOD },
      { p: [0, 2.0, -0.95], s: [len, 0.07, 0.4], c: WOOD },
      { p: [0, 1.4, -1.13], s: [len, 1.5, 0.06], c: "#4a2a18" },
      { p: [0, 0.7, -0.95], s: [len, 1.4, 0.4], c: "#5a3320" },
    ];
    const gc = hdr("#ffb347", 2.0);
    const glow: BoxSpec[] = [
      { p: [0, 0.06, 0.4], s: [len - 0.2, 0.04, 0.03], c: hdr(accent, 1.8) },
      { p: [0, 1.34, -0.74], s: [len - 0.2, 0.03, 0.03], c: gc },
      { p: [0, 1.94, -0.74], s: [len - 0.2, 0.03, 0.03], c: gc },
      { p: [0, 2.52, -0.95], s: [len, 0.05, 0.05], c: hdr(accent, 1.8) },
    ];
    if (kind === "cage") {
      for (let i = 0; i < Math.floor(len / 0.25); i++) std.push({ p: [-len / 2 + 0.15 + i * 0.25, 1.65, 0.1], s: [0.025, 1.0, 0.025], c: GOLDC });
      std.push({ p: [0, 2.18, 0.1], s: [len, 0.08, 0.1], c: GOLDC });
      std.push({ p: [0, 1.19, 0.1], s: [len, 0.06, 0.1], c: GOLDC });
    }
    return { bottles, stools, std, glow };
  }, [len, kind, accent]);
  return (
    <group position={[x, 0, z]} rotation={[0, ry, 0]}>
      <Boxes specs={std} />
      <Boxes specs={glow} glow />
      <Inst items={bottles}>
        <cylinderGeometry args={[0.055, 0.075, 0.34, 7]} />
        <meshStandardMaterial roughness={0.2} emissive="#222" />
      </Inst>
      <Inst items={stools}>
        <cylinderGeometry args={[0.24, 0.2, 0.1, 10]} />
        <meshStandardMaterial color="#b4423f" roughness={0.6} />
      </Inst>
      <Blobs spots={[{ x: 0, z: 0.1, r: len * 0.62 }]} />
    </group>
  );
}

/* ------------------------------------------------------------ ropes */

/** Velvet rope lines on brass stanchions. */
export function Ropes({ spots, rope = "#c4283a" }: { spots: RopeSpot[]; rope?: string }) {
  const { posts, balls, geo } = useMemo(() => {
    const posts: Item[] = [];
    const balls: Item[] = [];
    const tubes: THREE.BufferGeometry[] = [];
    for (const r of spots) {
      for (let k = 0; k <= r.n; k++) {
        const x = r.a[0] + ((r.b[0] - r.a[0]) * k) / r.n;
        const z = r.a[1] + ((r.b[1] - r.a[1]) * k) / r.n;
        posts.push({ p: [x, 0.5, z] });
        balls.push({ p: [x, 1.04, z] });
        if (k < r.n) {
          const x2 = r.a[0] + ((r.b[0] - r.a[0]) * (k + 1)) / r.n;
          const z2 = r.a[1] + ((r.b[1] - r.a[1]) * (k + 1)) / r.n;
          const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 0.96, z), new THREE.Vector3((x + x2) / 2, 0.55, (z + z2) / 2), new THREE.Vector3(x2, 0.96, z2));
          tubes.push(new THREE.TubeGeometry(curve, 10, 0.03, 6, false));
        }
      }
    }
    return { posts, balls, geo: tubes.length ? mergeGeometries(tubes) : null };
  }, [spots]);
  return (
    <>
      <Inst items={posts}>
        <cylinderGeometry args={[0.035, 0.05, 1.0, 8]} />
        <meshStandardMaterial color="#f0c15a" roughness={0.4} emissive="#4a3000" />
      </Inst>
      <Inst items={posts.map((p) => ({ p: [p.p[0], 0.03, p.p[2]] as Vec3 }))}>
        <cylinderGeometry args={[0.2, 0.22, 0.06, 12]} />
        <meshStandardMaterial color="#f0c15a" roughness={0.4} emissive="#4a3000" />
      </Inst>
      <Inst items={balls}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial color="#f0c15a" roughness={0.4} emissive="#4a3000" />
      </Inst>
      {geo && (
        <mesh geometry={geo}>
          <meshStandardMaterial color={rope} roughness={0.8} emissive={rope} emissiveIntensity={0.15} />
        </mesh>
      )}
    </>
  );
}

/* ------------------------------------------------------- wall frames */

export function Frame({ position, ry, w, h, texture, lit = true, frame = "#e6b04f" }: { position: Vec3; ry: number; w: number; h: number; texture: THREE.Texture; lit?: boolean; frame?: string }) {
  const lw = Math.min(w * 0.7, 1.4);
  const { std, glow } = useMemo(() => {
    const std: BoxSpec[] = [
      { p: [0, 0, 0.03], s: [w + 0.24, h + 0.24, 0.07], c: frame },
      { p: [0, 0, 0.07], s: [w + 0.06, h + 0.06, 0.04], c: "#2a1a10" },
    ];
    if (lit) std.push({ p: [0, h / 2 + 0.3, 0.2], s: [lw, 0.06, 0.14], c: DARKWOOD });
    const glow: BoxSpec[] = lit ? [{ p: [0, h / 2 + 0.265, 0.2], s: [lw - 0.1, 0.02, 0.08], c: hdr("#ffd9a0", 2.0) }] : [];
    return { std, glow };
  }, [w, h, lit, lw, frame]);
  return (
    <group position={position} rotation={[0, ry, 0]}>
      <Boxes specs={std} roughness={0.5} />
      <Boxes specs={glow} glow />
      <mesh position={[0, 0, 0.095]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.8} emissive="#ffffff" emissiveMap={texture} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------- chandelier */

export function Chandelier({ position, radius = 1.6, bulbs = 12, color = "#ffd9a0", tiers = 2, drop = 1.2 }: { position: Vec3; radius?: number; bulbs?: number; color?: string; tiers?: number; drop?: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (g.current) g.current.rotation.y = clock.elapsedTime * 0.06;
  });
  const parts = useMemo(() => {
    const bulbI: Item[] = [];
    const crystals: Item[] = [];
    const halos: Item[] = [];
    for (let t = 0; t < tiers; t++) {
      const r = radius * (1 - t * 0.4);
      const y = -t * 0.55;
      const n = Math.max(6, Math.round(bulbs * (1 - t * 0.35)));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + t * 0.3;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        bulbI.push({ p: [x, y + 0.2, z], s: 0.9 - t * 0.15 });
        crystals.push({ p: [x * 0.98, y - 0.22 - (i % 2) * 0.12, z * 0.98], s: [0.5, 1.0 + (i % 3) * 0.3, 0.5], ry: a });
      }
    }
    crystals.push({ p: [0, -tiers * 0.55 - 0.1, 0], s: [1.6, 2.6, 1.6] });
    return { bulbI, crystals, halos };
  }, [radius, bulbs, tiers]);
  const halos = useMemo<Item[]>(() => {
    const out: Item[] = [{ p: [position[0], position[1] - 0.3, position[2]], s: radius * 2.4, c: color }];
    return out;
  }, [position, radius, color]);
  return (
    <>
      <group position={position}>
        <mesh position={[0, drop / 2 + 0.2, 0]}>
          <cylinderGeometry args={[0.025, 0.025, drop, 5]} />
          <meshStandardMaterial color="#3a2417" />
        </mesh>
        <group ref={g}>
          {Array.from({ length: tiers }, (_, t) => (
            <mesh key={t} position={[0, -t * 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[radius * (1 - t * 0.4), 0.07, 6, 28]} />
              <meshStandardMaterial color="#f0c15a" roughness={0.4} emissive="#5a3a00" />
            </mesh>
          ))}
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.1, 0.18, 0.9, 8]} />
            <meshStandardMaterial color="#f0c15a" roughness={0.4} emissive="#5a3a00" />
          </mesh>
          <Inst items={parts.bulbI}>
            <sphereGeometry args={[0.1, 8, 6]} />
            <meshBasicMaterial color={hdr(color, 2.4)} toneMapped={false} />
          </Inst>
          <Inst items={parts.crystals}>
            <octahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color="#fff2d6" roughness={0.15} emissive="#ffe0a0" emissiveIntensity={0.55} flatShading />
          </Inst>
        </group>
      </group>
      <Halos items={halos} k={0.7} />
    </>
  );
}

/* ----------------------------------------------------------- sparkles */

/** Drifting golden sparkles rising around a point. No allocation per frame. */
export function Sparkles({ position, count = 60, radius = 2.4, height = 4, color = "#ffe08a", size = 0.14 }: { position: Vec3; count?: number; radius?: number; height?: number; color?: string; size?: number }) {
  const ref = useRef<THREE.BufferAttribute>(null);
  const seed = useMemo(() => {
    const a = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const t = (i + 1) * 12.9898;
      const f = (n: number) => {
        const v = Math.sin(t * n) * 43758.5453;
        return v - Math.floor(v);
      };
      a[i * 4] = f(1) * Math.PI * 2;
      a[i * 4 + 1] = 0.3 + f(2) * radius;
      a[i * 4 + 2] = f(3);
      a[i * 4 + 3] = 0.08 + f(4) * 0.14;
    }
    return a;
  }, [count, radius]);
  const pos = useMemo(() => new Float32Array(count * 3), [count]);
  const map = useMemo(() => dotSprite(), []);
  useFrame(({ clock }) => {
    const at = ref.current;
    if (!at) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const ph = (seed[i * 4 + 2] + t * seed[i * 4 + 3]) % 1;
      const a = seed[i * 4] + t * 0.25 + ph * 2;
      const r = seed[i * 4 + 1] * (0.6 + 0.4 * Math.sin(ph * Math.PI));
      at.setXYZ(i, Math.cos(a) * r, ph * height, Math.sin(a) * r);
    }
    at.needsUpdate = true;
  });
  return (
    <points position={position} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute ref={ref} attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial map={map} color={hdr(color, 2.0)} size={size} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
}

/* -------------------------------------------------------- wall pieces */

/** Lantern + bracket items for lanterns mounted on a wall. `ry` is the yaw of the wall normal (lantern faces out). */
export function wallLanternItems(items: { x: number; y: number; z: number; ry: number; c?: string }[]): { lanterns: LanternItem[]; brackets: Item[] } {
  const lanterns: LanternItem[] = [];
  const brackets: Item[] = [];
  for (const l of items) {
    const nx = Math.sin(l.ry);
    const nz = Math.cos(l.ry);
    lanterns.push({ p: [l.x + nx * 0.3, l.y, l.z + nz * 0.3], c: l.c, ry: l.ry, s: 1.05 });
    brackets.push({ p: [l.x + nx * 0.14, l.y - 0.05, l.z + nz * 0.14], ry: l.ry });
  }
  return { lanterns, brackets };
}

export function Brackets({ items }: { items: Item[] }) {
  return (
    <Inst items={items}>
      <boxGeometry args={[0.07, 0.07, 0.3]} />
      <meshStandardMaterial color="#3a2417" roughness={0.8} />
    </Inst>
  );
}

/** Glowing wall sign: lettering on a dark plate with a neon border. Local +z faces out of the wall. */
export function SignBoard({ position, ry, w, h, text, color, border, k = 1.3 }: { position: Vec3; ry: number; w: number; h: number; text: string; color: string; border?: string; k?: number }) {
  const map = useMemo(() => label(text, color, { w: 1024, h: Math.max(128, Math.round((1024 * h) / w)) }), [text, color, w, h]);
  const b = border ?? color;
  const std = useMemo<BoxSpec[]>(
    () => [
      { p: [0, 0, 0.04], s: [w + 0.2, h + 0.2, 0.08], c: "#e6b04f" },
      { p: [0, 0, 0.085], s: [w, h, 0.04], c: "#160d1c" },
    ],
    [w, h]
  );
  const glow = useMemo(() => neonFrame(w - 0.1, h - 0.1, b, 2, 0.035, 0.12), [w, h, b]);
  return (
    <group position={position} rotation={[0, ry, 0]}>
      <Boxes specs={std} roughness={0.5} />
      <Boxes specs={glow} glow />
      <mesh position={[0, 0, 0.115]}>
        <planeGeometry args={[w - 0.1, h - 0.1]} />
        <meshBasicMaterial map={map} transparent toneMapped={false} color={hdr("#ffffff", k)} depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------------------------------------------------------- more props */

export function Poufs({ spots }: { spots: PoufSpot[] }) {
  const { body, top } = useMemo(() => {
    const body: Item[] = spots.map((p) => ({ p: [p.x, 0.22, p.z], s: [p.r / 0.45, 1, p.r / 0.45], c: p.c }));
    const top: Item[] = spots.map((p) => ({ p: [p.x, 0.46, p.z], s: [p.r / 0.45, 1, p.r / 0.45], c: p.c }));
    return { body, top };
  }, [spots]);
  return (
    <>
      <Inst items={body}>
        <cylinderGeometry args={[0.45, 0.5, 0.44, 12]} />
        <meshStandardMaterial roughness={0.85} />
      </Inst>
      <Inst items={top}>
        <sphereGeometry args={[0.4, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial roughness={0.85} />
      </Inst>
      <Blobs spots={spots.map((p) => ({ x: p.x, z: p.z, r: p.r * 1.9 }))} />
    </>
  );
}

export function Barrels({ spots }: { spots: BarrelSpot[] }) {
  const { body, bands, lids } = useMemo(() => {
    const body: Item[] = spots.map((b, i) => ({ p: [b.x, 0.45 * b.s, b.z], s: b.s, ry: i, c: i % 2 ? "#a9663a" : "#c98a4c" }));
    const bands: Item[] = [];
    spots.forEach((b, i) => {
      for (const y of [0.15, 0.75]) bands.push({ p: [b.x, y * b.s, b.z], s: [b.s * (y < 0.4 ? 0.93 : 0.93), b.s, b.s * 0.93], ry: i, rx: Math.PI / 2 });
    });
    const lids: Item[] = spots.map((b) => ({ p: [b.x, 0.9 * b.s, b.z], s: b.s }));
    return { body, bands, lids };
  }, [spots]);
  return (
    <>
      <Inst items={body}>
        <cylinderGeometry args={[0.38, 0.38, 0.9, 12]} />
        <meshStandardMaterial roughness={0.8} />
      </Inst>
      <Inst items={bands}>
        <torusGeometry args={[0.395, 0.025, 4, 14]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.6} />
      </Inst>
      <Inst items={lids}>
        <cylinderGeometry args={[0.34, 0.34, 0.04, 12]} />
        <meshStandardMaterial color="#6a3a22" roughness={0.7} />
      </Inst>
      <Blobs spots={spots.map((b) => ({ x: b.x, z: b.z, r: b.s * 0.9 }))} />
    </>
  );
}

/** Scattered paper confetti / petals lying on the floor, like the fallen leaves in the reference. */
export function Confetti({ bounds, count, colors, seed = 1, margin = 1.2 }: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; count: number; colors: string[]; seed?: number; margin?: number }) {
  const items = useMemo<Item[]>(() => {
    let s = seed * 9301 + 49297;
    const rnd = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    const out: Item[] = [];
    for (let i = 0; i < count; i++) {
      const x = bounds.minX + margin + rnd() * (bounds.maxX - bounds.minX - 2 * margin);
      const z = bounds.minZ + margin + rnd() * (bounds.maxZ - bounds.minZ - 2 * margin);
      out.push({ p: [x, 0.022 + rnd() * 0.004, z], rx: -Math.PI / 2, rz: rnd() * Math.PI * 2, s: [0.1 + rnd() * 0.12, 0.06 + rnd() * 0.08, 1], c: colors[i % colors.length] });
    }
    return out;
  }, [bounds, count, colors, seed, margin]);
  return (
    <Inst items={items}>
      <planeGeometry args={[1, 1]} />
      <meshStandardMaterial roughness={0.9} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-3} />
    </Inst>
  );
}
