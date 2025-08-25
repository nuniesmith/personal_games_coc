#!/bin/bash

# CoC Metrics Dashboard Startup Script
# Starts Docker Compose for web, API, Redis, and Nginx

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration & Environment selection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Determine environment name (precedence: --env arg handled later > ENV > APP_ENV > NODE_ENV > default)
ENV_NAME="${ENV:-${APP_ENV:-${NODE_ENV:-development}}}"

# Map env name to env file path (support legacy .env for backwards compat)
case "$ENV_NAME" in
    prod|production)   ENV_NAME="production";   ENV_FILE="$PROJECT_ROOT/.env.production" ;;
    dev|development)   ENV_NAME="development";  ENV_FILE="$PROJECT_ROOT/.env.development" ;;
    *)                 ENV_NAME="development";  ENV_FILE="$PROJECT_ROOT/.env.development" ;;
esac

LEGACY_ENV_FILE="$PROJECT_ROOT/.env"  # still honored if specific file missing
COMMON_ENV_FILE="$PROJECT_ROOT/.env.common"

# Early source common first, then env specific (or legacy) so overrides are available
if [ -f "$COMMON_ENV_FILE" ]; then
    set -a; . "$COMMON_ENV_FILE"; set +a || true
fi
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    set -a; . "$ENV_FILE"; set +a || true
elif [ -f "$LEGACY_ENV_FILE" ]; then
    set -a; . "$LEGACY_ENV_FILE"; set +a || true
fi

# Environment detection (simplified for web/API setup)
detect_environment() {
    if [ -f /.dockerenv ] || [ -n "$KUBERNETES_SERVICE_HOST" ]; then
        echo "container"
    elif command -v free &> /dev/null && [ "$(free -m | awk '/^Mem:/{print $2}')" -lt 4096 ]; then
        echo "resource_constrained"
    else
        echo "standard"
    fi
}

DETECTED_ENV=$(detect_environment)
BUILD_LOCAL="${BUILD_LOCAL:-false}"  # Default remote pull unless overridden (honors early-sourced .env)

# Simple logging
log() {
    local level="$1"
    shift
    local message="$*"
    case "$level" in
        "INFO") echo -e "${GREEN}[INFO]${NC} $message" ;;
        "WARN") echo -e "${YELLOW}[WARN]${NC} $message" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} $message" ;;
        "DEBUG") echo -e "${BLUE}[DEBUG]${NC} $message" ;;
    esac
}

debug_checkpoint() {
    if [ "${START_DEBUG:-0}" = "1" ]; then
        echo -e "${BLUE}[DEBUG]${NC} checkpoint: $1"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "INFO" "Checking prerequisites..."
    if ! command -v docker &> /dev/null || ! docker info &> /dev/null; then
        log "ERROR" "Docker is not installed or running!"
        exit 1
    fi
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        log "ERROR" "Docker Compose is not available!"
        exit 1
    fi
    log "INFO" "Prerequisites check passed"
}

# Create environment file if missing
create_env_file() {
    # Only auto-create for development to avoid accidental prod secret generation
    if [ "$ENV_NAME" = "production" ]; then
        log "ERROR" "No production env file found at $ENV_FILE. Create it manually (copy .env.production.example)."
        exit 1
    fi
    log "INFO" "Creating development environment file ($ENV_FILE)..."
    mkdir -p "$(dirname "$ENV_FILE")"
    JWT_SECRET="$(openssl rand -hex 16)"
    cat > "$ENV_FILE" << EOF
# CoC Metrics Dashboard Environment (Development)
COMPOSE_PROJECT_NAME=coc
NODE_ENV=development
TZ=America/Toronto

# API Configuration
PORT=3001
JWT_SECRET=$JWT_SECRET
COC_API_BASE_URL=https://api.clashofclans.com/v1
COC_API_TOKEN=your-api-token-here  # Get from developer.clashofclans.com
COC_CLAN_TAG=#9UQ9G99P

# Frontend (Dev)
VITE_API_URL=http://localhost/api
VITE_SOCKET_URL=http://localhost
FRONTEND_URL=http://localhost
DOMAIN_NAME=feastorfamine.test

# Redis / Cache
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=changeme

# Discord Bot (development)
DISCORD_BOT_TOKEN=
FEAST_LOCAL=1
FEAST_IS_MAIN=0
FEAST_IS_BETA=1
FEAST_TOTAL_CLUSTERS=1
FEAST_HEADLESS=1

# Optional Integrations / Telemetry
LINK_API_USER=
LINK_API_PASSWORD=
SENTRY_DSN=
FEAST_REMOTE_CONFIG_URL=
CLASHOFSTATS_USER_AGENT=FeastLocal/1.0
EMOJI_ASSET_VERSION=1
FEAST_WEBSOCKET_URL=
EOF
    log "INFO" "Development environment file created. Update COC_API_TOKEN & any secrets!"
    # Re-source freshly created file
    set -a; . "$ENV_FILE"; set +a || true
}

