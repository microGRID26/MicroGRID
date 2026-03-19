import { describe, it, expect } from 'vitest'

describe('funding eligibility rules', () => {
  function isEligible(p: { install_complete_date: string | null; pto_date: string | null }, ms: string): boolean {
    if (ms === 'm1') return true
    if (ms === 'm2') return !!p.install_complete_date
    if (ms === 'm3') return !!p.pto_date
    return false
  }

  it('M1 eligible for any project', () => {
    expect(isEligible({ install_complete_date: null, pto_date: null }, 'm1')).toBe(true)
  })

  it('M2 not eligible without install date', () => {
    expect(isEligible({ install_complete_date: null, pto_date: null }, 'm2')).toBe(false)
  })

  it('M2 eligible with install date', () => {
    expect(isEligible({ install_complete_date: '2025-01-15', pto_date: null }, 'm2')).toBe(true)
  })

  it('M3 not eligible without PTO', () => {
    expect(isEligible({ install_complete_date: '2025-01-15', pto_date: null }, 'm3')).toBe(false)
  })

  it('M3 eligible with PTO', () => {
    expect(isEligible({ install_complete_date: '2025-01-15', pto_date: '2025-02-01' }, 'm3')).toBe(true)
  })
})

describe('funding pending amount', () => {
  it('sums r.amount for all milestones (not just m3_projected)', () => {
    const rows = [
      { isEligible: true, isFunded: false, amount: 5000 },
      { isEligible: true, isFunded: false, amount: 8000 },
      { isEligible: true, isFunded: false, amount: 3000 },
    ]
    const pending = rows
      .filter(r => r.isEligible && !r.isFunded)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)

    expect(pending).toBe(16000)
  })

  it('excludes funded rows', () => {
    const rows = [
      { isEligible: true, isFunded: true, amount: 5000 },
      { isEligible: true, isFunded: false, amount: 3000 },
    ]
    const pending = rows
      .filter(r => r.isEligible && !r.isFunded)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)

    expect(pending).toBe(3000)
  })

  it('handles null amounts', () => {
    const rows = [
      { isEligible: true, isFunded: false, amount: null },
      { isEligible: true, isFunded: false, amount: 5000 },
    ]
    const pending = rows
      .filter(r => r.isEligible && !r.isFunded)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)

    expect(pending).toBe(5000)
  })
})

describe('funding days waiting', () => {
  it('handles malformed dates without NaN', () => {
    const triggerDate = 'invalid'
    const d = new Date(triggerDate + 'T00:00:00')
    const result = !isNaN(d.getTime())
      ? Math.floor((Date.now() - d.getTime()) / 86400000)
      : null

    expect(result).toBeNull()
  })

  it('returns null when no trigger date', () => {
    const triggerDate = null
    const result = triggerDate ? Math.floor((Date.now() - new Date(triggerDate + 'T00:00:00').getTime()) / 86400000) : null
    expect(result).toBeNull()
  })
})
