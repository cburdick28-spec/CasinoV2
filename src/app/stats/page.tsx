"use client";

import GameShell from "@/components/GameShell";
import { useUser } from "@/lib/UserContext";

export default function StatsPage() {
  const { user } = useUser();
  if (!user) return null;
  const { stats } = user;
  const winRate = stats.gamesPlayed > 0 ? ((stats.gamesWon / stats.gamesPlayed) * 100).toFixed(1) : "0.0";

  const tiles = [
    { label: "Games Played", value: stats.gamesPlayed.toLocaleString() },
    { label: "Games Won", value: stats.gamesWon.toLocaleString() },
    { label: "Games Lost", value: stats.gamesLost.toLocaleString() },
    { label: "Win Rate", value: `${winRate}%` },
    { label: "Total Wagered", value: `$${stats.totalWagered.toLocaleString()}` },
    { label: "Total Won", value: `$${stats.totalWon.toLocaleString()}` },
    { label: "Biggest Win", value: `$${stats.biggestWin.toLocaleString()}` },
    { label: "Daily Streak", value: `${user.dailyStreak} days` },
  ];

  return (
    <GameShell title="Stats" emoji="\u{1F4CA}" subtitle="Your lifetime performance across every game.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-4 text-center">
            <div className="text-2xl font-extrabold text-[var(--gold)]">{t.value}</div>
            <div className="text-xs text-muted mt-1">{t.label}</div>
          </div>
        ))}
      </div>
    </GameShell>
  );
}
