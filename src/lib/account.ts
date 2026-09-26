import db, { getJackpot } from "./db";
import { ACHIEVEMENTS, DEV_USERNAMES, getNextVipTier, getVipTier } from "./vip";
import type { PublicUser, UserRow } from "./types";

export const DEV_MONEY = 999_999_999;

export function isDevAccount(user: UserRow): boolean {
  return user.is_dev === 1 || DEV_USERNAMES.includes(user.username);
}

export function effectiveMoney(user: UserRow): number {
  return isDevAccount(user) ? DEV_MONEY : user.money;
}

export function unlockAchievement(userId: number, achievementId: string): boolean {
  const exists = db
    .prepare("SELECT 1 FROM achievements WHERE user_id = ? AND achievement_id = ?")
    .get(userId, achievementId);
  if (exists) return false;
  db.prepare(
    "INSERT INTO achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)"
  ).run(userId, achievementId, Date.now());
  return true;
}

export function getAchievements(userId: number): string[] {
  const rows = db
    .prepare("SELECT achievement_id FROM achievements WHERE user_id = ?")
    .all(userId) as { achievement_id: string }[];
  return rows.map((r) => r.achievement_id);
}

export function checkVipAchievements(userId: number, money: number) {
  if (money >= 1000) unlockAchievement(userId, "silver_tier");
  if (money >= 5000) unlockAchievement(userId, "gold_tier");
  if (money >= 25000) unlockAchievement(userId, "platinum_tier");
  if (money >= 100000) unlockAchievement(userId, "diamond_tier");
  if (money >= 500000) unlockAchievement(userId, "legend_tier");
  if (money >= 1000000) unlockAchievement(userId, "millionaire");
  if (money <= 0) unlockAchievement(userId, "broke");
}

export function addMoney(userId: number, delta: number) {
  db.prepare("UPDATE users SET money = money + ? WHERE id = ?").run(Math.floor(delta), userId);
  const row = db.prepare("SELECT money FROM users WHERE id = ?").get(userId) as { money: number };
  checkVipAchievements(userId, row.money);
  return row.money;
}

export function setMoney(userId: number, value: number) {
  db.prepare("UPDATE users SET money = ? WHERE id = ?").run(Math.floor(value), userId);
  checkVipAchievements(userId, value);
}

export function recordGame(
  userId: number,
  game: string,
  won: boolean,
  wagered: number,
  payout: number,
  push = false
) {
  const outcome = push ? "push" : won ? "win" : "loss";
  const net = push ? 0 : won ? payout - wagered : -wagered;

  db.prepare(
    `UPDATE users SET
      games_played = games_played + 1,
      total_wagered = total_wagered + ?,
      games_won = games_won + ?,
      games_lost = games_lost + ?,
      total_won = total_won + ?,
      biggest_win = MAX(biggest_win, ?)
    WHERE id = ?`
  ).run(
    wagered,
    won ? 1 : 0,
    !won && !push ? 1 : 0,
    won ? payout : 0,
    won ? payout : 0,
    userId
  );

  db.prepare(
    "INSERT INTO bet_history (user_id, game, bet, outcome, net, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(userId, game, wagered, outcome, net, Date.now());

  if (won) unlockAchievement(userId, "first_win");
  if (wagered >= 500) unlockAchievement(userId, "high_roller");

  const winStreakRow = db
    .prepare(
      `SELECT outcome FROM bet_history WHERE user_id = ? ORDER BY id DESC LIMIT 7`
    )
    .all(userId) as { outcome: string }[];
  if (winStreakRow.length === 7 && winStreakRow.every((r) => r.outcome === "win")) {
    unlockAchievement(userId, "seven_streak");
  }
}

export function toPublicUser(user: UserRow): PublicUser {
  const money = effectiveMoney(user);
  const tier = getVipTier(money);
  const next = getNextVipTier(money);
  return {
    id: user.id,
    username: user.username,
    money,
    isDev: isDevAccount(user),
    lastDaily: user.last_daily,
    dailyStreak: user.daily_streak,
    timeoutUntil: user.timeout_until,
    createdAt: user.created_at,
    stats: {
      gamesPlayed: user.games_played,
      gamesWon: user.games_won,
      gamesLost: user.games_lost,
      totalWagered: user.total_wagered,
      totalWon: user.total_won,
      biggestWin: user.biggest_win,
    },
    achievements: getAchievements(user.id),
    vip: { name: tier.name, emoji: tier.emoji, color: tier.color, min: tier.min },
    nextVip: next ? { name: next.name, min: next.min } : null,
  };
}

export function getGameState<T>(userId: number, game: string): T | null {
  const row = db
    .prepare("SELECT state FROM game_state WHERE user_id = ? AND game = ?")
    .get(userId, game) as { state: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.state) as T;
  } catch {
    return null;
  }
}

export function setGameState<T>(userId: number, game: string, state: T) {
  db.prepare(
    `INSERT INTO game_state (user_id, game, state) VALUES (?, ?, ?)
     ON CONFLICT(user_id, game) DO UPDATE SET state = excluded.state`
  ).run(userId, game, JSON.stringify(state));
}

export function clearGameState(userId: number, game: string) {
  db.prepare("DELETE FROM game_state WHERE user_id = ? AND game = ?").run(userId, game);
}

export function currentJackpot() {
  return getJackpot();
}

export function allAchievementDefs() {
  return ACHIEVEMENTS;
}
