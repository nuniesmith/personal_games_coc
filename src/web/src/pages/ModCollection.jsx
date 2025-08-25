import React from 'react'

function ModCollection() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">Mods Removed</h1>
        <p className="text-gray-400 mt-1">Steam Workshop / collection features have been removed from this project.</p>
      </div>
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold text-white">Status</h3>
        </div>
        <div className="text-gray-400 text-sm p-4">
          This page is retained only to avoid broken links. You can delete it or repurpose it for Clash-specific tools.
        </div>
      </div>
    </div>
  )
}

export default ModCollection
