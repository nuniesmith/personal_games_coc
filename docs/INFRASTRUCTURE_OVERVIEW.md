# COC Server Infrastructure Overview (Simplified - No VPN)

## 🏗️ Architecture

```text
GitHub Actions (Self-hosted) ←→ Linode Server (Public IP)
     ↓                          ↓
  Build & Deploy            COC Dedicated Server
  Public IP Access          Nginx → API + Frontend + Redis
```

No private overlay network (Tailscale) is required anymore. All access flows through standard HTTPS / HTTP locally.

## 🔐 Access Strategy

### GitHub Actions → Server

- Connection: Public IP (SSH)
- Auth: `ACTIONS_USER_PASSWORD` / keys (recommended to migrate to key auth)
- Purpose: Deploy containers / update images

### Cloudflare DNS → Server

- Points to: Public server IP
- Purpose: Route `coc.feastorfamine.test` (optional; can use localhost for dev)
- Access: Standard HTTPS (certs via Let's Encrypt or self-signed locally)

### Users → Server

- Connection: Browser → `https://coc.feastorfamine.test` (or `http://localhost`)
- Requirement: None (public). Restrict via firewall or auth if needed.
- Security: JWT auth + rate limiting + HTTPS (prod)

## 🌐 DNS Configuration (Prod)

```text
Domain: coc.feastorfamine.test
Cloudflare A/AAAA → Public IP
Optional: CNAME records for api / auth if separated later
```

## 🚀 Deployment Process

1. GitHub Actions Workflow triggers
2. Check for existing Linode server (`LINODE_CLI_TOKEN`)
3. If server exists:
   - SSH to server
   - Pull / build images
   - Run `docker compose up -d`
   - (If IP changed) Update Cloudflare DNS → point to new public IP
4. Result: Web interface publicly accessible

## 📋 Secrets Mapping

| Secret | Usage | Notes |
|--------|-------|-------|
| `LINODE_CLI_TOKEN` | Provision / status | Automation |
| `COC_ROOT_PASSWORD` | Root fallback | Consider SSH keys |
| `ACTIONS_USER_PASSWORD` | Deploy user | Prefer key auth |
| `CLOUDFLARE_API_TOKEN` | DNS updates | Optional if static IP |
| `CLOUDFLARE_ZONE_ID` | DNS zone |  |
| `DOMAIN_NAME` | Env/UI |  |
| `SERVICE_BOT_TOKEN` | Internal endpoints | Optional |
| `DISCORD_WEBHOOK_URL` | Notifications | Optional |
| `DISCORD_BOT_TOKEN` | Bot features | Optional |
| `NETDATA_CLAIM_TOKEN` | Monitoring | Optional |
| `NETDATA_CLAIM_ROOM` | Monitoring | Optional |

Removed: `TAILSCALE_AUTH_KEY` (VPN no longer used)

## 🔧 Server Configuration

### Users

- `root` (admin)
- `actions` (deployment)

### Network

- Public IP serves all traffic
- DNS (optional) → Public IP

### Services

- Clash Tools API (Node.js)
- React Frontend (static build)
- Nginx (reverse proxy / TLS)
- Redis (cache)
- Netdata (optional monitoring)

## 🎯 Security Model (Current)

```text
Users → Cloudflare DNS → Nginx → API / Frontend → Redis
```

Security Controls:

- ✅ Rate limiting
- ✅ Helmet headers
- ✅ CORS restricted to allowed origins
- ✅ JWT auth
- 🔄 Optional: Add fail2ban / WAF / Cloudflare rules

## ✅ Migration Notes (From VPN → Public)

- Remove any Tailscale-specific env vars & secrets (done)
- Update docs, UI labels (done)
- Adjust frontend fallbacks to use relative `/api` (done)
- Ensure TLS termination via Nginx for development

## 🚀 Getting Started (Local)

1. Run `./start.sh`
2. Visit `http://localhost`
3. API: `http://localhost:3001/health`

## 🚀 Getting Started (Prod Outline)

1. Provision server (Linode or other)
2. Point DNS A record → server IP
3. Install Docker & compose plugin
4. Copy project & `.env`
5. `docker compose up -d`
6. Configure real certificates (e.g., certbot) – replace self-signed

Your simplified infrastructure is ready. 🎉
