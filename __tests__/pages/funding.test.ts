import { describe, it, expect } from 'vitest'
import { getMsData, getSubmissionAge, type FundingRow, type MsData, type MilestoneKey, type SortColumn } from '@/components/funding'
import { FUNDING_STATUSES, FUNDING_STATUS_COMPACT, getStatusColor } from '@/components/funding/StatusSelect'
import { daysAgo, fmt$, fmtDate } from '@/lib/utils'
import type { Project, ProjectFunding } from '@/types/database'

// ── Helpers ──────────────────────────────────────────────────────────────

function daysAgoDate(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeProject(o: Partial<Project> = {}): Project {
  return {
    id: 'PROJ-001', name: 'Test Home', stage: 'install', city: 'Austin', address: '123 Main',
    financier: 'Sunrun', ahj: 'Austin', contract: 25000, sale_date: daysAgoDate(60),
    disposition: null, blocker: null, install_complete_date: null, pto_date: null,
    pm: 'Greg', pm_id: 'u1', stage_date: daysAgoDate(5),
    ...o,
  } as Project
}

function makeFunding(o: Partial<ProjectFunding> = {}): ProjectFunding {
  return {
    project_id: 'PROJ-001',
    m1_amount: 5000, m1_funded_date: null, m1_status: null, m1_notes: null, m1_cb: null, m1_cb_credit: null,
    m2_amount: 10000, m2_funded_date: null, m2_status: null, m2_notes: null, m2_cb: null, m2_cb_credit: null,
    m3_amount: 8000, m3_funded_date: null, m3_status: null, m3_notes: null, m3_projected: null,
    nonfunded_code_1: null, nonfunded_code_2: null, nonfunded_code_3: null,
    ...o,
  } as ProjectFunding
}

function makeRow(po: Partial<Project> = {}, fo: Partial<ProjectFunding> = {}): FundingRow {
  const p = makeProject(po)
  const f = makeFunding(fo)
  return {
    project: p, funding: f,
    m1: getMsData(f, p, 'm1'),
    m2: getMsData(f, p, 'm2'),
    m3: getMsData(f, p, 'm3'),
    nf1: f.nonfunded_code_1 ?? null,
    nf2: f.nonfunded_code_2 ?? null,
    nf3: f.nonfunded_code_3 ?? null,
  }
}

// ── getMsData ────────────────────────────────────────────────────────────

describe('getMsData', () => {
  it('M1 is always eligible', () => {
    const p = makeProject()
    const m = getMsData(null, p, 'm1')
    expect(m.isEligible).toBe(true)
    expect(m.isFunded).toBe(false)
    expect(m.amount).toBeNull()
  })

  it('M2 eligible when install_complete_date is set', () => {
    const p = makeProject({ install_complete_date: '2025-01-15' })
    const m = getMsData(null, p, 'm2')
    expect(m.isEligible).toBe(true)
  })

  it('M2 NOT eligible without install_complete_date', () => {
    const p = makeProject({ install_complete_date: null })
    const m = getMsData(null, p, 'm2')
    expect(m.isEligible).toBe(false)
  })

  it('M3 eligible when pto_date is set', () => {
    const p = makeProject({ pto_date: '2025-02-01' })
    const m = getMsData(null, p, 'm3')
    expect(m.isEligible).toBe(true)
  })

  it('M3 NOT eligible without pto_date', () => {
    const p = makeProject({ pto_date: null })
    const m = getMsData(null, p, 'm3')
    expect(m.isEligible).toBe(false)
  })

  it('returns amounts from funding record', () => {
    const p = makeProject()
    const f = makeFunding({ m1_amount: 5000, m2_amount: 10000, m3_amount: 8000 })
    expect(getMsData(f, p, 'm1').amount).toBe(5000)
    expect(getMsData(f, p, 'm2').amount).toBe(10000)
    expect(getMsData(f, p, 'm3').amount).toBe(8000)
  })

  it('isFunded when funded_date is set', () => {
    const p = makeProject()
    const f = makeFunding({ m1_funded_date: '2025-01-01' })
    expect(getMsData(f, p, 'm1').isFunded).toBe(true)
    expect(getMsData(f, p, 'm2').isFunded).toBe(false)
  })

  it('handles null funding record gracefully', () => {
    const p = makeProject()
    const m = getMsData(null, p, 'm2')
    expect(m.amount).toBeNull()
    expect(m.funded_date).toBeNull()
    expect(m.status).toBeNull()
    expect(m.notes).toBeNull()
    expect(m.isFunded).toBe(false)
  })
})

// ── getSubmissionAge (stale detection) ───────────────────────────────────

describe('getSubmissionAge — stale submission detection', () => {
  it('returns null for non-submitted status', () => {
    expect(getSubmissionAge('Funded', daysAgoDate(90))).toBeNull()
    expect(getSubmissionAge('Ready To Start', daysAgoDate(90))).toBeNull()
    expect(getSubmissionAge(null, daysAgoDate(90))).toBeNull()
  })

  it('returns null for submitted without date', () => {
    expect(getSubmissionAge('Submitted', null)).toBeNull()
  })

  it('returns gray for recent submissions (<= 30 days)', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(10))
    expect(result).not.toBeNull()
    expect(result!.days).toBe(10)
    expect(result!.color).toBe('text-gray-500')
  })

  it('returns amber for 31-60 day submissions', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(45))
    expect(result).not.toBeNull()
    expect(result!.days).toBe(45)
    expect(result!.color).toBe('text-amber-400')
  })

  it('returns red for >60 day submissions', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(75))
    expect(result).not.toBeNull()
    expect(result!.days).toBe(75)
    expect(result!.color).toBe('text-red-400')
  })

  it('boundary: exactly 30 days is gray', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(30))
    expect(result).not.toBeNull()
    expect(result!.color).toBe('text-gray-500')
  })

  it('boundary: exactly 31 days is amber', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(31))
    expect(result).not.toBeNull()
    expect(result!.color).toBe('text-amber-400')
  })

  it('boundary: exactly 60 days is amber', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(60))
    expect(result).not.toBeNull()
    expect(result!.color).toBe('text-amber-400')
  })

  it('boundary: exactly 61 days is red', () => {
    const result = getSubmissionAge('Submitted', daysAgoDate(61))
    expect(result).not.toBeNull()
    expect(result!.color).toBe('text-red-400')
  })
})

