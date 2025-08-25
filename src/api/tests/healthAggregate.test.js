import request from 'supertest';

let app;

describe('Aggregated health endpoint', () => {
  beforeAll(async ()=>{
    // Force in-memory cache (avoid redis lookup) BEFORE import
    process.env.REDIS_URL = '';
    process.env.ENABLE_REDIS_CACHE = 'false';
    process.env.ALLOW_EMPTY_COC_TOKEN = '1';
  const mod = await import('../server.js');
  app = mod.app; // Assign app from imported module
  global.__testServer = mod.server; // capture for afterAll
  }, 15000);
  afterAll(async ()=>{
    const srv = global.__testServer;
    if (srv && srv.listening) {
      await new Promise(res => srv.close(res)); // Close server if listening
    }
  });
  test('returns combined status object', async () => {
    // Increase timeout for first import cost
    if (typeof test !== 'undefined') {
      // no-op placeholder (Jest automatically handles default timeout in this env)
    }
    const res = await request(app).get('/health/aggregate');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.service).toBeDefined();
    expect(res.body.data.rateLimit).toBeDefined();
    expect(res.body.data.cache).toBeDefined();
    expect(res.body.data.assets).toBeDefined();
    expect(typeof res.body.data.service.uptimeSec).toBe('number');
    // Extended field checks
    expect(typeof res.body.data.service.version).toBe('string');
    if (res.body.data.rateLimit) {
      expect(typeof res.body.data.rateLimit.limit).toBe('number');
      expect(typeof res.body.data.rateLimit.remaining).toBe('number');
    }
    expect(typeof res.body.data.cache.redisEnabled).toBe('boolean');
    expect(typeof res.body.data.process.heapUsed).toBe('number');
    // timestamp ISO-ish
    expect(new Date(res.body.data.timestamp).toString()).not.toBe('Invalid Date');
  });
});
