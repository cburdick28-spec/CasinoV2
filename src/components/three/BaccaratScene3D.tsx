"use client";

import { CardHand3D, FeltTable3D } from "./Card3D";
import type { Card } from "@/lib/types";

function ChipStack({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, 0.02 + i * 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.045, 24]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 3D Punto Banco table: Player hand on one side, Banker hand on the other,
 * split left/right across the felt rather than near/far, matching how the
 * two hands are shown side by side on the real page.
 */
export default function BaccaratScene3D({
  playerCards,
  bankerCards,
}: {
  playerCards: Card[];
  bankerCards: Card[];
}) {
  return (
    <>
      <FeltTable3D color="#5c1b3a" radius={2.6} />

      <CardHand3D cards={playerCards} center={[-1.3, 0.02, 0.6]} spacing={0.46} />
      <CardHand3D cards={bankerCards} center={[1.3, 0.02, -0.6]} spacing={0.46} />

      <ChipStack position={[-1.3, 0, 1.9]} color="#1d4ed8" />
      <ChipStack position={[1.3, 0, -1.9]} color="#b91c1c" />
    </>
  );
}
