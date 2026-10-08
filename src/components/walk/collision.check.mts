// Proof script for collision.ts. Run from the repo root:
//   node --experimental-strip-types src/components/walk/collision.check.mts
import { register } from "node:module";

// The source files use extensionless imports (bundler resolution); teach plain node about that.
register(
  "data:text/javascript," +
    encodeURIComponent(`export async function resolve(s, c, n) {
      try { return await n(s, c); } catch (e) {
        if (s.startsWith(".") && !/\\.[mc]?[tj]s$/.test(s)) return n(s + ".ts", c);
        throw e;
      }
    }`),
  import.meta.url
);

const { moveCircle, isValidPosition, nearestValidPosition } = await import("./collision");
const world = await import("./world");
const { WALLS, DOORS, ROOMS, ROOM_ORDER, PLAYER_RADIUS, roomAt } = world;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
}

function overlapsWall(x: number, z: number, r = PLAYER_RADIUS - 1e-6) {
  return WALLS.some((w) => {
    const cx = Math.min(Math.max(x, w.minX), w.maxX);
    const cz = Math.min(Math.max(z, w.minZ), w.maxZ);
    return Math.hypot(x - cx, z - cz) < r;
  });
}

// Deterministic PRNG so runs are reproducible.
let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// 1. No crossing any wall, even at 1 second per frame -------------------------------
{
  let moves = 0;
  let bad = 0;
  let starts = 0;
  const speeds = [4.2, 7]; // walk and sprint, metres per second
  for (const id of ROOM_ORDER) {
    const b = ROOMS[id].bounds;
    for (let gx = b.minX + 0.5; gx <= b.maxX - 0.5; gx += 1.5) {
      for (let gz = b.minZ + 0.5; gz <= b.maxZ - 0.5; gz += 1.5) {
        if (!isValidPosition(gx, gz)) continue;
        starts++;
        for (const dt of [1 / 60, 0.05, 0.25, 1]) {
          let x = gx;
          let z = gz;
          for (let i = 0; i < 40; i++) {
            const a = rand() * Math.PI * 2;
            const v = speeds[i % 2];
            const r = moveCircle(x, z, Math.sin(a) * v * dt, Math.cos(a) * v * dt);
            x = r.x;
            z = r.z;
            moves++;
            if (roomAt(x, z) === null || overlapsWall(x, z)) {
              bad++;
              if (bad < 5) console.log("   escaped to", x.toFixed(2), z.toFixed(2), "from", gx, gz, "dt", dt);
              break;
            }
          }
        }
      }
    }
  }
  check("random walks never cross a wall (dt 1/60, 0.05, 0.25, 1.0s)", bad === 0, `${starts} start points, ${moves} moves, ${bad} escapes`);
}

// Brute force: every start, 72 headings, one enormous 1s sprint step, plus a 30m single step.
{
  let bad = 0;
  let n = 0;
  for (const id of ROOM_ORDER) {
    const b = ROOMS[id].bounds;
    for (let gx = b.minX + 1; gx <= b.maxX - 1; gx += 3) {
      for (let gz = b.minZ + 1; gz <= b.maxZ - 1; gz += 3) {
        if (!isValidPosition(gx, gz)) continue;
        for (let h = 0; h < 72; h++) {
          const a = (h / 72) * Math.PI * 2;
          for (const len of [7, 30]) {
            const r = moveCircle(gx, gz, Math.sin(a) * len, Math.cos(a) * len);
            n++;
            if (roomAt(r.x, r.z) === null || overlapsWall(r.x, r.z)) bad++;
          }
        }
      }
    }
  }
  check("single huge steps (7m and 30m) from every room stay inside", bad === 0, `${n} trials, ${bad} escapes`);
}

// Directly at each wall box from both sides at 1s/frame
{
  let bad = 0;
  let n = 0;
  for (const w of WALLS) {
    const cxm = (w.minX + w.maxX) / 2;
    const czm = (w.minZ + w.maxZ) / 2;
    const horizontal = w.maxX - w.minX > w.maxZ - w.minZ;
    for (const side of [-1, 1]) {
      for (const t of [0.15, 0.5, 0.85]) {
        const px = horizontal ? w.minX + (w.maxX - w.minX) * t : cxm + side * 1.5;
        const pz = horizontal ? czm + side * 1.5 : w.minZ + (w.maxZ - w.minZ) * t;
        if (!isValidPosition(px, pz)) continue;
        const dx = horizontal ? 0 : -side * 7;
        const dz = horizontal ? -side * 7 : 0;
        const r = moveCircle(px, pz, dx, dz);
        n++;
        const crossed = horizontal ? Math.sign(r.z - czm) !== side : Math.sign(r.x - cxm) !== side;
        if (crossed || overlapsWall(r.x, r.z)) bad++;
      }
    }
  }
  check("charging each wall segment head-on at 7m/frame never passes through", bad === 0, `${n} charges, ${bad} failures`);
}

