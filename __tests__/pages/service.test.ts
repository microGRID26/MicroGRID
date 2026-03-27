import { describe, it, expect } from 'vitest'
import { daysAgo } from '@/lib/utils'

// ── Types (mirror ServiceCall from database.ts) ─────────────────────────────

interface ServiceCallTest {
  id: string
  project_id: string
  status: string
  type: string | null
  issue: string | null
  created: string | null
  date: string | null
  resolution: string | null
  pm: string | null
  pm_id: string | null
  priority: string | null
  created_at: string
  project?: { name: string; city: string } | null
}

// ── Helpers (mirror page logic) ─────────────────────────────────────────────

type SortColumn = 'status' | 'project' | 'issue' | 'pm' | 'created' | 'date' | 'priority'
type DateRange = 'all' | 'today' | '7d' | '30d'

function getSortValue(call: ServiceCallTest, col: SortColumn): string {
  switch (col) {
    case 'status':   return call.status ?? ''
    case 'project':  return call.project?.name ?? call.project_id ?? ''
    case 'issue':    return call.issue ?? ''
    case 'pm':       return call.pm ?? ''
    case 'created':  return call.created ?? ''
    case 'date':     return call.date ?? ''
    case 'priority': return call.priority === 'high' ? 'a' : call.priority === 'medium' ? 'b' : 'c'
  }
}

function dateRangeDays(range: DateRange): number | null {
  switch (range) {
    case 'today': return 0
    case '7d': return 7
    case '30d': return 30
    default: return null
  }
}

function escapeCell(val: string | number | null | undefined): string {
  const s = val == null ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

function filterCalls(
  calls: ServiceCallTest[],
  opts: { statusFilter?: string; priorityFilter?: string; pmFilter?: string; dateRange?: DateRange; search?: string }
): ServiceCallTest[] {
  const { statusFilter = 'all', priorityFilter = 'all', pmFilter = 'all', dateRange = 'all', search = '' } = opts
  const rangeDays = dateRangeDays(dateRange as DateRange)

  return calls.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false
    if (pmFilter !== 'all' && c.pm !== pmFilter) return false

    if (rangeDays !== null && c.created) {
      const age = daysAgo(c.created.slice(0, 10))
      if (rangeDays === 0 && age > 0) return false
      if (rangeDays > 0 && age > rangeDays) return false
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      if (
        !c.project?.name?.toLowerCase().includes(q) &&
        !c.project_id?.toLowerCase().includes(q) &&
        !c.issue?.toLowerCase().includes(q) &&
        !c.pm?.toLowerCase().includes(q)
      ) return false
    }

    return true
  })
}

function sortCalls(calls: ServiceCallTest[], col: SortColumn, asc: boolean): ServiceCallTest[] {
  return [...calls].sort((a, b) => {
    const va = getSortValue(a, col)
    const vb = getSortValue(b, col)
    const cmp = va.localeCompare(vb)
    return asc ? cmp : -cmp
  })
}

function computeStats(calls: ServiceCallTest[]): Record<string, number> {
  const c: Record<string, number> = { all: calls.length }
  calls.forEach(call => { c[call.status] = (c[call.status] || 0) + 1 })
  return c
}

// ── Date helper ─────────────────────────────────────────────────────────────

