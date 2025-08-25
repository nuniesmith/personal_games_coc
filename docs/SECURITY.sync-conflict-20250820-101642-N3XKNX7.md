# Security Overview

## Current Measures

- JWT authentication with bearer tokens for protected API routes.
- Service-to-service auth via `x-service-token` shared secret header (Discord bot).
- Helmet for baseline HTTP security headers.
- Rate limiting (100 requests / 15 min / IP) on `/api/`.
- Centralized error handling (`errorHandler.js`) with structured logging (Winston).
- Clash of Clans API token rotation + upstream rate limit header exposure.
- Prometheus metrics for observability.

## Recent Hardening (Phase 1)

- Disabled default in-memory users in production unless `ALLOW_DEFAULT_USERS=1`.
- Enforced stronger password requirements (length + complexity) on login validation.
- Warn on weak `JWT_SECRET` (<24 chars) at startup.
- Improved code analysis script to exclude logs and truncate large files (limits accidental secret sprawl in reports).
- Ensured logs directory is created explicitly (prevents silent failures).

## Known Gaps / Upcoming Tasks

| Area | Gap | Planned Action |
|------|-----|----------------|
| AuthN Persistence | In-memory users only | Add database (SQLite/Postgres) or external IdP via OIDC fully |
| Token Revocation | Stateless JWT, no blacklist | Shorter TTL + refresh pattern or maintain denylist in Redis |
| Service Auth | Single shared service token | Rotate + scope separate tokens (bot vs future workers) |
| Rate Limiting | Global generic limit | Add route-specific + user-based & burst handling (Redis) |
| Input Validation | Limited to auth route | Add celebrate/joi or zod schemas per route |
| Monitoring | Basic metrics | Add alerting rules (rate limit exhaustion, auth failures) |
| Transport Security | Nginx SSL, but http-only config present | Enforce HTTPS in production & HSTS |
| Dependency Security | Manual `npm audit` | Automate via CI (GitHub Dependabot / audit job) |
| Logging | Potential PII in logs | Scrub sensitive fields (password, tokens) middleware |
| Discord Bot Permissions | Broad intents minimal gating | Principle of least privilege & command cooldowns |

## Configuration Hardening Checklist

- [ ] Set strong `JWT_SECRET` (>=48 random chars).
- [ ] Set `NODE_ENV=production` in production containers.
- [ ] Provide `COC_API_TOKENS` & restrict IPs via CoC developer portal.
- [ ] Configure OIDC vars (`OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`) to enable SSO.
- [ ] Set distinct `SERVICE_BOT_TOKEN` (not reused for other services) and rotate quarterly.
- [ ] Enforce HTTPS at proxy; redirect HTTP to HTTPS.
- [ ] Configure log retention & rotation (e.g., via Docker logging driver or external stack).

## Incident Response Basics

1. Identify: Monitor logs & metrics (error spikes, rate limit exhaustion, auth failures).
2. Contain: Revoke / rotate compromised secrets (`JWT_SECRET`, service tokens, CoC tokens).
3. Eradicate: Patch vulnerable dependency; redeploy containers.
4. Recover: Validate functionality and monitor for regression.
5. Postmortem: Document root cause and prevention steps.

## Future Enhancements

- Add structured audit log (user, action, resource, success/failure) to separate sink.
- Integrate Web Application Firewall (optional) in front of Nginx.
- Implement per-user & per-service API keys with scopes.
- Add CSP nonces & stricter `script-src` (remove `'unsafe-inline'`).
Security is iterative: treat this as living documentation updated each phase.
