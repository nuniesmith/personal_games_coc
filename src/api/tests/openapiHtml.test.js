import request from 'supertest';
import { app } from '../server.js';

describe('OpenAPI HTML docs', () => {
  test('serves HTML viewer', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('Clash Ops API');
    expect(res.text).toContain('/api/docs/openapi.json');
  });
});
