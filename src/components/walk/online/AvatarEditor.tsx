"use client";

import { useEffect, useState } from "react";
import { CLOTHING, DEFAULT_AVATAR, HAIR_COLORS, HAIR_STYLES, HATS, SKIN_TONES, sanitizeAvatar, type AvatarConfig } from "@/lib/avatar";

const GOLD = "#f2c14e";

/** Flat SVG preview so the editor needs no second WebGL canvas. */
function Preview({ a }: { a: AvatarConfig }) {
  return (
    <svg viewBox="0 0 120 200" width={120} height={200} aria-label="Avatar preview">
      <rect x="38" y="112" width="18" height="72" rx="9" fill={a.pants} />
      <rect x="64" y="112" width="18" height="72" rx="9" fill={a.pants} />
      <rect x="36" y="180" width="22" height="9" rx="4" fill="#17131a" />
      <rect x="62" y="180" width="22" height="9" rx="4" fill="#17131a" />
      <rect x="30" y="58" width="60" height="64" rx="26" fill={a.shirt} />
      <rect x="16" y="62" width="14" height="52" rx="7" fill={a.shirt} />
      <rect x="90" y="62" width="14" height="52" rx="7" fill={a.shirt} />
      <circle cx="23" cy="118" r="8" fill={a.skin} />
      <circle cx="97" cy="118" r="8" fill={a.skin} />
      <rect x="53" y="48" width="14" height="16" fill={a.skin} />
      {a.hairStyle === 2 && <rect x="36" y="22" width="48" height="52" rx="22" fill={a.hair} />}
      <circle cx="60" cy="38" r="24" fill={a.skin} />
      <circle cx="51" cy="40" r="3" fill="#14141c" />
      <circle cx="69" cy="40" r="3" fill="#14141c" />
      {a.hairStyle === 1 && <path d="M36 36 A24 24 0 0 1 84 36 L84 30 A24 24 0 0 0 36 30 Z" fill={a.hair} />}
      {a.hairStyle === 1 && <path d="M36 38 A24 24 0 0 1 84 38 Q60 20 36 38Z" fill={a.hair} />}
      {a.hairStyle === 2 && <path d="M35 40 A25 25 0 0 1 85 40 Q60 18 35 40Z" fill={a.hair} />}
      {a.hairStyle === 3 && [40, 50, 60, 70, 80].map((x) => <polygon key={x} points={`${x - 6},24 ${x},4 ${x + 6},24`} fill={a.hair} />)}
      {a.hat === 1 && (
        <g>
          <rect x="30" y="18" width="60" height="6" rx="3" fill="#14141c" />
          <rect x="42" y="-8" width="36" height="28" rx="3" fill="#14141c" />
          <rect x="42" y="10" width="36" height="6" fill="#c1273a" />
        </g>
      )}
      {a.hat === 2 && (
        <g>
          <path d="M36 28 A24 22 0 0 1 84 28Z" fill={a.shirt} />
          <rect x="52" y="24" width="40" height="6" rx="3" fill={a.shirt} />
        </g>
      )}
      {a.hat === 3 && (
        <g fill={GOLD}>
          <polygon points="38,22 38,2 49,12 60,-2 71,12 82,2 82,22" />
        </g>
      )}
    </svg>
  );
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span style={{ width: 54, fontSize: 12, opacity: 0.75 }}>{label}</span>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          aria-label={`${label} ${c}`}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: c,
            border: value === c ? `2.5px solid ${GOLD}` : "2px solid rgba(255,255,255,0.25)",
            cursor: "pointer",
            padding: 0,
          }}
        />
      ))}
    </div>
  );
}

function Chips({ label, items, value, onPick }: { label: string; items: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ width: 54, fontSize: 12, opacity: 0.75 }}>{label}</span>
      {items.map((t, i) => (
        <button
          key={t}
          type="button"
          onClick={() => onPick(i)}
          style={{
            padding: "4px 10px",
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.2)",
            background: value === i ? GOLD : "rgba(255,255,255,0.08)",
            color: value === i ? "#1a1230" : "#f5ecd8",
          }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

export default function AvatarEditor({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [state, setState] = useState<"loading" | "idle" | "saving" | "error">("loading");

  useEffect(() => {
    let live = true;
    fetch("/api/avatar")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live) return;
        if (d?.avatar) setA(sanitizeAvatar(d.avatar));
        setState("idle");
      })
      .catch(() => live && setState("idle"));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Escape") onClose();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const set = <K extends keyof AvatarConfig>(k: K, v: AvatarConfig[K]) => setA((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setState("saving");
    try {
      const r = await fetch("/api/avatar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: a }) });
      if (!r.ok) throw new Error();
      onClose();
    } catch {
      setState("error");
    }
  };

  return (
    <div
      data-avatar-editor
      className="absolute inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(10,6,14,0.7)", pointerEvents: "auto" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "rgba(28,18,34,0.96)",
          border: `1px solid ${GOLD}`,
          borderRadius: 16,
          padding: 18,
          display: "flex",
          gap: 20,
          color: "#f5ecd8",
          maxWidth: "94%",
          maxHeight: "92%",
          overflowY: "auto",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 14 }}>
          <Preview a={a} />
          <button type="button" onClick={() => setA(DEFAULT_AVATAR)} style={{ fontSize: 12, opacity: 0.7, background: "none", border: "none", color: "inherit", cursor: "pointer" }}>
            Reset
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 260 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: GOLD }}>Your avatar</div>
          <Swatches label="Skin" colors={SKIN_TONES} value={a.skin} onPick={(c) => set("skin", c)} />
          <Swatches label="Shirt" colors={CLOTHING} value={a.shirt} onPick={(c) => set("shirt", c)} />
          <Swatches label="Pants" colors={CLOTHING} value={a.pants} onPick={(c) => set("pants", c)} />
          <Chips label="Hair" items={HAIR_STYLES} value={a.hairStyle} onPick={(i) => set("hairStyle", i)} />
          <Swatches label="Colour" colors={HAIR_COLORS} value={a.hair} onPick={(c) => set("hair", c)} />
          <Chips label="Hat" items={HATS} value={a.hat} onPick={(i) => set("hat", i)} />
          {state === "error" && <div style={{ color: "#ff8a8a", fontSize: 12 }}>Could not save. Are you logged in?</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button
              type="button"
              onClick={save}
              disabled={state === "saving" || state === "loading"}
              style={{ flex: 1, padding: "8px 14px", borderRadius: 18, fontWeight: 800, border: "none", cursor: "pointer", background: GOLD, color: "#1a1230", opacity: state === "saving" ? 0.6 : 1 }}
            >
              {state === "saving" ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: "8px 14px", borderRadius: 18, fontWeight: 700, cursor: "pointer", border: "1px solid rgba(255,255,255,0.25)", background: "transparent", color: "inherit" }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
