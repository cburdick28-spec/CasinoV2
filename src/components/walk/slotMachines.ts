/**
 * Slot machine reel simulation. No React, no three.js: a plain state machine that the
 * 3D component reads every frame, so it can be proven in node (slotMachines.check.mts).
 *
 * Phases (machine level):  IDLE -> SPINNING -> DECELERATING -> SETTLED -> (hold) -> IDLE
 *
 * Frame-rate independence: each reel's angle is a PURE FUNCTION of the time elapsed since
 * the spin began. Nothing is integrated per frame, so 15 fps and 144 fps land on exactly
 * the same angle at exactly the same moment; a slow frame just samples the curve later.
 *
 * Fairness hook for "Who's Cheating?": the outcome (which face each reel lands on) is rolled
 * BEFORE the first frame of the spin and the decelerating reels are aimed at it. `upcomingWin`
 * (one shot, consumed by the next spin) and `isRigged` (persistent) force a winning roll.
 */

export const TAU = Math.PI * 2;

export type SymbolId = "CHERRY" | "LEMON" | "MELON" | "STAR" | "DIAMOND" | "SEVEN";

/** What is printed on each of the 8 faces of a reel, in order around the cylinder. */
export const FACE_SYMBOLS: readonly SymbolId[] = ["SEVEN", "CHERRY", "LEMON", "MELON", "STAR", "DIAMOND", "CHERRY", "LEMON"];
export const FACE_COUNT = FACE_SYMBOLS.length;
/** Rotation.x that brings face `i` to the front is exactly i * FACE_STEP (see the reel kit). */
export const FACE_STEP = TAU / FACE_COUNT;

/** The symbols the server (/api/games/slots) sends back, and how they map onto reel art. */
const EMOJI_TO_SYMBOL: Record<string, SymbolId> = {
  "\u{1F352}": "CHERRY",
  "\u{1F34B}": "LEMON",
  "\u{1F349}": "MELON",
  "\u2B50": "STAR",
  "\u{1F48E}": "DIAMOND",
  "7\u20E3": "SEVEN",
};
export function symbolFromServer(id: string): SymbolId {
  return EMOJI_TO_SYMBOL[id.replace(/\uFE0F/g, "")] ?? "CHERRY";
}

/** Seconds after the lever pull at which each reel has come to rest. */
export const STOP_TIMES: readonly [number, number, number] = [1.5, 2.2, 3.0];
/** Spin speed in radians per second (about 2.2 turns a second). */
export const SPIN_SPEED = 14;
/** Linear ramp from standstill to full speed. */
export const SPIN_UP = 0.25;
/** How long each reel spends slowing down into its stop. */
export const DECEL_TIME = 0.6;
/** Seconds the result stays on show before the machine returns to IDLE. */
export const SETTLE_HOLD = 2.4;

export type SlotPhase = "IDLE" | "SPINNING" | "DECELERATING" | "SETTLED";

export interface SlotResult {
  faces: [number, number, number];
  symbols: [SymbolId, SymbolId, SymbolId];
  win: boolean;
  /** The matching symbol on a win. */
  symbol: SymbolId | null;
  /** Total returned to the player (stake included), 0 on a loss. Only known for server rounds. */
  payout: number;
  jackpotWon: number;
  source: "server" | "local";
}

/** What POST /api/games/slots returns. */
export interface ServerOutcome {
  reels: string[];
  won: boolean;
  payout: number;
  jackpotWon: number;
}

export interface ReelState {
  /** Current rotation.x in radians. */
  angle: number;
  /** Where the reel sat when the spin began (normalised to 0..TAU). */
  startAngle: number;
  /** Unwrapped final angle, congruent to the target face. */
  endAngle: number;
  /** Spin-curve angle at the moment deceleration begins. */
  decelFrom: number;
  stopAt: number;
  face: number;
}

export interface SlotMachineState {
  id: string;
  phase: SlotPhase;
  /** Persistent cheat flag: every spin is pre-rolled as a win. */
  isRigged: boolean;
  /** One-shot cheat flag: the next spin is pre-rolled as a win, then clears. */
  upcomingWin: boolean;
  /** Seconds since the current spin began (only meaningful while not IDLE). */
  elapsed: number;
  reels: [ReelState, ReelState, ReelState];
  /** Pre-rolled before the visuals start; null until the first spin. */
  result: SlotResult | null;
  /** Bumps on every spin so listeners can detect a new round. */
  round: number;
}

