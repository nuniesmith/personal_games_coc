import React, { useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { useClan } from '../contexts/ClanContext'
import { useSocket } from '../contexts/SocketContext'
import { cocAPI } from '../services/coc'

export default function ClanDashboard() {
  const { clanTag, setClanTag, summary, isLoading, isFetching, error, refetch } = useClan()
  const { war: liveWar } = useSocket()
  const [activeTab, setActiveTab] = React.useState('overview') // overview | prep | assignments
  const [prep, setPrep] = React.useState(null)
  const [loadingPrep, setLoadingPrep] = React.useState(false)
  const [prepIncludeHeroes, setPrepIncludeHeroes] = React.useState(false)
  const [heroSampleSize, setHeroSampleSize] = React.useState(30)
  const [assignSim, setAssignSim] = React.useState(null)
  const [assignAlgo, setAssignAlgo] = React.useState('strength')
  const [assignSize, setAssignSize] = React.useState(15)
  const [assignLoading, setAssignLoading] = React.useState(false)
  const [darkMode, setDarkMode] = React.useState(()=> (localStorage.getItem('ui_dark_mode')==='1'))
  useEffect(()=>{ localStorage.setItem('ui_dark_mode', darkMode?'1':'0'); const root = document.documentElement; if(darkMode) root.classList.add('dark'); else root.classList.remove('dark'); },[darkMode])
  // While in war, auto refetch more aggressively (every 10s) on top of base query interval
  useEffect(() => {
    if (!summary?.war || summary.war.state !== 'inWar') return;
    const id = setInterval(() => refetch(), 10000);
    return () => clearInterval(id);
  }, [summary?.war?.state, refetch]);
  // Countdown timer state derived from summary.war.time.secondsRemaining
  const [countdown, setCountdown] = React.useState(null)
  useEffect(()=>{
    if (!summary?.war?.time?.secondsRemaining) return;
    setCountdown(summary.war.time.secondsRemaining)
    const int = setInterval(()=>{
      setCountdown(prev => (prev==null||prev<=0)?0:prev-1)
    },1000)
    return ()=>clearInterval(int)
  }, [summary?.war?.time?.secondsRemaining])

  // Mini status bar: asset version + current rate limit
  const [assetVersion, setAssetVersion] = React.useState(null)
  useEffect(()=>{ (async()=>{ try { const r = await cocAPI.getAssetVersion(); setAssetVersion(r.data?.version||null) } catch(_){} })() },[])

  // Live event listeners (socket dispatched via window events from SocketContext)
  useEffect(()=>{
    const onPrepPush = (e) => {
      const { clanTag: pushedTag, data } = e.detail || {}
      if (!pushedTag || !clanTag || pushedTag.toUpperCase() !== clanTag.toUpperCase()) return
      // Only update if user is on prep tab or has previously loaded prep
      setPrep(prev => data || prev)
    }
    const onAssignmentsPush = (e) => {
      const { clanTag: pushedTag, payload } = e.detail || {}
      if (!pushedTag || !clanTag || pushedTag.toUpperCase() !== clanTag.toUpperCase()) return
      // Auto-update simulator only if same algorithm & size match current form (best-effort)
      if (payload?.algorithm && payload?.assignments) {
        setAssignSim(prev => {
          if (!prev) return payload
          // if user changed settings locally, avoid clobbering
          if (prev.algorithm !== payload.algorithm) return prev
          return payload
        })
      }
    }
    window.addEventListener('prepStats:push', onPrepPush)
    window.addEventListener('assignments:generated', onAssignmentsPush)
    return () => {
      window.removeEventListener('prepStats:push', onPrepPush)
      window.removeEventListener('assignments:generated', onAssignmentsPush)
    }
  }, [clanTag])

  // Derived war stats for remaining attacks summary
  const warData = liveWar || summary?.war;
  let remainingAttacksSummary = null;
  if (warData?.state === 'inWar' && warData?.attacksPerMember && warData?.teamSize && warData?.clan && warData?.opponent) {
    const totalSlots = warData.teamSize * warData.attacksPerMember * 2; // both clans
    const usedClan = warData.clan.attacksUsed ?? (warData.attacks?.filter(a=>a.attackerTag?.startsWith(warData.clan.tag))?.length||0);
    const usedOpp = warData.opponent.attacksUsed ?? (warData.attacks?.filter(a=>a.attackerTag?.startsWith(warData.opponent.tag))?.length||0);
    const usedTotal = usedClan + usedOpp;
    const remaining = totalSlots - usedTotal;
    remainingAttacksSummary = { totalSlots, usedClan, usedOpp, remaining };
  }

  // Timeline placeholder (sorted attacks by order/time if available)
  const attackTimeline = React.useMemo(()=>{
    if (!warData?.attacks || !Array.isArray(warData.attacks)) return [];
    const withTime = warData.attacks.filter(a=>a.attackTime && !isNaN(new Date(a.attackTime)));
    const sorted = withTime.length === warData.attacks.length
      ? warData.attacks.slice().sort((a,b)=> new Date(a.attackTime) - new Date(b.attackTime))
      : warData.attacks.slice().sort((a,b)=> (a.order||0)-(b.order||0));
    return sorted.slice(0,50);
  }, [warData?.attacks])

  return (
    <div className="p-4 space-y-4">
      <div className="sticky top-0 z-10 -mx-4 px-4 py-2 bg-gray-900/80 backdrop-blur flex items-center gap-4 text-[11px] text-gray-300 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Assets:</span>
          <span className="font-mono">{assetVersion? assetVersion.slice(0,10):'...'}</span>
        </div>
        {summary?.rateLimit && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500">API:</span>
            <span>{summary.rateLimit.remaining ?? 0}/{summary.rateLimit.limit ?? 0}</span>
          </div>
        )}
        {remainingAttacksSummary && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500">War Attacks Left:</span>
            <span>{remainingAttacksSummary.remaining} / {remainingAttacksSummary.totalSlots}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-3 py-2 w-64"
          placeholder="#9UQ9G99P"
          value={clanTag}
          onChange={(e) => setClanTag(e.target.value.trim())}
        />
        <button
          className="bg-blue-600 text-white px-3 py-2 rounded"
          onClick={() => refetch()}
        >Load</button>
        <div className="ml-4 flex gap-1 text-xs">
          {['overview','prep','assignments'].map(t=> (
            <button key={t} onClick={()=>setActiveTab(t)} className={`px-3 py-1 rounded border ${activeTab===t? 'bg-indigo-600 border-indigo-500 text-white':'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>{t}</button>
          ))}
        </div>
  <button onClick={()=>setDarkMode(d=>!d)} className="ml-auto px-3 py-1 rounded text-xs border bg-gray-800 border-gray-700 hover:bg-gray-700">{darkMode? 'Light':'Dark'}</button>
      </div>

      {!clanTag && <p className="text-sm text-gray-500">Enter your clan tag to begin, e.g. #ABC123</p>}
      {error && <p className="text-sm text-red-500">{error.message}</p>}
      {isFetching && <p>Loading clan…</p>}
      {summary?.clan && (
        <div className="border rounded p-4 bg-gray-800/40 backdrop-blur">
          <div className="flex items-center gap-4">
            {summary.clan.badgeUrls?.small && (
              <img src={summary.clan.badgeUrls.small} alt="badge" className="w-16 h-16 rounded" />
            )}
            <div className="flex-1">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                {summary.clan.name} <span className="text-sm text-gray-400">{summary.clan.tag}</span>
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300 mt-1">
                <span>Level {summary.clan.clanLevel}</span>
                <span>{summary.clan.members} members</span>
                <span>Points {summary.clan.clanPoints}</span>
                <span>Capital {summary.clan.clanCapitalPoints}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs">
                {summary.leagues?.warLeague && <span className="px-2 py-1 rounded bg-indigo-600/30 border border-indigo-500/30">War League: {summary.leagues.warLeague.name}</span>}
                {summary.leagues?.capitalLeague && <span className="px-2 py-1 rounded bg-amber-600/30 border border-amber-500/30">Capital League: {summary.leagues.capitalLeague.name}</span>}
                {summary.rateLimit && (
                  <span className="px-2 py-1 rounded bg-gray-700/50 border border-gray-600">API {summary.rateLimit.remaining ?? 0}/{summary.rateLimit.limit ?? 0}</span>
                )}
              </div>
              {summary.members?.top && (
                <p className="text-xs text-gray-500 mt-2">Top trophies: {summary.members.top.slice(0,3).map(m=>`${m.name}(${m.trophies})`).join(', ')}</p>
              )}
            </div>
            {summary.war?.state && (
              <div className="text-right text-sm">
                <div className={`font-semibold ${summary.war.state==='inWar'?'text-red-400':'text-gray-300'}`}>{summary.war.state}</div>
                {summary.war.state==='inWar' && (
                  <div className="text-xs text-gray-400 mt-1">
                    {summary.war.clan?.stars}⭐ vs {summary.war.opponent?.stars}⭐
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab==='overview' && (
      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Members</h3>
          {isFetching && <p>Loading members…</p>}
          <ul className="divide-y divide-gray-800">
            {summary?.members?.top?.slice().sort((a,b)=>(b.trophies||0)-(a.trophies||0)).map(m => {
              const th = m.townHallLevel || 0;
              const thColor = th >= 16 ? 'bg-amber-600/70 border-amber-400/50' : th >= 14 ? 'bg-emerald-600/60 border-emerald-400/40' : 'bg-gray-600/50 border-gray-400/30';
              // Attempt to use an icon mapping if available; fallback to badge box
              const iconUrl = summary?.iconMapping?.resolved?.[`TownHall${th}`]?.url || summary?.iconMapping?.resolved?.['TownHall']?.url;
              const role = m.role;
              const roleClass = role === 'Leader' ? 'bg-red-600/40 border-red-400/40' : role === 'Co-Leader' ? 'bg-indigo-600/40 border-indigo-400/40' : role === 'Elder' ? 'bg-teal-600/40 border-teal-400/40' : 'bg-gray-700/50 border-gray-600';
              return (
                <li key={m.tag} className="py-2 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {iconUrl ? (
                      <div className="w-10 h-10 flex items-center justify-center rounded border bg-gray-900/40 border-gray-600 overflow-hidden">
                        <img src={iconUrl} alt={`TH${th}`} className="object-contain w-9 h-9" loading="lazy" />
                      </div>
                    ) : (
                      <div className={`w-10 h-10 flex flex-col items-center justify-center text-[10px] rounded border ${thColor} font-semibold text-white leading-tight shadow`}>TH<span className="text-xs">{th}</span></div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.name} <span className="text-xs text-gray-500">{m.tag}</span></div>
                      <div className="text-[11px] text-gray-400">🏆 {m.trophies}</div>
                    </div>
                  </div>
                  <div className={`text-xs text-gray-200 px-2 py-1 rounded border whitespace-nowrap ${roleClass}`}>{role}</div>
                </li>
              );
            })}
          </ul>
        </div>

  <div className="border rounded p-4">
          <h3 className="font-semibold mb-2">Current War</h3>
          {isFetching && <p>Loading war…</p>}
          { (summary?.war || liveWar) ? (
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <span>State: {(liveWar?.state)||summary.war.state}</span>
                {countdown!=null && (summary.war.state==='inWar') && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-700/60 border border-gray-600">
                    Ends in {Math.floor(countdown/3600)}h {Math.floor((countdown%3600)/60)}m {countdown%60}s
                  </span>
                )}
              </div>
              <div>Team Size: {(liveWar?.teamSize)||summary.war.teamSize}</div>
              <div>Attacks/Member: {(liveWar?.attacksPerMember)||summary.war.attacksPerMember}</div>
              <div className="mt-2">
                <div className="font-medium">{(liveWar?.clan?.name)||summary.war.clan?.name} vs {(liveWar?.opponent?.name)||summary.war.opponent?.name}</div>
                <div className="text-xs text-gray-400 mt-1">Stars: {(liveWar?.clan?.stars)??summary.war.clan?.stars} - {(liveWar?.opponent?.stars)??summary.war.opponent?.stars}</div>
                <div className="text-xs text-gray-400">Destruction: {Math.round(((liveWar?.clan?.destruction)??summary.war.clan?.destruction) || 0)}% - {Math.round(((liveWar?.opponent?.destruction)??summary.war.opponent?.destruction) || 0)}%</div>
              </div>
              {summary.war.attacks?.members && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-gray-300 tracking-wide mb-1">Attack Usage</h4>
                  <div className="max-h-52 overflow-auto border border-gray-700 rounded">
                    <table className="w-full text-[11px]">
                      <thead className="bg-gray-700/50 text-gray-300 sticky top-0">
                        <tr>
                          <th className="text-left px-2 py-1">Member</th>
                          <th className="text-left px-2 py-1">TH</th>
                          <th className="text-left px-2 py-1">Used</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.war.attacks.members
                          .slice()
                          .sort((a,b)=>(a.attacksUsed-b.attacksUsed))
                          .map(m => {
                            const pct = (m.attacksUsed/(m.attacksAvailable||2))*100
                            const statusColor = m.attacksUsed===0 ? 'border-red-500/60 bg-red-600/30' : pct>=100 ? 'border-green-500/60 bg-green-600/30' : 'border-blue-500/60 bg-blue-600/30'
                            return (
                              <tr key={m.tag} className="odd:bg-gray-800/40">
                                <td className="px-2 py-1 truncate max-w-[120px]">{m.name}</td>
                                <td className="px-2 py-1">{m.townHallLevel}</td>
                                <td className="px-2 py-1">
                                  <div className={`w-full h-2 rounded overflow-hidden border ${statusColor}`}>
                                    <div className={`h-2 ${pct>=100?'bg-green-400':'bg-blue-400'}`} style={{width:`${pct}%`}} />
                                  </div>
                                  <span className="ml-1">{m.attacksUsed}/{m.attacksAvailable}</span>
                                </td>
                              </tr>
                            )})}
                      </tbody>
                    </table>
                  </div>
                  {remainingAttacksSummary && (
                    <div className="mt-2 text-[11px] text-gray-400 flex flex-wrap gap-4">
                      <span>Total Slots: {remainingAttacksSummary.totalSlots}</span>
                      <span>Used (Clan): {remainingAttacksSummary.usedClan}</span>
                      <span>Used (Opp): {remainingAttacksSummary.usedOpp}</span>
                      <span>Remaining: {remainingAttacksSummary.remaining}</span>
                    </div>
                  )}
                </div>
              )}
              {attackTimeline.length>0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-gray-300 tracking-wide mb-1">Recent Attacks (Timeline)</h4>
                  <ul className="max-h-40 overflow-auto space-y-1 text-[11px] pr-1">
                    {attackTimeline.map(a=> (
                      <li key={a.id || a.attackerTag + a.defenderTag + a.order} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1">
                        <span className="truncate max-w-[120px]">{a.attackerName || a.attackerTag}</span>
                        <span className="text-gray-500">→</span>
                        <span className="truncate max-w-[120px] text-right">{a.defenderName || a.defenderTag}</span>
                        <span className="ml-2 text-yellow-400">{a.stars}⭐</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.war.state === 'inWar' && (
                <div className="pt-2">
                  <button
                    onClick={async () => {
                      try { await cocAPI.pushWarUpdate(clanTag); } catch (_) {/* ignore */}
                    }}
                    className="text-xs px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white"
                  >Push Discord Update</button>
                </div>
              )}
            </div>
          ) : (
            <p>No current war information.</p>
          )}

          {/* Assignment generation removed pending future design */}
        </div>
      </div>
      )}

      {activeTab==='prep' && (
        <div className="border rounded p-4 space-y-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] text-gray-400">Include Heroes</label>
              <input type="checkbox" checked={prepIncludeHeroes} onChange={e=>setPrepIncludeHeroes(e.target.checked)} />
            </div>
            {prepIncludeHeroes && (
              <div>
                <label className="block text-[10px] text-gray-400">Hero Sample Size</label>
                <input type="number" min={1} max={50} value={heroSampleSize} onChange={e=>setHeroSampleSize(e.target.value)} className="w-20 px-2 py-1 text-xs rounded bg-gray-800 border border-gray-700" />
              </div>
            )}
            <button onClick={async()=>{ if(!clanTag) return; setLoadingPrep(true); try { const r = await cocAPI.getWarPrepStats(clanTag, { includeHeroes: prepIncludeHeroes, heroSampleSize }); setPrep(r.data?.data||null); } catch(_){} finally { setLoadingPrep(false); } }} className="px-3 py-2 rounded bg-indigo-600 text-white text-xs disabled:opacity-40" disabled={loadingPrep || !clanTag}>{loadingPrep? 'Loading...':'Load Prep Stats'}</button>
          </div>
          {!prep && !loadingPrep && <p className="text-xs text-gray-500">Load prep stats to see Town Hall distribution & hero averages.</p>}
          {prep && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Town Hall Distribution</h4>
                <div className="h-64 bg-gray-900/40 border border-gray-800 rounded p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={prep.roster?.thDistribution?.slice().sort((a,b)=>a.townHall-b.townHall)}>
                      <XAxis dataKey="townHall" stroke="#ccc" fontSize={10} />
                      <YAxis stroke="#ccc" fontSize={10} allowDecimals={false} />
                      <Tooltip contentStyle={{ background:'#111', border:'1px solid #333', fontSize:12 }} />
                      <Bar dataKey="count" fill="#6366f1">
                        {prep.roster?.thDistribution?.map((d,i)=> <Cell key={i} fill={d.townHall>=16? '#d97706': d.townHall>=14? '#059669':'#64748b'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Hero Averages {prepIncludeHeroes && prep.heroSampled ? <span className="text-[10px] text-gray-400">(sampled {prep.heroSampled})</span>: null}</h4>
                {prep.heroes? (
                  <div className="h-64 bg-gray-900/40 border border-gray-800 rounded p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prep.heroes} layout="vertical" margin={{ left: 40 }}>
                        <XAxis type="number" stroke="#ccc" fontSize={10} />
                        <YAxis type="category" dataKey="name" stroke="#ccc" fontSize={10} width={70} />
                        <Tooltip contentStyle={{ background:'#111', border:'1px solid #333', fontSize:12 }} />
                        <Bar dataKey="avg" fill="#10b981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ): <p className="text-xs text-gray-500">Hero stats not included.</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <h4 className="font-semibold text-sm">Top Members (Weight Approx)</h4>
                <div className="overflow-auto max-h-48 border border-gray-800 rounded">
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-800/60">
                      <tr>
                        <th className="text-left px-2 py-1">Name</th>
                        <th className="text-left px-2 py-1">TH</th>
                        <th className="text-left px-2 py-1">Trophies</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prep.roster?.topMembers?.map(m=> (
                        <tr key={m.tag} className="odd:bg-gray-800/30">
                          <td className="px-2 py-1 truncate max-w-[140px]">{m.name}</td>
                          <td className="px-2 py-1">{m.th}</td>
                          <td className="px-2 py-1">{m.trophies}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab==='assignments' && (
        <div className="border rounded p-4 space-y-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] text-gray-400">War Size</label>
              <input type="number" min={5} max={50} value={assignSize} onChange={e=>setAssignSize(e.target.value)} className="w-24 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-400">Algorithm</label>
              <select value={assignAlgo} onChange={e=>setAssignAlgo(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs">
                <option value="strength">Strength</option>
                <option value="mirror">Mirror</option>
                <option value="optimal">Optimal</option>
              </select>
            </div>
            <button disabled={!clanTag||assignLoading} onClick={async()=>{ if(!clanTag) return; setAssignLoading(true); try { const res = await cocAPI.generateAssignments({ clanTag, warSize: Number(assignSize), algorithm: assignAlgo }); setAssignSim(res.data?.data||null); } catch(_){} finally { setAssignLoading(false);} }} className="px-3 py-2 rounded bg-indigo-600 text-white text-xs disabled:opacity-40">{assignLoading? 'Generating...':'Generate'}</button>
          </div>
          {!assignSim && <p className="text-xs text-gray-500">Generate assignments to preview slot order.</p>}
          {assignSim && (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Assignments ({assignSim.assignments?.length})</h4>
                <div className="max-h-64 overflow-auto border border-gray-800 rounded">
                  <table className="w-full text-[11px]">
                    <thead className="bg-gray-800/60">
                      <tr>
                        <th className="text-left px-2 py-1">Slot</th>
                        <th className="text-left px-2 py-1">Name</th>
                        <th className="text-left px-2 py-1">TH</th>
                        <th className="text-left px-2 py-1">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(assignSim.assignments||[]).map(a=> (
                        <tr key={a.slot} className="odd:bg-gray-800/30">
                          <td className="px-2 py-1">{a.slot}</td>
                          <td className="px-2 py-1 truncate max-w-[120px]">{a.name}</td>
                          <td className="px-2 py-1">{a.th}</td>
                          <td className="px-2 py-1">{a.weight}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">TH Distribution (Assignments)</h4>
                <div className="h-64 bg-gray-900/40 border border-gray-800 rounded p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={Object.values((assignSim.assignments||[]).reduce((acc,a)=>{ acc[a.th]=acc[a.th]||{ name:'TH'+a.th, value:0 }; acc[a.th].value++; return acc; },{}))} dataKey="value" nameKey="name" label outerRadius={90}>
                        { (assignSim.assignments||[]).map((a,i)=> <Cell key={i} fill={a.th>=16? '#d97706': a.th>=14? '#059669':'#6366f1'} />)}
                      </Pie>
                      <Legend formatter={(v)=> v} />
                      <Tooltip contentStyle={{ background:'#111', border:'1px solid #333', fontSize:12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {/* Placeholder for future: Base Layout Designer / Discord integration controls */}
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        <div className="border rounded p-4 bg-gray-800/30">
          <h3 className="font-semibold mb-2">Base Layout Designer (Coming Soon)</h3>
          <p className="text-xs text-gray-400">Plan to add drag-and-drop TH layout sketches and share via Discord.</p>
        </div>
        <div className="border rounded p-4 bg-gray-800/30">
          <h3 className="font-semibold mb-2">Discord Integration</h3>
          <p className="text-xs text-gray-400">Current: command bridge active. Future: push live war updates & layout reviews.</p>
        </div>
      </div>
    </div>
  )
}
