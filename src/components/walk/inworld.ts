import { useSyncExternalStore } from "react";
import type { Vec3 } from "./stations/kit";

/**
 * Games that are played right inside the 3D world instead of navigating to a page.
 * `eye` / `target` are in the station's local space (front faces +z), in metres.
 */
export const IN_WORLD_GAMES: Record<string, { eye: Vec3; target: Vec3 }> = {
  // Sat on the stool, reels (local 0, 1.545, 0.1) filling the middle of the view.
  slots: { eye: [0, 1.64, 1.1], target: [0, 1.53, 0.1] },
};

export const isInWorldGame = (slug: string | null | undefined): slug is string => !!slug && slug in IN_WORLD_GAMES;

let focus: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Slug of the in-world game the camera is currently framing, or null. */
export const getFocus = () => focus;

export function enterFocus(slug: string) {
  if (focus === slug) return;
  focus = slug;
  emit();
}

export function leaveFocus() {
  if (focus === null) return;
  focus = null;
  emit();
}

export function useFocus(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    () => focus,
    () => null
  );
}
