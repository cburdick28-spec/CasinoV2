"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";
import { KENO_MAX_NUMBER, KENO_MAX_PICKS, PAYTABLE } from "@/lib/games/keno";

export default function KenoPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [picks, setPicks] = useState<number[]>([]);
  const [drawnSoFar, setDrawnSoFar] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;

  function toggle(n: number) {
    if (busy) return;
    setMessage(null);
    setDrawnSoFar([]);
    setPicks((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < KENO_MAX_PICKS ? [...p, n] : p));
  }

  function autoPick() {
    if (busy) return;
    const nums = new Set<number>();
    while (nums.size < 6) nums.add(1 + Math.floor(Math.random() * KENO_MAX_NUMBER));
    setPicks(Array.from(nums).sort((a, b) => a - b));
    setMessage(null);
    setDrawnSoFar([]);
  }

  async function play() {
    if (picks.length === 0) return;
    setBusy(true);
    setMessage(null);
    setDrawnSoFar([]);
    const res = await fetch("/api/games/keno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet, picks }),
    });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      return pushToast("lose", data.error);
    }

    let i = 0;
    const reveal = () => {
      i++;
      setDrawnSoFar(data.drawn.slice(0, i));
      if (i < data.drawn.length) {
        setTimeout(reveal, 220);
      } else {
        setBusy(false);
        const net = data.payout - bet;
        setMessage(
          data.hits === 0
            ? `No matches — -$${bet.toLocaleString()}`
            : `${data.hits} hit${data.hits === 1 ? "" : "s"} — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`
        );
        pushToast(net >= 0 ? "win" : "lose", `${data.hits} hits — ${net >= 0 ? "+" : ""}$${net.toLocaleString()}`);
        if (data.mult >= 20) celebrate();
        refresh();
      }
    };
    setTimeout(reveal, 220);
  }

  const table = PAYTABLE[picks.length] ?? [];

  return (
    <GameShell title="Keno" emoji={"\u{1F3B1}"} subtitle={`Pick up to ${KENO_MAX_PICKS} numbers from 1-${KENO_MAX_NUMBER}. 10 are drawn — the more you match, the bigger the multiplier.`}>
      <div className="panel p-6 flex flex-col items-center gap-5">
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-2 w-full max-w-xl">
          {Array.from({ length: KENO_MAX_NUMBER }, (_, i) => i + 1).map((n) => {
            const picked = picks.includes(n);
            const isDrawn = drawnSoFar.includes(n);
            const hit = picked && isDrawn;
            return (
              <button
                key={n}
                disabled={busy}
                onClick={() => toggle(n)}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all ${
                  isDrawn ? "value-pop" : ""
                }`}
                style={{
                  borderColor: hit ? "var(--success)" : isDrawn ? "var(--gold)" : picked ? "var(--gold)" : "var(--border)",
                  background: hit ? "rgba(52,211,153,0.25)" : isDrawn ? "rgba(255,213,74,0.15)" : picked ? "rgba(255,213,74,0.1)" : "#12121f",
                  color: picked || isDrawn ? "white" : "var(--muted)",
                }}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn btn-ghost text-sm" disabled={busy} onClick={autoPick}>
            {"\u{1F3B2}"} Auto-pick 6
          </button>
          <button className="btn btn-ghost text-sm" disabled={busy || picks.length === 0} onClick={() => setPicks([])}>
            Clear
          </button>
          <span className="text-sm text-muted">
            {picks.length} / {KENO_MAX_PICKS} picked
          </span>
        </div>

        {table.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[11px] justify-center">
            {table.map((m, hits) =>
              m > 0 ? (
                <span key={hits} className="px-2 py-1 rounded bg-white/5 border border-[var(--border)]">
                  {hits} hit{hits === 1 ? "" : "s"}: {m}x
                </span>
              ) : null
            )}
          </div>
        )}

        {message && <div className="font-bold text-lg value-pop">{message}</div>}

        <div className="flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={user.money} disabled={busy} />
          <button className="btn btn-gold" disabled={busy || picks.length === 0 || bet > user.money} onClick={play}>
            {busy ? "Drawing..." : "Play"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
