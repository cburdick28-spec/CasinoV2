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
  vip: { name: string; emoji: string; color: string; min: number };
  nextVip: { name: string; min: number } | null;
}
