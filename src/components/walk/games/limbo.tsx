"use client";

import { Suspense, useEffect, useRef } from "react";
import { Text } from "@react-three/drei";
import LimboScene3D from "@/components/three/LimboScene3D";
import { MAX_TARGET, MIN_TARGET } from "@/lib/games/limbo";
import { FONT_URL } from "../stations/common";
import { useActionHandler, useGameController } from "./useGameController";
import { useGameView, type GameBar, type Vec3 } from "./bridge";

/** Facing the pole rig; the track fills the upper-middle of the view. */
export const camera: { eye: Vec3; target: Vec3 } = { eye: [0, 1.6, 4.1], target: [0, 1.0, 0] };

const PRESET_TARGETS = [1.5, 2, 5, 10, 50, 100];
const money = (n: number) => `$${n.toLocaleString()}`;
const clampTarget = (t: number) => Math.max(MIN_TARGET, Math.min(MAX_TARGET, Math.round(t * 100) / 100));
const fmt = (t: number) => (t >= 1000 ? t.toLocaleString(undefined, { maximumFractionDigits: 2 }) : t.toFixed(2));
const chanceOf = (t: number) => Math.min(100, (0.97 / t) * 100);

interface Result {
  roll: number;
  won: boolean;
  payout: number;
}
interface View {
  display: number;
  target: number;
  result: Result | null;
}

function barFor(target: number): GameBar {
  return {
    bet: true,
    status: `Target ${fmt(target)}x  ·  Win chance ~${chanceOf(target).toFixed(2)}%`,
    choices: [{ id: "target", label: "Target", items: PRESET_TARGETS.map((t) => ({ id: String(t), label: `${t}x`, active: t === target })) }],
    buttons: [
      { id: "play", label: "Play", primary: true },
      { id: "t-down", label: "Target -" },
      { id: "t-up", label: "Target +" },
      { id: "t-half", label: "Target /2" },
      { id: "t-double", label: "Target x2" },
    ],
    hint: "Esc or W A S D to step away",
  };
}

/** One notch up/down: about 10%, never less than 0.01. */
function nudge(t: number, dir: 1 | -1) {
  const next = clampTarget(dir > 0 ? t * 1.1 : t / 1.1);
  if (next !== t) return next;
  return clampTarget(t + dir * 0.01);
}

/* ------------------------------ DOM side: logic ------------------------------ */

export function Controller() {
  const g = useGameController("limbo");
  const r = useRef({ target: 2, raf: 0, running: false });

  const publishTarget = (target: number) => {
    r.current.target = target;
    g.setView({ display: 1, target, result: null } satisfies View);
    g.update(barFor(target));
  };

  useEffect(() => {
    g.setBar(barFor(2));
    g.setView({ display: 1, target: 2, result: null } satisfies View);
    const s = r.current;
    return () => {
      cancelAnimationFrame(s.raf);
      if (s.running) g.refresh(); // stood up mid-roll: the server already settled it
    };
  }, [g]);

  const play = async () => {
    const s = r.current;
    if (s.running) return;
    if (!g.user()) {
      g.message("info", "Log in to place a bet");
      return;
    }
    const bet = g.bet();
    const target = s.target;
    if (bet > g.balance()) {
      g.message("lose", "Not enough balance for that bet");
      return;
    }
    s.running = true;
    g.setBusy(true);
    g.clearMessage();
    g.setView({ display: 1, target, result: null } satisfies View);
    const res = await g.request<{ roll?: number; won?: boolean; payout?: number; error?: string }>("POST", { bet, target });
    if (!res.ok || typeof res.data.roll !== "number") {
      s.running = false;
      g.setBusy(false);
      g.message("lose", res.data.error || "Something went wrong");
      g.toast("lose", res.data.error || "Something went wrong");
      return;
    }
    // Quick eased climb from 1.00x up to the rolled result (900 ms, like the page).
    const finalRoll = res.data.roll;
    const won = !!res.data.won;
    const payout = res.data.payout ?? 0;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      if (t < 1) {
        g.setView({ display: 1 + (finalRoll - 1) * eased, target, result: null } satisfies View);
        s.raf = requestAnimationFrame(tick);
        return;
      }
      s.running = false;
      g.setView({ display: finalRoll, target, result: { roll: finalRoll, won, payout } } satisfies View);
      g.setBusy(false);
      const net = payout - bet;
      if (won) {
        g.message("win", `Target hit! ${finalRoll.toFixed(2)}x  +${money(net)}`);
        g.toast("win", `Hit ${finalRoll.toFixed(2)}x — +${money(net)}`);
        if (target >= 10) g.celebrate();
      } else {
        g.message("lose", `Fell short, only ${finalRoll.toFixed(2)}x  -${money(bet)}`);
        g.toast("lose", `Only ${finalRoll.toFixed(2)}x — -${money(bet)}`);
      }
      g.refresh();
    };
    s.raf = requestAnimationFrame(tick);
  };

  useActionHandler((id) => {
    const s = r.current;
    if (s.running) return;
    if (id === "play") void play();
    else if (id.startsWith("target:")) publishTarget(clampTarget(Number(id.slice(7))));
    else if (id === "t-up") publishTarget(nudge(s.target, 1));
    else if (id === "t-down") publishTarget(nudge(s.target, -1));
    else if (id === "t-double") publishTarget(clampTarget(s.target * 2));
    else if (id === "t-half") publishTarget(clampTarget(s.target / 2));
  });

  return null;
}

/* ------------------------------ Canvas side: 3D ------------------------------ */

const SCALE_MAX = 100;
const SCALE_WORLD_HEIGHT = 3.2;
const heightFor = (v: number) => (Math.log10(Math.max(1, Math.min(v, SCALE_MAX))) / Math.log10(SCALE_MAX)) * SCALE_WORLD_HEIGHT;
const TICKS = [1, 2, 5, 10, 25, 50, 100];

/** The existing limbo track + rocket between the station's poles (its bar and figure are hidden while seated). */
export function Stage() {
  const v = useGameView<View>() ?? { display: 1, target: 2, result: null };
  const color = v.result ? (v.result.won ? "#7dffa6" : "#ff8f8f") : "#ffd54a";
  return (
    <group position={[0, 1.285, 0.12]} scale={0.75}>
      <LimboScene3D display={v.display} target={v.target} result={v.result} trackColor="#b9bfe8" trackRadius={0.06} />
      {/* readouts, in the scene's own units (its track base sits at y = -1.5) */}
      <Suspense fallback={null}>
        <group position={[0, -1.5, 0]}>
          <Text font={FONT_URL} position={[-1.5, 2.5, 0.1]} fontSize={0.62} anchorX="right" anchorY="middle" color={color} outlineWidth={0.03} outlineColor="#0b0c1c" material-toneMapped={false}>
            {`${v.display.toFixed(2)}x`}
          </Text>
          <Text font={FONT_URL} position={[0.62, heightFor(v.target), 0.05]} fontSize={0.2} anchorX="left" anchorY="middle" color="#ffd54a" outlineWidth={0.012} outlineColor="#0b0c1c" material-toneMapped={false}>
            {`TARGET ${fmt(v.target)}x`}
          </Text>
          {TICKS.map((t) => (
            <Text key={t} font={FONT_URL} position={[-0.3, heightFor(t), 0.05]} fontSize={0.14} anchorX="right" anchorY="middle" color="#9aa0c4" material-toneMapped={false}>
              {`${t}x`}
            </Text>
          ))}
        </group>
      </Suspense>
    </group>
  );
}
