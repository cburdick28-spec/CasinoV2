"use client";

import { Card3D, FeltTable3D } from "./Card3D";
import type { Card } from "@/lib/types";

/**
 * 3D Higher/Lower table: the current card sits on the left, face up. When a
 * guess resolves, the freshly revealed card deals in to its right so the
 * player can compare the two before the current card advances.
 */
export default function HigherLowerScene3D({
  currentCard,
  nextCard,
  felt = true,
  flat = false,
}: {
  currentCard: Card | null;
  nextCard: Card | null;
  /** Draw the scene's own felt disc (off when a station table supplies the felt). */
  felt?: boolean;
  /** Lay the cards flat on the table (for a seated view) instead of standing upright. */
  flat?: boolean;
}) {
  return (
    <>
      {felt && <FeltTable3D color="#1b2a4a" radius={2.2} />}
      <Card3D card={currentCard} position={[-0.55, 0.02, 0.2]} delay={0} flat={flat} />
      <Card3D card={nextCard} position={[0.55, 0.02, 0.2]} delay={0.15} flat={flat} />
    </>
  );
}
