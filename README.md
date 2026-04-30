# Riftboard

A production-ready League of Legends stats platform — search players, view match history and rank, browse champions, and explore Challenger/Grandmaster/Master leaderboards across all regions.

Built on Next.js 14 (App Router), TypeScript, Tailwind, Prisma + PostgreSQL, and Redis. The architecture is **cache-first**: every Riot API call goes through Redis with mandated TTLs, so the platform can scale across many concurrent users without burning through Riot rate limits.

## Stack

| Layer        | Choice                                    |
| ------------ | ----------------------------------------- |
| Frontend     | Next.js 14 (App Router) + Tailwind        |
| Backend      | Next.js Route Handlers (Node runtime)     |
| Language     | TypeScript                                |
| Database     | PostgreSQL via Prisma                     |
| Cache        | Redis via `ioredis`                       |
| Static data  | Riot Data Dragon (champions, items, etc.) |

## Quick start

### 1. Prerequisites

- Node.js 18.17+ (or 20+)
- PostgreSQL 14+
- Redis 6+
- A Riot Games API key — get one at <https://developer.riotgames.com/>

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in:

```bash
cp .env.example .env
```

```env
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@localhost:5432/lolstats?schema=public
REDIS_URL=redis://localhost:6379
```

Optional knobs:

```env
CACHE_ENABLED=true             # set to false to bypass Redis (dev only)
RATE_LIMIT_PER_MINUTE=60       # per-IP rate limit
LOG_LEVEL=info                 # debug | info | warn | error
NEXT_PUBLIC_SHOW_AD_PLACEHOLDERS=false  # render ad slot debug boxes
```

### 4. Set up the database

```bash
npx prisma migrate dev --name init
```

This generates the Prisma client and creates the `Player`, `PlayerRank`, and `Match` tables.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>.

For production:

```bash
npm run build
npm start
```

## Project layout

```
src/
├── app/                     # Next.js App Router
│   ├── api/                 # JSON API routes
│   │   ├── players/[region]/[gameName]/[tagLine]/
│   │   │   ├── route.ts                 # GET profile + matches
│   │   │   └── refresh/route.ts         # POST force refresh
│   │   ├── matches/[regionalRoute]/[matchId]/route.ts
│   │   ├── champions/route.ts
│   │   └── rankings/[region]/[queue]/[tier]/route.ts
│   ├── player/[region]/[gameName]/[tagLine]/
│   ├── match/[regionalRoute]/[matchId]/
│   ├── champions/
│   ├── rankings/
│   ├── layout.tsx · page.tsx · globals.css
├── components/              # SearchBar, MatchList, ChampionGrid, etc.
├── lib/
│   ├── prisma.ts · redis.ts · logger.ts · ratelimit.ts
│   ├── riot.ts              # Typed Riot API client (retry, 429 handling)
│   ├── regions.ts           # Platform ↔ regional route mapping
│   ├── ddragon.ts           # Pure URL builders (client-safe)
│   ├── api-helpers.ts       # withApi, error mapping
│   ├── format.ts · queues.ts · summoner-spells.ts
│   └── client-api.ts        # Browser fetch wrappers
├── services/
│   ├── player.ts            # Profile + match orchestration
│   ├── champions.ts         # Data Dragon integration
│   └── rankings.ts          # Apex tier leaderboards
└── types/domain.ts          # Normalized response shapes
```

## API surface

All routes return JSON. Errors use a consistent envelope:

```json
{ "error": { "code": "PLAYER_NOT_FOUND", "message": "..." } }
```

| Method | Path                                                              | Description                              |
| ------ | ----------------------------------------------------------------- | ---------------------------------------- |
| GET    | `/api/players/:region/:gameName/:tagLine`                         | Cached profile + last 20 matches         |
| POST   | `/api/players/:region/:gameName/:tagLine/refresh`                 | Force refresh (120s cooldown, per-puuid) |
| GET    | `/api/matches/:regionalRoute/:matchId`                            | Full match details                       |
| GET    | `/api/champions`                                                  | Latest champion roster from Data Dragon  |
| GET    | `/api/rankings/:region/:queue/:tier`                              | Apex leaderboard (CHALLENGER/GM/MASTER)  |

