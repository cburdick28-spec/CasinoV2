"use client";

/**
 * Geometry kit. Every station is authored as lots of small chunky parts (rounded boxes,
 * cylinders, spheres...) which are baked into a handful of merged, vertex-coloured
 * geometries. That keeps each station at a few draw calls while still looking hand-built.
 *
 * Layers (each one is one draw call, materials are shared across the whole floor):
 *   body  lit painterly surfaces
 *   glow  emissive details (unlit, bright enough to bloom)
 *   a / b emissive bulbs that blink in alternation (one shared material each)
 *   scr   emissive screens that shimmer slightly (one shared material)
 */
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  type ColorRepresentation,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Vec3 = [number, number, number];
export type Layer = "body" | "glow" | "a" | "b" | "scr";
export const LAYERS: Layer[] = ["body", "glow", "a", "b", "scr"];

export interface PartOpts {
  rot?: Vec3;
  scale?: Vec3;
  layer?: Layer;
  /** Brightness multiplier for emissive layers (values above 1 feed the bloom). */
  i?: number;
  seg?: number;
}

/** The shared palette: warm, confident, one saturated accent per object. */
export const C = {
  cream: "#f6e3c0",
  paper: "#fff6e2",
  ink: "#2a1a2e",
  night: "#241633",
  plum: "#4b2f6b",
  wood: "#8a5a3c",
  woodDark: "#5a3624",
  orange: "#f2a65a",
  tangerine: "#ff8a3d",
  red: "#e0483b",
  crimson: "#b8283a",
  pink: "#ff7eb6",
  gold: "#ffc94a",
  goldDeep: "#d99a2b",
  lemon: "#ffe27a",
  teal: "#2fb7a6",
  cyan: "#5de6ff",
  blue: "#3d6fe0",
  navy: "#1f3f87",
  green: "#2f9e6a",
  felt: "#1f7a52",
  lime: "#9be564",
  violet: "#8b5cf6",
  white: "#ffffff",
  steel: "#aab4c4",
  dark: "#2b2430",
} as const;

/* ------------------------------ shared materials ------------------------------ */

export const mats = {
  body: new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.68,
    metalness: 0.04,
    emissive: new Color("#241810"),
    emissiveIntensity: 1,
  }),
  glow: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  a: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  b: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  scr: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};

/* ------------------------------ kit builder ------------------------------ */

const tmpM = new Matrix4();
const tmpQ = new Quaternion();
const tmpE = new Euler();
const tmpP = new Vector3();
const tmpS = new Vector3();
const tmpC = new Color();

export type Built = Partial<Record<Layer, BufferGeometry>>;

export class Kit {
  private lists: Record<Layer, BufferGeometry[]> = { body: [], glow: [], a: [], b: [], scr: [] };
  private base = new Matrix4();
  private stack: Matrix4[] = [];

  /** Run `fn` with every part offset/rotated/scaled by this transform (nestable). */
  at(pos: Vec3, rot: Vec3 | null, scale: number | Vec3 | null, fn: () => void) {
    this.stack.push(this.base.clone());
    const s: Vec3 = scale == null ? [1, 1, 1] : typeof scale === "number" ? [scale, scale, scale] : scale;
    tmpE.set(rot ? rot[0] : 0, rot ? rot[1] : 0, rot ? rot[2] : 0);
    tmpQ.setFromEuler(tmpE);
    tmpM.compose(tmpP.set(pos[0], pos[1], pos[2]), tmpQ, tmpS.set(s[0], s[1], s[2]));
    this.base.multiply(tmpM);
    fn();
    this.base = this.stack.pop() as Matrix4;
    return this;
  }

