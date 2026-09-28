"use client";

import { useEffect, useRef, useState } from "react";

const SYMBOL_HEIGHT = 112;
const EXTRA_ROWS = 18;

/**
 * A single slot reel that spins through random symbols and eases to a stop
 * on `finalSymbol`. Call `spin()` (via the `spinToken` prop changing) to
 * trigger a new spin; `onSettled` fires once the reel has visually stopped.
 */
export default function SlotReel({
  symbols,
  finalSymbol,
  spinToken,
  delayMs = 0,
  durationMs = 1600,
  onSettled,
}: {
  symbols: string[];
  finalSymbol: string;
  spinToken: number;
  delayMs?: number;
  durationMs?: number;
  onSettled?: () => void;
}) {
  const [strip, setStrip] = useState<string[]>([finalSymbol]);
  const [offset, setOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const randomRow = () => symbols[Math.floor(Math.random() * symbols.length)];
    const rows = Array.from({ length: EXTRA_ROWS }, randomRow).concat(finalSymbol);
    setStrip(rows);
    setTransitioning(false);
    setOffset(0);

    const startTimer = setTimeout(() => {
      setTransitioning(true);
      setOffset((rows.length - 1) * SYMBOL_HEIGHT);
    }, 20 + delayMs);

    const settleTimer = setTimeout(() => {
      onSettled?.();
    }, delayMs + durationMs + 60);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(settleTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  return (
    <div className="reel-window">
      <div
        className="reel-strip"
        style={{
          transform: `translateY(-${offset}px)`,
          transition: transitioning ? `transform ${durationMs}ms cubic-bezier(0.15, 0.85, 0.25, 1)` : "none",
        }}
      >
        {strip.map((s, i) => (
          <div className="reel-symbol" key={i}>
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}
