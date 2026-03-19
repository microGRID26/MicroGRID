import { describe, it, expect } from 'vitest'
import { daysAgo, SLA_THRESHOLDS } from '@/lib/utils'

// Mirror getSLA from command/page.tsx
function getSLA(stage: string, stage_date: string | null) {
  const t = SLA_THRESHOLDS[stage] ?? { target: 3, risk: 5, crit: 7 }
  const days = daysAgo(stage_date)
  let status: 'ok' | 'warn' | 'risk' | 'crit' = 'ok'
  if (days >= t.crit) status = 'crit'
  else if (days >= t.risk) status = 'risk'
  else if (days >= t.target) status = 'warn'
  return { days, status, ...t }
}

function daysAgoDate(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)
}

describe('getSLA', () => {
  it('returns ok for recent projects', () => {
    const result = getSLA('evaluation', daysAgoDate(1))
    expect(result.status).toBe('ok')
  })

  it('returns warn at target threshold', () => {
    // evaluation target = 3
    const result = getSLA('evaluation', daysAgoDate(3))
    expect(result.status).toBe('warn')
  })

  it('returns risk at risk threshold', () => {
    // evaluation risk = 4
    const result = getSLA('evaluation', daysAgoDate(4))
    expect(result.status).toBe('risk')
  })

  it('returns crit at critical threshold', () => {
    // evaluation crit = 6
    const result = getSLA('evaluation', daysAgoDate(6))
    expect(result.status).toBe('crit')
  })

  it('returns crit well past threshold', () => {
    const result = getSLA('evaluation', daysAgoDate(100))
    expect(result.status).toBe('crit')
  })

  it('handles permit stage with longer thresholds', () => {
    // permit: target=21, risk=30, crit=45
    expect(getSLA('permit', daysAgoDate(20)).status).toBe('ok')
    expect(getSLA('permit', daysAgoDate(21)).status).toBe('warn')
    expect(getSLA('permit', daysAgoDate(30)).status).toBe('risk')
    expect(getSLA('permit', daysAgoDate(45)).status).toBe('crit')
  })

  it('handles null stage_date (0 days = ok)', () => {
    const result = getSLA('evaluation', null)
    expect(result.status).toBe('ok')
    expect(result.days).toBe(0)
  })

  it('handles unknown stage with defaults', () => {
    const result = getSLA('unknown_stage', daysAgoDate(8))
    expect(result.status).toBe('crit') // default crit = 7
  })

  it('returns correct threshold values', () => {
    const result = getSLA('inspection', daysAgoDate(0))
    expect(result.target).toBe(14)
    expect(result.risk).toBe(21)
    expect(result.crit).toBe(30)
  })
})
