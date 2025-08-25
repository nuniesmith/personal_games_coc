import { cocApi } from '../utils/cocApi.js';

// NOTE: These tests are lightweight sanity checks; real integration tests would mock axios.

describe('cocApi debug state', () => {
  test('token debug shape', () => {
    const state = cocApi._debugTokenState();
    expect(state).toHaveProperty('total');
    expect(state).toHaveProperty('currentIndex');
  });

  test('rate limit state shape', () => {
    const rl = cocApi._rateLimitState();
    expect(rl).toHaveProperty('limit');
    expect(rl).toHaveProperty('remaining');
  });
});