export type Rng = () => number;

/** Symbol weights, same as the server, for the local fallback roll. */
const WEIGHTS: [SymbolId, number][] = [
  ["CHERRY", 30],
  ["LEMON", 25],
  ["MELON", 20],
  ["STAR", 12],
  ["DIAMOND", 8],
  ["SEVEN", 4],
];

/** Same rules as the server: three of a kind, or the first two / last two matching, wins. */
export function evaluate(symbols: readonly SymbolId[]): { win: boolean; symbol: SymbolId | null } {
  if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) return { win: true, symbol: symbols[0] };
  if (symbols[0] === symbols[1] || symbols[1] === symbols[2]) return { win: true, symbol: symbols[0] === symbols[1] ? symbols[0] : symbols[1] };
  return { win: false, symbol: null };
}

function facesFor(symbol: SymbolId): number[] {
  const out: number[] = [];
  FACE_SYMBOLS.forEach((s, i) => {
    if (s === symbol) out.push(i);
  });
  return out;
}

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
}

function resultFor(faces: [number, number, number], extra: Partial<SlotResult> = {}): SlotResult {
  const symbols = faces.map((f) => FACE_SYMBOLS[f]) as [SymbolId, SymbolId, SymbolId];
  const e = evaluate(symbols);
  return { faces, symbols, win: e.win, symbol: e.symbol, payout: 0, jackpotWon: 0, source: "local", ...extra };
}

/**
 * Local fallback roll (demo / the cheat hook). A forced win lands all three reels on one symbol;
 * an unforced roll is rerolled until it is a genuine loss. Real rounds use outcomeFromServer.
 */
export function rollOutcome(forceWin: boolean, rng: Rng = Math.random): SlotResult {
  let faces: [number, number, number];
  if (forceWin) {
    const total = WEIGHTS.reduce((a, [, w]) => a + w, 0);
    let r = rng() * total;
    let sym: SymbolId = WEIGHTS[0][0];
    for (const [s, w] of WEIGHTS) {
      if ((r -= w) < 0) {
        sym = s;
        break;
      }
    }
    const f = facesFor(sym);
    faces = [pick(f, rng), pick(f, rng), pick(f, rng)];
  } else {
    faces = [0, 0, 0];
    for (let tries = 0; tries < 64; tries++) {
      faces = [Math.floor(rng() * FACE_COUNT), Math.floor(rng() * FACE_COUNT), Math.floor(rng() * FACE_COUNT)];
      if (!evaluate(faces.map((f) => FACE_SYMBOLS[f])).win) break;
      if (tries === 63) faces = [0, 1, 2]; // SEVEN, CHERRY, LEMON
    }
  }
  return resultFor(faces);
}

/** Turn the server's answer into face indices to aim at (any face carrying that symbol). */
export function outcomeFromServer(o: ServerOutcome, rng: Rng = Math.random): SlotResult {
  const faces = o.reels.map((id) => pick(facesFor(symbolFromServer(id)), rng)) as [number, number, number];
  const r = resultFor(faces, { payout: o.payout, jackpotWon: o.jackpotWon, source: "server" });
  r.win = o.won; // the server is the authority on whether this paid
  return r;
}

/** The reel's free-spinning curve: smooth spin-up, then constant speed. Pure in t. */
function spinCurve(startAngle: number, t: number): number {
  if (t <= 0) return startAngle;
  if (t < SPIN_UP) return startAngle + (SPIN_SPEED * t * t) / (2 * SPIN_UP);
  return startAngle + SPIN_SPEED * (t - SPIN_UP / 2);
}

/** Reel angle at time t of a spin. Cubic Hermite from the spin curve into the stop, ending at rest. */
export function reelAngleAt(r: ReelState, t: number): number {
  const decelStart = r.stopAt - DECEL_TIME;
  if (t < decelStart) return spinCurve(r.startAngle, t);
  if (t >= r.stopAt) return r.endAngle;
  const u = (t - decelStart) / DECEL_TIME;
  const u2 = u * u;
  const u3 = u2 * u;
  const m0 = SPIN_SPEED * DECEL_TIME; // slope at u = 0 matches the spin speed exactly
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  return h00 * r.decelFrom + h10 * m0 + h01 * r.endAngle;
}

