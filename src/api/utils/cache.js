import { createClient } from 'redis';
import { logger } from './logger.js';

let redisClient = null;
let redisEnabled = false;

// Allow tests to force disable by setting REDIS_URL explicitly to empty string
const RAW_REDIS_URL = process.env.REDIS_URL;
const REDIS_URL = (RAW_REDIS_URL === '') ? '' : (RAW_REDIS_URL || process.env.REDIS_URL_INTERNAL || 'redis://redis:6379');
const ENABLE_REDIS_CACHE = (process.env.ENABLE_REDIS_CACHE || 'true').toLowerCase() === 'true' && REDIS_URL !== '';

export async function initCache() {
  if (!ENABLE_REDIS_CACHE) {
    logger.info('Cache: Redis caching disabled by ENABLE_REDIS_CACHE=false');
    return;
  }
  if (REDIS_URL === '') {
    logger.info('Cache: Skipping Redis init (REDIS_URL empty)');
    return;
  }
  try {
    redisClient = createClient({ url: REDIS_URL });
    redisClient.on('error', (err) => logger.warn('Redis client error', { err: err.message }));
    await redisClient.connect();
    redisEnabled = true;
    logger.info('Cache: Redis connected');
  } catch (err) {
    logger.warn('Cache: Redis unavailable, falling back to in-memory Map', { err: err.message });
    redisClient = null;
    redisEnabled = false;
  }
}

// In-memory fallback
const mem = new Map();
let hits = 0;
let misses = 0;

function memSet(key, value, ttlMs) {
  mem.set(key, { value, exp: Date.now() + ttlMs });
}
function memGet(key) {
  const v = mem.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) { mem.delete(key); return null; }
  return v.value;
}

export async function cacheGet(key) {
  if (redisEnabled) {
    try {
      const raw = await redisClient.get(key);
    if (raw) { hits++; return JSON.parse(raw); }
    misses++; return null;
    } catch (e) {
      logger.warn('Cache get failed, fallback to memory', { key, err: e.message });
    }
  }
  const v = memGet(key);
  if (v) hits++; else misses++;
  return v;
}

export async function cacheSet(key, value, ttlMs) {
  if (redisEnabled) {
    try {
      await redisClient.set(key, JSON.stringify(value), { PX: ttlMs });
      return;
    } catch (e) {
      logger.warn('Cache set failed, fallback to memory', { key, err: e.message });
    }
  }
  memSet(key, value, ttlMs);
}

export function cacheStats() {
  return {
    redisEnabled,
    memoryEntries: mem.size,
  redisUrl: redisEnabled ? REDIS_URL : null,
  hits,
  misses,
  hitRatio: hits + misses === 0 ? null : +(hits / (hits + misses)).toFixed(4)
  };
}

export async function cacheFlushAll() {
  let memoryFlushed = mem.size;
  mem.clear();
  let redisFlushed = false;
  if (redisEnabled && redisClient) {
    try {
      await redisClient.flushAll();
      redisFlushed = true;
    } catch (e) {
      logger.warn('Redis flushAll failed', { err: e.message });
    }
  }
  return { memoryFlushed, redisFlushed };
}
