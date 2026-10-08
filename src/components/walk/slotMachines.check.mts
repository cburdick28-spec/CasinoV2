// Proof script for slotMachines.ts. Run from the repo root:
//   node --experimental-strip-types src/components/walk/slotMachines.check.mts
import { register } from "node:module";
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
import type { SlotMachineState } from "./slotMachines";
const {
  FACE_STEP, FACE_SYMBOLS, STOP_TIMES, TAU, SETTLE_HOLD, createSlotMachine, evaluate, requestSpin, rollOutcome,
  updateSlotMachine, reelAngleAt,
} = await import("./slotMachines");

let fails = 0;
const ok = (c: boolean, msg: string) => { if (!c) { fails++; console.log("FAIL", msg); } };

// seeded rng
const mk = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

// 1. Outcome generator: forced wins always win, normal rolls never win.
{
  const rng = mk(1);
  let wins = 0, losses = 0;
  for (let i = 0; i < 20000; i++) {
    const w = rollOutcome(true, rng); ok(w.win, "forced roll must win"); wins += w.win ? 1 : 0;
    const l = rollOutcome(false, rng); ok(!l.win, "unforced roll must lose"); losses += l.win ? 0 : 1;
  }
  console.log(`rolls: ${wins} forced wins, ${losses} clean losses`);
  ok(evaluate(["SEVEN", "WILD", "SEVEN"]).win, "wild substitutes");
  ok(!evaluate(["SEVEN", "WILD", "BAR"]).win, "wild does not fix a mismatch");
}

// 2. Simulate a spin at various frame rates; everything must be identical and exact.
function run(fps: number | "jitter", rigged: boolean, seed: number) {
  const rng = mk(seed);
  const m: SlotMachineState = createSlotMachine("t", rng);
  m.upcomingWin = rigged;
  requestSpin(m, rng);
  const target = m.reels.map((r) => r.face);
  const phases = new Set<string>();
  const stopSeen: (number | null)[] = [null, null, null];
  const prev = m.reels.map((r) => r.angle);
  let t = 0, mono = true;
  const jr = mk(99);
  while (m.phase !== "IDLE" && t < 20) {
    const dt = fps === "jitter" ? 0.004 + jr() * 0.12 : 1 / fps;
    updateSlotMachine(m, dt); t += dt;
    phases.add(m.phase);
    m.reels.forEach((r, i) => {
      if (m.phase !== "IDLE" && r.angle < prev[i] - 1e-9) mono = false;
      prev[i] = r.angle;
      if (stopSeen[i] === null && Math.abs(r.angle - r.endAngle) < 1e-9) stopSeen[i] = t;
    });
  }
  return { m, target, phases, stopSeen, mono };
}

for (const fps of [15, 30, 60, 144, 240, "jitter"] as const) {
  for (const rigged of [true, false]) {
    const { m, target, phases, stopSeen, mono } = run(fps, rigged, 7);
    // Final angle sits exactly on the rolled face.
    m.reels.forEach((r, i) => {
      const d = Math.abs((((r.angle - target[i] * FACE_STEP) % TAU) + TAU) % TAU);
      ok(d < 1e-9 || Math.abs(d - TAU) < 1e-9, `fps ${fps}: reel ${i} resting angle off target by ${d}`);
    });
    ok(m.result!.win === rigged, `fps ${fps}: rigged=${rigged} but win=${m.result!.win}`);
    ok(["SPINNING", "DECELERATING", "SETTLED", "IDLE"].every((p) => phases.has(p)), `fps ${fps}: missed a phase ${[...phases]}`);
    ok(mono, `fps ${fps}: a reel moved backwards`);
    const frame = fps === "jitter" ? 0.13 : 1 / fps;
    stopSeen.forEach((s, i) => ok(s !== null && s >= STOP_TIMES[i] - 1e-9 && s <= STOP_TIMES[i] + frame + 1e-9, `fps ${fps}: reel ${i} stopped at ${s} (want ${STOP_TIMES[i]})`));
  }
}

// 3. Pure function of time: sampling at different rates gives the same value at a shared instant.
{
  const rng = mk(3); const m = createSlotMachine("t", rng); requestSpin(m, rng);
  const a = reelAngleAt(m.reels[1], 1.2), b = reelAngleAt(m.reels[1], 1.2);
  ok(a === b, "angle must be deterministic in t");
  // Slope is continuous at the start of deceleration (no visible jolt).
  const r = m.reels[2], t0 = STOP_TIMES[2] - 0.6, e = 1e-5;
  const before = (reelAngleAt(r, t0) - reelAngleAt(r, t0 - e)) / e;
  const after = (reelAngleAt(r, t0 + e) - reelAngleAt(r, t0)) / e;
  ok(Math.abs(before - after) < 0.01, `slope jump at decel start: ${before} vs ${after}`);
  ok(Math.abs((reelAngleAt(r, 3.0) - reelAngleAt(r, 3.0 - e)) / e) < 0.01, "reel must be at rest on arrival");
}

const step4 = (mm: SlotMachineState, secs: number) => { for (let x = 0; x < secs; x += 0.25) updateSlotMachine(mm, 0.25); };
// 4. A second spin is refused mid-spin, accepted after settling; upcomingWin is one-shot.
{
  const rng = mk(11); const m = createSlotMachine("t", rng);
  m.upcomingWin = true;
  ok(requestSpin(m, rng), "first spin accepted");
  ok(!m.upcomingWin, "upcomingWin must clear after use");
  updateSlotMachine(m, 0.5);
  ok(!requestSpin(m, rng), "spin refused while spinning");
  step4(m, 2.75);
  ok(m.phase === "SETTLED", `expected SETTLED got ${m.phase}`);
  ok(requestSpin(m, rng), "spin accepted when settled");
  step4(m, 3.0 + SETTLE_HOLD + 0.25);
  ok(m.phase === "IDLE", "returns to IDLE after the hold");
  m.isRigged = true;
  for (let i = 0; i < 20; i++) { requestSpin(m, rng); ok(m.result!.win, "isRigged wins every spin"); step4(m, 8); }
}
console.log(FACE_SYMBOLS.join(","), fails === 0 ? "\nALL SLOT CHECKS PASS" : `\n${fails} FAILURES`);
process.exit(fails ? 1 : 0);