Riot's API key is **never** exposed to the client. All Riot calls happen server-side; responses are normalized to the shapes in `src/types/domain.ts` before being returned.

### Region values

- **Platform regions** (use in `:region`): `BR1`, `NA1`, `EUW1`, `EUN1`, `KR`, `JP1`, `LA1`, `LA2`, `OC1`, `TR1`, `RU`
- **Regional routes** (use in `:regionalRoute`): `americas`, `europe`, `asia`, `sea`

The mapping is:
- `americas` ← BR1, NA1, LA1, LA2
- `europe` ← EUW1, EUN1, TR1, RU
- `asia` ← KR, JP1
- `sea` ← OC1

`getRegionalRoute(platform)` in `src/lib/regions.ts` is the canonical helper.

## Caching

Every Riot/Data-Dragon response is cached in Redis with the keys and TTLs from the spec:

| Key                                              | TTL     |
| ------------------------------------------------ | ------- |
| `player-profile:{region}:{gameName}:{tagLine}`   | 30 min  |
| `summoner:{region}:{puuid}`                      | 30 min  |
| `league-entries:{region}:{summonerId}`           | 10 min  |
| `match-ids:{regionalRoute}:{puuid}`              | 10 min  |
| `match-detail:{regionalRoute}:{matchId}`         | 7 days  |
| `champions:data-dragon:{version}`                | 24 h    |
| `leaderboard:{region}:{queue}:{tier}`            | 5 min   |
| `refresh-lock:{region}:{puuid-or-riotid}`        | 120 s   |

Match details are *also* persisted to Postgres (`Match` table) since matches are immutable, giving you a long-term store you can mine later for analytics — Redis is the hot path, Postgres is the durable backstop.

## Refresh logic

- Default reads serve **cached data**.
- The `Atualizar` button POSTs to the `/refresh` endpoint, which:
  1. Acquires a 120s lock at `refresh-lock:{region}:{riotId}` (NX + EX).
  2. If already locked → returns `429 REFRESH_COOLDOWN` with `Retry-After`.
  3. Otherwise, fetches fresh data from Riot, writes to DB, invalidates the per-player cache keys (summoner, league-entries, match-ids), and writes the new profile/match cache.

## Security & abuse protection

- IP-based rate limiter (`RATE_LIMIT_PER_MINUTE`, default 60) enforced via Redis counter on every API route.
- Riot API key is server-only; never sent to the browser.
- All path params are validated against a whitelist (regions, queues, tiers, regional routes) before being passed downstream.
- Retry with exponential backoff on Riot 5xx and 429 responses.
- Concurrency-limited match fetch (`p-limit`, max 5 in-flight).

## Development tips

- **Inspect cache:** `redis-cli MONITOR` to watch hits/misses live.
- **Inspect DB:** `npm run db:studio` opens Prisma Studio.
- **Debug logs:** `LOG_LEVEL=debug npm run dev` will log every cache hit/miss.
- **Test without cache:** `CACHE_ENABLED=false npm run dev` bypasses Redis entirely (development only — will hammer Riot API).
- **Clear cache for one player:** `redis-cli DEL "player-profile:BR1:gamename:tag"` (lowercased game name + tag).

## Deployment notes

- The app is fully serverable behind any Node host (Vercel, Fly, Railway, Render, etc.) plus a managed Postgres + Redis.
- Set all env vars in your platform's secret store. Never commit `.env`.
- Run `npx prisma migrate deploy` on first boot in production.
- For Vercel specifically: ensure your Redis provider supports the standard `redis://` or `rediss://` protocol (Upstash, Railway, etc. all work). The build command should be `prisma generate && next build`.

## Legal

Riftboard isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing League of Legends. League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc.

---

Built with ♟️ — extend it with analytics, win-rate trends, champion mastery, live-game spectating, whatever ships.