  add(geo: BufferGeometry, color: ColorRepresentation, pos: Vec3 = [0, 0, 0], o: PartOpts = {}) {
    const layer = o.layer ?? "body";
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    geo.dispose();
    if (o.rot || o.scale) {
      tmpE.set(o.rot ? o.rot[0] : 0, o.rot ? o.rot[1] : 0, o.rot ? o.rot[2] : 0);
      tmpQ.setFromEuler(tmpE);
      const s = o.scale ?? [1, 1, 1];
      tmpM.compose(tmpP.set(pos[0], pos[1], pos[2]), tmpQ, tmpS.set(s[0], s[1], s[2]));
    } else {
      tmpM.makeTranslation(pos[0], pos[1], pos[2]);
    }
    tmpM.premultiply(this.base);
    g.applyMatrix4(tmpM);
    g.deleteAttribute("uv");
    const n = g.getAttribute("position").count;
    tmpC.set(color);
    const k = layer === "body" ? 1 : (o.i ?? 1.5);
    const arr = new Float32Array(n * 3);
    for (let v = 0; v < n; v++) {
      arr[v * 3] = tmpC.r * k;
      arr[v * 3 + 1] = tmpC.g * k;
      arr[v * 3 + 2] = tmpC.b * k;
    }
    g.setAttribute("color", new Float32BufferAttribute(arr, 3));
    this.lists[layer].push(g);
    return this;
  }

  box(w: number, h: number, d: number, color: ColorRepresentation, pos: Vec3, o: PartOpts & { r?: number } = {}) {
    const r = o.r ? Math.min(o.r, Math.min(w, h, d) / 2 - 0.0005) : 0;
    return this.add(r > 0 ? new RoundedBoxGeometry(w, h, d, Math.max(w, h, d) < 0.25 ? 1 : 2, r) : new BoxGeometry(w, h, d), color, pos, o);
  }

  cyl(rt: number, rb: number, h: number, color: ColorRepresentation, pos: Vec3, o: PartOpts = {}) {
    return this.add(new CylinderGeometry(rt, rb, h, o.seg ?? 20, 1), color, pos, o);
  }

  /** Cylinder arc/wedge; thetaStart/thetaLength in radians (x = r sin t, z = r cos t). */
  wedge(r: number, h: number, t0: number, t1: number, color: ColorRepresentation, pos: Vec3, o: PartOpts = {}) {
    return this.add(new CylinderGeometry(r, r, h, o.seg ?? 16, 1, false, t0, t1), color, pos, o);
  }

  sph(r: number, color: ColorRepresentation, pos: Vec3, o: PartOpts = {}) {
    return this.add(new SphereGeometry(r, o.seg ?? 14, Math.max(6, Math.round((o.seg ?? 14) * 0.6))), color, pos, o);
  }

  cone(r: number, h: number, color: ColorRepresentation, pos: Vec3, o: PartOpts = {}) {
    return this.add(new ConeGeometry(r, h, o.seg ?? 16, 1), color, pos, o);
  }

  /** Torus lying in the XY plane (rotate by [PI/2,0,0] to lay it flat). */
  tor(R: number, r: number, color: ColorRepresentation, pos: Vec3, o: PartOpts & { arc?: number } = {}) {
    return this.add(new TorusGeometry(R, r, 8, o.seg ?? 32, o.arc ?? Math.PI * 2), color, pos, o);
  }

  build(): Built {
    const out: Built = {};
    for (const l of LAYERS) {
      const list = this.lists[l];
      if (list.length) {
        const m = mergeGeometries(list, false);
        if (m) {
          m.computeBoundingSphere();
          out[l] = m;
        }
        list.forEach((g) => g.dispose());
      }
    }
    return out;
  }
}

const cache = new Map<string, Built>();
/** Build once per key for the lifetime of the page. */
export function kitCache(key: string, fn: (k: Kit) => void): Built {
  let b = cache.get(key);
  if (!b) {
    const k = new Kit();
    fn(k);
    b = k.build();
    cache.set(key, b);
  }
  return b;
}

