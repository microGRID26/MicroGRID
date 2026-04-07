'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/db'
import { cn, fmtDate } from '@/lib/utils'
import { handleApiError } from '@/lib/errors'
import type { ChangeOrder } from '@/types/database'
import { X, Check } from 'lucide-react'
import {
  STATUSES, PRIORITIES, TYPES, REASONS, ORIGINS,
  WORKFLOW_STEPS, STATUS_STYLE, PRIORITY_STYLE,
  COMPARISON_FIELDS, workflowProgress,
} from './constants'
import { ComparisonRow } from './ComparisonRow'

export function ChangeOrderDetailPanel({ order, users, currentUser, onClose, onUpdated, onOpenProject }: {
  order: ChangeOrder
  users: { id: string; name: string }[]
  currentUser: { id: string; name: string; isAdmin: boolean } | null
  onClose: () => void
  onUpdated: (co: ChangeOrder) => void
  onOpenProject: (pid: string) => void
}) {
  const supabase = createClient()
  const [co, setCo] = useState<ChangeOrder>(order)
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Sync when parent changes selection
  useEffect(() => {
    setCo(order)
    setNewNote('')
  }, [order.id])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function updateField(field: string, value: string | number | null) {
    const updates = { [field]: value, updated_at: new Date().toISOString() }
    const { error } = await db().from('change_orders').update(updates).eq('id', co.id)
    if (error) {
      handleApiError(error, '[change-orders] update')
      showToast('Save failed')
      return
    }
    const updated = { ...co, ...updates }
    setCo(updated)
    onUpdated(updated)
  }

  async function toggleWorkflowStep(key: string) {
    const current = co[key as keyof ChangeOrder]
    const newVal = !current
    const updates: Record<string, any> = { [key]: newVal, updated_at: new Date().toISOString() }

    // Count completed steps after this toggle
    let doneAfter = 0
    for (const step of WORKFLOW_STEPS) {
      const val = step.key === key ? newVal : co[step.key as keyof ChangeOrder]
      if (val) doneAfter++
    }

    // Auto-advance status based on workflow progress
    if (doneAfter === WORKFLOW_STEPS.length && co.status !== 'Complete') {
      updates.status = 'Complete'
    } else if (doneAfter > 0 && co.status === 'Open') {
      updates.status = 'In Progress'
    } else if (doneAfter === 0 && co.status === 'In Progress') {
      updates.status = 'Open'
    }

    const { error } = await db().from('change_orders').update(updates).eq('id', co.id)
    if (error) {
      handleApiError(error, '[change-orders] workflow step')
      return
    }
    const updated = { ...co, ...updates }
    setCo(updated)
    onUpdated(updated)

    if (updates.status === 'Complete') showToast('All steps done — marked Complete')
    else if (updates.status === 'In Progress') showToast('Workflow started — In Progress')
    else showToast(newVal ? 'Step completed' : 'Step unchecked')
  }

  async function addNote() {
    if (!newNote.trim()) return
    setSaving(true)
    const now = new Date()
    const stamp = now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
      + ' ' + now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const by = currentUser?.name ?? 'Unknown'
    const entry = `${stamp} ${by} - ${newNote.trim()}`
    const updated = co.notes ? `${entry}\n\n${co.notes}` : entry
    await updateField('notes', updated)
    setNewNote('')
    setSaving(false)
    showToast('Note added')
  }

  const wp = workflowProgress(co)

  return (
    <div className="w-full lg:w-[480px] xl:w-[540px] bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden flex-shrink-0">
      {/* Toast */}
      {toast && (
        <div className="absolute top-4 right-4 bg-gray-700 text-white text-xs px-4 py-2 rounded-lg shadow-lg z-10">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500 font-mono">CO-{co.id}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_STYLE[co.status])}>
                {co.status}
              </span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full', PRIORITY_STYLE[co.priority])}>
                {co.priority}
              </span>
            </div>
            <h3 className="text-base font-bold text-white truncate">{co.title}</h3>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <button onClick={() => onOpenProject(co.project_id)} className="text-green-400 hover:text-green-300 hover:underline">
                {co.project?.name ?? co.project_id}
              </button>
              <span className="text-gray-600">({co.project_id})</span>
              {co.assigned_to && <><span>·</span><span>Assigned: {co.assigned_to}</span></>}
              {co.created_by && <><span>·</span><span>By: {co.created_by}</span></>}
              {co.created_at && <><span>·</span><span>{fmtDate(co.created_at.slice(0, 10))}</span></>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl ml-3 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Status:</span>
            <select value={co.status}
              onChange={e => updateField('status', e.target.value)}
              className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Priority:</span>
            <select value={co.priority}
              onChange={e => updateField('priority', e.target.value)}
              className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Assigned:</span>
            <select value={co.assigned_to ?? ''}
              onChange={e => updateField('assigned_to', e.target.value || null)}
              className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500">
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>

        {/* Type / Reason / Origin */}
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Type:</span>
            <select value={co.type}
              onChange={e => updateField('type', e.target.value)}
              className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Reason:</span>
            <select value={co.reason ?? ''}
              onChange={e => updateField('reason', e.target.value || null)}
              className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500">
              <option value="">None</option>
              {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Origin:</span>
            <select value={co.origin ?? ''}
              onChange={e => updateField('origin', e.target.value || null)}
              className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded px-2 py-1 focus:outline-none focus:border-green-500">
              <option value="">None</option>
              {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Workflow Checklist */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Design Workflow</span>
            <span className="text-gray-500 normal-case font-normal">{wp.done}/{wp.total} steps</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
            <div
              className={cn('h-full rounded-full transition-all duration-300',
                wp.done === wp.total ? 'bg-green-500' : 'bg-green-600'
              )}
              style={{ width: `${(wp.done / wp.total) * 100}%` }}
            />
          </div>
          <div className="space-y-1">
            {WORKFLOW_STEPS.map((step, i) => {
              const checked = co[step.key as keyof ChangeOrder] as boolean
              return (
                <button key={step.key}
                  onClick={() => toggleWorkflowStep(step.key)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                    checked ? 'bg-green-900/20 hover:bg-green-900/30' : 'hover:bg-gray-800'
                  )}>
                  <div className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                    checked ? 'bg-green-600 border-green-600' : 'border-gray-600'
                  )}>
                    {checked && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={cn('text-xs', checked ? 'text-green-300 line-through' : 'text-gray-300')}>
                    {i + 1}. {step.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Design Comparison */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Design Comparison</div>
          <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-3 gap-0 px-3 py-2 bg-gray-800/50 border-b border-gray-800">
              <span className="text-xs text-gray-500 font-medium">Field</span>
              <span className="text-xs text-gray-500 font-medium text-center">Original</span>
              <span className="text-xs text-gray-500 font-medium text-center">New</span>
            </div>
            {COMPARISON_FIELDS.map(f => (
              <ComparisonRow key={f.label} field={f} co={co} updateField={updateField} />
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Design Notes</div>
          <div className="flex gap-2 mb-2">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addNote() }}
              placeholder="Add a note..."
              className="flex-1 bg-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none placeholder-gray-600"
            />
            <button onClick={addNote} disabled={!newNote.trim() || saving}
              className="text-xs px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50 transition-colors">
              {saving ? '...' : 'Add'}
            </button>
          </div>
          {co.notes ? (
            <div className="bg-gray-800 rounded-lg px-3 py-2 max-h-48 overflow-y-auto">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{co.notes}</pre>
            </div>
          ) : (
            <div className="text-xs text-gray-600 text-center py-3">No notes yet</div>
          )}
        </div>
      </div>
    </div>
  )
}
