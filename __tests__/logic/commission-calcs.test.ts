import { describe, it, expect } from 'vitest'
import {
  calculateCommission,
  getTieredRate,
  getGeoModifier,
  calculateTieredCommission,
  getVisibleUserIds,
} from '@/lib/api/commissions'
import type { CommissionRate, CommissionTier, CommissionGeoModifier, CommissionHierarchy } from '@/types/database'

// ── FIXTURES ───────────────────────────────────────────────────────────────

function makeRate(overrides: Partial<CommissionRate> = {}): CommissionRate {
  return {
    id: 'rate-1',
    role_key: 'sales_rep',
    label: 'Sales Rep',
    rate_type: 'per_watt',
    rate: 0.50,
    description: null,
    active: true,
    sort_order: 1,
    org_id: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as CommissionRate
}

function makeTier(overrides: Partial<CommissionTier> = {}): CommissionTier {
  return {
    id: 'tier-1',
    rate_id: 'rate-1',
    min_deals: null,
    max_deals: null,
    min_watts: null,
    max_watts: null,
    rate: 0.60,
    sort_order: 1,
    created_at: '',
    ...overrides,
  } as CommissionTier
}

function makeGeoMod(overrides: Partial<CommissionGeoModifier> = {}): CommissionGeoModifier {
  return {
    id: 'geo-1',
    state: null,
    city: null,
    region: null,
    modifier: 1.0,
    active: true,
    created_at: '',
    ...overrides,
  } as CommissionGeoModifier
}

// ── calculateCommission ────────────────────────────────────────────────────

describe('calculateCommission', () => {
  const rates: CommissionRate[] = [
    makeRate({ id: 'r1', role_key: 'sales_rep', rate_type: 'per_watt', rate: 0.50 }),
    makeRate({ id: 'r2', role_key: 'adder', rate_type: 'percentage', rate: 10 }),
    makeRate({ id: 'r3', role_key: 'referral', rate_type: 'flat', rate: 250 }),
  ]

  it('calculates per-watt solar commission', () => {
    const result = calculateCommission(10000, 0, 0, 'sales_rep', rates)
    // 10000W × $0.50/W = $5,000
    expect(result.solarCommission).toBe(5000)
    expect(result.total).toBe(5000)
  })

  it('calculates adder commission as percentage', () => {
    const result = calculateCommission(10000, 2000, 0, 'sales_rep', rates)
    // Solar: 10000 × 0.50 = 5000
    // Adder: 2000 × 10% = 200
    expect(result.adderCommission).toBe(200)
    expect(result.total).toBe(5200)
  })

  it('calculates referral commission as flat per referral', () => {
    const result = calculateCommission(10000, 0, 3, 'sales_rep', rates)
    // Solar: 5000, Referral: 3 × $250 = $750
    expect(result.referralCommission).toBe(750)
    expect(result.total).toBe(5750)
  })

  it('calculates full commission with all components', () => {
    const result = calculateCommission(10000, 2000, 2, 'sales_rep', rates)
    // Solar: 5000, Adder: 200, Referral: 500
    expect(result.total).toBe(5700)
  })

  it('returns zero for unknown role', () => {
    const result = calculateCommission(10000, 2000, 2, 'unknown_role', rates)
    expect(result.solarCommission).toBe(0)
    // Adder and referral still apply (they're global)
    expect(result.adderCommission).toBe(200)
    expect(result.referralCommission).toBe(500)
  })

  it('handles percentage rate type', () => {
    const pctRates = [makeRate({ role_key: 'sales_rep', rate_type: 'percentage', rate: 5 })]
    const result = calculateCommission(10000, 0, 0, 'sales_rep', pctRates)
    // 10000 × 5 / 100 = 500
    expect(result.solarCommission).toBe(500)
  })

  it('handles flat rate type', () => {
    const flatRates = [makeRate({ role_key: 'sales_rep', rate_type: 'flat', rate: 1000 })]
    const result = calculateCommission(10000, 0, 0, 'sales_rep', flatRates)
    expect(result.solarCommission).toBe(1000)
  })

  it('guards against negative inputs', () => {
    const result = calculateCommission(-5000, -100, -2, 'sales_rep', rates)
    expect(result.solarCommission).toBe(0)
    expect(result.adderCommission).toBe(0)
    expect(result.referralCommission).toBe(0)
  })

  it('ignores inactive rates', () => {
    const inactiveRates = [makeRate({ active: false })]
    const result = calculateCommission(10000, 0, 0, 'sales_rep', inactiveRates)
    expect(result.solarCommission).toBe(0)
  })

  it('rounds to 2 decimal places', () => {
    const oddRates = [makeRate({ rate: 0.333 })]
    const result = calculateCommission(10000, 0, 0, 'sales_rep', oddRates)
    // 10000 × 0.333 = 3330.0
    expect(result.solarCommission).toBe(3330)
  })
})

// ── getTieredRate ──────────────────────────────────────────────────────────

describe('getTieredRate', () => {
  const rates = [makeRate({ id: 'r1', rate: 0.50 })]
  const tiers: CommissionTier[] = [
    makeTier({ rate_id: 'r1', min_deals: 10, max_deals: 20, rate: 0.55, sort_order: 1 }),
    makeTier({ rate_id: 'r1', min_deals: 21, max_deals: null, rate: 0.60, sort_order: 2 }),
  ]

  it('returns base rate when no tiers match', () => {
    expect(getTieredRate('r1', 5, 0, rates, tiers)).toBe(0.50)
  })

  it('returns tiered rate when deal count matches', () => {
    expect(getTieredRate('r1', 15, 0, rates, tiers)).toBe(0.55)
  })

  it('returns higher tier for more deals', () => {
    expect(getTieredRate('r1', 25, 0, rates, tiers)).toBe(0.60)
  })

  it('returns base rate when no tiers exist', () => {
    expect(getTieredRate('r1', 100, 0, rates, [])).toBe(0.50)
  })

  it('returns 0 for unknown rate id', () => {
    expect(getTieredRate('unknown', 10, 0, rates, tiers)).toBe(0)
  })

  it('matches by watts when tier has watt bounds', () => {
    const wattTiers = [
      makeTier({ rate_id: 'r1', min_watts: 50000, max_watts: null, rate: 0.65, sort_order: 1 }),
    ]
    expect(getTieredRate('r1', 0, 60000, rates, wattTiers)).toBe(0.65)
    expect(getTieredRate('r1', 0, 30000, rates, wattTiers)).toBe(0.50) // below min
  })

  it('requires both deal and watt match when both specified', () => {
    const bothTiers = [
      makeTier({ rate_id: 'r1', min_deals: 10, min_watts: 50000, rate: 0.70, sort_order: 1 }),
    ]
    // Both match
    expect(getTieredRate('r1', 15, 60000, rates, bothTiers)).toBe(0.70)
    // Only deals match
    expect(getTieredRate('r1', 15, 30000, rates, bothTiers)).toBe(0.50)
    // Only watts match
    expect(getTieredRate('r1', 5, 60000, rates, bothTiers)).toBe(0.50)
  })

  it('first matching tier wins (by sort_order)', () => {
    const orderedTiers = [
      makeTier({ rate_id: 'r1', min_deals: 1, rate: 0.55, sort_order: 1 }),
      makeTier({ rate_id: 'r1', min_deals: 1, rate: 0.60, sort_order: 2 }),
    ]
    // Both match, but sort_order 1 wins
    expect(getTieredRate('r1', 5, 0, rates, orderedTiers)).toBe(0.55)
  })
})

// ── getGeoModifier ─────────────────────────────────────────────────────────

describe('getGeoModifier', () => {
  const modifiers: CommissionGeoModifier[] = [
    makeGeoMod({ state: 'TX', city: 'Houston', modifier: 1.2 }),
    makeGeoMod({ state: 'TX', city: null, modifier: 1.1 }),
    makeGeoMod({ state: null, city: null, region: 'Southwest', modifier: 1.05 }),
  ]

  it('returns 1.0 when no state or city', () => {
    expect(getGeoModifier(null, null, modifiers)).toBe(1.0)
    expect(getGeoModifier(undefined, undefined, modifiers)).toBe(1.0)
  })

  it('matches exact city + state (priority 1)', () => {
    expect(getGeoModifier('TX', 'Houston', modifiers)).toBe(1.2)
  })

  it('matches state-only (priority 2) when city differs', () => {
    expect(getGeoModifier('TX', 'Dallas', modifiers)).toBe(1.1)
  })

  it('falls back to region (priority 3)', () => {
    expect(getGeoModifier('AZ', 'Phoenix', modifiers)).toBe(1.05)
  })

  it('returns 1.0 when no modifier matches', () => {
    const noRegion = modifiers.filter(m => !m.region)
    expect(getGeoModifier('CA', 'LA', noRegion)).toBe(1.0)
  })

  it('ignores inactive modifiers', () => {
    const inactive = [makeGeoMod({ state: 'TX', modifier: 1.5, active: false })]
    expect(getGeoModifier('TX', null, inactive)).toBe(1.0)
  })

  it('is case-insensitive', () => {
    expect(getGeoModifier('tx', 'houston', modifiers)).toBe(1.2)
    expect(getGeoModifier('TX', 'HOUSTON', modifiers)).toBe(1.2)
  })
})

// ── calculateTieredCommission ──────────────────────────────────────────────

describe('calculateTieredCommission', () => {
  const rates = [
    makeRate({ id: 'r1', role_key: 'sales_rep', rate: 0.50 }),
    makeRate({ id: 'r2', role_key: 'adder', rate_type: 'percentage', rate: 10 }),
  ]
  const tiers = [
    makeTier({ rate_id: 'r1', min_deals: 20, rate: 0.60, sort_order: 1 }),
  ]

  it('uses base rate when below tier threshold', () => {
    const result = calculateTieredCommission(10000, 0, 0, 'sales_rep', rates, tiers, 1.0, 5, 0)
    expect(result.solarCommission).toBe(5000) // 10000 × 0.50
  })

  it('uses tiered rate when above threshold', () => {
    const result = calculateTieredCommission(10000, 0, 0, 'sales_rep', rates, tiers, 1.0, 25, 0)
    expect(result.solarCommission).toBe(6000) // 10000 × 0.60
  })

  it('applies geo modifier', () => {
    const result = calculateTieredCommission(10000, 0, 0, 'sales_rep', rates, [], 1.2)
    expect(result.solarCommission).toBe(6000) // 10000 × 0.50 × 1.2
  })

  it('combines tier + geo', () => {
    const result = calculateTieredCommission(10000, 0, 0, 'sales_rep', rates, tiers, 1.2, 25, 0)
    expect(result.solarCommission).toBe(7200) // 10000 × 0.60 × 1.2
  })

  it('defaults geo modifier to 1.0', () => {
    const result = calculateTieredCommission(10000, 0, 0, 'sales_rep', rates, [])
    expect(result.solarCommission).toBe(5000) // no geo
  })
})

// ── getVisibleUserIds ──────────────────────────────────────────────────────

describe('getVisibleUserIds', () => {
  const hierarchy: CommissionHierarchy[] = [
    { id: 'h1', user_id: 'u-boss', parent_id: null, role: 'manager', label: 'Boss', sort_order: 1, org_id: null, created_at: '' },
    { id: 'h2', user_id: 'u-lead', parent_id: 'h1', role: 'team_leader', label: 'Lead', sort_order: 1, org_id: null, created_at: '' },
    { id: 'h3', user_id: 'u-rep1', parent_id: 'h2', role: 'sales_rep', label: 'Rep 1', sort_order: 1, org_id: null, created_at: '' },
    { id: 'h4', user_id: 'u-rep2', parent_id: 'h2', role: 'sales_rep', label: 'Rep 2', sort_order: 2, org_id: null, created_at: '' },
  ] as CommissionHierarchy[]

  it('boss sees everyone', () => {
    const visible = getVisibleUserIds(hierarchy, 'u-boss')!
    expect(visible).toContain('u-boss')
    expect(visible).toContain('u-lead')
    expect(visible).toContain('u-rep1')
    expect(visible).toContain('u-rep2')
    expect(visible).toHaveLength(4)
  })

  it('lead sees self + reports', () => {
    const visible = getVisibleUserIds(hierarchy, 'u-lead')!
    expect(visible).toContain('u-lead')
    expect(visible).toContain('u-rep1')
    expect(visible).toContain('u-rep2')
    expect(visible).not.toContain('u-boss')
    expect(visible).toHaveLength(3)
  })

  it('rep sees only self', () => {
    const visible = getVisibleUserIds(hierarchy, 'u-rep1')!
    expect(visible).toEqual(['u-rep1'])
  })

  it('returns null for unknown user', () => {
    expect(getVisibleUserIds(hierarchy, 'u-unknown')).toBeNull()
  })

  it('handles empty hierarchy', () => {
    expect(getVisibleUserIds([], 'u-boss')).toBeNull()
  })
})
