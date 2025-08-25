import express from 'express';
import { cocApi, getPrometheusRateLimitMetrics } from '../utils/cocApi.js';
import { logger } from '../utils/logger.js';
import { sendDiscordMessage } from '../utils/discord.js';
import { cacheGet, cacheSet, cacheFlushAll, cacheStats } from '../utils/cache.js';
import fs from 'fs';
import path from 'path';
import { allGameAssets } from '../utils/gameAssets.js';
import { cacheKeys } from '../utils/cacheKeys.js';
import { paginate } from '../utils/pagination.js';

const router = express.Router();

// Simple caching layer (in-memory)
// Legacy in-file cache kept for low-latency core clan endpoints; will consult Redis-backed cache util first.
const localCache = new Map();
const setLocal = (key, data, ttlMs = 60_000) => localCache.set(key, { data, exp: Date.now() + ttlMs });
const getLocal = (key) => {
  const v = localCache.get(key);
  if (!v) return null;
  if (Date.now() > v.exp) { localCache.delete(key); return null; }
  return v.data;
};
const getCache = async (key) => (await cacheGet(key)) || getLocal(key);
const setCache = async (key, data, ttlMs = 60_000) => { await cacheSet(key, data, ttlMs); setLocal(key, data, ttlMs); };

// Clan overview
router.get('/clan', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
  const ck = cacheKeys.clan(clanTag || 'default');
  const cached = await getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const data = await cocApi.getClan(clanTag);
  await setCache(ck, data, 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /clans/:clanTag (mirrors official API path) – optional param removed (path-to-regexp strictness)
router.get('/clans/:clanTag', async (req, res, next) => {
  try {
    const clanTag = req.params.clanTag;
  const ck = cacheKeys.clan(clanTag || 'default');
    const cached = await getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getClan(clanTag);
    await setCache(ck, data, 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// /clans (requires ?tag= or returns error)
router.get('/clans', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
    if (!clanTag) return res.status(400).json({ success: false, error: 'clan tag required (use /clans/{tag})' });
  const ck = cacheKeys.clan(clanTag);
    const cached = await getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getClan(clanTag);
    await setCache(ck, data, 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Members
router.get('/clan/members', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
  const ck = cacheKeys.members(clanTag || 'default');
  const cached = await getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });

    const data = await cocApi.getClanMembers(clanTag);
  await setCache(ck, data, 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /clans/:clanTag/members
router.get('/clans/:clanTag/members', async (req, res, next) => {
  try {
    const clanTag = req.params.clanTag;
  const ck = cacheKeys.members(clanTag || 'default');
  const cached = await getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getClanMembers(clanTag);
  await setCache(ck, data, 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// War log
router.get('/clan/warlog', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
    const rawLimit = parseInt(req.query.limit || '100', 10); // fetch a wider slice then paginate client-side
    const page = req.query.page;
    const pageSize = req.query.pageSize;
    const upstream = await cocApi.getWarLog(clanTag, Math.min(rawLimit, 200));
    const items = upstream?.items || [];
    const pg = paginate(items, page, pageSize, { maxPageSize: 50, defaultPageSize: 15 });
    res.json({ success: true, ...pg });
  } catch (e) { next(e); }
});

// Alias: /clans/:clanTag/warlog
router.get('/clans/:clanTag/warlog', async (req, res, next) => {
  try {
    const clanTag = req.params.clanTag;
    const rawLimit = parseInt(req.query.limit || '100', 10);
    const upstream = await cocApi.getWarLog(clanTag, Math.min(rawLimit, 200));
    const items = upstream?.items || [];
    const pg = paginate(items, req.query.page, req.query.pageSize, { maxPageSize: 50, defaultPageSize: 15 });
    res.json({ success: true, ...pg });
  } catch (e) { next(e); }
});

// Current war
router.get('/clan/currentwar', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
    const data = await cocApi.getCurrentWar(clanTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /clans/:clanTag/currentwar
router.get('/clans/:clanTag/currentwar', async (req, res, next) => {
  try {
    const clanTag = req.params.clanTag;
    const data = await cocApi.getCurrentWar(clanTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// League group
router.get('/clan/leaguegroup', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
    const data = await cocApi.getLeagueGroup(clanTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /clans/:clanTag/currentwar/leaguegroup
router.get('/clans/:clanTag/currentwar/leaguegroup', async (req, res, next) => {
  try {
    const clanTag = req.params.clanTag;
    const data = await cocApi.getLeagueGroup(clanTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Clan capital raid seasons
router.get('/clan/capitalraidseasons', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
    const limit = parseInt(req.query.limit || '3', 10);
    const data = await cocApi.getClanCapitalRaidSeasons(clanTag, limit);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /clans/:clanTag/capitalraidseasons
router.get('/clans/:clanTag/capitalraidseasons', async (req, res, next) => {
  try {
    const clanTag = req.params.clanTag;
    const limit = parseInt(req.query.limit || '3', 10);
    const data = await cocApi.getClanCapitalRaidSeasons(clanTag, limit);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Get a specific league war by tag
router.get('/league/war/:warTag', async (req, res, next) => {
  try {
    const { warTag } = req.params;
    const data = await cocApi.getLeagueWar(warTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Player info
router.get('/player/:playerTag', async (req, res, next) => {
  try {
    const { playerTag } = req.params;
    const data = await cocApi.getPlayer(playerTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /players/:playerTag
router.get('/players/:playerTag', async (req, res, next) => {
  try {
    const { playerTag } = req.params;
    const data = await cocApi.getPlayer(playerTag);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Verify player token
router.post('/player/:playerTag/verify', async (req, res, next) => {
  try {
    const { playerTag } = req.params;
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token required' });
    const data = await cocApi.verifyPlayerToken(playerTag, token);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// Alias: /players/:playerTag/verifytoken (mirrors upstream path)
router.post('/players/:playerTag/verifytoken', async (req, res, next) => {
  try {
    const { playerTag } = req.params;
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'token required' });
    const data = await cocApi.verifyPlayerToken(playerTag, token);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// ------------------
// Labels
// ------------------
router.get('/labels/clans', async (req, res, next) => {
  try {
    const ck = 'labels:clans';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.listClanLabels();
    setCache(ck, data, 10 * 60_000); // 10m
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/labels/players', async (req, res, next) => {
  try {
    const ck = 'labels:players';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.listPlayerLabels();
    setCache(ck, data, 10 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// ------------------
// Gold Pass
// ------------------
router.get('/goldpass/seasons/current', async (req, res, next) => {
  try {
    const ck = 'goldpass:current';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getCurrentGoldPassSeason();
    setCache(ck, data, 30 * 60_000); // 30m
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// ------------------
// Leagues
// ------------------
router.get('/leagues', async (req, res, next) => {
  try {
    const ck = 'leagues:list';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.listLeagues();
    setCache(ck, data, 60 * 60_000); // 1h
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/leagues/:leagueId', async (req, res, next) => {
  try {
    const { leagueId } = req.params;
    const ck = `league:${leagueId}`;
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getLeague(leagueId);
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/leagues/:leagueId/seasons', async (req, res, next) => {
  try {
    const { leagueId } = req.params;
    const data = await cocApi.getLeagueSeasons(leagueId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/leagues/:leagueId/seasons/:seasonId', async (req, res, next) => {
  try {
    const { leagueId, seasonId } = req.params;
    const data = await cocApi.getLeagueSeasonRankings(leagueId, seasonId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/warleagues', async (req, res, next) => {
  try {
    const ck = 'warleagues:list';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.listWarLeagues();
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/warleagues/:leagueId', async (req, res, next) => {
  try {
    const { leagueId } = req.params;
    const ck = `warleague:${leagueId}`;
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getWarLeague(leagueId);
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/builderbaseleagues', async (req, res, next) => {
  try {
    const ck = 'builderbaseleagues:list';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.listBuilderBaseLeagues();
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/builderbaseleagues/:leagueId', async (req, res, next) => {
  try {
    const { leagueId } = req.params;
    const ck = `builderbaseleague:${leagueId}`;
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getBuilderBaseLeague(leagueId);
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/capitalleagues', async (req, res, next) => {
  try {
    const ck = 'capitalleagues:list';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.listCapitalLeagues();
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/capitalleagues/:leagueId', async (req, res, next) => {
  try {
    const { leagueId } = req.params;
    const ck = `capitalleague:${leagueId}`;
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
    const data = await cocApi.getCapitalLeague(leagueId);
    setCache(ck, data, 60 * 60_000);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// ------------------
// Locations
// ------------------
router.get('/locations', async (req, res, next) => {
  try {
    const ck = 'locations:list';
    const cached = getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });
  const data = await cocApi.listLocations();
  setCache(ck, data, 6 * 60 * 60 * 1000); // 6h
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/locations/:locationId', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const data = await cocApi.getLocation(locationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/locations/:locationId/rankings/clans', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const data = await cocApi.getLocationClanRankings(locationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/locations/:locationId/rankings/players', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const data = await cocApi.getLocationPlayerRankings(locationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/locations/:locationId/rankings/players-builder-base', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const data = await cocApi.getLocationBuilderBasePlayerRankings(locationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/locations/:locationId/rankings/clans-builder-base', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const data = await cocApi.getLocationBuilderBaseClanRankings(locationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

router.get('/locations/:locationId/rankings/capitals', async (req, res, next) => {
  try {
    const { locationId } = req.params;
    const data = await cocApi.getLocationCapitalRankings(locationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
});

// ------------------
// Debug (secured via service token/JWT auth already)
// ------------------
function ensureServiceRole(req, res, next) {
  const roles = req.user?.roles || [];
  if (!roles.includes('service')) return res.status(403).json({ success: false, error: 'forbidden' });
  next();
}

router.get('/_debug/tokens', ensureServiceRole, (req, res) => {
  const state = cocApi._debugTokenState ? cocApi._debugTokenState() : { total: 0 };
  res.json({ success: true, ...state });
});

router.get('/_debug/ratelimit', ensureServiceRole, (req, res) => {
  const rl = cocApi._rateLimitState ? cocApi._rateLimitState() : {};
  res.json({ success: true, rateLimit: rl });
});

router.post('/_debug/cache/flush', ensureServiceRole, async (req, res) => {
  const localEntries = localCache.size;
  localCache.clear();
  const { memoryFlushed, redisFlushed } = await cacheFlushAll();
  res.json({ success: true, localFlushed: localEntries, memoryFlushed, redisFlushed, stats: cacheStats() });
});

// Lightweight upstream ping to verify Clash API token/IP health at runtime
router.get('/_debug/ping', ensureServiceRole, async (req, res, next) => {
  try {
    const tag = req.query.tag || process.env.COC_CLAN_TAG;
    if (!tag) return res.status(400).json({ success: false, error: 'tag query param or COC_CLAN_TAG env required' });
    const started = Date.now();
    const clan = await cocApi.getClan(tag);
    const ms = Date.now() - started;
    res.json({ success: true, latencyMs: ms, clan: { tag: clan.tag, name: clan.name, level: clan.clanLevel } });
  } catch (e) { next(e); }
});

// Game assets reference (non-sensitive static data for front-end palettes)
router.get('/game/assets', async (req, res) => {
  // Static dataset; allow shallow cache to reduce serialization overhead
  const ck = 'game:assets:v2';
  const cached = await getCache(ck);
  if (cached) return res.json({ success: true, data: cached, cached: true });
  const data = allGameAssets();
  await setCache(ck, data, 10 * 60_000); // 10m
  res.json({ success: true, data });
});

// Filtered environment subset: /game/assets/env/:env (env = homeVillage|builderBase|clanCapital)
router.get('/game/assets/env/:env', async (req, res) => {
  const env = (req.params.env || '').toLowerCase();
  const map = { homevillage: 'homeVillage', builderbase: 'builderBase', clancapital: 'clanCapital' };
  const key = map[env];
  if (!key) return res.status(404).json({ success: false, error: 'unknown environment' });
  const ck = `game:assets:env:${key}`;
  const cached = await getCache(ck);
  if (cached) return res.json({ success: true, data: cached, cached: true });
  const all = allGameAssets();
  if (!all[key]) return res.status(404).json({ success: false, error: 'environment missing' });
  await setCache(ck, all[key], 10 * 60_000);
  res.json({ success: true, data: all[key] });
});

// Asset name search across all environments & categories
// /game/assets/search?query=bow -> returns matched names with context path
// Build a flattened index once per process (lazy)
let _assetIndex = null;
function buildAssetIndex() {
  if (_assetIndex) return _assetIndex;
  const all = allGameAssets();
  const rows = [];
  function walk(envKey, prefix, value) {
    if (Array.isArray(value)) {
      value.forEach(v => {
        if (typeof v === 'string') rows.push({ name: v, env: envKey, path: prefix });
        else if (v && typeof v === 'object' && v.name) rows.push({ name: v.name, env: envKey, path: prefix, category: v.category });
      });
    } else if (value && typeof value === 'object') {
      Object.entries(value).forEach(([k,v]) => walk(envKey, prefix ? `${prefix}.${k}` : k, v));
    }
  }
  walk('homeVillage', 'homeVillage', all.homeVillage);
  walk('builderBase', 'builderBase', all.builderBase);
  walk('clanCapital', 'clanCapital', all.clanCapital);
  _assetIndex = rows;
  return rows;
}

router.get('/game/assets/index', async (req, res) => {
  const idx = buildAssetIndex();
  res.json({ success: true, count: idx.length, data: idx });
});

router.get('/game/assets/search', async (req, res) => {
  const q = (req.query.query || '').toString().trim().toLowerCase();
  if (!q) return res.status(400).json({ success: false, error: 'query required' });
  const envFilter = (req.query.env || '').toString().toLowerCase(); // optional
  const typeFilter = (req.query.type || '').toString().toLowerCase(); // optional semantic filter
  const limit = Math.min(500, parseInt(req.query.limit || '250', 10));
  const idx = buildAssetIndex();
  const out = [];
  for (const row of idx) {
    if (envFilter && row.env.toLowerCase() !== envFilter) continue;
    if (!row.name.toLowerCase().includes(q)) continue;
    if (typeFilter) {
      // crude heuristic mapping
      const name = row.name.toLowerCase();
      const path = row.path.toLowerCase();
      const isBuilding = path.includes('buildings') || path.includes('defensive') || path.includes('traps');
      const isTroop = path.includes('troop') || path.includes('barracks') || path.includes('heroes') || path.includes('pets');
      const isSpell = path.includes('spell');
      const isHero = path.includes('heroes');
      const isPet = path.includes('pets');
      const isEquipment = path.includes('heroEquipment'.toLowerCase());
      const want = typeFilter;
      if (want === 'buildings' && !isBuilding) continue;
      if (want === 'troops' && !isTroop) continue;
      if (want === 'spells' && !isSpell) continue;
      if (want === 'heroes' && !isHero) continue;
      if (want === 'pets' && !isPet) continue;
      if (want === 'equipment' && !isEquipment) continue;
    }
    out.push(row);
    if (out.length >= limit) break;
  }
  res.json({ success: true, count: out.length, data: out });
});

// Strategy guides metadata (placeholder only; no external copyrighted text)
router.get('/game/strategy-guides/meta', async (req, res) => {
  const { strategyGuidesMeta } = allGameAssets();
  res.json({ success: true, data: strategyGuidesMeta });
});

// ------------------
// Icon Mapping (maps canonical asset names -> downloaded sprite category/index)
// ------------------
const ICON_MAPPING_FILE = process.env.ICON_MAPPING_FILE || path.join(process.cwd(), 'data', 'asset-icon-mapping.json');
let iconMappingCache = loadIconMapping();

function ensureIconMapDir() { const dir = path.dirname(ICON_MAPPING_FILE); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); }
function loadIconMapping() {
  try {
    ensureIconMapDir();
    if (fs.existsSync(ICON_MAPPING_FILE)) {
      const raw = fs.readFileSync(ICON_MAPPING_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : { mappings: {}, updatedAt: null };
    }
  } catch (e) { logger.warn('icon mapping load failed', { error: e.message }); }
  return { mappings: {}, updatedAt: null };
}
function saveIconMapping() {
  try {
    ensureIconMapDir();
    fs.writeFileSync(ICON_MAPPING_FILE, JSON.stringify(iconMappingCache, null, 2));
  } catch (e) { logger.warn('icon mapping save failed', { error: e.message }); }
}

// Retrieve full mapping
router.get('/game/icons/mapping', async (req, res) => {
  res.json({ success: true, data: iconMappingCache });
});
// Upsert single mapping (service role)
router.put('/game/icons/mapping', ensureServiceRole, async (req, res) => {
  const { name, category, index } = req.body || {};
  if (!name || category == null || index == null) return res.status(400).json({ success: false, error: 'name, category, index required' });
  if (!iconMappingCache.mappings) iconMappingCache.mappings = {};
  iconMappingCache.mappings[name] = { category: String(category), index: Number(index) };
  iconMappingCache.updatedAt = new Date().toISOString();
  saveIconMapping();
  res.json({ success: true, data: iconMappingCache.mappings[name] });
});
// Bulk replace mapping
router.post('/game/icons/mapping', ensureServiceRole, async (req, res) => {
  const { mappings } = req.body || {};
  if (!mappings || typeof mappings !== 'object') return res.status(400).json({ success: false, error: 'mappings object required' });
  iconMappingCache = { mappings, updatedAt: new Date().toISOString() };
  saveIconMapping();
  res.json({ success: true, data: { updatedAt: iconMappingCache.updatedAt, count: Object.keys(mappings).length } });
});

// Suggest auto-mapping for asset names (simple fuzzy/contains match against file names)
router.post('/game/icons/mapping/suggest', ensureServiceRole, async (req, res) => {
  try {
    const { names, limitPerName = 5 } = req.body || {};
    if (!Array.isArray(names) || !names.length) return res.status(400).json({ success:false, error:'names array required' });
    const fs = require('fs');
    const path = require('path');
    const manifestPath = path.join(process.cwd(), 'downloaded-game-assets', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return res.status(400).json({ success:false, error:'icon manifest not available' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const results = {};
    for (const name of names) {
      const lc = name.toLowerCase();
      const matches = [];
      for (const [cat, info] of Object.entries(manifest.categories||{})) {
        (info.files||[]).forEach((file, idx) => {
          const base = file.replace(/\.(png|jpg|jpeg|gif)$/i,'');
          if (base.toLowerCase().includes(lc)) {
            matches.push({ category: cat, index: idx, file, score: base.length - lc.length });
          }
        });
      }
      matches.sort((a,b)=> a.score - b.score || a.file.localeCompare(b.file));
      results[name] = matches.slice(0, limitPerName);
    }
    res.json({ success:true, data: results });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// Auto-apply top suggestion for each provided name (simple heuristic: first match) with optional dryRun
router.post('/game/icons/mapping/auto-apply', ensureServiceRole, async (req, res) => {
  try {
    const { names, dryRun = false } = req.body || {};
    if (!Array.isArray(names) || !names.length) return res.status(400).json({ success:false, error:'names array required' });
    const fs = require('fs');
    const path = require('path');
    const manifestPath = path.join(process.cwd(), 'downloaded-game-assets', 'manifest.json');
    if (!fs.existsSync(manifestPath)) return res.status(400).json({ success:false, error:'icon manifest not available' });
    const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const applied = {};
    const skipped = [];
    for (const name of names) {
      let best = null;
      const target = name.toLowerCase();
      for (const [cat, info] of Object.entries(manifest.categories||{})) {
        if (best) break; // stop at first category match for speed
        for (let i=0;i<(info.files||[]).length;i++) {
          const file = info.files[i];
          const base = file.replace(/\.(png|jpg|jpeg|gif)$/i,'').toLowerCase();
          if (base.includes(target)) { best = { category: cat, index: i, file }; break; }
        }
      }
      if (best) applied[name] = best; else skipped.push(name);
    }
    if (!dryRun) {
      if (!iconMappingCache.mappings) iconMappingCache.mappings = {};
      Object.entries(applied).forEach(([name, ref])=>{ iconMappingCache.mappings[name] = { category: ref.category, index: ref.index }; });
      iconMappingCache.updatedAt = new Date().toISOString();
      saveIconMapping();
    }
    res.json({ success:true, data: { appliedCount: Object.keys(applied).length, skipped, dryRun, applied } });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// Stats: how many assets have mappings vs total candidate asset names
router.get('/game/icons/mapping/stats', async (req, res) => {
  try {
    const { homeVillage, builderBase, clanCapital } = allGameAssets();
    const collectNames = new Set();
    // Collect building & troop style names from structures
    const hv = homeVillage || {};
    Object.values(hv.buildings||{}).forEach(group => { if (Array.isArray(group)) group.forEach(n=>collectNames.add(n)); else if (group && typeof group==='object') Object.values(group).flat().forEach(n=>collectNames.add(n)); });
    const troops = hv.troops || {};
    ['elixir','dark','super','siegeMachines','pets','heroes'].forEach(k=> (troops[k]||[]).forEach(n=>collectNames.add(n)) );
    Object.values(troops.heroEquipment||{}).flat().forEach(n=>collectNames.add(n));
    Object.values((troops.spells||{})).forEach(sp => Array.isArray(sp) ? sp.forEach(n=>collectNames.add(n)) : null);
    // builder base
    const bb = builderBase || {};
    Object.values(bb.buildings||{}).forEach(group => { if (Array.isArray(group)) group.forEach(n=>collectNames.add(n)); else if (group && typeof group==='object') Object.values(group).flat().forEach(n=>collectNames.add(n)); });
    (bb.troops||[]).forEach(n=>collectNames.add(n));
    (bb.heroes||[]).forEach(n=>collectNames.add(n));
    // clan capital
    const cc = clanCapital || {};
    Object.values(cc.buildings||{}).forEach(group => { if (Array.isArray(group)) group.forEach(n=>collectNames.add(n)); else if (group && typeof group==='object') Object.values(group).forEach(sub=> Array.isArray(sub)? sub.forEach(n=>collectNames.add(n)) : null); });
    (cc.troops||[]).forEach(n=>collectNames.add(n));
    (cc.spells||[]).forEach(n=>collectNames.add(n));
    const total = collectNames.size;
    const mapped = Object.keys(iconMappingCache.mappings||{}).length;
    const unmapped = Array.from(collectNames).filter(n=>!iconMappingCache.mappings?.[n]);
    res.json({ success:true, data: { total, mapped, unmappedCount: unmapped.length, unmapped: req.query.include==='all'? unmapped : undefined, updatedAt: iconMappingCache.updatedAt } });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// Merge mappings (PATCH) - only adds/updates provided keys, leaves others intact
router.patch('/game/icons/mapping', ensureServiceRole, async (req, res) => {
  const { mappings } = req.body || {};
  if (!mappings || typeof mappings !== 'object') return res.status(400).json({ success:false, error:'mappings object required' });
  if (!iconMappingCache.mappings) iconMappingCache.mappings = {};
  Object.entries(mappings).forEach(([k,v])=>{ if (v && v.category!=null && v.index!=null) iconMappingCache.mappings[k] = { category: String(v.category), index: Number(v.index) }; });
  iconMappingCache.updatedAt = new Date().toISOString();
  saveIconMapping();
  res.json({ success:true, data: { updatedAt: iconMappingCache.updatedAt, count: Object.keys(iconMappingCache.mappings).length } });
});

// Delete mappings: if names array provided, remove only those; otherwise clear all
router.delete('/game/icons/mapping', ensureServiceRole, async (req, res) => {
  const { names } = req.body || {};
  if (!iconMappingCache.mappings) iconMappingCache.mappings = {};
  let removed = 0;
  if (Array.isArray(names) && names.length) {
    names.forEach(n => { if (iconMappingCache.mappings[n]) { delete iconMappingCache.mappings[n]; removed++; } });
  } else {
    removed = Object.keys(iconMappingCache.mappings).length;
    iconMappingCache.mappings = {};
  }
  iconMappingCache.updatedAt = new Date().toISOString();
  saveIconMapping();
  res.json({ success:true, data: { removed, remaining: Object.keys(iconMappingCache.mappings).length, updatedAt: iconMappingCache.updatedAt } });
});

// Auto seed TownHall icon mappings if present in manifest but unmapped (service role)
router.post('/game/icons/mapping/seed/townhalls', ensureServiceRole, async (req, res) => {
  try {
  const fs = await import('fs');
  const path = await import('path');
    const manifestPath = path.join(process.cwd(), 'downloaded-game-assets', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return res.status(400).json({ success:false, error:'icon manifest not available' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const added = [];
    const searchOrder = Object.entries(manifest.categories||{}); // iterate all categories
    for (let th=1; th<=20; th++) {
      const key = `TownHall${th}`;
      if (iconMappingCache.mappings?.[key]) continue; // already mapped
      const targetPatterns = [ `townhall${th}`, `th${th}_`, `th${th}-`, `th${th}.`, `th_${th}` ];
      let found = null;
      for (const [cat, info] of searchOrder) {
        (info.files||[]).some((file, idx) => {
          const base = file.toLowerCase();
            if (targetPatterns.some(p=>base.includes(p))) { found = { category: cat, index: idx, file }; return true; }
          return false;
        });
        if (found) break;
      }
      if (found) {
        if (!iconMappingCache.mappings) iconMappingCache.mappings = {};
        iconMappingCache.mappings[key] = { category: found.category, index: found.index };
        added.push({ key, ...found });
      }
    }
    if (added.length) {
      iconMappingCache.updatedAt = new Date().toISOString();
      saveIconMapping();
    }
    res.json({ success:true, data: { addedCount: added.length, added } });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// Generic seeding for other asset groups (heroes, pets, heroEquipment)
router.post('/game/icons/mapping/seed', ensureServiceRole, async (req, res) => {
  try {
    const { types } = req.body || {};
    const wanted = Array.isArray(types) && types.length ? types : ['heroes','pets','heroEquipment'];
  const fs = await import('fs');
  const path = await import('path');
    const manifestPath = path.join(process.cwd(), 'downloaded-game-assets', 'manifest.json');
  if (!fs.existsSync(manifestPath)) return res.status(400).json({ success:false, error:'icon manifest not available' });
  const manifest = JSON.parse(fs.readFileSync(manifestPath,'utf8'));
    const { homeVillage } = allGameAssets();
    const added = [];
    function findFileFor(name) {
      const keyLc = name.toLowerCase();
      const parts = keyLc.split(/(?=[A-Z])|(?=[0-9]+)/).map(p=>p.toLowerCase());
      for (const [cat, info] of Object.entries(manifest.categories||{})) {
        const files = info.files||[];
        for (let i=0;i<files.length;i++) {
          const base = files[i].replace(/\.(png|jpg|jpeg|gif)$/i,'').toLowerCase();
          if (base.includes(keyLc)) return { category: cat, index: i, file: files[i] };
          // fallback: require all parts appear
          if (parts.length>1 && parts.every(p=> base.includes(p))) return { category: cat, index: i, file: files[i] };
        }
      }
      return null;
    }
    const ensureMapping = (assetName) => {
      if (!assetName) return;
      if (iconMappingCache.mappings?.[assetName]) return;
      const found = findFileFor(assetName);
      if (found) {
        if (!iconMappingCache.mappings) iconMappingCache.mappings = {};
        iconMappingCache.mappings[assetName] = { category: found.category, index: found.index };
        added.push({ key: assetName, ...found });
      }
    };
    if (wanted.includes('heroes')) {
      (homeVillage.troops.heroes||[]).forEach(ensureMapping);
    }
    if (wanted.includes('pets')) {
      (homeVillage.troops.pets||[]).forEach(ensureMapping);
    }
    if (wanted.includes('heroEquipment')) {
      Object.values(homeVillage.troops.heroEquipment||{}).flat().forEach(ensureMapping);
    }
    if (added.length) {
      iconMappingCache.updatedAt = new Date().toISOString();
      saveIconMapping();
    }
    res.json({ success:true, data: { addedCount: added.length, added, types: wanted } });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// ------------------
// Custom Strategy Guides (user-authored) persistence (simple JSON file)
// ------------------
const STRATEGY_GUIDES_FILE = process.env.STRATEGY_GUIDES_FILE || path.join(process.cwd(), 'data', 'strategy-guides.json');
const strategyGuides = new Map(); // id -> { id, title, tags[], content, createdAt, updatedAt }

function ensureGuidesDir() {
  const dir = path.dirname(STRATEGY_GUIDES_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function loadStrategyGuides() {
  try {
    ensureGuidesDir();
    if (fs.existsSync(STRATEGY_GUIDES_FILE)) {
      const raw = fs.readFileSync(STRATEGY_GUIDES_FILE, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(g => strategyGuides.set(g.id, g));
    }
  } catch (e) {
    logger.warn('Failed loading strategy guides', { error: e.message });
  }
}
function saveStrategyGuides() {
  try {
    ensureGuidesDir();
    const tmp = `${STRATEGY_GUIDES_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(Array.from(strategyGuides.values()), null, 2));
    fs.renameSync(tmp, STRATEGY_GUIDES_FILE);
  } catch (e) {
    logger.warn('Failed saving strategy guides', { error: e.message });
  }
}
function sanitizeGuideInput({ title, tags, content }) {
  const cleanTitle = (title || 'Untitled').toString().slice(0, 120).trim();
  const cleanTags = Array.isArray(tags) ? tags.map(t => t.toString().slice(0,30)).slice(0,15) : [];
  let cleanContent = (content || '').toString();
  // Basic size + script sanitization (lightweight; frontend should still escape HTML)
  cleanContent = cleanContent.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '[removed]');
  if (cleanContent.length > 20_000) cleanContent = cleanContent.slice(0, 20_000) + '\n...truncated';
  return { title: cleanTitle, tags: cleanTags, content: cleanContent };
}
loadStrategyGuides();

// List (metadata only)
router.get('/game/strategy-guides', async (req, res) => {
  const list = Array.from(strategyGuides.values()).map(g => ({ id: g.id, title: g.title, tags: g.tags, updatedAt: g.updatedAt, createdAt: g.createdAt }));
  res.json({ success: true, count: list.length, data: list });
});
// Get full guide
router.get('/game/strategy-guides/:id', async (req, res) => {
  const g = strategyGuides.get(req.params.id);
  if (!g) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: g });
});
// Create new guide (service role required to prevent anonymous spam; adjust as needed)
router.post('/game/strategy-guides', ensureServiceRole, async (req, res) => {
  const { title, tags, content } = req.body || {};
  const { title: t, tags: tg, content: c } = sanitizeGuideInput({ title, tags, content });
  if (!c) return res.status(400).json({ success: false, error: 'content required' });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const guide = { id, title: t, tags: tg, content: c, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  strategyGuides.set(id, guide);
  saveStrategyGuides();
  res.json({ success: true, data: { id, title: t } });
});
// Update existing
router.put('/game/strategy-guides/:id', ensureServiceRole, async (req, res) => {
  const g = strategyGuides.get(req.params.id);
  if (!g) return res.status(404).json({ success: false, error: 'not found' });
  const { title, tags, content } = req.body || {};
  const sanitized = sanitizeGuideInput({ title: title ?? g.title, tags: tags ?? g.tags, content: content ?? g.content });
  g.title = sanitized.title;
  g.tags = sanitized.tags;
  g.content = sanitized.content;
  g.updatedAt = new Date().toISOString();
  strategyGuides.set(g.id, g);
  saveStrategyGuides();
  res.json({ success: true, data: { id: g.id, updatedAt: g.updatedAt } });
});
// Delete
router.delete('/game/strategy-guides/:id', ensureServiceRole, async (req, res) => {
  const ok = strategyGuides.delete(req.params.id);
  if (ok) saveStrategyGuides();
  res.json({ success: true, deleted: ok });
});
// Share a guide to Discord (service role)
router.post('/game/strategy-guides/:id/share', ensureServiceRole, async (req, res) => {
  const g = strategyGuides.get(req.params.id);
  if (!g) return res.status(404).json({ success: false, error: 'not found' });
  try {
    const preview = (g.content || '').slice(0, 500) + (g.content.length > 500 ? '...' : '');
    await sendDiscordMessage(`Strategy Guide: ${g.title}`, {
      embeds: [{
        title: g.title,
        description: preview || 'No content',
        color: 0x0fa4,
        fields: g.tags && g.tags.length ? [{ name: 'Tags', value: g.tags.slice(0, 10).join(', '), inline: false }] : [],
        timestamp: new Date().toISOString()
      }]
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Deprecated legacy endpoint retained temporarily
router.post('/assignments/generate', async (req, res) => {
  res.status(410).json({ success:false, error:'Deprecated – use /api/assignments/generate' });
});

// Push current war summary to Discord webhook (service role required to limit abuse)
router.post('/war/push', ensureServiceRole, async (req, res, next) => {
  try {
    const clanTag = req.body.clanTag || process.env.COC_CLAN_TAG;
    if (!clanTag) return res.status(400).json({ success: false, error: 'clanTag required' });
    const war = await cocApi.getCurrentWar(clanTag).catch(() => null);
    if (!war || !war.state || war.state === 'notInWar') {
      return res.json({ success: false, error: 'Not currently in war' });
    }
    const embed = {
      title: `Current War Status (${war.state})`,
      color: war.state === 'inWar' ? 0xff4444 : 0x00a3ff,
      fields: [
        { name: 'Team Size', value: String(war.teamSize || 'N/A'), inline: true },
        { name: 'Attacks/Member', value: String(war.attacksPerMember || '2'), inline: true },
      ],
      description: `${war.clan?.name || 'Clan'} ${war.clan?.stars ?? 0}⭐ (${Math.round(war.clan?.destructionPercentage || 0)}%) vs ${war.opponent?.name || 'Opponent'} ${war.opponent?.stars ?? 0}⭐ (${Math.round(war.opponent?.destructionPercentage || 0)}%)`,
      timestamp: new Date().toISOString()
    };
    await sendDiscordMessage('War update', { embeds: [embed] });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ------------------
// Base Layout Designer (simple in-memory stub)
// ------------------
// -------------- Base Layout Persistence --------------
const baseLayouts = new Map(); // key: id, value object
const MAX_LAYOUT_VERSIONS = 10;
const BASE_LAYOUTS_FILE = process.env.BASE_LAYOUTS_FILE || path.join(process.cwd(), 'data', 'base-layouts.json');

// Simplified (non-exhaustive) building limits per Town Hall (approximate)
// NOTE: This is intentionally partial; unlisted types are not strictly validated.
const BUILDING_LIMITS = {
  9: { TownHall: 1, ClanCastle: 1, Eagle: 0, Inferno: 0, XBow: 2, AirDefense: 4, WizardTower: 4, ArcherTower: 7, Cannon: 7, Tesla: 4, BombTower: 1, AirSweeper: 2 },
 10: { TownHall: 1, ClanCastle: 1, Eagle: 0, Inferno: 2, XBow: 3, AirDefense: 4, WizardTower: 4, ArcherTower: 8, Cannon: 8, Tesla: 4, BombTower: 1, AirSweeper: 2 },
 11: { TownHall: 1, ClanCastle: 1, Eagle: 1, Inferno: 2, XBow: 4, AirDefense: 4, WizardTower: 5, ArcherTower: 8, Cannon: 8, Tesla: 5, BombTower: 2, AirSweeper: 2 },
 12: { TownHall: 1, ClanCastle: 1, Eagle: 1, Inferno: 2, XBow: 4, AirDefense: 5, WizardTower: 5, ArcherTower: 8, Cannon: 8, Tesla: 5, BombTower: 2, AirSweeper: 2 },
 13: { TownHall: 1, ClanCastle: 1, Eagle: 1, Inferno: 2, XBow: 4, AirDefense: 5, WizardTower: 5, ArcherTower: 8, Cannon: 8, Tesla: 7, BombTower: 2, AirSweeper: 2 },
 14: { TownHall: 1, ClanCastle: 1, Eagle: 1, Inferno: 2, XBow: 4, AirDefense: 5, WizardTower: 5, ArcherTower: 8, Cannon: 8, Tesla: 7, BombTower: 2, AirSweeper: 2 },
 15: { TownHall: 1, ClanCastle: 1, Eagle: 1, Inferno: 2, XBow: 4, AirDefense: 5, WizardTower: 5, ArcherTower: 9, Cannon: 9, Tesla: 7, BombTower: 2, AirSweeper: 2 },
 16: { TownHall: 1, ClanCastle: 1, Eagle: 1, Inferno: 3, XBow: 4, AirDefense: 5, WizardTower: 6, ArcherTower: 9, Cannon: 9, Tesla: 8, BombTower: 2, AirSweeper: 2 }
};

function ensureDataDir() {
  const dir = path.dirname(BASE_LAYOUTS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function loadBaseLayouts() {
  try {
    ensureDataDir();
    if (fs.existsSync(BASE_LAYOUTS_FILE)) {
      const raw = fs.readFileSync(BASE_LAYOUTS_FILE, 'utf8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) arr.forEach(o => baseLayouts.set(o.id, o));
      logger.info(`Loaded ${baseLayouts.size} base layouts`);
    }
  } catch (e) {
    logger.warn('Failed to load base layouts', { error: e.message });
  }
}
function saveBaseLayouts() {
  try {
    ensureDataDir();
    const tmp = `${BASE_LAYOUTS_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(Array.from(baseLayouts.values()), null, 2));
    fs.renameSync(tmp, BASE_LAYOUTS_FILE);
  } catch (e) {
    logger.warn('Failed to save base layouts', { error: e.message });
  }
}
// Basic validation: ensure at most one TownHall and if present must be exactly one when any cells exist
function validateLayoutData(data) {
  if (!data || !Array.isArray(data.cells)) return { ok: true };
  const thCount = data.cells.filter(c => c?.type === 'TownHall').length;
  if (data.cells.length > 0 && thCount === 0) return { ok: false, error: 'Layout must include exactly one TownHall' };
  if (thCount > 1) return { ok: false, error: 'Layout has multiple TownHalls' };
  // Optional per-type limit enforcement (only if TownHall present + identifiable)
  const detectedTH = data.cells.find(c=>c.type==='TownHall') ? true : false;
  // Caller may pass townHall in parent object; this validator only has data so skip if not present
  return { ok: true };
}

// Stronger validation invoked when full layout object (with townHall number) is available
function enforceLimits(layout) {
  if (!layout || !layout.data || !Array.isArray(layout.data.cells)) return { ok: true };
  const th = Number(layout.townHall);
  if (!th || !BUILDING_LIMITS[th]) return { ok: true };
  const limits = BUILDING_LIMITS[th];
  const counts = {};
  for (const c of layout.data.cells) {
    if (!c?.type) continue;
    counts[c.type] = (counts[c.type] || 0) + 1;
  }
  const violations = Object.entries(counts)
    .filter(([t,n]) => limits[t] !== undefined && n > limits[t])
    .map(([t,n]) => ({ type: t, count: n, limit: limits[t] }));
  if (violations.length) return { ok: false, error: 'building limits exceeded', violations };
  return { ok: true };
}
loadBaseLayouts();
router.get('/base/layouts', async (req, res) => {
  res.json({ success: true, data: Array.from(baseLayouts.values()) });
});
router.get('/base/layouts/:id', async (req, res) => {
  const { id } = req.params;
  const layout = baseLayouts.get(id);
  if (!layout) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: layout });
});
router.post('/base/layouts', async (req, res) => {
  const { name, clanTag = process.env.COC_CLAN_TAG, townHall, data } = req.body || {};
  if (!name) return res.status(400).json({ success: false, error: 'name required' });
  if (!req.query.skipValidation) {
    const v = validateLayoutData(data);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });
  }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const layout = { id, name, clanTag, townHall: Number(townHall)||null, data: data||{}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sharedAt: null, versions: [] };
  layout.category = (req.body.category || 'general').toString().slice(0,40);
  layout.notes = (req.body.notes || '').toString().slice(0,2000);
  if (!req.query.skipValidation) {
    const lv = enforceLimits(layout);
    if (!lv.ok) return res.status(400).json({ success: false, error: lv.error, violations: lv.violations });
  }
  baseLayouts.set(id, layout);
  saveBaseLayouts();
  res.json({ success: true, data: layout });
});
router.put('/base/layouts/:id', async (req, res) => {
  const { id } = req.params;
  if (!baseLayouts.has(id)) return res.status(404).json({ success: false, error: 'not found' });
  const existing = baseLayouts.get(id);
  const { name, townHall, data, category, notes } = req.body || {};
  if (data && !req.query.skipValidation) {
    const v = validateLayoutData(data);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });
  }
  // push previous data into versions before modifying
  if (!existing.versions) existing.versions = [];
  existing.versions.unshift({
    at: new Date().toISOString(),
    data: existing.data,
    townHall: existing.townHall
  });
  if (existing.versions.length > MAX_LAYOUT_VERSIONS) existing.versions.length = MAX_LAYOUT_VERSIONS;
  existing.name = name ?? existing.name;
  if (townHall !== undefined) existing.townHall = Number(townHall)||null;
  if (data !== undefined) existing.data = data;
  existing.updatedAt = new Date().toISOString();
  if (category !== undefined) existing.category = (category || 'general').toString().slice(0,40);
  if (notes !== undefined) existing.notes = (notes || '').toString().slice(0,2000);
  if (!req.query.skipValidation) {
    const lv = enforceLimits(existing);
    if (!lv.ok) return res.status(400).json({ success: false, error: lv.error, violations: lv.violations });
  }
  saveBaseLayouts();
  res.json({ success: true, data: existing });
});
router.delete('/base/layouts/:id', async (req, res) => {
  const { id } = req.params;
  const ok = baseLayouts.delete(id);
  if (ok) saveBaseLayouts();
  res.json({ success: true, deleted: ok });
});
// Export single layout raw JSON
router.get('/base/layouts/:id/export', async (req, res) => {
  const { id } = req.params;
  const layout = baseLayouts.get(id);
  if (!layout) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: { id: layout.id, name: layout.name, townHall: layout.townHall, data: layout.data } });
});
// Export all layouts (lightweight)
router.get('/base/layouts-export', async (req, res) => {
  const all = Array.from(baseLayouts.values()).map(l => ({ id: l.id, name: l.name, townHall: l.townHall, data: l.data }));
  res.json({ success: true, count: all.length, data: all });
});
// Import layout (create new) from payload or duplication source
router.post('/base/layouts/import', async (req, res) => {
  try {
    const { name, townHall, data, sourceLayoutId } = req.body || {};
    let layoutData = data;
    let th = townHall;
    if (sourceLayoutId) {
      const src = baseLayouts.get(sourceLayoutId);
      if (!src) return res.status(404).json({ success: false, error: 'source not found' });
      layoutData = src.data;
      th = th ?? src.townHall;
    }
    const v = validateLayoutData(layoutData);
    if (!v.ok) return res.status(400).json({ success: false, error: v.error });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const layout = { id, name: name || `Imported-${id.slice(-4)}`, clanTag: process.env.COC_CLAN_TAG || null, townHall: Number(th)||null, data: layoutData||{}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sharedAt: null, versions: [] };
    baseLayouts.set(id, layout);
    saveBaseLayouts();
    res.json({ success: true, data: layout });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
// Retrieve versions metadata
router.get('/base/layouts/:id/versions', async (req, res) => {
  const { id } = req.params;
  const layout = baseLayouts.get(id);
  if (!layout) return res.status(404).json({ success: false, error: 'not found' });
  res.json({ success: true, data: layout.versions || [] });
});
// Building limits for a given Town Hall
router.get('/base/building-limits/:townHall', async (req, res) => {
  const th = Number(req.params.townHall);
  if (!th || !BUILDING_LIMITS[th]) return res.status(404).json({ success: false, error: 'limits not defined for TH'+req.params.townHall });
  res.json({ success: true, data: BUILDING_LIMITS[th] });
});
// Revert layout to a stored version index
router.post('/base/layouts/:id/revert', async (req, res) => {
  const { id } = req.params;
  const { versionIndex } = req.body || {};
  const layout = baseLayouts.get(id);
  if (!layout) return res.status(404).json({ success: false, error: 'not found' });
  const idx = Number(versionIndex);
  if (Number.isNaN(idx) || idx < 0 || idx >= (layout.versions?.length || 0)) {
    return res.status(400).json({ success: false, error: 'invalid versionIndex' });
  }
  // push current to versions (front)
  if (!layout.versions) layout.versions = [];
  layout.versions.unshift({ at: new Date().toISOString(), data: layout.data, townHall: layout.townHall });
  // apply target
  const target = layout.versions[idx + 1]; // because we unshifted current
  if (!target) return res.status(500).json({ success: false, error: 'revert target missing after shift' });
  layout.data = target.data;
  layout.townHall = target.townHall;
  layout.updatedAt = new Date().toISOString();
  // Trim versions
  if (layout.versions.length > MAX_LAYOUT_VERSIONS) layout.versions.length = MAX_LAYOUT_VERSIONS;
  saveBaseLayouts();
  res.json({ success: true, data: { id: layout.id, updatedAt: layout.updatedAt } });
});
// Share a layout to Discord (simple embed)
router.post('/base/layouts/:id/share', async (req, res) => {
  const { id } = req.params;
  const layout = baseLayouts.get(id);
  if (!layout) return res.status(404).json({ success: false, error: 'not found' });
  try {
    // Basic building counts summarization if cells exist
    let counts = [];
    if (layout.data && Array.isArray(layout.data.cells)) {
      const map = new Map();
      for (const c of layout.data.cells) {
        if (!c?.type) continue; map.set(c.type, (map.get(c.type)||0)+1);
      }
      counts = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([t,n])=>`${t}:${n}`);
    }
  await sendDiscordMessage(`Base Layout: ${layout.name}`, {
      embeds: [{
        title: layout.name,
        description: counts.length ? counts.join(' | ') : 'No buildings placed yet',
        color: 0x00a3ff,
        fields: [
          { name: 'Town Hall', value: String(layout.townHall || 'n/a'), inline: true },
          { name: 'Cells', value: String(layout.data?.cells?.length || 0), inline: true },
      layout.category ? { name: 'Category', value: layout.category, inline: true } : null,
        ],
        timestamp: new Date().toISOString()
      }]
    });
    layout.sharedAt = new Date().toISOString();
    saveBaseLayouts();
    res.json({ success: true, data: { sharedAt: layout.sharedAt } });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;

// -------------
// Aggregated summary endpoint (added at end for clarity)
// -------------
router.get('/summary', async (req, res, next) => {
  try {
    const clanTag = req.query.tag;
  const ck = cacheKeys.summary(clanTag || 'default');
    const cached = await getCache(ck);
    if (cached) return res.json({ success: true, data: cached, cached: true });

  const [clan, membersResp, war] = await Promise.all([
      cocApi.getClan(clanTag).catch(e => ({ error: e.message })),
      cocApi.getClanMembers(clanTag).catch(e => ({ error: e.message })),
      cocApi.getCurrentWar(clanTag).catch(e => null) // current war may 404 / not in war
    ]);

    const membersItems = membersResp?.items || [];
    // Normalize roles and sort by trophies desc (primary), then TH level desc (secondary)
    const normalizeRole = (r) => {
      const raw = (r || '').toLowerCase();
      if (raw === 'leader') return 'Leader';
      if (raw === 'coleader' || raw === 'co-leader' || raw === 'co_leader' || raw === 'admin') return 'Co-Leader';
      if (raw === 'elder') return 'Elder';
      return 'Member';
    };

    const topMembers = membersItems
      .slice()
      .sort((a, b) => (b.trophies || 0) - (a.trophies || 0) || (b.townHallLevel || 0) - (a.townHallLevel || 0))
      .slice(0, 50); // provide a bit more data to UI (was 15)

    const rateLimit = getPrometheusRateLimitMetrics();
    // Derive war info early for polling logic
    const warInfo = war && war.state ? ( () => {
        const parseTime = (t) => {
          if (!t) return null;
          const iso = t.includes('T') && t.endsWith('Z') ? t.replace(/\.(\d+)Z$/, 'Z') : t;
          const d = new Date(iso);
          return isNaN(d.getTime()) ? null : d.toISOString();
        };
        const now = Date.now();
        const start = parseTime(war.startTime);
        const end = parseTime(war.endTime);
        const prep = parseTime(war.preparationStartTime);
        const startMs = start ? Date.parse(start) : null;
        const endMs = end ? Date.parse(end) : null;
        const remainingMs = endMs ? Math.max(0, endMs - now) : null;
        const attacksAvailable = (war.teamSize || 0) * (war.attacksPerMember || 2);
        const clanAttacks = (war.clan?.attacks || 0);
        const memberAttackMap = new Map();
        (war.clan?.members || []).forEach(m => {
          const used = (m.attacks || []).length;
          memberAttackMap.set(m.tag, {
            tag: m.tag,
            name: m.name,
            townHallLevel: m.townHallLevel || m.townhallLevel,
            attacksUsed: used,
            attacksAvailable: war.attacksPerMember || 2
          });
        });
        return {
          state: war.state,
          phase: war.state,
          teamSize: war.teamSize,
          attacksPerMember: war.attacksPerMember,
          time: {
            preparationStart: prep,
            start,
            end,
            now: new Date().toISOString(),
            millisRemaining: remainingMs,
            secondsRemaining: remainingMs != null ? Math.floor(remainingMs/1000) : null
          },
          clan: war.clan ? { name: war.clan.name, stars: war.clan.stars, destruction: war.clan.destructionPercentage } : null,
          opponent: war.opponent ? { name: war.opponent.name, stars: war.opponent.stars, destruction: war.opponent.destructionPercentage } : null,
          attacks: {
            clanUsed: clanAttacks,
            clanAvailable: attacksAvailable,
            members: Array.from(memberAttackMap.values())
          }
        };
      })() : null;

    // Polling suggestion heuristic (backend driven so multiple clients align)
    function computePollingSuggestion(warObj, rl) {
      const limit = rl?.limit || 0;
      const remaining = rl?.remaining ?? 0;
      const pct = limit ? remaining / limit : 1;
      if (!warObj || !warObj.state || warObj.state === 'notInWar') {
        if (pct < 0.15) return { suggestedIntervalMs: 120_000, reason: 'idle-low-rl' };
        if (pct < 0.35) return { suggestedIntervalMs: 90_000, reason: 'idle-mid-rl' };
        return { suggestedIntervalMs: 60_000, reason: 'idle' };
      }
      if (warObj.state === 'preparation') {
        if (pct < 0.15) return { suggestedIntervalMs: 45_000, reason: 'prep-low-rl' };
        if (pct < 0.35) return { suggestedIntervalMs: 30_000, reason: 'prep-mid-rl' };
        return { suggestedIntervalMs: 20_000, reason: 'preparation' };
      }
      if (warObj.state === 'inWar') {
        // Faster when healthy; slow down under pressure
        if (pct < 0.10) return { suggestedIntervalMs: 30_000, reason: 'war-critical-rl' };
        if (pct < 0.25) return { suggestedIntervalMs: 20_000, reason: 'war-low-rl' };
        if (pct < 0.50) return { suggestedIntervalMs: 12_000, reason: 'war-mid-rl' };
        return { suggestedIntervalMs: 10_000, reason: 'war' };
      }
      if (warObj.state === 'warEnded') {
        return { suggestedIntervalMs: 90_000, reason: 'war-ended' };
      }
      return { suggestedIntervalMs: 60_000, reason: 'default' };
    }

    const polling = computePollingSuggestion(warInfo, rateLimit);

    const summary = {
      clan,
      members: {
        count: membersItems.length,
        top: topMembers.map(m => ({
          tag: m.tag,
          name: m.name,
          role: normalizeRole(m.role),
            townHallLevel: m.townHallLevel || m.townhallLevel,
          trophies: m.trophies
        }))
      },
      war: warInfo,
      leagues: {
        warLeague: clan?.clanWarLeague ? { id: clan.clanWarLeague.id, name: clan.clanWarLeague.name } : null,
        capitalLeague: clan?.capitalLeague ? { id: clan.capitalLeague.id, name: clan.capitalLeague.name } : null,
      },
      // Provide a minimal icon mapping subset for quick TH icon lookup if available
      iconMapping: ( () => {
        try {
          const { iconMapping } = allGameAssets();
          if (iconMapping?.available) {
            const needed = {};
            for (let th=1; th<=20; th++) {
              const key = `TownHall${th}`;
              if (iconMapping.resolved[key]) needed[key] = iconMapping.resolved[key];
            }
            if (Object.keys(needed).length) return { resolved: needed };
          }
        } catch { /* ignore */ }
        return null;
      })(),
      polling,
      rateLimit,
      timestamp: new Date().toISOString()
    };

    // Dynamic cache TTL based on war state & rate limit suggestion (avoid over-querying upstream)
    let ttl = 30_000;
    if (warInfo?.state === 'inWar') ttl = Math.min(polling.suggestedIntervalMs * 1.5, 20_000); // keep hot
    else if (warInfo?.state === 'preparation') ttl = Math.min(polling.suggestedIntervalMs * 1.5, 30_000);
    else if (warInfo?.state === 'warEnded') ttl = 45_000;
    else ttl = Math.min(Math.max(polling.suggestedIntervalMs, 30_000), 120_000);

    await setCache(ck, summary, ttl);
    try {
      // Emit via Socket.IO if available on request app (server attaches io on app.locals.io)
      const io = req.app?.get('io');
      if (io) {
        // Minimal diff fields to reduce payload size
        io.emit('coc:summary:update', {
          tag: clanTag || 'default',
          timestamp: summary.timestamp,
          war: summary.war ? {
            state: summary.war.state,
            clan: summary.war.clan,
            opponent: summary.war.opponent,
            attacks: { clanUsed: summary.war.attacks?.clanUsed }
          } : null,
          rateLimit: summary.rateLimit ? { remaining: summary.rateLimit.remaining, limit: summary.rateLimit.limit } : null
        });
      }
    } catch (_) { /* ignore socket errors */ }
    res.json({ success: true, data: summary });
  } catch (e) { next(e); }
});
