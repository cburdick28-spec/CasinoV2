"use client";

import { Card3D, FeltTable3D } from "./Card3D";
import type { Card } from "@/lib/types";

const SPACING = 0.66;

/**
 * 3D video poker table: 5 cards laid out in a row. A card the player has
 * marked "held" is lifted slightly off the felt and gets a glowing gold
 * highlight plane beneath it, so held vs. not-held reads clearly in 3D in
 * addition to the DOM "HELD" label / outline already shown under each card.
 */
export default function VideoPokerScene3D({
  hand,
  holds,
  felt = true,
  onToggle,
}: {
  hand: (Card | null)[];
  holds: boolean[];
  /** The round felt under the cards (off when the cards float in front of a cabinet screen). */
  felt?: boolean;
  /** Makes each card clickable (hold toggle). */
  onToggle?: (index: number) => void;
}) {
  const cards = hand.length ? hand : Array(5).fill(null);

  return (
    <>
      {felt && <FeltTable3D color="#0b3d2e" radius={2.4} />}
      {cards.map((c, i) => {
        const x = (i - (cards.length - 1) / 2) * SPACING;
        const held = Boolean(holds[i]);
        return (
          <group
            key={`${i}-${c ? c.rank + c.suit : "x"}`}
            onClick={
              onToggle
                ? (e) => {
                    e.stopPropagation();
                    onToggle(i);
                  }
                : undefined
            }
            onPointerOver={onToggle ? () => void (document.body.style.cursor = "pointer") : undefined}
            onPointerOut={onToggle ? () => void (document.body.style.cursor = "auto") : undefined}
          >
            {held && (
              <mesh position={[x, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.72, 0.98]} />
                <meshStandardMaterial
                  color="#ffd54a"
                  emissive="#ffd54a"
                  emissiveIntensity={0.7}
                  transparent
                  opacity={0.45}
                />
              </mesh>
            )}
            <Card3D card={c} position={[x, held ? 0.16 : 0.02, 0]} delay={i * 0.08} />
          </group>
        );
      })}
    </>
  );
}
