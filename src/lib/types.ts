export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  salt: string;
  money: number;
  is_dev: number;
  last_daily: string;
  daily_streak: number;
  timeout_until: number;
  created_at: number;
  games_played: number;
  games_won: number;
  games_lost: number;
  total_wagered: number;
  total_won: number;
  biggest_win: number;
}

export interface PublicUser {
  id: number;
  username: string;
  money: number;
  isDev: boolean;
  lastDaily: string;
  dailyStreak: number;
  timeoutUntil: number;
  createdAt: number;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    totalWagered: number;
    totalWon: number;
    biggestWin: number;
  };
  achievements: string[];
  vip: {
    name: string;
    emoji: string;
    color: string;
    min: number;
  };
  nextVip: { name: string; min: number } | null;
}

export interface BetHistoryRow {
  id: number;
  user_id: number;
  game: string;
  bet: number;
  outcome: "win" | "loss" | "push";
  net: number;
  created_at: number;
}

export type Suit = "S" | "H" | "D" | "C";
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K"
  | "A";

export interface Card {
  rank: Rank;
  suit: Suit;
}
