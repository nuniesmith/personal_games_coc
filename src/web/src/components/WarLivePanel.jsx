import React, { useEffect, useState, useCallback } from 'react'
import { useSocket } from '../contexts/SocketContext.jsx'
import { cocAPI } from '../services/coc'

export default function WarLivePanel({ clanTag, compact=false }) {
  const { war } = useSocket()
  const [manualWar, setManualWar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [pushState, setPushState] = useState('idle') // idle|pushing|ok|err
  const data = war || manualWar

  const refresh = useCallback(async () => {
    if (!clanTag) return
    setLoading(true)
    try {
      const res = await cocAPI.getCurrentWar(clanTag)
      setManualWar(res.data?.data || null)
    } catch (e) { /* ignore */ }
    finally { setLoading(false) }
  }, [clanTag])

  const pushUpdate = async () => {
    setPushState('pushing')
    try {
      const res = await cocAPI.pushWarUpdate(clanTag)
      if (res.data?.success) setPushState('ok')
      else setPushState('err')
      setTimeout(()=> setPushState('idle'), 2500)
    } catch (e) {
      setPushState('err')
      setTimeout(()=> setPushState('idle'), 3000)
    }
  }

  useEffect(()=>{ refresh() }, [refresh])

  if (!data) {
    return (
      <div className="p-3 rounded border border-gray-700 bg-gray-900/40 text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold">Live War</span>
          <div className="flex gap-2 items-center">
            <button onClick={refresh} disabled={loading} className="px-2 py-0.5 text-[10px] rounded bg-gray-700 disabled:opacity-40">{loading?'…':'Refresh'}</button>
          </div>
        </div>
        <div className="text-gray-500">No active war.</div>
      </div>
    )
  }

  const clan = data.clan || {}
  const opp = data.opponent || {}
  const state = data.state
  const ratio = clan.stars != null && opp.stars != null ? `${clan.stars}:${opp.stars}` : 'n/a'

  return (
    <div className={`p-3 rounded border border-gray-700 bg-gray-900/40 ${compact?'text-[11px]':'text-xs'} space-y-2`}>
      <div className="flex justify-between items-center">
        <span className="font-semibold">Live War ({state})</span>
        <div className="flex gap-2 items-center">
          <button onClick={refresh} disabled={loading} className="px-2 py-0.5 text-[10px] rounded bg-gray-700 disabled:opacity-40">{loading?'…':'Refresh'}</button>
          <button onClick={pushUpdate} disabled={pushState==='pushing'} className={`px-2 py-0.5 text-[10px] rounded ${pushState==='ok'?'bg-emerald-600': pushState==='err'?'bg-red-600':'bg-indigo-600'} disabled:opacity-40`}>{pushState==='pushing'?'Pushing':pushState==='ok'?'Pushed':'Push'}</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-medium truncate">{clan.name || 'Clan'}</div>
          <div className="text-gray-400">Stars: {clan.stars ?? '—'}</div>
          <div className="text-gray-400">Destruction: {clan.destruction != null ? Math.round(clan.destruction)+'%' : '—'}</div>
        </div>
        <div>
          <div className="font-medium truncate">{opp.name || 'Opponent'}</div>
          <div className="text-gray-400">Stars: {opp.stars ?? '—'}</div>
          <div className="text-gray-400">Destruction: {opp.destruction != null ? Math.round(opp.destruction)+'%' : '—'}</div>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-800">
        <span className="text-gray-400">Score</span>
        <span className="font-semibold">{ratio}</span>
      </div>
      {data.timestamp && <div className="text-[10px] text-gray-500">Updated {new Date(data.timestamp).toLocaleTimeString()}</div>}
    </div>
  )
}
