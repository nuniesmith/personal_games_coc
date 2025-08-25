import React, { useEffect, useState } from 'react'
import { cocAPI } from '../services/coc'

export default function StrategyGuides(){
  const [guides, setGuides] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [active, setActive] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formTags, setFormTags] = useState('')
  const [formContent, setFormContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [shareStatus, setShareStatus] = useState(null)

  const load = async () => {
    try {
      const res = await cocAPI.listStrategyGuides();
      setGuides(res.data?.data||[])
    } catch (e){ setError(e.message) }
  }
  useEffect(()=>{ load() }, [])

  useEffect(()=>{ if(!activeId) { setActive(null); return; } (async()=>{ setLoading(true); try { const res = await cocAPI.getStrategyGuide(activeId); setActive(res.data?.data||null); if (res.data?.data){ setFormTitle(res.data.data.title); setFormTags((res.data.data.tags||[]).join(',')); setFormContent(res.data.data.content||''); } } catch(e){ setError(e.message) } finally { setLoading(false) } })() }, [activeId])

  const filtered = guides.filter(g=> !query || g.title.toLowerCase().includes(query.toLowerCase()) || (g.tags||[]).some(t=>t.toLowerCase().includes(query.toLowerCase())))

  async function createGuide(){
    if (!formContent.trim()) { setError('Content required'); return }
    setSaving(true)
    try {
      await cocAPI.createStrategyGuide({ title: formTitle || 'Untitled', tags: formTags.split(',').map(t=>t.trim()).filter(Boolean), content: formContent })
      setFormTitle(''); setFormTags(''); setFormContent(''); await load()
    } catch(e){ setError(e.message) } finally { setSaving(false) }
  }
  async function updateGuide(){
    if (!activeId) return
    setSaving(true)
    try {
      await cocAPI.updateStrategyGuide(activeId, { title: formTitle, tags: formTags.split(',').map(t=>t.trim()).filter(Boolean), content: formContent })
      await load()
    } catch(e){ setError(e.message) } finally { setSaving(false) }
  }
  async function deleteGuide(){
    if (!activeId) return
    if (!confirm('Delete guide?')) return
    await cocAPI.deleteStrategyGuide(activeId)
    setActiveId(null)
    await load()
  }
  async function shareGuide(){
    if (!activeId) return
    setShareStatus('sharing')
    try { await cocAPI.shareStrategyGuide(activeId); setShareStatus('shared') } catch(e){ setShareStatus('error'); setError(e.message) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Strategy Guides</h1>
        <p className="text-xs text-gray-400">Community-authored guides (internal). No external wiki text is stored.</p>
      </div>
      <div className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-[10px] text-gray-500">Search</label>
          <input value={query} onChange={e=>setQuery(e.target.value)} className="px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs" />
        </div>
        <div className="text-[11px] text-gray-500">Total: {guides.length} • Showing: {filtered.length}</div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="space-y-2 max-h-[75vh] overflow-auto pr-2">
          <div className="flex gap-2 mb-2">
            <button onClick={()=>{ setActiveId(null); setFormTitle(''); setFormTags(''); setFormContent(''); }} className="px-2 py-1 text-[11px] rounded bg-blue-600">New</button>
            {activeId && <button onClick={deleteGuide} className="px-2 py-1 text-[11px] rounded bg-red-600">Delete</button>}
            {activeId && <button onClick={shareGuide} disabled={shareStatus==='sharing'} className="px-2 py-1 text-[11px] rounded bg-indigo-600 disabled:opacity-40">{shareStatus==='shared'?'Shared!':'Share'}</button>}
          </div>
          {filtered.map(g=> (
            <button key={g.id} onClick={()=>setActiveId(g.id)} className={`w-full text-left border rounded px-2 py-2 text-xs bg-gray-800/50 hover:bg-gray-700 border-gray-700 ${activeId===g.id?'ring-2 ring-blue-500':''}`}>
              <div className="font-medium truncate">{g.title}</div>
              <div className="text-[10px] text-gray-400">{new Date(g.updatedAt).toLocaleDateString()}</div>
              {g.tags?.length>0 && <div className="flex flex-wrap gap-1 mt-1">{g.tags.slice(0,5).map(t=> <span key={t} className="bg-gray-700 text-[9px] px-1 py-0.5 rounded">{t}</span>)}</div>}
            </button>
          ))}
          {filtered.length===0 && <div className="text-[11px] text-gray-500">No guides match.</div>}
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-gray-700 rounded p-4 bg-black/40">
            <h2 className="font-semibold text-sm mb-2">{activeId?'Edit Guide':'Create Guide'}</h2>
            <div className="grid md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[10px] text-gray-500">Title</label>
                <input value={formTitle} onChange={e=>setFormTitle(e.target.value)} className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500">Tags (comma)</label>
                <input value={formTags} onChange={e=>setFormTags(e.target.value)} className="w-full px-2 py-1 rounded bg-gray-800 border border-gray-700 text-xs" />
              </div>
            </div>
            <textarea value={formContent} onChange={e=>setFormContent(e.target.value)} className="w-full h-56 bg-gray-900 border border-gray-700 rounded p-2 text-xs font-mono" placeholder="Write guide content (internal only)" />
            <div className="flex gap-2 mt-3">
              {!activeId && <button onClick={createGuide} disabled={saving} className="px-3 py-1 text-xs rounded bg-emerald-600 disabled:opacity-40">Create</button>}
              {activeId && <button onClick={updateGuide} disabled={saving} className="px-3 py-1 text-xs rounded bg-blue-600 disabled:opacity-40">Update</button>}
              <button onClick={()=>{ setFormTitle(''); setFormTags(''); setFormContent(''); setActiveId(null); }} className="px-3 py-1 text-xs rounded bg-gray-700">Reset</button>
            </div>
          </div>
          <div className="border border-gray-700 rounded p-4 bg-black/40 min-h-[200px]">
            {loading && <div className="text-[11px] text-gray-400 animate-pulse">Loading...</div>}
            {active && !loading && (
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Preview</h3>
                <article className="prose prose-invert max-w-none text-xs leading-relaxed whitespace-pre-wrap">{active.content}</article>
              </div>
            )}
            {!active && !loading && <div className="text-[11px] text-gray-500">Select a guide to preview or create a new one.</div>}
          </div>
        </div>
      </div>
      {error && <div className="text-xs text-red-400">{error}</div>}
    </div>
  )
}