/** Renders every layer of a built kit as shared-material meshes. */
export function KitMeshes({ built, position, rotation, scale }: { built: Built; position?: Vec3; rotation?: Vec3; scale?: number | Vec3 }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {LAYERS.map((l) => (built[l] ? <mesh key={l} geometry={built[l]} material={mats[l]} /> : null))}
    </group>
  );
}

/* ------------------------------ reusable parts ------------------------------ */

const lighten = (c: ColorRepresentation, a: number) => "#" + new Color(c).lerp(new Color("#ffffff"), a).getHexString();
export const shade = (c: ColorRepresentation, a: number) => "#" + new Color(c).lerp(new Color("#000000"), a).getHexString();
export { lighten };

/** Card suit pip, drawn in the XY plane facing +z, height about `s`. */
export function pip(k: Kit, kind: "h" | "s" | "d" | "c", s: number, color: ColorRepresentation, o: PartOpts = {}) {
  const f: Vec3 = [1, 1, 0.3];
  const seg = 8;
  const L = o.layer;
  const I = o.i;
  const O = (extra: PartOpts): PartOpts => ({ layer: L, i: I, seg, ...extra });
  if (kind === "h" || kind === "s") {
    const flip = kind === "s";
    k.at([0, 0, 0], flip ? [0, 0, Math.PI] : null, null, () => {
      k.sph(0.27 * s, color, [-0.2 * s, 0.1 * s, 0], O({ scale: f }));
      k.sph(0.27 * s, color, [0.2 * s, 0.1 * s, 0], O({ scale: f }));
      k.cone(0.45 * s, 0.7 * s, color, [0, -0.12 * s, 0], O({ rot: [0, 0, Math.PI], scale: f }));
    });
    if (flip) k.cone(0.14 * s, 0.4 * s, color, [0, -0.42 * s, 0], O({ scale: f }));
  } else if (kind === "d") {
    k.box(0.6 * s, 0.6 * s, 0.2 * s, color, [0, 0, 0], O({ rot: [0, 0, Math.PI / 4], scale: [0.8, 1.15, 1] }));
  } else {
    k.sph(0.24 * s, color, [0, 0.22 * s, 0], O({ scale: f }));
    k.sph(0.24 * s, color, [-0.22 * s, -0.08 * s, 0], O({ scale: f }));
    k.sph(0.24 * s, color, [0.22 * s, -0.08 * s, 0], O({ scale: f }));
    k.cone(0.14 * s, 0.5 * s, color, [0, -0.3 * s, 0], O({ scale: f }));
  }
}

/** A playing card lying flat on y = `y` (top face at y + 0.006). */
export function flatCard(k: Kit, x: number, y: number, z: number, rotY: number, suit: "h" | "s" | "d" | "c" | "back", back: ColorRepresentation = C.crimson, size = 1) {
  k.at([x, y, z], [0, rotY, 0], size, () => {
    k.box(0.1, 0.006, 0.14, C.paper, [0, 0.003, 0], { r: 0.0025 });
    if (suit === "back") {
      k.box(0.082, 0.002, 0.122, back, [0, 0.0066, 0]);
      k.box(0.05, 0.002, 0.09, lighten(back, 0.25), [0, 0.0078, 0], { rot: [0, Math.PI / 4, 0], scale: [0.7, 1, 0.7] });
    } else {
      k.at([0, 0.0068, 0], [-Math.PI / 2, 0, 0], null, () => pip(k, suit, 0.06, suit === "h" || suit === "d" ? C.red : C.ink));
    }
  });
}

/** A standing (upright) oversized card facing +z with big suit pips. */
export function bigCard(k: Kit, w: number, h: number, suit: "h" | "s" | "d" | "c", back = false) {
  k.box(w, h, 0.035, C.paper, [0, 0, 0], { r: 0.02 });
  const red = suit === "h" || suit === "d";
  if (back) return;
  k.box(w * 0.88, h * 0.9, 0.01, red ? lighten(C.red, 0.82) : lighten(C.ink, 0.88), [0, 0, 0.02]);
  k.at([0, 0, 0.03], null, null, () => pip(k, suit, h * 0.42, red ? C.red : C.ink));
  k.at([-w * 0.32, h * 0.36, 0.03], null, null, () => pip(k, suit, h * 0.1, red ? C.red : C.ink));
  k.at([w * 0.32, -h * 0.36, 0.03], [0, 0, Math.PI], null, () => pip(k, suit, h * 0.1, red ? C.red : C.ink));
}