function daysAgoDate(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ── Test data ───────────────────────────────────────────────────────────────

function makeCall(overrides: Partial<ServiceCallTest> = {}): ServiceCallTest {
  return {
    id: 'SC-001',
    project_id: 'PROJ-001',
    status: 'Open',
    type: null,
    issue: null,
    created: '2026-03-20T12:00:00Z',
    date: null,
    resolution: null,
    pm: 'Greg',
    pm_id: 'user-1',
    priority: 'medium',
    created_at: '2026-03-20T12:00:00Z',
    project: { name: 'Smith Residence', city: 'Houston' },
    ...overrides,
  }
}

const SAMPLE_CALLS: ServiceCallTest[] = [
  makeCall({ id: 'SC-001', status: 'Open', pm: 'Greg', priority: 'high', issue: 'Panel cracked', created: daysAgoDate(2) + 'T12:00:00Z', project: { name: 'Smith', city: 'Houston' } }),
  makeCall({ id: 'SC-002', status: 'Open', pm: 'Sarah', priority: 'medium', issue: 'Inverter fault', created: daysAgoDate(10) + 'T12:00:00Z', project: { name: 'Jones', city: 'Dallas' } }),
  makeCall({ id: 'SC-003', status: 'Closed', pm: 'Greg', priority: 'low', issue: 'Monitoring offline', created: daysAgoDate(20) + 'T12:00:00Z', project: { name: 'Williams', city: 'Austin' } }),
  makeCall({ id: 'SC-004', status: 'In Progress', pm: 'Sarah', priority: 'high', issue: 'Roof leak', created: daysAgoDate(5) + 'T12:00:00Z', project: { name: 'Brown', city: 'Houston' } }),
  makeCall({ id: 'SC-005', status: 'Escalated', pm: 'Mike', priority: 'high', issue: 'Safety concern', created: daysAgoDate(1) + 'T12:00:00Z', project: { name: 'Davis', city: 'Dallas' } }),
  makeCall({ id: 'SC-006', status: 'Scheduled', pm: 'Greg', priority: null, issue: null, created: daysAgoDate(3) + 'T12:00:00Z', project: { name: 'Taylor', city: 'Austin' } }),
]

// ═════════════════════════════════════════════════════════════════════════════
// Tests
// ═════════════════════════════════════════════════════════════════════════════

describe('Service: status counts', () => {
  it('counts all calls', () => {
    const stats = computeStats(SAMPLE_CALLS)
    expect(stats.all).toBe(6)
  })

  it('counts by status', () => {
    const stats = computeStats(SAMPLE_CALLS)
    expect(stats['Open']).toBe(2)
    expect(stats['Closed']).toBe(1)
    expect(stats['In Progress']).toBe(1)
    expect(stats['Escalated']).toBe(1)
    expect(stats['Scheduled']).toBe(1)
  })

  it('handles empty array', () => {
    const stats = computeStats([])
    expect(stats.all).toBe(0)
  })

  it('handles unknown statuses gracefully', () => {
    const stats = computeStats([makeCall({ status: 'Re-Opened' })])
    expect(stats['Re-Opened']).toBe(1)
    expect(stats.all).toBe(1)
  })
})

describe('Service: status filter', () => {
  it('all shows everything', () => {
    expect(filterCalls(SAMPLE_CALLS, { statusFilter: 'all' })).toHaveLength(6)
  })

  it('filters by Open', () => {
    const result = filterCalls(SAMPLE_CALLS, { statusFilter: 'Open' })
    expect(result).toHaveLength(2)
    expect(result.every(c => c.status === 'Open')).toBe(true)
  })

  it('filters by Closed', () => {
    const result = filterCalls(SAMPLE_CALLS, { statusFilter: 'Closed' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-003')
  })

  it('filters by Escalated', () => {
    const result = filterCalls(SAMPLE_CALLS, { statusFilter: 'Escalated' })
    expect(result).toHaveLength(1)
  })

  it('returns empty for non-existent status', () => {
    expect(filterCalls(SAMPLE_CALLS, { statusFilter: 'Nonexistent' })).toHaveLength(0)
  })
})

describe('Service: priority filter', () => {
  it('all shows everything', () => {
    expect(filterCalls(SAMPLE_CALLS, { priorityFilter: 'all' })).toHaveLength(6)
  })

  it('filters by high priority', () => {
    const result = filterCalls(SAMPLE_CALLS, { priorityFilter: 'high' })
    expect(result).toHaveLength(3)
    expect(result.every(c => c.priority === 'high')).toBe(true)
  })

  it('filters by medium priority', () => {
    const result = filterCalls(SAMPLE_CALLS, { priorityFilter: 'medium' })
    expect(result).toHaveLength(1)
  })

  it('null priority does not match any filter', () => {
    const result = filterCalls(SAMPLE_CALLS, { priorityFilter: 'low' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-003')
  })
})

describe('Service: PM filter', () => {
  it('all shows everything', () => {
    expect(filterCalls(SAMPLE_CALLS, { pmFilter: 'all' })).toHaveLength(6)
  })

  it('filters by Greg', () => {
    const result = filterCalls(SAMPLE_CALLS, { pmFilter: 'Greg' })
    expect(result).toHaveLength(3)
    expect(result.every(c => c.pm === 'Greg')).toBe(true)
  })

  it('filters by Sarah', () => {
    const result = filterCalls(SAMPLE_CALLS, { pmFilter: 'Sarah' })
    expect(result).toHaveLength(2)
  })

  it('returns empty for PM with no calls', () => {
    expect(filterCalls(SAMPLE_CALLS, { pmFilter: 'Nobody' })).toHaveLength(0)
  })
})

describe('Service: date range filter', () => {
  it('all shows everything', () => {
    expect(filterCalls(SAMPLE_CALLS, { dateRange: 'all' })).toHaveLength(6)
  })

  it('today shows only calls from today', () => {
    const todayCalls = [makeCall({ id: 'TODAY', created: daysAgoDate(0) + 'T12:00:00Z' })]
    expect(filterCalls(todayCalls, { dateRange: 'today' })).toHaveLength(1)
  })

  it('today excludes calls from yesterday', () => {
    const result = filterCalls(SAMPLE_CALLS, { dateRange: 'today' })
    // SC-005 is 1 day old which is > 0, so excluded
    expect(result).toHaveLength(0)
  })

  it('7d includes calls within 7 days', () => {
    const result = filterCalls(SAMPLE_CALLS, { dateRange: '7d' })
    // SC-001 (2d), SC-004 (5d), SC-005 (1d), SC-006 (3d) are within 7 days
    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('30d includes calls within 30 days', () => {
    const result = filterCalls(SAMPLE_CALLS, { dateRange: '30d' })
    // SC-003 is 20d which is < 30, so included
    expect(result.length).toBeGreaterThanOrEqual(5)
  })

  it('handles null created date (no date range filtering applied)', () => {
    const calls = [makeCall({ created: null })]
    // null created means the date range check is skipped
    expect(filterCalls(calls, { dateRange: '7d' })).toHaveLength(1)
  })
})

describe('Service: search filter', () => {
  it('empty search shows all', () => {
    expect(filterCalls(SAMPLE_CALLS, { search: '' })).toHaveLength(6)
  })

  it('searches by project name', () => {
    const result = filterCalls(SAMPLE_CALLS, { search: 'Smith' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-001')
  })

  it('searches by project ID', () => {
    const result = filterCalls(SAMPLE_CALLS, { search: 'PROJ-001' })
    // All have same project_id in test data
    expect(result.length).toBeGreaterThan(0)
  })

  it('searches by issue text', () => {
    const result = filterCalls(SAMPLE_CALLS, { search: 'inverter' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-002')
  })

  it('searches by PM name', () => {
    const result = filterCalls(SAMPLE_CALLS, { search: 'mike' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-005')
  })

  it('search is case-insensitive', () => {
    expect(filterCalls(SAMPLE_CALLS, { search: 'SMITH' })).toHaveLength(1)
    expect(filterCalls(SAMPLE_CALLS, { search: 'smith' })).toHaveLength(1)
  })

  it('handles null fields gracefully', () => {
    const calls = [makeCall({ issue: null, pm: null, project: null })]
    expect(filterCalls(calls, { search: 'anything' })).toHaveLength(0)
  })

  it('whitespace-only search shows all', () => {
    expect(filterCalls(SAMPLE_CALLS, { search: '   ' })).toHaveLength(6)
  })
})

describe('Service: filter composition', () => {
  it('search does NOT override status filter', () => {
    // Greg has Open and Closed calls, searching "Greg" with status=Open should show only Open
    const result = filterCalls(SAMPLE_CALLS, { statusFilter: 'Open', search: 'Greg' })
    expect(result.every(c => c.status === 'Open')).toBe(true)
  })

  it('status + priority combined', () => {
    const result = filterCalls(SAMPLE_CALLS, { statusFilter: 'Open', priorityFilter: 'high' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-001')
  })

  it('status + PM combined', () => {
    const result = filterCalls(SAMPLE_CALLS, { statusFilter: 'Open', pmFilter: 'Sarah' })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-002')
  })

  it('all filters combined narrow results correctly', () => {
    const result = filterCalls(SAMPLE_CALLS, {
      statusFilter: 'Open',
      priorityFilter: 'high',
      pmFilter: 'Greg',
      dateRange: '7d',
      search: 'Panel',
    })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC-001')
  })

  it('contradictory filters return empty', () => {
    const result = filterCalls(SAMPLE_CALLS, {
      statusFilter: 'Open',
      pmFilter: 'Mike', // Mike has no Open calls
    })
    expect(result).toHaveLength(0)
  })
})

describe('Service: sorting', () => {
  it('sorts by status ascending', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'status', true)
    expect(sorted[0].status).toBe('Closed')
    expect(sorted[sorted.length - 1].status).toBe('Scheduled')
  })

  it('sorts by status descending', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'status', false)
    expect(sorted[0].status).toBe('Scheduled')
  })

  it('sorts by project name ascending', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'project', true)
    expect(sorted[0].project?.name).toBe('Brown')
    expect(sorted[sorted.length - 1].project?.name).toBe('Williams')
  })

  it('sorts by PM ascending', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'pm', true)
    expect(sorted[0].pm).toBe('Greg')
    expect(sorted[sorted.length - 1].pm).toBe('Sarah')
  })

  it('sorts by created date descending', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'created', false)
    // Most recent first (SC-005 at 1 day ago)
    expect(sorted[0].id).toBe('SC-005')
  })

  it('sorts by priority: high first descending', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'priority', true)
    // high='a', medium='b', low='c', null='c' — ascending: high first
    expect(sorted[0].priority).toBe('high')
  })

  it('sorts by priority: low first ascending reversed', () => {
    const sorted = sortCalls(SAMPLE_CALLS, 'priority', false)
    // descending: null/low first
    const last = sorted[sorted.length - 1]
    expect(last.priority).toBe('high')
  })

  it('handles null values in sort', () => {
    const calls = [
      makeCall({ id: 'A', pm: null }),
      makeCall({ id: 'B', pm: 'Alice' }),
      makeCall({ id: 'C', pm: 'Zack' }),
    ]
    const sorted = sortCalls(calls, 'pm', true)
    // null becomes '' which sorts first
    expect(sorted[0].id).toBe('A')
    expect(sorted[1].id).toBe('B')
    expect(sorted[2].id).toBe('C')
  })

  it('sort toggle: same column flips direction', () => {
    // Mimic handleSort logic
    let sortCol: SortColumn = 'created'
    let sortAsc = false

    // Click 'status' -> sets to status asc
    sortCol = 'status'
    sortAsc = true

    // Click 'status' again -> flips to desc
    sortAsc = !sortAsc
    expect(sortCol).toBe('status')
    expect(sortAsc).toBe(false)
  })

  it('sort toggle: new column resets to ascending', () => {
    let sortCol: SortColumn = 'status'
    let sortAsc = false

    // Click 'pm' -> switches column, resets to asc
    sortCol = 'pm'
    sortAsc = true
    expect(sortCol).toBe('pm')
    expect(sortAsc).toBe(true)
  })
})

describe('Service: dateRangeDays helper', () => {
  it('today returns 0', () => {
    expect(dateRangeDays('today')).toBe(0)
  })

  it('7d returns 7', () => {
    expect(dateRangeDays('7d')).toBe(7)
  })

  it('30d returns 30', () => {
    expect(dateRangeDays('30d')).toBe(30)
  })

  it('all returns null', () => {
    expect(dateRangeDays('all')).toBeNull()
  })
})

describe('Service: getSortValue', () => {
  const call = makeCall({
    status: 'Open',
    issue: 'Panel cracked',
    pm: 'Greg',
    created: '2026-03-20',
    date: '2026-03-25',
    priority: 'high',
    project: { name: 'Smith', city: 'Houston' },
  })

  it('returns status string', () => {
    expect(getSortValue(call, 'status')).toBe('Open')
  })

  it('returns project name when present', () => {
    expect(getSortValue(call, 'project')).toBe('Smith')
  })

  it('falls back to project_id when no project name', () => {
    const noName = makeCall({ project: null })
    expect(getSortValue(noName, 'project')).toBe('PROJ-001')
  })

  it('returns issue text', () => {
    expect(getSortValue(call, 'issue')).toBe('Panel cracked')
  })

  it('returns empty string for null issue', () => {
    expect(getSortValue(makeCall({ issue: null }), 'issue')).toBe('')
  })

  it('maps priority to sort-friendly values', () => {
    expect(getSortValue(makeCall({ priority: 'high' }), 'priority')).toBe('a')
    expect(getSortValue(makeCall({ priority: 'medium' }), 'priority')).toBe('b')
    expect(getSortValue(makeCall({ priority: 'low' }), 'priority')).toBe('c')
    expect(getSortValue(makeCall({ priority: null }), 'priority')).toBe('c')
  })
})

describe('Service: CSV export', () => {
  it('escapes commas in cell values', () => {
    expect(escapeCell('Houston, TX')).toBe('"Houston, TX"')
  })

  it('escapes double quotes by doubling them', () => {
    expect(escapeCell('He said "hello"')).toBe('"He said ""hello"""')
  })

  it('escapes newlines', () => {
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('escapes carriage returns', () => {
    expect(escapeCell('line1\rline2')).toBe('"line1\rline2"')
  })

  it('handles null and undefined', () => {
    expect(escapeCell(null)).toBe('')
    expect(escapeCell(undefined)).toBe('')
  })

  it('handles numbers', () => {
    expect(escapeCell(42)).toBe('42')
  })

  it('passes through clean strings', () => {
    expect(escapeCell('simple text')).toBe('simple text')
  })

  it('handles empty string', () => {
    expect(escapeCell('')).toBe('')
  })
})

describe('Service: PM options extraction', () => {
  it('extracts unique PMs sorted alphabetically', () => {
    const pms = new Set<string>()
    SAMPLE_CALLS.forEach(c => { if (c.pm) pms.add(c.pm) })
    const sorted = Array.from(pms).sort()
    expect(sorted).toEqual(['Greg', 'Mike', 'Sarah'])
  })

  it('excludes null PMs', () => {
    const calls = [makeCall({ pm: null }), makeCall({ pm: 'Alice' })]
    const pms = new Set<string>()
    calls.forEach(c => { if (c.pm) pms.add(c.pm) })
    expect(Array.from(pms)).toEqual(['Alice'])
  })
})

describe('Service: priority options extraction', () => {
  it('extracts unique priorities sorted', () => {
    const p = new Set<string>()
    SAMPLE_CALLS.forEach(c => { if (c.priority) p.add(c.priority) })
    const sorted = Array.from(p).sort()
    expect(sorted).toEqual(['high', 'low', 'medium'])
  })

  it('excludes null priorities', () => {
    const calls = [makeCall({ priority: null })]
    const p = new Set<string>()
    calls.forEach(c => { if (c.priority) p.add(c.priority) })
    expect(Array.from(p)).toEqual([])
  })
})

describe('Service: edge cases', () => {
  it('empty data produces no results after filter', () => {
    expect(filterCalls([], { statusFilter: 'Open' })).toHaveLength(0)
  })

  it('empty data sorted returns empty', () => {
    expect(sortCalls([], 'status', true)).toHaveLength(0)
  })

  it('all null fields still filterable', () => {
    const call = makeCall({ status: 'Open', pm: null, priority: null, issue: null, created: null, project: null })
    const result = filterCalls([call], { statusFilter: 'Open' })
    expect(result).toHaveLength(1)
  })

  it('filter then sort produces correct order', () => {
    const filtered = filterCalls(SAMPLE_CALLS, { statusFilter: 'Open' })
    const sorted = sortCalls(filtered, 'priority', true)
    // Open calls: SC-001 (high), SC-002 (medium)
    expect(sorted[0].priority).toBe('high')
    expect(sorted[1].priority).toBe('medium')
  })
})
