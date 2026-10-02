"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Card } from "@/lib/types";

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
const textureCache = new Map<string, THREE.CanvasTexture>();

function faceTexture(card: Card): THREE.CanvasTexture {
  const key = `${card.rank}${card.suit}`;
  const cached = textureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 358;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#f7f7f7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  const red = card.suit === "H" || card.suit === "D";
  ctx.fillStyle = red ? "#d81b3f" : "#111111";
  const symbol = SUIT_SYMBOL[card.suit];

  ctx.textBaseline = "top";
  ctx.font = "bold 54px sans-serif";
  ctx.fillText(card.rank, 20, 16);
  ctx.font = "54px sans-serif";
  ctx.fillText(symbol, 20, 76);

  ctx.save();
  ctx.translate(canvas.width - 20, canvas.height - 16);
  ctx.rotate(Math.PI);
  ctx.textBaseline = "top";
  ctx.font = "bold 54px sans-serif";
  ctx.fillText(card.rank, 0, 0);
  ctx.font = "54px sans-serif";
  ctx.fillText(symbol, 0, 60);
  ctx.restore();

  ctx.font = "140px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, canvas.width / 2, canvas.height / 2 + 10);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(key, texture);
  return texture;
}

let backTexture: THREE.CanvasTexture | null = null;
function cardBackTexture(): THREE.CanvasTexture {
  if (backTexture) return backTexture;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 358;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#2a1f5e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#7c5cff";
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
  ctx.fillStyle = "#3a2c7a";
  for (let y = 0; y < canvas.height; y += 24) {
    ctx.fillRect(0, y, canvas.width, 10);
  }
  backTexture = new THREE.CanvasTexture(canvas);
  backTexture.needsUpdate = true;
  return backTexture;
}

const CARD_W = 0.62;
const CARD_H = 0.62 * (358 / 256);

/** A single playing card as a 3D mesh. Pass `card={null}` for a face-down card. */
export function Card3D({
  card,
  position = [0, 0, 0],
  rotationY = 0,
  dealt = true,
  delay = 0,
}: {
  card: Card | null;
  position?: [number, number, number];
  rotationY?: number;
  dealt?: boolean;
  delay?: number;
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
    <group ref={groupRef} position={position} rotation={[-Math.PI / 2 + 0.001, 0, rotationY]}>
      <mesh castShadow receiveShadow>
        <planeGeometry args={[CARD_W, CARD_H]} />
        <meshStandardMaterial map={texture} roughness={0.5} />
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
}: {
  cards: (Card | null)[];
  center?: [number, number, number];
  faceDown?: boolean;
  spacing?: number;
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
