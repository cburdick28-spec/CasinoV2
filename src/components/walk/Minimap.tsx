"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { GAMES } from "@/lib/gameList";
import { useWalkState, type WalkState } from "./state";
import { DOORS, ROOM_ORDER, ROOMS, STATIONS, WORLD_BOUNDS } from "./world";

const SPAN_X = WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX;
const SPAN_Z = WORLD_BOUNDS.maxZ - WORLD_BOUNDS.minZ;
const ASPECT = SPAN_Z / SPAN_X + 0.08;
const GOLD = "#ffd54a";

function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}

function drawMap(canvas: HTMLCanvasElement, w: number, h: number, large: boolean, s: WalkState) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = large ? 28 : 10;
  const scale = Math.min((w - pad * 2) / SPAN_X, (h - pad * 2) / SPAN_Z);
  const ox = (w - SPAN_X * scale) / 2 - WORLD_BOUNDS.minX * scale;
  const oz = (h - SPAN_Z * scale) / 2 - WORLD_BOUNDS.minZ * scale;
  const px = (x: number) => ox + x * scale;
  const pz = (z: number) => oz + z * scale;

  // rooms
  for (const id of ROOM_ORDER) {
    const r = ROOMS[id];
    const b = r.bounds;
    const current = s.room === id;
    ctx.globalAlpha = current ? 1 : 0.62;
    ctx.fillStyle = r.theme.floor;
    ctx.fillRect(px(b.minX), pz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    if (current) {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = r.theme.light;
      ctx.fillRect(px(b.minX), pz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = current ? 2 : 1;
    ctx.strokeStyle = current ? GOLD : r.theme.trim;
    ctx.globalAlpha = current ? 1 : 0.55;
    ctx.strokeRect(px(b.minX), pz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
    ctx.globalAlpha = 1;
    if (large) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "600 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(r.name.toUpperCase(), px((b.minX + b.maxX) / 2), pz(b.maxZ) - 12);
    }
  }

  // doors
  ctx.strokeStyle = "#ffe9a8";
  ctx.lineWidth = Math.max(2.5, 0.6 * scale);
  ctx.lineCap = "butt";
  for (const d of DOORS) {
    const [cx, cz] = d.center;
    const half = d.width / 2;
    ctx.beginPath();
    if (d.axis === "x") {
      ctx.moveTo(px(cx - half), pz(cz));
      ctx.lineTo(px(cx + half), pz(cz));
    } else {
      ctx.moveTo(px(cx), pz(cz - half));
      ctx.lineTo(px(cx), pz(cz + half));
    }
    ctx.stroke();
  }

  // stations
  const t = performance.now() / 1000;
  for (const st of STATIONS) {
    const x = px(st.position[0]);
    const z = pz(st.position[1]);
    const near = s.near === st.slug;
    const game = GAMES.find((g) => g.slug === st.slug);
    const accent = ROOMS[st.room].theme.accent;
    if (large) {
      ctx.fillStyle = near ? GOLD : "rgba(10,6,16,0.75)";
      ctx.strokeStyle = near ? "#fff" : accent;
      ctx.lineWidth = near ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(x, z, near ? 13 : 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = `${near ? 15 : 13}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(game?.emoji ?? "?", x, z + 1);
      if (near && game) {
        ctx.font = "700 12px system-ui, sans-serif";
        ctx.fillStyle = GOLD;
        ctx.fillText(game.name, x, z - 21);
      }
    } else {
      if (near) {
        ctx.strokeStyle = GOLD;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 6);
        ctx.beginPath();
        ctx.arc(x, z, 6.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = near ? GOLD : accent;
      ctx.beginPath();
      ctx.arc(x, z, near ? 3.8 : 2.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // player arrow (yaw 0 looks +z, which is down the map)
  const ang = Math.atan2(Math.cos(s.yaw), Math.sin(s.yaw));
  const size = large ? 11 : 7.5;
  ctx.save();
  ctx.translate(px(s.x), pz(s.z));
  ctx.rotate(ang);
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 8;
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#1a0f1c";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, size * 0.65);
  ctx.lineTo(-size * 0.3, 0);
  ctx.lineTo(-size * 0.7, -size * 0.65);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
}

function MapCanvas({ w, large }: { w: number; large: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const s = useWalkState((st) => st);
  const h = Math.round(w * ASPECT);
  useEffect(() => {
    if (ref.current) drawMap(ref.current, w, h, large, s);
  }, [s, w, h, large]);
  return <canvas ref={ref} style={{ width: w, height: h, display: "block" }} />;
}

export default function Minimap() {
  const [open, setOpen] = useState(false);
  const vw = useSyncExternalStore(
    subscribeResize,
    () => window.innerWidth,
    () => 1200
  );
  const smallW = vw < 640 ? 128 : 180;
  const largeW = Math.min(vw - 32, 760);
  const room = useWalkState((s) => s.room);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "KeyM") setOpen((o) => !o);
      else if (e.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open map"
        className="absolute right-3 top-3 z-20 overflow-hidden text-left transition-transform hover:scale-[1.03]"
        style={{
          pointerEvents: "auto",
          background: "rgba(20,10,26,0.72)",
          border: "1px solid rgba(255,213,74,0.45)",
          borderRadius: 14,
          boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
          padding: 0,
        }}
      >
        <MapCanvas w={smallW} large={false} />
        <span
          className="absolute left-2 top-1 text-[10px] font-semibold tracking-wide"
          style={{ color: "rgba(255,233,168,0.85)" }}
        >
          {room ? ROOMS[room].name : "Outside"} · M
        </span>
      </button>

      {open && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ pointerEvents: "auto", background: "rgba(10,5,14,0.55)", backdropFilter: "blur(3px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative"
            style={{
              background: "rgba(24,12,30,0.94)",
              border: "1px solid rgba(255,213,74,0.55)",
              borderRadius: 18,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              padding: 8,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MapCanvas w={largeW} large />
            <div className="flex items-center justify-between px-3 pb-2 pt-1 text-xs" style={{ color: "#e9d9b8" }}>
              <span className="font-semibold" style={{ color: GOLD }}>
                Casino map
              </span>
              <span>
                Press <kbd className="rounded border border-white/30 px-1.5 py-0.5 font-mono">M</kbd> or Esc to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
