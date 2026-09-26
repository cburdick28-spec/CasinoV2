"use client";

import type { Card } from "@/lib/types";

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

export default function PlayingCard({ card }: { card: Card | null }) {
  if (!card) return <div className="card-back" />;
  const symbol = SUIT_SYMBOL[card.suit];
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div className={`card-face ${red ? "card-red" : ""}`}>
      <div className="text-lg leading-none">{card.rank}</div>
      <div className="text-3xl leading-none mt-1">{symbol}</div>
    </div>
  );
}

export function CardRow({ cards }: { cards: (Card | null)[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {cards.map((c, i) => (
        <PlayingCard key={i} card={c} />
      ))}
    </div>
  );
}
