'use client'

import { useState, useEffect, useRef } from 'react'
import { db } from '@/lib/db'
import { searchProjects } from '@/lib/api'
import { handleApiError } from '@/lib/errors'
import type { Project, ChangeOrder } from '@/types/database'
import { X } from 'lucide-react'
import { PRIORITIES, TYPES, REASONS, ORIGINS } from './constants'

export function NewChangeOrderModal({ users, currentUser, onClose, onCreated }: {
  users: { id: string; name: string }[]
  currentUser: { id: string; name: string; isAdmin: boolean } | null
  onClose: () => void
  onCreated: (co: ChangeOrder) => void
}) {
  const [projectSearch, setProjectSearch] = useState('')
  const [projectResults, setProjectResults] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [searching, setSearching] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<string>('HCO Change Order')
  const [reason, setReason] = useState<string>('')
  const [origin, setOrigin] = useState<string>('')
  const [priority, setPriority] = useState<string>('Medium')
  const [assignedTo, setAssignedTo] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mountedRef = useRef(true)
  useEffect(() => { return () => { mountedRef.current = false } }, [])

  // Debounced project search
  useEffect(() => {
    if (projectSearch.trim().length < 2) {
      setProjectResults([])
      return
    }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      const q = projectSearch.trim()
      const data = await searchProjects(q, 10)
      if (!mountedRef.current) return
      if (data) setProjectResults(data as Project[])
      setSearching(false)
    }, 250)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [projectSearch])

  function selectProject(p: Project) {
    setSelectedProject(p)
    setProjectSearch('')
    setProjectResults([])
    // Auto-populate title
    if (!title) setTitle(`Change Order - ${p.name}`)
  }

  async function handleCreate() {
    if (!selectedProject || !title.trim()) return
    setSaving(true)
    const p = selectedProject
    const now = new Date().toISOString()
    const payload = {
      project_id: selectedProject.id,
      title: title.trim(),
      status: 'Open',
      priority,
      type,
      reason: reason || null,
      origin: origin || null,
      assigned_to: assignedTo || null,
      created_by: currentUser?.name ?? null,
      created_at: now,
      updated_at: now,
      // Auto-populate original values from project
      original_panel_count: p.module_qty ?? null,
      original_panel_type: p.module ?? null,
      original_system_size: p.systemkw ?? null,
      original_plan_type: p.financing_type ?? null,
      original_lease_ppa_escalator: p.tpo_escalator ?? null,
      original_adv_pmt_schedule: p.financier_adv_pmt ?? null,
      original_loan_amount: p.down_payment ?? null,
    }
    const { data, error } = await db().from('change_orders').insert(payload).select('*, project:projects(name, city, pm, pm_id)').single()
    setSaving(false)
    if (data) {
      onCreated(data as ChangeOrder)
    } else {
      handleApiError(error, '[change-orders] create')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">New Change Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Project search */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Project *</label>
            {selectedProject ? (
              <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 border border-gray-700">
                <div>
                  <div className="text-xs text-white font-medium">{selectedProject.name}</div>
                  <div className="text-xs text-gray-500">{selectedProject.id} · {selectedProject.city}</div>
                </div>
                <button onClick={() => setSelectedProject(null)} className="text-gray-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  placeholder="Search by project name or ID..."
                  autoFocus
                  className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none placeholder-gray-500"
                />
                {searching && <div className="absolute right-3 top-2 text-xs text-gray-500">Searching...</div>}
                {projectResults.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {projectResults.map(p => (
                      <button key={p.id} onClick={() => selectProject(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0">
                        <div className="text-xs text-white">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.id} · {p.city} · {p.pm}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Production Adjustment - Panel Reduction"
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none placeholder-gray-500" />
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none">
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none">
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Reason + Origin */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Reason</label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none">
                <option value="">Select...</option>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Origin</label>
              <select value={origin} onChange={e => setOrigin(e.target.value)}
                className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none">
                <option value="">Select...</option>
                {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          {/* Assigned To */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Assigned To</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
              className="w-full bg-gray-800 text-white text-xs rounded-lg px-3 py-2 border border-gray-700 focus:border-green-500 focus:outline-none">
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>

          {/* Auto-populated preview */}
          {selectedProject && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Auto-populated from project:</div>
              <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 space-y-0.5">
                {selectedProject.module_qty && <div>Panel Count: <span className="text-gray-200">{selectedProject.module_qty}</span></div>}
                {selectedProject.module && <div>Panel Type: <span className="text-gray-200">{selectedProject.module}</span></div>}
                {selectedProject.systemkw && <div>System Size: <span className="text-gray-200">{selectedProject.systemkw} kW</span></div>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose}
            className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={handleCreate}
            disabled={!selectedProject || !title.trim() || saving}
            className="px-4 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Creating...' : 'Create Change Order'}
          </button>
        </div>
      </div>
    </div>
  )
}
