import request from 'supertest';
import { app } from '../server.js';
import fs from 'fs';
import path from 'path';

describe('Assets version endpoint', () => {
  beforeAll(()=>{
    const dir = path.join(process.cwd(), 'downloaded-game-assets');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const manifestPath = path.join(dir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      fs.writeFileSync(manifestPath, JSON.stringify({ generatedAt: new Date().toISOString(), categories: { buildings: { count: 1, files: ['TownHall16.png'] } } }, null, 2));
    }
  });
  test('returns version field', async () => {
    const res = await request(app).get('/api/assets/game/version');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.version).toBeDefined();
    expect(typeof res.body.version).toBe('string');
  });
});
