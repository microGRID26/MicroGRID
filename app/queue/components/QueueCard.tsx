import React, { useState, useCallback } from 'react'
import { daysAgo, STAGE_LABELS } from '@/lib/utils'
import { Calendar, X, MessageSquare } from 'lucide-react'
import { SelectCheckbox } from '@/components/BulkActionBar'
import { updateProject, addNote, insertAuditLog } from '@/lib/api'
import { QuickActionMenu } from '@/components/QuickActionMenu'
import type { Project } from '@/types/database'
import type { TaskEntry } from '@/lib/queue-task-map'
import type { FundingRecord } from './types'
import { STATUS_COLOR } from './types'
import { getSLA, getNextTask, getStuckTasks } from './helpers'
import { FundingBadge } from './FundingBadge'
import { LastActivity } from './LastActivity'
import { renderCardField } from './renderCardField'

export const QueueCard = React.memo(function QueueCard({ p, taskMap, onOpen, cardFields, selectMode, isSelected, onToggleSelect, fundingMap, currentUser, onRefresh, todayStr }: {
  p: Project
  taskMap: Record<string, TaskEntry>
  onOpen: (p: Project) => void
  cardFields: string[]
  selectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  fundingMap: Record<string, FundingRecord>
  currentUser: { name?: string; id?: string } | null
  onRefresh: () => void
  todayStr: string
}) {
  const sla = getSLA(p)
  const nextTask = getNextTask(p, taskMap)
  const stuck = getStuckTasks(p, taskMap)
  const cycle = daysAgo(p.sale_date) || daysAgo(p.stage_date)

  const metaFields = cardFields.filter(k => k !== 'name' && k !== 'stage')
  const showStageInHeader = cardFields.includes('stage')

  // Inline quick action states
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [showQuickNote, setShowQuickNote] = useState(false)
  const [quickNote, setQuickNote] = useState('')
  const [quickNoteSubmitting, setQuickNoteSubmitting] = useState(false)
  const [clearingBlocker, setClearingBlocker] = useState(false)
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null)

  const handleSetFollowUp = useCallback(async (date: string) => {
    if (!date) return
    try {
      await updateProject(p.id, { follow_up_date: date })
      setShowDatePicker(false)
      setFollowUpDate('')
      onRefresh()
    } catch (err) {
      console.error('Failed to set follow-up date:', err)
      setToast({ message: 'Failed to set follow-up date. Please try again.', type: 'error' }); setTimeout(() => setToast(null), 3000)
    }
  }, [p.id, onRefresh])

  const handleClearBlocker = useCallback(async () => {
    if (!p.blocker) return
    if (!window.confirm(`Clear blocker on ${p.name}?`)) return
    setClearingBlocker(true)
    try {
      // Log to audit
      await insertAuditLog({
        project_id: p.id,
        field: 'blocker',
        old_value: p.blocker,
        new_value: null,
        changed_by: currentUser?.name ?? 'unknown',
        changed_by_id: currentUser?.id ?? null,
      })
      await updateProject(p.id, { blocker: null })
      onRefresh()
    } finally {
      setClearingBlocker(false)
    }
  }, [p.id, p.name, p.blocker, currentUser, onRefresh])

  const handleQuickNote = useCallback(async () => {
    if (!quickNote.trim()) return
    setQuickNoteSubmitting(true)
    try {
      await addNote({
        project_id: p.id,
        text: quickNote.trim(),
        time: new Date().toISOString(),
        pm: currentUser?.name ?? null,
        pm_id: currentUser?.id ?? null,
      })
      setQuickNote('')
      setShowQuickNote(false)
    } catch (err) {
      console.error('Failed to add note:', err)
      setToast({ message: 'Failed to add note. Please try again.', type: 'error' }); setTimeout(() => setToast(null), 3000)
      // Note text is preserved on failure — not cleared
    } finally {
      setQuickNoteSubmitting(false)
    }
  }, [quickNote, p.id, currentUser])

  return (
    <div className="mb-3">
      <div
        onClick={() => {
          if (selectMode && onToggleSelect) {
            onToggleSelect(p.id)
          } else {
            onOpen(p)
          }
        }}
        className={`group bg-gray-800 hover:bg-gray-700 border rounded-xl p-4 cursor-pointer transition-colors relative ${
          isSelected ? 'border-green-500 ring-1 ring-green-500/30' : 'border-gray-700'
        }`}
      >
        {selectMode && (
          <SelectCheckbox selected={!!isSelected} />
        )}
        <div className="flex items-start gap-3">
          {/* Priority dot */}
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            p.blocker ? 'bg-red-500' : STATUS_COLOR[sla.status]
          }`} />

          <div className="flex-1 min-w-0">
            {/* Name + ID + stage + funding */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white text-sm">{p.name}</span>
              <span className="text-xs text-gray-500">{p.id}</span>
              {showStageInHeader && <>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-green-400">{STAGE_LABELS[p.stage]}</span>
              </>}
              <FundingBadge funding={fundingMap[p.id]} />
            </div>

            {/* Meta row driven by cardFields */}
            {metaFields.length > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 flex-wrap">
                {metaFields.map((key, i) => {
                  const el = renderCardField(key, p)
                  if (!el) return null
                  return <span key={key} className="flex items-center gap-1">{i > 0 && <span className="text-gray-600 mx-1">·</span>}{el}</span>
                })}
              </div>
            )}

            {/* Blocker */}
            {p.blocker && (
              <div className="mt-2 text-xs text-red-400 bg-red-950 rounded-lg px-3 py-1.5 flex items-center gap-2">
                <span className="flex-1">{p.blocker}</span>
                {!selectMode && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleClearBlocker() }}
                    className="text-red-500 hover:text-red-300 transition-colors flex-shrink-0"
                    title="Clear blocker"
                    disabled={clearingBlocker}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Stuck tasks */}
            {stuck.length > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                {stuck.map(t => (
                  <div key={t.name} className={`flex items-baseline gap-1.5 text-xs rounded-lg px-2.5 py-1 ${
                    t.status === 'Pending Resolution'
                      ? 'bg-red-950 text-red-300'
                      : 'bg-amber-950 text-amber-300'
                  }`}>
                    <span>{t.status === 'Pending Resolution' ? '⏸' : '↩'}</span>
                    <span className="font-medium">{t.name}</span>
                    {t.reason && (
                      <>
                        <span className="opacity-50">--</span>
                        <span className="opacity-75">{t.reason}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Next task */}
            {!p.blocker && stuck.length === 0 && nextTask && (
              <div className="mt-2 text-xs text-gray-400">
                Next: <span className="text-white">{nextTask}</span>
              </div>
            )}
          </div>

          {/* Right side — SLA + cycle + last activity + quick actions */}
          <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
            <div className={`text-sm font-bold font-mono ${
              p.blocker ? 'text-red-400' :
              sla.status === 'crit' ? 'text-red-400' :
              sla.status === 'risk' ? 'text-amber-400' :
              sla.status === 'warn' ? 'text-yellow-400' :
              'text-gray-400'
            }`}>{sla.days}d</div>
            <div className="text-xs text-gray-600">{cycle}d total</div>
            <LastActivity p={p} />
            {/* Quick action icons */}
            {!selectMode && (
              <div className="flex items-center gap-1.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDatePicker(!showDatePicker) }}
                  className="text-gray-500 hover:text-green-400 transition-colors p-0.5"
                  title="Set follow-up date"
                >
                  <Calendar className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowQuickNote(!showQuickNote) }}
                  className="text-gray-500 hover:text-blue-400 transition-colors p-0.5"
                  title="Quick note"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Inline follow-up date picker */}
      {showDatePicker && !selectMode && (
        <div className="mt-1 ml-5 flex items-center gap-2 bg-gray-850 rounded-lg px-3 py-2 border border-gray-700" onClick={e => e.stopPropagation()}>
          <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <input
            type="date"
            value={followUpDate}
            onChange={e => setFollowUpDate(e.target.value)}
            min={todayStr}
            className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-green-500"
            autoFocus
          />
          <button
            onClick={() => handleSetFollowUp(followUpDate)}
            disabled={!followUpDate}
            className="text-xs px-2 py-1 rounded bg-green-700 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Set
          </button>
          <button
            onClick={() => { setShowDatePicker(false); setFollowUpDate('') }}
            className="text-xs text-gray-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inline quick note */}
      {showQuickNote && !selectMode && (
        <div className="mt-1 ml-5 flex items-center gap-2 bg-gray-850 rounded-lg px-3 py-2 border border-gray-700" onClick={e => e.stopPropagation()}>
          <MessageSquare className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <input
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleQuickNote() }}
            placeholder="Add a note..."
            className="flex-1 text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:border-green-500 placeholder-gray-500"
            autoFocus
          />
          <button
            onClick={handleQuickNote}
            disabled={!quickNote.trim() || quickNoteSubmitting}
            className="text-xs px-2 py-1 rounded bg-green-700 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {quickNoteSubmitting ? '...' : 'Add'}
          </button>
          <button
            onClick={() => { setShowQuickNote(false); setQuickNote('') }}
            className="text-xs text-gray-500 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
        }`}>{toast.message}</div>
      )}
    </div>
  )
})
