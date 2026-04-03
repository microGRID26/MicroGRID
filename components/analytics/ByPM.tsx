'use client'

import { useMemo, useState } from 'react'
import { fmt$, daysAgo, SLA_THRESHOLDS, STAGE_LABELS, STAGE_ORDER } from '@/lib/utils'
import {
  MetricCard, MiniBar, PeriodBar, ExportButton, downloadCSV, SortHeader, useSortable, ProjectListModal,
  inRange, PERIOD_LABELS, type AnalyticsData,
} from './shared'
import type { Project } from '@/types/database'

interface PMRow {
  pm: string
  total: number
  active: number
  blocked: number
  value: number
  installs: number
  avgDealSize: number
  avgCycleDays: number
  slaCompliance: number
}

export function ByPM({ data }: { data: AnalyticsData }) {
  const { projects, period } = data
  const [drillDown, setDrillDown] = useState<{ title: string; projects: Project[] } | null>(null)

  const pmStats = useMemo(() => {
    const pmMap = new Map<string, string>()
    projects.forEach(p => { if (p.pm_id && p.pm) pmMap.set(p.pm_id, p.pm) })
    const pmPairs = [...pmMap.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
    return pmPairs.map(({ id: pmId, name: pm }) => {
      const ps = projects.filter(p => p.pm_id === pmId)
      const activePs = ps.filter(p => p.stage !== 'complete')
      const value = activePs.reduce((s, p) => s + (Number(p.contract) || 0), 0)
      // Avg cycle days for active projects
      // Avg days in current stage (not days since sale)
      const cycleDays = activePs.map(p => daysAgo(p.stage_date)).filter(d => d > 0)
      const avgCycleDays = cycleDays.length > 0 ? Math.round(cycleDays.reduce((s, d) => s + d, 0) / cycleDays.length) : 0
      // SLA compliance: % of active projects on track
      const onTrack = activePs.filter(p => {
        const t = SLA_THRESHOLDS[p.stage] ?? { target: 5, risk: 10, crit: 15 }
        return daysAgo(p.stage_date) <= t.target
      }).length
      const slaCompliance = activePs.length > 0 ? Math.round((onTrack / activePs.length) * 100) : 100
      return {
        pm,
        total: ps.length,
        active: activePs.length,
        blocked: activePs.filter(p => p.blocker).length,
        value,
        installs: ps.filter(p => inRange(p.install_complete_date ?? (p.stage === 'complete' ? p.stage_date : null), period)).length,
        avgDealSize: activePs.length > 0 ? Math.round(value / activePs.length) : 0,
        avgCycleDays,
        slaCompliance,
      }
    })
  }, [projects, period])

  const { sorted, sortKey, sortDir, toggleSort } = useSortable<PMRow>(pmStats, 'active')

  const handleExport = () => {
    const headers = ['PM', 'Active', 'Blocked', 'Portfolio', 'Avg Deal', 'Avg Cycle', 'SLA %', `Installs (${PERIOD_LABELS[period]})`]
    const rows = sorted.map(pm => [pm.pm, pm.active, pm.blocked, pm.value, pm.avgDealSize, pm.avgCycleDays, pm.slaCompliance + '%', pm.installs])
    downloadCSV(`pm-performance-${period}.csv`, headers, rows)
  }

  const handleRowClick = (pm: PMRow) => {
    const ps = projects.filter(p => p.pm === pm.pm && p.stage !== 'complete')
    setDrillDown({ title: `${pm.pm} — Active Projects`, projects: ps })
  }

  // Summary metrics
  const totalActive = sorted.reduce((s, pm) => s + pm.active, 0)
  const totalBlocked = sorted.reduce((s, pm) => s + pm.blocked, 0)
  const totalPortfolio = sorted.reduce((s, pm) => s + pm.value, 0)
  const totalInstalls = sorted.reduce((s, pm) => s + pm.installs, 0)
  const avgSLA = sorted.length > 0 ? Math.round(sorted.reduce((s, pm) => s + pm.slaCompliance, 0) / sorted.length) : 0
  const maxActive = Math.max(...sorted.map(pm => pm.active), 1)

  // Stage distribution per PM
  const pmStageData = useMemo(() => {
    return sorted.map(pm => {
      const ps = projects.filter(p => p.pm === pm.pm && p.stage !== 'complete')
      const stages: Record<string, number> = {}
      STAGE_ORDER.filter(s => s !== 'complete').forEach(s => { stages[s] = 0 })
      ps.forEach(p => { stages[p.stage] = (stages[p.stage] ?? 0) + 1 })
      return { pm: pm.pm, stages }
    })
  }, [sorted, projects])

  return (
    <div className="max-w-6xl space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label="Total PMs" value={String(sorted.length)} />
        <MetricCard label="Active Projects" value={String(totalActive)} sub={fmt$(totalPortfolio)} />
        <MetricCard label="Blocked" value={String(totalBlocked)} color={totalBlocked > 0 ? 'text-red-400' : undefined} />
        <MetricCard label={`Installs (${PERIOD_LABELS[period]})`} value={String(totalInstalls)} color="text-green-400" />
        <MetricCard label="Avg SLA Compliance" value={`${avgSLA}%`} color={avgSLA >= 80 ? 'text-green-400' : avgSLA >= 50 ? 'text-amber-400' : 'text-red-400'} />
      </div>

      <div className="flex items-center justify-between">{data.onPeriodChange && <PeriodBar period={data.period} onPeriodChange={data.onPeriodChange} />}<ExportButton onClick={handleExport} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-gray-700">
              <SortHeader label="PM" field={'pm' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Active" field={'active' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Blocked" field={'blocked' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Portfolio" field={'value' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Avg Deal" field={'avgDealSize' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="Avg Cycle" field={'avgCycleDays' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="SLA %" field={'slaCompliance' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label={`Installs (${PERIOD_LABELS[period]})`} field={'installs' as keyof PMRow} sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
            </tr>
          </thead>
          <tbody>
            {sorted.map(pm => (
              <tr key={pm.pm} className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer" onClick={() => handleRowClick(pm)}>
                <td className="px-3 py-2 font-medium text-white">{pm.pm}</td>
                <td className="px-3 py-2 text-gray-300 font-mono">{pm.active}</td>
                <td className="px-3 py-2">
                  {pm.blocked > 0
                    ? <span className="text-red-400 font-mono">{pm.blocked}</span>
                    : <span className="text-gray-600">—</span>}
                </td>
                <td className="px-3 py-2 text-gray-300 font-mono">{fmt$(pm.value)}</td>
                <td className="px-3 py-2 text-gray-300 font-mono">{fmt$(pm.avgDealSize)}</td>
                <td className="px-3 py-2 text-gray-300 font-mono">{pm.avgCycleDays > 0 ? `${pm.avgCycleDays}d` : '—'}</td>
                <td className="px-3 py-2 font-mono">
                  <span className={pm.slaCompliance >= 80 ? 'text-green-400' : pm.slaCompliance >= 50 ? 'text-amber-400' : 'text-red-400'}>
                    {pm.slaCompliance}%
                  </span>
                </td>
                <td className="px-3 py-2 text-green-400 font-mono">{pm.installs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PM Workload Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">PM Workload</div>
          <div className="space-y-2">
            {sorted.map(pm => (
              <div key={pm.pm} className="flex items-center gap-3">
                <div className="text-xs text-gray-400 w-24 flex-shrink-0 truncate">{pm.pm.split(' ')[0]}</div>
                <div className="flex-1 bg-gray-700 rounded-full h-5 relative overflow-hidden">
                  {/* Active (green) */}
                  <div
                    className="absolute left-0 top-0 h-full bg-green-600 rounded-l-full"
                    style={{ width: `${((pm.active - pm.blocked) / maxActive) * 100}%` }}
                  />
                  {/* Blocked (red, stacked on top) */}
                  {pm.blocked > 0 && (
                    <div
                      className="absolute top-0 h-full bg-red-600 rounded-r-full"
                      style={{ left: `${((pm.active - pm.blocked) / maxActive) * 100}%`, width: `${(pm.blocked / maxActive) * 100}%` }}
                    />
                  )}
                  <div className="absolute inset-0 flex items-center justify-end pr-2">
                    <span className="text-[10px] text-white font-bold">{pm.active}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600" /> Active</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> Blocked</span>
          </div>
        </div>

        {/* Stage Distribution Heatmap */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">Projects by Stage per PM</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr>
                  <th className="text-left px-1 py-1 text-gray-500">PM</th>
                  {STAGE_ORDER.filter(s => s !== 'complete').map(s => (
                    <th key={s} className="px-1 py-1 text-gray-500 text-center">{(STAGE_LABELS[s] ?? s).slice(0, 4)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pmStageData.map(row => (
                  <tr key={row.pm}>
                    <td className="px-1 py-1 text-gray-300 font-medium truncate max-w-[80px]">{row.pm.split(' ')[0]}</td>
                    {STAGE_ORDER.filter(s => s !== 'complete').map(s => {
                      const count = row.stages[s] ?? 0
                      const bg = count === 0 ? '' : count <= 5 ? 'bg-green-900/40' : count <= 20 ? 'bg-amber-900/40' : 'bg-red-900/40'
                      const text = count === 0 ? 'text-gray-700' : count <= 5 ? 'text-green-400' : count <= 20 ? 'text-amber-400' : 'text-red-400'
                      return (
                        <td key={s} className={`px-1 py-1 text-center font-mono rounded ${bg} ${text}`}>
                          {count > 0 ? count : '·'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {drillDown && <ProjectListModal title={drillDown.title} projects={drillDown.projects} onClose={() => setDrillDown(null)} />}
    </div>
  )
}