function normalise(a: number): number {
  return ((a % TAU) + TAU) % TAU;
}

function blankReel(face: number): ReelState {
  const a = face * FACE_STEP;
  return { angle: a, startAngle: a, endAngle: a, decelFrom: a, stopAt: 0, face };
}

export function createSlotMachine(id: string, rng: Rng = Math.random): SlotMachineState {
  const faces = [0, 1, 2].map(() => Math.floor(rng() * FACE_COUNT));
  return {
    id,
    phase: "IDLE",
    isRigged: false,
    upcomingWin: false,
    elapsed: 0,
    reels: [blankReel(faces[0]), blankReel(faces[1]), blankReel(faces[2])],
    result: null,
    round: 0,
  };
}

/** The machines on the floor. `slots` is the main cabinet in the Slots Hall. */
export const SLOT_MACHINES: SlotMachineState[] = [createSlotMachine("slots")];

export function getSlotMachine(id: string): SlotMachineState | undefined {
  return SLOT_MACHINES.find((m) => m.id === id);
}

export function setUpcomingWin(id: string, value: boolean): void {
  const m = getSlotMachine(id);
  if (m) m.upcomingWin = value;
}

export function setRigged(id: string, value: boolean): void {
  const m = getSlotMachine(id);
  if (m) m.isRigged = value;
}

/** Pull the lever. Ignored (returns false) while the reels are still moving. */
export function requestSpin(m: SlotMachineState, rng: Rng = Math.random, outcome?: ServerOutcome): boolean {
  if (m.phase === "SPINNING" || m.phase === "DECELERATING") return false;

  // 1. The outcome exists before the first frame of the spin. A real round passes the server's
  //    answer (which always wins over the cheat flags); otherwise roll locally, honouring the flags.
  const forceWin = m.upcomingWin || m.isRigged;
  m.upcomingWin = false;
  const result = outcome ? outcomeFromServer(outcome, rng) : rollOutcome(forceWin, rng);

  // 2. Aim each reel. All timing is fixed here; per-frame code only samples reelAngleAt.
  m.reels.forEach((reel, i) => {
    const start = normalise(reel.angle);
    const stopAt = STOP_TIMES[i];
    const decelFrom = spinCurve(start, stopAt - DECEL_TIME);
    const targetBase = result.faces[i] * FACE_STEP;
    // First angle congruent to the target that leaves at least half the "braking distance"
    // (SPIN_SPEED * DECEL_TIME / 2), which keeps the Hermite curve monotonic (no backing up).
    const minTravel = (SPIN_SPEED * DECEL_TIME) / 2;
    const turns = Math.ceil((decelFrom + minTravel - targetBase) / TAU);
    const endAngle = targetBase + turns * TAU;
    Object.assign(reel, { startAngle: start, angle: start, decelFrom, endAngle, stopAt, face: result.faces[i] });
  });

  m.result = result;
  m.elapsed = 0;
  m.phase = "SPINNING";
  m.round += 1;
  return true;
}

/** Advance by dt seconds (any size; large hitches are fine because angles are sampled, not integrated). */
export function updateSlotMachine(m: SlotMachineState, dt: number): void {
  if (m.phase === "IDLE") return;
  m.elapsed += Math.min(Math.max(dt, 0), 1);
  const t = m.elapsed;
  for (const r of m.reels) r.angle = reelAngleAt(r, t);

  const last = STOP_TIMES[STOP_TIMES.length - 1];
  if (t >= last) {
    if (m.phase !== "SETTLED") {
      m.phase = "SETTLED";
      // Park on the exact face angle so the next spin starts from a clean value.
      for (const r of m.reels) r.angle = r.endAngle;
    }
    if (t >= last + SETTLE_HOLD) {
      m.phase = "IDLE";
      for (const r of m.reels) r.angle = normalise(r.endAngle);
    }
  } else if (STOP_TIMES.some((s) => t >= s - DECEL_TIME)) {
    m.phase = "DECELERATING";
  } else {
    m.phase = "SPINNING";
  }
}
