import { daysAgo, fmt$ } from '@/lib/utils'
import { SelectCheckbox } from '@/components/BulkActionBar'
import type { Project } from '@/types/database'
import type { TaskEntry } from '@/lib/queue-task-map'
import type { FundingRecord } from './types'
import { getSLA, getNextTask, getStuckTasks, AGE_COLOR, SLA_BORDER } from './helpers'
import { TaskStatusBadge } from './TaskStatusBadge'
import { FundingBadge } from './FundingBadge'

export function PipelineCard({ p, viewMode, taskMap, funding, followUp, todayStr, selectMode, isSelected, isActive, onToggleSelect, onOpen }: {
  p: Project
  viewMode: 'compact' | 'detailed'
  taskMap: Record<string, TaskEntry>
  funding?: FundingRecord
  followUp?: { date: string; taskName: string }
  todayStr: string
  selectMode: boolean
  isSelected: boolean
  isActive: boolean
  onToggleSelect: (id: string) => void
  onOpen: (p: Project) => void
}) {
  const sla = getSLA(p)
  const nextTask = viewMode === 'detailed' ? getNextTask(p, taskMap) : null
  const stuck = viewMode === 'detailed' ? getStuckTasks(p, taskMap) : []

  return (
    <div
      onClick={() => {
        if (selectMode) { onToggleSelect(p.id) } else { onOpen(p) }
      }}
      className={`bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 border-l-2 border transition-colors relative ${
        isSelected ? 'border-green-500 ring-1 ring-green-500/30 border-l-green-500' :
        p.blocker ? `${SLA_BORDER[sla.status]} border-gray-700` :
        isActive ? `${SLA_BORDER[sla.status]} border-green-600` :
        `${SLA_BORDER[sla.status]} border-gray-700`
      } ${viewMode === 'compact' ? 'px-2 py-2' : 'px-2 py-2.5 sm:px-2.5'}`}
    >
      {selectMode && <SelectCheckbox selected={isSelected} />}

      {/* ── Compact mode ────────────────────────────────────────────────── */}
      {viewMode === 'compact' && (
        <>
          <div className={`flex items-center justify-between ${selectMode ? 'pr-5' : ''}`}>
            <div className="text-xs font-medium text-white truncate flex-1">{p.name}</div>
            <span className={`text-xs font-mono font-bold ml-2 flex-shrink-0 ${
              p.blocker ? 'text-red-400' :
              sla.status === 'crit' ? 'text-red-400' :
              sla.status === 'risk' ? 'text-amber-400' :
              sla.status === 'warn' ? 'text-yellow-400' : 'text-gray-400'
            }`}>{sla.days}d</span>
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-gray-500">{p.id}</span>
            {p.blocker && <span className="text-[10px] text-red-400 truncate max-w-[60%] ml-1">&#128683; {p.blocker}</span>}
          </div>
          <div className="mt-1 h-0.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${sla.pct}%`, backgroundColor: AGE_COLOR[sla.status] }} />
          </div>
        </>
      )}

      {/* ── Detailed mode ───────────────────────────────────────────────── */}
      {viewMode === 'detailed' && (
        <>
          {/* Blocker bar */}
          {p.blocker && (
            <div className="bg-red-950/60 border border-red-900/40 rounded px-2 py-1 mb-2 text-[10px] text-red-400 truncate">
              &#128683; {p.blocker}
            </div>
          )}

          {/* Name + ID */}
          <div className={`${selectMode ? 'pr-5' : ''}`}>
            <div className="text-xs font-medium text-white truncate">{p.name}</div>
            <div className="text-[10px] text-gray-500">{p.id}</div>
          </div>

          {/* kW + contract */}
          <div className="text-[10px] text-gray-400 mt-1">
            {p.systemkw ? `${p.systemkw} kW` : ''}
            {p.systemkw && p.contract ? ' \u00B7 ' : ''}
            {p.contract ? fmt$(p.contract) : ''}
          </div>

          {/* Next task with status badge */}
          {nextTask && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-gray-500">Next:</span>
              <span className="text-[10px] text-gray-300 truncate">{nextTask.name}</span>
              <TaskStatusBadge status={nextTask.status} />
            </div>
          )}

          {/* Stuck tasks */}
          {stuck.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {stuck.slice(0, 2).map((t, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className={`text-[9px] px-1 py-0.5 rounded ${
                    t.status === 'Pending Resolution' ? 'bg-red-900/60 text-red-300' : 'bg-amber-900/60 text-amber-300'
                  }`}>
                    {t.status === 'Pending Resolution' ? 'Pending' : 'Revision'}
                  </span>
                  <span className="text-[10px] text-gray-400 truncate">{t.name}</span>
                  {t.reason && <span className="text-[9px] text-gray-500 truncate hidden xl:inline">- {t.reason}</span>}
                </div>
              ))}
              {stuck.length > 2 && (
                <span className="text-[9px] text-gray-600">+{stuck.length - 2} more</span>
              )}
            </div>
          )}

          {/* Funding badge + Follow-up */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <FundingBadge funding={funding} />
            {followUp && (
              <span className={`text-[10px] font-medium ${
                followUp.date === todayStr ? 'text-amber-400' :
                followUp.date < todayStr ? 'text-red-400' : 'text-gray-500'
              }`}>
                FU: {followUp.date === todayStr ? 'Today' : followUp.date < todayStr ? `${daysAgo(followUp.date)}d overdue` : followUp.date}
              </span>
            )}
          </div>

          {/* Footer: PM, age, financier */}
          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-gray-700/50">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{p.pm}</span>
              {p.financier && (
                <>
                  <span className="text-[10px] text-gray-700">{'\u00B7'}</span>
                  <span className="text-[10px] text-gray-600 truncate max-w-[60px]">{p.financier}</span>
                </>
              )}
            </div>
            <span className={`text-xs font-mono font-bold ${
              p.blocker ? 'text-red-400' :
              sla.status === 'crit' ? 'text-red-400' :
              sla.status === 'risk' ? 'text-amber-400' :
              sla.status === 'warn' ? 'text-yellow-400' : 'text-gray-400'
            }`}>{sla.days}d</span>
          </div>

          {/* SLA progress bar */}
          <div className="mt-1.5 h-0.5 bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${sla.pct}%`, backgroundColor: AGE_COLOR[sla.status] }} />
          </div>
        </>
      )}
    </div>
  )
}
