import React from 'react'
import WarLivePanel from '../components/WarLivePanel.jsx'

export default function SomeDashboard(){
  const clanTag = import.meta.env.VITE_PRIMARY_CLAN_TAG || '#CLAN'
  return <div className='p-4'>
    <h1 className='text-lg font-semibold mb-4'>Operations Dashboard</h1>
    <WarLivePanel clanTag={clanTag} />
  </div>
}
