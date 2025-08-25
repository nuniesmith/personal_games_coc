import React from 'react'
import { Activity, Clock, Network } from 'lucide-react'
import { useSocket } from '../contexts/SocketContext'
import StatusIndicator from '../components/Common/StatusIndicator'
import LoadingSpinner from '../components/Common/LoadingSpinner'
import { apiUtils } from '../services/api'

function Dashboard() {
  const { connected, logs } = useSocket()

  // Get recent logs (last 10 entries)
  const recentLogs = logs.slice(-10).reverse()

  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Overview of clan tools and real-time activity
          </p>
        </div>
        
  <div className="text-sm text-gray-500"></div>
      </div>

    {/* Error display */}
      {/* Status overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Connection</h3>
            <Network className="w-5 h-5 text-coc-success" />
          </div>
          <div className="space-y-3">
            <StatusIndicator status={connected ? 'online' : 'offline'} showLabel={true} size="md" />
            <div className="text-sm text-gray-400">
              <div>Domain: localhost</div>
              <div>Mode: Local tools</div>
            </div>
          </div>
        </div>
      </div>

      {/* System metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Recent activity log only (system metrics removed) */}
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
            <Clock className="w-5 h-5 text-coc-primary" />
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    log.level === 'error' ? 'bg-red-400' :
                    log.level === 'warning' ? 'bg-yellow-400' :
                    log.level === 'info' ? 'bg-blue-400' :
                    'bg-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 break-words">{log.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {log.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
                <p className="text-xs">Activity logs will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
