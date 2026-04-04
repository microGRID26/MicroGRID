import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  loadRepDocuments, loadCommissionRecords, loadProjects,
  updateSalesRep, loadRepNotes, addRepNote, deleteRepNote,
  calculateOverride, computeRepScorecards,
  REP_STATUSES, REP_STATUS_LABELS, REP_STATUS_BADGE,
  DOC_STATUS_LABELS, DOC_STATUS_BADGE,
} from '@/lib/api'
import type { SalesTeam, SalesRep, PayScale, OnboardingRequirement, OnboardingDocument, RepNote, RepScorecard } from '@/lib/api'
import type { Project } from '@/types/database'
import { fmtDate, fmt$ } from '@/lib/utils'
import { Pagination } from '@/components/Pagination'
import {
  ChevronDown, ChevronUp, Plus, X, Pencil, Download,
  Search, CheckCircle,
} from 'lucide-react'
import { AddRepModal } from './AddRepModal'

export function PersonnelTab({ reps, teams, payScales, requirements, orgId, isAdmin, onRefresh }: {
  reps: SalesRep[]
  teams: SalesTeam[]
  payScales: PayScale[]
  requirements: OnboardingRequirement[]
  orgId: string | null
  isAdmin: boolean
  onRefresh: () => void
}) {
  const [search, setSearch] = useState('')
  const [filterTeam, setFilterTeam] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  type SortCol = 'last_name' | 'email' | 'team' | 'pay_scale' | 'role_key' | 'status' | 'hire_date'
  const [sortCol, setSortCol] = useState<SortCol>('last_name')
  const [sortAsc, setSortAsc] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [repDocs, setRepDocs] = useState<Map<string, OnboardingDocument[]>>(new Map())
  const [repCommissions, setRepCommissions] = useState<Map<string, { total: number; paid: number; pending: number; count: number; projects: { id: string; amount: number; status: string }[] }>>(new Map())
  const [repNotes, setRepNotes] = useState<Map<string, RepNote[]>>(new Map())
  const [scorecards, setScorecards] = useState<Map<string, RepScorecard>>(new Map())

  useEffect(() => {
    if (reps.length === 0) return
    async function loadScorecardData() {
      const [projResult, commRecords] = await Promise.all([
        loadProjects({ orgId: orgId ?? undefined }),
        loadCommissionRecords(),
      ])
      const projects = (Array.isArray(projResult) ? projResult : (projResult as { data?: unknown[] })?.data ?? []) as Project[]
      const cards = computeRepScorecards(reps, projects, commRecords)
      const map = new Map<string, RepScorecard>()
      cards.forEach(c => map.set(c.repId, c))
      setScorecards(map)
    }
    loadScorecardData()
  }, [reps, orgId])
  const [editingRepId, setEditingRepId] = useState<string | null>(null)
  const [repDraft, setRepDraft] = useState<{ recheck_id: string; blacklisted: boolean; blacklist_reason: string; notes: string }>({ recheck_id: '', blacklisted: false, blacklist_reason: '', notes: '' })
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 50

  const teamMap = useMemo(() => {
    const m = new Map<string, SalesTeam>()
    teams.forEach(t => m.set(t.id, t))
    return m
  }, [teams])

  const scaleMap = useMemo(() => {
    const m = new Map<string, PayScale>()
    payScales.forEach(s => m.set(s.id, s))
    return m
  }, [payScales])

  const loadDocs = useCallback(async (repId: string) => {
    const docs = await loadRepDocuments(repId)
    setRepDocs(prev => new Map(prev).set(repId, docs))
  }, [])

  const loadNotes = useCallback(async (repId: string) => {
    const notes = await loadRepNotes(repId)
    setRepNotes(prev => new Map(prev).set(repId, notes))
  }, [])

  const loadRepCommissions = useCallback(async (rep: SalesRep) => {
    const records = await loadCommissionRecords({ userId: rep.user_id ?? undefined })
    const summary = { total: 0, paid: 0, pending: 0, count: records.length, projects: [] as { id: string; amount: number; status: string }[] }
    for (const r of records) {
      if (r.status === 'cancelled') continue
      summary.total += r.total_commission ?? 0
      if (r.status === 'paid') summary.paid += r.total_commission ?? 0
      if (r.status === 'pending' || r.status === 'approved') summary.pending += r.total_commission ?? 0
      summary.projects.push({ id: r.project_id, amount: r.total_commission ?? 0, status: r.status })
    }
    setRepCommissions(prev => new Map(prev).set(rep.id, summary))
  }, [])

  const startEditRep = useCallback((rep: SalesRep) => {
    setEditingRepId(rep.id)
    setRepDraft({
      recheck_id: rep.recheck_id ?? '',
      blacklisted: rep.blacklisted ?? false,
      blacklist_reason: rep.blacklist_reason ?? '',
      notes: rep.notes ?? '',
    })
  }, [])

  const saveRepFields = useCallback(async (repId: string) => {
    await updateSalesRep(repId, {
      recheck_id: repDraft.recheck_id || null,
      blacklisted: repDraft.blacklisted,
      blacklist_reason: repDraft.blacklisted ? (repDraft.blacklist_reason || null) : null,
      notes: repDraft.notes || null,
    })
    setEditingRepId(null)
    onRefresh()
  }, [repDraft, onRefresh])

  const toggleExpand = useCallback((repId: string) => {
    if (expandedId === repId) {
      setExpandedId(null)
    } else {
      setExpandedId(repId)
      if (!repDocs.has(repId)) loadDocs(repId)
      if (!repNotes.has(repId)) loadNotes(repId)
      const rep = reps.find(r => r.id === repId)
      if (rep && !repCommissions.has(repId)) loadRepCommissions(rep)
    }
  }, [expandedId, repDocs, loadDocs, repNotes, loadNotes, reps, repCommissions, loadRepCommissions])

  const filtered = useMemo(() => {
    let list = [...reps]
    const q = search.toLowerCase().trim()
    if (q) {
      list = list.filter(r =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q)
      )
    }
    if (filterTeam) list = list.filter(r => r.team_id === filterTeam)
    if (filterStatus) list = list.filter(r => r.status === filterStatus)

    list.sort((a, b) => {
      let cmp = 0
      switch (sortCol) {
        case 'last_name': cmp = a.last_name.localeCompare(b.last_name); break
        case 'email': cmp = a.email.localeCompare(b.email); break
        case 'team': {
          const at = a.team_id ? teamMap.get(a.team_id)?.name ?? '' : ''
          const bt = b.team_id ? teamMap.get(b.team_id)?.name ?? '' : ''
          cmp = at.localeCompare(bt); break
        }
        case 'pay_scale': {
          const as2 = a.pay_scale_id ? scaleMap.get(a.pay_scale_id)?.name ?? '' : ''
          const bs = b.pay_scale_id ? scaleMap.get(b.pay_scale_id)?.name ?? '' : ''
          cmp = as2.localeCompare(bs); break
        }
        case 'role_key': cmp = a.role_key.localeCompare(b.role_key); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'hire_date': cmp = (a.hire_date ?? '').localeCompare(b.hire_date ?? ''); break
      }
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [reps, search, filterTeam, filterStatus, sortCol, sortAsc, teamMap, scaleMap])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortAsc(!sortAsc)
    else { setSortCol(col); setSortAsc(true) }
  }

  const SortIcon = ({ col }: { col: SortCol }) => (
    sortCol === col
      ? sortAsc ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />
      : null
  )

  const exportCSV = () => {
    const header = ['Name', 'Email', 'Phone', 'Team', 'Pay Scale', 'Role', 'Status', 'Hire Date']
    const rows = filtered.map(r => [
      `${r.first_name} ${r.last_name}`,
      r.email,
      r.phone ?? '',
      r.team_id ? teamMap.get(r.team_id)?.name ?? '' : '',
      r.pay_scale_id ? scaleMap.get(r.pay_scale_id)?.name ?? '' : '',
      r.role_key,
      r.status,
      r.hire_date ?? '',
    ])
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `sales-reps-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const daysColor = (d: number | null | undefined) => {
    if (d == null) return 'text-gray-600'
    if (d <= 14) return 'text-green-400'
    if (d <= 30) return 'text-amber-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search reps..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <select value={filterTeam} onChange={e => { setFilterTeam(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
          <option value="">All Teams</option>
          {teams.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
          <option value="">All Status</option>
          {REP_STATUSES.map(s => <option key={s} value={s}>{REP_STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-md">
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md">
          <Plus className="w-3.5 h-3.5" /> Add Rep
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700 text-[10px] uppercase tracking-wider text-gray-400">
                {([
                  ['last_name', 'Name'], ['email', 'Email'], ['team', 'Team'], ['pay_scale', 'Pay Scale'],
                  ['role_key', 'Role'], ['status', 'Status'], ['hire_date', 'Hire Date'],
                ] as [SortCol, string][]).map(([col, label]) => (
                  <th key={col} className="px-4 py-2 font-medium cursor-pointer hover:text-white" onClick={() => toggleSort(col)}>
                    {label} <SortIcon col={col} />
                  </th>
                ))}
                <th className="px-4 py-2 font-medium">Onboarding</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(rep => {
                const team = rep.team_id ? teamMap.get(rep.team_id) : null
                const scale = rep.pay_scale_id ? scaleMap.get(rep.pay_scale_id) : null
                const docs = repDocs.get(rep.id) ?? []
                const reqCount = requirements.filter(r => r.active && r.required).length
                const verifiedCount = docs.filter(d => d.status === 'verified').length
                const isExpanded = expandedId === rep.id

                return (
                  <React.Fragment key={rep.id}>
                    <tr
                      className={`border-b border-gray-700/50 hover:bg-gray-750 cursor-pointer text-xs transition-colors ${isExpanded ? 'bg-gray-750' : ''}`}
                      onClick={() => toggleExpand(rep.id)}
                    >
                      <td className="px-4 py-2.5 text-white font-medium">{rep.first_name} {rep.last_name}</td>
                      <td className="px-4 py-2.5 text-gray-400">{rep.email}</td>
                      <td className="px-4 py-2.5 text-gray-300">{team?.name ?? <span className="text-gray-600">--</span>}</td>
                      <td className="px-4 py-2.5 text-gray-300">{scale?.name ?? <span className="text-gray-600">--</span>}</td>
                      <td className="px-4 py-2.5 text-gray-300 capitalize">{rep.role_key.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${REP_STATUS_BADGE[rep.status]}`}>
                          {REP_STATUS_LABELS[rep.status]}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400">{fmtDate(rep.hire_date)}</td>
                      <td className="px-4 py-2.5">
                        {rep.status === 'onboarding' && reqCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${reqCount > 0 ? (verifiedCount / reqCount) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-400">{verifiedCount}/{reqCount}</span>
                          </div>
                        ) : rep.status === 'active' ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <span className="text-gray-600">--</span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-4 py-4 bg-gray-900/50 border-b border-gray-700">
                          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Contact</h4>
                                {isAdmin && editingRepId !== rep.id && (
                                  <button onClick={(e) => { e.stopPropagation(); startEditRep(rep) }} className="text-[10px] text-blue-400 hover:text-blue-300">
                                    <Pencil className="w-3 h-3 inline mr-0.5" />Edit
                                  </button>
                                )}
                              </div>
                              {editingRepId === rep.id ? (
                                <div className="text-xs space-y-2" onClick={e => e.stopPropagation()}>
                                  <p className="text-gray-300">{rep.email}</p>
                                  {rep.phone && <p className="text-gray-400">{rep.phone}</p>}
                                  <div>
                                    <label className="text-[10px] text-gray-500">RECHECK ID</label>
                                    <input value={repDraft.recheck_id} onChange={e => setRepDraft(d => ({ ...d, recheck_id: e.target.value }))}
                                      className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white font-mono" placeholder="e.g. RC-12345" />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-[10px] text-gray-500">Blacklisted</label>
                                    <button onClick={() => setRepDraft(d => ({ ...d, blacklisted: !d.blacklisted }))}
                                      className={`w-8 h-4 rounded-full transition-colors ${repDraft.blacklisted ? 'bg-red-500' : 'bg-gray-600'}`}>
                                      <div className={`w-3 h-3 rounded-full bg-white transition-transform mx-0.5 ${repDraft.blacklisted ? 'translate-x-4' : ''}`} />
                                    </button>
                                  </div>
                                  {repDraft.blacklisted && (
                                    <div>
                                      <label className="text-[10px] text-gray-500">Blacklist Reason</label>
                                      <input value={repDraft.blacklist_reason} onChange={e => setRepDraft(d => ({ ...d, blacklist_reason: e.target.value }))}
                                        className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" placeholder="Reason..." />
                                    </div>
                                  )}
                                  <div>
                                    <label className="text-[10px] text-gray-500">Notes</label>
                                    <textarea value={repDraft.notes} onChange={e => setRepDraft(d => ({ ...d, notes: e.target.value }))}
                                      rows={2} className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white resize-none" placeholder="Internal notes..." />
                                  </div>
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => saveRepFields(rep.id)} className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-[10px] text-white font-medium">Save</button>
                                    <button onClick={() => setEditingRepId(null)} className="px-2 py-1 text-gray-400 hover:text-white text-[10px]">Cancel</button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs space-y-1">
                                  <p className="text-gray-300">{rep.email}</p>
                                  {rep.phone && <p className="text-gray-400">{rep.phone}</p>}
                                  {rep.recheck_id && <p><span className="text-gray-500">RECHECK ID:</span> <span className="text-gray-300 font-mono">{rep.recheck_id}</span></p>}
                                  {rep.blacklisted && (
                                    <p className="text-red-400 text-[10px] font-medium">
                                      BLACKLISTED{rep.blacklist_reason ? `: ${rep.blacklist_reason}` : ''}
                                    </p>
                                  )}
                                  {rep.notes && <p className="text-gray-500 text-[10px]">{rep.notes}</p>}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Assignment</h4>
                              <div className="text-xs space-y-1">
                                <p><span className="text-gray-500">Team:</span> <span className="text-gray-300">{team?.name ?? 'Unassigned'}</span></p>
                                <p><span className="text-gray-500">Pay Scale:</span> <span className="text-gray-300">{scale ? `${scale.name} ($${scale.per_watt_rate}/W)` : '\u2014'}</span></p>
                                <p><span className="text-gray-500">Role:</span> <span className="text-gray-300 capitalize">{rep.role_key.replace(/_/g, ' ')}</span></p>
                                {team && scale && (
                                  <p className="text-green-400 text-[10px] font-medium">
                                    Override: ${calculateOverride(Number(team.stack_per_watt), Number(scale.per_watt_rate), 1000).overridePerWatt.toFixed(2)}/W
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Documents</h4>
                              {docs.length > 0 ? (
                                <div className="space-y-1">
                                  {docs.map(doc => {
                                    const req = requirements.find(r => r.id === doc.requirement_id)
                                    return (
                                      <div key={doc.id} className="flex items-center justify-between text-[10px] py-0.5">
                                        <span className="text-gray-300">{req?.name ?? 'Unknown'}</span>
                                        <span className={`px-1.5 py-0.5 rounded font-medium ${DOC_STATUS_BADGE[doc.status]}`}>
                                          {DOC_STATUS_LABELS[doc.status]}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <p className="text-[10px] text-gray-500">No documents</p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <h4 className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Commission History</h4>
                              {(() => {
                                const cs = repCommissions.get(rep.id)
                                if (!cs) return <p className="text-[10px] text-gray-500">Loading...</p>
                                if (cs.count === 0) return <p className="text-[10px] text-gray-500">No commission records</p>
                                return (
                                  <div className="text-xs space-y-1">
                                    <p><span className="text-gray-500">Deals:</span> <span className="text-gray-300">{cs.count}</span></p>
                                    <p><span className="text-gray-500">Total:</span> <span className="text-white font-medium">{fmt$(cs.total)}</span></p>
                                    <p><span className="text-gray-500">Paid:</span> <span className="text-green-400">{fmt$(cs.paid)}</span></p>
                                    <p><span className="text-gray-500">Pending:</span> <span className="text-amber-400">{fmt$(cs.pending)}</span></p>
                                    {cs.projects.length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-700/50 space-y-0.5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Projects</p>
                                        {cs.projects.slice(0, 8).map((p) => (
                                          <div key={`${p.id}-${p.status}`} className="flex items-center justify-between">
                                            <span className="text-blue-400 text-[10px]">{p.id}</span>
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-300 text-[10px]">{fmt$(p.amount)}</span>
                                              <span className={`text-[9px] px-1 rounded ${p.status === 'paid' ? 'bg-green-900/40 text-green-400' : p.status === 'pending' ? 'bg-amber-900/40 text-amber-400' : 'bg-gray-700 text-gray-400'}`}>
                                                {p.status}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                        {cs.projects.length > 8 && (
                                          <p className="text-[10px] text-gray-500">+ {cs.projects.length - 8} more</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                          </div>

                          {/* Rep Scorecard */}
                          <div className="mt-3 pt-3 border-t border-gray-700/50">
                            {(() => {
                              const cs = repCommissions.get(rep.id)
                              const sc = scorecards.get(rep.id)
                              return (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                  <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Deals</div>
                                    <div className="text-lg font-bold text-white">{sc?.totalDeals ?? cs?.count ?? 0}</div>
                                    <div className="text-[9px] text-gray-500">{sc ? `${Math.round(sc.totalKw)} kW total` : ''}</div>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Total Earned</div>
                                    <div className="text-lg font-bold text-green-400">{fmt$(cs?.total ?? 0)}</div>
                                    <div className="text-[9px] text-gray-500">{cs && cs.count > 0 ? `${fmt$(cs.total / cs.count)} avg` : ''}</div>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Paid</div>
                                    <div className="text-lg font-bold text-emerald-400">{fmt$(cs?.paid ?? 0)}</div>
                                    <div className="text-[9px] text-amber-400">{cs && cs.pending > 0 ? `${fmt$(cs.pending)} pending` : ''}</div>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Last Commission</div>
                                    <div className={`text-lg font-bold ${daysColor(sc?.daysSinceLastCommission)}`}>{sc?.daysSinceLastCommission != null ? `${sc.daysSinceLastCommission}d` : '\u2014'}</div>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Last Sale</div>
                                    <div className={`text-lg font-bold ${daysColor(sc?.daysSinceLastSale)}`}>{sc?.daysSinceLastSale != null ? `${sc.daysSinceLastSale}d` : '\u2014'}</div>
                                  </div>
                                  <div className="bg-gray-800/50 rounded-lg p-2.5 text-center">
                                    <div className="text-[10px] text-gray-500 uppercase">Last Install</div>
                                    <div className={`text-lg font-bold ${daysColor(sc?.daysSinceLastInstall)}`}>{sc?.daysSinceLastInstall != null ? `${sc.daysSinceLastInstall}d` : '\u2014'}</div>
                                  </div>
                                </div>
                              )
                            })()}
                          </div>

                          {/* Notes Section */}
                          <div className="mt-3 pt-3 border-t border-gray-700/50">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-[10px] uppercase text-gray-500 font-medium tracking-wider">Notes</h4>
                              <span className="text-[9px] text-gray-600">{repNotes.get(rep.id)?.length ?? 0} notes</span>
                            </div>
                            {(repNotes.get(rep.id) ?? []).length > 0 ? (
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {(repNotes.get(rep.id) ?? []).map(note => (
                                  <div key={note.id} className="flex justify-between items-start group">
                                    <div>
                                      <span className="text-[10px] text-gray-500">{new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {note.author} — </span>
                                      <span className="text-[11px] text-gray-300">{note.text}</span>
                                    </div>
                                    {isAdmin && (
                                      <button onClick={async (e) => { e.stopPropagation(); await deleteRepNote(note.id); loadNotes(rep.id) }}
                                        className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 ml-2 flex-shrink-0">
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-gray-600">No notes yet</p>
                            )}
                            <div className="mt-2 flex gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                placeholder="Add a note..."
                                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                    const input = e.target as HTMLInputElement
                                    const userName = document.cookie.match(/mg_user_name=([^;]+)/)?.[1] ?? 'Admin'
                                    await addRepNote(rep.id, input.value.trim(), decodeURIComponent(userName))
                                    input.value = ''
                                    loadNotes(rep.id)
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">No reps found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          hasMore={page < totalPages}
          onPrevPage={() => setPage(p => Math.max(1, p - 1))}
          onNextPage={() => setPage(p => Math.min(totalPages, p + 1))}
        />
      )}

      {showAdd && (
        <AddRepModal
          onClose={() => setShowAdd(false)}
          onSaved={onRefresh}
          orgId={orgId}
          teams={teams}
          payScales={payScales}
        />
      )}
    </div>
  )
}
