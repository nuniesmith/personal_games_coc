import React, { useEffect, useState } from 'react'
import { cocAPI } from '../services/coc'

// Palette will be loaded dynamically from backend assets endpoint
const DEFAULT_PALETTE = [ 'TownHall','ClanCastle','Cannon','ArcherTower' ]
const GRID_SIZE = 44 // CoC home village effective buildable area (simplified square)
function createEmptyGrid(){
  return { size: GRID_SIZE, cells: [] } // cells: {x,y,type,id}
}
function serialize(grid){ return grid }
function toggleCell(grid, x, y, type){
  const key = `${x}:${y}`
  const idx = grid.cells.findIndex(c=>c.x===x && c.y===y)
  if (idx>=0) {
    // replace type if different else remove
    if (grid.cells[idx].type === type) grid.cells.splice(idx,1)
    else grid.cells[idx].type = type
  } else {
    grid.cells.push({ id: key, x, y, type })
  }
  return { ...grid, cells: [...grid.cells] }
}
function countByType(cells){
  const m = new Map();
  cells.forEach(c=>m.set(c.type,(m.get(c.type)||0)+1));
  return Array.from(m.entries()).sort((a,b)=>b[1]-a[1])
}

export default function BaseDesigner() {
  const [layouts, setLayouts] = useState([])
  const [name, setName] = useState('')
  const [townHall, setTownHall] = useState('')
  const [category, setCategory] = useState('general')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [activeLayoutId, setActiveLayoutId] = useState(null)
  const [grid, setGrid] = useState(createEmptyGrid())
  const [palette, setPalette] = useState(DEFAULT_PALETTE)
  const [selectedType, setSelectedType] = useState(DEFAULT_PALETTE[0])
  const [shareStatus, setShareStatus] = useState(null)
  const [versions, setVersions] = useState([])
  const [importText, setImportText] = useState('')
  const [filterText, setFilterText] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedCells, setSelectedCells] = useState(()=> new Set())
  const [buildingLimits, setBuildingLimits] = useState(null)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [assetQuery, setAssetQuery] = useState('')
  const [assetResults, setAssetResults] = useState([])
  const [assetEnv, setAssetEnv] = useState('homeVillage')
  const [assetTypeFilter, setAssetTypeFilter] = useState('')
  const [paletteMode, setPaletteMode] = useState('all') // all | search
  const [iconMap, setIconMap] = useState({})

  const load = async () => {
    try {
      const res = await cocAPI.listBaseLayouts()
      setLayouts(res.data || [])
    } catch (e) { setError(e.message) }
  }
  useEffect(()=>{ 
    load(); 
    (async()=>{ 
      try { 
        const assets = await cocAPI.getGameAssets(); 
        const b = assets.data?.data?.buildings?.map(x=>x.name) || []; 
        if (b.length){ setPalette(b); setSelectedType(b[0]); }
        if (assets.data?.data?.iconMapping?.available) {
          setIconMap(assets.data.data.iconMapping.resolved||{})
        } else {
          try { const im = await cocAPI.getIconMapping(); if (im.data?.data?.resolved){ setIconMap(im.data.data.resolved) } } catch(_){}
        }
      } catch(e){}
    })()
  }, [])

  // Asset search effect (debounced basic)
  useEffect(()=>{
    const id = setTimeout(async()=>{
      if (!assetQuery) { setAssetResults([]); if(paletteMode==='search') setPalette([]); return }
      try {
        const res = await cocAPI.searchGameAssets({ query: assetQuery, env: assetEnv, type: assetTypeFilter||undefined, limit: 100 })
        const names = Array.from(new Set(res.data?.data?.map(r=>r.name)))
        setAssetResults(names)
        if (paletteMode==='search') {
          setPalette(names)
          if (names.length && !names.includes(selectedType)) setSelectedType(names[0])
        }
      } catch(e){ /* ignore */ }
    }, 300)
    return ()=>clearTimeout(id)
  }, [assetQuery, assetEnv, assetTypeFilter, paletteMode, selectedType])

  const create = async () => {
    if (!name) return
    setSaving(true)
    try {
  const payload = { name, townHall: townHall || null, data: serialize(grid), category, notes }
      const res = await cocAPI.createBaseLayout(payload)
      setActiveLayoutId(res.data?.id || null)
      setName('')
      setTownHall('')
      await load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (id) => { await cocAPI.deleteBaseLayout(id); await load() }
  const saveExisting = async () => {
    if (!activeLayoutId) return
  // client-side validation
  const thCount = grid.cells.filter(c=>c.type==='TownHall').length
  if (grid.cells.length>0 && thCount!==1){ setError('Layout must contain exactly one TownHall'); return }
    setSaving(true)
    try {
      await cocAPI.updateBaseLayout(activeLayoutId, { data: serialize(grid) })
      await load()
    } catch (e){ setError(e.message) } finally { setSaving(false) }
  }
  const openLayout = async (id) => {
    setActiveLayoutId(id)
    setShareStatus(null)
    try {
      const res = await cocAPI.getBaseLayout(id)
      const d = res.data?.data
      if (d?.cells) setGrid({ size: d.size || GRID_SIZE, cells: d.cells.slice() })
      else setGrid(createEmptyGrid())
  try { const vs = await cocAPI.getBaseLayoutVersions(id); setVersions(vs.data||[]) } catch(e){}
      // fetch building limits based on layout's TH
      const th = res.data?.data?.townHall || res.data?.townHall || Number(townHall)
      if (th) {
        try { const lim = await cocAPI.getBuildingLimits(th); setBuildingLimits(lim.data?.data||null) } catch(e){ setBuildingLimits(null) }
      } else setBuildingLimits(null)
    } catch (e){ setError(e.message) }
  }
  const onCellClick = (x,y) => {
    if (selectionMode) {
      const key = `${x}:${y}`
      setSelectedCells(s => {
        const next = new Set(s)
        if (next.has(key)) next.delete(key); else next.add(key)
        return next
      })
      return
    }
    setGrid(g=>{
      const next = toggleCell({...g}, x, y, selectedType)
      setUndoStack(st=>[g, ...st].slice(0,200))
      setRedoStack([])
      return next
    })
  }
  const clearSelection = () => setSelectedCells(new Set())
  const deleteSelection = () => {
    if (!selectedCells.size) return
    setGrid(g=>{
      const before = {...g}
      const filtered = g.cells.filter(c=>!selectedCells.has(`${c.x}:${c.y}`))
      const next = { ...g, cells: filtered }
      setUndoStack(st=>[before, ...st].slice(0,200))
      setRedoStack([])
      return next
    })
    clearSelection()
  }
  const moveSelection = (dx,dy) => {
    if (!selectedCells.size) return
    setGrid(g=>{
      const before = {...g}
      // Build map for quick lookup
      const cellsByKey = new Map(g.cells.map(c=>[`${c.x}:${c.y}`, c]))
      const selCells = g.cells.filter(c=>selectedCells.has(`${c.x}:${c.y}`))
      // Bounds check
      for (const c of selCells) {
        const nx = c.x + dx; const ny = c.y + dy
        if (nx < 0 || ny < 0 || nx >= g.size || ny >= g.size) return g // abort move
      }
      // Perform move
      selCells.forEach(c => { c.x += dx; c.y += dy })
      // Deduplicate collisions
      const dedup = new Map()
      for (const c of g.cells) {
        const k = `${c.x}:${c.y}`
        if (!dedup.has(k)) dedup.set(k, c)
      }
      const newCells = Array.from(dedup.values())
      const next = { ...g, cells: newCells }
      // Update selection keys
      setSelectedCells(new Set(selCells.map(c=>`${c.x}:${c.y}`)))
      setUndoStack(st=>[before, ...st].slice(0,200))
      setRedoStack([])
      return next
    })
  }
  // Keyboard arrows for moving selection (if selectionMode active)
  useEffect(()=>{
    const handler = (e) => {
      if (!selectionMode || !selectedCells.size) return
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault()
        if (e.key==='ArrowUp') moveSelection(0,-1)
        if (e.key==='ArrowDown') moveSelection(0,1)
        if (e.key==='ArrowLeft') moveSelection(-1,0)
        if (e.key==='ArrowRight') moveSelection(1,0)
      }
      if (e.key==='Delete' || e.key==='Backspace') {
        deleteSelection()
      }
    }
    window.addEventListener('keydown', handler)
    return ()=>window.removeEventListener('keydown', handler)
  }, [selectionMode, selectedCells])
  const clearGrid = () => setGrid(createEmptyGrid())
  const share = async () => {
    if (!activeLayoutId) return;
  const thCount = grid.cells.filter(c=>c.type==='TownHall').length
  if (grid.cells.length>0 && thCount!==1){ setError('Add exactly one TownHall before sharing'); return }
    setShareStatus('sharing')
    try { await cocAPI.shareBaseLayout(activeLayoutId); setShareStatus('shared') } catch (e){ setShareStatus('error'); setError(e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Base Layout Designer (Preview)</h1>
        <p className="text-xs text-gray-400">Simple placeholder CRUD; future: grid editor & share to Discord.</p>
      </div>
      <div className="flex gap-2 items-end">
        <div>
          <label className="block text-xs text-gray-400">Name</label>
          <input className="px-2 py-1 rounded bg-gray-800 border border-gray-700" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Town Hall</label>
          <input className="px-2 py-1 rounded bg-gray-800 border border-gray-700 w-20" value={townHall} onChange={e=>setTownHall(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400">Category</label>
          <input className="px-2 py-1 rounded bg-gray-800 border border-gray-700 w-28" value={category} onChange={e=>setCategory(e.target.value)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-xs text-gray-400">Notes</label>
          <input className="px-2 py-1 rounded bg-gray-800 border border-gray-700 w-full" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>
        <button disabled={saving} onClick={create} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50">Create</button>
      </div>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-[10px] text-gray-500">Filter Text</label>
          <input value={filterText} onChange={e=>setFilterText(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500">Filter Category</label>
          <input value={filterCategory} onChange={e=>setFilterCategory(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs w-28" />
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {layouts.filter(l=>{
          const t = filterText.trim().toLowerCase();
          const c = filterCategory.trim().toLowerCase();
          const matchText = !t || l.name.toLowerCase().includes(t) || (l.notes||'').toLowerCase().includes(t);
          const matchCat = !c || (l.category||'').toLowerCase()===c;
          return matchText && matchCat;
        }).map(l => (
          <div key={l.id} className={`border border-gray-700 rounded p-3 bg-gray-800/40 flex flex-col gap-2 ${activeLayoutId===l.id?'ring-2 ring-blue-500':''}`}>
            <div className="flex items-center justify-between">
              <button onClick={()=>openLayout(l.id)} className="font-medium text-sm truncate text-left hover:text-blue-400">{l.name}</button>
              <button onClick={()=>remove(l.id)} className="text-[10px] px-2 py-1 bg-red-600/70 hover:bg-red-600 rounded text-white">Delete</button>
            </div>
            <div className="text-[11px] text-gray-400">TH: {l.townHall || 'n/a'} • Updated: {new Date(l.updatedAt).toLocaleTimeString()}</div>
            <div className="text-[10px] text-gray-500">ID: {l.id}</div>
            {l.category && <div className="text-[10px] text-blue-400">{l.category}</div>}
            {l.notes && <div className="text-[10px] text-gray-400 line-clamp-2">{l.notes}</div>}
            {l.sharedAt && <div className="text-[10px] text-green-500">Shared {new Date(l.sharedAt).toLocaleTimeString()}</div>}
          </div>
        ))}
        {layouts.length === 0 && <div className="text-xs text-gray-500">No layouts yet.</div>}
      </div>
      {/* Editor Panel */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h2 className="font-semibold text-sm">Editor</h2>
          <div className="flex items-center gap-1">
            <div className="relative">
              <select value={selectedType} onChange={e=>setSelectedType(e.target.value)} className="bg-gray-800 border border-gray-700 rounded pl-2 pr-8 py-1 text-xs appearance-none">
                {palette.map(p=> <option key={p} value={p}>{p}</option>)}
              </select>
              {iconMap[selectedType]?.url && (
                <img src={iconMap[selectedType].url} alt="" className="w-5 h-5 absolute right-1 top-1 object-contain pointer-events-none" />
              )}
            </div>
            <button onClick={()=>setPaletteMode(m=>m==='all'?'search':'all')} className={`px-2 py-1 text-xs rounded ${paletteMode==='search'?'bg-indigo-600':'bg-gray-700'}`}>{paletteMode==='search'?'Search':'All'}</button>
          </div>
          <button onClick={saveExisting} disabled={!activeLayoutId||saving} className="px-2 py-1 text-xs rounded bg-blue-600 disabled:opacity-40">Save</button>
          <button onClick={clearGrid} className="px-2 py-1 text-xs rounded bg-gray-700">Clear</button>
          <button onClick={share} disabled={!activeLayoutId||shareStatus==='sharing'} className="px-2 py-1 text-xs rounded bg-indigo-600 disabled:opacity-40">{shareStatus==='shared'?'Shared!':'Share to Discord'}</button>
          <button onClick={async()=>{ if(!activeLayoutId) return; const ex= await cocAPI.exportBaseLayout(activeLayoutId); navigator.clipboard.writeText(JSON.stringify(ex.data?.data||{},null,2))}} disabled={!activeLayoutId} className="px-2 py-1 text-xs rounded bg-teal-600 disabled:opacity-40">Copy Export</button>
          <button onClick={async()=>{ if(!activeLayoutId) return; await cocAPI.importBaseLayout({ sourceLayoutId: activeLayoutId, name: name? name+' Copy': undefined }); await load() }} disabled={!activeLayoutId} className="px-2 py-1 text-xs rounded bg-purple-600 disabled:opacity-40">Duplicate</button>
          <button onClick={()=>{ if(undoStack.length){ const [prev, ...rest]=undoStack; setRedoStack(r=>[grid,...r]); setUndoStack(rest); setGrid(prev);} }} disabled={!undoStack.length} className="px-2 py-1 text-xs rounded bg-gray-600 disabled:opacity-30">Undo</button>
          <button onClick={()=>{ if(redoStack.length){ const [next, ...rest]=redoStack; setUndoStack(u=>[grid,...u]); setRedoStack(rest); setGrid(next);} }} disabled={!redoStack.length} className="px-2 py-1 text-xs rounded bg-gray-600 disabled:opacity-30">Redo</button>
          <button onClick={()=>{ setSelectionMode(m=>!m); clearSelection() }} className={`px-2 py-1 text-xs rounded ${selectionMode?'bg-yellow-600':'bg-yellow-700/50'} `}>{selectionMode?'Selection On':'Selection Off'}</button>
          <button onClick={()=>moveSelection(0,-1)} disabled={!selectionMode||!selectedCells.size} className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-30">↑</button>
          <button onClick={()=>moveSelection(0,1)} disabled={!selectionMode||!selectedCells.size} className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-30">↓</button>
          <button onClick={()=>moveSelection(-1,0)} disabled={!selectionMode||!selectedCells.size} className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-30">←</button>
          <button onClick={()=>moveSelection(1,0)} disabled={!selectionMode||!selectedCells.size} className="px-2 py-1 text-xs rounded bg-gray-700 disabled:opacity-30">→</button>
          <button onClick={deleteSelection} disabled={!selectionMode||!selectedCells.size} className="px-2 py-1 text-xs rounded bg-red-700 disabled:opacity-30">Delete Sel</button>
          <button onClick={()=>setShowHeatmap(h=>!h)} className={`px-2 py-1 text-xs rounded ${showHeatmap?'bg-pink-600':'bg-pink-700/50'}`}>Heatmap</button>
          {shareStatus==='error' && <span className="text-xs text-red-400">Share failed</span>}
        </div>
        {/* Asset Search Panel */}
        <div className="flex flex-wrap gap-3 items-end bg-gray-900/40 p-3 rounded border border-gray-800">
          <div>
            <label className="block text-[10px] text-gray-500">Asset Query</label>
            <input value={assetQuery} onChange={e=>setAssetQuery(e.target.value)} placeholder="e.g. bow" className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs w-40" />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500">Environment</label>
            <select value={assetEnv} onChange={e=>setAssetEnv(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs">
              <option value="homeVillage">Home</option>
              <option value="builderBase">Builder</option>
              <option value="clanCapital">Capital</option>
            </select>
          </div>
            <div>
              <label className="block text-[10px] text-gray-500">Type</label>
              <select value={assetTypeFilter} onChange={e=>setAssetTypeFilter(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs">
                <option value="">Any</option>
                <option value="buildings">Buildings</option>
                <option value="troops">Troops</option>
                <option value="spells">Spells</option>
                <option value="heroes">Heroes</option>
                <option value="pets">Pets</option>
                <option value="equipment">Equipment</option>
              </select>
            </div>
            <div className="flex flex-col justify-end pb-1">
              <div className="text-[10px] text-gray-500">Matches: {assetResults.length}</div>
              {paletteMode==='search' && <div className="text-[10px] text-indigo-400">Palette uses search</div>}
            </div>
        </div>
        <div className="flex flex-col gap-2 max-w-xl">
          <textarea placeholder="Paste exported layout JSON here" className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono" value={importText} onChange={e=>setImportText(e.target.value)} />
          <div className="flex gap-2 flex-wrap">
            <button onClick={async()=>{ try{ const parsed = JSON.parse(importText); const res = await cocAPI.importBaseLayout({ name: parsed.name || 'Imported', townHall: parsed.townHall, data: parsed.data || parsed }); await load(); setImportText(''); openLayout(res.data?.data?.id) }catch(e){ setError('Import failed: '+e.message)} }} className="px-2 py-1 text-xs rounded bg-emerald-600">Import JSON</button>
            <button onClick={async()=>{ const all = await cocAPI.exportAllBaseLayouts(); navigator.clipboard.writeText(JSON.stringify(all.data?.data||[],null,2)) }} className="px-2 py-1 text-xs rounded bg-gray-700">Copy All JSON</button>
          </div>
        </div>
        {!activeLayoutId && <p className="text-[11px] text-gray-500">Select or create a layout to start editing.</p>}
        {activeLayoutId && (
          <div className="flex flex-col md:flex-row gap-6">
            {/* Palette with icons */}
            <div className="w-full md:w-56 lg:w-64 flex flex-col gap-2 order-2 md:order-none">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Palette ({palette.length})</span>
                <button onClick={()=>{
                  // refresh assets & mapping
                  (async()=>{
                    try { const assets = await cocAPI.getGameAssets(); if (assets.data?.data?.iconMapping?.available) setIconMap(assets.data.data.iconMapping.resolved||{}); } catch(_){}
                  })()
                }} className="text-[10px] px-1 py-0.5 bg-gray-700 rounded hover:bg-gray-600">↺</button>
              </div>
              <div className="grid grid-cols-5 gap-1 max-h-64 overflow-auto p-1 bg-gray-900/50 rounded border border-gray-800">
                {palette.map(p=>{
                  const icon = iconMap[p]?.url;
                  const active = p===selectedType;
                  return (
                    <button key={p} title={p} onClick={()=>setSelectedType(p)} className={`relative group border rounded flex items-center justify-center h-12 text-[9px] font-medium tracking-tight select-none ${active?'border-indigo-500 bg-indigo-500/20':'border-gray-700 bg-gray-800/40 hover:border-gray-500'}`}>
                      {icon ? (
                        <img src={icon} alt="" className="max-w-[85%] max-h-[85%] object-contain" />
                      ) : (
                        <span>{p.slice(0,3)}</span>
                      )}
                      {/* Hover Preview */}
                      {icon && <div className="hidden group-hover:flex absolute z-20 -top-1 -right-1 translate-x-full -translate-y-full bg-black/80 border border-gray-700 rounded p-1"><img src={icon} alt="" className="w-14 h-14 object-contain" /></div>}
                    </button>
                  )
                })}
                {palette.length===0 && <div className="col-span-5 text-[10px] text-gray-500 text-center py-4">No assets</div>}
              </div>
            </div>
            <div className="overflow-auto max-w-full border border-gray-700 rounded bg-black/40 p-2">
              <div style={{ width: GRID_SIZE*14, height: GRID_SIZE*14 }} className="relative select-none">
                {[...Array(GRID_SIZE)].map((_,y)=>{
                  return (
                  <div key={y} className="flex">
                    {[...Array(GRID_SIZE)].map((__,x)=>{
                      const cell = grid.cells.find(c=>c.x===x&&c.y===y);
                      const icon = cell && iconMap[cell.type]?.url;
                      return (
                        <div key={x}
                          onClick={()=>onCellClick(x,y)}
                          title={`${x},${y}`}
                          className="w-3.5 h-3.5 border border-gray-800 hover:border-blue-500/70 cursor-pointer relative"
                          style={{
                            backgroundColor: cell?'rgba(59,130,246,0.35)':'transparent',
                            outline: selectedCells.has(`${x}:${y}`)?'1px solid #facc15':'none',
                            boxShadow: showHeatmap && cell ? '0 0 4px 1px rgba(255,0,128,0.6)' : 'none'
                          }}
                        >
                          {cell && (
                            icon ? (
                              <img src={icon} alt="" className="absolute inset-0 w-full h-full object-contain mix-blend-screen" />
                            ) : (
                              <span className="absolute inset-0 text-[6px] flex items-center justify-center text-white/80">
                                {cell.type.slice(0,2)}
                              </span>
                            )
                          )}
                        </div>
                      )
                    })}
                  </div>
                )})}
              </div>
            </div>
            <div className="text-xs space-y-2 min-w-[160px]">
              <h3 className="font-medium">Stats</h3>
              <div>Total Cells: {grid.cells.length}</div>
              <div>Type: {selectedType}</div>
              <div className="space-y-1 max-h-56 overflow-auto pr-1">
                {countByType(grid.cells).map(([t,n])=> <div key={t} className="flex justify-between"><span>{t}</span><span className="text-gray-400">{n}</span></div>)}
                {grid.cells.length===0 && <div className="text-gray-500">No placements</div>}
              </div>
              <div className="pt-2">
                <button onClick={()=>navigator.clipboard.writeText(JSON.stringify(serialize(grid)))} className="px-2 py-1 bg-gray-700 rounded">Copy JSON</button>
              </div>
              <div className="pt-4 space-y-1">
                <h4 className="font-medium">Versions</h4>
                <div className="max-h-40 overflow-auto space-y-1 pr-1">
                  {versions.length===0 && <div className="text-gray-500">None yet</div>}
                  {versions.map((v,i)=>(
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="truncate">{new Date(v.at).toLocaleTimeString()}</span>
                      <div className="flex gap-1">
                        <button onClick={()=>{ setGrid(g=>{ setUndoStack(st=>[g,...st]); return { size: g.size, cells: (v.data?.cells||[]) }; }); }} className="text-[10px] px-1 py-0.5 bg-gray-700 rounded hover:bg-gray-600">Load</button>
                        <button onClick={async()=>{ if(!activeLayoutId) return; await cocAPI.revertBaseLayout(activeLayoutId, i); await openLayout(activeLayoutId) }} className="text-[10px] px-1 py-0.5 bg-gray-700 rounded hover:bg-gray-600">Revert</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {buildingLimits && (
                <div className="pt-4 space-y-1">
                  <h4 className="font-medium">Limits (TH)</h4>
                  <div className="max-h-48 overflow-auto pr-1 space-y-0.5">
                    {Object.entries(buildingLimits).map(([t,limit])=>{
                      const count = grid.cells.filter(c=>c.type===t).length
                      const over = count>limit
                      return (
                        <div key={t} className={`flex justify-between ${over?'text-red-400':'text-gray-300'} text-[11px]`}>
                          <span>{t}</span>
                          <span>{count}/{limit}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
