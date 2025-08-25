import React, { useEffect, useState, useCallback } from 'react'
import { clashKingAPI } from '../services/api'

export default function BotStatus() {
  const [health, setHealth] = useState(null)
  const [info, setInfo] = useState(null)
  const [commands, setCommands] = useState(null)
  const [tracked, setTracked] = useState(null)
  const [cmdQuery, setCmdQuery] = useState('')
  const [clanQuery, setClanQuery] = useState('')
  const [cmdPage, setCmdPage] = useState({ offset: 0, limit: 50 })
  const [clanPage, setClanPage] = useState({ offset: 0, limit: 50 })
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      const [h, i, c, t] = await Promise.all([
        clashKingAPI.health(),
        clashKingAPI.info(),
        clashKingAPI.commands({ ...cmdPage, q: cmdQuery || undefined }),
        clashKingAPI.trackedClans({ ...clanPage, q: clanQuery || undefined }),
      ])
      setHealth(h)
      setInfo(i)
      setCommands(c)
      setTracked(t)
    } catch (e) {
      setError(e.message)
    }
  }, [cmdPage, clanPage, cmdQuery, clanQuery])

  useEffect(() => { load(); const id = setInterval(load, 15000); return () => clearInterval(id) }, [load])

  const Card = ({ title, children }) => (
    <div className="p-4 rounded-lg bg-gray-800/60 border border-gray-700 flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      {children}
    </div>
  )

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-white">Bot Status</h1>
      {error && <div className="text-red-400 text-sm">{error}</div>}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Health">
          {!health ? <span className="text-gray-400 text-xs">Loading...</span> : (
            <ul className="text-xs text-gray-300 space-y-1">
              <li>Status: <span className={health.ready ? 'text-green-400' : 'text-yellow-400'}>{health.status}</span></li>
              <li>Guilds: {health.guild_count}</li>
              <li>Latency: {health.latency_ms ?? 'n/a'} ms</li>
              <li>Uptime: {health.uptime_sec}s</li>
            </ul>
          )}
        </Card>
        <Card title="Info">
          {!info ? <span className="text-gray-400 text-xs">Loading...</span> : (
            <ul className="text-xs text-gray-300 space-y-1">
              <li>Version: {info.data?.version}</li>
              <li>Shard Count: {info.data?.shard_count}</li>
              <li>User Count: {info.data?.user_count}</li>
            </ul>
          )}
        </Card>
        <Card title="Commands">
          {!commands ? <span className="text-gray-400 text-xs">Loading...</span> : (
            <div className="text-xs text-gray-300">
              <div className="flex items-center justify-between mb-1">
                <span>Total: {commands.filtered ?? commands.total ?? commands.count}</span>
                <input
                  value={cmdQuery}
                  onChange={e => { setCmdPage(p=>({...p, offset:0})); setCmdQuery(e.target.value) }}
                  placeholder="Search"
                  className="bg-gray-700/60 border border-gray-600 rounded px-2 py-0.5 text-[11px] focus:outline-none"
                />
              </div>
              <div className="mt-2 h-32 overflow-auto custom-scrollbar pr-1">
                <ul className="space-y-0.5">
                  {commands.commands?.slice(0,50).map(cmd => <li key={cmd} className="truncate">{cmd}</li>)}
                </ul>
                {commands.offset + commands.count < (commands.filtered ?? commands.total ?? 0) && (
                  <button
                    onClick={() => setCmdPage(p => ({ ...p, offset: p.offset + p.limit }))}
                    className="mt-2 text-[10px] text-coc-accent hover:underline"
                  >Load More</button>
                )}
              </div>
            </div>
          )}
        </Card>
        <Card title="Tracked Clans">
          {!tracked ? <span className="text-gray-400 text-xs">Loading...</span> : (
            <div className="text-xs text-gray-300">
              <div className="flex items-center justify-between mb-1">
                <span>Total: {tracked.filtered ?? tracked.total ?? tracked.count}</span>
                <input
                  value={clanQuery}
                  onChange={e => { setClanPage(p=>({...p, offset:0})); setClanQuery(e.target.value) }}
                  placeholder="Search"
                  className="bg-gray-700/60 border border-gray-600 rounded px-2 py-0.5 text-[11px] focus:outline-none"
                />
              </div>
              <div className="mt-2 h-32 overflow-auto custom-scrollbar pr-1">
                <ul className="space-y-0.5">
                  {tracked.clans?.map(tag => <li key={tag}>{tag}</li>)}
                </ul>
                {tracked.offset + tracked.count < (tracked.filtered ?? tracked.total ?? 0) && (
                  <button
                    onClick={() => setClanPage(p => ({ ...p, offset: p.offset + p.limit }))}
                    className="mt-2 text-[10px] text-coc-accent hover:underline"
                  >Load More</button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
      <div className="text-[11px] text-gray-500">Data auto-refreshes every 15s.</div>
    </div>
  )
}
