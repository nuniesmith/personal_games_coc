import { paginate, paginationEnvelope } from '../utils/pagination.js';

describe('pagination helper', () => {
  test('paginates array basic', () => {
    const arr = Array.from({ length: 40 }, (_, i) => i + 1);
    const res = paginate(arr, 2, 10); // page 2
    expect(res.page).toBe(2);
    expect(res.pageSize).toBe(10);
    expect(res.total).toBe(40);
    expect(res.totalPages).toBe(4);
    expect(res.data[0]).toBe(11);
    expect(res.data[res.data.length - 1]).toBe(20);
  });

  test('clamps page beyond total', () => {
    const arr = [1,2,3];
    const res = paginate(arr, 5, 2); // page > totalPages
    expect(res.page).toBe(res.totalPages);
    expect(res.data.length).toBe(1); // last page has 1 item
  });

  test('paginationEnvelope computes totals', () => {
    const env = paginationEnvelope({ data: [1,2], page: 1, pageSize: 2, total: 5 });
    expect(env.totalPages).toBe(3);
    expect(env.hasNext).toBe(true);
    expect(env.hasPrev).toBe(false);
  });
});
