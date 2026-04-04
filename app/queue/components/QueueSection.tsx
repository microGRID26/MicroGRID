import type { Project } from '@/types/database'
import type { TaskEntry } from '@/lib/queue-task-map'
import type { FundingRecord, SectionSortKey } from './types'
import { sortProjects } from './helpers'
import { SortToggle } from './SortToggle'
import { QueueCard } from './QueueCard'

interface QueueSectionProps {
  sectionKey: string
  label: React.ReactNode
  labelClassName: string
  items: Project[]
  isCollapsed: boolean
  onToggle: () => void
  getSectionSort: SectionSortKey
  onCycleSort: (key: string) => void
  selectMode: boolean
  selectedIds: Set<string>
  onSelectAll: (ids: string[]) => void
  onToggleSelect: (id: string) => void
  onOpenProject: (p: Project) => void
  taskMap: Record<string, Record<string, TaskEntry>>
  cardFields: string[]
  fundingMap: Record<string, FundingRecord>
  currentUser: { name?: string; id?: string } | null
  onRefresh: () => void
  todayStr: string
}

export function QueueSection({
  sectionKey, label, labelClassName, items,
  isCollapsed, onToggle, getSectionSort, onCycleSort,
  selectMode, selectedIds, onSelectAll, onToggleSelect,
  onOpenProject, taskMap, cardFields, fundingMap, currentUser, onRefresh, todayStr,
}: QueueSectionProps) {
  if (items.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <button onClick={onToggle} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }} aria-expanded={!isCollapsed} aria-controls={`section-${sectionKey}`} className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-left transition-colors flex-1 ${labelClassName}`}>
          <span className="text-[10px]">{isCollapsed ? '▸' : '▾'}</span>
          {label}
        </button>
        <SortToggle sectionKey={sectionKey} current={getSectionSort} onCycle={onCycleSort} />
        {selectMode && (
          <button
            onClick={() => onSelectAll(items.map(p => p.id))}
            className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:text-white border border-gray-700"
          >
            Select All
          </button>
        )}
      </div>
      {!isCollapsed && sortProjects(items, getSectionSort).map(p => (
        <QueueCard key={p.id} p={p} taskMap={taskMap[p.id] ?? {}} onOpen={onOpenProject} cardFields={cardFields}
          selectMode={selectMode} isSelected={selectedIds.has(p.id)} onToggleSelect={onToggleSelect}
          fundingMap={fundingMap} currentUser={currentUser} onRefresh={onRefresh} todayStr={todayStr} />
      ))}
    </div>
  )
}
