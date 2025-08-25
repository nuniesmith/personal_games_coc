import express from 'express';
import fs from 'fs';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server as SocketIO } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
// (Server management routes removed in Clash-only refocus, keeping other core routes)
import systemRoutes from './routes/system.js';
import cocRoutes from './routes/coc.js';
import warRoutes from './routes/war.js';
import assignmentsRoutes from './routes/assignments.js';
import { getOpenApiSpec } from './openapi.js';
import feastRoutes from './routes/feast.js';
import authRoutes from './routes/auth.js';
import oidcRoutes from './routes/oidc.js';

// Import middleware
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';

// Import socket handlers
import { initializeSocketHandlers } from './sockets/handlers.js';
import { initCache, cacheStats } from './utils/cache.js';
import client from 'prom-client';
import { getPrometheusRateLimitMetrics, cocApi } from './utils/cocApi.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app); // Create server instance

// Initialize cache (Redis or fallback)
await initCache();

// Prometheus metrics registry & gauges
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const rlLimit = new client.Gauge({ name: 'cocapi_ratelimit_limit', help: 'Clash of Clans API rate limit total' });
const rlRemaining = new client.Gauge({ name: 'cocapi_ratelimit_remaining', help: 'Clash of Clans API rate limit remaining' });
const rlReset = new client.Gauge({ name: 'cocapi_ratelimit_reset', help: 'Clash of Clans API rate limit reset epoch' });
const rlRetry = new client.Gauge({ name: 'cocapi_ratelimit_retry_after', help: 'Clash of Clans API retry-after seconds' });
const cacheMemoryEntries = new client.Gauge({ name: 'coc_cache_memory_entries', help: 'In-memory cache entry count' });
const cacheRedisEnabled = new client.Gauge({ name: 'coc_cache_redis_enabled', help: 'Redis enabled flag (1/0)' });
const cacheHits = new client.Gauge({ name: 'coc_cache_hits', help: 'Cache total hits' });
const cacheMisses = new client.Gauge({ name: 'coc_cache_misses', help: 'Cache total misses' });
const cacheHitRatio = new client.Gauge({ name: 'coc_cache_hit_ratio', help: 'Cache hit ratio (0-1)' });
const httpReqDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5]
});
register.registerMetric(rlLimit);
register.registerMetric(rlRemaining);
register.registerMetric(rlReset);
register.registerMetric(rlRetry);
register.registerMetric(cacheMemoryEntries);
register.registerMetric(cacheRedisEnabled);
register.registerMetric(cacheHits);
register.registerMetric(cacheMisses);
register.registerMetric(cacheHitRatio);
register.registerMetric(httpReqDuration);

setInterval(() => {
  const rl = getPrometheusRateLimitMetrics();
  rlLimit.set(rl.limit);
  rlRemaining.set(rl.remaining);
  rlReset.set(rl.reset);
  rlRetry.set(rl.retryAfter);
  const cs = cacheStats();
  cacheMemoryEntries.set(cs.memoryEntries);
  cacheRedisEnabled.set(cs.redisEnabled ? 1 : 0);
  if (typeof cs.hits === 'number') cacheHits.set(cs.hits);
  if (typeof cs.misses === 'number') cacheMisses.set(cs.misses);
  if (typeof cs.hitRatio === 'number') cacheHitRatio.set(cs.hitRatio);
}, 10_000).unref();

// Initialize Socket.IO
const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const FRONTEND_URL = process.env.FRONTEND_URL;
const FRONTEND_URLS = process.env.FRONTEND_URLS?.split(',').map(s => s.trim()).filter(Boolean) || [];
let allowedOrigins = [...DEFAULT_ORIGINS, ...(FRONTEND_URL ? [FRONTEND_URL] : []), ...FRONTEND_URLS];
// Expand each origin to include both http/https variants if a scheme is present (dev convenience)
const expanded = new Set();
for (const origin of allowedOrigins) {
  if (!origin) continue;
  expanded.add(origin);
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      expanded.add(url.toString().replace(/\/$/, ''));
    } else if (url.protocol === 'https:') {
      url.protocol = 'http:';
      expanded.add(url.toString().replace(/\/$/, ''));
    }
  } catch { /* ignore invalid */ }
}
allowedOrigins = Array.from(expanded);

const io = new SocketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});
// Make io accessible to routes for event emission
app.set('io', io);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      // Allow XHR / fetch / websocket connections to backend + any configured frontend origins
      connectSrc: [
        "'self'",
        ...allowedOrigins,
        'ws:',
        'wss:'
      ],
    }
  }
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    // Strip trailing slash for comparison
    const cleaned = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(cleaned)) return callback(null, true);
    return callback(new Error('Not allowed by CORS: ' + cleaned));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -----------------------------
