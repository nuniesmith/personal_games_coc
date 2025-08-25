import api from './api'

export const cocAPI = {
  getClan: (tag) => api.get('/coc/clan', { params: { tag } }),
  getMembers: (tag) => api.get('/coc/clan/members', { params: { tag } }),
  getWarLog: (tag, limit = 20) => api.get('/coc/clan/warlog', { params: { tag, limit } }),
  getCurrentWar: (tag) => api.get('/coc/clan/currentwar', { params: { tag } }),
  getLeagueGroup: (tag) => api.get('/coc/clan/leaguegroup', { params: { tag } }),
  getCapitalRaidSeasons: (tag, limit = 3) => api.get('/coc/clan/capitalraidseasons', { params: { tag, limit } }),
  getLeagueWar: (warTag) => api.get(`/coc/league/war/${encodeURIComponent(warTag)}`),
  getPlayer: (playerTag) => api.get(`/coc/player/${encodeURIComponent(playerTag)}`),
  verifyPlayer: (playerTag, token) => api.post(`/coc/player/${encodeURIComponent(playerTag)}/verify`, { token }),
  generateAssignments: (payload) => api.post('/coc/assignments/generate', payload),
  getSummary: (tag) => api.get('/coc/summary', { params: { tag } }),
  pushWarUpdate: (clanTag) => api.post('/coc/war/push', { clanTag }),
  getWarPrepStats: (tag, { includeHeroes=false, heroSampleSize=30 } = {}) => api.get('/war/prep-stats', { params: { tag, heroes: includeHeroes? 1:0, heroSampleSize } }),
  // Base layouts
  listBaseLayouts: () => api.get('/coc/base/layouts'),
  getBaseLayout: (id) => api.get(`/coc/base/layouts/${id}`),
  createBaseLayout: (payload) => api.post('/coc/base/layouts', payload),
  updateBaseLayout: (id, payload) => api.put(`/coc/base/layouts/${id}`, payload),
  deleteBaseLayout: (id) => api.delete(`/coc/base/layouts/${id}`),
  shareBaseLayout: (id) => api.post(`/coc/base/layouts/${id}/share`),
  exportBaseLayout: (id) => api.get(`/coc/base/layouts/${id}/export`),
  exportAllBaseLayouts: () => api.get('/coc/base/layouts-export'),
  importBaseLayout: (payload) => api.post('/coc/base/layouts/import', payload),
  getBaseLayoutVersions: (id) => api.get(`/coc/base/layouts/${id}/versions`),
  revertBaseLayout: (id, versionIndex) => api.post(`/coc/base/layouts/${id}/revert`, { versionIndex }),
  getBuildingLimits: (th) => api.get(`/coc/base/building-limits/${th}`),
  getGameAssets: () => api.get('/coc/game/assets'),
  getGameAssetsEnv: (env) => api.get(`/coc/game/assets/env/${encodeURIComponent(env)}`),
  getGameAssetsIndex: () => api.get('/coc/game/assets/index'),
  searchGameAssets: ({ query, env, type, limit } = {}) => api.get('/coc/game/assets/search', { params: { query, env, type, limit } }),
  getIconMapping: () => api.get('/coc/game/icons/mapping'),
  suggestIconMapping: (names, limitPerName=5) => api.post('/coc/game/icons/mapping/suggest', { names, limitPerName }),
  autoApplyIconMapping: (names, dryRun=false) => api.post('/coc/game/icons/mapping/auto-apply', { names, dryRun }),
  seedTownHallIconMappings: () => api.post('/coc/game/icons/mapping/seed/townhalls'),
  seedIconMappings: (types) => api.post('/coc/game/icons/mapping/seed', { types }),
  getIconMappingStats: (includeAll=false) => api.get('/coc/game/icons/mapping/stats', { params: includeAll? { include: 'all' } : {} }),
  mergeIconMapping: (mappings) => api.patch('/coc/game/icons/mapping', { mappings }),
  deleteIconMapping: (names=null) => api.delete('/coc/game/icons/mapping', { data: names? { names } : {} }),
  getStrategyGuidesMeta: () => api.get('/coc/game/strategy-guides/meta'),
  listStrategyGuides: () => api.get('/coc/game/strategy-guides'),
  getStrategyGuide: (id) => api.get(`/coc/game/strategy-guides/${id}`),
  createStrategyGuide: (payload) => api.post('/coc/game/strategy-guides', payload),
  updateStrategyGuide: (id, payload) => api.put(`/coc/game/strategy-guides/${id}`, payload),
  deleteStrategyGuide: (id) => api.delete(`/coc/game/strategy-guides/${id}`),
  shareStrategyGuide: (id) => api.post(`/coc/game/strategy-guides/${id}/share`),
  // Base URL already contains /api so path should not repeat it
  getAssetManifest: () => api.get('/assets/game/manifest'),
  getAssetVersion: () => api.get('/assets/game/version'),
  async getCurrentWar(clanTag){
    return api.get(`/coc/war/current?clanTag=${encodeURIComponent(clanTag)}`)
  },
  async pushWarUpdate(clanTag){
    return api.post(`/coc/war/push`, { clanTag })
  }
}

export default cocAPI
