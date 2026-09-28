"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { PublicUser } from "./client-types";
import Confetti from "@/components/Confetti";

interface Toast {
  id: number;
  kind: "win" | "lose" | "info";
  text: string;
}

interface UserContextValue {
  user: PublicUser | null;
  jackpot: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (u: PublicUser | null) => void;
  toasts: Toast[];
  pushToast: (kind: Toast["kind"], text: string) => void;
  celebrate: () => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [jackpot, setJackpot] = useState(1000);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const [celebrating, setCelebrating] = useState(false);
  const celebrateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const celebrate = useCallback(() => {
    setCelebrating(true);
    if (celebrateTimer.current) clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrating(false), 2600);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) throw new Error(data?.error || `Server error (${res.status})`);
      setUser(data.user);
      setJackpot(data.jackpot);
    } catch (err) {
      console.error("Failed to load account:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const pushToast = useCallback((kind: Toast["kind"], text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  return (
    <UserContext.Provider value={{ user, jackpot, loading, refresh, setUser, toasts, pushToast, celebrate }}>
      {children}
      <Confetti active={celebrating} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-in panel px-4 py-3 text-sm font-semibold shadow-lg ${
              t.kind === "win"
                ? "border-success text-success"
                : t.kind === "lose"
                ? "border-danger text-danger"
                : "text-foreground"
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
