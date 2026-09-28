"use client";

import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/lib/useCountUp";

export default function Money({ value, className = "" }: { value: number; className?: string }) {
  const display = useCountUp(value, 600);
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (value > prev.current) setFlash("up");
    else if (value < prev.current) setFlash("down");
    prev.current = value;
    if (value !== display) {
      const t = setTimeout(() => setFlash(null), 650);
      return () => clearTimeout(t);
    }
  }, [value, display]);

  return (
    <span
      className={`count-up ${className}`}
      style={{ color: flash === "up" ? "var(--success)" : flash === "down" ? "var(--danger)" : undefined }}
    >
      ${display.toLocaleString()}
    </span>
  );
}
