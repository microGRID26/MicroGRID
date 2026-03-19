import { describe, it, expect } from 'vitest'
import { STAGE_TASKS } from '@/lib/utils'

// Mirror stuck task detection from command/page.tsx
type TaskEntry = { status: string; reason?: string }

function getStuckTasks(
  stage: string,
  taskMap: Record<string, TaskEntry>
): { name: string; status: string; reason: string }[] {
  const tasks = STAGE_TASKS[stage] ?? []
  const stuck: { name: string; status: string; reason: string }[] = []
  for (const t of tasks) {
    const entry = taskMap[t.id]
    if (entry && (entry.status === 'Pending Resolution' || entry.status === 'Revision Required')) {
      stuck.push({ name: t.name, status: entry.status, reason: entry.reason ?? '' })
    }
  }
  return stuck
}

function getNextTask(
  stage: string,
  taskMap: Record<string, TaskEntry>
): string | null {
  const tasks = STAGE_TASKS[stage] ?? []
  for (const t of tasks) {
    const entry = taskMap[t.id]
    if (!entry || entry.status !== 'Complete') return t.name
  }
  return null
}

describe('getStuckTasks', () => {
  it('returns empty for no stuck tasks', () => {
    const taskMap = { welcome: { status: 'Complete' } }
    expect(getStuckTasks('evaluation', taskMap)).toEqual([])
  })

  it('detects Pending Resolution tasks', () => {
    const taskMap = { welcome: { status: 'Pending Resolution', reason: 'Waiting for docs' } }
    const stuck = getStuckTasks('evaluation', taskMap)
    expect(stuck).toHaveLength(1)
    expect(stuck[0].status).toBe('Pending Resolution')
    expect(stuck[0].reason).toBe('Waiting for docs')
  })

  it('detects Revision Required tasks', () => {
    const taskMap = { site_survey: { status: 'Revision Required', reason: 'Bad photos' } }
    const stuck = getStuckTasks('survey', taskMap)
    expect(stuck).toHaveLength(1)
    expect(stuck[0].status).toBe('Revision Required')
  })

  it('ignores In Progress and Complete tasks', () => {
    const taskMap = {
      welcome: { status: 'Complete' },
      ia: { status: 'In Progress' },
      ub: { status: 'Pending Resolution', reason: 'Missing bill' },
    }
    const stuck = getStuckTasks('evaluation', taskMap)
    expect(stuck).toHaveLength(1)
    expect(stuck[0].name).toBe('UB Confirmation')
  })

  it('returns multiple stuck tasks', () => {
    const taskMap = {
      welcome: { status: 'Pending Resolution', reason: 'No answer' },
      ia: { status: 'Revision Required', reason: 'Incorrect address' },
    }
    const stuck = getStuckTasks('evaluation', taskMap)
    expect(stuck).toHaveLength(2)
  })
})

describe('getNextTask', () => {
  it('returns first task when none complete', () => {
    const next = getNextTask('evaluation', {})
    expect(next).toBe('Welcome Call')
  })

  it('returns second task when first is complete', () => {
    const next = getNextTask('evaluation', { welcome: { status: 'Complete' } })
    expect(next).toBe('IA Confirmation')
  })

  it('returns null when all tasks complete', () => {
    const taskMap: Record<string, TaskEntry> = {}
    for (const t of STAGE_TASKS.evaluation) {
      taskMap[t.id] = { status: 'Complete' }
    }
    const next = getNextTask('evaluation', taskMap)
    expect(next).toBeNull()
  })

  it('handles unknown stage', () => {
    const next = getNextTask('unknown', {})
    expect(next).toBeNull()
  })
})
