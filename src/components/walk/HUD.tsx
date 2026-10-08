"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { leaveFocus, useFocus } from "./inworld";
import { isInWorldGame } from "./games";
import GameBarView from "./GameBarView";
import { GAMES } from "@/lib/gameList";
import { useUser } from "@/lib/UserContext";
import Minimap from "./Minimap";
import { getWalkState, patchWalkState, useWalkState } from "./state";
import { ROOMS, SPAWN, type RoomId } from "./world";

const GOLD = "#ffd54a";
const CARD: React.CSSProperties = {
  background: "rgba(24,12,30,0.78)",
  border: "1px solid rgba(255,213,74,0.4)",
  borderRadius: 14,
  boxShadow: "0 8px 28px rgba(0,0,0,0.5)",
  backdropFilter: "blur(8px)",
  color: "#fbefd5",
};

function noopSubscribe() {
  return () => {};
}
function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function Key({ children, big }: { children: React.ReactNode; big?: boolean }) {
  return (
    <kbd
      className="inline-flex items-center justify-center font-mono font-bold"
      style={{
        minWidth: big ? 34 : 26,
        height: big ? 34 : 26,
        padding: "0 7px",
        fontSize: big ? 17 : 12,
        color: "#2a1630",
        background: "linear-gradient(#fff3cf,#ffd54a)",
        borderRadius: 7,
        boxShadow: "0 3px 0 #b8860b, 0 4px 8px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </kbd>
  );
}

function Joystick() {
  const zoneRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const R = 52;

  const reset = () => {
    pid.current = null;
    const base = baseRef.current;
    if (base) {
      base.style.left = "24px";
      base.style.top = "";
      base.style.bottom = "28px";
      base.style.opacity = "0.55";
    }
    if (knobRef.current) knobRef.current.style.transform = "translate(0px,0px)";
    patchWalkState({ touchMove: { x: 0, y: 0 } }, true);
  };

  const onDown = (e: React.PointerEvent) => {
    if (pid.current !== null) return;
    pid.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    const rect = zoneRef.current!.getBoundingClientRect();
    origin.current = { x: e.clientX, y: e.clientY };
    const base = baseRef.current!;
    base.style.left = `${e.clientX - rect.left - 60}px`;
    base.style.top = `${e.clientY - rect.top - 60}px`;
    base.style.bottom = "";
    base.style.opacity = "1";
    patchWalkState({ engaged: true }, true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pid.current) return;
    let dx = e.clientX - origin.current.x;
    let dy = e.clientY - origin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px,${dy}px)`;
    const mag = Math.min(d / R, 1);
    const dead = 0.12;
    const m = mag < dead ? 0 : Math.pow((mag - dead) / (1 - dead), 1.15);
    const len = Math.hypot(dx, dy) || 1;
    patchWalkState({ touchMove: { x: (dx / len) * m, y: (-dy / len) * m } }, true);
  };
  const onUp = (e: React.PointerEvent) => {
    if (e.pointerId === pid.current) reset();
  };

  return (
    <div
      ref={zoneRef}
      className="absolute bottom-0 left-0 z-10"
      style={{ width: "46%", height: "58%", pointerEvents: "auto", touchAction: "none" }}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div
        ref={baseRef}
        className="absolute"
        style={{
          left: 24,
          bottom: 28,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,213,74,0.10), rgba(255,213,74,0.22))",
          border: "2px solid rgba(255,213,74,0.55)",
          opacity: 0.55,
          transition: "opacity .15s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          ref={knobRef}
          style={{
            width: 54,
            height: 54,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, #fff3cf, #ffd54a 60%, #d99a00)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            transform: "translate(0px,0px)",
            willChange: "transform",
          }}
        />
      </div>
    </div>
  );
}

function LookPad() {
  const pid = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  return (
    <div
      className="absolute right-0 top-0 z-[5]"
      style={{ width: "54%", height: "100%", pointerEvents: "auto", touchAction: "none" }}
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = { x: e.clientX, y: e.clientY };
        patchWalkState({ engaged: true }, true);
      }}
      onPointerMove={(e) => {
        if (e.pointerId !== pid.current) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        const s = getWalkState();
        const pitch = Math.max(-1.35, Math.min(1.35, s.pitch - dy * 0.0045));
        patchWalkState({ yaw: s.yaw - dx * 0.0055, pitch });
      }}
      onPointerUp={(e) => {
        if (e.pointerId === pid.current) pid.current = null;
      }}
      onPointerCancel={(e) => {
        if (e.pointerId === pid.current) pid.current = null;
      }}
    />
  );
}

export default function HUD({
  containerRef,
  onInteract,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  onInteract: (slug: string) => void;
}) {
  const { user } = useUser();
  const touch = useSyncExternalStore(subscribeCoarse, () => window.matchMedia("(pointer: coarse)").matches, () => false);
  const debug = useSyncExternalStore(noopSubscribe, () => new URLSearchParams(window.location.search).has("debug"), () => false);
  const walk = useWalkState((s) => s);
  const { near, room, engaged } = walk;

  const [ever, setEver] = useState(false);
  if (engaged && !ever) setEver(true);

  const [moved, setMoved] = useState(false);
  if (!moved) {
    const dist = Math.hypot(walk.x - SPAWN.x, walk.z - SPAWN.z);
    if (dist > 0.8 || walk.touchMove.x !== 0 || walk.touchMove.y !== 0) setMoved(true);
  }
  const [pinned, setPinned] = useState(false);

  // room banner: shown whenever the room changes after the first engagement
  const [seenRoom, setSeenRoom] = useState<RoomId | null>(null);
  const [banner, setBanner] = useState<RoomId | null>(null);
  const [bannerOn, setBannerOn] = useState(false);
  if (ever && room && room !== seenRoom) {
    setSeenRoom(room);
    setBanner(room);
    setBannerOn(true);
  }
  useEffect(() => {
    if (!bannerOn) return;
    const t = setTimeout(() => setBannerOn(false), 2600);
    return () => clearTimeout(t);
  }, [banner, bannerOn]);

  const [fs, setFs] = useState(false);
  useEffect(() => {
    const onChange = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFs = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void containerRef.current?.requestFullscreen?.();
    } catch {
      /* fullscreen not supported */
    }
  };

  const game = near ? GAMES.find((g) => g.slug === near) : undefined;
  const focus = useFocus();
  const showHelp = pinned || !moved;
  const showStart = !touch && !engaged && !moved && !pinned;
  const showResume = !touch && !engaged && moved && !pinned && !focus;
  const bannerRoom = banner ? ROOMS[banner] : null;

  const iconBtn: React.CSSProperties = {
    ...CARD,
    pointerEvents: "auto",
    height: 36,
    minWidth: 36,
    padding: "0 10px",
    borderRadius: 18,
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  };

  return (
    <div className="absolute inset-0 select-none overflow-hidden" style={{ pointerEvents: "none", zIndex: 10 }}>
      {touch && <LookPad />}
      {touch && <Joystick />}

      {/* crosshair */}
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: near ? 9 : 5,
          height: near ? 9 : 5,
          marginLeft: near ? -4.5 : -2.5,
          marginTop: near ? -4.5 : -2.5,
          borderRadius: "50%",
          background: near ? GOLD : "rgba(255,255,255,0.85)",
          boxShadow: "0 0 0 1.5px rgba(0,0,0,0.45)",
          transition: "all .15s",
        }}
      />

      {/* top-left cluster */}
      <div className="absolute left-3 top-3 z-20 flex items-center gap-2">
        {user && (
          <div style={{ ...CARD, borderRadius: 18, height: 36, padding: "0 14px", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <span aria-hidden>{"\u{1FA99}"}</span>
            <span className="font-bold tabular-nums" style={{ color: GOLD }}>
              {Math.floor(user.money).toLocaleString()}
            </span>
          </div>
        )}
        <button type="button" style={iconBtn} onClick={() => setPinned((p) => !p)} aria-label="Controls help" title="Controls">
          ?
        </button>
        <button type="button" style={iconBtn} onClick={toggleFs} aria-label="Toggle fullscreen" title="Fullscreen">
          {fs ? "⤡" : "⛶"}
        </button>
      </div>

      <Minimap />

      {/* debug */}
      {debug && (
        <div
          className="absolute bottom-2 right-2 font-mono text-[11px]"
          style={{ background: "rgba(0,0,0,0.6)", color: "#9fffa8", padding: "3px 7px", borderRadius: 6 }}
        >
          {Math.round(walk.fps)} fps · x {walk.x.toFixed(1)} z {walk.z.toFixed(1)} · {room ?? "-"}
          {near ? ` · near ${near}` : ""}
        </div>
      )}

      {/* room banner */}
      <div
        className="absolute left-1/2 text-center"
        style={{
          top: "15%",
          transform: `translate(-50%, ${bannerOn ? 0 : -10}px)`,
          opacity: bannerOn ? 1 : 0,
          transition: "opacity .6s ease, transform .6s ease",
          width: "min(90%, 520px)",
        }}
      >
        {bannerRoom && (
          <>
            <div
              className="font-extrabold tracking-wide"
              style={{
                fontSize: "clamp(26px, 5vw, 44px)",
                color: GOLD,
                textShadow: `0 2px 0 #7a4a00, 0 0 24px ${bannerRoom.theme.accent}`,
                letterSpacing: "0.04em",
              }}
            >
              {bannerRoom.name}
            </div>
            <div
              className="mx-auto mt-1 inline-block"
              style={{
                fontSize: 15,
                color: "#fbefd5",
                fontStyle: "italic",
                textShadow: "0 1px 6px rgba(0,0,0,0.8)",
                borderTop: `1px solid ${bannerRoom.theme.accent}`,
                paddingTop: 4,
              }}
            >
              {bannerRoom.tagline}
            </div>
          </>
        )}
      </div>

      {/* seated at a game: the control strip + a way to stand up */}
      {focus && isInWorldGame(focus) && (
        <>
          <GameBarView touch={touch} />
          <button
            type="button"
            onClick={() => leaveFocus()}
            className="absolute font-bold"
            style={{ ...CARD, pointerEvents: "auto", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 20, borderRadius: 999, padding: "6px 16px", fontSize: 13 }}
          >
            Stand up {touch ? "" : "(Esc)"}
          </button>
        </>
      )}

      {/* interaction prompt (walking up to a game) */}
      {game && !focus && (
        <div className="absolute left-1/2 flex flex-col items-center gap-2" style={{ top: touch ? "40%" : "62%", transform: "translateX(-50%)", zIndex: 20, whiteSpace: "nowrap" }}>
          <div style={{ ...CARD, borderRadius: 999, padding: "9px 18px", display: touch ? "none" : "flex", alignItems: "center", gap: 10, border: `1px solid ${GOLD}` }}>
            <span style={{ fontSize: 22 }}>{game.emoji}</span>
            <span>Press</span>
            <Key big>E</Key>
            <span>
              to play <b style={{ color: GOLD }}>{game.name}</b>
            </span>
          </div>
          {touch && (
            <button
              type="button"
              onClick={() => onInteract(game.slug)}
              className="font-extrabold"
              style={{
                pointerEvents: "auto",
                padding: "14px 44px",
                fontSize: 20,
                borderRadius: 999,
                color: "#2a1630",
                background: "linear-gradient(#fff3cf,#ffd54a 55%,#ffb300)",
                boxShadow: "0 5px 0 #b8860b, 0 8px 18px rgba(0,0,0,0.5)",
              }}
            >
              Play {game.name}
            </button>
          )}
        </div>
      )}

      {/* start panel + controls help */}
      {(showStart || showHelp) && (
        <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: showStart ? "rgba(14,7,18,0.45)" : "transparent" }}>
          <div className="text-center" style={{ ...CARD, padding: "22px 28px", maxWidth: 420, width: "100%" }}>
            {showStart && (
              <div className="mb-3 font-extrabold" style={{ fontSize: 24, color: GOLD }}>
                Click to look around
              </div>
            )}
            {!showStart && (
              <div className="mb-3 font-extrabold" style={{ fontSize: 18, color: GOLD }}>
                Controls
              </div>
            )}
            {touch ? (
              <p className="text-sm" style={{ opacity: 0.9 }}>
                Left thumb to walk, drag on the right side to look. Walk up to a table or machine and tap Play.
              </p>
            ) : (
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-left text-sm">
                <span className="flex gap-1 justify-self-start"><Key>W</Key><Key>A</Key><Key>S</Key><Key>D</Key></span>
                <span>Move</span>
                <span>Mouse</span>
                <span>Look around</span>
                <span className="justify-self-start"><Key>Shift</Key></span>
                <span>Sprint</span>
                <span className="justify-self-start"><Key>E</Key></span>
                <span>Interact / play</span>
                {!touch && <span className="justify-self-start"><Key>M</Key></span>}
                {!touch && <span>Map</span>}
                <span className="justify-self-start"><Key>Esc</Key></span>
                <span>Release mouse</span>
              </div>
            )}
          </div>
        </div>
      )}

      {showResume && (
        <div
          className="absolute bottom-6 left-1/2"
          style={{ ...CARD, transform: "translateX(-50%)", padding: "8px 18px", borderRadius: 999, fontSize: 14 }}
        >
          Click to resume walking
        </div>
      )}
      {touch && !ever && (
        <div className="absolute bottom-6 right-4 text-xs" style={{ ...CARD, padding: "6px 12px", borderRadius: 999 }}>
          Drag here to look
        </div>
      )}
    </div>
  );
}
