import React from 'react'
import { cn } from '@/lib/utils'
import { fmt$ } from '@/lib/utils'
import { TIER_INFO } from '@/lib/api/ramp-planner'
import type { Tier } from './types'
import { TIER_COLORS, TIER_BG, TIER_TEXT } from './types'

interface TierCardsProps {
  tierCounts: Record<Tier, { count: number; value: number }>
  tierFilter: Set<Tier>
  setTierFilter: React.Dispatch<React.SetStateAction<Set<Tier>>>
  setTab: (tab: 'planner' | 'queue' | 'timeline') => void
}

export function TierCards({ tierCounts, tierFilter, setTierFilter, setTab }: TierCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {([1, 2, 3, 4] as Tier[]).map(tier => (
        <div key={tier} onClick={() => {
            setTierFilter(prev => { const next = new Set(prev); if (next.has(tier)) next.delete(tier); else next.add(tier); return next })
            setTab('queue')
          }}
          className={cn('rounded-lg p-3 border cursor-pointer transition-opacity', TIER_COLORS[tier], TIER_BG[tier],
            tierFilter.size > 0 && !tierFilter.has(tier) && 'opacity-40')}>
          <div className="flex items-center justify-between">
            <span className={cn('text-xs font-semibold', TIER_TEXT[tier])}>Tier {tier}: {TIER_INFO[tier].label}</span>
            <span className="text-lg font-bold text-white">{tierCounts[tier].count}</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">{TIER_INFO[tier].description}</div>
          <div className="text-xs text-gray-300 mt-1">{fmt$(tierCounts[tier].value)}</div>
        </div>
      ))}
    </div>
  )
}
