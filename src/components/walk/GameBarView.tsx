"use client";

import { dispatchAction, setBetMax, stepBet, useGameSession } from "./games/bridge";

const GOLD = "#ffd24a";

const chip: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 8,
  background: "rgba(255,255,255,0.12)",
  fontWeight: 800,
};

/**
 * The seated-game control strip at the bottom of the screen: result line, bet stepper, action buttons,
 * choices and number pickers, all described by the game's Controller through the bridge store.
 */
export default function GameBarView({ touch }: { touch: boolean }) {
  const bar = useGameSession((s) => s.bar);
  const bet = useGameSession((s) => s.bet);
  const busy = useGameSession((s) => s.busy);
  const locked = busy || !!bar.betLocked;
  const msg = bar.message;

  return (
    <div
      data-gamebar
      className="absolute flex flex-col items-center gap-2"
      style={{ bottom: 14, left: 0, right: 0, marginInline: "auto", width: "max-content", zIndex: 20, maxWidth: "94%", pointerEvents: "none" }}
    >
      <div
        className="flex flex-col items-center gap-2"
        style={{
          pointerEvents: "auto",
          background: "rgba(28,14,36,0.82)",
          border: `1px solid ${GOLD}`,
          borderRadius: 20,
          padding: "10px 16px",
          backdropFilter: "blur(6px)",
          color: "#fbefd5",
          fontSize: 14,
        }}
      >
        {msg && (
          <div
            className="font-extrabold"
            style={{ fontSize: 20, color: msg.kind === "win" ? "#7dffa6" : msg.kind === "lose" ? "#ff8f8f" : GOLD, textShadow: "0 1px 8px rgba(0,0,0,0.85)", textAlign: "center" }}
          >
            {msg.text}
          </div>
        )}
        {bar.status && <div style={{ opacity: 0.9, textAlign: "center" }}>{bar.status}</div>}

        {bar.choices?.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-center gap-1.5">
            <span style={{ opacity: 0.75 }}>{c.label}</span>
            {c.items.map((it) => (
              <button
                key={it.id}
                type="button"
                disabled={busy || it.disabled}
                onClick={() => dispatchAction(`${c.id}:${it.id}`)}
                className="font-bold"
                style={{
                  padding: "4px 11px",
                  borderRadius: 999,
                  fontSize: 13,
                  background: it.active ? GOLD : "rgba(255,255,255,0.12)",
                  color: it.active ? "#2a1630" : "#fbefd5",
                  opacity: busy || it.disabled ? 0.45 : 1,
                }}
              >
                {it.label}
              </button>
            ))}
          </div>
        ))}

        {bar.picker && (
          <div className="flex flex-col items-center gap-1">
            <span style={{ opacity: 0.75 }}>{bar.picker.label}</span>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${bar.picker.cols ?? 10}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: bar.picker.count }, (_, i) => (bar.picker!.first ?? 1) + i).map((n) => {
                const on = bar.picker!.selected.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={busy || bar.picker!.disabled}
                    onClick={() => dispatchAction(`${bar.picker!.id}:${n}`)}
                    className="font-bold"
                    style={{
                      width: touch ? 30 : 28,
                      height: 24,
                      borderRadius: 6,
                      fontSize: 12,
                      background: on ? GOLD : "rgba(255,255,255,0.12)",
                      color: on ? "#2a1630" : "#fbefd5",
                      opacity: busy || bar.picker!.disabled ? 0.5 : 1,
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2">
          {bar.bet && (
            <>
              <span style={{ opacity: 0.8 }}>Bet</span>
              <button type="button" disabled={locked} onClick={() => stepBet(-1)} style={{ ...chip, opacity: locked ? 0.4 : 1 }} aria-label="Lower bet">
                -
              </button>
              <b style={{ color: GOLD, minWidth: 64, textAlign: "center", fontSize: 18 }}>${bet.toLocaleString()}</b>
              <button type="button" disabled={locked} onClick={() => stepBet(1)} style={{ ...chip, opacity: locked ? 0.4 : 1 }} aria-label="Raise bet">
                +
              </button>
              <button type="button" disabled={locked} onClick={() => setBetMax()} className="font-bold" style={{ ...chip, width: "auto", padding: "0 10px", fontSize: 12, opacity: locked ? 0.4 : 1 }}>
                Max
              </button>
            </>
          )}
          {bar.buttons?.map((b, i) => {
            const off = busy || b.disabled;
            const primary = b.primary && !off;
            return (
              <button
                key={b.id}
                type="button"
                disabled={off}
                onClick={() => dispatchAction(b.id)}
                className="font-extrabold"
                style={{
                  padding: touch ? "11px 20px" : "7px 16px",
                  borderRadius: 999,
                  fontSize: 15,
                  color: primary ? "#2a1630" : b.tone === "danger" ? "#ffb4b4" : "#fbefd5",
                  background: primary ? "linear-gradient(#fff3cf,#ffd54a 55%,#ffb300)" : b.tone === "danger" ? "rgba(180,40,40,0.35)" : "rgba(255,255,255,0.14)",
                  boxShadow: primary ? "0 3px 0 #b8860b" : undefined,
                  opacity: off ? 0.45 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {!touch && i < 9 && <span style={{ opacity: 0.55, marginRight: 6, fontSize: 11 }}>{i + 1}</span>}
                {b.label}
                {!touch && b.primary && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 11 }}>[E]</span>}
              </button>
            );
          })}
        </div>

        {!touch && (
          <div style={{ fontSize: 12, opacity: 0.65, textAlign: "center" }}>
            {bar.hint ?? "Esc or W A S D to step away"}
            {bar.bet ? " · Up/Down bet" : ""}
            {bar.choices?.length ? " · Left/Right choice" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
