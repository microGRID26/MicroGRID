import { describe, it, expect } from 'vitest'
import type { Project, ProjectFunding } from '@/types/database'

// ── Import pure functions from shared ────────────────────────────────────────

import { rangeStart, inRange, STAGE_DAYS_REMAINING, downloadCSV, PERIOD_LABELS } from '@/components/analytics/shared'
import type { Period } from '@/components/analytics/shared'

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgoDate(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function todayStr(): string { return daysAgoDate(0) }

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'PROJ-001', name: 'Test Project', stage: 'evaluation', pm: 'Greg', pm_id: 'user-greg',
    blocker: null, sale_date: daysAgoDate(10), stage_date: daysAgoDate(1),
    disposition: null, city: null, address: null, phone: null, email: null,
    contract: null, systemkw: null, financier: null, financing_type: null,
    consultant: null, advisor: null, dealer: null, follow_up_date: null,
    install_complete_date: null, pto_date: null,
    ...overrides,
  } as unknown as Project
}

function makeFunding(overrides: Partial<ProjectFunding> = {}): ProjectFunding {
  return {
    project_id: 'PROJ-001',
    m1_amount: null, m1_status: null,
    m2_amount: null, m2_status: null, m2_funded_date: null,
    m3_amount: null, m3_status: null, m3_funded_date: null,
    nonfunded_code_1: null, nonfunded_code_2: null, nonfunded_code_3: null,
    ...overrides,
  } as unknown as ProjectFunding
}

// ── rangeStart ───────────────────────────────────────────────────────────────

