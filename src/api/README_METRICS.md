# API Metrics & Observability

## Endpoints
- `GET /health` – Basic liveness info.
- `GET /metrics` – Prometheus exposition format. Includes:
  - `cocapi_ratelimit_limit`
  - `cocapi_ratelimit_remaining`
  - `cocapi_ratelimit_reset`
  - `cocapi_ratelimit_retry_after`
  - `coc_cache_memory_entries`
  - `coc_cache_redis_enabled`
  - `http_request_duration_seconds{method,route,status}`

## Rate Limit Headers
All responses (best-effort) include:
- `x-coc-ratelimit-limit`
- `x-coc-ratelimit-remaining`

These reflect the last observed Clash of Clans API headers.

## Debug (Service Role Required)
- `GET /api/coc/_debug/tokens`
- `GET /api/coc/_debug/ratelimit`
- `POST /api/coc/_debug/cache/flush`

Provide `x-service-token` header matching `SERVICE_BOT_TOKEN`.

## Caching
Two-tier cache:
1. Redis (if reachable and `ENABLE_REDIS_CACHE=true`)
2. In-memory fallback (always on per process)

Flush both via debug endpoint. Redis flush uses `FLUSHALL`.

## Prometheus Scrape Config Example
```yaml
scrape_configs:
  - job_name: coc-api
    metrics_path: /metrics
    static_configs:
      - targets: ['coc-api:3001']
```

## Security Notes
- Restrict `/metrics` and debug endpoints at network / ingress layer.
- Rotate Clash of Clans API tokens periodically; multiple tokens can be set with `COC_API_TOKENS=token1,token2`.

## Future Ideas
- Add success/error counters per upstream endpoint.
- Export Redis hit/miss ratios.
- Circuit breaker for repeated 429 responses.
