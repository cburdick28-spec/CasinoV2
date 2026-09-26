import { all, get, getJackpot, run } from "./db";
import { ACHIEVEMENTS, DEV_USERNAMES, getNextVipTier, getVipTier } from "./vip";
import type { PublicUser, UserRow } from "./types";

export const DEV_MONEY = 999_999_999;

export function isDevAccount(user: UserRow): boolean {
  return user.is_dev === 1 || DEV_USERNAMES.includes(user.username);
}

export function effectiveMoney(user: UserRow): number {
  return isDevAccount(user) ? DEV_MONEY : user.money;
}

export async function unlockAchievement(userId: number, achievementId: string): Promise<boolean> {
  const exists = await get("SELECT 1 FROM achievements WHERE user_id = ? AND achievement_id = ?", [userId, achievementId]);
  if (exists) return false;
  await run("INSERT INTO achievements (user_id, achievement_id, unlocked_at) VALUES (?, ?, ?)", [userId, achievementId, Date.now()]);
  return true;
}

export async function getAchievements(userId: number): Promise<string[]> {
  const rows = await all<{ achievement_id: string }>("SELECT achievement_id FROM achievements WHERE user_id = ?", [userId]);
  return rows.map((r) => r.achievement_id);
}

export async function checkVipAchievements(userId: number, money: number) {
  if (money >= 1000) await unlockAchievement(userId, "silver_tier");
  if (money >= 5000) await unlockAchievement(userId, "gold_tier");
  if (money >= 25000) await unlockAchievement(userId, "platinum_tier");
  if (money >= 100000) await unlockAchievement(userId, "diamond_tier");
  if (money >= 500000) await unlockAchievement(userId, "legend_tier");
  if (money >= 1000000) await unlockAchievement(userId, "millionaire");
  if (money <= 0) await unlockAchievement(userId, "broke");
}

export async function addMoney(userId: number, delta: number) {
  await run("UPDATE users SET money = money + ? WHERE id = ?", [Math.floor(delta), userId]);
  const row = await get<{ money: number }>("SELECT money FROM users WHERE id = ?", [userId]);
  await checkVipAchievements(userId, row?.money ?? 0);
  return row?.money ?? 0;
}

export async function setMoney(userId: number, value: number) {
  await run("UPDATE users SET money = ? WHERE id = ?", [Math.floor(value), userId]);
  await checkVipAchievements(userId, value);
}

export async function recordGame(
  userId: number,
  game: string,
  won: boolean,
  wagered: number,
  payout: number,
  push = false
) {
  const outcome = push ? "push" : won ? "win" : "loss";
  const net = push ? 0 : won ? payout - wagered : -wagered;

  await run(`UPDATE users SET
      games_played = games_played + 1,
      total_wagered = total_wagered + ?,
      games_won = games_won + ?,
      games_lost = games_lost + ?,
      total_won = total_won + ?,
      biggest_win = GREATEST(biggest_win, ?)
    WHERE id = ?`, [wagered,
    won ? 1 : 0,
    !won && !push ? 1 : 0,
    won ? payout : 0,
    won ? payout : 0,
    userId]);

  await run("INSERT INTO bet_history (user_id, game, bet, outcome, net, created_at) VALUES (?, ?, ?, ?, ?, ?)", [userId, game, wagered, outcome, net, Date.now()]);

  if (won) await unlockAchievement(userId, "first_win");
  if (wagered >= 500) await unlockAchievement(userId, "high_roller");

  const winStreakRow = await all<{ outcome: string }>(`SELECT outcome FROM bet_history WHERE user_id = ? ORDER BY id DESC LIMIT 7`, [userId]);
  if (winStreakRow.length === 7 && winStreakRow.every((r) => r.outcome === "win")) {
    await unlockAchievement(userId, "seven_streak");
  }
}

export async function toPublicUser(user: UserRow): Promise<PublicUser> {
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
    achievements: await getAchievements(user.id),
    vip: { name: tier.name, emoji: tier.emoji, color: tier.color, min: tier.min },
    nextVip: next ? { name: next.name, min: next.min } : null,
  };
}

export async function getGameState<T>(userId: number, game: string): Promise<T | null> {
  const row = await get<{ state: string }>("SELECT state FROM game_state WHERE user_id = ? AND game = ?", [userId, game]);
  if (!row) return null;
  try {
    return JSON.parse(row.state) as T;
  } catch {
    return null;
  }
}

export async function setGameState<T>(userId: number, game: string, state: T) {
  await run(`INSERT INTO game_state (user_id, game, state) VALUES (?, ?, ?)
     ON CONFLICT(user_id, game) DO UPDATE SET state = excluded.state`, [userId, game, JSON.stringify(state)]);
}

export async function clearGameState(userId: number, game: string) {
  await run("DELETE FROM game_state WHERE user_id = ? AND game = ?", [userId, game]);
}

export async function currentJackpot() {
  return getJackpot();
}

export function allAchievementDefs() {
  return ACHIEVEMENTS;
}
