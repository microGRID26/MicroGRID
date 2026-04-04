import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useRealtimeSubscription } from '@/lib/hooks'
import { fmt$, fmtDate } from '@/lib/utils'
import { ProjectPanel } from '@/components/project/ProjectPanel'
import { Pagination } from '@/components/Pagination'
import { Download, DollarSign, TrendingUp, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import {
  loadCommissionRecords,
  updateCommissionRecord,
  loadEarningsSummary,
  loadHierarchy,
  getVisibleUserIds,
  COMMISSION_STATUS_LABELS,
  COMMISSION_STATUS_BADGE,
} from '@/lib/api'
import { calculateDaysSinceSale } from '@/lib/api/commission-advanced'
import { HeroCard } from './HeroCard'
import { ROLE_LABELS, PERIOD_LABELS, getPeriodStart } from './types'
import type { Period, SortCol } from './types'
import type { CommissionRate, CommissionRecord, Project } from '@/types/database'
import type { EarningsSummary } from '@/lib/api'

// ── Earnings Tab ─────────────────────────────────────────────────────────────

export function EarningsTab({ orgId, rates: loadedRates }: { orgId: string | null; rates: CommissionRate[] }) {
  const { user: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.isAdmin ?? false

  const [records, setRecords] = useState<CommissionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('month')
  const [userFilter, setUserFilter] = useState<string>('all')
  const [visibleUserIds, setVisibleUserIds] = useState<string[] | null>(null)
  const [search, setSearch] = useState('')
  const [sortCol, setSortCol] = useState<SortCol>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [projectMap, setProjectMap] = useState<Map<string, { sale_date: string | null; energy_community: boolean }>>(new Map())
  const pageSize = 50

  // Summary (enhanced with all-time + month)
  const [allTimeSummary, setAllTimeSummary] = useState<EarningsSummary | null>(null)
  const [monthSummary, setMonthSummary] = useState<EarningsSummary | null>(null)

  // 6-month trend data
  const [monthlyTrend, setMonthlyTrend] = useState<{ label: string; amount: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const periodStart = getPeriodStart(period)

      // Pay visibility: non-admins see own data + direct/indirect reports
      let userId: string | undefined
      if (!isAdmin && currentUser?.id) {
        if (userFilter !== 'all') {
          userId = userFilter
        } else {
          userId = currentUser.id
        }
        // Load hierarchy to determine visible users
        const hierarchy = await loadHierarchy(orgId)
        const visible = getVisibleUserIds(hierarchy, currentUser.id)
        setVisibleUserIds(visible)
      } else {
        userId = userFilter !== 'all' ? userFilter : undefined
        setVisibleUserIds(null)
      }

      const data = await loadCommissionRecords({
        orgId,
        userId,
        dateFrom: periodStart ?? undefined,
      })

      // For non-admins with hierarchy, also load records for visible reports
      let allData = data
      if (!isAdmin && visibleUserIds && visibleUserIds.length > 1 && userFilter === 'all') {
        const allRecs = await loadCommissionRecords({
          orgId,
          dateFrom: periodStart ?? undefined,
        })
        allData = allRecs.filter(r => r.user_id && visibleUserIds.includes(r.user_id))
      }

      setRecords(allData)

      // Load project sale_date + energy_community for days-since-sale and EC badge
      const projectIds = Array.from(new Set(data.map(r => r.project_id).filter(Boolean)))
      if (projectIds.length > 0) {
        const { db: getDb } = await import('@/lib/db')
        const supabase = getDb()
        const { data: projects } = await supabase
          .from('projects')
          .select('id, sale_date, energy_community')
          .in('id', projectIds.slice(0, 200))
        if (projects) {
          const map = new Map<string, { sale_date: string | null; energy_community: boolean }>()
          for (const p of projects as { id: string; sale_date: string | null; energy_community: boolean }[]) {
            map.set(p.id, { sale_date: p.sale_date, energy_community: p.energy_community ?? false })
          }
          setProjectMap(map)
        }
      }

      // Load all-time summary
      const ats = await loadEarningsSummary(userId, orgId)
      setAllTimeSummary(ats)

      // Load current month summary
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const ms = await loadEarningsSummary(userId, orgId, { from: monthStart })
      setMonthSummary(ms)

      // Build 6-month trend
      const trendStart = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const trendRecs = await loadCommissionRecords({
        userId,
        orgId,
        dateFrom: trendStart.toISOString(),
      })
      const trend: { label: string; amount: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('en-US', { month: 'short' })
        const mStart = d.getTime()
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime()
        const monthTotal = trendRecs
          .filter(r => {
            if (r.status === 'cancelled') return false
            const t = new Date(r.created_at).getTime()
            return t >= mStart && t <= mEnd
          })
          .reduce((sum, r) => sum + (r.total_commission ?? 0), 0)
        trend.push({ label, amount: Math.round(monthTotal * 100) / 100 })
      }
      setMonthlyTrend(trend)
    } catch (err) {
      console.error('Failed to load commission records:', err)
    }
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, period, userFilter, isAdmin, currentUser?.id])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, sortCol, sortDir, period, userFilter])

  // Realtime refresh
  useRealtimeSubscription('commission_records', {
    event: '*',
    onChange: () => load(),
  })

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>()
    records.forEach(r => {
      if (r.user_id && r.user_name) map.set(r.user_id, r.user_name)
    })
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [records])

  // Filter + sort
  const filtered = useMemo(() => {
    let list = [...records]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        (r.project_id?.toLowerCase().includes(q)) ||
        (r.user_name?.toLowerCase().includes(q))
      )
    }
    list.sort((a, b) => {
      let av: string | number | null | undefined
      let bv: string | number | null | undefined
      if (sortCol === 'days_since_sale') {
        av = calculateDaysSinceSale(projectMap.get(a.project_id)?.sale_date)
        bv = calculateDaysSinceSale(projectMap.get(b.project_id)?.sale_date)
      } else {
        av = a[sortCol as keyof CommissionRecord] as string | number | null | undefined
        bv = b[sortCol as keyof CommissionRecord] as string | number | null | undefined
      }
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return list
  }, [records, search, sortCol, sortDir])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const toggleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: SortCol }) => {
    if (sortCol !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-0.5" /> : <ChevronDown className="w-3 h-3 inline ml-0.5" />
  }

  // CSV export
  const exportCSV = () => {
    const headers = ['Project', 'User', 'Role', 'System kW', 'Solar $', 'Adder $', 'Referral $', 'Total', 'Status', 'Days', 'EC', 'Date']
    const rows = filtered.map(r => {
      const proj = projectMap.get(r.project_id)
      return [
        r.project_id,
        r.user_name ?? '',
        ROLE_LABELS[r.role_key] ?? r.role_key,
        r.system_watts ? (r.system_watts / 1000).toFixed(2) : '',
        r.solar_commission.toFixed(2),
        r.adder_commission.toFixed(2),
        r.referral_commission.toFixed(2),
        r.total_commission.toFixed(2),
        r.status,
        proj?.sale_date ? String(calculateDaysSinceSale(proj.sale_date)) : '',
        proj?.energy_community ? 'Yes' : 'No',
        r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `commissions-${period}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const maxTrend = Math.max(...monthlyTrend.map(m => m.amount), 1)

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
              period === p
                ? 'bg-green-700 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}

        {isAdmin && (
          <select
            value={userFilter}
            onChange={e => setUserFilter(e.target.value)}
            className="ml-auto bg-gray-800 border border-gray-700 text-sm text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-green-500"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Hero Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroCard
          label="YTD Earned"
          value={fmt$((function() {
            const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
            return records.filter(r => r.status !== 'cancelled' && r.created_at >= yearStart).reduce((s, r) => s + (r.total_commission ?? 0), 0)
          })())}
          icon={<DollarSign className="w-6 h-6" />}
          accent="green"
          subtitle={`${new Date().getFullYear()} year to date`}
        />
        <HeroCard
          label="This Month"
          value={fmt$(monthSummary?.totalEarned ?? 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          accent="blue"
          subtitle={`${(monthSummary?.byRole ?? []).reduce((s, r) => s + r.count, 0)} deals`}
        />
        <HeroCard
          label="Pending"
          value={fmt$(allTimeSummary?.totalPending ?? 0)}
          icon={<Clock className="w-6 h-6" />}
          accent="amber"
          subtitle="Awaiting approval"
        />
        <HeroCard
          label="Paid"
          value={fmt$(allTimeSummary?.totalPaid ?? 0)}
          icon={<CheckCircle className="w-6 h-6" />}
          accent="emerald"
          subtitle="In your pocket"
        />
      </div>

      {/* Earnings Trend Chart (last 6 months) */}
      {monthlyTrend.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Earnings Trend (Last 6 Months)
          </h3>
          <div className="flex items-end gap-3 h-40">
            {monthlyTrend.map((m, i) => {
              const pct = maxTrend > 0 ? (m.amount / maxTrend) * 100 : 0
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-green-400 font-medium">
                    {m.amount > 0 ? fmt$(m.amount) : ''}
                  </span>
                  <div className="w-full flex items-end justify-center" style={{ height: '120px' }}>
                    <div
                      className="w-full max-w-[48px] rounded-t-md transition-all duration-500"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        background: `linear-gradient(to top, #065f46, #10b981)`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400">{m.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Search + export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search project or user..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors">
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
        {isAdmin && (
          <button
            onClick={() => {
              // Payroll export: group by user, sum totals for the current period
              const byUser = new Map<string, { name: string; deals: number; solar: number; adder: number; referral: number; total: number }>()
              for (const r of filtered) {
                if (r.status === 'cancelled') continue
                const key = r.user_name ?? r.user_id ?? 'Unknown'
                const existing = byUser.get(key) ?? { name: key, deals: 0, solar: 0, adder: 0, referral: 0, total: 0 }
                existing.deals++
                existing.solar += r.solar_commission ?? 0
                existing.adder += r.adder_commission ?? 0
                existing.referral += r.referral_commission ?? 0
                existing.total += r.total_commission ?? 0
                byUser.set(key, existing)
              }
              const headers = ['Rep Name', 'Deals', 'Solar Commission', 'Adder Commission', 'Referral Commission', 'Total', 'Period']
              const rows = Array.from(byUser.values()).sort((a, b) => b.total - a.total).map(u => [
                u.name, String(u.deals), u.solar.toFixed(2), u.adder.toFixed(2), u.referral.toFixed(2), u.total.toFixed(2), period
              ])
              const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url; a.download = `payroll-${period}-${new Date().toISOString().split('T')[0]}.csv`; a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-800 border border-green-700 text-green-300 hover:text-white hover:bg-green-700 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Payroll CSV
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500 text-sm">Loading commissions...</div>
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
              <tr>
                {[
                  { key: 'project_id' as SortCol, label: 'Project' },
                  { key: 'user_name' as SortCol, label: 'User' },
                  { key: 'system_watts' as SortCol, label: 'System kW' },
                  { key: 'role_key' as SortCol, label: 'Role' },
                  { key: 'solar_commission' as SortCol, label: 'Solar $' },
                  { key: 'adder_commission' as SortCol, label: 'Adder $' },
                  { key: 'referral_commission' as SortCol, label: 'Referral $' },
                  { key: 'total_commission' as SortCol, label: 'Total' },
                  { key: 'days_since_sale' as SortCol, label: 'Days' },
                  { key: 'status' as SortCol, label: 'Status' },
                  { key: 'created_at' as SortCol, label: 'Date' },
                ].map(({ key, label }) => (
                  <th key={key} onClick={() => toggleSort(key)} className="text-left px-3 py-2.5 text-gray-400 font-medium cursor-pointer hover:text-white select-none">
                    {label} <SortIcon col={key} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => (
                <React.Fragment key={r.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors ${i % 2 === 0 ? '' : 'bg-gray-900/20'}`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); /* ProjectPanel opened via state below */ }}
                          className="text-blue-400 hover:text-blue-300 font-mono"
                        >
                          {r.project_id}
                        </button>
                        {projectMap.get(r.project_id)?.energy_community && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-900/40 text-green-400 border border-green-800">EC</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-white">{r.user_name || '\u2014'}</td>
                    <td className="px-3 py-2 text-gray-400">{r.system_watts ? (r.system_watts / 1000).toFixed(2) : '\u2014'}</td>
                    <td className="px-3 py-2 text-gray-400">{ROLE_LABELS[r.role_key] ?? r.role_key}</td>
                    <td className="px-3 py-2 text-gray-300 font-mono">{fmt$(r.solar_commission)}</td>
                    <td className="px-3 py-2 text-gray-300 font-mono">{fmt$(r.adder_commission)}</td>
                    <td className="px-3 py-2 text-gray-300 font-mono">{fmt$(r.referral_commission)}</td>
                    <td className="px-3 py-2 text-white font-medium font-mono">{fmt$(r.total_commission)}</td>
                    <td className="px-3 py-2">
                      {(() => {
                        const days = calculateDaysSinceSale(projectMap.get(r.project_id)?.sale_date)
                        if (!days) return <span className="text-gray-600">{'\u2014'}</span>
                        const color = days < 30 ? 'text-green-400' : days < 60 ? 'text-amber-400' : 'text-red-400'
                        return <span className={`font-mono ${color}`}>{days}</span>
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${COMMISSION_STATUS_BADGE[r.status] ?? 'bg-gray-800 text-gray-400 border border-gray-700'}`}>
                        {COMMISSION_STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{fmtDate(r.created_at)}</td>
                  </tr>
                  {expandedId === r.id && (
                    <tr key={`${r.id}-detail`}>
                      <td colSpan={11} className="bg-gray-850 px-6 py-4">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                          <p className="text-xs text-gray-400 font-medium mb-2">Commission Detail</p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-gray-500">Solar</p>
                              <p className="text-white">{r.system_watts?.toLocaleString() ?? 0} W x {(() => {
                                const rateInfo = loadedRates.find(lr => lr.role_key === r.role_key)
                                if (rateInfo?.rate_type === 'percentage') return `${r.rate}%`
                                if (rateInfo?.rate_type === 'flat') return `${fmt$(r.rate)} flat`
                                return `$${r.rate}/W`
                              })()} = {fmt$(r.solar_commission)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Adder</p>
                              <p className="text-white">{fmt$(r.adder_revenue ?? 0)} revenue = {fmt$(r.adder_commission)}</p>
                              {r.adder_commission > 0 && (
                                <p className="text-red-400 text-[10px]">Deduction: {fmt$(r.adder_commission)}</p>
                              )}
                            </div>
                            <div>
                              <p className="text-gray-500">Referral</p>
                              <p className="text-white">{r.referral_count} referral(s) = {fmt$(r.referral_commission)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Milestone</p>
                              <p className="text-white">{r.milestone || '\u2014'}</p>
                            </div>
                          </div>
                          {r.notes && (
                            <div className="pt-2 border-t border-gray-800">
                              <p className="text-gray-500 text-xs">Notes</p>
                              <p className="text-gray-300 text-xs">{r.notes}</p>
                            </div>
                          )}
                          {/* Admin Notes */}
                          <div className="pt-2 border-t border-gray-800">
                            <p className="text-gray-500 text-xs mb-1">Payroll Admin Notes</p>
                            {isAdmin ? (
                              editingNoteId === r.id ? (
                                <div className="flex gap-2">
                                  <input
                                    value={notesDraft}
                                    onChange={e => setNotesDraft(e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    placeholder="Add admin note..."
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-green-500"
                                  />
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation()
                                      await updateCommissionRecord(r.id, { admin_notes: notesDraft || null })
                                      setEditingNoteId(null)
                                      load()
                                    }}
                                    className="px-2 py-1 bg-green-700 text-white text-xs rounded hover:bg-green-600"
                                  >Save</button>
                                  <button
                                    onClick={e => { e.stopPropagation(); setEditingNoteId(null) }}
                                    className="px-2 py-1 text-gray-400 text-xs hover:text-white"
                                  >Cancel</button>
                                </div>
                              ) : (
                                <button
                                  onClick={e => { e.stopPropagation(); setEditingNoteId(r.id); setNotesDraft(r.admin_notes ?? '') }}
                                  className="text-xs text-gray-400 hover:text-white"
                                >
                                  {r.admin_notes || 'Click to add admin note...'}
                                </button>
                              )
                            ) : (
                              <p className="text-gray-400 text-xs">{r.admin_notes || '\u2014'}</p>
                            )}
                          </div>
                          {r.paid_at && (
                            <p className="text-xs text-gray-500">Paid: {fmtDate(r.paid_at)}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-gray-600 text-sm">
                    No commission records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalCount={filtered.length}
          pageSize={pageSize}
          hasMore={page < totalPages}
          onPrevPage={() => setPage(p => Math.max(1, p - 1))}
          onNextPage={() => setPage(p => Math.min(totalPages, p + 1))}
        />
      )}

      {selectedProject && (
        <ProjectPanel project={selectedProject} onClose={() => setSelectedProject(null)} onProjectUpdated={() => {}} />
      )}
    </div>
  )
}
