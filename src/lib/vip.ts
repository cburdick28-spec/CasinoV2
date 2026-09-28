export interface VipTier {
  name: string;
  emoji: string;
  min: number;
  color: string;
}

export const VIP_TIERS: VipTier[] = [
  { name: "Bronze", emoji: "\u{1F949}", min: 0, color: "#cd7f32" },
  { name: "Silver", emoji: "\u{1F948}", min: 1000, color: "#c0c0c0" },
  { name: "Gold", emoji: "\u{1F947}", min: 5000, color: "#ffd700" },
  { name: "Platinum", emoji: "\u{1F48E}", min: 25000, color: "#00d4ff" },
  { name: "Diamond", emoji: "\u{1F4A0}", min: 100000, color: "#b9f2ff" },
  { name: "Legend", emoji: "\u{1F451}", min: 500000, color: "#ff2ecb" },
];

export function getVipTier(money: number): VipTier {
  let tier = VIP_TIERS[0];
  for (const t of VIP_TIERS) {
    if (money >= t.min) tier = t;
  }
  return tier;
}

export function getNextVipTier(money: number): VipTier | null {
  for (const t of VIP_TIERS) {
    if (money < t.min) return t;
  }
  return null;
}

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", name: "First Win", emoji: "\u{1F3C6}", desc: "Win your first game" },
  { id: "high_roller", name: "High Roller", emoji: "\u{1F4B0}", desc: "Bet $500 or more at once" },
  { id: "jackpot", name: "Jackpot!", emoji: "\u{1F3B0}", desc: "Win the progressive jackpot" },
  { id: "broke", name: "Broke", emoji: "\u{1F4B8}", desc: "Lose all your money" },
  { id: "millionaire", name: "Millionaire", emoji: "\u{1F911}", desc: "Reach $1,000,000" },
  { id: "blackjack_ace", name: "Blackjack!", emoji: "\u{1F0CF}", desc: "Get a natural blackjack" },
  { id: "royal_flush", name: "Royal Flush", emoji: "♠️", desc: "Hit a royal flush in poker" },
  { id: "daily_7", name: "Dedicated", emoji: "\u{1F4C5}", desc: "Claim daily reward 7 days in a row" },
  { id: "silver_tier", name: "Going Silver", emoji: "\u{1F948}", desc: "Reach Silver VIP tier" },
  { id: "gold_tier", name: "Going Gold", emoji: "\u{1F947}", desc: "Reach Gold VIP tier" },
  { id: "platinum_tier", name: "Platinum Status", emoji: "\u{1F48E}", desc: "Reach Platinum VIP tier" },
  { id: "diamond_tier", name: "Diamond Status", emoji: "\u{1F4A0}", desc: "Reach Diamond VIP tier" },
  { id: "legend_tier", name: "Legendary", emoji: "\u{1F451}", desc: "Reach Legend VIP tier" },
  { id: "crash_10x", name: "Sky High", emoji: "\u{1F680}", desc: "Cash out a Crash bet at 10x or more" },
  { id: "plinko_max", name: "Bullseye", emoji: "\u{1F3AF}", desc: "Hit the max multiplier slot in Plinko" },
  { id: "seven_streak", name: "On a Roll", emoji: "\u{1F525}", desc: "Win 7 games in a row" },
];

export const MAX_BET = 1_000_000_000_000_000;
export const STARTING_MONEY = 500;
