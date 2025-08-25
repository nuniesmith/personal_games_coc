import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';

// Re-create manifest before importing router so that seeding finds expected files.
const manifestDir = path.join(process.cwd(), 'downloaded-game-assets');
const manifestPath = path.join(manifestDir, 'manifest.json');
if (!fs.existsSync(manifestDir)) fs.mkdirSync(manifestDir, { recursive: true });
const manifest = {
  generatedAt: new Date().toISOString(),
  categories: {
    heroes: { count: 2, files: ['BarbarianKing.png','ArcherQueen.png'] },
    pets: { count: 2, files: ['Unicorn.png','MightyYak.png'] },
    equipment: { count: 3, files: ['BarbarianPuppet.png','RageVial.png','RoyalGem.png'] }
  }
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

import router from '../routes/coc.js';

const app = express();
app.use(express.json());
app.use((req,res,next)=>{ req.user = { roles: ['service'] }; next(); });
app.use('/coc', router);

describe('generic icon mapping seeding (heroes/pets/equipment)', () => {
  test('seed endpoint seeds expected mappings', async () => {
    const res = await request(app).post('/coc/game/icons/mapping/seed').send({ types: ['heroes','pets','heroEquipment'] });
    if (res.status !== 200) {
      // surface error for easier diagnosis
      // eslint-disable-next-line no-console
      console.error('Seed response error', res.body);
    }
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.types).toEqual(expect.arrayContaining(['heroes','pets','heroEquipment']));
    // Fetch current mapping
    const mapRes = await request(app).get('/coc/game/icons/mapping');
    expect(mapRes.status).toBe(200);
    const mappings = mapRes.body.data.mappings || {};
    // Presence checks (may have been pre-existing; just ensure they exist)
    ['BarbarianKing','ArcherQueen','Unicorn','MightyYak','BarbarianPuppet','RageVial','RoyalGem'].forEach(k => {
      expect(mappings).toHaveProperty(k);
    });
  });
});
