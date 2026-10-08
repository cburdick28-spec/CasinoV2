import { useSyncExternalStore } from "react";
import { SPAWN, type RoomId } from "./world";

/**
 * Tiny external store shared by the player controller (writes) and the HUD/minimap (reads).
 * It lives outside React so the controller can update it every frame without re-rendering
 * the canvas. The HUD subscribes through useWalkState and is throttled to ~10 updates/s.
 */
export interface WalkState {
  x: number;
  z: number;
  /** Radians. 0 looks toward +z, Math.PI looks toward -z (north). */
  yaw: number;
  pitch: number;
  room: RoomId | null;
  /** Slug of the station the player is close enough to use, or null. */
  near: string | null;
  /** True while the pointer is locked or the user has engaged drag-to-look. */
  engaged: boolean;
  /** Set by touch controls: -1..1 move vector in player space (x = strafe, y = forward). */
  touchMove: { x: number; y: number };
  fps: number;
}

let state: WalkState = {
  x: SPAWN.x,
  z: SPAWN.z,
  yaw: SPAWN.yaw,
  pitch: 0,
  room: "lobby",
  near: null,
  engaged: false,
  touchMove: { x: 0, y: 0 },
  fps: 0,
};

const listeners = new Set<() => void>();
let lastEmit = 0;

export function getWalkState(): WalkState {
  return state;
}

/** Mutate fields freely; call emit() (throttled) when something the HUD cares about changed. */
export function patchWalkState(patch: Partial<WalkState>, forceEmit = false) {
  state = { ...state, ...patch };
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (forceEmit || now - lastEmit > 100) {
    lastEmit = now;
    listeners.forEach((l) => l());
  }
}

export function subscribeWalkState(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWalkState<T>(selector: (s: WalkState) => T): T {
  return useSyncExternalStore(
    subscribeWalkState,
    () => selector(state),
    () => selector(state)
  );
}

export function resetWalkState() {
  state = {
    ...state,
    x: SPAWN.x,
    z: SPAWN.z,
    yaw: SPAWN.yaw,
    pitch: 0,
    room: "lobby",
    near: null,
    engaged: false,
    touchMove: { x: 0, y: 0 },
  };
  listeners.forEach((l) => l());
}