# Sync chosen env file to legacy .env for docker-compose variable substitution (non-destructive if same inode)
sync_legacy_env_file() {
    if [ ! -f "$ENV_FILE" ]; then return 0; fi
    # If legacy .env differs from current selected env file, copy (excluding prod -> dev downgrade message)
    if [ "$ENV_FILE" != "$LEGACY_ENV_FILE" ]; then
        cp "$ENV_FILE" "$LEGACY_ENV_FILE"
        debug_checkpoint "synced $ENV_FILE -> .env"
    fi
}

# Health polling for API instead of fixed sleep
wait_for_api_health() {
    local url="${API_HEALTH_URL:-http://localhost:3001/health}"
    local timeout="${STARTUP_TIMEOUT:-60}"
    local interval=2
    local start end
    start=$(date +%s)
    log INFO "Waiting for API health at $url (timeout ${timeout}s)..."
    while true; do
        if curl -fsS "$url" >/dev/null 2>&1; then
            log INFO "API is healthy"
            return 0
        fi
        end=$(date +%s)
        if [ $(( end - start )) -ge "$timeout" ]; then
            log WARN "API health not ready after ${timeout}s (continuing)"
            return 1
        fi
        sleep "$interval"
    done
}

# Strength / safety validation for production
production_safety_checks() {
    local failed=0
    # JWT secret length & placeholder check
    if [[ "${JWT_SECRET:-}" =~ replace-me ]] || [ ${#JWT_SECRET} -lt 24 ]; then
        log ERROR "JWT_SECRET too weak or placeholder in production"
        failed=1
    fi
    # Clash API token placeholder
    if [[ "${COC_API_TOKEN:-}" == *"your-api-token-here"* ]] || [ -z "${COC_API_TOKEN:-}" ]; then
        log ERROR "COC_API_TOKEN missing or placeholder in production"
        failed=1
    fi
    # Redis password check
    if [ -z "${REDIS_PASSWORD:-}" ] || [[ "$REDIS_PASSWORD" =~ changeme|password|^redis$ ]]; then
        log ERROR "REDIS_PASSWORD weak or missing in production"
        failed=1
    fi
    # Headless bot in prod warning
    if [ "${FEAST_HEADLESS:-0}" = "1" ]; then
        log WARN "FEAST_HEADLESS=1 in production (bot disabled)"
    fi
    # Domain sanity
    if [[ "${DOMAIN_NAME:-}" =~ feastorfamine\.test$ ]]; then
        log WARN "DOMAIN_NAME appears to be a dev domain in production: $DOMAIN_NAME"
    fi
    if [ $failed -eq 1 ]; then
        log ERROR "Production safety checks failed. Fix issues above or override with ALLOW_UNSAFE_PROD=1"
        if [ "${ALLOW_UNSAFE_PROD:-0}" != "1" ]; then
            exit 1
        else
            log WARN "ALLOW_UNSAFE_PROD=1 set – proceeding despite unsafe configuration"
        fi
    else
        log INFO "Production safety checks passed"
    fi
}

# Main function
main() {
    parse_args "$@"
    log "INFO" "Starting CoC Metrics Dashboard (env=$ENV_NAME)..."
    log "INFO" "Detected runtime environment: $DETECTED_ENV"
    log "INFO" "Build strategy: $([ "$BUILD_LOCAL" = "true" ] && echo "LOCAL" || echo "REMOTE")"
    log "INFO" "Using env file: $ENV_FILE${LEGACY_ENV_FILE:+ (legacy fallback checked)}"
    cd "$PROJECT_ROOT"
    check_prerequisites
    if [ ! -f "$ENV_FILE" ]; then
        create_env_file
        debug_checkpoint "created .env"
    else
        log "INFO" "Using existing .env file"
        debug_checkpoint "existing .env sourced"
    fi
    # Optionally load common again (in case created after first run) then sync legacy
    if [ -f "$COMMON_ENV_FILE" ]; then set -a; . "$COMMON_ENV_FILE"; set +a || true; fi
    sync_legacy_env_file
    preflight_env || log WARN "preflight_env returned non-zero ($?)"
    debug_checkpoint "after preflight_env"
    if [ "$ENV_NAME" != "production" ]; then
        ensure_dev_certs || log WARN "ensure_dev_certs returned non-zero ($?)"
        debug_checkpoint "after ensure_dev_certs"
    else
        log INFO "Production mode: skipping dev certificate generation"
    fi
    log "INFO" "Stopping existing services..."
    $COMPOSE_CMD down --remove-orphans 2>/dev/null || true
    debug_checkpoint "after compose down"
    if [ "$BUILD_LOCAL" = "true" ]; then
        log "INFO" "Building images locally (BUILD_LOCAL=true)..."
        $COMPOSE_CMD build --parallel
        debug_checkpoint "after build"
    else
        log "INFO" "Pulling images (set BUILD_LOCAL=true to skip remote pulls)..."
        # Pull may succeed with warnings (manifest unknown) – we still want to build missing ones
        $COMPOSE_CMD pull --ignore-pull-failures || true
        ensure_local_images_exist
        debug_checkpoint "after pull/ensure images"
    fi
    log "INFO" "Starting services..."
    $COMPOSE_CMD up -d
    debug_checkpoint "after compose up"
    log "INFO" "Waiting for services to initialize (containers)..."
    # Short initial grace period for containers to boot network listeners
    sleep 3
    log "INFO" "Service status:"
    $COMPOSE_CMD ps
    debug_checkpoint "after compose ps"
    if [ "$ENV_NAME" = "production" ]; then
        production_safety_checks
    fi
    log "INFO" "Testing connectivity..."
    wait_for_api_health || true
    log "INFO" "Dashboard startup complete ($ENV_NAME)."
    if [ "$ENV_NAME" = "production" ]; then
        log "INFO" "Access: https://$DOMAIN_NAME (ensure DNS & TLS configured)"
    else
        log "INFO" "Access: http://localhost (via Nginx)"
    fi
    log "INFO" "View logs: $COMPOSE_CMD logs -f"
    log "INFO" "Stop: $COMPOSE_CMD down"
}

# Parse args (simplified)
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h) show_help; exit 0 ;;
            --env) shift; ENV_NAME="$1" ;;
            --prod|--production) ENV_NAME=production ;;
            --dev|--development) ENV_NAME=development ;;
            *) log "ERROR" "Unknown option: $1"; exit 1 ;;
        esac
        shift || true
    done
}

