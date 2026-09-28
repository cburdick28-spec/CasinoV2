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
cp .env.example .env.local   # then set AUTH_SECRET and DATABASE_URL
npm run dev
```

Open http://localhost:3000, register an account (new players start with $500) and start playing.

There are two built-in developer accounts, **Dev1** and **Dev2** (password `1234`, or whatever `DEV_PASSWORD` is set to). They have unlimited chips and access to `/admin` (give money, reset balances, time out players). Regular registrations never get developer access.

## How data is stored

Account and game state lives in a **Postgres** database hosted on [Neon](https://neon.tech), accessed through `@neondatabase/serverless`. Tables are created automatically the first time the app talks to the database.

To set it up on Vercel: open the project, go to **Storage → Create Database → Neon**, and connect it to the project. That sets `DATABASE_URL` for you; redeploy afterwards. For local development, put the same `DATABASE_URL` in `.env.local`.

All database access goes through `src/lib/db.ts` (`all`, `get`, `run`) and the helpers in `src/lib/account.ts`.

## Project structure

```
src/
  app/
    api/            # server routes: auth, games, admin, chat, leaderboard...
    games/<slug>/   # one page per game
    (profile, stats, history, leaderboard, chat, admin pages)
  components/       # shared UI (Navbar, PlayingCard, BetInput, GameShell...)
  lib/
    db.ts           # Postgres (Neon) connection + schema
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
