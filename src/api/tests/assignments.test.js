import { jest } from '@jest/globals';

jest.unstable_mockModule('../utils/cocApi.js', () => ({
  cocApi: { getClanMembers: async () => ({ items: Array.from({ length: 20 }).map((_,i)=> ({ tag:`#P${i+1}`, name:`Player${i+1}`, townHallLevel: 16 - Math.floor(i/2), trophies: 5000 - i*10 })) }) }
}));

describe('Assignment generation', () => {
  test('strength algorithm returns warSize slots', async () => {
    const mod = await import('../services/assignmentService.js');
    const res = await mod.generateAssignments({ clanTag:'#TEST', warSize:10, algorithm:'strength' });
    expect(res.assignments).toHaveLength(10);
    for (let i=1;i<res.assignments.length;i++) expect(res.assignments[i-1].weight).toBeGreaterThanOrEqual(res.assignments[i].weight);
  });
  test('mirror algorithm assigns sequential slots', async () => {
    const mod = await import('../services/assignmentService.js');
    const res = await mod.generateAssignments({ clanTag:'#TEST', warSize:5, algorithm:'mirror' });
    expect(res.assignments.map(a=>a.slot)).toEqual([1,2,3,4,5]);
  });
});