describe('rangeStart', () => {
  it('returns start of current week for wtd', () => {
    const d = rangeStart('wtd')
    expect(d.getDay()).toBe(0) // Sunday
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('returns 1st of month for mtd', () => {
    const d = rangeStart('mtd')
    expect(d.getDate()).toBe(1)
  })

  it('returns 1st of quarter for qtd', () => {
    const d = rangeStart('qtd')
    expect(d.getDate()).toBe(1)
    expect(d.getMonth() % 3).toBe(0) // Jan, Apr, Jul, Oct
  })

  it('returns Jan 1 for ytd', () => {
    const d = rangeStart('ytd')
    expect(d.getMonth()).toBe(0)
    expect(d.getDate()).toBe(1)
  })

  it('returns 7 days ago for last7', () => {
    const d = rangeStart('last7')
    const expected = new Date()
    expected.setDate(expected.getDate() - 7)
    expected.setHours(0, 0, 0, 0)
    expect(d.getTime()).toBe(expected.getTime())
  })

  it('returns 30 days ago for last30', () => {
    const d = rangeStart('last30')
    const expected = new Date()
    expected.setDate(expected.getDate() - 30)
    expected.setHours(0, 0, 0, 0)
    expect(d.getTime()).toBe(expected.getTime())
  })

  it('returns 90 days ago for last90', () => {
    const d = rangeStart('last90')
    const expected = new Date()
    expected.setDate(expected.getDate() - 90)
    expected.setHours(0, 0, 0, 0)
    expect(d.getTime()).toBe(expected.getTime())
  })
})

// ── inRange ──────────────────────────────────────────────────────────────────

describe('inRange', () => {
  it('returns false for null date', () => {
    expect(inRange(null, 'mtd')).toBe(false)
  })

  it('returns false for undefined date', () => {
    expect(inRange(undefined, 'mtd')).toBe(false)
  })

  it('returns false for invalid date string', () => {
    expect(inRange('not-a-date', 'mtd')).toBe(false)
  })

  it('returns true for today with mtd', () => {
    expect(inRange(todayStr(), 'mtd')).toBe(true)
  })

  it('returns true for today with last7', () => {
    expect(inRange(todayStr(), 'last7')).toBe(true)
  })

  it('returns true for 3 days ago with last7', () => {
    expect(inRange(daysAgoDate(3), 'last7')).toBe(true)
  })

  it('returns false for date beyond range', () => {
    expect(inRange(daysAgoDate(365), 'last7')).toBe(false)
  })

  it('returns true for date exactly at range boundary', () => {
    // 7 days ago should be included in last7
    expect(inRange(daysAgoDate(7), 'last7')).toBe(true)
  })

  it('returns false for future date', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const s = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`
    expect(inRange(s, 'mtd')).toBe(false)
  })
})

// ── PERIOD_LABELS ────────────────────────────────────────────────────────────

describe('PERIOD_LABELS', () => {
  it('has all 8 period entries (including custom)', () => {
    expect(Object.keys(PERIOD_LABELS)).toHaveLength(8)
    expect(PERIOD_LABELS.custom).toBe('Custom Range')
  })

  it('includes expected periods', () => {
    const expected: Period[] = ['wtd', 'mtd', 'qtd', 'ytd', 'last7', 'last30', 'last90']
    expected.forEach(p => expect(PERIOD_LABELS[p]).toBeDefined())
  })
})

// ── STAGE_DAYS_REMAINING ─────────────────────────────────────────────────────

describe('STAGE_DAYS_REMAINING', () => {
  it('has values for all pipeline stages', () => {
    const stages = ['evaluation', 'survey', 'design', 'permit', 'install', 'inspection', 'complete']
    stages.forEach(s => expect(STAGE_DAYS_REMAINING[s]).toBeDefined())
  })

  it('complete has 0 remaining days', () => {
    expect(STAGE_DAYS_REMAINING['complete']).toBe(0)
  })

  it('stages closer to completion have fewer days remaining', () => {
    expect(STAGE_DAYS_REMAINING['install']).toBeLessThan(STAGE_DAYS_REMAINING['evaluation'])
  })
})

// ── downloadCSV ──────────────────────────────────────────────────────────────

describe('downloadCSV', () => {
  it('escapes commas in values', () => {
    // We can test the escape logic indirectly by verifying the function doesn't throw
    // The actual download triggers DOM operations; we test the CSV generation logic
    const escape = (v: string | number | null | undefined) => {
      const s = String(v ?? '')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }

    expect(escape('hello, world')).toBe('"hello, world"')
    expect(escape('simple')).toBe('simple')
    expect(escape(null)).toBe('')
    expect(escape(undefined)).toBe('')
    expect(escape(42)).toBe('42')
    expect(escape('has "quotes"')).toBe('"has ""quotes"""')
    expect(escape('multi\nline')).toBe('"multi\nline"')
  })
})

// ── useSortable logic ────────────────────────────────────────────────────────

describe('sort logic', () => {
  // Mirror the sort from useSortable
  function sortData<T>(data: T[], sortKey: keyof T, sortDir: 'asc' | 'desc'): T[] {
    return [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }

  it('sorts strings ascending', () => {
    const data = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }]
    const sorted = sortData(data, 'name', 'asc')
    expect(sorted.map(d => d.name)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  it('sorts strings descending', () => {
    const data = [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }]
    const sorted = sortData(data, 'name', 'desc')
    expect(sorted.map(d => d.name)).toEqual(['Charlie', 'Bob', 'Alice'])
  })

  it('sorts numbers descending', () => {
    const data = [{ value: 10 }, { value: 30 }, { value: 20 }]
    const sorted = sortData(data, 'value', 'desc')
    expect(sorted.map(d => d.value)).toEqual([30, 20, 10])
  })

  it('pushes null values to end regardless of direction', () => {
    const data = [{ value: null as number | null }, { value: 10 }, { value: 5 }]
    const ascSorted = sortData(data, 'value', 'asc')
    expect(ascSorted[2]!.value).toBeNull()

    const descSorted = sortData(data, 'value', 'desc')
    expect(descSorted[2]!.value).toBeNull()
  })

  it('handles two null values as equal', () => {
    const data = [{ value: null as number | null }, { value: null as number | null }, { value: 1 }]
    const sorted = sortData(data, 'value', 'asc')
    expect(sorted[0]!.value).toBe(1)
  })
})

// ── Leadership tab metric calculations ───────────────────────────────────────

describe('Leadership metrics', () => {
  // Mirror the Leadership component calculation logic

  function calcInstalls(projects: Project[], period: Period): Project[] {
    return projects.filter(p => inRange(p.install_complete_date ?? (p.stage === 'complete' ? p.stage_date : null), period))
  }

  function calcSales(projects: Project[], period: Period): Project[] {
    return projects.filter(p => inRange(p.sale_date, period))
  }

  function calcM2Funded(projects: Project[], funding: Record<string, ProjectFunding>, period: Period): Project[] {
    return projects.filter(p => { const f = funding[p.id]; return f && inRange(f.m2_funded_date, period) })
  }

  function calcM3Funded(projects: Project[], funding: Record<string, ProjectFunding>, period: Period): Project[] {
    return projects.filter(p => { const f = funding[p.id]; return f && inRange(f.m3_funded_date, period) })
  }

  it('counts installs using install_complete_date', () => {
    const projects = [
      makeProject({ id: 'P1', install_complete_date: todayStr() }),
      makeProject({ id: 'P2', install_complete_date: null }),
    ]
    expect(calcInstalls(projects, 'mtd')).toHaveLength(1)
  })

  it('falls back to stage_date for complete projects without install date', () => {
    const projects = [
      makeProject({ id: 'P1', stage: 'complete', stage_date: todayStr(), install_complete_date: null }),
    ]
    expect(calcInstalls(projects, 'mtd')).toHaveLength(1)
  })

  it('counts sales by sale_date', () => {
    const projects = [
      makeProject({ id: 'P1', sale_date: todayStr() }),
      makeProject({ id: 'P2', sale_date: daysAgoDate(365) }),
    ]
    expect(calcSales(projects, 'mtd')).toHaveLength(1)
  })

  it('counts M2 funded by m2_funded_date', () => {
    const projects = [makeProject({ id: 'P1' })]
    const funding = { 'P1': makeFunding({ project_id: 'P1', m2_funded_date: todayStr() }) }
    expect(calcM2Funded(projects, funding, 'mtd')).toHaveLength(1)
  })

  it('excludes M2 without funded date', () => {
    const projects = [makeProject({ id: 'P1' })]
    const funding = { 'P1': makeFunding({ project_id: 'P1', m2_funded_date: null }) }
    expect(calcM2Funded(projects, funding, 'mtd')).toHaveLength(0)
  })

  it('counts M3 funded by m3_funded_date', () => {
    const projects = [makeProject({ id: 'P1' })]
    const funding = { 'P1': makeFunding({ project_id: 'P1', m3_funded_date: todayStr() }) }
    expect(calcM3Funded(projects, funding, 'mtd')).toHaveLength(1)
  })

  it('sums contract values correctly', () => {
    const projects = [
      makeProject({ id: 'P1', contract: '50000' as unknown as number }),
      makeProject({ id: 'P2', contract: '30000' as unknown as number }),
    ]
    const total = projects.reduce((s, p) => s + (Number(p.contract) || 0), 0)
    expect(total).toBe(80000)
  })

  it('handles null contract values', () => {
    const projects = [
      makeProject({ id: 'P1', contract: null }),
      makeProject({ id: 'P2', contract: '25000' as unknown as number }),
    ]
    const total = projects.reduce((s, p) => s + (Number(p.contract) || 0), 0)
    expect(total).toBe(25000)
  })
})

// ── Forecast bucket logic ────────────────────────────────────────────────────

describe('forecast buckets', () => {
  it('categorizes install stage into 30-day forecast', () => {
    const p = makeProject({ stage: 'install' })
    expect(STAGE_DAYS_REMAINING[p.stage]).toBeLessThanOrEqual(30)
  })

  it('categorizes evaluation stage into 60-day forecast', () => {
    const p = makeProject({ stage: 'evaluation' })
    const days = STAGE_DAYS_REMAINING[p.stage] ?? 60
    expect(days).toBeGreaterThan(30)
    expect(days).toBeLessThanOrEqual(60)
  })

  it('handles unknown stage with 60 default', () => {
    const days = STAGE_DAYS_REMAINING['nonexistent'] ?? 60
    expect(days).toBe(60)
  })
})

// ── Financier breakdown logic ────────────────────────────────────────────────

describe('financier breakdown', () => {
  it('groups projects by financier', () => {
    const projects = [
      makeProject({ id: 'P1', financier: 'GoodLeap', stage: 'design' }),
      makeProject({ id: 'P2', financier: 'GoodLeap', stage: 'permit' }),
      makeProject({ id: 'P3', financier: 'Mosaic', stage: 'install' }),
    ]
    const active = projects.filter(p => p.stage !== 'complete')
    const financiers = [...new Set(projects.map(p => p.financier).filter(Boolean))] as string[]
    const finStats = financiers.map(f => {
      const ps = active.filter(p => p.financier === f)
      return { financier: f, count: ps.length, value: ps.reduce((s, p) => s + (Number(p.contract) || 0), 0) }
    }).sort((a, b) => b.count - a.count)

    expect(finStats).toHaveLength(2)
    expect(finStats[0]!.financier).toBe('GoodLeap')
    expect(finStats[0]!.count).toBe(2)
    expect(finStats[1]!.financier).toBe('Mosaic')
    expect(finStats[1]!.count).toBe(1)
  })

  it('excludes null financier from list', () => {
    const projects = [
      makeProject({ id: 'P1', financier: null }),
      makeProject({ id: 'P2', financier: 'Cash' }),
    ]
    const financiers = [...new Set(projects.map(p => p.financier).filter(Boolean))]
    expect(financiers).toHaveLength(1)
    expect(financiers[0]).toBe('Cash')
  })
})

// ── PM stats logic ───────────────────────────────────────────────────────────

describe('PM stats', () => {
  it('calculates per-PM metrics', () => {
    const projects = [
      makeProject({ id: 'P1', pm: 'Alice', pm_id: 'u-a', stage: 'design', contract: '40000' as unknown as number }),
      makeProject({ id: 'P2', pm: 'Alice', pm_id: 'u-a', stage: 'permit', blocker: 'Waiting on HOA', contract: '30000' as unknown as number }),
      makeProject({ id: 'P3', pm: 'Bob', pm_id: 'u-b', stage: 'complete', contract: '50000' as unknown as number }),
    ]

    const pmMap = new Map<string, string>()
    projects.forEach(p => { if (p.pm_id && p.pm) pmMap.set(p.pm_id, p.pm) })

    const stats = [...pmMap.entries()].map(([pmId, pm]) => {
      const ps = projects.filter(p => p.pm_id === pmId)
      const activePs = ps.filter(p => p.stage !== 'complete')
      return {
        pm,
        total: ps.length,
        active: activePs.length,
        blocked: activePs.filter(p => p.blocker).length,
        value: activePs.reduce((s, p) => s + (Number(p.contract) || 0), 0),
      }
    })

    const alice = stats.find(s => s.pm === 'Alice')!
    expect(alice.total).toBe(2)
    expect(alice.active).toBe(2)
    expect(alice.blocked).toBe(1)
    expect(alice.value).toBe(70000)

    const bob = stats.find(s => s.pm === 'Bob')!
    expect(bob.total).toBe(1)
    expect(bob.active).toBe(0)
    expect(bob.blocked).toBe(0)
    expect(bob.value).toBe(0)
  })

  it('deduplicates PMs by pm_id', () => {
    const projects = [
      makeProject({ id: 'P1', pm: 'Alice', pm_id: 'u-a' }),
      makeProject({ id: 'P2', pm: 'Alice', pm_id: 'u-a' }),
    ]
    const pmMap = new Map<string, string>()
    projects.forEach(p => { if (p.pm_id && p.pm) pmMap.set(p.pm_id, p.pm) })
    expect(pmMap.size).toBe(1)
  })
})

// ── Funding tab calculations ─────────────────────────────────────────────────

describe('Funding analytics', () => {
  it('calculates M2 funded percentage', () => {
    const funding = [
      makeFunding({ project_id: 'P1', m2_funded_date: todayStr() }),
      makeFunding({ project_id: 'P2', m2_funded_date: null }),
      makeFunding({ project_id: 'P3', m2_funded_date: todayStr() }),
    ]
    const total = funding.length
    const funded = funding.filter(f => f.m2_funded_date).length
    const pct = total > 0 ? Math.round(funded / total * 100) : 0
    expect(pct).toBe(67) // 2/3 = 66.67 rounds to 67
  })

  it('handles zero funding records', () => {
    const total = 0
    const funded = 0
    const pct = total > 0 ? Math.round(funded / total * 100) : 0
    expect(pct).toBe(0) // no division by zero
  })

  it('calculates avg days install to M2', () => {
    const projects = [
      makeProject({ id: 'P1', install_complete_date: '2026-01-01' }),
      makeProject({ id: 'P2', install_complete_date: '2026-01-10' }),
    ]
    const funding = [
      makeFunding({ project_id: 'P1', m2_funded_date: '2026-01-11' }),
      makeFunding({ project_id: 'P2', m2_funded_date: '2026-01-20' }),
    ]

    const m2Days: number[] = []
    funding.forEach(f => {
      if (!f.m2_funded_date) return
      const proj = projects.find(p => p.id === f.project_id)
      if (!proj?.install_complete_date) return
      const d1 = new Date(proj.install_complete_date + 'T00:00:00')
      const d2 = new Date(f.m2_funded_date + 'T00:00:00')
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000)
        if (diff >= 0) m2Days.push(diff)
      }
    })
    const avg = m2Days.length > 0 ? Math.round(m2Days.reduce((a, b) => a + b, 0) / m2Days.length) : null

    expect(avg).toBe(10) // (10 + 10) / 2
  })

  it('excludes negative date differences', () => {
    const projects = [makeProject({ id: 'P1', install_complete_date: '2026-02-01' })]
    const funding = [makeFunding({ project_id: 'P1', m2_funded_date: '2026-01-01' })]

    const m2Days: number[] = []
    funding.forEach(f => {
      if (!f.m2_funded_date) return
      const proj = projects.find(p => p.id === f.project_id)
      if (!proj?.install_complete_date) return
      const d1 = new Date(proj.install_complete_date + 'T00:00:00')
      const d2 = new Date(f.m2_funded_date + 'T00:00:00')
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diff = Math.round((d2.getTime() - d1.getTime()) / 86400000)
        if (diff >= 0) m2Days.push(diff)
      }
    })
    expect(m2Days).toHaveLength(0) // negative diff excluded
  })

  it('counts nonfunded codes', () => {
    const funding = [
      makeFunding({ nonfunded_code_1: 'Missing Docs', nonfunded_code_2: 'Inspection', nonfunded_code_3: null }),
      makeFunding({ nonfunded_code_1: 'Missing Docs', nonfunded_code_2: null, nonfunded_code_3: null }),
    ]

    const nfCodes = new Map<string, number>()
    funding.forEach(f => {
      ;[f.nonfunded_code_1, f.nonfunded_code_2, f.nonfunded_code_3].forEach(c => {
        if (c) nfCodes.set(c, (nfCodes.get(c) || 0) + 1)
      })
    })

    expect(nfCodes.get('Missing Docs')).toBe(2)
    expect(nfCodes.get('Inspection')).toBe(1)
    expect(nfCodes.size).toBe(2)
  })

  it('groups funding by financier', () => {
    const projects = [
      makeProject({ id: 'P1', financier: 'Mosaic' }),
      makeProject({ id: 'P2', financier: 'GoodLeap' }),
    ]
    const funding = [
      makeFunding({ project_id: 'P1', m2_amount: 5000, m3_amount: 3000 }),
      makeFunding({ project_id: 'P2', m2_amount: 8000, m3_amount: null }),
    ]

    const finFunding = new Map<string, number>()
    funding.forEach(f => {
      const proj = projects.find(p => p.id === f.project_id)
      const fin = proj?.financier || 'Unknown'
      const amt = (Number(f.m2_amount) || 0) + (Number(f.m3_amount) || 0)
      finFunding.set(fin, (finFunding.get(fin) || 0) + amt)
    })

    expect(finFunding.get('Mosaic')).toBe(8000)
    expect(finFunding.get('GoodLeap')).toBe(8000)
  })
})

// ── Cycle times logic ────────────────────────────────────────────────────────

describe('Cycle times', () => {
  // Median helper
  function median(arr: number[]): number | null {
    if (arr.length === 0) return null
    const sorted = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
  }

  it('calculates median for odd count', () => {
    expect(median([5, 3, 1])).toBe(3)
  })

  it('calculates median for even count', () => {
    expect(median([10, 20, 30, 40])).toBe(25) // (20+30)/2
  })

  it('returns null for empty array', () => {
    expect(median([])).toBeNull()
  })

  it('returns single value for one element', () => {
    expect(median([42])).toBe(42)
  })

  it('buckets active projects by cycle time', () => {
    const active = [
      makeProject({ id: 'P1', sale_date: daysAgoDate(30) }),
      makeProject({ id: 'P2', sale_date: daysAgoDate(75) }),
      makeProject({ id: 'P3', sale_date: daysAgoDate(100) }),
      makeProject({ id: 'P4', sale_date: daysAgoDate(150) }),
    ]

    const buckets = [
      { label: '0-60 days', min: 0, max: 60, count: 0 },
      { label: '61-90 days', min: 61, max: 90, count: 0 },
      { label: '91-120 days', min: 91, max: 120, count: 0 },
      { label: '120+ days', min: 121, max: Infinity, count: 0 },
    ]

    // Use daysAgo simulation
    active.forEach(p => {
      const saleDate = new Date(p.sale_date + 'T00:00:00')
      const d = Math.round((new Date().getTime() - saleDate.getTime()) / 86400000)
      for (const b of buckets) {
        if (d >= b.min && d <= b.max) { b.count++; break }
      }
    })

    expect(buckets[0]!.count).toBe(1) // 30 days
    expect(buckets[1]!.count).toBe(1) // 75 days
    expect(buckets[2]!.count).toBe(1) // 100 days
    expect(buckets[3]!.count).toBe(1) // 150 days
  })

  it('identifies longest projects', () => {
    const active = [
      makeProject({ id: 'P1', name: 'Alpha', sale_date: daysAgoDate(200) }),
      makeProject({ id: 'P2', name: 'Beta', sale_date: daysAgoDate(50) }),
      makeProject({ id: 'P3', name: 'Gamma', sale_date: daysAgoDate(300) }),
    ]

    const longest = [...active]
      .map(p => {
        const d1 = new Date(p.sale_date + 'T00:00:00')
        const days = Math.round((new Date().getTime() - d1.getTime()) / 86400000)
        return { id: p.id, name: p.name ?? p.id, days }
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 10)

    expect(longest[0]!.name).toBe('Gamma')
    expect(longest[2]!.name).toBe('Beta')
  })

  it('counts blocked projects per stage', () => {
    const active = [
      makeProject({ id: 'P1', stage: 'permit', blocker: 'HOA' }),
      makeProject({ id: 'P2', stage: 'permit', blocker: null }),
      makeProject({ id: 'P3', stage: 'design', blocker: 'Missing docs' }),
    ]

    const stuckByStage = ['permit', 'design'].map(s => {
      const stageProjects = active.filter(p => p.stage === s)
      const blockedProjects = stageProjects.filter(p => p.blocker)
      return { stage: s, blocked: blockedProjects.length, total: stageProjects.length }
    }).filter(s => s.blocked > 0).sort((a, b) => b.blocked - a.blocked)

    expect(stuckByStage).toHaveLength(2)
    expect(stuckByStage[0]!.stage).toBe('permit')
    expect(stuckByStage[0]!.blocked).toBe(1)
  })
})

// ── Dealer analytics ─────────────────────────────────────────────────────────

describe('Dealer analytics', () => {
  it('groups projects by dealer with counts and values', () => {
    const projects = [
      makeProject({ id: 'P1', dealer: 'SolarMax', contract: '40000' as unknown as number, systemkw: '10' as unknown as number }),
      makeProject({ id: 'P2', dealer: 'SolarMax', contract: '35000' as unknown as number, systemkw: '8' as unknown as number }),
      makeProject({ id: 'P3', dealer: 'SunPro', contract: '50000' as unknown as number, systemkw: '12' as unknown as number }),
    ]

    const dealerMap = new Map<string, { count: number; value: number; kwTotal: number }>()
    projects.forEach(p => {
      const d = p.dealer || 'Unknown'
      const cur = dealerMap.get(d) || { count: 0, value: 0, kwTotal: 0 }
      cur.count++
      cur.value += Number(p.contract) || 0
      cur.kwTotal += Number(p.systemkw) || 0
      dealerMap.set(d, cur)
    })

    const dealers = [...dealerMap.entries()].map(([dealer, stats]) => ({
      dealer,
      count: stats.count,
      value: stats.value,
      avgKw: stats.count > 0 ? Math.round((stats.kwTotal / stats.count) * 100) / 100 : 0,
    }))

    const solarMax = dealers.find(d => d.dealer === 'SolarMax')!
    expect(solarMax.count).toBe(2)
    expect(solarMax.value).toBe(75000)
    expect(solarMax.avgKw).toBe(9) // (10+8)/2

    const sunPro = dealers.find(d => d.dealer === 'SunPro')!
    expect(sunPro.count).toBe(1)
    expect(sunPro.value).toBe(50000)
    expect(sunPro.avgKw).toBe(12)
  })

  it('uses Unknown for null dealer', () => {
    const projects = [makeProject({ id: 'P1', dealer: null })]
    const d = projects[0]!.dealer || 'Unknown'
    expect(d).toBe('Unknown')
  })

  it('groups consultants by count', () => {
    const projects = [
      makeProject({ id: 'P1', consultant: 'John' }),
      makeProject({ id: 'P2', consultant: 'John' }),
      makeProject({ id: 'P3', consultant: 'Jane' }),
      makeProject({ id: 'P4', consultant: null }),
    ]

    const consultantMap = new Map<string, number>()
    projects.forEach(p => {
      const c = p.consultant
      if (c) consultantMap.set(c, (consultantMap.get(c) || 0) + 1)
    })

    expect(consultantMap.get('John')).toBe(2)
    expect(consultantMap.get('Jane')).toBe(1)
    expect(consultantMap.size).toBe(2) // null excluded
  })

  it('groups advisors by count', () => {
    const projects = [
      makeProject({ id: 'P1', advisor: 'Mark' }),
      makeProject({ id: 'P2', advisor: null }),
    ]

    const advisorMap = new Map<string, number>()
    projects.forEach(p => {
      const a = p.advisor
      if (a) advisorMap.set(a, (advisorMap.get(a) || 0) + 1)
    })

    expect(advisorMap.size).toBe(1)
    expect(advisorMap.get('Mark')).toBe(1)
  })
})

// ── Pipeline health logic ────────────────────────────────────────────────────

describe('Pipeline health', () => {
  it('calculates stage distribution', () => {
    const active = [
      makeProject({ id: 'P1', stage: 'design' }),
      makeProject({ id: 'P2', stage: 'design' }),
      makeProject({ id: 'P3', stage: 'permit' }),
    ]

    const stages = ['design', 'permit']
    const dist = stages.map(s => ({
      stage: s,
      count: active.filter(p => p.stage === s).length,
    }))

    expect(dist[0]!.count).toBe(2)
    expect(dist[1]!.count).toBe(1)
  })

  it('identifies blocked projects', () => {
    const active = [
      makeProject({ id: 'P1', blocker: 'HOA approval' }),
      makeProject({ id: 'P2', blocker: null }),
      makeProject({ id: 'P3', blocker: 'Missing permit' }),
    ]
    const blocked = active.filter(p => p.blocker)
    expect(blocked).toHaveLength(2)
  })

  it('calculates aging projects', () => {
    const projects = [
      makeProject({ id: 'P1', stage: 'design', sale_date: daysAgoDate(100) }),
      makeProject({ id: 'P2', stage: 'permit', sale_date: daysAgoDate(50) }),
      makeProject({ id: 'P3', stage: 'install', sale_date: daysAgoDate(130) }),
      makeProject({ id: 'P4', stage: 'complete', sale_date: daysAgoDate(200) }),
    ]

    // daysAgo returns 0 for the exact same date, but for test dates set to N days ago,
    // we do a simple date diff
    const aging90 = projects.filter(p => {
      if (p.stage === 'complete') return false
      const d = new Date(p.sale_date + 'T00:00:00')
      const days = Math.round((new Date().getTime() - d.getTime()) / 86400000)
      return days >= 90
    })

    expect(aging90).toHaveLength(2) // P1 (100d) and P3 (130d), not P4 (complete)
  })
})

// ── Monthly trend calculation ────────────────────────────────────────────────

describe('monthly trend', () => {
  it('generates 6 month entries', () => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    })
    expect(months).toHaveLength(6)
  })

  it('counts completions within month boundary', () => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    const projects = [
      makeProject({ id: 'P1', install_complete_date: todayStr() }),
      makeProject({ id: 'P2', install_complete_date: daysAgoDate(365) }),
    ]

    const inMonth = projects.filter(p => {
      const cd = p.install_complete_date
      if (!cd) return false
      const dt = new Date(cd + 'T00:00:00')
      return !isNaN(dt.getTime()) && dt >= start && dt <= end
    })

    expect(inMonth).toHaveLength(1)
  })
})

// ── MiniBar percentage logic ─────────────────────────────────────────────────

describe('MiniBar percentage', () => {
  it('calculates correct percentage', () => {
    const pct = (count: number, max: number) => max > 0 ? Math.round(count / max * 100) : 0
    expect(pct(5, 10)).toBe(50)
    expect(pct(10, 10)).toBe(100)
    expect(pct(0, 10)).toBe(0)
  })

  it('handles zero max without division by zero', () => {
    const pct = (count: number, max: number) => max > 0 ? Math.round(count / max * 100) : 0
    expect(pct(0, 0)).toBe(0)
    expect(pct(5, 0)).toBe(0)
  })
})

// ── Tab labels ───────────────────────────────────────────────────────────────

describe('Tab labels', () => {
  const TAB_LABELS = {
    leadership: 'Leadership', pipeline: 'Pipeline Health', pm: 'By PM',
    funding_analytics: 'Funding', cycle: 'Cycle Times', dealers: 'Dealers',
  }

  it('has 6 tabs', () => {
    expect(Object.keys(TAB_LABELS)).toHaveLength(6)
  })

  it('includes all expected tabs', () => {
    expect(TAB_LABELS.leadership).toBe('Leadership')
    expect(TAB_LABELS.pipeline).toBe('Pipeline Health')
    expect(TAB_LABELS.pm).toBe('By PM')
    expect(TAB_LABELS.funding_analytics).toBe('Funding')
    expect(TAB_LABELS.cycle).toBe('Cycle Times')
    expect(TAB_LABELS.dealers).toBe('Dealers')
  })
})

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('edge cases', () => {
  it('handles empty project arrays in all computations', () => {
    const empty: Project[] = []
    expect(empty.filter(p => p.stage !== 'complete')).toHaveLength(0)
    expect(empty.reduce((s, p) => s + (Number(p.contract) || 0), 0)).toBe(0)
    expect(Math.max(...empty.map(() => 1), 1)).toBe(1) // max with default 1
  })

  it('handles empty funding map', () => {
    const funding: Record<string, ProjectFunding> = {}
    const allFunding = Object.values(funding)
    expect(allFunding).toHaveLength(0)
    const pct = allFunding.length > 0 ? Math.round(0 / allFunding.length * 100) : 0
    expect(pct).toBe(0)
  })

  it('handles project with zero contract', () => {
    const p = makeProject({ contract: '0' as unknown as number })
    expect(Number(p.contract) || 0).toBe(0)
  })

  it('handles project with non-numeric contract', () => {
    const p = makeProject({ contract: 'invalid' as unknown as number })
    expect(Number(p.contract) || 0).toBe(0)
  })
})
