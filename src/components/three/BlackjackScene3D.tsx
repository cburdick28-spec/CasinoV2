"use client";

import { CardHand3D, FeltTable3D } from "./Card3D";
import type { Card } from "@/lib/types";

function ChipStack({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.02 + i * 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.045, 24]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 3D blackjack table: dealer's hand lies face-up/face-down at the back,
 * player hands (one per split) are fanned in a row at the front. The
 * currently active hand is nudged slightly toward the camera.
 */
export default function BlackjackScene3D({
  dealerCards,
  hands,
  activeHandIndex,
  chips = true,
}: {
  dealerCards: (Card | null)[];
  hands: Card[][];
  activeHandIndex?: number;
  /** The two decorative chip stacks beside the table (the walkable casino has its own on the table). */
  chips?: boolean;
}) {
  const handCount = hands.length || 1;
  const spacingX = handCount > 1 ? 1.8 : 0;

  return (
    <>
      <FeltTable3D color="#14532d" radius={2.6} />

      {/* Dealer's hand, further back */}
      <CardHand3D cards={dealerCards} center={[0, 0.02, -1.5]} spacing={0.48} />

      {/* Player hand(s), fanned at the front; split hands sit side by side */}
      {hands.map((cards, idx) => {
        const x = (idx - (handCount - 1) / 2) * spacingX;
        const active = activeHandIndex === idx;
        return (
          <CardHand3D
            key={idx}
            cards={cards}
            center={[x, 0.02, active ? 1.3 : 1.1]}
            spacing={0.44}
          />
        );
      })}

      {chips && <ChipStack position={[-2.0, 0, 1.9]} color="#b91c1c" />}
      {chips && <ChipStack position={[2.0, 0, 1.9]} color="#1d4ed8" />}
    </>
  );
}
