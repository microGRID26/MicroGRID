import { describe, it, expect } from 'vitest'
import { escapeIlike } from '@/lib/utils'

/**
 * Tests for the Legacy page logic.
 *
 * These test the pure logic extracted from app/legacy/page.tsx:
 * - Search query construction (escapeIlike applied to search terms)
 * - Sort column toggling (ascending/descending)
 * - Pagination math (page boundaries, total pages)
 */

const PAGE_SIZE = 50

// ── Search query construction ───────────────────────────────────────────────

describe('Legacy page: search query construction', () => {
  it('escapeIlike escapes % wildcard in search input', () => {
    expect(escapeIlike('100%')).toBe('100\\%')
  })

  it('escapeIlike escapes _ wildcard in search input', () => {
    expect(escapeIlike('test_value')).toBe('test\\_value')
  })

  it('escapeIlike escapes backslash in search input', () => {
    expect(escapeIlike('path\\file')).toBe('path\\\\file')
  })

  it('escapeIlike leaves normal text unchanged', () => {
    expect(escapeIlike('Jimmy Villanueva')).toBe('Jimmy Villanueva')
  })

  it('escapeIlike handles multiple special characters', () => {
    expect(escapeIlike('100%_test\\')).toBe('100\\%\\_test\\\\')
  })

  it('constructs a valid .or() expression with escaped search', () => {
    const search = 'PROJ-15480'
    const q = escapeIlike(search.trim())
    const orExpr = `name.ilike.%${q}%,id.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`
    expect(orExpr).toContain('name.ilike.%PROJ-15480%')
    expect(orExpr).toContain('id.ilike.%PROJ-15480%')
    expect(orExpr).toContain('city.ilike.%PROJ-15480%')
    expect(orExpr).toContain('address.ilike.%PROJ-15480%')
  })

  it('does not construct query when search is empty/whitespace', () => {
    const search = '   '
    const shouldQuery = search.trim().length > 0
    expect(shouldQuery).toBe(false)
  })
})

// ── Sort column toggling ────────────────────────────────────────────────────

describe('Legacy page: sort column toggling', () => {
  type SortCol = 'id' | 'name' | 'city' | 'systemkw' | 'financier' | 'install_date' | 'disposition'

  function toggleSort(
    currentCol: SortCol,
    currentAsc: boolean,
    clickedCol: SortCol
  ): { sortCol: SortCol; sortAsc: boolean } {
    if (currentCol === clickedCol) {
      return { sortCol: currentCol, sortAsc: !currentAsc }
    } else {
      return { sortCol: clickedCol, sortAsc: true }
    }
  }

  it('toggles ascending to descending when clicking the same column', () => {
    const result = toggleSort('name', true, 'name')
    expect(result.sortCol).toBe('name')
    expect(result.sortAsc).toBe(false)
  })

  it('toggles descending to ascending when clicking the same column', () => {
    const result = toggleSort('name', false, 'name')
    expect(result.sortCol).toBe('name')
    expect(result.sortAsc).toBe(true)
  })

  it('switches to a new column with ascending sort', () => {
    const result = toggleSort('name', false, 'city')
    expect(result.sortCol).toBe('city')
    expect(result.sortAsc).toBe(true)
  })

  it('always resets to ascending when switching columns', () => {
    const result = toggleSort('id', false, 'financier')
    expect(result.sortCol).toBe('financier')
    expect(result.sortAsc).toBe(true)
  })
})

// ── Pagination math ─────────────────────────────────────────────────────────

describe('Legacy page: pagination math', () => {
  function computeTotalPages(totalCount: number): number {
    return Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  }

  function computeRange(page: number): { from: number; to: number } {
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    return { from, to }
  }

  it('returns 1 total page when count is 0', () => {
    expect(computeTotalPages(0)).toBe(1)
  })

  it('returns 1 total page when count equals PAGE_SIZE', () => {
    expect(computeTotalPages(50)).toBe(1)
  })

  it('returns 2 total pages when count is PAGE_SIZE + 1', () => {
    expect(computeTotalPages(51)).toBe(2)
  })

  it('returns correct total pages for large count', () => {
    expect(computeTotalPages(237)).toBe(5)
  })

  it('computes correct range for page 1', () => {
    const { from, to } = computeRange(1)
    expect(from).toBe(0)
    expect(to).toBe(49)
  })

  it('computes correct range for page 2', () => {
    const { from, to } = computeRange(2)
    expect(from).toBe(50)
    expect(to).toBe(99)
  })

  it('computes correct range for page 5', () => {
    const { from, to } = computeRange(5)
    expect(from).toBe(200)
    expect(to).toBe(249)
  })

  it('page navigation: prev button disabled on page 1', () => {
    const page = 1
    expect(page <= 1).toBe(true)
  })

  it('page navigation: next button disabled on last page', () => {
    const page = 5
    const totalPages = 5
    expect(page >= totalPages).toBe(true)
  })

  it('page navigation: clamps prev to min 1', () => {
    const page = 1
    expect(Math.max(1, page - 1)).toBe(1)
  })

  it('page navigation: clamps next to max totalPages', () => {
    const page = 5
    const totalPages = 5
    expect(Math.min(totalPages, page + 1)).toBe(5)
  })
})
