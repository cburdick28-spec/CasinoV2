"use client";

import { useState } from "react";
import GameShell from "@/components/GameShell";
import BetInput from "@/components/BetInput";
import { useUser } from "@/lib/UserContext";

const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

type BetChoice =
  | { type: "big" | "small" | "anyTriple" }
  | { type: "specificTriple" | "number"; number: number };

const BASE_BETS: { label: string; choice: BetChoice; odds: string }[] = [
  { label: "Big (11-17)", choice: { type: "big" }, odds: "1:1" },
  { label: "Small (4-10)", choice: { type: "small" }, odds: "1:1" },
  { label: "Any Triple", choice: { type: "anyTriple" }, odds: "30:1" },
];

export default function SicBoPage() {
  const { user, refresh, pushToast, celebrate } = useUser();
  const [bet, setBet] = useState(10);
  const [choice, setChoice] = useState<BetChoice>({ type: "big" });
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<number[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  if (!user) return null;

  function choiceLabel(c: BetChoice) {
    if (c.type === "number") return `Number ${c.number}`;
    if (c.type === "specificTriple") return `Triple ${c.number}s`;
    return BASE_BETS.find((b) => b.choice.type === c.type)?.label ?? c.type;
  }

  async function roll() {
    setRolling(true);
    setMessage(null);
    const body: Record<string, unknown> = { bet, betType: choice.type };
    if ("number" in choice) body.number = choice.number;

    const res = await fetch("/api/games/sicbo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    setTimeout(() => {
      setRolling(false);
      if (!res.ok) {
        pushToast("lose", data.error);
        return;
      }
      setDice(data.dice);
      const net = data.payout - bet;
      if (net >= 0) {
        setMessage(`${choiceLabel(choice)} hit! +$${net.toLocaleString()}`);
        pushToast("win", `+$${net.toLocaleString()}`);
        if (data.mult >= 30) celebrate();
      } else {
        setMessage(`No match — -$${bet.toLocaleString()}`);
        pushToast("lose", `-$${bet.toLocaleString()}`);
        setShake(true);
        setTimeout(() => setShake(false), 550);
      }
      refresh();
    }, 700);
  }

  return (
    <GameShell title="Sic Bo" emoji={"\u{1F3B2}"} subtitle="Three dice, your call — big/small, a number, or chase a triple for a huge payout.">
      <div className={`panel p-8 flex flex-col items-center gap-6 ${shake ? "shake" : ""}`}>
        <div className="flex gap-4 text-6xl h-20 items-center">
          {dice ? (
            dice.map((d, i) => (
              <span key={i} className={rolling ? "dice-tumble" : "value-pop"} style={{ animationDelay: `${i * 80}ms` }}>
                {DICE_FACES[d]}
              </span>
            ))
          ) : (
            <span className="text-muted text-xl">Roll to begin</span>
          )}
        </div>

        {message && <div className="font-bold text-lg value-pop">{message}</div>}

        <div className="flex flex-wrap gap-2 justify-center">
          {BASE_BETS.map((b) => (
            <button
              key={b.label}
              className={`btn !py-1.5 text-sm ${choice.type === b.choice.type ? "btn-gold" : "btn-ghost"}`}
              disabled={rolling}
              onClick={() => setChoice(b.choice)}
            >
              {b.label} <span className="text-[10px] text-muted ml-1">{b.odds}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col items-center gap-2">
          <div className="text-xs text-muted">Or bet on a number (pays by how many dice match) / a specific triple (181:1)</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                className={`btn !py-1 !px-2 text-sm ${
                  choice.type === "number" && "number" in choice && choice.number === n ? "btn-gold" : "btn-ghost"
                }`}
                disabled={rolling}
                onClick={() => setChoice({ type: "number", number: n })}
              >
                {DICE_FACES[n]}
              </button>
            ))}
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={`t${n}`}
                className={`btn !py-1 !px-2 text-sm ${
                  choice.type === "specificTriple" && "number" in choice && choice.number === n ? "btn-gold" : "btn-ghost"
                }`}
                disabled={rolling}
                onClick={() => setChoice({ type: "specificTriple", number: n })}
              >
                {DICE_FACES[n]}
                {DICE_FACES[n]}
                {DICE_FACES[n]}
              </button>
            ))}
          </div>
        </div>

        <div className="text-sm text-muted">
          Betting: <span className="text-[var(--gold)] font-bold">{choiceLabel(choice)}</span>
        </div>

        <div className="flex items-center gap-3">
          <BetInput bet={bet} setBet={setBet} max={user.money} disabled={rolling} />
          <button className="btn btn-gold" disabled={rolling || bet > user.money} onClick={roll}>
            {rolling ? "Rolling..." : "\u{1F3B2} Roll"}
          </button>
        </div>
      </div>
    </GameShell>
  );
}
