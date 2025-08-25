import request from 'supertest';

let app;
const fakeItems = Array.from({ length: 37 }, (_, i) => ({ id: i+1, opponent: { name: `Opp${i+1}` }, result: i % 2 ? 'win' : 'lose' }));

describe('Warlog pagination', () => {
  beforeAll(async () => {
    process.env.REDIS_URL = '';
    process.env.ENABLE_REDIS_CACHE = 'false';
    process.env.ALLOW_EMPTY_COC_TOKEN = '1';
  process.env.SERVICE_BOT_TOKEN = 'test-token';
    // Import server & then monkeypatch cocApi methods directly
    const mod = await import('../server.js');
    const cocApiMod = await import('../utils/cocApi.js');
    cocApiMod.cocApi.getWarLog = async () => ({ items: fakeItems });
    cocApiMod.cocApi.getClan = async () => ({});
    cocApiMod.cocApi.getClanMembers = async () => ({ items: [] });
    cocApiMod.cocApi.getCurrentWar = async () => ({ state: 'notInWar' });
    app = mod.app;
    global.__testServer = mod.server;
  });
  afterAll(async () => {
    const srv = global.__testServer;
    if (srv && srv.listening) await new Promise(r => srv.close(r));
  });

  test('returns paginated slice', async () => {
  const res = await request(app).get('/api/coc/clan/warlog?page=2&pageSize=10').set('x-service-token','test-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(37);
    expect(res.body.data.length).toBe(10);
    expect(res.body.hasNext).toBe(true);
    expect(res.body.hasPrev).toBe(true);
  });

  test('clamps page beyond totalPages', async () => {
  const res = await request(app).get('/api/coc/clan/warlog?page=99&pageSize=25').set('x-service-token','test-token');
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(res.body.totalPages);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});
