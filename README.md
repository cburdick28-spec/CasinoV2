# 🎰 Ultimate Casino V2

A full-stack, feature-packed browser casino built with **Next.js 16, TypeScript and Tailwind CSS**. This is a from-scratch rewrite of the original Streamlit-based [python-casino](https://github.com/cburdick28-spec/python-casino) project — same play-money concept (VIP tiers, achievements, a progressive jackpot, daily rewards), but as a real web app with a proper account system, server-authoritative game logic, and several new games.

**This uses fake, in-app currency only. No real money or gambling is involved.**

## What's new vs the original

- Real accounts (hashed passwords, signed session cookies) instead of a shared GitHub-hosted JSON file
- All game outcomes are computed server-side with a cryptographic RNG — nothing a player can manipulate client-side
- 3 brand-new games: **Crash**, **Plinko**, and **Baccarat**
- Blackjack now supports **insurance** and **surrender**, on top of split/double
- Roulette has a full betting board (straight-ups, dozens, columns, red/black/odd/even/high/low) with multiple simultaneous bets per spin
- Coin Flip and Higher/Lower are now streak-ladder games — chain wins for a growing pot, cash out whenever you like
- Craps supports true-odds "odds bets" behind the pass line
- A weighted slots paytable (rarer symbols pay more) instead of a flat 2x/jackpot split
- Leaderboard, lifetime stats, bet history, achievements/VIP profile page, a simple live chat, and a dev/admin panel

## Games

Slots · Blackjack · Roulette · Texas Hold'em (vs. dealer) · Baccarat · Crash · Plinko · Craps · Horse Racing · Coin Flip · Higher/Lower

## Getting started

```bash
npm install
cp .env.example .env.local   # then edit AUTH_SECRET
npm run dev
```

Open http://localhost:3000, register an account (new players start with $500) and start playing.

Registering with the username `Dev1`, `Dev2`, `Dev3` or `admin` grants developer status: unlimited chips and access to `/admin` (give money, reset balances, time out players).

## How data is stored

Game/account state lives in a local **SQLite** database (`better-sqlite3`) at `data/casino.db`, created automatically on first run. This keeps the app dependency-free for local development and most traditional Node hosts (Railway, Render, Fly.io, a VPS, etc.) — just make sure `data/` is on a persistent volume.

**Note for Vercel:** Vercel's serverless functions have an ephemeral, read-only filesystem outside of `/tmp`, so a SQLite file will *not* persist across requests/deploys there. If you deploy to Vercel, swap `src/lib/db.ts` for a hosted database — Vercel Postgres, Neon, or Turso (libSQL, which is API-compatible with better-sqlite3's `db.prepare(...).run/get/all` style) are the least invasive options. Everything else in the app (auth, game logic, routes) is unaffected by that swap since all persistence goes through `src/lib/db.ts` and `src/lib/account.ts`.

## Project structure

```
src/
  app/
    api/            # server routes: auth, games, admin, chat, leaderboard...
    games/<slug>/   # one page per game
    (profile, stats, history, leaderboard, chat, admin pages)
  components/       # shared UI (Navbar, PlayingCard, BetInput, GameShell...)
  lib/
    db.ts           # SQLite connection + schema
    auth.ts         # password hashing + session cookies
    account.ts      # balance/achievements/stats helpers
    games/          # game-specific server logic (blackjack, crash)
    cards.ts, poker.ts, rng.ts   # shared game primitives
```

## Scripts

- `npm run dev` – start the dev server
- `npm run build` – production build
- `npm run start` – run the production build
- `npm run lint` – ESLint
