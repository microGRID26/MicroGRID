import { describe, it, expect } from 'vitest'

// Mirror isEligible from funding/page.tsx
function isEligible(p: { install_complete_date: string | null; pto_date: string | null }, ms: 'm1' | 'm2' | 'm3'): boolean {
  if (ms === 'm1') return true
  if (ms === 'm2') return !!p.install_complete_date
  if (ms === 'm3') return !!p.pto_date
  return false
}

// Mirror getMilestoneData
function getMilestoneData(f: any, ms: 'm1' | 'm2' | 'm3') {
  if (!f) return { amount: null, funded_date: null, cb: null, cb_credit: null, nf1: null, nf2: null, nf3: null }
  return {
    amount:      ms === 'm1' ? f.m1_amount : ms === 'm2' ? f.m2_amount : f.m3_amount,
    funded_date: ms === 'm1' ? f.m1_funded_date : ms === 'm2' ? f.m2_funded_date : f.m3_funded_date,
    cb:          ms === 'm1' ? f.m1_cb : ms === 'm2' ? f.m2_cb : null,
    cb_credit:   ms === 'm1' ? f.m1_cb_credit : ms === 'm2' ? f.m2_cb_credit : null,
    nf1:         f.nonfunded_code_1,
    nf2:         f.nonfunded_code_2,
    nf3:         f.nonfunded_code_3,
  }
}

describe('isEligible', () => {
  it('M1 is always eligible', () => {
    expect(isEligible({ install_complete_date: null, pto_date: null }, 'm1')).toBe(true)
  })

  it('M2 requires install_complete_date', () => {
    expect(isEligible({ install_complete_date: null, pto_date: null }, 'm2')).toBe(false)
    expect(isEligible({ install_complete_date: '2025-01-15', pto_date: null }, 'm2')).toBe(true)
  })

  it('M3 requires pto_date', () => {
    expect(isEligible({ install_complete_date: null, pto_date: null }, 'm3')).toBe(false)
    expect(isEligible({ install_complete_date: '2025-01-15', pto_date: '2025-02-01' }, 'm3')).toBe(true)
  })
})

describe('getMilestoneData', () => {
  it('returns nulls when no funding record', () => {
    const data = getMilestoneData(null, 'm1')
    expect(data.amount).toBeNull()
    expect(data.funded_date).toBeNull()
  })

  it('returns M1 data', () => {
    const f = { m1_amount: 5000, m1_funded_date: '2025-01-10', m1_cb: 100, m1_cb_credit: 50, nonfunded_code_1: null, nonfunded_code_2: null, nonfunded_code_3: null }
    const data = getMilestoneData(f, 'm1')
    expect(data.amount).toBe(5000)
    expect(data.funded_date).toBe('2025-01-10')
    expect(data.cb).toBe(100)
  })

  it('returns M2 data', () => {
    const f = { m2_amount: 8000, m2_funded_date: '2025-02-10', m2_cb: 200, m2_cb_credit: 75, nonfunded_code_1: null, nonfunded_code_2: null, nonfunded_code_3: null }
    const data = getMilestoneData(f, 'm2')
    expect(data.amount).toBe(8000)
    expect(data.funded_date).toBe('2025-02-10')
  })

  it('returns M3 data', () => {
    const f = { m3_amount: 3000, m3_funded_date: null, nonfunded_code_1: 'NF01', nonfunded_code_2: null, nonfunded_code_3: null }
    const data = getMilestoneData(f, 'm3')
    expect(data.amount).toBe(3000)
    expect(data.funded_date).toBeNull()
    expect(data.cb).toBeNull() // M3 has no cb
    expect(data.nf1).toBe('NF01')
  })
})

describe('pendingAmount calculation', () => {
  it('sums amount for all milestones, not just m3_projected', () => {
    // This is the bug that was fixed — pendingAmount used to only sum m3_projected
    const rows = [
      { isEligible: true, isFunded: false, amount: 5000, milestone: 'm1' },
      { isEligible: true, isFunded: false, amount: 8000, milestone: 'm2' },
      { isEligible: true, isFunded: false, amount: 3000, milestone: 'm3' },
      { isEligible: true, isFunded: true, amount: 10000, milestone: 'm1' }, // funded, excluded
    ]

    const pendingAmount = rows
      .filter(r => r.isEligible && !r.isFunded)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)

    expect(pendingAmount).toBe(16000) // 5000 + 8000 + 3000
  })
})

describe('daysWaiting with malformed dates', () => {
  it('does not produce NaN for malformed triggerDate', () => {
    const triggerDate = 'not-a-date'
    const d = new Date(triggerDate + 'T00:00:00')
    const daysWaiting = !isNaN(d.getTime())
      ? Math.floor((Date.now() - d.getTime()) / 86400000)
      : null

    expect(daysWaiting).toBeNull()
    expect(daysWaiting).not.toBeNaN()
  })

  it('computes correctly for valid date', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10)
    const d = new Date(fiveDaysAgo + 'T00:00:00')
    const daysWaiting = !isNaN(d.getTime())
      ? Math.floor((Date.now() - d.getTime()) / 86400000)
      : null

    expect(daysWaiting).toBe(5)
  })
})
