"use client";

import { useRef, useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import SlotReel from "@/components/SlotReel";
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

const REEL_TIMING = [
  { delayMs: 0, durationMs: 1200 },
  { delayMs: 250, durationMs: 1450 },
  { delayMs: 500, durationMs: 1700 },
];

export default function SlotsPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [finalReels, setFinalReels] = useState<string[]>(["\u{1F352}", "\u{1F34B}", "\u{1F349}"]);
  const [spinToken, setSpinToken] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<{ won: boolean; payout: number; jackpotWon: number } | null>(null);
  const settledCountRef = useRef(0);

  if (!user) return null;

  async function spin() {
    setSpinning(true);
    setMessage(null);
    setPendingResult(null);
    settledCountRef.current = 0;

    const res = await fetch("/api/games/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet }),
    });
    const data = await res.json();

    if (!res.ok) {
      setSpinning(false);
      pushToast("lose", data.error || "Something went wrong");
      return;
    }

    setFinalReels(data.reels);
    setPendingResult({ won: data.won, payout: data.payout, jackpotWon: data.jackpotWon ?? 0 });
    setSpinToken((n) => n + 1);
  }

  function onReelSettled() {
    settledCountRef.current += 1;
    if (settledCountRef.current === 3 && pendingResult) {
      const { won, payout, jackpotWon } = pendingResult;
      setSpinning(false);
      if (won) {
        setMessage(
          jackpotWon > 0
            ? `\u{1F3B0} JACKPOT! +$${payout.toLocaleString()}`
            : `✅ Winner! +$${(payout - bet).toLocaleString()}`
        );
        pushToast("win", `+$${(payout - bet).toLocaleString()}`);
        celebrate();
      } else {
        setMessage(`❌ No match. -$${bet.toLocaleString()}`);
        pushToast("lose", `-$${bet.toLocaleString()}`);
      }
      refresh();
    }
  }

  return (
    <GameShell title="Slots" emoji={"\u{1F3B0}"} subtitle="Match 3 symbols for the full payout, or 2 for a smaller win.">
      <div className="panel p-8 flex flex-col items-center gap-6">
        <div className="flex gap-4">
          {finalReels.map((s, i) => (
            <SlotReel
              key={i}
              symbols={SYMBOLS}
              finalSymbol={s}
              spinToken={spinToken}
              delayMs={REEL_TIMING[i].delayMs}
              durationMs={REEL_TIMING[i].durationMs}
              onSettled={onReelSettled}
            />
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