/** A stack of chips with a lighter top disc. Radius 0.05, 0.014 per chip. */
export function chipStack(k: Kit, x: number, y: number, z: number, colors: ColorRepresentation[], r = 0.05) {
  colors.forEach((c, i) => {
    const yy = y + 0.007 + i * 0.0145;
    k.cyl(r, r, 0.0142, c, [x, yy, z], { seg: 10 });
    k.cyl(r * 1.015, r * 1.015, 0.004, C.paper, [x, yy, z], { seg: 10 });
    k.cyl(r * 0.62, r * 0.62, 0.0148, lighten(c, 0.28), [x, yy, z], { seg: 8 });
  });
}

/** Flat ring marking on a table (gold betting circle). */
export function flatRing(k: Kit, x: number, y: number, z: number, R: number, color: ColorRepresentation, w = 0.01, o: PartOpts = {}) {
  k.tor(R, w, color, [x, y, z], { rot: [Math.PI / 2, 0, 0], scale: [1, 1, 0.25], seg: 28, ...o });
}

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[-1, 1], [1, -1]],
  3: [[-1, 1], [0, 0], [1, -1]],
  4: [[-1, 1], [1, 1], [-1, -1], [1, -1]],
  5: [[-1, 1], [1, 1], [0, 0], [-1, -1], [1, -1]],
  6: [[-1, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [1, -1]],
};
const FACES: { n: number; rot: Vec3 }[] = [
  { n: 1, rot: [0, 0, 0] },
  { n: 6, rot: [0, Math.PI, 0] },
  { n: 3, rot: [0, Math.PI / 2, 0] },
  { n: 4, rot: [0, -Math.PI / 2, 0] },
  { n: 2, rot: [-Math.PI / 2, 0, 0] },
  { n: 5, rot: [Math.PI / 2, 0, 0] },
];

/** A die of edge length `s`, centred on the origin. */
export function die(k: Kit, s: number, body: ColorRepresentation, pipColor: ColorRepresentation) {
  k.box(s, s, s, body, [0, 0, 0], { r: s * 0.16 });
  for (const f of FACES) {
    k.at([0, 0, 0], f.rot, null, () => {
      for (const [px, py] of PIPS[f.n]) {
        k.sph(s * 0.085, f.n === 1 ? C.red : pipColor, [px * s * 0.26, py * s * 0.26, s * 0.5], { seg: 8, scale: [1, 1, 0.35] });
      }
    });
  }
}

/** Rounded padded rail around an elliptical table, as a flat torus. */
export function railOval(k: Kit, rx: number, rz: number, y: number, tube: number, color: ColorRepresentation, arc = Math.PI * 2) {
  k.tor(1, tube, color, [0, y, 0], { rot: [Math.PI / 2, 0, 0], scale: [rx, rz, 1], arc, seg: 40 });
}

export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Debug: max xz radius per cached kit (local space). */
export function kitBounds() {
  const out: Record<string, number> = {};
  cache.forEach((b, key) => {
    let m = 0;
    for (const l of LAYERS) {
      const g = b[l];
      if (!g) continue;
      const p = g.getAttribute("position");
      for (let i = 0; i < p.count; i++) m = Math.max(m, Math.hypot(p.getX(i), p.getZ(i)));
    }
    out[key] = +m.toFixed(2);
    let tri = 0;
    for (const l of LAYERS) {
      const g = b[l];
      if (g) tri += g.getAttribute("position").count / 3;
    }
    out["tri:" + key] = tri;
  });
  return out;
}
