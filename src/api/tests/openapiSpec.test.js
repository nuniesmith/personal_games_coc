import request from 'supertest';
import { app } from '../server.js';

describe('OpenAPI JSON spec', () => {
  test('includes merged modular war paths & schemas', async () => {
    const res = await request(app).get('/api/docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3/);
    // Ensure war path added via modular file
    expect(res.body.paths).toHaveProperty('/war/prep-stats');
    expect(res.body.paths).toHaveProperty('/coc/clan/warlog');
    // Schema existence
    expect(res.body.components.schemas).toHaveProperty('PaginatedWarLog');
  });
});
