import { cacheSet, cacheGet, cacheStats } from '../utils/cache.js';

beforeAll(async () => {
  // cache module auto-inits on import if initCache called elsewhere; tests rely on fallback memory
});

describe('cache fallback', () => {
  test('set/get works and updates hit/miss counters', async () => {
    // ensure key not present
    await cacheSet('unit:test', { a: 1 }, 50);
    const first = await cacheGet('unit:test'); // hit
    expect(first).toEqual({ a: 1 });
    // wait for expiry
    await new Promise(r=>setTimeout(r, 60));
    const second = await cacheGet('unit:test'); // miss (expired)
    expect(second).toBeNull();
    const stats = cacheStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    if (stats.hitRatio != null) expect(stats.hitRatio).toBeGreaterThan(0);
  });

  test('stats shape', () => {
    const stats = cacheStats();
    expect(stats).toHaveProperty('memoryEntries');
    expect(stats).toHaveProperty('hits');
    expect(stats).toHaveProperty('misses');
  });
});
