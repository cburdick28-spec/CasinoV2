import { buildDeck, RANK_VALUE } from "@/lib/cards";
import type { Card } from "@/lib/types";

export function drawTwo(): { player: Card; dealer: Card } {
  const deck = buildDeck();
  return { player: deck[0], dealer: deck[1] };
}

export function compare(player: Card, dealer: Card): "win" | "lose" | "tie" {
  const p = RANK_VALUE[player.rank];
  const d = RANK_VALUE[dealer.rank];
  if (p > d) return "win";
  if (p < d) return "lose";
  return "tie";
}
