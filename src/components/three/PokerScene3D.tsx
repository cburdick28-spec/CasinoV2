"use client";

import { CardHand3D, FeltTable3D } from "./Card3D";
import type { Card } from "@/lib/types";

function ChipStack({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.02 + i * 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.18, 0.045, 24]} />
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 3D Texas Hold'em table: dealer's hole cards sit at the back (face-down
 * until showdown), the five community cards run across the middle, and the
 * player's hole cards are fanned at the front, closest to the camera.
 */
export default function PokerScene3D({
  playerCards,
  dealerCards,
  community,
  felt = true,
  flat = false,
  compact = false,
  chips = true,
}: {
  playerCards: Card[];
  dealerCards: (Card | null)[];
  community: Card[];
  /** Draw the scene's own felt disc (off when a station table supplies the felt). */
  felt?: boolean;
  /** Lay the cards flat on the table (for a seated view) instead of standing upright. */
  flat?: boolean;
  /** Pull the hands closer together and space the cards so none overlap (for a smaller table). */
  compact?: boolean;
  /** Draw the decorative chip stacks. */
  chips?: boolean;
}) {
  return (
    <>
      {felt && <FeltTable3D color="#1b3a5c" radius={2.7} />}

      <CardHand3D cards={dealerCards} center={[0, 0.02, compact ? -1.3 : -1.6]} spacing={compact ? 0.7 : 0.48} flat={flat} />

      {community.length > 0 && (
        <CardHand3D cards={community} center={[0, 0.02, 0]} spacing={compact ? 0.68 : 0.5} flat={flat} />
      )}

      <CardHand3D cards={playerCards} center={[0, 0.02, compact ? 1.3 : 1.6]} spacing={compact ? 0.7 : 0.48} flat={flat} />

      {chips && <ChipStack position={[-2.1, 0, 0.2]} color="#b45309" />}
      {chips && <ChipStack position={[2.1, 0, 0.2]} color="#15803d" />}
    </>
  );
}
