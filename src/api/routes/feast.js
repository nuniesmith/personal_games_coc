import express from 'express';
import axios from 'axios';

const router = express.Router();

const PY_BOT_BASE = process.env.FEAST_INTERNAL_URL || 'http://feast-bot:8027';

async function fetchBot(path) {
  const url = `${PY_BOT_BASE}${path}`;
  const res = await axios.get(url, { timeout: 5000 });
  return res.data;
}

router.get('/health', async (req, res) => {
  try { res.json(await fetchBot('/health')); } catch (e) { res.status(502).json({ success:false, error: e.message }); }
});

router.get('/info', async (req, res) => {
  try { res.json(await fetchBot('/bot/info')); } catch (e) { res.status(502).json({ success:false, error: e.message }); }
});

router.get('/commands', async (req, res) => {
  try {
    const params = new URLSearchParams();
    ['limit','offset','q'].forEach(k => { if (req.query[k]) params.set(k, req.query[k]) });
    res.json(await fetchBot(`/bot/commands?${params.toString()}`));
  } catch (e) { res.status(502).json({ success:false, error: e.message }); }
});

router.get('/tracked-clans', async (req, res) => {
  try {
    const params = new URLSearchParams();
    ['limit','offset','q'].forEach(k => { if (req.query[k]) params.set(k, req.query[k]) });
    res.json(await fetchBot(`/bot/tracked-clans?${params.toString()}`));
  } catch (e) { res.status(502).json({ success:false, error: e.message }); }
});

export default router;
