import { useSyncExternalStore } from "react";

/**
 * Shared session store for playing a game seated at a station.
 *
 *   Controller (DOM side, a React component mounted while seated)  --setBar/setView-->  this store
 *   HUD bar (DOM)  --reads bar-->   and  --dispatchAction(id)-->  Controller's onAction handler
 *   Stage (inside the R3F Canvas)  --useGameView()-->  renders the game in 3D at the station
 *
 * It is an external store (like state.ts) because the Canvas lives in a separate React tree, so
 * context from outside does not reach it. Selectors given to hooks must return stable values.
 */
export type Vec3 = [number, number, number];

export interface BarButton {
  id: string;
  label: string;
  /** The one E triggers. At most one enabled primary at a time. */
  primary?: boolean;
  disabled?: boolean;
  tone?: "gold" | "ghost" | "danger";
}

export interface BarChoiceItem {
  id: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
}

/** A segmented selector (side, risk, bet type...). Click dispatches `${choice.id}:${item.id}`. Left/Right cycle the first one. */
export interface BarChoice {
  id: string;
  label: string;
  items: BarChoiceItem[];
}

/** A grid of numbers to pick from (keno, mines count...). Click dispatches `${picker.id}:${n}`. */
export interface BarPicker {
  id: string;
  label: string;
  count: number;
  /** First number in the grid, default 1. */
  first?: number;
  cols?: number;
  selected: number[];
  disabled?: boolean;
}

export interface GameBar {
  /** Show the bet stepper (Up/Down keys, - / + / Max buttons). */
  bet?: boolean;
  /** Greys the stepper out, e.g. while a hand is in progress. */
  betLocked?: boolean;
  /** One line of game status ("Dealer shows an Ace. Insurance?"). */
  status?: string;
  /** Result line, stays until the controller replaces it. */
  message?: { kind: "win" | "lose" | "info"; text: string } | null;
  /** Action buttons. Digit1..Digit9 trigger them in order, E triggers the primary one. */
  buttons?: BarButton[];
  choices?: BarChoice[];
  picker?: BarPicker;
  /** Small grey hint line. */
  hint?: string;
}

export interface GameSession {
  slug: string | null;
  bet: number;
  balance: number;
  /** True while a request is in flight or an animation the player should wait for is running. */
  busy: boolean;
  bar: GameBar;
  /** Whatever the controller wants its Stage to draw. Replace it (never mutate). */
  view: unknown;
}

export const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 100000, 1000000];

let session: GameSession = { slug: null, bet: 10, balance: 0, busy: false, bar: {}, view: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getSession = () => session;

export function patchSession(patch: Partial<GameSession>) {
  session = { ...session, ...patch };
  emit();
}

export const setBar = (bar: GameBar) => patchSession({ bar });
/** Replace the whole bar but keep the current result line (unless the new bar has its own `message`). */
export const updateBar = (bar: GameBar) => patchSession({ bar: { message: session.bar.message, ...bar } });
export const patchBar = (patch: Partial<GameBar>) => patchSession({ bar: { ...session.bar, ...patch } });
export const setView = (view: unknown) => patchSession({ view });

let endTimer: ReturnType<typeof setTimeout> | null = null;

/** Sit down at a game. The previous game's bar and view are cleared; the bet carries over. */
export function beginSession(slug: string) {
  if (endTimer) clearTimeout(endTimer);
  endTimer = null;
  if (session.slug === slug) return;
  handler = null;
  patchSession({ slug, busy: false, bar: {}, view: null });
}

/** Stand up. The slug lingers briefly so the Stage can finish while the camera glides away. */
export function endSession() {
  handler = null;
  if (endTimer) clearTimeout(endTimer);
  endTimer = setTimeout(() => {
    endTimer = null;
    patchSession({ slug: null, view: null, bar: {}, busy: false });
  }, 1600);
}

export function stepBet(dir: 1 | -1) {
  if (session.busy || session.bar.betLocked) return;
  const cap = Math.max(1, Math.floor(session.balance));
  const next = dir > 0 ? BET_STEPS.find((b) => b > session.bet) ?? session.bet : [...BET_STEPS].reverse().find((b) => b < session.bet) ?? 1;
  patchSession({ bet: Math.max(1, Math.min(cap, next)) });
}

export function setBetMax() {
  if (session.busy || session.bar.betLocked) return;
  patchSession({ bet: Math.max(1, Math.floor(session.balance)) });
}

/* ------------------------------ actions ------------------------------ */

type ActionHandler = (id: string) => void;
let handler: ActionHandler | null = null;

/** Controllers register their one handler here (returns the unsubscribe). */
export function setActionHandler(fn: ActionHandler): () => void {
  handler = fn;
  return () => {
    if (handler === fn) handler = null;
  };
}

export function dispatchAction(id: string) {
  handler?.(id);
}

/** Keyboard routing while seated. Returns true when the key was used. */
export function dispatchKey(code: string): boolean {
  const { bar, busy } = session;
  if (code === "KeyE") {
    const b = bar.buttons?.find((x) => x.primary && !x.disabled);
    if (b && !busy) dispatchAction(b.id);
    return true;
  }
  const m = /^Digit([1-9])$/.exec(code);
  if (m) {
    const b = bar.buttons?.[Number(m[1]) - 1];
    if (b && !b.disabled && !busy) dispatchAction(b.id);
    return true;
  }
  if ((code === "ArrowLeft" || code === "ArrowRight") && bar.choices?.[0] && !busy) {
    const c = bar.choices[0];
    const items = c.items.filter((i) => !i.disabled);
    const at = items.findIndex((i) => i.active);
    const next = items[(at + (code === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    if (next) dispatchAction(`${c.id}:${next.id}`);
    return true;
  }
  return false;
}

/* ------------------------------ hooks ------------------------------ */

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useGameSession<T>(selector: (s: GameSession) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(session),
    () => selector(session)
  );
}

/** For a Stage: the controller's current view, cast to the game's own shape (null before the first publish). */
export function useGameView<T>(): T | null {
  return useGameSession((s) => s.view as T | null);
}

/** True while the player is seated at this game (lingers briefly after standing). For station models: hide decorative props that would block the view. */
export function useSeated(slug: string): boolean {
  return useGameSession((s) => s.slug === slug);
}