// ── Status colors ────────────────────────────────────────────────────────

describe('getStatusColor', () => {
  it('returns green for Funded', () => expect(getStatusColor('Funded')).toBe('text-green-400'))
  it('returns green for Complete', () => expect(getStatusColor('Complete')).toBe('text-green-400'))
  it('returns blue for Submitted', () => expect(getStatusColor('Submitted')).toBe('text-blue-400'))
  it('returns amber for Ready To Start', () => expect(getStatusColor('Ready To Start')).toBe('text-amber-400'))
  it('returns red for Pending Resolution', () => expect(getStatusColor('Pending Resolution')).toBe('text-red-400'))
  it('returns orange for Revision Required', () => expect(getStatusColor('Revision Required')).toBe('text-orange-400'))
  it('returns gray for null', () => expect(getStatusColor(null)).toBe('text-gray-500'))
  it('returns gray for unknown status', () => expect(getStatusColor('Unknown')).toBe('text-gray-500'))
})

// ── FUNDING_STATUSES and compact labels ──────────────────────────────────

describe('FUNDING_STATUSES', () => {
  it('has 5 statuses', () => {
    expect(FUNDING_STATUSES).toHaveLength(5)
  })

  it('every status has a compact label', () => {
    FUNDING_STATUSES.forEach(s => {
      expect(FUNDING_STATUS_COMPACT[s]).toBeDefined()
      expect(FUNDING_STATUS_COMPACT[s].length).toBeLessThanOrEqual(3)
    })
  })
})

// ── CSV export formatting ────────────────────────────────────────────────

