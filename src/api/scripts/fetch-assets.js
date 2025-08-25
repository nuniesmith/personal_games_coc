#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Configurable via env
const BASE = process.env.COS_ASSET_BASE || 'https://www.clashofstats.com/images/game-data-sprites';
const CATEGORIES = (process.env.COS_ASSET_CATEGORIES || [
  'hero','troop','building','spell','pet','equipment','siege','trap','super-troop','capital-building','capital-troop','builder-base-troop','builder-base-building'
]).toString().split(',').map(s=>s.trim()).filter(Boolean);
const SCALES = (process.env.COS_ASSET_SCALES || '1x,2x').split(',').map(s=>s.trim()).filter(Boolean);
const MAX_CONSECUTIVE_MISSES = Number(process.env.COS_MAX_MISSES || 5);
const MAX_INDEX = Number(process.env.COS_MAX_INDEX || 400);
const OUT_DIR = path.resolve(process.env.COS_OUT_DIR || 'downloaded-game-assets');
const CONCURRENCY = Number(process.env.COS_CONCURRENCY || 5);
const HEAD_DELAY_MS = Number(process.env.COS_HEAD_DELAY_MS || 40);

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = { base: BASE, generatedAt: new Date().toISOString(), categories: {}, scales: SCALES };
const queue = [];
function enqueue(task){ queue.push(task); }

async function worker() {
  while (queue.length) {
    const { url, dest } = queue.shift();
    if (fs.existsSync(dest)) continue;
    try {
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, buf);
      process.stdout.write('.');
    } catch (e) {
      process.stdout.write('x');
    }
  }
}

async function probeCategory(category) {
  manifest.categories[category] = { files: [], count: 0 };
  let consecutiveMisses = 0;
  for (let i=0; i <= MAX_INDEX; i++) {
    const testUrl = `${BASE}/1x/${category}-${i}.png`;
    let ok = false;
    try {
      const head = await fetch(testUrl, { method: 'HEAD' });
      ok = head.ok;
    } catch (_) { ok = false; }
    if (ok) {
      consecutiveMisses = 0;
      manifest.categories[category].files.push(`${category}-${i}.png`);
      for (const scale of SCALES) {
        const url = `${BASE}/${scale}/${category}-${i}.png`;
        const dest = path.join(OUT_DIR, category, scale, `${category}-${i}.png`);
        enqueue({ url, dest });
      }
    } else {
      consecutiveMisses++;
      if (consecutiveMisses >= MAX_CONSECUTIVE_MISSES) break;
    }
    await new Promise(r=>setTimeout(r, HEAD_DELAY_MS));
  }
  manifest.categories[category].count = manifest.categories[category].files.length;
  process.stdout.write(`\n${category}: ${manifest.categories[category].count}`);
}

(async () => {
  console.log('Scanning categories:', CATEGORIES.join(', '));
  for (const cat of CATEGORIES) {
    await probeCategory(cat);
  }
  console.log('\nDownloading assets...');
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('\nDone. Manifest at', path.join(OUT_DIR, 'manifest.json'));
})();
