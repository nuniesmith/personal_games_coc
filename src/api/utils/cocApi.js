import axios from 'axios';
import { logger } from './logger.js';

const BASE_URL = process.env.COC_API_BASE_URL || 'https://api.clashofclans.com/v1';
// Support single or multiple Clash of Clans API tokens (comma separated)
// Official CoC API tokens are JWTs bound to allowed IPs configured in the dev portal.
// Env precedence: COC_API_TOKENS > COC_API_TOKEN > API_TOKEN
const RAW_TOKENS = process.env.COC_API_TOKENS
  || process.env.COC_API_TOKEN
  || process.env.API_TOKEN
  || '';

const TOKENS = RAW_TOKENS.split(',')
  .map(t => t.trim())
  .filter(Boolean);

if (TOKENS.length === 0) {
  logger.warn('No Clash of Clans API token found (COC_API_TOKENS / COC_API_TOKEN / API_TOKEN). Requests will fail with 401/403.');
}

let tokenIndex = 0;
const getCurrentToken = () => TOKENS[tokenIndex] || '';
const advanceToken = () => {
  if (TOKENS.length > 1) {
    tokenIndex = (tokenIndex + 1) % TOKENS.length;
    logger.warn(`Rotating to next Clash of Clans API token (index ${tokenIndex + 1}/${TOKENS.length}).`);
  }
};

// Rate limit state (captured from response headers)
const rateLimit = {
  limit: null,
  remaining: null,
  reset: null,
  retryAfter: null,
  lastUpdated: null,
};

export const encodeTag = (tag) => encodeURIComponent(tag.startsWith('#') ? tag : `#${tag}`);

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'User-Agent': 'FeastOrFamine-CoC-Dashboard/1.0 (+github.com/your-org)'
  }
});

client.interceptors.request.use((config) => {
  // Always read the current token (allows runtime rotation)
  const tok = getCurrentToken();
  config.headers.Authorization = `Bearer ${tok}`;
  return config;
});

client.interceptors.response.use(
  (res) => {
    try {
      const h = res.headers || {};
      if (h['x-ratelimit-limit']) rateLimit.limit = Number(h['x-ratelimit-limit']);
      if (h['x-ratelimit-remaining']) rateLimit.remaining = Number(h['x-ratelimit-remaining']);
      if (h['x-ratelimit-reset']) rateLimit.reset = Number(h['x-ratelimit-reset']);
      if (h['retry-after']) rateLimit.retryAfter = Number(h['retry-after']);
      rateLimit.lastUpdated = new Date().toISOString();
    } catch (e) {
      // ignore header parsing errors
    }
    return res.data;
  },
  async (err) => {
    const status = err.response?.status;
    const original = err.config;
    const msg = err.response?.data?.message || err.message;

    // Retry once on auth / rate limit with next token if available
    if (!original._retried && (status === 403 || status === 401 || status === 429) && TOKENS.length > 1) {
      original._retried = true;
      logger.warn('COC API error - attempting token rotation retry', { status, msg, url: original.url });
      advanceToken();
      return client(original);
    }

    logger.warn('COC API error', { status, msg, url: original?.url });
    throw err;
  }
);

// Helper to resolve default clan tag from env
const getDefaultClanTag = () => {
  const tag = process.env.COC_CLAN_TAG;
  if (!tag) throw new Error('COC_CLAN_TAG is not configured');
  return tag;
};

export const cocApi = {
  // Clan endpoints
  getClan: async (clanTag = getDefaultClanTag()) => client.get(`/clans/${encodeTag(clanTag)}`),
  getClanMembers: async (clanTag = getDefaultClanTag()) => client.get(`/clans/${encodeTag(clanTag)}/members`),
  getWarLog: async (clanTag = getDefaultClanTag(), limit = 20) => client.get(`/clans/${encodeTag(clanTag)}/warlog`, { params: { limit } }),
  getCurrentWar: async (clanTag = getDefaultClanTag()) => client.get(`/clans/${encodeTag(clanTag)}/currentwar`),
  getLeagueGroup: async (clanTag = getDefaultClanTag()) => client.get(`/clans/${encodeTag(clanTag)}/currentwar/leaguegroup`),
  getClanCapitalRaidSeasons: async (clanTag = getDefaultClanTag(), limit = 3) => client.get(`/clans/${encodeTag(clanTag)}/capitalraidseasons`, { params: { limit } }),

  // League wars
  getLeagueWar: async (warTag) => client.get(`/clanwarleagues/wars/${encodeTag(warTag)}`),

  // Players
  getPlayer: async (playerTag) => client.get(`/players/${encodeTag(playerTag)}`),
  verifyPlayerToken: async (playerTag, token) => client.post(`/players/${encodeTag(playerTag)}/verifytoken`, { token }),

  // Labels & locations (optional)
  listClanLabels: async () => client.get('/labels/clans'),
  listPlayerLabels: async () => client.get('/labels/players'),
  listLocations: async () => client.get('/locations'),

  // Gold Pass
  getCurrentGoldPassSeason: async () => client.get('/goldpass/seasons/current'),

  // Leagues & related
  listLeagues: async () => client.get('/leagues'),
  getLeague: async (leagueId) => client.get(`/leagues/${leagueId}`),
  getLeagueSeasons: async (leagueId) => client.get(`/leagues/${leagueId}/seasons`),
  getLeagueSeasonRankings: async (leagueId, seasonId) => client.get(`/leagues/${leagueId}/seasons/${seasonId}`),
  listWarLeagues: async () => client.get('/warleagues'),
  getWarLeague: async (leagueId) => client.get(`/warleagues/${leagueId}`),
  listBuilderBaseLeagues: async () => client.get('/builderbaseleagues'),
  getBuilderBaseLeague: async (leagueId) => client.get(`/builderbaseleagues/${leagueId}`),
  listCapitalLeagues: async () => client.get('/capitalleagues'),
  getCapitalLeague: async (leagueId) => client.get(`/capitalleagues/${leagueId}`),

  // Locations - rankings
  getLocation: async (locationId) => client.get(`/locations/${locationId}`),
  getLocationClanRankings: async (locationId) => client.get(`/locations/${locationId}/rankings/clans`),
  getLocationPlayerRankings: async (locationId) => client.get(`/locations/${locationId}/rankings/players`),
  getLocationBuilderBasePlayerRankings: async (locationId) => client.get(`/locations/${locationId}/rankings/players-builder-base`),
  getLocationBuilderBaseClanRankings: async (locationId) => client.get(`/locations/${locationId}/rankings/clans-builder-base`),
  getLocationCapitalRankings: async (locationId) => client.get(`/locations/${locationId}/rankings/capitals`),
  // Debug helper (not part of official API)
  _debugTokenState: () => ({ total: TOKENS.length, currentIndex: tokenIndex, hasMultiple: TOKENS.length > 1 }),
  _rateLimitState: () => ({ ...rateLimit })
};

export function getPrometheusRateLimitMetrics() {
  return {
    limit: rateLimit.limit ?? 0,
    remaining: rateLimit.remaining ?? 0,
    reset: rateLimit.reset ?? 0,
    retryAfter: rateLimit.retryAfter ?? 0
  };
}

export default cocApi;
