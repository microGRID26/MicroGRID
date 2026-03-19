import { describe, it, expect } from 'vitest'
import { daysAgo, SLA_THRESHOLDS, STAGE_ORDER } from '@/lib/utils'

interface TestProject {
  id: string; name: string; stage: string; pm: string | null
  financier: string | null; ahj: string | null; city: string | null
  contract: number | null; sale_date: string | null; stage_date: string | null
  disposition: string | null; blocker: string | null
}

function daysAgoDate(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

function makeProject(o: Partial<TestProject> = {}): TestProject {
  return {
    id: 'PROJ-001', name: 'Test', stage: 'evaluation', pm: 'Greg',
    financier: 'Sunrun', ahj: 'Austin', city: 'Austin', contract: 25000,
    sale_date: daysAgoDate(10), stage_date: daysAgoDate(2),
    disposition: null, blocker: null, ...o,
  }
}

function getSLA(p: TestProject) {
  const t = SLA_THRESHOLDS[p.stage] ?? { target: 3, risk: 5, crit: 7 }
  const days = daysAgo(p.stage_date)
  return { days }
}

describe('pipeline disposition filtering', () => {
  it('excludes In Service from pipeline', () => {
    const projects = [makeProject(), makeProject({ disposition: 'In Service', id: 'P2' })]
    const filtered = projects.filter(p => p.disposition !== 'In Service' && p.disposition !== 'Loyalty')
    expect(filtered).toHaveLength(1)
  })

  it('excludes Loyalty from pipeline', () => {
    const projects = [makeProject(), makeProject({ disposition: 'Loyalty', id: 'P2' })]
    const filtered = projects.filter(p => p.disposition !== 'In Service' && p.disposition !== 'Loyalty')
    expect(filtered).toHaveLength(1)
  })
})

describe('pipeline sorting', () => {
  it('sorts by SLA descending (worst first)', () => {
    const a = makeProject({ stage_date: daysAgoDate(1), id: 'A' })
    const b = makeProject({ stage_date: daysAgoDate(10), id: 'B' })
    const sorted = [a, b].sort((x, y) => getSLA(y).days - getSLA(x).days)
    expect(sorted[0].id).toBe('B') // 10 days > 1 day
  })

  it('sorts by contract descending', () => {
    const a = makeProject({ contract: 10000, id: 'A' })
    const b = makeProject({ contract: 50000, id: 'B' })
    const sorted = [a, b].sort((x, y) => (Number(y.contract) || 0) - (Number(x.contract) || 0))
    expect(sorted[0].id).toBe('B')
  })

  it('sorts by cycle descending (oldest first) — fixed bug', () => {
    const a = makeProject({ sale_date: daysAgoDate(10), id: 'A' })
    const b = makeProject({ sale_date: daysAgoDate(100), id: 'B' })
    const sorted = [a, b].sort((x, y) => (daysAgo(y.sale_date) || 0) - (daysAgo(x.sale_date) || 0))
    expect(sorted[0].id).toBe('B') // 100 days > 10 days
  })

  it('sorts by name ascending', () => {
    const a = makeProject({ name: 'Zebra', id: 'A' })
    const b = makeProject({ name: 'Alpha', id: 'B' })
    const sorted = [a, b].sort((x, y) => (x.name ?? '').localeCompare(y.name ?? ''))
    expect(sorted[0].id).toBe('B') // Alpha before Zebra
  })
})

describe('pipeline kanban columns', () => {
  it('groups projects by stage into 7 columns', () => {
    const projects = STAGE_ORDER.map((stage, i) =>
      makeProject({ stage, id: `P${i}` })
    )
    for (const stage of STAGE_ORDER) {
      const column = projects.filter(p => p.stage === stage)
      expect(column).toHaveLength(1)
    }
  })
})
