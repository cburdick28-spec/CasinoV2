"use client";

import { useState } from "react";
import { useUser } from "@/lib/UserContext";

export default function AuthForm() {
  const { refresh } = useUser();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    await refresh();
  }

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold gold-text">🎰 Ultimate Casino</h1>
        <p className="text-muted mt-2">Slots, blackjack, roulette, poker, crash, plinko & more.</p>
      </div>
      <div className="panel p-6">
        <div className="flex mb-5 rounded-lg overflow-hidden border border-[var(--border)]">
          <button
            className={`flex-1 py-2 text-sm font-semibold ${mode === "login" ? "bg-white/10 text-[var(--gold)]" : "text-muted"}`}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold ${mode === "register" ? "bg-white/10 text-[var(--gold)]" : "text-muted"}`}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={4}
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button className="btn btn-gold mt-2" disabled={loading}>
            {loading ? "..." : mode === "login" ? "Login" : "Create Account"}
          </button>
        </form>
        <p className="text-xs text-muted mt-4 text-center">
          New players start with $500. Everything here is play-money — no real gambling.
        </p>
      </div>
    </div>
  );
}
