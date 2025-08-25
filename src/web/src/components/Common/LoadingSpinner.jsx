import React from 'react'
import { Loader2 } from 'lucide-react'

function LoadingSpinner({ size = 'md', className = '', text = '' }) {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }
  
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="flex flex-col items-center space-y-2">
        <Loader2 className={`${sizeClasses[size]} text-coc-primary animate-spin`} />
        {text && (
          <span className="text-sm text-gray-400">{text}</span>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner
