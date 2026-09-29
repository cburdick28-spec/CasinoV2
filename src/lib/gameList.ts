export interface GameMeta {
  slug: string;
  name: string;
  emoji: string;
  desc: string;
  tag?: string;
}

export const GAMES: GameMeta[] = [
  { slug: "slots", name: "Slots", emoji: "\u{1F3B0}", desc: "Spin the reels for a weighted paytable & progressive jackpot." },
  { slug: "blackjack", name: "Blackjack", emoji: "\u{1F0CF}", desc: "Split, double, surrender & insurance against the dealer." },
  { slug: "roulette", name: "Roulette", emoji: "\u{1F3A1}", desc: "Full betting board — straight-ups, dozens, columns & more." },
  { slug: "poker", name: "Texas Hold'em", emoji: "♠️", desc: "Best 5-card hand vs the dealer across four streets." },
  { slug: "baccarat", name: "Baccarat", emoji: "\u{1F3B4}", desc: "Punto Banco — bet Player, Banker or Tie.", tag: "New" },
  { slug: "crash", name: "Crash", emoji: "\u{1F680}", desc: "Cash out before the multiplier crashes.", tag: "New" },
  { slug: "plinko", name: "Plinko", emoji: "\u{1F3B3}", desc: "Drop the ball and ride the pegs to a multiplier.", tag: "New" },
  { slug: "craps", name: "Craps", emoji: "\u{1F3B2}", desc: "Classic pass-line craps with odds bets." },
  { slug: "horse-racing", name: "Horse Racing", emoji: "\u{1F407}", desc: "Pick a horse and watch the race play out." },
  { slug: "coinflip", name: "Coin Flip", emoji: "\u{1FA99}", desc: "Call it and ride a doubling streak ladder." },
  { slug: "higherlower", name: "Higher / Lower", emoji: "\u{1F53C}", desc: "Guess the next card with true-odds payouts." },
  { slug: "mines", name: "Mines", emoji: "\u{1F4A3}", desc: "Reveal gems, dodge mines, and cash out whenever you like." },
  { slug: "wheel", name: "Wheel", emoji: "\u{1F3A1}", desc: "One spin, one multiplier — bust to 5x.", tag: "New" },
  { slug: "keno", name: "Keno", emoji: "\u{1F3B1}", desc: "Pick your numbers and see how many of the 10 drawn you match." },
  { slug: "war", name: "Casino War", emoji: "\u{2694}\u{FE0F}", desc: "Highest card wins. Tie? Surrender or go to war.", tag: "New" },
  { slug: "sicbo", name: "Sic Bo", emoji: "\u{1F3B2}", desc: "Three dice — big, small, a number, or chase a triple." },
  { slug: "videopoker", name: "Video Poker", emoji: "\u{1F0CF}", desc: "Jacks or Better, 9/6 paytable. Hold your cards, draw the rest.", tag: "New" },
  { slug: "limbo", name: "Limbo", emoji: "\u{1F4C9}", desc: "Set a target multiplier and see if the roll clears it.", tag: "New" },
];
