Cache Key Namespace
====================

This document defines the canonical cache key formats used across the API (Node.js) and planned for reuse by the bot / future services. Keeping a stable, documented key contract allows moving from in‑memory → Redis → cross‑service shared cache without breaking behavior.

Guiding Principles
------------------
- Keys are lowercase, colon `:` delimited.
- Prefix by feature domain (assign, war, clan, player, lb (leaderboard), sys).
- Include all major disambiguators (clan tag, size, algorithm, variant flags) in a deterministic order.
- Avoid embedding user PII; rely on public game identifiers (clan / player tags) only.
- TTLs chosen relative to upstream data volatility & rate limits.

Current Keys (Implemented)
-------------------------
| Key Pattern | Description | Example | Typical TTL (ms) |
|-------------|-------------|---------|------------------|
| `assign:{clanTag}:{warSize}:{algorithm}` | War assignment generation result (strength/mirror/optimal). | `assign:#ABCD123:15:strength` | 30,000 |
| `war:prep:{clanTag}:{mode}` | War prep stats (mode = `basic` or `heroes`). | `war:prep:#ABCD123:basic` | 20,000–120,000 adaptive |

Adaptive TTL Logic (war prep)
-----------------------------
State-based TTL heuristics used in `getPrepStats`:
- `inWar`: 20s
- `preparation`: 30s
- otherwise (not in war): 120s
- Hero-inclusive requests get minimum 60s to amortize player detail calls.

Planned / Reserved Keys
-----------------------
| Key Pattern | Purpose (Planned) |
|-------------|-------------------|
| `lb:attacks:{clanTag}:{season}:{metric}:{page}` | Cached leaderboard slice for attack / performance metrics. |
| `war:live:{clanTag}` | Last emitted live war payload (for late socket join replay). |
| `assign:heuristicMeta:{clanTag}` | Cached precomputed weights / hero summaries accelerating assignment generation. |
| `player:profile:{playerTag}` | Individual player profile (thin wrapper around upstream) with short TTL (10–30s). |
| `clan:summary:{clanTag}` | Aggregated clan summary (existing endpoint consolidation) 30–60s. |

Cross-Service Considerations
----------------------------
- The bot SHOULD reuse identical key formats when reading shared Redis to avoid redundant upstream fetches (e.g., reuse `war:prep:` payload before generating embeds).
- When a value is JSON encoded, ensure forward compatibility: add new fields rather than altering existing structure; avoid positional arrays unless fixed format.

Versioning & Migration
----------------------
If a breaking structural change to a cached value is unavoidable, introduce a versioned prefix (e.g., `v2:assign:...`) and expire the old namespace rather than hot-swapping formats.

Invalidation Strategy
---------------------
- Primarily TTL driven to respect upstream limits.
- On explicit push endpoints (e.g., `/war/push-prep`) we may refresh & overwrite early.
- Manual admin flush (future) can call a flush endpoint or targeted key deletion using patterns; avoid broad `FLUSHALL` in multi-tenant Redis deployments.

Security Notes
--------------
- No sensitive secrets stored in cache keys or values.
- Consider size limits (avoid storing huge manifests inline—prefer referencing object storage in future expansions).

Future Enhancements
-------------------
- Metrics: Expose cache hit/miss counters (hit ratio) via Prometheus for tuning TTLs.
- Central module exporting key builder helper functions to reduce typos.
