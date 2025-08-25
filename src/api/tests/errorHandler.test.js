import express from 'express';
import request from 'supertest';
import { errorHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/errors.js';

describe('Centralized error handler', () => {
  const app = express();
  app.get('/notfound', () => { throw new NotFoundError('resource missing'); });
  app.get('/boom', () => { throw new Error('Regular failure'); });
  app.get('/upstream', (req, res, next) => {
    const err = new Error('Upstream 404');
    err.isAxiosError = true;
    err.response = { status: 404, data: { message: 'Not found upstream' } };
    err.config = { url: '/coc/clans/%23XXXX', method: 'get' };
    next(err);
  });
  app.use(errorHandler);

  test('AppError surfaces status & code', async () => {
    const res = await request(app).get('/notfound');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('not_found');
    expect(res.body.error).toMatch(/resource missing/i);
  });

  test('Generic error becomes internal_error', async () => {
    const res = await request(app).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body.code).toBe('internal_error');
  });

  test('Axios style error maps to upstream code', async () => {
    const res = await request(app).get('/upstream');
    expect(res.status).toBe(404);
    expect(res.body.code).toMatch(/upstream_404/);
    expect(res.body.error).toMatch(/Not found upstream/);
    expect(res.body.details).toHaveProperty('upstreamStatus', 404);
  });
});
