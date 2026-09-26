"use client";

import Link from "next/link";
import { useUser } from "@/lib/UserContext";
import AuthForm from "@/components/AuthForm";
import { GAMES } from "@/lib/gameList";

export default function Home() {
  const { user, jackpot, loading } = useUser();

  if (loading) return <div className="text-center py-20 text-muted">Loading the casino floor...</div>;
  if (!user) return <AuthForm />;

  return (
    <div className="flex flex-col gap-8">
      <div
        className="panel p-6 flex flex-col md:flex-row md:items-center gap-4"
        style={{ borderColor: user.vip.color }}
      >
        <div>
          <div className="text-sm text-muted">Welcome back</div>
          <div className="text-2xl font-extrabold">{user.username}</div>
          <div className="mt-1 flex items-center gap-2 text-sm" style={{ color: user.vip.color }}>
            <span>{user.vip.emoji}</span>
            <span className="font-semibold">{user.vip.name} VIP</span>
            {user.nextVip && (
              <span className="text-muted">
                &middot; ${(user.nextVip.min - user.money).toLocaleString()} to {user.nextVip.name}
              </span>
            )}
          </div>
        </div>
        <div className="md:ml-auto flex gap-6">
          <div>
            <div className="text-xs text-muted">Balance</div>
            <div className="text-2xl font-extrabold text-[var(--gold)]">${user.money.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Progressive Jackpot</div>
            <div className="text-2xl font-extrabold text-[var(--gold)] glow inline-block px-2 rounded">
              ${jackpot.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {user.money <= 0 && (
        <div className="panel p-4 border-danger text-danger text-sm">
          You&apos;re out of money! Claim your daily reward from the navbar to keep playing.
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold mb-3">Pick a game</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GAMES.map((g) => (
            <Link
              key={g.slug}
              href={`/games/${g.slug}`}
              className="panel p-5 flex flex-col gap-2 hover:border-[var(--gold)] transition-colors relative"
            >
              {g.tag && (
                <span className="absolute top-3 right-3 text-[10px] font-bold bg-[var(--accent)] text-white px-2 py-0.5 rounded-full">
                  {g.tag}
                </span>
              )}
              <div className="text-3xl">{g.emoji}</div>
              <div className="font-bold text-lg">{g.name}</div>
              <div className="text-sm text-muted">{g.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
