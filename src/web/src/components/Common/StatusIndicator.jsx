import React from 'react'
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

const statusConfig = {
  online: {
    icon: CheckCircle,
    className: 'status-online',
    color: 'text-green-400',
    bgColor: 'bg-green-400',
    label: 'Online'
  },
  offline: {
    icon: XCircle,
    className: 'status-offline',
    color: 'text-red-400',
    bgColor: 'bg-red-400',
    label: 'Offline'
  },
  starting: {
    icon: Clock,
    className: 'status-loading',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
    label: 'Starting'
  },
  stopping: {
    icon: Clock,
    className: 'status-loading',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
    label: 'Stopping'
  },
  error: {
    icon: AlertTriangle,
    className: 'status-offline',
    color: 'text-red-400',
    bgColor: 'bg-red-400',
    label: 'Error'
  },
  unknown: {
    icon: AlertTriangle,
    className: 'status-loading',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Unknown'
  }
}

function StatusIndicator({ status, showLabel = true, size = 'sm', className = '' }) {
  const config = statusConfig[status] || statusConfig.unknown
  const Icon = config.icon
  
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  }
  
  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4'
  }
  
  if (showLabel) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="relative">
          <Icon className={`${sizeClasses[size]} ${config.color}`} />
          {(status === 'starting' || status === 'stopping') && (
            <div className={`absolute -top-1 -right-1 ${dotSizes[size]} ${config.bgColor} rounded-full animate-ping`} />
          )}
        </div>
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      </div>
    )
  }
  
  return (
    <div className={`relative ${className}`}>
      <Icon className={`${sizeClasses[size]} ${config.color}`} />
      {(status === 'starting' || status === 'stopping') && (
        <div className={`absolute -top-1 -right-1 ${dotSizes[size]} ${config.bgColor} rounded-full animate-ping`} />
      )}
    </div>
  )
}

export default StatusIndicator
