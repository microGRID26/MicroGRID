import { describe, it, expect } from 'vitest'

describe('schedule week navigation', () => {
  function getWeekDates(weekOffset: number): string[] {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7)
    const dates: string[] = []
    for (let i = 0; i < 6; i++) { // Mon-Sat
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    return dates
  }

  it('returns 6 dates (Mon-Sat)', () => {
    const dates = getWeekDates(0)
    expect(dates).toHaveLength(6)
  })

  it('next week starts 7 days later', () => {
    const thisWeek = getWeekDates(0)
    const nextWeek = getWeekDates(1)
    const diff = new Date(nextWeek[0]).getTime() - new Date(thisWeek[0]).getTime()
    expect(diff).toBe(7 * 86400000)
  })

  it('prev week starts 7 days earlier', () => {
    const thisWeek = getWeekDates(0)
    const prevWeek = getWeekDates(-1)
    const diff = new Date(thisWeek[0]).getTime() - new Date(prevWeek[0]).getTime()
    expect(diff).toBe(7 * 86400000)
  })
})

describe('schedule job type colors', () => {
  const JOB_COLORS: Record<string, string> = {
    survey: 'blue', install: 'green', inspection: 'amber', service: 'pink',
  }

  it('all job types have colors', () => {
    for (const type of ['survey', 'install', 'inspection', 'service']) {
      expect(JOB_COLORS[type]).toBeDefined()
    }
  })
})

describe('schedule conflict detection', () => {
  function hasConflict(existingJobs: { id: string; crew_id: string; date: string }[], currentId: string | null, crew_id: string, date: string): boolean {
    const others = existingJobs.filter(s => s.crew_id === crew_id && s.date === date && s.id !== currentId)
    return others.length > 0
  }

  it('detects conflict when crew has another job', () => {
    const jobs = [{ id: 'J1', crew_id: 'C1', date: '2025-03-19' }]
    expect(hasConflict(jobs, 'J2', 'C1', '2025-03-19')).toBe(true)
  })

  it('no conflict for different crew', () => {
    const jobs = [{ id: 'J1', crew_id: 'C1', date: '2025-03-19' }]
    expect(hasConflict(jobs, 'J2', 'C2', '2025-03-19')).toBe(false)
  })

  it('no conflict for different date', () => {
    const jobs = [{ id: 'J1', crew_id: 'C1', date: '2025-03-19' }]
    expect(hasConflict(jobs, 'J2', 'C1', '2025-03-20')).toBe(false)
  })

  it('excludes current job from conflict check', () => {
    const jobs = [{ id: 'J1', crew_id: 'C1', date: '2025-03-19' }]
    expect(hasConflict(jobs, 'J1', 'C1', '2025-03-19')).toBe(false)
  })
})
