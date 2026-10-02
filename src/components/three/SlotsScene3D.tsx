"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const EXTRA_ROWS = 18;
const SYMBOL_SPACING = 1.05;
const WINDOW_SIZE = 0.82;

/** Canvas-texture cache so each emoji symbol is only rasterized once. */
const textureCache = new Map<string, THREE.CanvasTexture>();
function symbolTexture(symbol: string): THREE.CanvasTexture {
  const cached = textureCache.get(symbol);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 160;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "104px sans-serif";
  ctx.fillText(symbol, canvas.width / 2, canvas.height / 2 + 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(symbol, texture);
  return texture;
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function SymbolPlane({ symbol, y }: { symbol: string; y: number }) {
  const texture = useMemo(() => symbolTexture(symbol), [symbol]);
  return (
    <mesh position={[0, y, 0]}>
      <planeGeometry args={[WINDOW_SIZE, WINDOW_SIZE]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  );
}

/**
 * One vertical reel: a strip of stacked symbol planes inside a `group` that
 * translates in Y. Mirrors `SlotReel.tsx`'s spin-then-settle timing exactly,
 * just driven by `Date.now()` timestamps + `useFrame` instead of a CSS
 * transition, and lands on the real `finalSymbol` from the server response.
 */
function ReelColumn({
  x,
  symbols,
  finalSymbol,
  spinToken,
  delayMs,
  durationMs,
  onSettled,
}: {
  x: number;
  symbols: string[];
  finalSymbol: string;
  spinToken: number;
  delayMs: number;
  durationMs: number;
  onSettled?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [strip, setStrip] = useState<string[]>([finalSymbol]);
  const phaseRef = useRef<"idle" | "pending" | "running" | "done">("idle");
  const startAtRef = useRef(0);
  const firstRun = useRef(true);
  const settledRef = useRef(false);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const randomRow = () => symbols[Math.floor(Math.random() * symbols.length)];
    const rows = Array.from({ length: EXTRA_ROWS }, randomRow).concat(finalSymbol);
    setStrip(rows);
    settledRef.current = false;
    phaseRef.current = "pending";
    startAtRef.current = Date.now() + delayMs;
    if (groupRef.current) groupRef.current.position.y = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinToken]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g || phaseRef.current === "idle" || phaseRef.current === "done") return;
    const now = Date.now();
    if (phaseRef.current === "pending") {
      if (now >= startAtRef.current) phaseRef.current = "running";
      return;
    }
    const n = strip.length;
    const t = Math.min(1, (now - startAtRef.current) / durationMs);
    g.position.y = easeOut(t) * (n - 1) * SYMBOL_SPACING;
    if (t >= 1 && !settledRef.current) {
      settledRef.current = true;
      phaseRef.current = "done";
      onSettled?.();
    }
  });

  return (
    <group position={[x, 0, 0]}>
      {/* cabinet backdrop behind the strip */}
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[0.98, 1.05, 0.06]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>

      <group ref={groupRef}>
        {strip.map((s, i) => (
          <SymbolPlane key={i} symbol={s} y={-i * SYMBOL_SPACING} />
        ))}
      </group>

      {/* occluders — stand in for the CSS reel-window's overflow:hidden, masking
          every symbol above/below the single-symbol viewing window */}
      <mesh position={[0, 0.78, 0.05]}>
        <boxGeometry args={[1.02, 0.68, 0.22]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>
      <mesh position={[0, -0.78, 0.05]}>
        <boxGeometry args={[1.02, 0.68, 0.22]} />
        <meshStandardMaterial color="#0d0d1a" />
      </mesh>
    </group>
  );
}

export default function SlotsScene3D({
  symbols,
  finalReels,
  spinToken,
  reelTiming,
  onReelSettled,
}: {
  symbols: string[];
  finalReels: string[];
  spinToken: number;
  reelTiming: { delayMs: number; durationMs: number }[];
  onReelSettled?: () => void;
}) {
  const lightColors = ["#ffd54a", "#ff5470", "#34d399"];
  return (
    <group position={[0, -0.1, 0]}>
      {/* cabinet shell */}
      <mesh position={[0, 0, -0.2]}>
        <boxGeometry args={[3.9, 2.3, 0.28]} />
        <meshStandardMaterial color="#7c1f3a" metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.78, 0.05]}>
        <boxGeometry args={[3.5, 0.18, 0.1]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, -0.78, 0.05]}>
        <boxGeometry args={[3.5, 0.18, 0.1]} />
        <meshStandardMaterial color="#ffd54a" metalness={0.7} roughness={0.3} />
      </mesh>

      {[-1.15, 0, 1.15].map((x, i) => (
        <mesh key={i} position={[x, 1.02, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.08, 16]} />
          <meshStandardMaterial color={lightColors[i]} emissive={lightColors[i]} emissiveIntensity={0.6} />
        </mesh>
      ))}

      {finalReels.map((s, i) => (
        <ReelColumn
          key={i}
          x={(i - 1) * 1.15}
          symbols={symbols}
          finalSymbol={s}
          spinToken={spinToken}
          delayMs={reelTiming[i]?.delayMs ?? 0}
          durationMs={reelTiming[i]?.durationMs ?? 1500}
          onSettled={onReelSettled}
        />
      ))}
    </group>
  );
}
