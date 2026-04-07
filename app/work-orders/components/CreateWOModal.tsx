'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { createWorkOrder, WO_CHECKLIST_TEMPLATES } from '@/lib/api/work-orders'
import { loadActiveCrews } from '@/lib/api'
import { X } from 'lucide-react'
import { WO_TYPES, WO_PRIORITIES, TYPE_LABEL } from './constants'

export function CreateWOModal({
  onClose,
  onCreated,
  prefill,
}: {
  onClose: () => void
  onCreated: () => void
  prefill?: { projectId?: string; projectName?: string; type?: string }
}) {
  const { user: currentUser } = useCurrentUser()
  const [projectId, setProjectId] = useState(prefill?.projectId ?? '')
  const [type, setType] = useState(prefill?.type ?? 'install')
  const [priority, setPriority] = useState('normal')
  const [scheduledDate, setScheduledDate] = useState('')
  const [crew, setCrew] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [description, setDescription] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [customChecklist, setCustomChecklist] = useState<string[]>([])
  const [newItem, setNewItem] = useState('')
  const [useDefaults, setUseDefaults] = useState(true)
  const [saving, setSaving] = useState(false)
  const [crews, setCrews] = useState<{ id: string; name: string }[]>([])

  // Load crews
  useEffect(() => {
    async function load() {
      const { data } = await loadActiveCrews()
      if (data) setCrews((data as { id: string; name: string }[]).map(c => ({ id: c.id, name: c.name })))
    }
    load()
  }, [])

  const defaultChecklist = WO_CHECKLIST_TEMPLATES[type] ?? []

  function addItem() {
    if (!newItem.trim()) return
    setCustomChecklist(prev => [...prev, newItem.trim()])
    setNewItem('')
  }

  async function handleCreate() {
    if (!projectId.trim()) return
    setSaving(true)

    const checklistItems = useDefaults
      ? [...defaultChecklist, ...customChecklist]
      : customChecklist

    const result = await createWorkOrder({
      project_id: projectId.trim(),
      type,
      status: crew ? 'assigned' : 'draft',
      assigned_crew: crew || null,
      assigned_to: assignedTo || null,
      scheduled_date: scheduledDate || null,
      started_at: null,
      completed_at: null,
      priority,
      description: description || null,
      special_instructions: specialInstructions || null,
      customer_signature: false,
      customer_signed_at: null,
      materials_used: [],
      time_on_site_minutes: null,
      notes: null,
      created_by: currentUser?.name ?? null,
    }, checklistItems.length > 0 ? checklistItems : undefined)

    setSaving(false)
    if (result) {
      onCreated()
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-lg font-bold text-white">Create Work Order</h2>
          <button onClick={onClose} aria-label="Close create work order dialog" className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Project ID */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Project ID *</label>
            <input
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              placeholder="PROJ-XXXXX"
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500"
            />
            {prefill?.projectName && (
              <div className="text-xs text-gray-500 mt-1">{prefill.projectName}</div>
            )}
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                {WO_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                {WO_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          {/* Crew + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Assigned Crew</label>
              <select value={crew} onChange={e => setCrew(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
                <option value="">-- None --</option>
                {crews.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Scheduled Date</label>
              <input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)}
                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Assigned To (person)</label>
            <input value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              placeholder="Name"
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>

          {/* Special Instructions */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Special Instructions</label>
            <textarea value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)}
              rows={2}
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">Checklist</label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={useDefaults} onChange={e => setUseDefaults(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-green-500" />
                <span className="text-xs text-gray-500">Use default template</span>
              </label>
            </div>
            {useDefaults && defaultChecklist.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-3 mb-2 space-y-1">
                {defaultChecklist.map((item, i) => (
                  <div key={i} className="text-xs text-gray-400 flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-gray-600 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
            )}
            {customChecklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-300 mb-1">
                <div className="w-3 h-3 rounded border border-green-600 flex-shrink-0" />
                {item}
                <button onClick={() => setCustomChecklist(prev => prev.filter((_, idx) => idx !== i))}
                  className="ml-auto text-gray-600 hover:text-red-400"><X className="w-3 h-3" /></button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input value={newItem} onChange={e => setNewItem(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addItem() }}
                placeholder="Add checklist item..."
                className="flex-1 bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-green-500" />
              <button onClick={addItem} className="text-xs text-green-400 hover:text-green-300 px-2">Add</button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-800">
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-white px-4 py-2">Cancel</button>
          <button onClick={handleCreate} disabled={saving || !projectId.trim()}
            className={cn(
              'text-xs px-4 py-2 rounded-lg font-medium transition-colors',
              projectId.trim() && !saving
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            )}>
            {saving ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
