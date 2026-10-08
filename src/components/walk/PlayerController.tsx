"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EYE_HEIGHT, roomAt } from "./world";
import { moveCircle, nearestStation, nearestValidPosition } from "./collision";
import { getWalkState, patchWalkState } from "./state";

declare global {
  interface Window {
    __casino?: {
      teleport: (x: number, z: number, yawDeg: number, pitchDeg: number) => void;
      getState: () => {
        x: number;
        z: number;
        yaw: number;
        pitch: number;
        room: string | null;
        near: string | null;
        fps: number;
      };
    };
  }
}

const WALK_SPEED = 4.4; // m/s
const SPRINT_SPEED = 7.4;
const ACCEL_RATE = 11; // 1/s, how fast velocity chases the target while keys are held
const FRICTION_RATE = 9; // 1/s, how fast it decays when nothing is held
const MAX_DELTA = 0.12;
const LOOK_SPEED = 0.0022; // rad per pixel, same feel as the three.js pointer lock example
const DRAG_LOOK_SPEED = 0.0034; // click-drag fallback, a touch quicker because pixels are fewer
const PITCH_LIMIT = (80 * Math.PI) / 180;
const BOB_AMPLITUDE = 0.022; // metres
const BOB_STRIDE = 2.1; // radians of bob phase per metre travelled

const MOVE_KEYS: Record<string, "f" | "b" | "l" | "r"> = {
  KeyW: "f",
  ArrowUp: "f",
  KeyS: "b",
  ArrowDown: "b",
  KeyA: "l",
  ArrowLeft: "l",
  KeyD: "r",
  ArrowRight: "r",
};

function typingTarget(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

const clampPitch = (p: number) => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));

