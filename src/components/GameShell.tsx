"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/UserContext";
import Money from "@/components/Money";

export default function GameShell({
  title,
  emoji,
  subtitle,
  children,
}: {
  title: string;
  emoji: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  if (loading || !user) return <div className="text-center py-20 text-muted">Loading...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <span>{emoji}</span> {title}
          </h1>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
        <div className="panel px-4 py-2 text-sm">
          Balance: <Money value={user.money} className="font-bold text-[var(--gold)]" />
        </div>
      </div>
      {children}
    </div>
  );
}
