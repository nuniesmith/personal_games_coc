import request from 'supertest';
import express from 'express';
import router from '../routes/coc.js';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());
// Minimal auth middleware simulation BEFORE router to satisfy ensureServiceRole
app.use((req,res,next)=>{ req.user = { roles: ['service'] }; next(); });
app.use('/coc', router);

// Set up temporary manifest with minimal TownHall icons
const manifestDir = path.join(process.cwd(), 'downloaded-game-assets');
const manifestPath = path.join(manifestDir, 'manifest.json');

beforeAll(()=>{
  if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    categories: {
      buildings: { count: 3, files: ['TownHall14.png','TownHall15.png','TownHall16.png'] }
    }
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
});

afterAll(()=>{
  // leave directory; remove manifest file
  if (fs.existsSync(manifestPath)) fs.unlinkSync(manifestPath);
});

describe('icon mapping seeding endpoints', () => {
  test('seed town halls adds mappings', async () => {
    const res = await request(app).post('/coc/game/icons/mapping/seed/townhalls');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // If already seeded from prior run addedCount may be 0; ensure mapping endpoint contains required keys
    if (res.body.data.addedCount > 0) {
      const keys = res.body.data.added.map(a=>a.key);
      expect(keys).toEqual(expect.arrayContaining(['TownHall14','TownHall15','TownHall16']));
    } else {
      const mapRes = await request(app).get('/coc/game/icons/mapping');
      expect(mapRes.status).toBe(200);
      const mappings = mapRes.body.data.mappings || {};
      ['TownHall14','TownHall15','TownHall16'].forEach(k=> expect(mappings).toHaveProperty(k));
    }
  });
});
