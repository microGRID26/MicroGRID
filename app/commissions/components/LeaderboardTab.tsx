import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { fmt$ } from '@/lib/utils'
import { Trophy } from 'lucide-react'
import {
  loadCommissionRecords,
  loadHierarchy,
  getVisibleUserIds,
} from '@/lib/api'
import { PERIOD_LABELS, getPeriodStart } from './types'
import type { Period, LeaderboardMetric, LeaderboardEntry } from './types'
import type { CommissionRecord } from '@/types/database'

// ── Leaderboard Tab ─────────────────────────────────────────────────────────

export function LeaderboardTab({ orgId, currentUserId }: { orgId: string | null; currentUserId: string | null }) {
  const { user: currentUser } = useCurrentUser()
  const isAdmin = currentUser?.isAdmin ?? false
  const [lbPeriod, setLbPeriod] = useState<Period>('month')
  const [lbMetric, setLbMetric] = useState<LeaderboardMetric>('commission')
  const [allRecords, setAllRecords] = useState<CommissionRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Load records — admins see all, others see own + reports only
  const loadLbData = useCallback(async () => {
    setLoading(true)
    const lbRange = getPeriodStart(lbPeriod)
    const allRecs = await loadCommissionRecords({
      orgId,
      dateFrom: lbRange ?? undefined,
    })

    // Pay visibility: non-admins only see their downline
    if (!isAdmin && currentUserId) {
      const hierarchy = await loadHierarchy(orgId)
      const visible = getVisibleUserIds(hierarchy, currentUserId)
      if (visible) {
        setAllRecords(allRecs.filter(r => r.user_id && visible.includes(r.user_id)))
      } else {
        // Not in hierarchy — only see own
        setAllRecords(allRecs.filter(r => r.user_id === currentUserId))
      }
    } else {
      setAllRecords(allRecs)
    }
    setLoading(false)
  }, [orgId, lbPeriod, isAdmin, currentUserId])

  useEffect(() => { loadLbData() }, [loadLbData])

  // Build leaderboard
  const leaderboard = useMemo((): LeaderboardEntry[] => {
    const map = new Map<string, LeaderboardEntry>()

    for (const r of allRecords) {
      if (r.status === 'cancelled') continue
      const key = r.user_name ?? r.user_id ?? 'Unknown'
      const existing = map.get(key) ?? {
        userId: r.user_id,
        userName: r.user_name ?? 'Unknown',
        deals: 0,
        totalKw: 0,
        totalCommission: 0,
        avgPerDeal: 0,
      }
      existing.deals += 1
      existing.totalKw += (r.system_watts ?? 0) / 1000
      existing.totalCommission += r.total_commission ?? 0
      map.set(key, existing)
    }

    const entries = Array.from(map.values()).map(e => ({
      ...e,
      totalKw: Math.round(e.totalKw * 100) / 100,
      totalCommission: Math.round(e.totalCommission * 100) / 100,
      avgPerDeal: e.deals > 0 ? Math.round((e.totalCommission / e.deals) * 100) / 100 : 0,
    }))

    if (lbMetric === 'commission') entries.sort((a, b) => b.totalCommission - a.totalCommission)
    else if (lbMetric === 'deals') entries.sort((a, b) => b.deals - a.deals)
    else entries.sort((a, b) => b.totalKw - a.totalKw)

    return entries
  }, [allRecords, lbMetric])

  // Summary cards
  const lbSummary = useMemo(() => {
    const topEarner = leaderboard[0]
    const totalEarnings = leaderboard.reduce((s, e) => s + e.totalCommission, 0)
    const totalDeals = leaderboard.reduce((s, e) => s + e.deals, 0)
    const avgCommission = leaderboard.length > 0 ? totalEarnings / leaderboard.length : 0
    return { topEarner, totalEarnings, totalDeals, avgCommission }
  }, [leaderboard])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500 text-sm">Loading leaderboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period + Metric selectors */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {(['month', 'quarter', 'year'] as Period[]).map(p => (
            <button key={p} onClick={() => setLbPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                lbPeriod === p ? 'bg-green-700 text-white' : 'text-gray-400 hover:text-white border border-gray-700'
              }`}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-gray-700" />
        <div className="flex gap-1">
          {([['commission', 'Total Commission'], ['deals', 'Deal Count'], ['kw', 'Total kW']] as [LeaderboardMetric, string][]).map(([m, label]) => (
            <button key={m} onClick={() => setLbMetric(m)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                lbMetric === m ? 'bg-blue-700 text-white' : 'text-gray-400 hover:text-white border border-gray-700'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 border border-yellow-700/30 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Top Earner</p>
          <p className="text-sm font-semibold text-yellow-400">{lbSummary.topEarner?.userName ?? '--'}</p>
          <p className="text-xs text-gray-500">{fmt$(lbSummary.topEarner?.totalCommission ?? 0)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Avg Commission</p>
          <p className="text-lg font-bold text-white">{fmt$(lbSummary.avgCommission)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Team Earnings</p>
          <p className="text-lg font-bold text-green-400">{fmt$(lbSummary.totalEarnings)}</p>
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Total Deals</p>
          <p className="text-lg font-bold text-white">{lbSummary.totalDeals}</p>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Rankings
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-700/50">
                <th className="px-3 py-2 font-medium w-12">#</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium text-right">Deals</th>
                <th className="px-3 py-2 font-medium text-right">Total kW</th>
                <th className="px-3 py-2 font-medium text-right">Commission</th>
                <th className="px-3 py-2 font-medium text-right">Avg/Deal</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">No data for this period.</td></tr>
              )}
              {leaderboard.map((entry, i) => {
                const rank = i + 1
                const isMe = entry.userId === currentUserId
                const rankBg = rank === 1
                  ? 'bg-yellow-900/20'
                  : rank === 2
                    ? 'bg-gray-700/20'
                    : rank === 3
                      ? 'bg-amber-900/20'
                      : ''
                const rankBorder = isMe ? 'border-l-2 border-l-green-400' : ''

                return (
                  <tr key={entry.userName} className={`border-b border-gray-700/30 hover:bg-gray-700/20 transition-colors ${rankBg} ${rankBorder}`}>
                    <td className="px-3 py-2.5">
                      {rank === 1 && <span className="text-yellow-400 font-bold">1</span>}
                      {rank === 2 && <span className="text-gray-400 font-bold">2</span>}
                      {rank === 3 && <span className="text-amber-600 font-bold">3</span>}
                      {rank > 3 && <span className="text-gray-500">{rank}</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-medium ${isMe ? 'text-green-400' : 'text-white'}`}>
                        {entry.userName}
                      </span>
                      {isMe && <span className="text-[10px] text-green-500 ml-1.5">(you)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-300">{entry.deals}</td>
                    <td className="px-3 py-2.5 text-right text-gray-300">{entry.totalKw.toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-green-400">{fmt$(entry.totalCommission)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-400">{fmt$(entry.avgPerDeal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
