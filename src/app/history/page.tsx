"use client";

import { useEffect, useState } from "react";
import GameShell from "@/components/GameShell";

interface Row {
  id: number;
  game: string;
  bet: number;
  outcome: "win" | "loss" | "push";
  net: number;
  created_at: number;
}

export default function HistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/history")
      .then((r) => r.json())
      .then((d) => setRows(d.history));
  }, []);

  return (
    <GameShell title="Bet History" emoji={"\u{1F4C8}"} subtitle="Your last 100 bets.">
      <div className="panel divide-y divide-[var(--border)] overflow-x-auto">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
            <span className="flex-1">{r.game}</span>
            <span className="text-muted hidden sm:inline">${r.bet.toLocaleString()} bet</span>
            <span className="text-muted text-xs hidden md:inline">{new Date(r.created_at).toLocaleString()}</span>
            <span className={`font-bold w-24 text-right ${r.net > 0 ? "text-success" : r.net < 0 ? "text-danger" : "text-muted"}`}>
              {r.net > 0 ? "+" : ""}${r.net.toLocaleString()}
            </span>
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-muted text-sm">No bets placed yet — go play something!</div>}
      </div>
    </GameShell>
  );
}
