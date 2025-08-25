# Clash Tools - Required GitHub Secrets

---

## 🏗️ Core Infrastructure Secrets

LINODE_CLI_TOKEN=                    # Linode API token for server provisioning
CLOUDFLARE_API_TOKEN=           # Cloudflare API token for DNS management  
CLOUDFLARE_ZONE_ID=             # Zone ID for feastorfamine.test domain

## 🔐 Server Access & Security

COC_ROOT_PASSWORD=              # Root password for COC servers
ACTIONS_USER_PASSWORD=          # Password for GitHub Actions user account

## 💬 Discord Integration

DISCORD_WEBHOOK_URL=            # Discord webhook for deployment notifications
DISCORD_BOT_TOKEN=              # Optional: For advanced Discord features

## 🐳 Docker & Container Registry

DOCKER_USERNAME=                # Docker Hub username (for private images)
DOCKER_TOKEN=                   # Docker Hub access token

## 🌐 SSL & Domain Configuration

DOMAIN_NAME=coc.feastorfamine.test       # Primary domain for the web interface
ADMIN_EMAIL=                    # Email for Let's Encrypt SSL certificates

## 🛡️ Clash of Clans API

COC_API_TOKEN=                  # Primary CoC API token
COC_API_TOKENS=                 # (Optional) Comma-separated additional tokens
COC_CLAN_TAG=#9UQ9G99P          # Default clan tag
SERVICE_BOT_TOKEN=              # Internal service/debug token

## 📊 Monitoring (Optional)

NETDATA_CLAIM_TOKEN=            # Netdata monitoring claim token
NETDATA_CLAIM_ROOM=             # Netdata monitoring room ID