// 2. Doors are walkable ----------------------------------------------------------------
for (const d of DOORS) {
  const along = d.axis === "x" ? [0, 1] : [1, 0]; // direction that crosses the wall
  const lateral = d.axis === "x" ? [1, 0] : [0, 1];
  let allOk = true;
  const notes: string[] = [];
  for (const offset of [0, -1.5, 1.5]) {
    for (const dt of [1 / 60, 1 / 20]) {
      for (const approach of ["straight", "angled"]) {
        // Start 4m before the door, aimed at the door centre (angled: from 2.5m sideways).
        const side = d.id === "lobby-tables" ? 1 : d.id === "lobby-slots" ? 1 : -1; // inside the lobby
        const lat0 = approach === "angled" ? offset + 2.5 : offset;
        let x = d.center[0] + along[0] * side * 4 + lateral[0] * lat0;
        let z = d.center[1] + along[1] * side * 4 + lateral[1] * lat0;
        if (!isValidPosition(x, z)) continue;
        let through = false;
        for (let i = 0; i < 600 && !through; i++) {
          // Steer at the centre of the opening (or at the offset lane) at 4.2 m/s.
          const tx = d.center[0] + lateral[0] * (approach === "angled" ? 0 : offset);
          const tz = d.center[1] + lateral[1] * (approach === "angled" ? 0 : offset);
          // Aim 3m beyond the door on the far side so we keep pushing through it.
          const gx = tx - along[0] * side * 3;
          const gz = tz - along[1] * side * 3;
          const l = Math.hypot(gx - x, gz - z) || 1;
          const r = moveCircle(x, z, ((gx - x) / l) * 4.2 * dt, ((gz - z) / l) * 4.2 * dt);
          x = r.x;
          z = r.z;
          const crossed = (x - d.center[0]) * along[0] * -side + (z - d.center[1]) * along[1] * -side;
          if (crossed > 2.5) through = true;
        }
        if (!through) {
          allOk = false;
          notes.push(`offset ${offset} ${approach} dt ${dt.toFixed(3)} stuck at ${x.toFixed(2)},${z.toFixed(2)}`);
        }
      }
    }
  }
  check(`walk through door ${d.id} (centre, +-1.5m lanes, straight and angled, 60fps and 20fps)`, allOk, notes.join("; "));
}

// 3. Sliding ---------------------------------------------------------------------------
{
  // Lobby south wall inner face is z = 10 - 0.2 = 9.8. Walk diagonally (+x, +z) into it.
  let x = 2;
  let z = 8;
  const start = { x, z };
  let minZGap = Infinity;
  for (let i = 0; i < 90; i++) {
    const r = moveCircle(x, z, (4.2 / 60) * Math.SQRT1_2, (4.2 / 60) * Math.SQRT1_2);
    x = r.x;
    z = r.z;
    minZGap = Math.min(minZGap, 9.8 - PLAYER_RADIUS - z);
  }
  const expectedX = start.x + 90 * (4.2 / 60) * Math.SQRT1_2;
  check(
    "diagonal into south wall slides along it (z pinned at wall, x keeps advancing)",
    Math.abs(z - (9.8 - PLAYER_RADIUS)) < 1e-6 && x > start.x + 2 && minZGap > -1e-6,
    `end x=${x.toFixed(2)} z=${z.toFixed(3)} (full-speed x would be ${expectedX.toFixed(2)}, wall-parallel component kept)`
  );
  // Slide speed along the wall should equal the wall-parallel component of the input.
  const r = moveCircle(2, 9.45, 0.1, 0.1);
  check("slide keeps the full parallel component for one step", Math.abs(r.x - 2.1) < 1e-6 && Math.abs(r.z - 9.45) < 1e-6, `x=${r.x.toFixed(3)} z=${r.z.toFixed(3)} normal=(${r.nx.toFixed(2)},${r.nz.toFixed(2)})`);

  // Slide round a station collider (blackjack at -12,-20 r1.5): walk at its edge.
  const c = moveCircle(-12, -17.5, 0, -2); // aimed straight at its centre from the south
  check("station collider blocks dead-on and does not eject the player", Math.hypot(c.x + 12, c.z + 20) >= 1.5 + PLAYER_RADIUS - 1e-6, `stopped ${Math.hypot(c.x + 12, c.z + 20).toFixed(3)}m from centre`);
}

// 4. Teleport validation helper ---------------------------------------------------------
{
  const inWall = nearestValidPosition(0, -10); // inside the lobby-tables doorway line? that is a door, so valid
  const wallSpot = nearestValidPosition(-6, -10); // centre of a wall box
  const pillar = nearestValidPosition(-8, -6);
  const outside = nearestValidPosition(0, 50);
  check("nearestValidPosition fixes points in walls, pillars and outside the building", isValidPosition(inWall.x, inWall.z) && isValidPosition(wallSpot.x, wallSpot.z) && isValidPosition(pillar.x, pillar.z) && isValidPosition(outside.x, outside.z), `wall->(${wallSpot.x.toFixed(2)},${wallSpot.z.toFixed(2)}) pillar->(${pillar.x.toFixed(2)},${pillar.z.toFixed(2)}) outside->(${outside.x.toFixed(2)},${outside.z.toFixed(2)})`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
