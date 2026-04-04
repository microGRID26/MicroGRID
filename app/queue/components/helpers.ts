import { daysAgo, SLA_THRESHOLDS, STAGE_TASKS } from '@/lib/utils'
import { STAGE_ORDER } from '@/lib/utils'
import type { Project } from '@/types/database'
import type { TaskEntry } from '@/lib/queue-task-map'
import type { SectionSortKey } from './types'

export function getSLA(p: Project) {
  const t = SLA_THRESHOLDS[p.stage] ?? { target: 3, risk: 5, crit: 7 }
  const days = daysAgo(p.stage_date)
  let status: 'ok' | 'warn' | 'risk' | 'crit' = 'ok'
  if (days >= t.crit) status = 'crit'
  else if (days >= t.risk) status = 'risk'
  else if (days >= t.target) status = 'warn'
  return { days, status, ...t }
}

export function priority(p: Project): number {
  if (p.blocker) return 0
  const s = getSLA(p).status
  if (s === 'crit') return 1
  if (s === 'risk') return 2
  if (s === 'warn') return 3
  return 4
}

export function getNextTask(p: Project, taskMap: Record<string, TaskEntry>): string | null {
  const tasks = STAGE_TASKS[p.stage] ?? []
  for (const t of tasks) {
    const s = taskMap[t.id]?.status ?? 'Not Ready'
    if (s !== 'Complete') return t.name
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

// Stage filter chips (exclude 'complete')
export const FILTER_STAGES = STAGE_ORDER.filter(s => s !== 'complete')

// Days range filter helpers
export function getDaysInStage(p: Project): number {
  return daysAgo(p.stage_date)
}

export function matchesDaysRange(p: Project, range: string): boolean {
  const d = getDaysInStage(p)
  switch (range) {
    case '<7': return d < 7
    case '7-30': return d >= 7 && d <= 30
    case '30-90': return d > 30 && d <= 90
    case '90+': return d > 90
    default: return true
  }
}

// Sort projects within a section
export function sortProjects(projects: Project[], sortKey: SectionSortKey): Project[] {
  return [...projects].sort((a, b) => {
    switch (sortKey) {
      case 'days': return getDaysInStage(b) - getDaysInStage(a) // descending
      case 'contract': return (Number(b.contract) || 0) - (Number(a.contract) || 0) // descending
      case 'name': return (a.name ?? '').localeCompare(b.name ?? '') // ascending
      default: return 0
    }
  })
}
