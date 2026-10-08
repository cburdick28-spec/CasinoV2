"use client";

import { useEffect } from "react";
import { useFocus } from "../inworld";
import { dispatchAction, getSession, useGameSession } from "./bridge";
import { GAME_MODULES } from "./index";
import { stationBySlug } from "../world";

/** DOM side (outside the Canvas): runs the Controller of the game the player is seated at. */
export function ActiveController() {
  const slug = useFocus();
  // Test handle on /floor?debug=1: window.__game.session() and window.__game.dispatch("hit")
  useEffect(() => {
    if (!/[?&]debug=1/.test(window.location.search)) return;
    const w = window as unknown as { __game?: unknown };
    const api = { session: () => JSON.parse(JSON.stringify(getSession())), dispatch: dispatchAction };
    w.__game = api;
    return () => {
      if (w.__game === api) delete w.__game;
    };
  }, []);
  const mod = slug ? GAME_MODULES[slug] : undefined;
  if (!slug || !mod) return null;
  const C = mod.Controller;
  return <C key={slug} />;
}

/** Inside the Canvas: the seated game's Stage, placed in the station's local space. Lingers briefly after standing up. */
export function ActiveStage() {
  const slug = useGameSession((s) => s.slug);
  const mod = slug ? GAME_MODULES[slug] : undefined;
  const st = slug ? stationBySlug(slug) : undefined;
  if (!slug || !mod?.Stage || !st) return null;
  const S = mod.Stage;
  return (
    <group position={[st.position[0], 0, st.position[1]]} rotation={[0, st.yaw, 0]}>
      <S key={slug} />
    </group>
  );
}
