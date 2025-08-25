import React, { useState } from 'react'
import { FileText, Download, Trash2, Filter, Search } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'

function ServerLogs() {
  const { logs, clearLogs, getLogsByType, getLogsByLevel } = useSocket()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.type === filter || log.level === filter
    const matchesSearch = search === '' || log.message.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const logCounts = {
    all: logs.length,
    error: getLogsByLevel('error').length,
    warning: getLogsByLevel('warning').length,
    info: getLogsByLevel('info').length,
    player: getLogsByType('player').length,
    server: getLogsByType('server').length,
  }

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'info': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  const getLogTypeIcon = (type) => {
    switch (type) {
      case 'player': return '👤'
      case 'server': return '🖥️'
      case 'system': return '⚙️'
      default: return '📄'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Activity Logs
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time application events and activity
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={clearLogs}
            className="btn-error flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Logs
          </button>
        </div>
      </div>

      {/* Log statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {Object.entries(logCounts).map(([type, count]) => (
          <div
            key={type}
            className={`metric-card cursor-pointer ${filter === type ? 'border-coc-primary' : ''}`}
            onClick={() => setFilter(type)}
          >
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-gray-400 capitalize">{type}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="input-field"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field min-w-32"
            >
              <option value="all">All Logs</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="player">Players</option>
              <option value="server">Server</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs display */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-white">
            Logs ({filteredLogs.length})
          </h3>
          <FileText className="w-5 h-5 text-coc-primary" />
        </div>
        
        <div className="space-y-1 max-h-96 overflow-y-auto font-mono text-sm">
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-gray-800/50 rounded">
                <div className="text-gray-500 text-xs mt-1 w-20 flex-shrink-0">
                  {log.timestamp.toLocaleTimeString()}
                </div>
                <div className="flex-shrink-0 text-sm mt-0.5">
                  {getLogTypeIcon(log.type)}
                </div>
                <div className={`font-semibold text-xs mt-1 w-16 flex-shrink-0 uppercase ${getLogLevelColor(log.level)}`}>
                  {log.level}
                </div>
                <div className="flex-1 text-gray-300 break-words">
                  {log.message}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No logs found</p>
              <p className="text-sm">
                {search || filter !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Logs will appear here as activity occurs'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ServerLogs
