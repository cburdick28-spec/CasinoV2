"use client";

import GameShell from "@/components/GameShell";
import { useUser } from "@/lib/UserContext";
import { ACHIEVEMENTS, VIP_TIERS } from "@/lib/vip";

export default function ProfilePage() {
  const { user } = useUser();
  if (!user) return null;

  return (
    <GameShell title="Profile" emoji="\u{1F3AD}" subtitle="Your VIP progress and achievements.">
      <div className="panel p-6">
        <h3 className="font-bold mb-4">VIP Tiers</h3>
        <div className="flex flex-col gap-2">
          {VIP_TIERS.map((t) => {
            const reached = user.money >= t.min;
            return (
              <div
                key={t.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg ${reached ? "bg-white/5" : "opacity-40"}`}
              >
                <span style={{ color: t.color }} className="text-xl">
                  {t.emoji}
                </span>
                <span className="font-semibold flex-1" style={{ color: reached ? t.color : undefined }}>
                  {t.name}
                </span>
                <span className="text-xs text-muted">${t.min.toLocaleString()}+</span>
                {user.vip.name === t.name && <span className="text-xs text-[var(--gold)] font-bold">CURRENT</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="panel p-6">
        <h3 className="font-bold mb-4">
          Achievements ({user.achievements.length}/{ACHIEVEMENTS.length})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = user.achievements.includes(a.id);
            return (
              <div
                key={a.id}
                className={`panel !p-4 text-center flex flex-col items-center gap-1 ${unlocked ? "border-[var(--gold)]" : "opacity-40 grayscale"}`}
              >
                <div className="text-3xl">{a.emoji}</div>
                <div className="font-bold text-sm">{a.name}</div>
                <div className="text-xs text-muted">{a.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </GameShell>
  );
}
