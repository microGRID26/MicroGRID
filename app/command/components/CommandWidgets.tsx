'use client'

import { useMemo } from 'react'
import { STAGE_LABELS, STAGE_ORDER } from '@/lib/utils'
import type { Project } from '@/types/database'

// ── METRIC CARD ───────────────────────────────────────────────────────────────
export function MetricCard({ label, value, accent, subtitle, onClick }: {
  label: string
  value: string | number
  accent?: string
  subtitle?: string
  onClick?: () => void
}) {
  const border = accent ?? 'border-gray-700'
  const textColor = accent
    ? accent.replace('border-', 'text-')
    : 'text-white'

  return (
    <button
      onClick={onClick}
      className={`flex flex-col gap-1 px-4 py-3 bg-gray-800 rounded-lg border ${border} hover:bg-gray-750 transition-colors text-left min-w-0`}
    >
      <span className="text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap">{label}</span>
      <span className={`text-2xl font-bold font-mono ${textColor}`}>{value}</span>
      {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
    </button>
  )
}

// ── ACTION ITEM ROW ───────────────────────────────────────────────────────────
export function ActionRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-800 border-b border-gray-800/50 transition-colors"
    >
      {children}
    </div>
  )
}

// ── COLLAPSIBLE SECTION ───────────────────────────────────────────────────────
export function ActionSection({ title, count, color, open, onToggle, children }: {
  title: string
  count: number
  color: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800 transition-colors ${color} bg-opacity-5`}
      >
        <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${color} bg-gray-800`}>
          {count}
        </span>
        <span className="ml-auto text-gray-600 text-xs">{open ? '▼' : '▶'}</span>
      </button>
      {open && <div className="bg-gray-900/50">{children}</div>}
    </div>
  )
}

// ── PIPELINE BAR ──────────────────────────────────────────────────────────────
const STAGE_COLORS: Record<string, string> = {
  evaluation: 'bg-blue-500',
  survey: 'bg-cyan-500',
  design: 'bg-violet-500',
  permit: 'bg-amber-500',
  install: 'bg-orange-500',
  inspection: 'bg-pink-500',
  complete: 'bg-green-500',
}

export function PipelineBar({ projects, stageFilter, onStageClick }: {
  projects: Project[]
  stageFilter: string | null
  onStageClick: (stage: string | null) => void
}) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of STAGE_ORDER) c[s] = 0
    for (const p of projects) {
      if (p.disposition === 'Cancelled' || p.disposition === 'In Service' || p.disposition === 'Loyalty' || p.disposition === 'Legal' || p.disposition === 'On Hold') continue
      c[p.stage] = (c[p.stage] ?? 0) + 1
    }
    return c
  }, [projects])

  const max = Math.max(...Object.values(counts), 1)

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pipeline Snapshot</span>
        {stageFilter && (
          <button
            onClick={() => onStageClick(null)}
            className="text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            Clear filter
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {STAGE_ORDER.filter(s => s !== 'complete').map(stage => {
          const count = counts[stage] ?? 0
          const pct = max > 0 ? (count / max) * 100 : 0
          const isActive = stageFilter === stage
          return (
            <button
              key={stage}
              onClick={() => onStageClick(isActive ? null : stage)}
              className={`w-full flex items-center gap-3 group transition-colors rounded px-1 py-0.5 ${isActive ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}
            >
              <span className="text-xs text-gray-400 w-20 text-right truncate">{STAGE_LABELS[stage] ?? stage}</span>
              <div className="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
                <div
                  className={`h-full rounded transition-all ${STAGE_COLORS[stage] ?? 'bg-gray-500'} ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}
                  style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-gray-300 w-8 text-right">{count}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
