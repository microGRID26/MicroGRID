import { daysAgo, SLA_THRESHOLDS, STAGE_TASKS } from '@/lib/utils'
import type { Project } from '@/types/database'
import type { TaskEntry } from '@/lib/queue-task-map'
import type { DaysRange } from './types'

// ── SLA helper ───────────────────────────────────────────────────────────────

export function getSLA(p: Project) {
  const t = SLA_THRESHOLDS[p.stage] ?? { target: 3, risk: 5, crit: 7 }
  const days = daysAgo(p.stage_date)
  let status: 'ok' | 'warn' | 'risk' | 'crit' = 'ok'
  if (days >= t.crit) status = 'crit'
  else if (days >= t.risk) status = 'risk'
  else if (days >= t.target) status = 'warn'
  return { days, status, pct: Math.min(100, Math.round(days / t.crit * 100)) }
}

export const AGE_COLOR: Record<string, string> = {
  crit: '#ef4444',
  risk: '#f59e0b',
  warn: '#eab308',
  ok:   '#22c55e',
}

export const SLA_BORDER: Record<string, string> = {
  crit: 'border-l-red-500',
  risk: 'border-l-amber-500',
  warn: 'border-l-yellow-500',
  ok:   'border-l-green-500',
}

// ── Task helpers ─────────────────────────────────────────────────────────────

export function getNextTask(p: Project, taskMap: Record<string, TaskEntry>): { name: string; status: string } | null {
  const tasks = STAGE_TASKS[p.stage] ?? []
  for (const t of tasks) {
    const s = taskMap[t.id]?.status ?? 'Not Ready'
    if (s !== 'Complete') return { name: t.name, status: s }
  }
  return null
}

export interface StuckTask { name: string; status: 'Pending Resolution' | 'Revision Required'; reason: string }

export function getStuckTasks(p: Project, taskMap: Record<string, TaskEntry>): StuckTask[] {
  const tasks = STAGE_TASKS[p.stage] ?? []
  return tasks
    .filter(t => {
      const s = taskMap[t.id]?.status ?? 'Not Ready'
      return s === 'Pending Resolution' || s === 'Revision Required'
    })
    .map(t => ({
      name: t.name,
      status: (taskMap[t.id]?.status ?? '') as 'Pending Resolution' | 'Revision Required',
      reason: taskMap[t.id]?.reason ?? '',
    }))
}

// ── Filter helpers ───────────────────────────────────────────────────────────

export function matchesDaysRange(p: Project, range: DaysRange): boolean {
  const d = daysAgo(p.stage_date)
  switch (range) {
    case '<7': return d < 7
    case '7-30': return d >= 7 && d <= 30
    case '30-90': return d > 30 && d <= 90
    case '90+': return d > 90
    default: return true
  }
}
