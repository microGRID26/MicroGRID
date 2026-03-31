'use client'

import { useMemo, useState } from 'react'
import { fmt$, daysAgo, SLA_THRESHOLDS } from '@/lib/utils'
import {
  ExportButton, downloadCSV, SortHeader, useSortable, ProjectListModal,
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

  return (
    <div className="max-w-4xl">
      <div className="flex justify-end mb-4"><ExportButton onClick={handleExport} /></div>
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

      {drillDown && <ProjectListModal title={drillDown.title} projects={drillDown.projects} onClose={() => setDrillDown(null)} />}
    </div>
  )
}