show_help() {
    echo "CoC Metrics Dashboard Startup Script"
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --help, -h    Show this help"
    echo "  --env <name>  Environment (development|production)"
    echo "  --production  Shortcut for --env production"
    echo "  --development Shortcut for --env development"
    echo ""
    echo "Env Vars:"
    echo "  BUILD_LOCAL=true/false    Override build strategy"
    echo "  ENV / APP_ENV / NODE_ENV  Alternative ways to select environment"
}

# Build any images that are missing locally (after a pull with warnings)
ensure_local_images_exist() {
    # Derive image names (match docker-compose.yml defaults)
    local WEB_IMAGE_REF="${WEB_IMAGE:-nuniesmith/coc:web-latest}"
    local API_IMAGE_REF="${API_IMAGE:-nuniesmith/coc:api-latest}"
    # Feast bot image variable in compose is PY_BOT_IMAGE and default tag is feastbot-latest
    local FEAST_BOT_IMAGE_REF="${PY_BOT_IMAGE:-nuniesmith/coc:feastbot-latest}"

    local missing=()
    for img in "$WEB_IMAGE_REF" "$API_IMAGE_REF" "$FEAST_BOT_IMAGE_REF"; do
        if ! docker image inspect "$img" >/dev/null 2>&1; then
            missing+=("$img")
        fi
    done

    if [ ${#missing[@]} -gt 0 ]; then
        log "INFO" "Images missing locally: ${missing[*]} — building required services..."
        # Build only services whose images are missing to save time
        local build_services=()
        [[ " ${missing[*]} " == *"$WEB_IMAGE_REF"* ]] && build_services+=(coc-web)
        [[ " ${missing[*]} " == *"$API_IMAGE_REF"* ]] && build_services+=(coc-api)
        [[ " ${missing[*]} " == *"$FEAST_BOT_IMAGE_REF"* ]] && build_services+=(feast-bot)
        if [ ${#build_services[@]} -gt 0 ]; then
            $COMPOSE_CMD build "${build_services[@]}"
        fi
    else
        log "INFO" "All expected images already exist locally (no build needed)."
    fi
}

# Generate self-signed certs for local dev if missing (matches nginx.conf expected paths)
ensure_dev_certs() {
    local SSL_DIR="$PROJECT_ROOT/ssl"
    local CRT="$SSL_DIR/server.crt"
    local KEY="$SSL_DIR/server.key"
    local DHPARAM="$SSL_DIR/dhparam.pem"
    mkdir -p "$SSL_DIR"
    # If all exist, skip
    if [ -f "$CRT" ] && [ -f "$KEY" ] && [ -f "$DHPARAM" ]; then
        log "INFO" "SSL assets present"
        return 0
    fi
    if ! command -v openssl >/dev/null 2>&1; then
        log "WARN" "openssl not installed; skipping cert generation. Nginx TLS will fail without certificates. Install openssl or provide certs in ssl/."
        return 0
    fi
    # Determine domain (prefer env var, then .env file, fallback localhost)
    local DOMAIN="$DOMAIN_NAME"
    if [ -z "$DOMAIN" ] && [ -f "$ENV_FILE" ]; then
        DOMAIN=$(grep -E '^DOMAIN_NAME=' "$ENV_FILE" | tail -1 | cut -d= -f2 | tr -d '"' || true)
    fi
    [ -z "$DOMAIN" ] && DOMAIN=localhost
    log "INFO" "Generating self-signed TLS assets (dev) for $DOMAIN..."
    # Key & cert
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
        -keyout "$KEY" -out "$CRT" \
        -subj "/CN=$DOMAIN" >/dev/null 2>&1 || { log "ERROR" "Failed to generate key/cert"; return 1; }
    # DH params (may take time) – generate smaller (2048) for speed
    openssl dhparam -out "$DHPARAM" 2048 >/dev/null 2>&1 || { log "WARN" "Failed to generate dhparam; removing reference"; rm -f "$DHPARAM"; }
    log "INFO" "Self-signed certificate generated for $DOMAIN"
}

# Warn about missing critical env values & allow headless bot mode
preflight_env() {
    # shellcheck disable=SC1090
        if [ -f "$ENV_FILE" ]; then
            set -a; source "$ENV_FILE"; set +a || true
        elif [ -f "$LEGACY_ENV_FILE" ]; then
            set -a; source "$LEGACY_ENV_FILE"; set +a || true
        fi
    local warned=0
    if [ -z "$COC_API_TOKEN" ] || [[ "$COC_API_TOKEN" == *"your-api-token-here"* ]]; then
        log "WARN" "COC_API_TOKEN is empty or placeholder (Clash API features limited)."
        warned=1
    fi
    if [ "${FEAST_HEADLESS:-0}" != "1" ] && [ -z "$DISCORD_BOT_TOKEN" ]; then
        log "WARN" "DISCORD_BOT_TOKEN empty. Set FEAST_HEADLESS=1 for headless mode or supply a token."
        warned=1
    fi
    if [ -z "$REDIS_PASSWORD" ]; then
        log "WARN" "REDIS_PASSWORD empty (redis running without auth)."
        warned=1
    fi
    [ $warned -eq 1 ] && log "INFO" "Proceeding with current values. Edit $ENV_FILE to change."
}

main "$@"