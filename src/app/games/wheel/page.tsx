"use client";

import { useRef, useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";
import { WHEEL_ORDER } from "@/lib/games/wheel";

const POCKET_ANGLE = 360 / WHEEL_ORDER.length;

function segmentColor(mult: number) {
  if (mult === 0) return "#3a1520";
  if (mult < 1) return "#274a8f";
  if (mult === 1) return "#1f8f5f";
  if (mult < 3) return "#a8791f";
  return "#c1273a";
}

function textColor(mult: number) {
  return mult >= 3 || mult === 0 ? "#fff" : "#fff";
}

export default function WheelPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [wheelAngle, setWheelAngle] = useState(0);
  const [landedMult, setLandedMult] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const spinCountRef = useRef(0);

  if (!user) return null;

  async function spin() {
    setSpinning(true);
    setMessage(null);
    setLandedMult(null);

    const res = await fetch("/api/games/wheel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();

    if (res.ok) {
      const targetAngle = 360 - data.index * POCKET_ANGLE;
      spinCountRef.current += 1;
      const fullTurns = 6 * 360 * spinCountRef.current;
      setWheelAngle(fullTurns + targetAngle);
    }

    setTimeout(() => {
      setSpinning(false);
      if (!res.ok) {
        pushToast("lose", data.error);
        return;
      }
      setLandedMult(data.mult);
      const net = data.payout - bet;
      setMessage(
        data.mult === 0
          ? `\u{1F480} Busted — -$${bet.toLocaleString()}`
          : net >= 0
          ? `\u{1F389} ${data.mult}x — +$${net.toLocaleString()}`
          : `${data.mult}x — -$${Math.abs(net).toLocaleString()}`
      );
      pushToast(net >= 0 ? "win" : "lose", `${data.mult}x — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
      if (data.mult >= 3) celebrate();
      refresh();
    }, 3100);
  }

  return (
    <GameShell title="Wheel" emoji={"\u{1F3A1}"} subtitle="One spin, one multiplier — from a total bust to a 5x payout.">
      <div className="panel p-6 flex flex-col items-center gap-5">
        <div className="relative w-[22rem] h-[22rem] max-w-full">
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-1 z-10"
            style={{
              width: 0,
              height: 0,
              borderLeft: "12px solid transparent",
              borderRight: "12px solid transparent",
              borderTop: "20px solid var(--gold)",
              filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.5))",
            }}
          />
          <div
            className={`w-full h-full rounded-full border-4 relative overflow-hidden ${spinning ? "glow" : ""}`}
            style={{
              borderColor: "var(--gold)",
              transform: `rotate(${wheelAngle}deg)`,
              transition: spinning ? "transform 3s cubic-bezier(0.1, 0.7, 0.15, 1)" : "none",
              background: `conic-gradient(${WHEEL_ORDER.map((m, i) => {
                const from = (i / WHEEL_ORDER.length) * 360;
                const to = ((i + 1) / WHEEL_ORDER.length) * 360;
                return `${segmentColor(m)} ${from}deg ${to}deg`;
              }).join(", ")})`,
            }}
          >
            {WHEEL_ORDER.map((m, i) => {
              const angle = (i / WHEEL_ORDER.length) * 360 + POCKET_ANGLE / 2;
              return (
                <div key={i} className="absolute left-1/2 top-1/2 w-0 h-0" style={{ transform: `rotate(${angle}deg) translateY(-158px)` }}>
                  <span
                    className="absolute text-[10px] font-bold"
                    style={{ transform: `translate(-50%, -50%) rotate(${-angle}deg)`, color: textColor(m) }}
                  >
                    {m}x
                  </span>
                </div>
              );
            })}
          </div>
          <div
            className="absolute inset-0 m-auto w-24 h-24 rounded-full flex items-center justify-center text-2xl font-extrabold"
            style={{
              background: "#0d0d1a",
              border: "3px solid var(--gold)",
              color: landedMult === null ? "var(--muted)" : landedMult === 0 ? "var(--danger)" : "var(--gold)",
            }}
          >
            {spinning ? "\u{1F3A1}" : landedMult !== null ? `${landedMult}x` : "?"}
          </div>
        </div>

        {message && <div className="font-bold text-lg value-pop">{message}</div>}

        <BetInput bet={bet} setBet={setBet} max={user.money} disabled={spinning} />
        <button className="btn btn-gold text-lg px-8" onClick={spin} disabled={spinning || bet > user.money}>
          {spinning ? "Spinning..." : "\u{1F3A1} Spin"}
        </button>
      </div>

      <div className="panel p-5 text-sm text-muted">
        <p>A single spin lands on one multiplier — anywhere from a total bust (0x) up to 5x your bet. Higher multipliers are rarer.</p>
      </div>
    </GameShell>
  );
}
