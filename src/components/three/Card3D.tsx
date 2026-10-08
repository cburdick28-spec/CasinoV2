"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Card } from "@/lib/types";

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const textureCache = new Map<string, THREE.CanvasTexture>();

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function faceTexture(card: Card): THREE.CanvasTexture {
  const key = `${card.rank}${card.suit}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const W = 512;
  const H = Math.round(512 * (358 / 256));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Transparent outside the rounded card so the mesh edge reads as a real card, not a white box.
  ctx.clearRect(0, 0, W, H);
  roundedRectPath(ctx, 6, 6, W - 12, H - 12, 34);
  ctx.save();
  ctx.clip();

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#ffffff");
  bg.addColorStop(1, "#eef0f5");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const red = card.suit === "H" || card.suit === "D";
  const inkColor = red ? "#c81e3f" : "#161616";
  ctx.fillStyle = inkColor;
  const symbol = SUIT_SYMBOL[card.suit];

  ctx.textBaseline = "top";
  ctx.font = "bold 92px Georgia, 'Times New Roman', serif";
  ctx.fillText(card.rank, 34, 24);
  ctx.font = "80px sans-serif";
  ctx.fillText(symbol, 36, 128);

  ctx.save();
  ctx.translate(W - 34, H - 24);
  ctx.rotate(Math.PI);
  ctx.textBaseline = "top";
  ctx.font = "bold 92px Georgia, 'Times New Roman', serif";
  ctx.fillText(card.rank, 0, 0);
  ctx.font = "80px sans-serif";
  ctx.fillText(symbol, 2, 106);
  ctx.restore();

  // Large watermark suit, softened, centered
  ctx.globalAlpha = 0.92;
  ctx.font = "260px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const grad = ctx.createLinearGradient(0, H / 2 - 150, 0, H / 2 + 150);
  grad.addColorStop(0, inkColor);
  grad.addColorStop(1, red ? "#8e0f28" : "#000000");
  ctx.fillStyle = grad;
  ctx.fillText(symbol, W / 2, H / 2 + 14);
  ctx.globalAlpha = 1;

  // Inner border + subtle vignette for a premium card stock look
  roundedRectPath(ctx, 20, 20, W - 40, H - 40, 26);
  ctx.strokeStyle = red ? "#e3b4bd" : "#c9c9ce";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();

  // Outer border on the full rounded shape
  roundedRectPath(ctx, 6, 6, W - 12, H - 12, 34);
  ctx.strokeStyle = "#1a1a1a";
  ctx.lineWidth = 7;
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.anisotropy = 4;
  textureCache.set(key, texture);
  return texture;
}

let backTexture: THREE.CanvasTexture | null = null;
function cardBackTexture(): THREE.CanvasTexture {
  if (backTexture) return backTexture;
  const W = 512;
  const H = Math.round(512 * (358 / 256));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.clearRect(0, 0, W, H);
  roundedRectPath(ctx, 6, 6, W - 12, H - 12, 34);
  ctx.save();
  ctx.clip();

  const bg = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.8);
  bg.addColorStop(0, "#3a2c7a");
  bg.addColorStop(1, "#1c1442");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255, 213, 74, 0.35)";
  ctx.lineWidth = 1.5;
  for (let i = -H; i < W + H; i += 22) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }

  roundedRectPath(ctx, 30, 30, W - 60, H - 60, 24);
  ctx.strokeStyle = "#ffd54a";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.font = "bold 150px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255, 213, 74, 0.85)";
  ctx.fillText("♠", W / 2, H / 2 + 10);
  ctx.restore();

  roundedRectPath(ctx, 6, 6, W - 12, H - 12, 34);
  ctx.strokeStyle = "#0e0a24";
  ctx.lineWidth = 7;
  ctx.stroke();

  backTexture = new THREE.CanvasTexture(canvas);
  backTexture.needsUpdate = true;
  return backTexture;
}

const CARD_W = 0.64;
const CARD_H = 0.64 * (358 / 256);
const CARD_THICKNESS = 0.012;

/** A single playing card as a 3D mesh. Pass `card={null}` for a face-down card. */
export function Card3D({
  card,
  position = [0, 0, 0],
  rotationY = 0,
  dealt = true,
  delay = 0,
  flat = false,
}: {
  card: Card | null;
  position?: [number, number, number];
  rotationY?: number;
  dealt?: boolean;
  delay?: number;
  /** Lie face-up on the table, readable from the +z side, instead of standing upright (rotationY is ignored). */
  flat?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);

  const texture = useMemo(() => (card ? faceTexture(card) : cardBackTexture()), [card]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (!dealt) {
      groupRef.current.visible = false;
      return;
    }
    groupRef.current.visible = true;
    if (t0.current === null) t0.current = clock.getElapsedTime() + delay;
    const elapsed = clock.getElapsedTime() - t0.current;
    const p = Math.min(1, Math.max(0, elapsed / 0.35));
    const eased = 1 - Math.pow(1 - p, 3);
    groupRef.current.position.y = position[1] + (1 - eased) * 1.4;
    groupRef.current.rotation.z = (1 - eased) * -0.5;
    const mat = groupRef.current.scale;
    mat.setScalar(0.85 + eased * 0.15);
  });

  return (
    <group ref={groupRef} position={position} rotation={flat ? [0, 0, 0] : [-Math.PI / 2 + 0.001, 0, rotationY]}>
      <mesh castShadow receiveShadow position={[0, CARD_THICKNESS / 2, 0]}>
        <boxGeometry args={[CARD_W, CARD_THICKNESS, CARD_H]} />
        <meshPhysicalMaterial
          map={texture}
          transparent
          alphaTest={0.05}
          roughness={flat ? 0.7 : 0.35}
          clearcoat={flat ? 0 : 0.6}
          clearcoatRoughness={0.3}
          sheen={0.3}
        />
      </mesh>
    </group>
  );
}

/** Lays out a hand of cards fanned left-to-right on the table. */
export function CardHand3D({
  cards,
  center = [0, 0.02, 0] as [number, number, number],
  faceDown = false,
  spacing = 0.44,
  flat = false,
}: {
  cards: (Card | null)[];
  center?: [number, number, number];
  faceDown?: boolean;
  spacing?: number;
  flat?: boolean;
}) {
  const total = cards.length;
  return (
    <>
      {cards.map((c, i) => {
        const x = center[0] + (i - (total - 1) / 2) * spacing;
        return (
          <Card3D
            key={i}
            card={faceDown ? null : c}
            position={[x, center[1] + i * 0.004, center[2]]}
            delay={i * 0.12}
            flat={flat}
          />
        );
      })}
    </>
  );
}

export function FeltTable3D({ color = "#14532d", radius = 2.4 }: { color?: string; radius?: number }) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[radius, 48]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]}>
        <ringGeometry args={[radius, radius + 0.12, 48]} />
        <meshStandardMaterial color="#3a2210" roughness={0.6} />
      </mesh>
    </>
  );
}
