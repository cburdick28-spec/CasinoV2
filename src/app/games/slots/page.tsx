"use client";

import { useRef, useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";

const SYMBOLS = ["\u{1F352}", "\u{1F34B}", "\u{1F349}", "⭐", "\u{1F48E}", "7️⃣"];
const PAYTABLE = [
  { sym: "\u{1F352}", pay: "3x" },
  { sym: "\u{1F34B}", pay: "4x" },
  { sym: "\u{1F349}", pay: "6x" },
  { sym: "⭐", pay: "10x" },
  { sym: "\u{1F48E}", pay: "25x" },
  { sym: "7️⃣", pay: "50x + JACKPOT" },
];

export default function SlotsPage() {
  const { user, refresh, pushToast } = useUser();
  const [bet, setBet] = useState(10);
  const [reels, setReels] = useState<string[]>(["\u{1F3B0}", "\u{1F3B0}", "\u{1F3B0}"]);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function spin() {
    setSpinning(true);
    setMessage(null);
    const spinTimer = setInterval(() => {
      setReels([rand(), rand(), rand()]);
    }, 70);
    timerRef.current = spinTimer;

    const res = await fetch("/api/games/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();

    setTimeout(() => {
      clearInterval(spinTimer);
      if (!res.ok) {
        setSpinning(false);
        pushToast("lose", data.error || "Something went wrong");
        return;
      }
      setReels(data.reels);
      setSpinning(false);
      if (data.won) {
        setMessage(
          data.jackpotWon > 0
            ? `\u{1F3B0} JACKPOT! +$${data.payout.toLocaleString()}`
            : `✅ Winner! +$${(data.payout - bet).toLocaleString()}`
        );
        pushToast("win", `+$${(data.payout - bet).toLocaleString()}`);
      } else {
        setMessage(`❌ No match. -$${bet.toLocaleString()}`);
        pushToast("lose", `-$${bet.toLocaleString()}`);
      }
      refresh();
    }, 900);
  }

  function rand() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  if (!user) return null;

  return (
    <GameShell title="Slots" emoji="\u{1F3B0}" subtitle="Match 3 symbols for the full payout, or 2 for a smaller win.">
      <div className="panel p-8 flex flex-col items-center gap-6">
        <div className="flex gap-4">
          {reels.map((s, i) => (
            <div
              key={i}
              className="w-24 h-28 rounded-xl border-4 border-[var(--gold)] bg-[#0d0d1a] flex items-center justify-center text-5xl"
            >
              {s}
            </div>
          ))}
        </div>
        {message && <div className="text-xl font-bold animate-in">{message}</div>}
        <BetInput bet={bet} setBet={setBet} max={user.money} disabled={spinning} />
        <button className="btn btn-gold text-lg px-8" onClick={spin} disabled={spinning || bet > user.money}>
          {spinning ? "Spinning..." : "\u{1F3B0} Spin!"}
        </button>
      </div>

      <div className="panel p-5">
        <h3 className="font-bold mb-3">Paytable (3 of a kind)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          {PAYTABLE.map((p) => (
            <div key={p.sym} className="flex items-center gap-2">
              <span className="text-2xl">{p.sym}</span>
              <span className="text-muted">{p.pay}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted mt-3">Any 2 matching symbols pay a smaller consolation prize. Losing spins feed the progressive jackpot.</p>
      </div>
    </GameShell>
  );
}
