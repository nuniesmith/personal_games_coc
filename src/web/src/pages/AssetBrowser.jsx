import React, { useEffect, useState } from 'react'
import { cocAPI } from '../services/coc'
import { useNotifications } from '../contexts/NotificationContext.jsx'

export default function AssetBrowser(){
  const [manifest, setManifest] = useState(null)
  const [error, setError] = useState(null)
  const [filterCat, setFilterCat] = useState('')
  const [query, setQuery] = useState('')
  const [scale, setScale] = useState('1x')
  const [limit, setLimit] = useState(300)
  const [suggestInput, setSuggestInput] = useState('')
  const [suggestions, setSuggestions] = useState(null)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestError, setSuggestError] = useState(null)
  const [stats, setStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [importText, setImportText] = useState('')
  const [seedLoading, setSeedLoading] = useState(false)
  const [lastSeed, setLastSeed] = useState(null)
  // Undo/Redo state for icon mapping changes
  const [history, setHistory] = useState([]) // array of mapping snapshots
  const [historyIndex, setHistoryIndex] = useState(-1) // pointer into history
  const [historyBusy, setHistoryBusy] = useState(false)
  const [mappingCache, setMappingCache] = useState(null) // last fetched mapping
  const HISTORY_MAX = 50
  const STORAGE_KEY = 'iconMappingHistory'
  const { add } = (()=>{ try { return useNotifications(); } catch { return { add: ()=>{} }; } })()
  const [showHelp, setShowHelp] = useState(false)

  useEffect(()=>{ (async()=>{ try { const res = await cocAPI.getAssetManifest(); setManifest(res.data?.data||null) } catch(e){ setError(e.message) } })() }, [])
  // load initial mapping snapshot into history (or restore persisted)
  useEffect(()=>{ (async()=>{ try { const r = await cocAPI.getIconMapping(); const mapping = r.data?.data?.mappings || r.data?.data?.resolved || {}; const persisted = sessionStorage.getItem(STORAGE_KEY); if (persisted) { try { const parsed = JSON.parse(persisted); if (Array.isArray(parsed.history) && typeof parsed.index==='number') { setHistory(parsed.history); setHistoryIndex(parsed.index); } else { pushHistory(mapping); } } catch { pushHistory(mapping); } } else { pushHistory(mapping); } setMappingCache(mapping); } catch(_){} })() }, [])

  function pushHistory(snapshot){
    setHistory(prev => {
      const base = historyIndex >= 0 ? prev.slice(0, historyIndex+1) : prev
      let next = [...base, snapshot]
      if (next.length > HISTORY_MAX) {
        // Trim oldest while keeping index aligned at end
        next = next.slice(next.length - HISTORY_MAX)
      }
  setHistoryIndex(next.length-1)
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ history: next, index: next.length-1 })); } catch {}
      return next
    })
  }
  async function refreshMappingAndRecord(){
    try {
      const r = await cocAPI.getIconMapping()
      const mapping = r.data?.data?.mappings || r.data?.data?.resolved || {}
      setMappingCache(mapping)
      pushHistory(mapping)
    } catch(_){ }
  }
  async function undo(){
    if (historyIndex <= 0 || historyBusy) return
    setHistoryBusy(true)
    try {
      const target = history[historyIndex-1]
      // Replace mapping with target snapshot
      await cocAPI.deleteIconMapping()
      if (Object.keys(target).length){
        await cocAPI.mergeIconMapping(target)
      }
  setHistoryIndex(i=>i-1)
  setMappingCache(target)
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ history, index: historyIndex-1 })); } catch {}
    } finally { setHistoryBusy(false) }
  }
  async function redo(){
    if (historyIndex >= history.length-1 || historyBusy) return
    setHistoryBusy(true)
    try {
      const target = history[historyIndex+1]
      await cocAPI.deleteIconMapping()
      if (Object.keys(target).length){
        await cocAPI.mergeIconMapping(target)
      }
  setHistoryIndex(i=>i+1)
  setMappingCache(target)
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ history, index: historyIndex+1 })); } catch {}
    } finally { setHistoryBusy(false) }
  }

  // Keyboard shortcuts (Ctrl/Cmd+Z for undo, Ctrl/Cmd+Shift+Z or Ctrl+Y for redo)
  useEffect(()=>{
    function onKey(e){
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const meta = isMac ? e.metaKey : e.ctrlKey
      if (!meta) return
      if (e.key.toLowerCase()==='z' && !e.shiftKey) {
        e.preventDefault(); undo();
      } else if ((e.key.toLowerCase()==='z' && e.shiftKey) || e.key.toLowerCase()==='y') {
        e.preventDefault(); redo();
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [historyIndex, history, historyBusy])

  // global help overlay toggle
  useEffect(()=>{
    function onHelp(e){ if (e.key === '?' ) { setShowHelp(s=>!s); } }
    window.addEventListener('keydown', onHelp)
    return ()=> window.removeEventListener('keydown', onHelp)
  }, [])

  if (error) return <div className="p-4 text-red-400 text-sm">{error}</div>
  if (!manifest) return <div className="p-4 text-gray-400 text-sm">Loading manifest...</div>

  const cats = Object.keys(manifest.categories||{})
  const activeCats = cats.filter(c=> !filterCat || c===filterCat)

  const items = []
  activeCats.forEach(cat => {
    const info = manifest.categories[cat]
    ;(info.files||[]).forEach(file => {
      if (query && !file.toLowerCase().includes(query.toLowerCase())) return
      items.push({ cat, file, url: `/assets/game/${cat}/${scale}/${file}` })
    })
  })
  const sliced = items.slice(0, limit)

  return (
    <div className="space-y-6 p-2">
      <div>
        <h1 className="text-xl font-semibold">Asset Browser</h1>
        <p className="text-xs text-gray-400">Preview downloaded icon sprites (served locally). Total categories: {cats.length}</p>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-[10px] text-gray-500">Category</label>
          <select value={filterCat} onChange={e=>setFilterCat(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs">
            <option value="">All</option>
            {cats.map(c=> <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Query</label>
          <input value={query} onChange={e=>setQuery(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Scale</label>
          <select value={scale} onChange={e=>setScale(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs">
            {(manifest.scales||['1x','2x']).map(s=> <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Limit</label>
          <input type="number" value={limit} onChange={e=>setLimit(Number(e.target.value)||0)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs w-24" />
        </div>
        <div className="text-[10px] text-gray-500">Showing {sliced.length} / {items.length}</div>
        <div className="flex gap-2">
          <button disabled={statsLoading||seedLoading} onClick={async()=>{ setStatsLoading(true); try { const r = await cocAPI.getIconMappingStats(false); setStats(r.data?.data||null) } catch(e){} finally { setStatsLoading(false) } }} className="px-2 py-1 text-[10px] rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40">Stats</button>
          <button disabled={statsLoading||seedLoading} onClick={async()=>{ setStatsLoading(true); try { const r = await cocAPI.getIconMappingStats(true); setStats(r.data?.data||null) } catch(e){} finally { setStatsLoading(false) } }} className="px-2 py-1 text-[10px] rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-40">Stats+Unmapped</button>
          <button disabled={seedLoading} onClick={async()=>{ if(!confirm('Seed Town Hall icon mappings (service role required)?')) return; setSeedLoading(true); try { const r = await cocAPI.seedTownHallIconMappings(); setLastSeed(r.data?.data||null); await refreshMappingAndRecord(); const statsRes = await cocAPI.getIconMappingStats(false); setStats(statsRes.data?.data||null); add({ type:'success', title:'Town Hall seeding complete', message: (r.data?.data?.addedCount||0)+' added'}) } catch(e){ add({ type:'error', title:'Seed failed', message:e.message }) } finally { setSeedLoading(false) } }} className="px-2 py-1 text-[10px] rounded bg-indigo-700 hover:bg-indigo-600 disabled:opacity-40">Seed TH Icons</button>
          <button disabled={seedLoading} onClick={async()=>{ if(!confirm('Seed Hero, Pet, Equipment icon mappings?')) return; setSeedLoading(true); try { const r = await cocAPI.seedIconMappings(['heroes','pets','heroEquipment']); setLastSeed(r.data?.data||null); await refreshMappingAndRecord(); const statsRes = await cocAPI.getIconMappingStats(false); setStats(statsRes.data?.data||null); add({ type:'success', title:'Generic seeding complete', message:(r.data?.data?.added?.length||0)+' added'}) } catch(e){ add({ type:'error', title:'Seed failed', message:e.message }) } finally { setSeedLoading(false) } }} className="px-2 py-1 text-[10px] rounded bg-purple-700 hover:bg-purple-600 disabled:opacity-40">Seed Hero/Pet/Equip</button>
          {(seedLoading||statsLoading) && <span className="text-[10px] text-gray-400">{seedLoading? 'Seeding...' : 'Loading stats...'}</span>}
        </div>
      </div>
      {stats && (
        <div className="text-[10px] text-gray-300 bg-gray-900/50 border border-gray-800 rounded p-2 flex flex-col gap-1">
          <div>Mapping: {stats.mapped}/{stats.total} ({((stats.mapped||0)/(stats.total||1)*100).toFixed(1)}%)</div>
          {stats.unmappedCount>0 && <div>Unmapped: {stats.unmappedCount}</div>}
          {stats.unmapped && stats.unmapped.length>0 && (
            <details className="max-h-32 overflow-auto">
              <summary className="cursor-pointer">Unmapped List</summary>
              <div className="flex flex-wrap gap-1 mt-1">
                {stats.unmapped.map(u=> <span key={u} className="px-1 py-0.5 bg-gray-800 rounded border border-gray-700">{u}</span>)}
              </div>
            </details>
          )}
          {stats.updatedAt && <div className="text-gray-500">Updated: {new Date(stats.updatedAt).toLocaleTimeString()}</div>}
          {lastSeed && lastSeed.addedCount>0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-[10px] text-emerald-400">Last Seed Added ({lastSeed.addedCount})</summary>
              <div className="flex flex-wrap gap-1 mt-1 max-h-24 overflow-auto">
                {lastSeed.added.slice(0,200).map(a=> (
                  <span key={a.key} title={`${a.category} #${a.index}`} className="px-1 py-0.5 bg-emerald-800/40 border border-emerald-600/40 rounded text-[9px]">{a.key}</span>
                ))}
                {lastSeed.added.length>200 && <span className="text-[9px] text-gray-500">+{lastSeed.added.length-200} more…</span>}
              </div>
            </details>
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
        {sliced.map(it => (
          <div key={`${it.cat}-${it.file}`} className="border border-gray-700 rounded p-2 bg-gray-900/40 flex flex-col items-center gap-2 text-center text-[10px] hover:bg-gray-800/60">
            <div className="w-16 h-16 flex items-center justify-center bg-black/40 rounded">
              <img src={it.url} alt={it.file} className="max-w-full max-h-full object-contain" loading="lazy" />
            </div>
            <div className="truncate w-full" title={it.file}>{it.file}</div>
            <div className="text-[9px] text-gray-500">{it.cat}</div>
            <button onClick={()=>navigator.clipboard.writeText(it.url)} className="px-1 py-0.5 bg-gray-700 rounded hover:bg-gray-600">Copy URL</button>
          </div>
        ))}
        {sliced.length===0 && <div className="text-xs text-gray-500">No matches</div>}
      </div>
      {/* Suggest Mapping Panel */}
      <div className="mt-8 p-4 border border-gray-800 rounded bg-gray-900/40 space-y-3">
        <h2 className="text-sm font-semibold">Icon Mapping Suggestions</h2>
        <p className="text-[11px] text-gray-400">Enter comma-separated asset names (e.g. Cannon, ArcherTower, InfernoTower) to get candidate sprite matches by filename substring. Requires service role auth on backend.</p>
        <textarea value={suggestInput} onChange={e=>setSuggestInput(e.target.value)} placeholder="Cannon, ArcherTower, InfernoTower" className="w-full h-20 bg-gray-800 border border-gray-700 rounded p-2 text-xs font-mono" />
        <div className="flex flex-col gap-2 bg-gray-800/30 p-2 rounded border border-gray-700">
          <div className="text-[11px] text-gray-400">Import / Merge Mapping JSON</div>
          <textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder='{"Cannon":{"category":"defenses","index":0}}' className="w-full h-20 bg-gray-900 border border-gray-700 rounded p-2 text-[10px] font-mono" />
          <div className="flex gap-2 flex-wrap">
            <button disabled={!importText.trim()} onClick={async()=>{ try { const parsed = JSON.parse(importText); await cocAPI.mergeIconMapping(parsed); await refreshMappingAndRecord(); add({ type:'success', title:'Merged', message:Object.keys(parsed).length+' entries' }); setImportText(''); } catch(e){ add({ type:'error', title:'Merge failed', message:e.message }) } }} className="px-2 py-1 text-[10px] rounded bg-blue-600 disabled:opacity-40">Merge</button>
            <button onClick={async()=>{ try { const r = await cocAPI.getIconMapping(); const m = r.data?.data?.mappings || r.data?.data?.resolved; navigator.clipboard.writeText(JSON.stringify(m||{},null,2)); add({ type:'info', title:'Copied mapping JSON' }) } catch(e){ add({ type:'error', title:'Copy failed', message:e.message}) } }} className="px-2 py-1 text-[10px] rounded bg-gray-700">Copy Current</button>
            <button onClick={async()=>{ if(!confirm('Clear ALL icon mappings?')) return; try { await cocAPI.deleteIconMapping(); await refreshMappingAndRecord(); add({ type:'warning', title:'All mappings cleared' }) } catch(e){ add({ type:'error', title:'Clear failed', message:e.message }) } }} className="px-2 py-1 text-[10px] rounded bg-red-700">Clear All</button>
            <button onClick={async()=>{ try { const names = prompt('Enter comma-separated names to remove'); if(!names) return; const arr = names.split(',').map(s=>s.trim()).filter(Boolean); if(!arr.length) return; await cocAPI.deleteIconMapping(arr); await refreshMappingAndRecord(); add({ type:'warning', title:'Removed '+arr.length }) } catch(e){ add({ type:'error', title:'Delete failed', message:e.message }) } }} className="px-2 py-1 text-[10px] rounded bg-red-600/70">Delete Some</button>
            <div className="flex gap-1 ml-auto">
              <button disabled={historyBusy || historyIndex<=0} onClick={undo} className="px-2 py-1 text-[10px] rounded bg-gray-600 disabled:opacity-30">Undo</button>
              <button disabled={historyBusy || historyIndex>=history.length-1} onClick={redo} className="px-2 py-1 text-[10px] rounded bg-gray-600 disabled:opacity-30">Redo</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
      <button disabled={suggestLoading||!suggestInput.trim()} onClick={async()=>{
            setSuggestLoading(true); setSuggestError(null);
            try {
              const names = suggestInput.split(',').map(s=>s.trim()).filter(Boolean);
              const res = await cocAPI.suggestIconMapping(names, 6);
              setSuggestions(res.data?.data||{});
            } catch(e){ setSuggestError(e.message) } finally { setSuggestLoading(false) }
          }} className="px-2 py-1 text-xs rounded bg-indigo-600 disabled:opacity-40">Suggest</button>
      <button disabled={suggestLoading||!suggestInput.trim()} onClick={async()=>{
            setSuggestLoading(true); setSuggestError(null);
            try {
              const names = suggestInput.split(',').map(s=>s.trim()).filter(Boolean);
  const res = await cocAPI.autoApplyIconMapping(names, false);
              // show applied summary
              setSuggestions(null);
              setSuggestError(null);
    await refreshMappingAndRecord();
      add({ type:'success', title:'Auto-applied', message:`${res.data?.data?.appliedCount} applied, ${res.data?.data?.skipped.length} skipped` })
            } catch(e){ setSuggestError(e.message) } finally { setSuggestLoading(false) }
          }} className="px-2 py-1 text-xs rounded bg-emerald-600 disabled:opacity-40">Auto-Apply</button>
      <button disabled={suggestLoading||!suggestInput.trim()} onClick={async()=>{
            setSuggestLoading(true); setSuggestError(null);
            try {
              const names = suggestInput.split(',').map(s=>s.trim()).filter(Boolean);
  const res = await cocAPI.autoApplyIconMapping(names, true);
              setSuggestError(null);
              add({ type:'info', title:'Dry Run', message:`${res.data?.data?.appliedCount} would apply, ${res.data?.data?.skipped.length} skipped` })
            } catch(e){ setSuggestError(e.message) } finally { setSuggestLoading(false) }
          }} className="px-2 py-1 text-xs rounded bg-yellow-600 disabled:opacity-40">Dry Run</button>
          {suggestLoading && <span className="text-[11px] text-gray-400">Processing...</span>}
          {suggestError && <span className="text-[11px] text-red-400">{suggestError}</span>}
        </div>
        {suggestions && (
          <div className="space-y-3 max-h-96 overflow-auto pr-1">
            {Object.entries(suggestions).map(([name, list])=> (
              <div key={name} className="border border-gray-800 rounded p-2 bg-black/30">
                <div className="text-[11px] font-medium mb-1">{name}</div>
                <div className="flex flex-wrap gap-2">
                  {list.length===0 && <div className="text-[10px] text-gray-500">No matches</div>}
                  {list.map(m => (
                    <div key={`${name}-${m.category}-${m.index}`} className="flex flex-col items-center gap-1 p-2 bg-gray-800/60 rounded border border-gray-700 hover:border-indigo-500">
                      <img src={`/assets/game/${m.category}/1x/${m.file}`} alt="" className="w-10 h-10 object-contain" />
                      <div className="text-[9px] text-gray-300 truncate max-w-[72px]" title={m.file}>{m.file}</div>
                      <div className="text-[8px] text-gray-500">{m.category} #{m.index}</div>
                      <button onClick={()=>{
                        navigator.clipboard.writeText(JSON.stringify({ name, category: m.category, index: m.index }))
                      }} className="px-1 py-0.5 text-[9px] rounded bg-gray-700 hover:bg-gray-600">Copy Ref</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showHelp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={()=>setShowHelp(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded p-6 w-full max-w-sm space-y-4" onClick={e=>e.stopPropagation()}>
            <h3 className="text-sm font-semibold">Shortcuts</h3>
            <ul className="text-[11px] space-y-1 text-gray-300">
              <li><kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-600">Ctrl/Cmd + Z</kbd> Undo</li>
              <li><kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-600">Ctrl/Cmd + Shift + Z</kbd> / <kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-600">Ctrl/Cmd + Y</kbd> Redo</li>
              <li><kbd className="px-1 py-0.5 bg-gray-800 rounded border border-gray-600">?</kbd> Toggle help</li>
            </ul>
            <button onClick={()=>setShowHelp(false)} className="text-xs mt-2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
