# Clash of Clans Clan Tools

## Overview
Clan management & observability toolkit providing API aggregation, caching, metrics, and a React dashboard for your Clash of Clans clan.

## Features

- Clan overview & member listing
- War log & current war snapshot
- Capital raid seasons & league group data
- Player profile lookup & token verification
- Leagues, locations, labels & gold pass endpoints
- Multi-token rotation with rate limit tracking
- Redis + in-memory hybrid caching
- Prometheus metrics (/metrics) with rate limit & cache stats
- Secure debug endpoints (service token)
- Asset browser & manifest with long-term immutable cached delivery + version endpoint
- Icon mapping system (auto-suggest, auto-apply, seeding for Town Halls / heroes / pets / equipment) with undo/redo history
- Realtime summary diff push over WebSocket (Socket.IO)
- Aggregated health endpoint `/health/aggregate`
- Mini status bar (asset version, API rate limit, war remaining attacks)
- Keyboard shortcut help overlay and persistent icon mapping history (session-based)

## Quick Start Guide

## Quick Start (Development – Node API & Web Only)

```bash
git clone <repo>
cd coc/src/api
cp .env.example .env
# add COC_API_TOKEN or COC_API_TOKENS
npm install
npm run dev
```

Frontend (React):

```bash
cd ../web
npm install
npm run dev
```

## Docker Stack (API + Web + Bot + Redis + Mongo + Nginx)

For a full local stack including the Feast bot and infrastructure services:

```bash
export BUILD_LOCAL=true   # build images locally instead of pulling
./start.sh
```

Then visit http://localhost

### Generated `.env`
The `start.sh` script creates `.env` with sane defaults if missing. Key fields to edit:

| Variable | Purpose | Required |
|----------|---------|----------|
| COC_API_TOKEN | Clash of Clans API token | Yes (for live data) |
| DISCORD_BOT_TOKEN | Discord bot token | Yes (unless headless) |
| REDIS_PASSWORD | Secures Redis (also used by services) | Recommended |
| LINK_API_USER / LINK_API_PASSWORD | Optional DiscordLinks integration | Optional |
| FEAST_HEADLESS | Set to `1` to run bot without Discord login | Optional |
| FEAST_IS_MAIN / FEAST_IS_BETA | Cluster / mode flags | Optional |

Headless mode (no Discord gateway) can be enabled by setting `FEAST_HEADLESS=1` (useful for testing API + background tasks only).

### Bot Environment Mapping
`src/bot/utility/startup.py` maps environment variables to the `Config` object. Missing LINK_API credentials disable that feature with a single warning.

### Health Endpoints
- API: `http://localhost:3001/health`
- Bot internal: `http://localhost:8027/health`
- Aggregated (API): `/health/aggregate`

### Rebuilding Only the Bot
```bash
docker compose up -d --build feast-bot
```

### Logs
```bash
docker compose logs -f feast-bot
```

If `FEAST_HEADLESS=1` or `DISCORD_BOT_TOKEN` is unset, the bot stays in a headless loop with its health server active.

## 🎛️ **Available Options**

### Primary API Endpoints

- `/api/coc/clan`
- `/api/coc/clan/members`
- `/api/coc/clan/warlog`
- `/api/coc/clan/currentwar`
- `/api/coc/clan/capitalraidseasons`
- `/api/coc/clan/warleaguegroup`
- `/api/coc/players/:playerTag`
- `/api/coc/players/:playerTag/verify-token`
- `/api/coc/labels/clans` | `/api/coc/labels/players`
- `/api/coc/leagues` | `/api/coc/warleagues` | `/api/coc/capitalleagues` | `/api/coc/builderleagues`
- `/api/coc/locations`
- `/api/coc/goldpass`

### Rate Limit Aware

Responses expose:

- `x-coc-ratelimit-limit`
- `x-coc-ratelimit-remaining`

### Metrics

`GET /metrics` (Prometheus)

## File Structure (Simplified)

```text
coc/
├── src/api        # Express API (clan/tools)
├── src/web        # React dashboard
├── docs           # Documentation
└── docker         # Container build files
```

## Environment Variables (Core)

```env
COC_API_TOKEN=primary_token
# or
COC_API_TOKENS=token1,token2,token3
COC_CLAN_TAG=#YourClanTag
REDIS_URL=redis://user:pass@host:6379
SERVICE_BOT_TOKEN=internal-service-token
JWT_SECRET=change-me
```

## Troubleshooting (Common)

1. Invalid token → Refresh CoC API tokens in Supercell dev portal
2. 403 / 401 spam → Token revoked or IP not whitelisted
3. Repeated 429 → Add more tokens or reduce polling; inspect `/api/coc/_debug/ratelimit`
4. Stale data → Purge cache: `POST /api/coc/_debug/cache/flush` with `x-service-token`

## Debug Endpoints (Protected)

- `GET /api/coc/_debug/tokens`
- `GET /api/coc/_debug/ratelimit`
- `POST /api/coc/_debug/cache/flush`

Header: `x-service-token: <SERVICE_BOT_TOKEN>`

## Roadmap

- WebSocket push for war / raid updates
- Expanded persistence for historical metrics
- Automatic token health rotation policies
- Discord bot integration examples

## 🧠 Keyboard Shortcuts & UI Enhancements

### Asset Browser

| Action | Shortcut |
| ------ | -------- |
| Undo icon mapping change | Ctrl/Cmd + Z |
| Redo icon mapping change | Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y |
| Toggle shortcut help overlay | ? |

History is capped at 50 states and persisted per browser tab via `sessionStorage` (`iconMappingHistory`). The help overlay can be toggled at any time with the `?` key.

### Clan Dashboard Status Bar

A sticky mini status bar (top of page) surfaces:

- Asset version (first 10 chars of hash) sourced from `/api/assets/game/version`
- Current Clash API rate limit remaining/limit (live from summary polling)
- War remaining attacks summary (total remaining / total slots) when a war is active

### War Timeline & Remaining Attacks

The war panel displays a computed attack usage table plus a lightweight attack timeline (first 50 ordered entries). If future payloads include precise timestamps, ordering will upgrade from `order` field to `attackTime` sorting (see Implementation Notes below).

## 🛠 Implementation Notes (Timeline Ordering)

Current sorting logic (in `ClanDashboard.jsx`):

1. Prefer `attack.order` numeric field
2. Fallback stable copy ordering
3. Cap to 50 entries for render performance

Future optimization (when timestamps are available):

```js
attacks.slice().sort((a,b)=> new Date(a.attackTime) - new Date(b.attackTime))
```

Will automatically prefer chronological ordering if `attack.attackTime` is present and valid ISO.

## License

MIT
