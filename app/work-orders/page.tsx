'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Nav } from '@/components/Nav'
import { ProjectPanel } from '@/components/project/ProjectPanel'
import { cn, fmtDate } from '@/lib/utils'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { loadWorkOrders } from '@/lib/api/work-orders'
import type { WorkOrder, WorkOrderFilters } from '@/lib/api/work-orders'
import type { Project } from '@/types/database'
import { loadProjectById } from '@/lib/api'
import { useRealtimeSubscription } from '@/lib/hooks'
import { ClipboardList, Plus, ChevronDown, ChevronUp, Download } from 'lucide-react'

import { CreateWOModal } from './components/CreateWOModal'
import { WODetail } from './components/WODetail'
import { Toast } from './components/Toast'
import { WO_TYPES, WO_STATUSES, STATUS_BADGE, STATUS_LABEL, PRIORITY_BADGE, TYPE_LABEL } from './components/constants'

// ── Main Page ────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [projectPanel, setProjectPanel] = useState<Project | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' } | null>(null)

  const showToast = useCallback((message: string, type?: 'success' | 'error') => {
    setToast({ message, type })
  }, [])

  const load = useCallback(async () => {
    const filters: WorkOrderFilters = {}
    if (statusFilter !== 'all') filters.status = statusFilter
    if (typeFilter !== 'all') filters.type = typeFilter
    const data = await loadWorkOrders(filters)
    setWorkOrders(data)
    setLoading(false)
  }, [statusFilter, typeFilter])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useRealtimeSubscription('work_orders', {
    onChange: useCallback(() => load(), [load]),
  })

  // Open project panel
  async function handleOpenProject(projectId: string) {
    const data = await loadProjectById(projectId)
    if (data) setProjectPanel(data)
  }

  // Filter + search
  const filtered = useMemo(() => {
    let result = workOrders
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter(wo => {
        if (wo.wo_number.toLowerCase().includes(q)) return true
        if (wo.project_id.toLowerCase().includes(q)) return true
        if (wo.project?.name?.toLowerCase().includes(q)) return true
        if (wo.assigned_crew?.toLowerCase().includes(q)) return true
        if (wo.assigned_to?.toLowerCase().includes(q)) return true
        return false
      })
    }
    return result
  }, [workOrders, search])

  // Stats
  const stats = useMemo(() => ({
    open: workOrders.filter(wo => wo.status === 'draft' || wo.status === 'assigned').length,
    inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
    completedToday: workOrders.filter(wo => {
      if (wo.status !== 'complete' || !wo.completed_at) return false
      return wo.completed_at.slice(0, 10) === new Date().toISOString().slice(0, 10)
    }).length,
    total: workOrders.length,
  }), [workOrders])

  // ── CSV Export ──────────────────────────────────────────────────────────────
  function exportCSV() {
    const headers = ['WO Number', 'Project ID', 'Type', 'Status', 'Assigned Crew', 'Assigned To', 'Scheduled Date', 'Priority', 'Started At', 'Completed At', 'Time On Site (min)']
    const rows = filtered.map(wo => [
      wo.wo_number,
      wo.project_id,
      TYPE_LABEL[wo.type] ?? wo.type,
      STATUS_LABEL[wo.status] ?? wo.status,
      wo.assigned_crew ?? '',
      wo.assigned_to ?? '',
      wo.scheduled_date ?? '',
      wo.priority ?? '',
      wo.started_at ? wo.started_at.slice(0, 19).replace('T', ' ') : '',
      wo.completed_at ? wo.completed_at.slice(0, 19).replace('T', ' ') : '',
      wo.time_on_site_minutes ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `work-orders-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-green-400 text-sm animate-pulse">Loading work orders...</div>
      </div>
    )
  }

  if (currentUser && !currentUser.isManager) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">You don&apos;t have permission to view this page.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <Nav active="Work Orders" />

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 sm:px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-400" />
              Work Orders
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Field work tracking and completion</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            aria-label="Create new work order"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Work Order
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Open', value: stats.open, color: 'text-blue-400' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-amber-400' },
            { label: 'Completed Today', value: stats.completedToday, color: 'text-green-400' },
            { label: 'Total', value: stats.total, color: 'text-white' },
          ].map(card => (
            <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <div className={cn('text-2xl font-bold', card.color)}>{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-gray-900 border-b border-gray-800 flex flex-wrap items-center gap-3 px-4 sm:px-6 py-2">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search WO#, project, crew..."
          className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-3 py-1.5 w-52 focus:outline-none focus:border-green-500 placeholder-gray-500"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1.5">
          <option value="all">All Statuses</option>
          {WO_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1.5">
          <option value="all">All Types</option>
          {WO_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} work order{filtered.length !== 1 ? 's' : ''}</span>
        <button onClick={exportCSV} aria-label="Export work orders to CSV"
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors shrink-0">
          <Download className="w-3 h-3" /> Export
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-3 sm:px-6 py-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            <div className="text-sm">
              {workOrders.length === 0
                ? 'No work orders yet. Create one to get started.'
                : 'No work orders found matching your filters.'}
            </div>
            {workOrders.length === 0 && (
              <button onClick={() => setShowCreate(true)}
                className="mt-3 text-sm text-green-400 hover:text-green-300">Create your first work order</button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(wo => (
              <div key={wo.id}>
                {/* Row */}
                <button
                  onClick={() => setExpandedId(expandedId === wo.id ? null : wo.id)}
                  aria-label={expandedId === wo.id ? `Collapse ${wo.wo_number}` : `Expand ${wo.wo_number}`}
                  className={cn(
                    'w-full text-left bg-gray-800 rounded-lg px-4 py-3 hover:bg-gray-750 transition-colors border',
                    expandedId === wo.id ? 'border-green-700' : 'border-gray-800'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-5">
                      {expandedId === wo.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="w-32 flex-shrink-0">
                      <span className="text-sm font-medium text-white">{wo.wo_number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-300 truncate block">
                        {wo.project?.name ?? wo.project_id}
                      </span>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <span className="text-xs text-gray-400">{TYPE_LABEL[wo.type] ?? wo.type}</span>
                    </div>
                    <div className="w-28 flex-shrink-0 hidden lg:block">
                      <span className="text-xs text-gray-400">{wo.assigned_crew ?? '---'}</span>
                    </div>
                    <div className="w-24 flex-shrink-0 hidden lg:block">
                      <span className="text-xs text-gray-400">{wo.scheduled_date ? fmtDate(wo.scheduled_date) : '---'}</span>
                    </div>
                    <div className="w-20 flex-shrink-0 hidden lg:block">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', PRIORITY_BADGE[wo.priority])}>
                        {wo.priority}
                      </span>
                    </div>
                    <div className="w-24 flex-shrink-0">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full', STATUS_BADGE[wo.status])}>
                        {STATUS_LABEL[wo.status]}
                      </span>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {expandedId === wo.id && (
                  <div className="mt-2 mb-4">
                    <WODetail
                      woId={wo.id}
                      onClose={() => setExpandedId(null)}
                      onUpdated={load}
                      onOpenProject={handleOpenProject}
                      showToast={showToast}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateWOModal
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}

      {/* ProjectPanel */}
      {projectPanel && (
        <ProjectPanel
          project={projectPanel}
          onClose={() => setProjectPanel(null)}
          onProjectUpdated={load}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  )
}
