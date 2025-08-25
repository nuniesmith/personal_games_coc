import React, { createContext, useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cocAPI } from '../services/coc'

const ClanContext = createContext(null)

export function ClanProvider({ children }) {
  const DEFAULT_TAG = '#9UQ9G99P'
  const saved = localStorage.getItem('coc_clan_tag') || DEFAULT_TAG
  const [clanTag, setClanTag] = React.useState(saved)
  React.useEffect(() => { if (clanTag) localStorage.setItem('coc_clan_tag', clanTag) }, [clanTag])

  const summaryQ = useQuery({
    queryKey: ['cocSummary', clanTag],
    queryFn: () => cocAPI.getSummary(clanTag).then(r => r.data),
    enabled: !!clanTag,
    // dynamic interval: fallback 60s; shortened if backend suggests (never <7s for safety)
    refetchInterval: (data) => {
      const suggested = data?.polling?.suggestedIntervalMs;
      if (!suggested) return 60_000;
      return Math.max(7_000, suggested);
    }
  })

  const value = {
    clanTag,
    setClanTag,
    summary: summaryQ.data,
    isLoading: summaryQ.isLoading,
    isFetching: summaryQ.isFetching,
    error: summaryQ.error?.message,
    refetch: summaryQ.refetch,
  }

  return <ClanContext.Provider value={value}>{children}</ClanContext.Provider>
}

export function useClan() {
  const ctx = useContext(ClanContext)
  if (!ctx) throw new Error('useClan must be used within ClanProvider')
  return ctx
}

export default ClanContext
