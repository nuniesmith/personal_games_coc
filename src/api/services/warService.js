import { cocApi } from '../utils/cocApi.js';
import { cacheGet, cacheSet } from '../utils/cache.js';
import { cacheKeys } from '../utils/cacheKeys.js';

async function safeGetPlayer(tag) { try { return await cocApi.getPlayer(tag); } catch { return null; } }

function aggregateHeroes(players) {
  const heroLevels = {};
  players.forEach(p => (p?.heroes||[]).forEach(h => {
    if (!heroLevels[h.name]) heroLevels[h.name] = { total:0,count:0,max:0 };
    heroLevels[h.name].total += h.level||0; heroLevels[h.name].count +=1; heroLevels[h.name].max = Math.max(heroLevels[h.name].max, h.maxLevel||h.level||0);
  }));
  return Object.entries(heroLevels).map(([name,v])=>({ name, avg: +(v.total / v.count).toFixed(2), maxObserved: v.max })).sort((a,b)=>a.name.localeCompare(b.name));
}

export async function getPrepStats(clanTag, { includeHeroes=false, heroSampleSize=30 } = {}) {
  const ck = cacheKeys.warPrep({ clanTag, mode: includeHeroes ? 'heroes':'basic' });
  const cached = await cacheGet(ck); if (cached) return { ...cached, cached:true };
  const [clan, membersResp, war] = await Promise.all([
    cocApi.getClan(clanTag),
    cocApi.getClanMembers(clanTag),
    cocApi.getCurrentWar(clanTag).catch(()=> null)
  ]);
  const members = membersResp?.items||[];
  const thCounts = {}; let totalTrophies = 0;
  members.forEach(m=>{ const th = m.townHallLevel||m.townhallLevel; if (th) thCounts[th]=(thCounts[th]||0)+1; totalTrophies += m.trophies||0; });
  const thDistribution = Object.entries(thCounts).sort((a,b)=>Number(b[0])-Number(a[0])).map(([th,count])=>({ townHall:Number(th), count }));
  const avgTrophies = members.length? Math.round(totalTrophies/members.length):0;
  let heroStats=null; let sampled=0;
  if (includeHeroes) {
    const sorted = members.slice().sort((a,b)=>(b.townHallLevel||0)-(a.townHallLevel||0));
    const targets = sorted.slice(0, Math.min(heroSampleSize,50));
    const details=[];
    for (const m of targets) { const p = await safeGetPlayer(m.tag); if (p) details.push(p); sampled++; }
    heroStats = aggregateHeroes(details);
  }
  const warPhase = war?.state||'notInWar';
  const data = { clan:{ tag:clan.tag, name:clan.name, level:clan.clanLevel }, roster:{ members:members.length, thDistribution, avgTrophies, topMembers: members.slice().sort((a,b)=>(b.townHallLevel||0)-(a.townHallLevel||0)||(b.trophies||0)-(a.trophies||0)).slice(0,15).map(m=>({ tag:m.tag,name:m.name,th:m.townHallLevel||m.townhallLevel,trophies:m.trophies })) }, heroes: heroStats, heroSampled: includeHeroes? sampled:0, war: warPhase==='notInWar'? null : { state: warPhase, teamSize: war?.teamSize, attacksPerMember: war?.attacksPerMember }, generatedAt: new Date().toISOString() };
  let ttl = 120_000; if (warPhase==='preparation') ttl=30_000; else if (warPhase==='inWar') ttl=20_000; if (includeHeroes) ttl=Math.max(ttl,60_000);
  await cacheSet(ck, data, ttl); return data;
}
