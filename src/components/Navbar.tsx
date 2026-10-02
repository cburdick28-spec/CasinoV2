"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import { useState } from "react";
import Money from "@/components/Money";

const NAV_LINKS = [
  { href: "/", label: "Lobby" },
  { href: "/floor", label: "3D Floor" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
  { href: "/history", label: "History" },
  { href: "/profile", label: "Profile" },
  { href: "/chat", label: "Chat" },
];

export default function Navbar() {
  const { user, jackpot, refresh, setUser } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [claiming, setClaiming] = useState(false);
  const [open, setOpen] = useState(false);

  if (!user) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  const today = new Date().toISOString().slice(0, 10);
  const canClaim = user.lastDaily !== today;

  async function claimDaily() {
    setClaiming(true);
    const res = await fetch("/api/daily", { method: "POST" });
    setClaiming(false);
    if (res.ok) {
      await refresh();
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[#0b0d1acc] backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="text-xl font-extrabold gold-text whitespace-nowrap">
          🎰 Ultimate Casino
        </Link>

        <nav className="hidden md:flex items-center gap-1 ml-2">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === l.href
                  ? "bg-white/10 text-[var(--gold)]"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user.isDev && (
            <Link
              href="/admin"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === "/admin" ? "bg-white/10 text-[var(--gold)]" : "text-muted hover:text-foreground"
              }`}
            >
              👑 Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden sm:block text-xs text-muted text-right">
            <div>💰 Jackpot</div>
            <Money value={jackpot} className="font-bold text-[var(--gold)]" />
          </div>

          {canClaim && (
            <button className="btn btn-gold text-xs !py-1.5" onClick={claimDaily} disabled={claiming}>
              🎁 Daily
            </button>
          )}

          <div className="panel px-3 py-1.5 flex items-center gap-2">
            <span style={{ color: user.vip.color }}>{user.vip.emoji}</span>
            <Money value={user.money} className="font-bold" />
          </div>

          <button className="md:hidden btn btn-ghost !p-2" onClick={() => setOpen((o) => !o)}>
            ☰
          </button>
          <button className="hidden md:inline-flex btn btn-ghost text-xs" onClick={logout}>
            Logout
          </button>
        </div>
      </div>

      {open && (
        <nav className="md:hidden flex flex-col border-t border-[var(--border)] px-4 py-2">
          {NAV_LINKS.concat(user.isDev ? [{ href: "/admin", label: "👑 Admin" }] : []).map((l) => (
            <Link key={l.href} href={l.href} className="py-2 text-sm" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <button className="py-2 text-left text-sm text-danger" onClick={logout}>
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
