import { STAGE_LABELS } from '@/lib/utils'
import type { QueueFilters } from './types'
import { FILTER_STAGES } from './helpers'

interface FilterToolbarProps {
  search: string
  onSearchChange: (val: string) => void
  userPm: string
  onPmChange: (val: string) => void
  availablePms: { id: string; name: string }[]
  projectCount: number
  filters: QueueFilters
  onToggleStage: (stage: string) => void
  onSetFilters: (updater: (prev: QueueFilters) => QueueFilters) => void
  hasActiveFilters: boolean
  onClearAllFilters: () => void
  distinctFinanciers: string[]
  distinctAHJs: string[]
  financierDisplayNames: Map<string, string>
  ahjDisplayNames: Map<string, string>
  selectMode: boolean
  selectedCount: number
  onToggleSelectMode: () => void
  onExitSelectMode: () => void
  onShowCardConfig: () => void
  isSales: boolean
}

export function FilterToolbar({
  search, onSearchChange, userPm, onPmChange, availablePms, projectCount,
  filters, onToggleStage, onSetFilters, hasActiveFilters, onClearAllFilters,
  distinctFinanciers, distinctAHJs, financierDisplayNames, ahjDisplayNames,
  selectMode, selectedCount, onToggleSelectMode, onExitSelectMode,
  onShowCardConfig, isSales,
}: FilterToolbarProps) {
  return (
    <div className="bg-gray-900 border-b border-gray-800 px-4 py-2 space-y-2">
      {/* Search, PM, count + stage chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search..."
          aria-label="Search projects"
          className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-3 py-1.5 w-40 focus:outline-none focus:border-green-500 placeholder-gray-500"
        />
        <select
          value={userPm}
          onChange={e => onPmChange(e.target.value)}
          aria-label="Filter by PM"
          className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-2 py-1"
        >
          <option value="">All PMs</option>
          {availablePms.map(pm => <option key={pm.id} value={pm.id}>{pm.name}</option>)}
        </select>
        <span className="text-xs text-gray-500">{projectCount} projects</span>
        <div className="h-4 w-px bg-gray-700 mx-1" />
        {FILTER_STAGES.map(stage => (
          <button
            key={stage}
            onClick={() => onToggleStage(stage)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
              filters.stages.has(stage)
                ? 'bg-green-900/60 border-green-600 text-green-300'
                : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            {STAGE_LABELS[stage]}
          </button>
        ))}
        <div className="h-4 w-px bg-gray-700 mx-1" />
        {/* Financier dropdown */}
        <select
          value={filters.financier}
          onChange={e => onSetFilters(prev => ({ ...prev, financier: e.target.value }))}
          aria-label="Filter by financier"
          className="text-[11px] bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-green-500"
        >
          <option value="">Financier: All</option>
          {distinctFinanciers.map(f => <option key={f} value={f}>{financierDisplayNames.get(f) ?? f}</option>)}
        </select>
        {/* AHJ dropdown */}
        <select
          value={filters.ahj}
          onChange={e => onSetFilters(prev => ({ ...prev, ahj: e.target.value }))}
          aria-label="Filter by AHJ"
          className="text-[11px] bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-green-500"
        >
          <option value="">AHJ: All</option>
          {distinctAHJs.map(a => <option key={a} value={a}>{ahjDisplayNames.get(a) ?? a}</option>)}
        </select>
        {/* Blocked toggle */}
        <button
          onClick={() => onSetFilters(prev => ({ ...prev, blockedOnly: !prev.blockedOnly }))}
          className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
            filters.blockedOnly
              ? 'bg-red-900/60 border-red-600 text-red-300'
              : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
          }`}
        >
          Blocked Only
        </button>
      </div>
      {/* Days range chips + Clear All + Select/Gear */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['<7', '7-30', '30-90', '90+'] as const).map(range => (
          <button
            key={range}
            onClick={() => onSetFilters(prev => ({ ...prev, daysRange: prev.daysRange === range ? '' : range }))}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium ${
              filters.daysRange === range
                ? 'bg-blue-900/60 border-blue-600 text-blue-300'
                : 'bg-gray-800/60 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
            }`}
          >
            {range === '<7' ? '<7d' : range === '7-30' ? '7-30d' : range === '30-90' ? '30-90d' : '90+d'}
          </button>
        ))}
        {hasActiveFilters && (
          <button
            onClick={onClearAllFilters}
            className="text-[11px] px-2.5 py-1 rounded-full border border-gray-600 text-gray-400 hover:text-white hover:border-gray-500 transition-colors ml-2"
          >
            Clear All
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {!isSales && (
            <>
              <button
                onClick={() => selectMode ? onExitSelectMode() : onToggleSelectMode()}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
                  selectMode
                    ? 'bg-green-700 text-white hover:bg-green-600'
                    : 'bg-gray-800 text-gray-400 hover:text-white border border-gray-700'
                }`}
              >
                {selectMode ? 'Exit Select' : 'Select'}
              </button>
              {selectMode && selectedCount > 0 && (
                <span className="text-xs text-green-400 font-medium">{selectedCount} selected</span>
              )}
            </>
          )}
          <button onClick={onShowCardConfig} className="text-gray-400 hover:text-white transition-colors p-1" title="Card fields" aria-label="Configure card fields">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      </div>
    </div>
  )
}
