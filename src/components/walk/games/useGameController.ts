"use client";

import { useEffect, useMemo, useRef } from "react";
import { useUser } from "@/lib/UserContext";
import { dispatchAction, getSession, patchBar, patchSession, setActionHandler, setBar, setView, updateBar, type GameBar } from "./bridge";

export interface ApiResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
}

/**
 * Everything a game Controller needs, as stable functions (safe to call from effects and async code).
 * Mount it in a Controller component: `const g = useGameController("blackjack")`.
 */
export function useGameController(slug: string) {
  const { user, refresh, pushToast, celebrate } = useUser();
  const live = useRef({ user, refresh, pushToast, celebrate });
  useEffect(() => {
    live.current = { user, refresh, pushToast, celebrate };
    patchSession({ balance: user?.money ?? 0 });
  }, [user, refresh, pushToast, celebrate]);

  return useMemo(
    () => ({
      /** Current account (null when logged out). */
      user: () => live.current.user,
      bet: () => getSession().bet,
      balance: () => live.current.user?.money ?? 0,
      /** Replace the whole bar, including the result line. */
      setBar,
      /** Replace the whole bar but keep the current result line. Use this to re-publish controls after each step. */
      update: updateBar,
      /** Merge fields into the bar (leaves everything else as it was). */
      patchBar,
      setView,
      setBusy: (busy: boolean) => patchSession({ busy }),
      message: (kind: "win" | "lose" | "info", text: string) => patchBar({ message: { kind, text } }),
      clearMessage: () => patchBar({ message: null }),
      toast: (kind: "win" | "lose" | "info", text: string) => live.current.pushToast(kind, text),
      celebrate: () => live.current.celebrate(),
      /** Re-read the balance from the server (call once a round has visibly finished). */
      refresh: () => void live.current.refresh(),
      /** Register the handler for bar buttons / choices / pickers / hotkeys. Returns unsubscribe; call it from an effect. */
      onAction: (fn: (id: string) => void) => setActionHandler(fn),
      /** Fire an action as if the player pressed it. */
      dispatch: dispatchAction,
      /**
       * Call /api/games/<slug>. Network failures and non-2xx come back as ok:false with data.error set.
       * Does NOT touch `busy`; the caller owns that.
       */
      async request<T = Record<string, unknown>>(method: "GET" | "POST", body?: Record<string, unknown>): Promise<ApiResult<T>> {
        try {
          const res = await fetch(`/api/games/${slug}`, {
            method,
            cache: "no-store",
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
          });
          const data = (await res.json().catch(() => ({}))) as T;
          return { ok: res.ok, status: res.status, data };
        } catch {
          return { ok: false, status: 0, data: { error: "Could not reach the casino, try again" } as T };
        }
      },
    }),
    [slug]
  );
}

/** Controller helper: registers `fn` as the action handler for the life of the component. */
export function useActionHandler(fn: (id: string) => void) {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  useEffect(() => setActionHandler((id) => ref.current(id)), []);
}

export type { GameBar };
