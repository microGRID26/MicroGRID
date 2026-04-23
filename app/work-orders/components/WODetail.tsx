'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn, fmtDate } from '@/lib/utils'
import { useCurrentUser } from '@/lib/useCurrentUser'
import {
  loadWorkOrder, updateWorkOrderStatus,
  addChecklistItem, toggleChecklistItem, deleteChecklistItem, updateChecklistItemNotes, uploadChecklistPhoto, updateWorkOrder,
  getValidTransitions,
} from '@/lib/api/work-orders'
import type { WorkOrder, WOChecklistItem } from '@/lib/api/work-orders'
import { X, Check, Trash2, Camera } from 'lucide-react'
import { STATUS_BADGE, STATUS_LABEL, PRIORITY_BADGE, TYPE_LABEL } from './constants'
import ChecklistPhotoThumbnail from '@/components/storage/ChecklistPhotoThumbnail'

export function WODetail({
  woId,
  onClose,
  onUpdated,
  onOpenProject,
  showToast,
}: {
  woId: string
  onClose: () => void
  onUpdated: () => void
  onOpenProject: (projectId: string) => void
  showToast: (msg: string, type?: 'success' | 'error') => void
}) {
  const { user: currentUser } = useCurrentUser()
  const [wo, setWO] = useState<WorkOrder | null>(null)
  const [checklist, setChecklist] = useState<WOChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [notes, setNotes] = useState('')
  const [timeOnSite, setTimeOnSite] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const result = await loadWorkOrder(woId)
    if (result) {
      setWO(result.wo)
      setChecklist(result.checklist)
      setNotes(result.wo.notes ?? '')
      setTimeOnSite(result.wo.time_on_site_minutes?.toString() ?? '')
    }
    setLoading(false)
  }, [woId])

  useEffect(() => { load() }, [load])

  async function handleStatusAdvance() {
    if (!wo) return
    const transitions = getValidTransitions(wo.status)
    // Pick the next logical status (first non-cancelled)
    const next = transitions.find(s => s !== 'cancelled')
    if (!next) return
    const ok = await updateWorkOrderStatus(wo.id, next)
    if (ok) { load(); onUpdated() } else { showToast('Failed to update status', 'error') }
  }

  async function handleCancel() {
    if (!wo || !confirm('Cancel this work order?')) return
    const ok = await updateWorkOrderStatus(wo.id, 'cancelled')
    if (ok) { load(); onUpdated() } else { showToast('Failed to cancel work order', 'error') }
  }

  async function handleAddItem() {
    if (!newItem.trim() || !wo) return
    const result = await addChecklistItem(wo.id, newItem.trim())
    if (result) {
      setNewItem('')
      load()
    } else {
      showToast('Failed to add checklist item', 'error')
    }
  }

  async function handleToggleItem(item: WOChecklistItem) {
    await toggleChecklistItem(item.id, !item.completed, currentUser?.name ?? 'Unknown')
    load()
  }

  async function handleDeleteItem(itemId: string) {
    const ok = await deleteChecklistItem(itemId)
    if (ok) {
      load()
    } else {
      showToast('Failed to delete checklist item', 'error')
    }
  }

  async function handleSaveNotes() {
    if (!wo) return
    setSaving(true)
    await updateWorkOrder(wo.id, {
      notes,
      time_on_site_minutes: timeOnSite ? parseInt(timeOnSite, 10) : null,
    })
    setSaving(false)
    onUpdated()
  }

  async function handleSignature() {
    if (!wo) return
    await updateWorkOrder(wo.id, {
      customer_signature: true,
      customer_signed_at: new Date().toISOString(),
    })
    load()
  }

  if (loading) return (
    <div className="bg-gray-800 rounded-xl p-6 animate-pulse">
      <div className="h-4 w-32 bg-gray-700 rounded mb-4" />
      <div className="h-4 w-48 bg-gray-700 rounded" />
    </div>
  )

  if (!wo) return <div className="text-red-400 text-sm p-4">Work order not found</div>

  const completedCount = checklist.filter(c => c.completed).length
  const totalCount = checklist.length
  const transitions = getValidTransitions(wo.status)
  const nextStatus = transitions.find(s => s !== 'cancelled')

  return (
    <div className="bg-gray-850 border border-gray-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-white font-bold text-lg">{wo.wo_number}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_BADGE[wo.status])}>{STATUS_LABEL[wo.status]}</span>
            <span className={cn('text-xs px-2 py-0.5 rounded-full', PRIORITY_BADGE[wo.priority])}>{wo.priority}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-400">{TYPE_LABEL[wo.type] ?? wo.type}</span>
            {wo.project && (
              <button onClick={() => onOpenProject(wo.project_id)}
                className="text-sm text-green-400 hover:text-green-300">{wo.project.name} ({wo.project_id})</button>
            )}
          </div>
        </div>
        <button onClick={onClose} aria-label="Close work order detail" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
      </div>

      <div className="px-5 py-4 space-y-5">
        {/* Assignment info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 text-xs block">Crew</span>
            <span className="text-white">{wo.assigned_crew ?? '---'}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Assigned To</span>
            <span className="text-white">{wo.assigned_to ?? '---'}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Scheduled</span>
            <span className="text-white">{wo.scheduled_date ? fmtDate(wo.scheduled_date) : '---'}</span>
          </div>
          <div>
            <span className="text-gray-500 text-xs block">Time on Site</span>
            <span className="text-white">{wo.time_on_site_minutes ? `${wo.time_on_site_minutes} min` : '---'}</span>
          </div>
        </div>

        {/* Description */}
        {wo.description && (
          <div>
            <span className="text-xs text-gray-500 block mb-1">Description</span>
            <p className="text-sm text-gray-300">{wo.description}</p>
          </div>
        )}

        {/* Special Instructions */}
        {wo.special_instructions && (
          <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
            <span className="text-xs text-amber-400 font-medium block mb-1">Special Instructions</span>
            <p className="text-sm text-amber-200">{wo.special_instructions}</p>
          </div>
        )}

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              Checklist
              {totalCount > 0 && (
                <span className={cn('text-xs', completedCount === totalCount ? 'text-green-400' : 'text-gray-500')}>
                  {completedCount}/{totalCount}
                </span>
              )}
            </h3>
            {totalCount > 0 && (
              <div className="w-24 bg-gray-700 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            {checklist.map(item => (
              <div key={item.id} className="group py-1">
                <div className="flex items-center gap-3">
                  <button onClick={() => handleToggleItem(item)}
                    className={cn(
                      'w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                      item.completed
                        ? 'bg-green-600 border-green-500 text-white'
                        : 'border-gray-600 hover:border-green-500'
                    )}>
                    {item.completed && <Check className="w-3 h-3" />}
                  </button>
                  <span className={cn('text-sm flex-1', item.completed ? 'text-gray-500 line-through' : 'text-gray-300')}>
                    {item.description}
                  </span>
                  {item.completed_by && (
                    <span className="text-xs text-gray-600">{item.completed_by}</span>
                  )}
                  {/* Photo capture */}
                  <label className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-blue-400 transition-opacity cursor-pointer">
                    <Camera className="w-3 h-3" />
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const result = await uploadChecklistPhoto(item.id, file)
                      if (result) {
                        item.photo_url = result.url
                        item.photo_path = result.path
                        setChecklist([...checklist])
                      }
                    }} />
                  </label>
                  <button onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-opacity">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                {/* Photo thumbnail + notes */}
                <div className="ml-8 mt-0.5 space-y-1">
                  {(item.photo_path || item.photo_url) && (
                    <ChecklistPhotoThumbnail
                      path={item.photo_path}
                      legacyUrl={item.photo_url}
                      size={16}
                    />
                  )}
                  <input
                    defaultValue={item.notes ?? ''}
                    placeholder="Add note..."
                    onBlur={async (e) => {
                      const val = e.target.value.trim() || null
                      if (val !== (item.notes ?? null)) {
                        await updateChecklistItemNotes(item.id, val)
                        item.notes = val
                      }
                    }}
                    className="w-full text-[11px] text-gray-500 bg-transparent border-none outline-none placeholder:text-gray-700 focus:text-gray-300 focus:placeholder:text-gray-600"
                  />
                </div>
              </div>
            ))}
          </div>
          {/* Add item */}
          <div className="flex gap-2 mt-3">
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddItem() }}
              placeholder="Add checklist item..."
              className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-500" />
            <button onClick={handleAddItem} disabled={!newItem.trim()}
              className="text-xs text-green-400 hover:text-green-300 px-3 py-1.5 disabled:text-gray-600">Add</button>
          </div>
        </div>

        {/* Notes + Time on Site */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Time on Site (minutes)</label>
            <input type="number" value={timeOnSite} onChange={e => setTimeOnSite(e.target.value)}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
            <button onClick={handleSaveNotes} disabled={saving}
              className="mt-2 text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors">
              {saving ? 'Saving...' : 'Save Notes'}
            </button>
          </div>
        </div>

        {/* Customer Signature */}
        <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-3">
          <div>
            <span className="text-sm text-gray-300 font-medium">Customer Signature</span>
            {wo.customer_signed_at && (
              <span className="text-xs text-gray-500 block">Signed {fmtDate(wo.customer_signed_at)}</span>
            )}
          </div>
          {wo.customer_signature ? (
            <span className="text-green-400 text-sm flex items-center gap-1"><Check className="w-4 h-4" /> Signed</span>
          ) : (
            <button onClick={handleSignature}
              className="text-xs bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg transition-colors">
              Collect Signature
            </button>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {nextStatus && (
            <button onClick={handleStatusAdvance}
              className="text-sm bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors">
              {nextStatus === 'assigned' ? 'Assign' : nextStatus === 'in_progress' ? 'Start Work' : 'Mark Complete'}
            </button>
          )}
          {transitions.includes('cancelled') && (
            <button onClick={handleCancel}
              className="text-sm text-gray-400 hover:text-red-400 px-4 py-2.5 rounded-lg border border-gray-700 hover:border-red-700 transition-colors">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
