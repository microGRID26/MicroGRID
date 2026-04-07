'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Nav } from '@/components/Nav'
import { ProjectPanel } from '@/components/project/ProjectPanel'
import { cn, fmtDate, daysAgo } from '@/lib/utils'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useOrg, useRealtimeSubscription } from '@/lib/hooks'
import {
  loadAssignments, loadAssignmentQueue, updateAssignmentStatus,
  ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUS_BADGE, ASSIGNMENT_TYPE_LABELS,
} from '@/lib/api/engineering'
import { loadEngineeringConfig } from '@/lib/api/engineering-config'
import type { EngineeringConfig } from '@/lib/api/engineering-config'
import type { EngineeringAssignment, AssignmentStatus } from '@/lib/api/engineering'
import type { Project } from '@/types/database'
import { loadProjectById, loadOrgNames } from '@/lib/api'
import { db } from '@/lib/db'
import {
  Ruler, Plus, ChevronDown, ChevronUp, X, Search, Download,
} from 'lucide-react'
import { SubmitAssignmentModal } from './components/SubmitAssignmentModal'
import { AssignmentDetail } from './components/AssignmentDetail'
import { SummaryCard } from './components/SummaryCard'

// ── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_BADGE: Record<string, string> = {
  low: 'bg-gray-700 text-gray-300',
  normal: 'bg-blue-900 text-blue-300',
  high: 'bg-amber-900 text-amber-300',
  urgent: 'bg-red-900 text-red-300',
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function EngineeringPage() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const { orgId, orgType, orgName, loading: orgLoading } = useOrg()
  const isEngineering = orgType === 'engineering'
  const isPlatform = orgType === 'platform'

  const [assignments, setAssignments] = useState<EngineeringAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | ''>('')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [sortCol, setSortCol] = useState<'created_at' | 'status' | 'due_date' | 'project_id'>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [orgMap, setOrgMap] = useState<Record<string, string>>({})
  const [projectMap, setProjectMap] = useState<Record<string, { id: string; name: string; stage: string; pm: string | null; financier: string | null; systemkw: number | null; contract: number | null }>>({})
  const [engConfig, setEngConfig] = useState<EngineeringConfig | null>(null)

  // Load engineering config (for auto-routing)
  useEffect(() => {
    loadEngineeringConfig().then(setEngConfig)
  }, [])

  // Load assignments
  const loadData = useCallback(async () => {
    if (!orgId && !isPlatform) return
    setLoading(true)

    const data = (isEngineering || isPlatform)
      ? await loadAssignmentQueue(statusFilter || undefined)
      : await loadAssignments(orgId, statusFilter || undefined)
    setAssignments(data)

    // Load project details and org names in parallel
    const projectIds = [...new Set(data.map(r => r.project_id))]
    const allOrgIds = [...new Set([
      ...data.map(r => r.requesting_org),
      ...data.map(r => r.assigned_org),
    ])]
    const supabase = db()

    const [projectResult, orgNameMap] = await Promise.all([
      projectIds.length > 0
        ? supabase.from('projects').select('id, name, stage, pm, financier, systemkw, contract').in('id', projectIds).limit(500)
        : Promise.resolve({ data: null }),
      loadOrgNames(allOrgIds),
    ])

    if (projectResult.data) {
      const pMap: Record<string, typeof projectMap[string]> = {}
      for (const p of projectResult.data as typeof projectMap[string][]) {
        pMap[p.id] = p
      }
      setProjectMap(pMap)
    }

    setOrgMap(orgNameMap)

    setLoading(false)
  }, [orgId, isEngineering, isPlatform, statusFilter])

  useEffect(() => { loadData() }, [loadData])

  // Realtime subscription
  useRealtimeSubscription('engineering_assignments', {
    event: '*',
    onChange: loadData,
    debounceMs: 500,
  })

  // Status change handler
  async function handleStatusChange(assignment: EngineeringAssignment, newStatus: AssignmentStatus) {
    const result = await updateAssignmentStatus(assignment.id, newStatus)
    if (result) loadData()
  }

  // Priority change handler
  async function handlePriorityChange(assignment: EngineeringAssignment, newPriority: string) {
    const supabase = db()
    const { error } = await supabase
      .from('engineering_assignments')
      .update({ priority: newPriority })
      .eq('id', assignment.id)
    if (!error) loadData()
  }

  // Open project panel
  async function openProjectPanel(projectId: string) {
    const data = await loadProjectById(projectId)
    if (data) setOpenProject(data)
  }

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...assignments]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r => {
        const pName = projectMap[r.project_id]?.name?.toLowerCase() ?? ''
        return r.project_id.toLowerCase().includes(q) || pName.includes(q) || (r.assigned_to?.toLowerCase().includes(q))
      })
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortCol === 'created_at') cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      else if (sortCol === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortCol === 'project_id') cmp = a.project_id.localeCompare(b.project_id)
      else if (sortCol === 'due_date') {
        const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
        const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
        cmp = da - db
      }
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [assignments, search, sortCol, sortAsc, projectMap])

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { total: assignments.length, pending: 0, assigned: 0, in_progress: 0, review: 0, revision_needed: 0, complete: 0, cancelled: 0 }
    for (const r of assignments) {
      if (r.status in c) c[r.status]++
    }
    return c
  }, [assignments])

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(false) }
  }

  // CSV Export
  function exportCSV() {
    const headers = ['Project ID', 'Project Name', 'Type', 'Status', 'Priority', 'Engineering Partner', 'EPC', 'Assigned To', 'Due Date', 'Created', 'Revisions', 'Notes']
    const rows = filtered.map(r => [
      r.project_id,
      projectMap[r.project_id]?.name ?? '',
      ASSIGNMENT_TYPE_LABELS[r.assignment_type] ?? r.assignment_type,
      ASSIGNMENT_STATUS_LABELS[r.status] ?? r.status,
      r.priority,
      orgMap[r.assigned_org] ?? '',
      orgMap[r.requesting_org] ?? '',
      r.assigned_to ?? '',
      r.due_date ?? '',
      r.created_at?.slice(0, 10) ?? '',
      String(r.revision_count),
      r.notes ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `engineering-assignments-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function sortIcon(col: typeof sortCol) {
    return sortCol === col ? (sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />) : null
  }

  // Loading state
  if (userLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Nav active="Engineering" />
        <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
      </div>
    )
  }

  // Auth gate: require authenticated user
  if (!userLoading && !currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Please sign in to view this page.</div>
      </div>
    )
  }

  // Role gate: Manager+
  if (currentUser && !currentUser.isManager) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-sm">You don&apos;t have permission to view this page.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Nav active="Engineering" />

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Ruler className="w-6 h-6 text-green-400" />
              {isEngineering ? 'My Assignments' : 'Engineering Assignments'}
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              {isEngineering
                ? 'Design assignments from EPC partners'
                : isPlatform
                  ? 'All engineering assignments across organizations'
                  : 'Track engineering work assigned to design partners'}
            </p>
          </div>
          {!isEngineering && (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Submit Assignment
            </button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isEngineering ? (
            <>
              <SummaryCard label="New" value={counts.pending} color="amber" onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')} active={statusFilter === 'pending'} />
              <SummaryCard label="In Progress" value={counts.in_progress + counts.assigned} color="cyan" onClick={() => setStatusFilter(statusFilter === 'in_progress' ? '' : 'in_progress')} active={statusFilter === 'in_progress'} />
              <SummaryCard label="In Review" value={counts.review} color="purple" onClick={() => setStatusFilter(statusFilter === 'review' ? '' : 'review')} active={statusFilter === 'review'} />
              <SummaryCard label="Complete" value={counts.complete} color="green" onClick={() => setStatusFilter(statusFilter === 'complete' ? '' : 'complete')} active={statusFilter === 'complete'} />
            </>
          ) : (
            <>
              <SummaryCard label="Pending" value={counts.pending} color="amber" onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')} active={statusFilter === 'pending'} />
              <SummaryCard label="In Progress" value={counts.in_progress + counts.assigned} color="cyan" onClick={() => setStatusFilter(statusFilter === 'in_progress' ? '' : 'in_progress')} active={statusFilter === 'in_progress'} />
              <SummaryCard label="In Review" value={counts.review} color="purple" onClick={() => setStatusFilter(statusFilter === 'review' ? '' : 'review')} active={statusFilter === 'review'} />
              <SummaryCard label="Complete" value={counts.complete} color="green" onClick={() => setStatusFilter(statusFilter === 'complete' ? '' : 'complete')} active={statusFilter === 'complete'} />
            </>
          )}
        </div>

        {/* Search + Export */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by project ID, name, or assignee..."
              className="w-full bg-gray-900 text-white border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-green-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={exportCSV} aria-label="Export engineering assignments to CSV"
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors shrink-0">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">Loading assignments...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <Ruler className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-sm">{search || statusFilter ? 'No matching assignments' : 'No engineering assignments yet'}</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  <th className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white select-none" onClick={() => toggleSort('project_id')}>
                    Project {sortIcon('project_id')}
                  </th>
                  <th className="px-4 py-3 text-gray-400 font-medium">
                    {isEngineering ? 'EPC' : 'Engineering Partner'}
                  </th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Type</th>
                  <th className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white select-none" onClick={() => toggleSort('status')}>
                    Status {sortIcon('status')}
                  </th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Priority</th>
                  <th className="px-4 py-3 text-gray-400 font-medium">Assigned To</th>
                  <th className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white select-none" onClick={() => toggleSort('due_date')}>
                    Due Date {sortIcon('due_date')}
                  </th>
                  <th className="px-4 py-3 text-gray-400 font-medium cursor-pointer hover:text-white select-none" onClick={() => toggleSort('created_at')}>
                    Created {sortIcon('created_at')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(assignment => {
                  const project = projectMap[assignment.project_id]
                  const isExpanded = expandedId === assignment.id
                  const isOverdue = assignment.due_date && new Date(assignment.due_date) < new Date() && assignment.status !== 'complete' && assignment.status !== 'cancelled'

                  return (
                    <tr key={assignment.id} className="border-b border-gray-800/50 last:border-0">
                      <td className="px-4 py-3" colSpan={8}>
                        <div className="flex items-center">
                          {/* Expand toggle */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : assignment.id)}
                            className="text-gray-500 hover:text-white mr-2"
                            aria-label={isExpanded ? `Collapse details for ${assignment.project_id}` : `Expand details for ${assignment.project_id}`}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>

                          {/* Row content as grid to match headers */}
                          <div className="flex-1 grid grid-cols-8 items-center gap-4">
                            {/* Project */}
                            <button onClick={() => openProjectPanel(assignment.project_id)} className="text-left hover:text-green-400 text-green-400">
                              <div className="font-medium">{assignment.project_id}</div>
                              {project && <div className="text-xs text-gray-500 truncate">{project.name}</div>}
                            </button>

                            {/* Partner / EPC */}
                            <div className="text-gray-300 text-xs truncate">
                              {isEngineering
                                ? orgMap[assignment.requesting_org] ?? '—'
                                : orgMap[assignment.assigned_org] ?? '—'}
                            </div>

                            {/* Type */}
                            <div className="text-gray-300 text-xs">
                              {ASSIGNMENT_TYPE_LABELS[assignment.assignment_type] ?? assignment.assignment_type}
                            </div>

                            {/* Status */}
                            <div>
                              <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', ASSIGNMENT_STATUS_BADGE[assignment.status])}>
                                {ASSIGNMENT_STATUS_LABELS[assignment.status]}
                              </span>
                            </div>

                            {/* Priority */}
                            <div>
                              <span className={cn('inline-flex px-2 py-0.5 rounded text-xs font-medium', PRIORITY_BADGE[assignment.priority] ?? PRIORITY_BADGE.normal)}>
                                {assignment.priority.charAt(0).toUpperCase() + assignment.priority.slice(1)}
                              </span>
                            </div>

                            {/* Assigned To */}
                            <div className="text-gray-300 text-xs">{assignment.assigned_to ?? '—'}</div>

                            {/* Due Date */}
                            <div className={cn('text-xs', isOverdue ? 'text-red-400 font-medium' : 'text-gray-400')}>
                              {assignment.due_date ? fmtDate(assignment.due_date) : '—'}
                              {isOverdue && <div className="text-red-500 text-[10px]">Overdue</div>}
                            </div>

                            {/* Created */}
                            <div className="text-gray-400 text-xs">
                              {fmtDate(assignment.created_at)}
                              <div className="text-gray-600">{daysAgo(assignment.created_at)}d ago</div>
                            </div>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <AssignmentDetail
                            assignment={assignment}
                            project={project ?? null}
                            isEngineering={isEngineering}
                            isPlatform={isPlatform}
                            onStatusChange={(status) => handleStatusChange(assignment, status)}
                            onPriorityChange={(priority) => handlePriorityChange(assignment, priority)}
                            onOpenProject={openProjectPanel}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmitModal && orgId && currentUser && (
        <SubmitAssignmentModal
          onClose={() => setShowSubmitModal(false)}
          onSubmitted={loadData}
          orgId={orgId}
          userId={currentUser.id}
          userName={currentUser.name}
          engineeringConfig={engConfig}
        />
      )}

      {/* Project Panel */}
      {openProject && (
        <ProjectPanel
          project={openProject}
          onClose={() => setOpenProject(null)}
          onProjectUpdated={loadData}
        />
      )}
    </div>
  )
}
