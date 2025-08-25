import { cocApi } from '../utils/cocApi.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { cacheKeys } from '../utils/cacheKeys.js';
let munkresInstance = null; try { const { default: Munkres } = await import('munkres-js'); munkresInstance = new Munkres(); } catch {}
const TH_BASE_STEP = Number(process.env.ASSIGN_TH_BASE_STEP || 1000);
const HERO_COEFF = Number(process.env.ASSIGN_HERO_COEFF || 0.4);
const TROPHY_COEFF = Number(process.env.ASSIGN_TROPHY_COEFF || 0.01);
const computePlayerWeight = p => { const th = p.townHallLevel||p.townhallLevel||p.th||0; const heroes=(p.heroes||[]).reduce((a,h)=>a+(h.level||0),0); return th*TH_BASE_STEP + Math.round(heroes*HERO_COEFF + (p.trophies||0)*TROPHY_COEFF); };
const mirrorAssignments = (players, warSize) => players.slice(0,warSize).map((p,i)=>({ slot:i+1, tag:p.tag, name:p.name, th:p.th, weight:p.weight }));
const strengthAssignments = mirrorAssignments;
function optimalAssignments(players, warSize) { if(!munkresInstance) return strengthAssignments(players, warSize); const selected=players.slice(0,warSize); const maxW=selected[0]?.weight||0; const minW=selected[selected.length-1]?.weight||0; const targets=selected.map((_,i)=> maxW - ((maxW-minW)/(warSize-1||1))*i ); const matrix=selected.map(p=>targets.map(t=>Math.abs(p.weight-t))); let indices; try { indices = munkresInstance.compute(matrix);} catch { return strengthAssignments(players, warSize);} const bySlot=new Array(warSize); indices.forEach(([r,c])=>{ const p=selected[r]; bySlot[c]={ slot:c+1, tag:p.tag, name:p.name, th:p.th, weight:p.weight };}); return bySlot; }
export async function generateAssignments({ clanTag, warSize=15, algorithm='strength' }) {
	warSize = Math.min(Number(warSize) || 15, 50);
	const ck = cacheKeys.assignments({ clanTag, warSize, algorithm });
	const cached = await cacheGet(ck); if (cached) return { ...cached, cached: true };
	const membersResp = await cocApi.getClanMembers(clanTag);
	const members = membersResp?.items || [];
	const enriched = members.map(m => ({ tag: m.tag, name: m.name, th: m.townHallLevel||m.townhallLevel, trophies: m.trophies, weight: computePlayerWeight(m) }))
		.sort((a,b)=> b.weight - a.weight);
	let assignments; let algoUsed = algorithm;
	switch(algorithm){
		case 'mirror': assignments = mirrorAssignments(enriched, warSize); break;
		case 'optimal': assignments = optimalAssignments(enriched, warSize); break;
		case 'strength': default: assignments = strengthAssignments(enriched, warSize); algoUsed='strength';
	}
	const result = { clanTag, warSize, algorithm: algoUsed, generatedAt: new Date().toISOString(), assignments, poolSize: enriched.length };
	await cacheSet(ck, result, 30_000);
	return result;
}
