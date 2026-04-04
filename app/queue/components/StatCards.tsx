import { fmt$ } from '@/lib/utils'
import type { QueueFilters } from './types'

interface StatCardsProps {
  filteredCount: number
  blockedCount: number
  followUpsCount: number
  portfolioValue: number
  hasActiveFilters: boolean
  filters: QueueFilters
  onClearAllFilters: () => void
  onToggleBlocked: () => void
  onScrollToFollowUps: () => void
}

export function StatCards({
  filteredCount, blockedCount, followUpsCount, portfolioValue,
  hasActiveFilters, filters, onClearAllFilters, onToggleBlocked, onScrollToFollowUps,
}: StatCardsProps) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-3 sm:px-6 py-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <button
          onClick={onClearAllFilters}
          className={`rounded-lg px-4 py-2.5 text-left transition-colors border ${
            !hasActiveFilters ? 'border-green-600 bg-green-950/30' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total</div>
          <div className="text-xl font-bold text-white font-mono">{filteredCount}</div>
        </button>
        {/* Blocked */}
        <button
          onClick={onToggleBlocked}
          className={`rounded-lg px-4 py-2.5 text-left transition-colors border ${
            filters.blockedOnly ? 'border-red-600 bg-red-950/30' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Blocked</div>
          <div className={`text-xl font-bold font-mono ${blockedCount ? 'text-red-400' : 'text-white'}`}>{blockedCount}</div>
        </button>
        {/* Follow-ups Due */}
        <button
          onClick={onScrollToFollowUps}
          className="rounded-lg px-4 py-2.5 text-left transition-colors border border-gray-700 bg-gray-800/50 hover:border-amber-600"
        >
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Follow-ups</div>
          <div className={`text-xl font-bold font-mono ${followUpsCount ? 'text-amber-400' : 'text-white'}`}>{followUpsCount}</div>
        </button>
        {/* Portfolio Value */}
        <div className="rounded-lg px-4 py-2.5 text-left border border-gray-700 bg-gray-800/50">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Portfolio</div>
          <div className="text-xl font-bold text-white font-mono">{fmt$(portfolioValue)}</div>
        </div>
      </div>
    </div>
  )
}
