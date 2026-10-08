import { useSyncExternalStore } from "react";
import type { SlotResult } from "./slotMachines";

/**
 * Betting and result state for playing a machine in the world. Plain external store (like state.ts):
 * the 3D side only reads/writes it imperatively, the HUD bar subscribes through useSlotPlay.
 */
export interface SlotPlayState {
  bet: number;
  /** The player's spendable balance, mirrored from the account so key handlers can cap the bet. */
  balance: number;
  /** True from the lever pull until the last reel stops (spin refused meanwhile). */
  busy: boolean;
  /** Result line shown in the HUD bar after the reels settle. */
  message: { kind: "win" | "lose" | "info"; text: string } | null;
}

/** Stake the player is charged for, kept to round numbers like a real machine's bet buttons. */
export const BET_STEPS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000, 100000, 1000000];

let state: SlotPlayState = { bet: 10, balance: 0, busy: false, message: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getSlotPlay = () => state;

export function patchSlotPlay(patch: Partial<SlotPlayState>) {
  state = { ...state, ...patch };
  emit();
}

/** Step the bet up or down through BET_STEPS, never above what the player can afford. */
export function stepBet(dir: 1 | -1) {
  if (state.busy) return;
  const cap = Math.max(1, Math.floor(state.balance));
  let next = state.bet;
  if (dir > 0) next = BET_STEPS.find((b) => b > state.bet) ?? state.bet;
  else next = [...BET_STEPS].reverse().find((b) => b < state.bet) ?? 1;
  patchSlotPlay({ bet: Math.max(1, Math.min(cap, next)) });
}

export const setBetMax = () => {
  if (!state.busy) patchSlotPlay({ bet: Math.max(1, Math.floor(state.balance)) });
};

export function useSlotPlay<T>(selector: (s: SlotPlayState) => T): T {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => selector(state),
    () => selector(state)
  );
}

/* The reels announce when a round has fully settled; CasinoWalk listens and pays out the feedback. */
type SettleListener = (machineId: string, result: SlotResult) => void;
const settleListeners = new Set<SettleListener>();
export function onSlotSettled(fn: SettleListener) {
  settleListeners.add(fn);
  return () => {
    settleListeners.delete(fn);
  };
}
export function notifySlotSettled(machineId: string, result: SlotResult) {
  settleListeners.forEach((l) => l(machineId, result));
}