describe('CSV export — escapeCell logic', () => {
  // Re-implement escapeCell for testing (extracted from exportFundingCSV.ts)
  function escapeCell(val: string | number | null | undefined): string {
    const s = val == null ? '' : String(val)
    return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }

  it('passes through plain strings', () => {
    expect(escapeCell('hello')).toBe('hello')
  })

  it('wraps strings with commas in quotes', () => {
    expect(escapeCell('hello, world')).toBe('"hello, world"')
  })

  it('escapes double quotes', () => {
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""')
  })

  it('handles newlines', () => {
    expect(escapeCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('handles carriage returns', () => {
    expect(escapeCell('line1\rline2')).toBe('"line1\rline2"')
  })

  it('returns empty string for null', () => {
    expect(escapeCell(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(escapeCell(undefined)).toBe('')
  })

  it('converts numbers to string', () => {
    expect(escapeCell(12345)).toBe('12345')
  })

  it('handles zero', () => {
    expect(escapeCell(0)).toBe('0')
  })
})

// ── Funding data filtering ───────────────────────────────────────────────

describe('funding data filtering', () => {
  // Reproduce the filter logic from the page
  type FundingFilter = 'all' | 'ready' | 'submitted' | 'pending' | 'revision' | 'funded' | 'nonfunded'

  function filterRows(rows: FundingRow[], statusFilter: FundingFilter, financierFilter: string, search: string): FundingRow[] {
    return rows.filter(r => {
      const p = r.project
      if (financierFilter !== 'all' && p.financier !== financierFilter) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !p.name?.toLowerCase().includes(q) &&
          !p.id?.toLowerCase().includes(q) &&
          !p.city?.toLowerCase().includes(q) &&
          !p.address?.toLowerCase().includes(q) &&
          !p.financier?.toLowerCase().includes(q) &&
          !p.ahj?.toLowerCase().includes(q)
        ) return false
      }

      const anyStatus = (s: string) => r.m1.status === s || r.m2.status === s || r.m3.status === s
      if (statusFilter === 'ready' && !anyStatus('Ready To Start')) return false
      if (statusFilter === 'submitted' && !anyStatus('Submitted')) return false
      if (statusFilter === 'pending' && !anyStatus('Pending Resolution')) return false
      if (statusFilter === 'revision' && !anyStatus('Revision Required')) return false
      if (statusFilter === 'funded' && !r.m1.isFunded && !r.m2.isFunded && !r.m3.isFunded) return false
      if (statusFilter === 'nonfunded' && !r.nf1) return false

      return true
    })
  }

  const row1 = makeRow(
    { id: 'PROJ-001', name: 'Alpha Home', financier: 'Sunrun', city: 'Austin', ahj: 'CoA' },
    { m2_status: 'Submitted', m1_funded_date: '2025-01-01' }
  )
  const row2 = makeRow(
    { id: 'PROJ-002', name: 'Beta Residence', financier: 'Mosaic', city: 'Dallas', ahj: 'CoD' },
    { m2_status: 'Funded', m2_funded_date: '2025-02-01', nonfunded_code_1: 'NF-01' }
  )
  const row3 = makeRow(
    { id: 'PROJ-003', name: 'Gamma Place', financier: 'Sunrun', city: 'Houston', ahj: 'CoH' },
    { m3_status: 'Pending Resolution' }
  )
  const allRows = [row1, row2, row3]

  it('all filter returns everything', () => {
    expect(filterRows(allRows, 'all', 'all', '')).toHaveLength(3)
  })

  it('filters by financier', () => {
    const result = filterRows(allRows, 'all', 'Sunrun', '')
    expect(result).toHaveLength(2)
    expect(result.every(r => r.project.financier === 'Sunrun')).toBe(true)
  })

  it('filters by status submitted', () => {
    const result = filterRows(allRows, 'submitted', 'all', '')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-001')
  })

  it('filters by status funded', () => {
    const result = filterRows(allRows, 'funded', 'all', '')
    expect(result).toHaveLength(2) // row1 has m1 funded, row2 has m2 funded
  })

  it('filters by status pending', () => {
    const result = filterRows(allRows, 'pending', 'all', '')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-003')
  })

  it('filters by nonfunded code', () => {
    const result = filterRows(allRows, 'nonfunded', 'all', '')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-002')
  })

  it('search by name', () => {
    const result = filterRows(allRows, 'all', 'all', 'Alpha')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-001')
  })

  it('search by project ID', () => {
    const result = filterRows(allRows, 'all', 'all', 'PROJ-003')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-003')
  })

  it('search by city', () => {
    const result = filterRows(allRows, 'all', 'all', 'Dallas')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-002')
  })

  it('search by AHJ', () => {
    const result = filterRows(allRows, 'all', 'all', 'CoH')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-003')
  })

  it('search by financier', () => {
    const result = filterRows(allRows, 'all', 'all', 'Mosaic')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-002')
  })

  it('search combined with status filter', () => {
    const result = filterRows(allRows, 'submitted', 'all', 'Alpha')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-001')
  })

  it('search combined with financier filter', () => {
    const result = filterRows(allRows, 'all', 'Sunrun', 'Gamma')
    expect(result).toHaveLength(1)
    expect(result[0].project.id).toBe('PROJ-003')
  })

  it('no results when search and filter conflict', () => {
    const result = filterRows(allRows, 'submitted', 'Mosaic', '')
    expect(result).toHaveLength(0)
  })

  it('case-insensitive search', () => {
    const result = filterRows(allRows, 'all', 'all', 'alpha')
    expect(result).toHaveLength(1)
  })

  it('whitespace-only search acts as no search', () => {
    const result = filterRows(allRows, 'all', 'all', '   ')
    expect(result).toHaveLength(3)
  })

  it('search does NOT bypass other filters', () => {
    // This tests the correct filter pattern (not early-returning on search)
    const result = filterRows(allRows, 'pending', 'Sunrun', 'Gamma')
    expect(result).toHaveLength(1) // only Gamma matches all three
  })
})

// ── Sorting logic ────────────────────────────────────────────────────────

describe('funding sorting', () => {
  function sortRows(rows: FundingRow[], col: SortColumn, dir: 'asc' | 'desc'): FundingRow[] {
    const d = dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      let av: string | number | null = null
      let bv: string | number | null = null
      switch (col) {
        case 'name': av = a.project.name; bv = b.project.name; break
        case 'financier': av = a.project.financier; bv = b.project.financier; break
        case 'contract': av = a.project.contract; bv = b.project.contract; break
        case 'm2_amount': av = a.m2.amount; bv = b.m2.amount; break
        case 'nf': av = a.nf1; bv = b.nf1; break
        default: av = a.project.financier; bv = b.project.financier
      }
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * d
      return String(av).localeCompare(String(bv)) * d
    })
  }

  const r1 = makeRow({ id: 'P1', name: 'Alpha', financier: 'Mosaic', contract: 30000 }, { m2_amount: 5000 })
  const r2 = makeRow({ id: 'P2', name: 'Beta', financier: 'Sunrun', contract: 20000 }, { m2_amount: 12000 })
  const r3 = makeRow({ id: 'P3', name: 'Charlie', financier: null, contract: null }, { m2_amount: null })

  it('sorts by name ascending', () => {
    const sorted = sortRows([r2, r3, r1], 'name', 'asc')
    expect(sorted.map(r => r.project.name)).toEqual(['Alpha', 'Beta', 'Charlie'])
  })

  it('sorts by name descending', () => {
    const sorted = sortRows([r1, r2, r3], 'name', 'desc')
    expect(sorted.map(r => r.project.name)).toEqual(['Charlie', 'Beta', 'Alpha'])
  })

  it('sorts by contract ascending (numeric)', () => {
    const sorted = sortRows([r2, r1, r3], 'contract', 'asc')
    expect(sorted.map(r => r.project.contract)).toEqual([20000, 30000, null])
  })

  it('sorts by contract descending (numeric)', () => {
    const sorted = sortRows([r1, r2, r3], 'contract', 'desc')
    expect(sorted.map(r => r.project.contract)).toEqual([30000, 20000, null])
  })

  it('null values sort to end regardless of direction', () => {
    const sorted = sortRows([r3, r1, r2], 'contract', 'asc')
    expect(sorted[sorted.length - 1].project.contract).toBeNull()
    const sortedDesc = sortRows([r3, r1, r2], 'contract', 'desc')
    expect(sortedDesc[sortedDesc.length - 1].project.contract).toBeNull()
  })

  it('sorts by milestone amount', () => {
    const sorted = sortRows([r2, r1, r3], 'm2_amount', 'asc')
    expect(sorted.map(r => r.m2.amount)).toEqual([5000, 12000, null])
  })

  it('null financier sorts to end', () => {
    const sorted = sortRows([r3, r1, r2], 'financier', 'asc')
    expect(sorted[sorted.length - 1].project.financier).toBeNull()
  })
})

// ── Stats computation ────────────────────────────────────────────────────

describe('funding stats computation', () => {
  function computeStats(rows: FundingRow[]) {
    const allMs = rows.flatMap(r => [r.m2, r.m3])
    const rts = allMs.filter(d => d.status === 'Ready To Start')
    const sub = allMs.filter(d => d.status === 'Submitted')
    const pnd = allMs.filter(d => d.status === 'Pending Resolution')
    const rev = allMs.filter(d => d.status === 'Revision Required')
    const fun = allMs.filter(d => d.status === 'Funded')
    const totalContract = rows.reduce((s, r) => s + (Number(r.project.contract) || 0), 0)
    const m2Eligible = rows.filter(r => r.m2.isEligible && r.m2.status !== 'Funded').length
    const m3Eligible = rows.filter(r => r.m3.isEligible && r.m3.status !== 'Funded').length
    const withNf = rows.filter(r => r.nf1).length
    return {
      totalProjects: rows.length, totalContract, readyToStart: rts.length,
      submitted: sub.length, pendingResolution: pnd.length, revisionRequired: rev.length,
      needsAttention: pnd.length + rev.length, funded: fun.length,
      fundedAmount: fun.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      outstanding: rts.reduce((s, d) => s + (Number(d.amount) || 0), 0) + sub.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      m2Eligible, m3Eligible, withNf,
    }
  }

  it('counts projects correctly', () => {
    const rows = [makeRow(), makeRow({ id: 'P2' })]
    const stats = computeStats(rows)
    expect(stats.totalProjects).toBe(2)
  })

  it('sums total contract', () => {
    const rows = [makeRow({ contract: 25000 }), makeRow({ id: 'P2', contract: 15000 })]
    const stats = computeStats(rows)
    expect(stats.totalContract).toBe(40000)
  })

  it('handles null contract values', () => {
    const rows = [makeRow({ contract: null }), makeRow({ id: 'P2', contract: 10000 })]
    const stats = computeStats(rows)
    expect(stats.totalContract).toBe(10000)
  })

  it('counts funded milestones', () => {
    const rows = [makeRow({}, { m2_status: 'Funded', m2_amount: 5000 })]
    const stats = computeStats(rows)
    expect(stats.funded).toBe(1)
    expect(stats.fundedAmount).toBe(5000)
  })

  it('calculates outstanding (RTS + submitted amounts)', () => {
    const rows = [
      makeRow({}, { m2_status: 'Ready To Start', m2_amount: 5000, m3_status: 'Submitted', m3_amount: 3000 }),
    ]
    const stats = computeStats(rows)
    expect(stats.outstanding).toBe(8000)
  })

  it('counts needs attention as pending + revision', () => {
    const rows = [
      makeRow({}, { m2_status: 'Pending Resolution', m3_status: 'Revision Required' }),
    ]
    const stats = computeStats(rows)
    expect(stats.needsAttention).toBe(2)
    expect(stats.pendingResolution).toBe(1)
    expect(stats.revisionRequired).toBe(1)
  })

  it('counts M2/M3 eligible correctly', () => {
    const rows = [
      makeRow({ install_complete_date: '2025-01-01', pto_date: '2025-02-01' }, {}),
      makeRow({ id: 'P2', install_complete_date: null, pto_date: null }, {}),
    ]
    const stats = computeStats(rows)
    expect(stats.m2Eligible).toBe(1) // only first project
    expect(stats.m3Eligible).toBe(1) // only first project
  })

  it('excludes funded from eligible count', () => {
    const rows = [
      makeRow({ install_complete_date: '2025-01-01' }, { m2_status: 'Funded' }),
    ]
    const stats = computeStats(rows)
    expect(stats.m2Eligible).toBe(0)
  })

  it('counts NF codes', () => {
    const rows = [
      makeRow({}, { nonfunded_code_1: 'NF-01' }),
      makeRow({ id: 'P2' }, { nonfunded_code_1: null }),
    ]
    const stats = computeStats(rows)
    expect(stats.withNf).toBe(1)
  })

  it('handles empty rows', () => {
    const stats = computeStats([])
    expect(stats.totalProjects).toBe(0)
    expect(stats.totalContract).toBe(0)
    expect(stats.outstanding).toBe(0)
    expect(stats.funded).toBe(0)
  })
})

// ── Task-based sections ──────────────────────────────────────────────────

describe('funding task-based sections', () => {
  it('readyToSubmit captures m2 and m3 with Ready To Start', () => {
    const rows = [
      makeRow({}, { m2_status: 'Ready To Start', m3_status: 'Ready To Start' }),
      makeRow({ id: 'P2' }, { m2_status: 'Submitted' }),
    ]
    const items: { id: string; milestone: string }[] = []
    rows.forEach(r => {
      if (r.m2.status === 'Ready To Start') items.push({ id: r.project.id, milestone: 'm2' })
      if (r.m3.status === 'Ready To Start') items.push({ id: r.project.id, milestone: 'm3' })
    })
    expect(items).toHaveLength(2)
    expect(items[0]).toEqual({ id: 'PROJ-001', milestone: 'm2' })
    expect(items[1]).toEqual({ id: 'PROJ-001', milestone: 'm3' })
  })

  it('needsAttention captures Pending Resolution and Revision Required', () => {
    const rows = [
      makeRow({}, { m2_status: 'Pending Resolution' }),
      makeRow({ id: 'P2' }, { m3_status: 'Revision Required' }),
      makeRow({ id: 'P3' }, { m2_status: 'Submitted' }),
    ]
    const items: string[] = []
    rows.forEach(r => {
      if (r.m2.status === 'Pending Resolution' || r.m2.status === 'Revision Required') items.push(r.project.id)
      if (r.m3.status === 'Pending Resolution' || r.m3.status === 'Revision Required') items.push(r.project.id)
    })
    expect(items).toHaveLength(2)
  })

  it('awaitingPayment sorts stale items to top', () => {
    const rows = [
      makeRow({ install_complete_date: daysAgoDate(10) }, { m2_status: 'Submitted' }),
      makeRow({ id: 'P2', install_complete_date: daysAgoDate(90) }, { m2_status: 'Submitted' }),
    ]
    const items = rows
      .filter(r => r.m2.status === 'Submitted')
      .map(r => ({ id: r.project.id, days: daysAgo(r.project.install_complete_date) }))
      .sort((a, b) => b.days - a.days)
    expect(items[0].id).toBe('P2')
    expect(items[0].days).toBe(90)
  })
})

// ── Edge cases ───────────────────────────────────────────────────────────

describe('funding edge cases', () => {
  it('row with all null funding data', () => {
    const row = makeRow({}, {
      m1_amount: null, m1_funded_date: null, m1_status: null, m1_notes: null,
      m2_amount: null, m2_funded_date: null, m2_status: null, m2_notes: null,
      m3_amount: null, m3_funded_date: null, m3_status: null, m3_notes: null,
    })
    expect(row.m1.amount).toBeNull()
    expect(row.m2.amount).toBeNull()
    expect(row.m3.amount).toBeNull()
    expect(row.m1.isFunded).toBe(false)
    expect(row.m2.isFunded).toBe(false)
    expect(row.m3.isFunded).toBe(false)
  })

  it('project with no funding record at all', () => {
    const p = makeProject()
    const row: FundingRow = {
      project: p, funding: null,
      m1: getMsData(null, p, 'm1'),
      m2: getMsData(null, p, 'm2'),
      m3: getMsData(null, p, 'm3'),
      nf1: null, nf2: null, nf3: null,
    }
    expect(row.m1.isEligible).toBe(true)
    expect(row.m1.amount).toBeNull()
    expect(row.nf1).toBeNull()
  })

  it('stale detection handles malformed dates via daysAgo', () => {
    // daysAgo returns 0 for invalid dates, so stale detection should be safe
    const result = getSubmissionAge('Submitted', 'invalid-date')
    // daysAgo('invalid-date') returns 0, so days=0, color=text-gray-500
    expect(result).not.toBeNull()
    expect(result!.days).toBe(0)
  })

  it('Number() conversion handles null and string amounts', () => {
    expect(Number(null) || 0).toBe(0)
    expect(Number('5000') || 0).toBe(5000)
    expect(Number('') || 0).toBe(0)
    expect(Number(undefined) || 0).toBe(0)
  })

  it('search handles null project fields without error', () => {
    const row = makeRow({ name: null as unknown as string, city: null, address: null, financier: null, ahj: null })
    // Should not throw
    const q = 'test'
    const matches = row.project.name?.toLowerCase().includes(q) ||
      row.project.id?.toLowerCase().includes(q) ||
      row.project.city?.toLowerCase().includes(q) ||
      row.project.address?.toLowerCase().includes(q) ||
      row.project.financier?.toLowerCase().includes(q) ||
      row.project.ahj?.toLowerCase().includes(q)
    expect(matches).toBeFalsy()
  })
})
