"use client";

import type { Card } from "@/lib/types";

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };

export default function PlayingCard({ card, index = 0 }: { card: Card | null; index?: number }) {
  const style = { animationDelay: `${index * 90}ms` };
  if (!card) return <div className="card-back card-deal" style={style} />;
  const symbol = SUIT_SYMBOL[card.suit];
  const red = card.suit === "H" || card.suit === "D";
  return (
    <div className={`card-face card-deal ${red ? "card-red" : ""}`} style={style}>
      <div className="text-lg leading-none">{card.rank}</div>
      <div className="text-3xl leading-none mt-1">{symbol}</div>
    </div>
  );
}

export function CardRow({ cards, dealKey }: { cards: (Card | null)[]; dealKey?: string | number }) {
  return (
    <div className="flex flex-wrap gap-2" key={dealKey}>
      {cards.map((c, i) => (
        <PlayingCard key={i} card={c} index={dealKey !== undefined ? i : 0} />
      ))}
    </div>
  );
}
