import { useState, useMemo } from 'react'
import { searchProjects } from '@/lib/api'
import {
  TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_SOURCES,
} from '@/lib/api/tickets'
import type { TicketCategory } from '@/lib/api/tickets'
import { X } from 'lucide-react'

interface CreateTicketModalProps {
  categories: TicketCategory[]
  users: { id: string; name: string }[]
  creating: boolean
  onClose: () => void
  onCreate: (form: {
    title: string; description: string; category: string; subcategory: string;
    priority: string; source: string; project_id: string; assigned_to: string;
  }) => void
}

export function CreateTicketModal({ categories, users, creating, onClose, onCreate }: CreateTicketModalProps) {
  const [createForm, setCreateForm] = useState({
    title: '', description: '', category: 'service', subcategory: '',
    priority: 'normal', source: 'internal', project_id: '', assigned_to: '',
  })
  const [projectSearch, setProjectSearch] = useState('')
  const [projectResults, setProjectResults] = useState<{ id: string; name: string }[]>([])
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)

  const subcategories = useMemo(() => {
    return categories.filter(c => c.category === createForm.category && c.subcategory)
  }, [categories, createForm.category])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">New Ticket</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Title *</label>
            <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Brief description of the issue"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Description</label>
            <textarea value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="Full details..."
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white resize-none focus:outline-none focus:border-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Category</label>
              <select value={createForm.category} onChange={e => setCreateForm(f => ({ ...f, category: e.target.value, subcategory: '' }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
                {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Subcategory</label>
              <select value={createForm.subcategory} onChange={e => setCreateForm(f => ({ ...f, subcategory: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
                <option value="">-- General --</option>
                {subcategories.map(c => <option key={c.id} value={c.subcategory!}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Priority</label>
              <select value={createForm.priority} onChange={e => setCreateForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
                {TICKET_PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Source</label>
              <select value={createForm.source} onChange={e => setCreateForm(f => ({ ...f, source: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
                {TICKET_SOURCES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Project (search by name or ID)</label>
            <div className="relative">
              <input value={projectSearch || createForm.project_id}
                onChange={async e => {
                  const v = e.target.value
                  setProjectSearch(v)
                  setCreateForm(f => ({ ...f, project_id: '' }))
                  if (v.length >= 2) {
                    const results = await searchProjects(v)
                    setProjectResults(results.slice(0, 8))
                    setShowProjectDropdown(true)
                  } else {
                    setShowProjectDropdown(false)
                  }
                }}
                onFocus={() => projectResults.length > 0 && setShowProjectDropdown(true)}
                onBlur={() => setTimeout(() => setShowProjectDropdown(false), 200)}
                placeholder="Search project name or PROJ-XXXXX..."
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
              {showProjectDropdown && projectResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-xl max-h-48 overflow-y-auto">
                  {projectResults.map(p => (
                    <button key={p.id} onClick={() => { setCreateForm(f => ({ ...f, project_id: p.id })); setProjectSearch(`${p.name} (${p.id})`); setShowProjectDropdown(false) }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-gray-700 transition-colors">
                      <span className="text-green-400 font-mono">{p.id}</span>
                      <span className="text-gray-300 ml-2">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Assign To</label>
            <select value={createForm.assigned_to} onChange={e => setCreateForm(f => ({ ...f, assigned_to: e.target.value }))}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
              <option value="">Unassigned</option>
              {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
          <button onClick={() => onCreate(createForm)} disabled={creating || !createForm.title.trim()}
            className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-medium rounded-md">
            {creating ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