export default function PlayerController({ onInteract }: { onInteract: (slug: string) => void }) {
  const getThree = useThree((s) => s.get);

  const onInteractRef = useRef(onInteract);
  useEffect(() => {
    onInteractRef.current = onInteract;
  }, [onInteract]);

  // Simulation state lives in a ref so the frame loop never touches React state.
  const sim = useRef({
    x: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    vx: 0,
    vz: 0,
    bobPhase: 0,
    bobAmp: 0,
    fps: 60,
    room: null as string | null,
    near: null as string | null,
    // What we last wrote to the store, so outside writes (reset, HUD) can be adopted.
    wx: NaN,
    wz: NaN,
    wyaw: NaN,
    wpitch: NaN,
    keys: { f: false, b: false, l: false, r: false, sprint: false },
    reducedMotion: false,
    locked: false,
    dragging: false,
  });

  // Initial pose from the store, camera setup.
  useEffect(() => {
    const s = sim.current;
    const w = getWalkState();
    s.x = w.x;
    s.z = w.z;
    s.yaw = w.yaw;
    s.pitch = w.pitch;
    s.room = w.room;
    s.near = w.near;
    const camera = getThree().camera;
    camera.rotation.order = "YXZ";
    camera.position.set(s.x, EYE_HEIGHT, s.z);
    camera.rotation.set(s.pitch, s.yaw + Math.PI, 0);
  }, [getThree]);

  // Input listeners.
  useEffect(() => {
    const s = sim.current;
    const canvas = getThree().gl.domElement;
    const doc = canvas.ownerDocument;
    const win = doc.defaultView ?? window;

    const mq = win.matchMedia?.("(prefers-reduced-motion: reduce)");
    s.reducedMotion = !!mq?.matches;
    const onMq = (e: MediaQueryListEvent) => {
      s.reducedMotion = e.matches;
    };
    mq?.addEventListener?.("change", onMq);

    const clearKeys = () => {
      s.keys.f = s.keys.b = s.keys.l = s.keys.r = s.keys.sprint = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (typingTarget()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const dir = MOVE_KEYS[e.code];
      if (dir) {
        s.keys[dir] = true;
        if (e.code.startsWith("Arrow")) e.preventDefault();
        return;
      }
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
        s.keys.sprint = true;
        return;
      }
      if (e.code === "KeyE" && !e.repeat) {
        const near = getWalkState().near;
        if (near) onInteractRef.current(near);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const dir = MOVE_KEYS[e.code];
      if (dir) s.keys[dir] = false;
      else if (e.code === "ShiftLeft" || e.code === "ShiftRight") s.keys.sprint = false;
    };

    const look = (dxPix: number, dyPix: number, speed: number) => {
      s.yaw -= dxPix * speed;
      s.pitch = clampPitch(s.pitch - dyPix * speed);
    };

    // Pointer lock look.
    const onMouseMove = (e: MouseEvent) => {
      if (doc.pointerLockElement !== canvas) return;
      // Some browsers emit one giant bogus delta when lock engages; ignore spikes.
      if (Math.abs(e.movementX) > 300 || Math.abs(e.movementY) > 300) return;
      look(e.movementX, e.movementY, LOOK_SPEED);
    };
    const onLockChange = () => {
      const locked = doc.pointerLockElement === canvas;
      s.locked = locked;
      patchWalkState({ engaged: locked || s.dragging }, true);
      if (!locked) clearKeys(); // released with a key held: do not keep walking
    };
    const onLockError = () => {
      // Denied or unsupported: click-drag look keeps working, so just mark engaged.
      s.locked = false;
      patchWalkState({ engaged: true }, true);
    };

    // Click-drag look (fallback, and the touch path).
    let dragId = -1;
    let lastX = 0;
    let lastY = 0;
    let travelled = 0;
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      if (s.locked) {
        const near = getWalkState().near;
        if (near) onInteractRef.current(near);
        return;
      }
      if (dragId !== -1) return;
      dragId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      travelled = 0;
      s.dragging = true;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic pointers can't be captured */
      }
      patchWalkState({ engaged: true }, true);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== dragId || s.locked) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      travelled += Math.abs(dx) + Math.abs(dy);
      look(dx, dy, DRAG_LOOK_SPEED);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId !== dragId) return;
      dragId = -1;
      s.dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* not captured */
      }
      // A plain click (not a drag) on a mouse tries to capture the pointer.
      if (e.type === "pointerup" && e.pointerType === "mouse" && travelled < 6 && !s.locked) {
        try {
          const p = canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
          p?.catch?.(() => onLockError());
        } catch {
          onLockError();
        }
      }
    };

    const onBlur = () => clearKeys();

    win.addEventListener("keydown", onKeyDown);
    win.addEventListener("keyup", onKeyUp);
    win.addEventListener("blur", onBlur);
    doc.addEventListener("mousemove", onMouseMove);
    doc.addEventListener("pointerlockchange", onLockChange);
    doc.addEventListener("pointerlockerror", onLockError);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    const prevTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";

    return () => {
      win.removeEventListener("keydown", onKeyDown);
      win.removeEventListener("keyup", onKeyUp);
      win.removeEventListener("blur", onBlur);
      doc.removeEventListener("mousemove", onMouseMove);
      doc.removeEventListener("pointerlockchange", onLockChange);
      doc.removeEventListener("pointerlockerror", onLockError);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      mq?.removeEventListener?.("change", onMq);
      canvas.style.touchAction = prevTouchAction;
      if (doc.pointerLockElement === canvas) doc.exitPointerLock();
      s.locked = false;
      s.dragging = false;
      clearKeys();
    };
  }, [getThree]);

  // Debug hook for the critics.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("debug")) return;
    const s = sim.current;
    const hook: NonNullable<Window["__casino"]> = {
      teleport(x, z, yawDeg, pitchDeg) {
        const p = nearestValidPosition(x, z);
        s.x = p.x;
        s.z = p.z;
        s.vx = 0;
        s.vz = 0;
        s.yaw = (yawDeg * Math.PI) / 180;
        s.pitch = clampPitch((pitchDeg * Math.PI) / 180);
        s.room = roomAt(s.x, s.z);
        s.near = nearestStation(s.x, s.z);
        s.wx = s.x;
        s.wz = s.z;
        s.wyaw = s.yaw;
        s.wpitch = s.pitch;
        patchWalkState({ x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch, room: s.room as never, near: s.near }, true);
      },
      getState() {
        const w = getWalkState();
        const deg = (r: number) => ((((r * 180) / Math.PI) % 360) + 360) % 360;
        return {
          x: w.x,
          z: w.z,
          yaw: deg(w.yaw),
          pitch: (w.pitch * 180) / Math.PI,
          room: w.room,
          near: w.near,
          fps: w.fps,
        };
      },
    };
    window.__casino = hook;
    return () => {
      if (window.__casino === hook) delete window.__casino;
    };
  }, []);

  useFrame((three, rawDelta) => {
    const s = sim.current;
    const dt = Math.min(rawDelta, MAX_DELTA);
    if (dt <= 0) return;
    const w = getWalkState();

    // Adopt outside writes to the pose (reset, HUD teleport) without fighting our own.
    if (w.x !== s.wx || w.z !== s.wz) {
      s.x = w.x;
      s.z = w.z;
      s.vx = 0;
      s.vz = 0;
    }
    if (w.yaw !== s.wyaw) s.yaw = w.yaw;
    if (w.pitch !== s.wpitch) s.pitch = w.pitch;

    // Input vector in player space: x strafe right, y forward.
    const k = s.keys;
    let ix = (k.r ? 1 : 0) - (k.l ? 1 : 0) + w.touchMove.x;
    let iy = (k.f ? 1 : 0) - (k.b ? 1 : 0) + w.touchMove.y;
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    const inputMag = Math.min(1, mag);

    // Player space to world space. Forward is (sin yaw, cos yaw), right is (-cos yaw, sin yaw).
    const sinY = Math.sin(s.yaw);
    const cosY = Math.cos(s.yaw);
    const speed = k.sprint && inputMag > 0 ? SPRINT_SPEED : WALK_SPEED;
    const tvx = (sinY * iy - cosY * ix) * speed;
    const tvz = (cosY * iy + sinY * ix) * speed;

    // Frame-rate independent exponential approach to the target velocity.
    const rate = inputMag > 0 ? ACCEL_RATE : FRICTION_RATE;
    const a = 1 - Math.exp(-rate * dt);
    s.vx += (tvx - s.vx) * a;
    s.vz += (tvz - s.vz) * a;
    if (inputMag === 0 && Math.abs(s.vx) + Math.abs(s.vz) < 0.01) {
      s.vx = 0;
      s.vz = 0;
    }

    // Move with collision; strip the velocity driving into whatever we touched so we slide.
    const dx = s.vx * dt;
    const dz = s.vz * dt;
    if (dx !== 0 || dz !== 0) {
      const r = moveCircle(s.x, s.z, dx, dz);
      s.x = r.x;
      s.z = r.z;
      if (r.hit) {
        const vn = s.vx * r.nx + s.vz * r.nz;
        if (vn < 0) {
          s.vx -= vn * r.nx;
          s.vz -= vn * r.nz;
        }
      }
    }

    // Head bob, driven by speed actually achieved, faded in and out.
    const planar = Math.hypot(s.vx, s.vz);
    const target = s.reducedMotion ? 0 : Math.min(1, planar / WALK_SPEED);
    s.bobAmp += (target - s.bobAmp) * (1 - Math.exp(-8 * dt));
    s.bobPhase += planar * BOB_STRIDE * dt;
    const bob = Math.sin(s.bobPhase) * BOB_AMPLITUDE * s.bobAmp;

    const cam = three.camera;
    cam.position.set(s.x, EYE_HEIGHT + bob, s.z);
    cam.rotation.set(s.pitch, s.yaw + Math.PI, 0);

    // Publish.
    const room = roomAt(s.x, s.z);
    const near = nearestStation(s.x, s.z);
    const changed = room !== s.room || near !== s.near;
    s.room = room;
    s.near = near;
    if (rawDelta > 0) s.fps += (Math.min(240, 1 / rawDelta) - s.fps) * 0.05;
    s.wx = s.x;
    s.wz = s.z;
    s.wyaw = s.yaw;
    s.wpitch = s.pitch;
    patchWalkState({ x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch, room, near, fps: Math.round(s.fps) }, changed);
  });

  return null;
}
