import { forwardRef } from 'react'
import { daysAgo, STAGE_LABELS } from '@/lib/utils'
import { SelectCheckbox } from '@/components/BulkActionBar'
import { QuickActionMenu } from '@/components/QuickActionMenu'
import { db } from '@/lib/db'
import type { Project } from '@/types/database'
import type { FundingRecord, ProjectWithFollowUp, SectionSortKey } from './types'
import { sortProjects } from './helpers'
import { SortToggle } from './SortToggle'
import { FundingBadge } from './FundingBadge'

interface FollowUpsSectionProps {
  followUps: ProjectWithFollowUp[]
  isCollapsed: boolean
  onToggle: () => void
  getSectionSort: SectionSortKey
  onCycleSort: (key: string) => void
  selectMode: boolean
  selectedIds: Set<string>
  onSelectAll: (ids: string[]) => void
  onToggleSelect: (id: string) => void
  onOpenProject: (p: Project) => void
  fundingMap: Record<string, FundingRecord>
  onRefresh: () => void
  todayStr: string
}

export const FollowUpsSection = forwardRef<HTMLDivElement, FollowUpsSectionProps>(function FollowUpsSection({
  followUps, isCollapsed, onToggle, getSectionSort, onCycleSort,
  selectMode, selectedIds, onSelectAll, onToggleSelect,
  onOpenProject, fundingMap, onRefresh, todayStr,
}, ref) {
  return (
    <div ref={ref} className="mb-6 bg-amber-950/30 border border-amber-900/50 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={onToggle} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }} aria-expanded={!isCollapsed} aria-controls="section-followups" className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 text-left hover:text-amber-300 transition-colors flex-1">
            <span className="text-[10px]">{isCollapsed ? '▸' : '▾'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
            Follow-ups Today ({followUps.length})
          </button>
          <SortToggle sectionKey="followups" current={getSectionSort} onCycle={onCycleSort} />
          {selectMode && followUps.length > 0 && (
            <button
              onClick={() => onSelectAll(followUps.map(p => p.id))}
              className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
            >
              Select All
            </button>
          )}
        </div>
        {!isCollapsed && followUps.length === 0 && (
          <div className="text-xs text-gray-600 italic pl-6">No follow-ups due today. Set follow-up dates on tasks in the project panel.</div>
        )}
        {!isCollapsed && sortProjects(followUps as unknown as Project[], getSectionSort).map(proj => {
          const p = followUps.find(f => f.id === proj.id) ?? proj as unknown as ProjectWithFollowUp
          return (
          <div
            key={p.id}
            onClick={() => {
              if (selectMode) {
                onToggleSelect(p.id)
              } else {
                onOpenProject(p)
              }
            }}
            className={`bg-gray-800/80 hover:bg-gray-700 border rounded-lg p-3 mb-2 cursor-pointer transition-colors flex items-center gap-3 relative ${
              selectedIds.has(p.id) ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-700'
            }`}
          >
            {selectMode && <SelectCheckbox selected={selectedIds.has(p.id)} />}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-sm">{p.name}</span>
                <span className="text-xs text-gray-500">{p.id}</span>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-green-400">{STAGE_LABELS[p.stage]}</span>
                <QuickActionMenu projectId={p.id} projectName={p.name} onRefresh={onRefresh} />
                <FundingBadge funding={fundingMap[p.id]} onUpdate={async (key, val) => {
                  await db().from('project_funding').update({ [key]: val }).eq('project_id', p.id)
                  onRefresh()
                }} />
              </div>
              {p.city && <div className="text-xs text-gray-400 mt-0.5">{p.city}</div>}
            </div>
            <div className="text-right flex-shrink-0">
              {(p as ProjectWithFollowUp)._taskFollowUp && (
                <div className="text-[10px] text-gray-400 mb-0.5">{(p as ProjectWithFollowUp)._taskFollowUp!.taskName}</div>
              )}
              <div className={`text-xs font-medium ${
                (p as ProjectWithFollowUp)._followUpDate === todayStr ? 'text-amber-400' : 'text-red-400'
              }`}>
                {!(p as ProjectWithFollowUp)._followUpDate
                  ? '—'
                  : (p as ProjectWithFollowUp)._followUpDate === todayStr
                    ? 'Today'
                    : `${daysAgo((p as ProjectWithFollowUp)._followUpDate)}d overdue`}
              </div>
            </div>
          </div>
          )
        })}
      </div>
  )
})
