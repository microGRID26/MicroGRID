import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { useRealtimeSubscription } from '@/lib/hooks'
import { fmt$, fmtDate } from '@/lib/utils'
import { Clock, CheckCircle, AlertTriangle, Banknote } from 'lucide-react'
import {
  loadAdvances,
  updateAdvance,
  clawbackAdvance,
  calculateDaysSinceSale,
  isClawbackEligible,
  ADVANCE_STATUSES,
  ADVANCE_STATUS_LABELS,
  ADVANCE_STATUS_BADGE,
} from '@/lib/api/commission-advanced'
import { HeroCard } from './HeroCard'
import { ROLE_LABELS } from './types'
import type { CommissionAdvance, AdvanceStatus } from '@/types/database'

// ── Advances Tab (Admin only) ───────────────────────────────────────────────

export function AdvancesTab({ orgId }: { orgId: string | null }) {
  const { user: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.isAdmin ?? false

  const [advances, setAdvances] = useState<CommissionAdvance[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [clawbackModal, setClawbackModal] = useState<CommissionAdvance | null>(null)
  const [clawbackReason, setClawbackReason] = useState('')
  const [toast, setToast] = useState('')
  const [projectMap, setProjectMap] = useState<Map<string, { sale_date: string | null }>>(new Map())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await loadAdvances({
        orgId: orgId ?? undefined,
        status: statusFilter !== 'all' ? statusFilter as AdvanceStatus : undefined,
      })
      setAdvances(data)

      // Load project sale dates
      const projectIds = Array.from(new Set(data.map(a => a.project_id).filter(Boolean)))
      if (projectIds.length > 0) {
        const { db: getDb } = await import('@/lib/db')
        const supabase = getDb()
        const { data: projects } = await supabase
          .from('projects')
          .select('id, sale_date')
          .in('id', projectIds.slice(0, 200))
        if (projects) {
          const map = new Map<string, { sale_date: string | null }>()
          for (const p of projects as { id: string; sale_date: string | null }[]) map.set(p.id, { sale_date: p.sale_date })
          setProjectMap(map)
        }
      }
    } catch (err) {
      console.error('Failed to load advances:', err)
    }
    setLoading(false)
  }, [orgId, statusFilter])

  useEffect(() => { load() }, [load])

  useRealtimeSubscription('commission_advances', {
    event: '*',
    onChange: () => load(),
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return advances
    const q = search.toLowerCase()
    return advances.filter(a =>
      a.project_id?.toLowerCase().includes(q) ||
      a.rep_name?.toLowerCase().includes(q)
    )
  }, [advances, search])

  // Summary
  const summary = useMemo(() => {
    const pending = advances.filter(a => a.status === 'pending')
    const approved = advances.filter(a => a.status === 'approved')
    const paid = advances.filter(a => a.status === 'paid')
    const clawedBack = advances.filter(a => a.status === 'clawed_back')
    return {
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, a) => s + a.amount, 0),
      approvedCount: approved.length,
      approvedAmount: approved.reduce((s, a) => s + a.amount, 0),
      paidCount: paid.length,
      paidAmount: paid.reduce((s, a) => s + a.amount, 0),
      clawedBackCount: clawedBack.length,
      clawedBackAmount: clawedBack.reduce((s, a) => s + a.amount, 0),
    }
  }, [advances])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const handleApprove = async (advance: CommissionAdvance) => {
    if (!confirm(`Approve advance of ${fmt$(advance.amount)} for ${advance.rep_name ?? advance.project_id}?`)) return
    await updateAdvance(advance.id, { status: 'approved' })
    showToast('Advance approved')
    load()
  }

  const handlePay = async (advance: CommissionAdvance) => {
    if (!confirm(`Mark advance of ${fmt$(advance.amount)} as paid for ${advance.rep_name ?? advance.project_id}?`)) return
    await updateAdvance(advance.id, { status: 'paid', paid_at: new Date().toISOString() })
    showToast('Advance marked as paid')
    load()
  }

  const handleClawback = async () => {
    if (!clawbackModal || !clawbackReason.trim()) return
    await clawbackAdvance(clawbackModal.id, clawbackReason.trim())
    setClawbackModal(null)
    setClawbackReason('')
    showToast('Advance clawed back')
    load()
  }

  const handleBulkApprove = async () => {
    const pending = advances.filter(a => a.status === 'pending')
    if (pending.length === 0) return
    if (!confirm(`Approve all ${pending.length} pending advances (${fmt$(summary.pendingAmount)})?`)) return
    let ok = 0; let fail = 0
    for (const a of pending) {
      const success = await updateAdvance(a.id, { status: 'approved' })
      if (success) ok++; else fail++
    }
    showToast(fail > 0 ? `${ok} approved, ${fail} failed` : `${ok} advances approved`)
    load()
  }

  const handleBulkPay = async () => {
    const approved = advances.filter(a => a.status === 'approved')
    if (approved.length === 0) return
    if (!confirm(`Pay all ${approved.length} approved advances (${fmt$(summary.approvedAmount)})?`)) return
    const now = new Date().toISOString()
    let ok = 0; let fail = 0
    for (const a of approved) {
      const success = await updateAdvance(a.id, { status: 'paid', paid_at: now })
      if (success) ok++; else fail++
    }
    showToast(fail > 0 ? `${ok} paid, ${fail} failed` : `${ok} advances marked as paid`)
    load()
  }

  const getDeadlineStyle = (clawbackDate: string | null): string => {
    if (!clawbackDate) return ''
    const deadlineDate = new Date(clawbackDate)
    if (isNaN(deadlineDate.getTime())) return ''
    const now = new Date()
    const daysUntil = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntil < 0) return 'bg-red-900/20 border-red-800/50'
    if (daysUntil <= 7) return 'bg-amber-900/20 border-amber-800/50'
    return ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-sm">Loading advances...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toast && <div className="fixed bottom-5 right-5 bg-green-700 text-white text-xs px-4 py-2 rounded-md shadow-lg z-[200]">{toast}</div>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroCard
          label="Pending"
          value={fmt$(summary.pendingAmount)}
          icon={<Clock className="w-6 h-6" />}
          accent="amber"
          subtitle={`${summary.pendingCount} advances`}
        />
        <HeroCard
          label="Approved"
          value={fmt$(summary.approvedAmount)}
          icon={<CheckCircle className="w-6 h-6" />}
          accent="blue"
          subtitle={`${summary.approvedCount} advances`}
        />
        <HeroCard
          label="Paid"
          value={fmt$(summary.paidAmount)}
          icon={<Banknote className="w-6 h-6" />}
          accent="green"
          subtitle={`${summary.paidCount} advances`}
        />
        <HeroCard
          label="Clawed Back"
          value={fmt$(summary.clawedBackAmount)}
          icon={<AlertTriangle className="w-6 h-6" />}
          accent="amber"
          subtitle={`${summary.clawedBackCount} advances`}
        />
      </div>

      {/* Bulk Actions */}
      {(summary.pendingCount > 0 || summary.approvedCount > 0) && (
        <div className="flex items-center gap-2">
          {summary.pendingCount > 0 && (
            <button
              onClick={handleBulkApprove}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-800 border border-blue-700 text-blue-300 hover:text-white hover:bg-blue-700 rounded-md transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve All ({summary.pendingCount})
            </button>
          )}
          {summary.approvedCount > 0 && (
            <button
              onClick={handleBulkPay}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-800 border border-green-700 text-green-300 hover:text-white hover:bg-green-700 rounded-md transition-colors"
            >
              <Banknote className="w-3.5 h-3.5" />
              Pay All Approved ({summary.approvedCount})
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 text-sm text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-green-500"
        >
          <option value="all">All Statuses</option>
          {ADVANCE_STATUSES.map(s => (
            <option key={s} value={s}>{ADVANCE_STATUS_LABELS[s]}</option>
          ))}
        </select>
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search project or rep..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-gray-700">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-700">
            <tr>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Project</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Rep</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Role</th>
              <th className="text-right px-3 py-2.5 text-gray-400 font-medium">Amount</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Status</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Self-Gen</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Days</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Clawback Deadline</th>
              <th className="text-left px-3 py-2.5 text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => {
              const deadlineStyle = getDeadlineStyle(a.clawback_date)
              const daysSince = calculateDaysSinceSale(projectMap.get(a.project_id)?.sale_date)
              const daysColor = daysSince < 30 ? 'text-green-400' : daysSince < 60 ? 'text-amber-400' : 'text-red-400'

              return (
                <React.Fragment key={a.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer transition-colors ${deadlineStyle} ${i % 2 === 0 ? '' : 'bg-gray-900/20'}`}
                  >
                    <td className="px-3 py-2 text-blue-400 font-mono">{a.project_id}</td>
                    <td className="px-3 py-2 text-white">{a.rep_name || '\u2014'}</td>
                    <td className="px-3 py-2 text-gray-400">{ROLE_LABELS[a.role_key] ?? a.role_key}</td>
                    <td className="px-3 py-2 text-right text-white font-medium font-mono">{fmt$(a.amount)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${ADVANCE_STATUS_BADGE[a.status]}`}>
                        {ADVANCE_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {a.self_generated ? (
                        <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/40 text-blue-400 border border-blue-800">Self</span>
                      ) : (
                        <span className="text-gray-600">{'\u2014'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {daysSince > 0 ? (
                        <span className={`font-mono ${daysColor}`}>{daysSince}</span>
                      ) : (
                        <span className="text-gray-600">{'\u2014'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-400">
                      {a.clawback_date ? (
                        (() => {
                          const deadlineDate = new Date(a.clawback_date)
                          const now = new Date()
                          const daysUntil = Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                          const color = daysUntil < 0 ? 'text-red-400' : daysUntil <= 7 ? 'text-amber-400' : 'text-gray-400'
                          return (
                            <span className={color}>
                              {fmtDate(a.clawback_date)}
                              {daysUntil < 0 && <span className="text-[10px] ml-1">(overdue)</span>}
                              {daysUntil >= 0 && daysUntil <= 7 && <span className="text-[10px] ml-1">({daysUntil}d)</span>}
                            </span>
                          )
                        })()
                      ) : (
                        <span className="text-gray-600">{'\u2014'}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        {a.status === 'pending' && (
                          <button onClick={() => handleApprove(a)} className="px-2 py-0.5 bg-blue-700 hover:bg-blue-600 text-white text-[10px] rounded transition-colors">
                            Approve
                          </button>
                        )}
                        {a.status === 'approved' && (
                          <button onClick={() => handlePay(a)} className="px-2 py-0.5 bg-green-600 hover:bg-green-500 text-white text-[10px] rounded transition-colors">
                            Pay
                          </button>
                        )}
                        {isClawbackEligible(a) && (
                          <button onClick={() => setClawbackModal(a)} className="px-2 py-0.5 bg-red-700 hover:bg-red-600 text-white text-[10px] rounded transition-colors">
                            Clawback
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedId === a.id && (
                    <tr key={`${a.id}-detail`}>
                      <td colSpan={9} className="bg-gray-850 px-6 py-4">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-2">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                              <p className="text-gray-500">Created</p>
                              <p className="text-white">{fmtDate(a.created_at)}</p>
                            </div>
                            {a.status === 'approved' && (
                              <div>
                                <p className="text-gray-500">Status</p>
                                <p className="text-white">Approved</p>
                              </div>
                            )}
                            {a.paid_at && (
                              <div>
                                <p className="text-gray-500">Paid</p>
                                <p className="text-white">{fmtDate(a.paid_at)}</p>
                              </div>
                            )}
                            {a.clawed_back_at && (
                              <div>
                                <p className="text-gray-500">Clawed Back</p>
                                <p className="text-red-400">{fmtDate(a.clawed_back_at)}</p>
                              </div>
                            )}
                          </div>
                          {a.clawback_reason && (
                            <div className="pt-2 border-t border-gray-800">
                              <p className="text-gray-500 text-xs">Clawback Reason</p>
                              <p className="text-red-400 text-xs">{a.clawback_reason}</p>
                            </div>
                          )}
                          {a.admin_notes && (
                            <div className="pt-2 border-t border-gray-800">
                              <p className="text-gray-500 text-xs">Admin Notes</p>
                              <p className="text-gray-300 text-xs">{a.admin_notes}</p>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-gray-600 text-sm">
                  No advances found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Clawback Modal */}
      {clawbackModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setClawbackModal(null)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Clawback Advance</h2>
              <p className="text-xs text-gray-500 mt-1">
                {clawbackModal.project_id} - {clawbackModal.rep_name} - {fmt$(clawbackModal.amount)}
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">Reason for clawback</label>
                <textarea
                  value={clawbackReason}
                  onChange={e => setClawbackReason(e.target.value)}
                  placeholder="Enter clawback reason..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setClawbackModal(null)} className="px-4 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md">
                  Cancel
                </button>
                <button
                  onClick={handleClawback}
                  disabled={!clawbackReason.trim()}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Confirm Clawback
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
