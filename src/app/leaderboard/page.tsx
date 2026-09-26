"use client";

import { useEffect, useState } from "react";
import GameShell from "@/components/GameShell";

interface Row {
  username: string;
  money: number;
  vip: { name: string; emoji: string; color: string };
  gamesWon: number;
  gamesPlayed: number;
}

export default function LeaderboardPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setRows(d.leaderboard));
  }, []);

  return (
    <GameShell title="Leaderboard" emoji="\u{1F3C6}" subtitle="Top 20 players by balance.">
      <div className="panel divide-y divide-[var(--border)]">
        {rows.map((r, i) => (
          <div key={r.username} className="flex items-center gap-3 px-5 py-3">
            <span className="w-6 text-muted text-sm">{i + 1}</span>
            <span style={{ color: r.vip.color }}>{r.vip.emoji}</span>
            <span className="font-semibold flex-1">{r.username}</span>
            <span className="text-xs text-muted hidden sm:inline">{r.gamesWon}/{r.gamesPlayed} won</span>
            <span className="font-bold text-[var(--gold)]">${r.money.toLocaleString()}</span>
          </div>
        ))}
        {rows.length === 0 && <div className="p-6 text-muted text-sm">No players yet.</div>}
      </div>
    </GameShell>
  );
}
