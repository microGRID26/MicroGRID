import { cn } from '@/lib/utils'

interface StatCardsProps {
  openCount: number
  escalatedCount: number
  criticalCount: number
  slaBreachedCount: number
  resolvedToday: number
  filterStatus: string
  setFilterStatus: (v: string) => void
  filterPriority: string
  setFilterPriority: (v: string) => void
  filterSLA: boolean
  setFilterSLA: (v: boolean) => void
  filterResolved: boolean
  setFilterResolved: (v: boolean) => void
}

export function StatCards({
  openCount, escalatedCount, criticalCount, slaBreachedCount, resolvedToday,
  filterStatus, setFilterStatus, filterPriority, setFilterPriority,
  filterSLA, setFilterSLA, filterResolved, setFilterResolved,
}: StatCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className={cn('bg-gray-800 rounded-lg p-3 cursor-pointer border', filterStatus === '' && !filterPriority ? 'border-green-500/50' : 'border-transparent hover:border-gray-600')} onClick={() => { setFilterStatus(''); setFilterPriority('') }}>
        <div className="text-xs text-gray-400">Total Open</div>
        <div className="text-2xl font-bold text-white mt-1">{openCount}</div>
      </div>
      <div className={cn('bg-gray-800 rounded-lg p-3 cursor-pointer border', filterStatus === 'escalated' ? 'border-red-500/50' : 'border-transparent hover:border-gray-600')} onClick={() => setFilterStatus(filterStatus === 'escalated' ? '' : 'escalated')}>
        <div className="text-xs text-gray-400">Escalated</div>
        <div className={cn('text-2xl font-bold mt-1', escalatedCount > 0 ? 'text-red-400' : 'text-white')}>{escalatedCount}</div>
      </div>
      <div className={cn('bg-gray-800 rounded-lg p-3 cursor-pointer border', filterPriority === 'urgent' ? 'border-amber-500/50' : 'border-transparent hover:border-gray-600')} onClick={() => setFilterPriority(filterPriority ? '' : 'urgent')}>
        <div className="text-xs text-gray-400">Critical / Urgent</div>
        <div className={cn('text-2xl font-bold mt-1', criticalCount > 0 ? 'text-amber-400' : 'text-white')}>{criticalCount}</div>
      </div>
      <div className={cn('bg-gray-800 rounded-lg p-3 cursor-pointer border', filterSLA ? 'border-red-500/50' : 'border-transparent hover:border-gray-600')} onClick={() => setFilterSLA(!filterSLA)}>
        <div className="text-xs text-gray-400">SLA Breached</div>
        <div className={cn('text-2xl font-bold mt-1', slaBreachedCount > 0 ? 'text-red-400' : 'text-white')}>{slaBreachedCount}</div>
      </div>
      <div className={cn('bg-gray-800 rounded-lg p-3 cursor-pointer border', filterResolved ? 'border-green-500/50' : 'border-transparent hover:border-gray-600')} onClick={() => setFilterResolved(!filterResolved)}>
        <div className="text-xs text-gray-400">Resolved Today</div>
        <div className="text-2xl font-bold text-green-400 mt-1">{resolvedToday}</div>
      </div>
    </div>
  )
}
