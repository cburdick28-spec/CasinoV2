import { PLAYER_RADIUS, PROPS, ROOM_ORDER, ROOMS, STATIONS, WALLS, roomAt } from "./world";

/**
 * Pure circle-vs-world collision for the walkable casino. No React, no three.
 *
 * The player is a circle on the x/z plane. Walls are axis aligned boxes, stations and
 * props are circles. Movement is sub-stepped (never more than MAX_STEP per sub-step, well
 * under the 0.4m wall thickness and the player radius) and every sub-step is resolved by
 * pushing the circle out of whatever it overlaps along the contact normal, which makes it
 * slide along surfaces and roll smoothly around door jambs.
 */

const MAX_STEP = 0.08;
const MAX_SUBSTEPS = 400; // 32m of travel in one call; anything more is clamped
const RESOLVE_PASSES = 4;
const EPS = 1e-6;

interface CircleCollider {
  x: number;
  z: number;
  r: number;
}

const CIRCLES: CircleCollider[] = [
  ...STATIONS.map((s) => ({ x: s.position[0], z: s.position[1], r: s.colliderRadius })),
  ...PROPS.map((p) => ({ x: p.position[0], z: p.position[1], r: p.colliderRadius })),
];

export interface MoveResult {
  x: number;
  z: number;
  /** True when anything pushed the player back during this move. */
  hit: boolean;
  /**
   * Summed unit contact normals (pointing away from the obstacle) over the move, then
   * normalised. Use it to strip the velocity component driving into the surface.
   * Zero vector when nothing was hit.
   */
  nx: number;
  nz: number;
}

interface Push {
  x: number;
  z: number;
  hit: boolean;
  nx: number;
  nz: number;
}

/** One resolution pass: push (p) out of every overlapping collider. */
function resolve(p: Push, radius: number): boolean {
  let moved = false;

  for (const w of WALLS) {
    const cx = p.x < w.minX ? w.minX : p.x > w.maxX ? w.maxX : p.x;
    const cz = p.z < w.minZ ? w.minZ : p.z > w.maxZ ? w.maxZ : p.z;
    const ddx = p.x - cx;
    const ddz = p.z - cz;
    const d2 = ddx * ddx + ddz * ddz;
    if (d2 >= radius * radius) continue;

    let nx: number;
    let nz: number;
    let push: number;
    if (d2 > EPS) {
      const d = Math.sqrt(d2);
      nx = ddx / d;
      nz = ddz / d;
      push = radius - d;
    } else {
      // Centre is inside the box (only possible after a teleport): exit by the shortest way.
      const left = p.x - w.minX;
      const right = w.maxX - p.x;
      const up = p.z - w.minZ;
      const down = w.maxZ - p.z;
      const m = Math.min(left, right, up, down);
      nx = 0;
      nz = 0;
      if (m === left) nx = -1;
      else if (m === right) nx = 1;
      else if (m === up) nz = -1;
      else nz = 1;
      push = m + radius;
    }
    p.x += nx * push;
    p.z += nz * push;
    p.nx += nx;
    p.nz += nz;
    p.hit = true;
    moved = true;
  }

  for (const c of CIRCLES) {
    const ddx = p.x - c.x;
    const ddz = p.z - c.z;
    const min = radius + c.r;
    const d2 = ddx * ddx + ddz * ddz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2);
    const nx = d > EPS ? ddx / d : 1;
    const nz = d > EPS ? ddz / d : 0;
    const push = min - d;
    p.x += nx * push;
    p.z += nz * push;
    p.nx += nx;
    p.nz += nz;
    p.hit = true;
    moved = true;
  }
  return moved;
}

/**
 * Move a circle from (x, z) by (dx, dz), sliding along anything in the way.
 * Safe for any step size, including a whole second at sprint speed.
 */
export function moveCircle(x: number, z: number, dx: number, dz: number, radius = PLAYER_RADIUS): MoveResult {
  const dist = Math.hypot(dx, dz);
  const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(dist / MAX_STEP)));
  const sx = dx / steps;
  const sz = dz / steps;
  const p: Push = { x, z, hit: false, nx: 0, nz: 0 };

  for (let i = 0; i < steps; i++) {
    p.x += sx;
    p.z += sz;
    for (let pass = 0; pass < RESOLVE_PASSES; pass++) {
      if (!resolve(p, radius)) break;
    }
  }

  const len = Math.hypot(p.nx, p.nz);
  return {
    x: p.x,
    z: p.z,
    hit: p.hit,
    nx: len > EPS ? p.nx / len : 0,
    nz: len > EPS ? p.nz / len : 0,
  };
}

/** True when a circle at (x, z) is inside the building and overlaps no wall or collider. */
export function isValidPosition(x: number, z: number, radius = PLAYER_RADIUS): boolean {
  if (roomAt(x, z) === null) return false;
  const probe: Push = { x, z, hit: false, nx: 0, nz: 0 };
  // resolve() mutates the probe; any push at all means the spot is blocked.
  resolve(probe, radius);
  return !probe.hit;
}

/** Nearest valid standing point to (x, z), found by an expanding ring search. */
export function nearestValidPosition(x: number, z: number, radius = PLAYER_RADIUS): { x: number; z: number } {
  if (isValidPosition(x, z, radius)) return { x, z };
  const step = 0.25;
  for (let ring = 1; ring <= 160; ring++) {
    const r = ring * step;
    const n = Math.max(8, Math.ceil((2 * Math.PI * r) / step));
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const pz = z + Math.sin(a) * r;
      if (!isValidPosition(px, pz, radius)) continue;
      const d = Math.hypot(px - x, pz - z);
      if (d < bestD) {
        bestD = d;
        best = { x: px, z: pz };
      }
    }
    if (best) return best;
  }
  const lobby = ROOMS[ROOM_ORDER[0]].bounds;
  return { x: (lobby.minX + lobby.maxX) / 2, z: lobby.maxZ - 3 };
}

/** Slug of the closest station whose interact radius contains (x, z), else null. */
export function nearestStation(x: number, z: number): string | null {
  let best: string | null = null;
  let bestD = Infinity;
  for (const s of STATIONS) {
    const d = Math.hypot(x - s.position[0], z - s.position[1]);
    if (d <= s.interactRadius && d < bestD) {
      bestD = d;
      best = s.slug;
    }
  }
  return best;
}