// Startup Clash of Clans token validation (fast feedback)
// -----------------------------
function resolveRawTokens() {
  return (process.env.COC_API_TOKENS || process.env.COC_API_TOKEN || process.env.API_TOKEN || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

const startupTokens = resolveRawTokens();
if (startupTokens.length === 0) {
  logger.error('Startup check: No Clash of Clans API token configured (COC_API_TOKENS / COC_API_TOKEN). Upstream CoC requests will fail (401/403).');
  if (process.env.ALLOW_EMPTY_COC_TOKEN !== '1') {
    if ((process.env.NODE_ENV || 'development') === 'development') {
      logger.error('Production mode without Clash of Clans API token. Exiting. Set ALLOW_EMPTY_COC_TOKEN=1 to bypass for diagnostics.');
      process.exit(1);
    } else {
      logger.warn('Continuing in development without token (ALLOW_EMPTY_COC_TOKEN not set).');
    }
  }
} else {
  // Fire-and-forget validation of first token using configured clan tag (if present)
  (async () => {
    const tag = process.env.COC_CLAN_TAG;
    if (!tag) {
      logger.warn('COC_CLAN_TAG not set; skipping startup validation request.');
      return;
    }
    try {
      await cocApi.getClan(tag);
      logger.info(`Clash API startup validation succeeded for clan ${tag}`);
    } catch (e) {
      const status = e?.response?.status;
      const upstreamMsg = e?.response?.data?.message || e.message;
      logger.warn(`Clash API startup validation failed (${status || 'n/a'}): ${upstreamMsg}`);
      if (status === 403 || status === 401) {
        logger.warn('If this is accessDenied, verify the container host public IP is on the allowed IP list in the CoC developer portal.');
      }
    }
  })();
}

// Request logging
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  const rl = getPrometheusRateLimitMetrics();
  if (rl.limit) {
    res.setHeader('x-coc-ratelimit-limit', String(rl.limit));
    res.setHeader('x-coc-ratelimit-remaining', String(rl.remaining));
  }
  res.on('finish', () => {
    try {
      const diffNs = Number(process.hrtime.bigint() - start);
      const seconds = diffNs / 1e9;
      httpReqDuration.labels(req.method, req.route?.path || req.path || 'unknown', String(res.statusCode)).observe(seconds);
    } catch (_) { /* ignore metrics errors */ }
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Aggregated health/status (lightweight, no upstream CoC calls to keep it fast)
app.get('/health/aggregate', async (req, res) => {
  try {
    // Cache / rate limit metrics
    const rl = getPrometheusRateLimitMetrics();
    const cs = cacheStats();
    // Asset version if computed
    const assetVersion = (()=>{ try { return app?._router && typeof _assetVersion !== 'undefined' ? _assetVersion : null; } catch { return null; } })();
    // Basic process stats
    const mem = process.memoryUsage();
    const uptimeSec = process.uptime();
    res.json({
      success: true,
      data: {
        service: {
          status: 'ok',
          version: process.env.npm_package_version || '1.0.0',
          node: process.version,
          uptimeSec
        },
        rateLimit: rl,
        cache: cs,
        assets: { version: assetVersion },
        process: {
          rss: mem.rss,
          heapUsed: mem.heapUsed,
          heapTotal: mem.heapTotal
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Metrics endpoint (scrape with Prometheus; restrict network externally if needed)
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (e) {
    res.status(500).send('metrics collection error');
  }
});

// API Routes
app.use('/api/auth', authRoutes);
// Mount OIDC only if essential env vars present to prevent startup crash when unused
if (process.env.OIDC_ISSUER_URL && process.env.OIDC_CLIENT_ID && process.env.OIDC_REDIRECT_URI) {
  app.use('/api/oidc', oidcRoutes);
} else {
  logger.warn('OIDC routes disabled (missing OIDC_ISSUER_URL / OIDC_CLIENT_ID / OIDC_REDIRECT_URI)');
}
app.use('/api/system', authMiddleware, systemRoutes);
app.use('/api/coc', authMiddleware, cocRoutes);
app.use('/api/war', authMiddleware, warRoutes);
app.use('/api/assignments', authMiddleware, assignmentsRoutes);
app.use('/api/feast', authMiddleware, feastRoutes);
// OpenAPI (unauthenticated read-only spec)
app.get('/api/docs/openapi.json', (req,res)=>{
  try { res.json(getOpenApiSpec(process.env.FRONTEND_URL||'')); } catch(e){ res.status(500).json({ error: 'spec generation failed' }); }
});
// Lightweight HTML viewer (no external CDN to comply with CSP)
app.get('/api/docs', (req,res)=>{
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Clash Ops API Docs</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{font:14px system-ui,Arial,sans-serif;background:#0f1115;color:#eee;margin:0;padding:1.5rem;}h1{margin-top:0;font-size:1.4rem;}code,pre{background:#1e2430;padding:.5rem;border-radius:4px;display:block;overflow:auto;max-height:60vh;}a{color:#6ea8ff;text-decoration:none;}a:hover{text-decoration:underline;} .path{margin:.25rem 0;padding:.25rem .5rem;border-left:4px solid #3b82f6;background:#1b2330;border-radius:3px;} .method{font-weight:600;margin-right:.5rem;text-transform:uppercase;} .get{color:#10b981;} .post{color:#f59e0b;} .put{color:#6366f1;} .delete{color:#ef4444;} footer{margin-top:2rem;font-size:.7rem;color:#666;}</style></head><body><h1>Clash Ops API</h1><p>Generated OpenAPI summary. Full JSON: <a href="/api/docs/openapi.json">/api/docs/openapi.json</a></p><div id="paths">Loading…</div><footer>Lightweight viewer (inline) – no CDN assets.</footer><script>fetch('/api/docs/openapi.json').then(r=>r.json()).then(spec=>{const c=document.getElementById('paths'); if(!spec.paths){c.textContent='No paths';return;} c.innerHTML=''; Object.entries(spec.paths).forEach(([p, ops])=>{ Object.entries(ops).forEach(([m, cfg])=>{ const div=document.createElement('div'); div.className='path'; div.innerHTML='<span class="method '+m+'">'+m+'</span><span>'+p+'</span> - '+(cfg.summary||''); c.appendChild(div); }); }); }).catch(()=>{ document.getElementById('paths').textContent='Failed to load spec';});</script></body></html>`;
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.send(html);
});

// -------- Game Asset Static Serving (downloaded-game-assets) --------
const ASSET_DIR = path.join(process.cwd(), 'downloaded-game-assets');
let _assetVersion = null;
function computeAssetVersion(manifest) {
  try {
    const base = JSON.stringify({ generatedAt: manifest.generatedAt, cats: Object.keys(manifest.categories||{}) });
    return crypto.createHash('sha1').update(base).digest('hex').slice(0,12);
  } catch { return 'unknown'; }
}
if (fsExistsSafe(ASSET_DIR)) {
  const manifestPath = path.join(ASSET_DIR, 'manifest.json');
  if (fsExistsSafe(manifestPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      _assetVersion = computeAssetVersion(raw);
    } catch { _assetVersion = 'unknown'; }
  }
  app.use('/assets/game', express.static(ASSET_DIR, {
    maxAge: '365d',
    immutable: true,
    setHeaders: (res, filePath) => {
      // Individual files cache very long (fingerprinted by version endpoint consumers can append ?v=)
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      if (_assetVersion) res.setHeader('X-Assets-Version', _assetVersion);
    }
  }));
  // Lightweight version endpoint (fast HEAD/GET) so clients can revalidate
  app.get('/api/assets/game/version', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    return res.json({ success: true, version: _assetVersion || 'unknown' });
  });
  app.get('/api/assets/game/manifest', (req, res) => {
    try {
      const manifestPath = path.join(ASSET_DIR, 'manifest.json');
      if (!fsExistsSafe(manifestPath)) return res.status(404).json({ success: false, error: 'manifest not found' });
      const data = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
      // Recompute version if not set (or allow manual refresh by query ?refresh=1)
      if (!_assetVersion || req.query.refresh === '1') _assetVersion = computeAssetVersion(data);
      res.setHeader('Cache-Control', 'no-cache'); // allow conditional requests but always revalidate quickly
      res.setHeader('X-Assets-Version', _assetVersion || 'unknown');
      res.json({ success: true, version: _assetVersion, data });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
  });
}

function fsExistsSafe(p){ try { return !!(p && require('fs').existsSync(p)); } catch { return false; }
}

// Serve static files from React build
if (process.env.NODE_ENV === 'development') {
  app.use(express.static(path.join(__dirname, '../web/dist')));

  // Express 5 (path-to-regexp v7) no longer supports a bare "*" path.
  // Using a RegExp keeps /api/* endpoints from being swallowed while still
  // providing SPA history fallback for any other path.
  app.get(/^\/(?!api\/).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../web/dist/index.html'));
  });
}

// Error handling middleware
app.use(errorHandler);

// Initialize Socket.IO handlers
initializeSocketHandlers(io);

const PORT = process.env.PORT || 3001;
if (process.env.JEST_WORKER_ID === undefined) { // avoid automatic listen during Jest tests (test harness mounts separately)
  server.listen(PORT, () => {
    logger.info(`🚀 COC Server API started on port ${PORT}`);
    logger.info(`📱 Allowed Frontend URLs: ${allowedOrigins.join(', ')}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

export { app, io, server };
