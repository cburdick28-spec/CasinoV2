import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "casino.db");

declare global {
  var __casinoDb: Database.Database | undefined;
}

export const db = global.__casinoDb ?? new Database(dbPath);
if (process.env.NODE_ENV !== "production") global.__casinoDb = db;

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  money INTEGER NOT NULL DEFAULT 500,
  is_dev INTEGER NOT NULL DEFAULT 0,
  last_daily TEXT NOT NULL DEFAULT '',
  daily_streak INTEGER NOT NULL DEFAULT 0,
  timeout_until INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  games_played INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,
  total_wagered INTEGER NOT NULL DEFAULT 0,
  total_won INTEGER NOT NULL DEFAULT 0,
  biggest_win INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS achievements (
  user_id INTEGER NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, achievement_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS bet_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  bet INTEGER NOT NULL,
  outcome TEXT NOT NULL,
  net INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS game_state (
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  state TEXT NOT NULL,
  PRIMARY KEY (user_id, game),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS global_state (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  username TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);

function getGlobal(key: string, fallback: string): string {
  const row = db.prepare("SELECT value FROM global_state WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  if (!row) {
    db.prepare("INSERT INTO global_state (key, value) VALUES (?, ?)").run(key, fallback);
    return fallback;
  }
  return row.value;
}

export function getJackpot(): number {
  return parseInt(getGlobal("jackpot", "1000"), 10);
}

export function setJackpot(value: number) {
  db.prepare(
    "INSERT INTO global_state (key, value) VALUES ('jackpot', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(String(Math.max(0, Math.floor(value))));
}

export function addToJackpot(amount: number) {
  setJackpot(getJackpot() + amount);
}

export default db;
