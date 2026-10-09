"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { AvatarConfig } from "@/lib/avatar";
import { getWalkState } from "../state";
import { getFocus } from "../inworld";

export interface RemotePlayer {
  id: number;
  name: string;
  avatar: AvatarConfig;
  x: number;
  z: number;
  yaw: number;
  seated: string | null;
}

/** External store (the 3D canvas is a separate React tree): the latest players seen by the server. */
let players: RemotePlayer[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getPlayers = () => players;
export function usePlayers(): RemotePlayer[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => players,
    () => players,
  );
}

const POLL_MS = 400;

/** Posts our pose and receives everyone else's. Plain HTTP polling: no websockets, no third-party service. */
export function usePresenceSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;

    const tick = async () => {
      if (stopped) return;
      if (document.hidden) {
        timer = setTimeout(tick, 2000);
        return;
      }
      const w = getWalkState();
      const f = getFocus();
      try {
        const res = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x: w.x, z: w.z, yaw: w.yaw, seated: f ?? "" }),
        });
        if (res.status === 401) return; // logged out: stop polling
        if (res.ok) {
          const data = (await res.json()) as { players: RemotePlayer[] };
          if (!stopped) {
            players = data.players;
            emit();
          }
          failures = 0;
        } else failures++;
      } catch {
        failures++;
      }
      if (!stopped) timer = setTimeout(tick, Math.min(5000, POLL_MS * (1 + failures)));
    };
    void tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
      players = [];
      emit();
    };
  }, [enabled]);
}
