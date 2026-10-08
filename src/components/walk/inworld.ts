import { useSyncExternalStore } from "react";
import { beginSession, endSession } from "./games/bridge";

/** Slug of the game the player is seated at (camera framed, controls handed to the game), or null. */
let focus: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getFocus = () => focus;

export function enterFocus(slug: string) {
  if (focus === slug) return;
  focus = slug;
  beginSession(slug);
  emit();
}

export function leaveFocus() {
  if (focus === null) return;
  focus = null;
  endSession();
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
