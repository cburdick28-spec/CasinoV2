import { neon } from "@neondatabase/serverless";

// Postgres (Neon) connection. On Vercel, connecting a Neon database under
// Storage sets DATABASE_URL automatically; locally, put it in .env.local.
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// BIGINT and COUNT(*) columns come back from Postgres as strings; every
// number we store fits comfortably in a JS number, so convert them back.
function normalize<T>(rows: Record<string, unknown>[]): T[] {
  for (const row of rows) {
    for (const k in row) {
      const v = row[k];
      if (typeof v === "string" && /^-?d+$/.test(v) && NUMERIC_COLUMNS.has(k)) row[k] = Number(v);
    }
  }
  return rows as T[];
}

const NUMERIC_COLUMNS = new Set([
  "id", "user_id", "money", "is_dev", "daily_streak", "timeout_until", "created_at",
  "games_played", "games_won", "games_lost", "total_wagered", "total_won", "biggest_win",
  "bet", "net", "unlocked_at", "c",
]);

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    money BIGINT NOT NULL DEFAULT 500,
    is_dev INTEGER NOT NULL DEFAULT 0,
    last_daily TEXT NOT NULL DEFAULT '',
    daily_streak INTEGER NOT NULL DEFAULT 0,
    timeout_until BIGINT NOT NULL DEFAULT 0,
    created_at BIGINT NOT NULL,
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    games_lost INTEGER NOT NULL DEFAULT 0,
    total_wagered BIGINT NOT NULL DEFAULT 0,
    total_won BIGINT NOT NULL DEFAULT 0,
    biggest_win BIGINT NOT NULL DEFAULT 0
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (LOWER(username))`,
  `CREATE TABLE IF NOT EXISTS achievements (
    user_id INTEGER NOT NULL REFERENCES users(id),
    achievement_id TEXT NOT NULL,
    unlocked_at BIGINT NOT NULL,
    PRIMARY KEY (user_id, achievement_id)
  )`,
  `CREATE TABLE IF NOT EXISTS bet_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    game TEXT NOT NULL,
    bet BIGINT NOT NULL,
    outcome TEXT NOT NULL,
    net BIGINT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS game_state (
    user_id INTEGER NOT NULL REFERENCES users(id),
    game TEXT NOT NULL,
    state TEXT NOT NULL,
    PRIMARY KEY (user_id, game)
  )`,
  `CREATE TABLE IF NOT EXISTS global_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at BIGINT NOT NULL
  )`,
];

declare global {
  var __casinoSchemaReady: Promise<void> | undefined;
}

function client() {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Connect a Neon database to the Vercel project (Storage tab) or add it to .env.local."
    );
  }
  return neon(connectionString);
}

// Creates tables once per server instance, the first time the DB is used.
function ensureSchema(): Promise<void> {
  if (!global.__casinoSchemaReady) {
    const sql = client();
    global.__casinoSchemaReady = (async () => {
      for (const stmt of SCHEMA) await sql.query(stmt);
    })().catch((err) => {
      global.__casinoSchemaReady = undefined;
      throw err;
    });
  }
  return global.__casinoSchemaReady;
}

// Lets queries keep SQLite-style `?` placeholders; they become $1, $2, ...
function toPg(text: string) {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

export async function all<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const rows = await client().query(toPg(text), params);
  return normalize<T>(rows as Record<string, unknown>[]);
}

export async function get<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await all<T>(text, params);
  return rows[0];
}

export async function run(text: string, params: unknown[] = []): Promise<void> {
  await all(text, params);
}

async function getGlobal(key: string, fallback: string): Promise<string> {
  await run("INSERT INTO global_state (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING", [key, fallback]);
  const row = await get<{ value: string }>("SELECT value FROM global_state WHERE key = ?", [key]);
  return row?.value ?? fallback;
}

export async function getJackpot(): Promise<number> {
  return parseInt(await getGlobal("jackpot", "1000"), 10);
}

export async function setJackpot(value: number) {
  await run(
    "INSERT INTO global_state (key, value) VALUES ('jackpot', ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
    [String(Math.max(0, Math.floor(value)))]
  );
}

export async function addToJackpot(amount: number) {
  await getGlobal("jackpot", "1000");
  await run("UPDATE global_state SET value = (value::bigint + ?)::text WHERE key = 'jackpot'", [Math.floor(amount)]);
}
