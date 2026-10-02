"use client";

import { Card3D, FeltTable3D } from "./Card3D";
import type { Card } from "@/lib/types";

function CrossedBatons() {
  return (
    <group position={[0, 1.7, 0]}>
      <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.07, 1.1, 0.07]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.07, 1.1, 0.07]} />
        <meshStandardMaterial color="#c9c9c9" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

/**
 * 3D Casino War table: player's card sits on the near (camera) side, the
 * dealer's card sits on the far side, facing off across the felt. While a
 * tie is pending or a war round is being fought, a pair of crossed batons
 * hovers above the table and the fresh war cards are dealt further forward
 * (closer to the camera / further back for the dealer) than the original
 * tied cards, which stay visible behind them.
 */
export default function WarScene3D({
  playerCard,
  dealerCard,
  warPlayerCard,
  warDealerCard,
  tied,
}: {
  playerCard: Card | null;
  dealerCard: Card | null;
  warPlayerCard?: Card | null;
  warDealerCard?: Card | null;
  tied: boolean;
}) {
  const atWar = Boolean(warPlayerCard || warDealerCard);

  return (
    <>
      <FeltTable3D color="#7a1020" radius={2.4} />

      {(tied || atWar) && <CrossedBatons />}

      {/* Original (possibly tied) cards */}
      <Card3D card={playerCard} position={[-0.9, 0.02, 1.0]} rotationY={0} delay={0} />
      <Card3D card={dealerCard} position={[0.9, 0.02, -1.0]} rotationY={Math.PI} delay={0.1} />

      {/* War round cards, dealt further toward the camera (player) / further
          toward the camera from the dealer's side, below/in front of the
          original tied cards. */}
      {warPlayerCard && (
        <Card3D card={warPlayerCard} position={[-0.9, 0.03, 1.9]} rotationY={0} delay={0.2} />
      )}
      {warDealerCard && (
        <Card3D card={warDealerCard} position={[0.9, 0.03, -0.2]} rotationY={Math.PI} delay={0.3} />
      )}
    </>
  );
}
