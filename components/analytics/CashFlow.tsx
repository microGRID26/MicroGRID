'use client'

import { useMemo, useState } from 'react'
import { fmt$, daysAgo } from '@/lib/utils'
import { MetricCard, inRange, ProjectListModal, ExportButton, downloadCSV, type AnalyticsData } from './shared'

export function CashFlow({ data }: { data: AnalyticsData }) {
  const { projects, funding, period } = data
  const [drillDown, setDrillDown] = useState<{ title: string; projects: typeof projects } | null>(null)

  const metrics = useMemo(() => {
    // M1/M2/M3 collectable (eligible, not funded, not submitted)
    const m1Ready: typeof projects = []
    const m2Ready: typeof projects = []
    const m3Ready: typeof projects = []
    const m2Submitted: typeof projects = []
    const m3Submitted: typeof projects = []
    const m2Funded: typeof projects = []
    const m3Funded: typeof projects = []
    const m2Stale: typeof projects = [] // submitted > 30 days ago
    const m3Stale: typeof projects = []

    for (const p of projects) {
      const f = funding[p.id]
      // M1
      if (p.sale_date && (!f || (f.m1_status !== 'Funded' && f.m1_status !== 'Submitted'))) m1Ready.push(p)
      // M2
      if (p.install_complete_date && f) {
        if (f.m2_status === 'Funded') { if (inRange(f.m2_funded_date, period)) m2Funded.push(p) }
        else if (f.m2_status === 'Submitted') { m2Submitted.push(p); if (daysAgo(p.install_complete_date) > 30) m2Stale.push(p) }
        else m2Ready.push(p)
      }
      // M3
      if (p.pto_date && f) {
        if (f.m3_status === 'Funded') { if (inRange(f.m3_funded_date, period)) m3Funded.push(p) }
        else if (f.m3_status === 'Submitted') { m3Submitted.push(p); if (daysAgo(p.pto_date) > 30) m3Stale.push(p) }
        else m3Ready.push(p)
      }
    }

    const sum = (ps: typeof projects, field: 'm1_amount' | 'm2_amount' | 'm3_amount') =>
      ps.reduce((s, p) => s + (Number(funding[p.id]?.[field]) || 0), 0)

    return {
      m1Ready, m2Ready, m3Ready,
      m2Submitted, m3Submitted,
      m2Funded, m3Funded,
      m2Stale, m3Stale,
      m1ReadyAmt: sum(m1Ready, 'm1_amount'),
      m2ReadyAmt: sum(m2Ready, 'm2_amount'),
      m3ReadyAmt: sum(m3Ready, 'm3_amount'),
      m2SubmittedAmt: sum(m2Submitted, 'm2_amount'),
      m3SubmittedAmt: sum(m3Submitted, 'm3_amount'),
      m2FundedAmt: sum(m2Funded, 'm2_amount'),
      m3FundedAmt: sum(m3Funded, 'm3_amount'),
      m2StaleAmt: sum(m2Stale, 'm2_amount'),
      m3StaleAmt: sum(m3Stale, 'm3_amount'),
    }
  }, [projects, funding, period])

  const totalCollectable = metrics.m1ReadyAmt + metrics.m2ReadyAmt + metrics.m3ReadyAmt
  const totalSubmitted = metrics.m2SubmittedAmt + metrics.m3SubmittedAmt
  const totalFunded = metrics.m2FundedAmt + metrics.m3FundedAmt
  const totalStale = metrics.m2StaleAmt + metrics.m3StaleAmt

  const handleExport = () => {
    const headers = ['Category', 'Milestone', 'Projects', 'Amount']
    const rows = [
      ['Collectable', 'M1', metrics.m1Ready.length, metrics.m1ReadyAmt],
      ['Collectable', 'M2', metrics.m2Ready.length, metrics.m2ReadyAmt],
      ['Collectable', 'M3', metrics.m3Ready.length, metrics.m3ReadyAmt],
      ['Submitted', 'M2', metrics.m2Submitted.length, metrics.m2SubmittedAmt],
      ['Submitted', 'M3', metrics.m3Submitted.length, metrics.m3SubmittedAmt],
      ['Stale (>30d)', 'M2', metrics.m2Stale.length, metrics.m2StaleAmt],
      ['Stale (>30d)', 'M3', metrics.m3Stale.length, metrics.m3StaleAmt],
      ['Funded', 'M2', metrics.m2Funded.length, metrics.m2FundedAmt],
      ['Funded', 'M3', metrics.m3Funded.length, metrics.m3FundedAmt],
    ] as (string | number)[][]
    downloadCSV(`cash-flow-${period}.csv`, headers, rows)
  }

  return (
    <div className="max-w-6xl space-y-8">
      <div className="flex justify-end"><ExportButton onClick={handleExport} /></div>

      {/* Top-line: cash position */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Collectable Now" value={fmt$(totalCollectable)} sub={`${metrics.m1Ready.length + metrics.m2Ready.length + metrics.m3Ready.length} milestones`} color="text-green-400" />
        <MetricCard label="Submitted, Waiting" value={fmt$(totalSubmitted)} sub={`${metrics.m2Submitted.length + metrics.m3Submitted.length} pending`} color="text-blue-400" />
        <MetricCard label="Funded This Period" value={fmt$(totalFunded)} sub={`${metrics.m2Funded.length + metrics.m3Funded.length} payments`} color="text-emerald-400" />
        {totalStale > 0 && (
          <MetricCard label="Stale (>30 days)" value={fmt$(totalStale)} sub={`${metrics.m2Stale.length + metrics.m3Stale.length} overdue`} color="text-red-400"
            onClick={() => setDrillDown({ title: 'Stale Submissions (>30 days)', projects: [...metrics.m2Stale, ...metrics.m3Stale] })} />
        )}
      </div>

      {/* Waterfall: Collectable → Submitted → Funded */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Cash Flow Pipeline</div>
        <div className="grid grid-cols-3 gap-6">
          {/* Collectable */}
          <div>
            <div className="text-xs text-green-400 font-semibold mb-3 uppercase tracking-wider">Ready to Collect</div>
            {[
              { label: 'M1 — Contract', amount: metrics.m1ReadyAmt, count: metrics.m1Ready.length, color: 'text-blue-400', projects: metrics.m1Ready },
              { label: 'M2 — Install', amount: metrics.m2ReadyAmt, count: metrics.m2Ready.length, color: 'text-amber-400', projects: metrics.m2Ready },
              { label: 'M3 — PTO', amount: metrics.m3ReadyAmt, count: metrics.m3Ready.length, color: 'text-purple-400', projects: metrics.m3Ready },
            ].map(m => (
              <div key={m.label} onClick={() => m.count > 0 && setDrillDown({ title: `${m.label} — Ready to Collect`, projects: m.projects })}
                className={`flex items-center justify-between py-2 border-b border-gray-700/50 ${m.count > 0 ? 'cursor-pointer hover:bg-gray-700/30' : ''}`}>
                <div>
                  <div className={`text-xs font-medium ${m.color}`}>{m.label}</div>
                  <div className="text-[10px] text-gray-600">{m.count} projects</div>
                </div>
                <div className="text-sm font-bold text-white font-mono">{fmt$(m.amount)}</div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1">
              <div className="text-xs text-green-400 font-semibold">Total</div>
              <div className="text-lg font-bold text-green-400 font-mono">{fmt$(totalCollectable)}</div>
            </div>
          </div>

          {/* Submitted */}
          <div>
            <div className="text-xs text-blue-400 font-semibold mb-3 uppercase tracking-wider">Submitted, Waiting</div>
            {[
              { label: 'M2 Submitted', amount: metrics.m2SubmittedAmt, count: metrics.m2Submitted.length, stale: metrics.m2Stale.length, projects: metrics.m2Submitted },
              { label: 'M3 Submitted', amount: metrics.m3SubmittedAmt, count: metrics.m3Submitted.length, stale: metrics.m3Stale.length, projects: metrics.m3Submitted },
            ].map(m => (
              <div key={m.label} onClick={() => m.count > 0 && setDrillDown({ title: `${m.label} — Awaiting Payment`, projects: m.projects })}
                className={`flex items-center justify-between py-2 border-b border-gray-700/50 ${m.count > 0 ? 'cursor-pointer hover:bg-gray-700/30' : ''}`}>
                <div>
                  <div className="text-xs font-medium text-blue-400">{m.label}</div>
                  <div className="text-[10px] text-gray-600">{m.count} pending{m.stale > 0 && <span className="text-red-400 ml-1">({m.stale} stale)</span>}</div>
                </div>
                <div className="text-sm font-bold text-white font-mono">{fmt$(m.amount)}</div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1">
              <div className="text-xs text-blue-400 font-semibold">Total</div>
              <div className="text-lg font-bold text-blue-400 font-mono">{fmt$(totalSubmitted)}</div>
            </div>
          </div>

          {/* Funded */}
          <div>
            <div className="text-xs text-emerald-400 font-semibold mb-3 uppercase tracking-wider">Funded This Period</div>
            {[
              { label: 'M2 Funded', amount: metrics.m2FundedAmt, count: metrics.m2Funded.length, projects: metrics.m2Funded },
              { label: 'M3 Funded', amount: metrics.m3FundedAmt, count: metrics.m3Funded.length, projects: metrics.m3Funded },
            ].map(m => (
              <div key={m.label} onClick={() => m.count > 0 && setDrillDown({ title: `${m.label}`, projects: m.projects })}
                className={`flex items-center justify-between py-2 border-b border-gray-700/50 ${m.count > 0 ? 'cursor-pointer hover:bg-gray-700/30' : ''}`}>
                <div>
                  <div className="text-xs font-medium text-emerald-400">{m.label}</div>
                  <div className="text-[10px] text-gray-600">{m.count} payments</div>
                </div>
                <div className="text-sm font-bold text-white font-mono">{fmt$(m.amount)}</div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 mt-1">
              <div className="text-xs text-emerald-400 font-semibold">Total</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">{fmt$(totalFunded)}</div>
            </div>
          </div>
        </div>
      </div>

      {drillDown && <ProjectListModal title={drillDown.title} projects={drillDown.projects} onClose={() => setDrillDown(null)} />}
    </div>
  )
}
