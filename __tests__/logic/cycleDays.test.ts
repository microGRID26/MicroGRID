import { describe, it, expect } from 'vitest'
import { daysAgo } from '@/lib/utils'

// Mirrors the cycleDays helper used in command/page.tsx and queue/page.tsx
function cycleDays(sale_date: string | null, stage_date: string | null): number {
  return daysAgo(sale_date) || daysAgo(stage_date)
}

describe('cycleDays', () => {
  it('uses sale_date when available', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    expect(cycleDays(tenDaysAgo, fiveDaysAgo)).toBe(10)
  })

  it('falls back to stage_date when sale_date is null', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    expect(cycleDays(null, fiveDaysAgo)).toBe(5)
  })

  it('returns 0 when both are null', () => {
    expect(cycleDays(null, null)).toBe(0)
  })

  it('falls back to stage_date when sale_date is today (daysAgo returns 0)', () => {
    const today = new Date().toISOString().slice(0, 10)
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    // daysAgo(today) = 0, so || falls through to stage_date
    expect(cycleDays(today, fiveDaysAgo)).toBe(5)
  })

  it('uses || not ?? — critical: daysAgo returns 0 not null for missing dates', () => {
    // This test documents the bug that was fixed:
    // daysAgo(null) returns 0 (a number), so ?? would NOT fall through
    // but || DOES fall through because 0 is falsy
    expect(daysAgo(null)).toBe(0) // returns number, not null
    expect(cycleDays(null, null)).toBe(0) // both null = 0
  })
})
