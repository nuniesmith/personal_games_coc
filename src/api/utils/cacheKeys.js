// Centralized cache key builders to avoid typos & keep contract in sync with docs/CACHE_KEYS.md

export const cacheKeys = {
  assignments: ({ clanTag, warSize, algorithm }) => `assign:${clanTag}:${warSize}:${algorithm}`,
  warPrep: ({ clanTag, mode }) => `war:prep:${clanTag}:${mode}`,
  clan: (clanTag) => `clan:${clanTag}`,
  members: (clanTag) => `members:${clanTag}`,
  summary: (clanTag) => `summary:${clanTag}`,
  warLive: (clanTag) => `war:live:${clanTag}`,
  leaderboardAttacks: ({ clanTag, season, metric, page }) => `lb:attacks:${clanTag}:${season}:${metric}:${page}`
};

export function parseKey(key) {
  // Lightweight parser for debugging/admin tools (best effort)
  const parts = key.split(':');
  const domain = parts[0];
  switch (domain) {
    case 'assign':
      return { type: 'assignments', clanTag: parts[1], warSize: Number(parts[2]), algorithm: parts[3] };
    case 'war':
      if (parts[1] === 'prep') return { type: 'warPrep', clanTag: parts[2], mode: parts[3] };
      if (parts[1] === 'live') return { type: 'warLive', clanTag: parts[2] };
      break;
    case 'clan': return { type: 'clan', clanTag: parts[1] };
    case 'members': return { type: 'members', clanTag: parts[1] };
    case 'summary': return { type: 'summary', clanTag: parts[1] };
    case 'lb':
      if (parts[1] === 'attacks') return { type: 'leaderboardAttacks', clanTag: parts[2], season: parts[3], metric: parts[4], page: Number(parts[5]) };
      break;
    default: return { type: 'unknown', raw: key };
  }
  return { type: 'unknown', raw: key };
}
