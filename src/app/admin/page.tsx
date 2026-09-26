"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameShell from "@/components/GameShell";
import { useUser } from "@/lib/UserContext";

interface AdminUser {
  id: number;
  username: string;
  money: number;
  is_dev: number;
  timeout_until: number;
}

export default function AdminPage() {
  const { user, pushToast } = useUser();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState(1000);
  const [minutes, setMinutes] = useState(5);

  async function load() {
    const res = await fetch("/api/admin");
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users);
    if (!target && data.users[0]) setTarget(data.users[0].username);
  }

  useEffect(() => {
    if (user && !user.isDev) router.replace("/");
    if (user?.isDev) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user || !user.isDev) return null;

  async function run(action: string, extra: Record<string, unknown> = {}) {
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, username: target, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) return pushToast("lose", data.error);
    pushToast("info", "Done");
    load();
  }

  return (
    <GameShell title="Admin" emoji="\u{1F451}" subtitle="Developer tools — give money, manage timeouts, reset balances.">
      <div className="panel p-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            {users.map((u) => (
              <option key={u.id} value={u.username}>
                {u.username} (${u.money.toLocaleString()})
              </option>
            ))}
          </select>
          <input type="number" className="w-32" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <button className="btn btn-accent text-sm" onClick={() => run("give_money", { amount })}>
            Give Money
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input type="number" className="w-24" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          <button className="btn btn-danger text-sm" onClick={() => run("timeout_user", { minutes })}>
            Timeout Player
          </button>
          <button className="btn btn-ghost text-sm" onClick={() => run("remove_timeout")}>
            Remove Timeout
          </button>
        </div>

        <div>
          <button className="btn btn-ghost text-sm" onClick={() => run("reset_all_money")}>
            Reset All Balances to $500
          </button>
        </div>
      </div>

      <div className="panel divide-y divide-[var(--border)]">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-2 text-sm">
            <span className="flex-1">{u.username}</span>
            {u.is_dev === 1 && <span className="text-[var(--gold)] text-xs">DEV</span>}
            {u.timeout_until > Date.now() && <span className="text-danger text-xs">TIMED OUT</span>}
            <span className="font-bold">${u.money.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </GameShell>
  );
}
