import express from 'express';
// openid-client is CommonJS in the installed version; use namespace import for ESM compatibility
import * as openid from 'openid-client';
const { Issuer, generators } = openid;
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

const router = express.Router();

// In-memory state store (swap for Redis if needed)
const stateStore = new Map();

function getEnv() {
  const {
    OIDC_ISSUER_URL,
    OIDC_CLIENT_ID,
    OIDC_CLIENT_SECRET,
    OIDC_REDIRECT_URI,
    JWT_SECRET = 'fallback-secret'
  } = process.env;
  if (!OIDC_ISSUER_URL || !OIDC_CLIENT_ID || !OIDC_REDIRECT_URI) {
    throw new Error('Missing OIDC env: OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_REDIRECT_URI');
  }
  return { OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI, JWT_SECRET };
}

async function getClient() {
  const { OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, OIDC_REDIRECT_URI } = getEnv();
  const issuer = await Issuer.discover(OIDC_ISSUER_URL);
  return new issuer.Client({
    client_id: OIDC_CLIENT_ID,
    client_secret: OIDC_CLIENT_SECRET,
    redirect_uris: [OIDC_REDIRECT_URI],
    response_types: ['code'],
  });
}

router.get('/login', async (req, res, next) => {
  try {
    const client = await getClient();
    const state = generators.state();
    const nonce = generators.nonce();
    stateStore.set(state, { created: Date.now(), nonce });

    const url = client.authorizationUrl({
      scope: 'openid email profile',
      state,
      nonce,
    });

    res.json({ success: true, url });
  } catch (e) { next(e); }
});

router.get('/callback', async (req, res, next) => {
  try {
    const { OIDC_REDIRECT_URI, JWT_SECRET } = getEnv();
    const client = await getClient();

    const params = client.callbackParams(req);
    const { state } = params;
    const stored = stateStore.get(state);
    if (!stored) return res.status(400).json({ error: 'invalid_state' });

    const tokenSet = await client.callback(OIDC_REDIRECT_URI, params, { state, nonce: stored.nonce });
    const userinfo = await client.userinfo(tokenSet.access_token);

    // Auto-provision user JWT for our API (stateless)
    const payload = {
      id: userinfo.sub,
      username: userinfo.preferred_username || userinfo.email || userinfo.sub,
      role: 'user',
      email: userinfo.email,
      name: userinfo.name,
      provider: 'authentik',
    };
    const ourToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    logger.info('OIDC login success', { user: payload.username });

    // Optional: redirect to frontend with token as fragment
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirect = `${frontend}/#token=${encodeURIComponent(ourToken)}`;
    res.redirect(302, redirect);
  } catch (e) { next(e); }
});

export default router;
