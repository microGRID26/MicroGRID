import { describe, it, expect } from 'vitest'
import {
  filterClaimsByEpc,
  countClaimsByStatus,
  sumOpenDeductions,
  type ClaimForFilter,
} from '@/lib/warranty/filters'

// ── Fixtures ─────────────────────────────────────────────────────────────────

function make(
  status: ClaimForFilter['status'],
  epcId: string | null,
  amount: number | null = null,
): ClaimForFilter {
  return {
    status,
    claim_amount: amount,
    original_epc: epcId ? { id: epcId } : null,
  }
}

const claims: ClaimForFilter[] = [
  make('pending', 'epc-a'),
  make('deployed', 'epc-a'),
  make('invoiced', 'epc-a', 1500),
  make('invoiced', 'epc-b', 2500),
  make('recovered', 'epc-b', 3000),
  make('voided', 'epc-c'),
  make('pending', null),
]

// ── filterClaimsByEpc ────────────────────────────────────────────────────────

describe('filterClaimsByEpc', () => {
  it('returns all claims when epcId is "all"', () => {
    expect(filterClaimsByEpc(claims, 'all')).toHaveLength(claims.length)
  })

  it('returns all claims when epcId is empty string', () => {
    expect(filterClaimsByEpc(claims, '')).toHaveLength(claims.length)
  })

  it('narrows to claims matching the requested EPC', () => {
    const result = filterClaimsByEpc(claims, 'epc-a')
    expect(result).toHaveLength(3)
    expect(result.every((c) => c.original_epc?.id === 'epc-a')).toBe(true)
  })

  it('excludes claims with a null original_epc', () => {
    const result = filterClaimsByEpc(claims, 'epc-a')
    expect(result.some((c) => c.original_epc === null)).toBe(false)
  })

  it('returns empty array when no claims match', () => {
    expect(filterClaimsByEpc(claims, 'epc-zzz')).toEqual([])
  })

  it('is non-mutating', () => {
    const before = claims.length
    filterClaimsByEpc(claims, 'epc-a')
    expect(claims.length).toBe(before)
  })
})

// ── countClaimsByStatus ──────────────────────────────────────────────────────

describe('countClaimsByStatus', () => {
  it('counts every status in the input', () => {
    const result = countClaimsByStatus(claims)
    expect(result.pending).toBe(2)
    expect(result.deployed).toBe(1)
    expect(result.invoiced).toBe(2)
    expect(result.recovered).toBe(1)
    expect(result.voided).toBe(1)
  })

  it('returns an empty object for an empty list', () => {
    expect(countClaimsByStatus([])).toEqual({})
  })

  it('does not populate statuses that never appear', () => {
    const narrowed = claims.filter((c) => c.status === 'pending')
    const result = countClaimsByStatus(narrowed)
    expect(result.pending).toBe(2)
    expect(result.voided).toBeUndefined()
    expect(result.invoiced).toBeUndefined()
  })
})

// ── sumOpenDeductions ────────────────────────────────────────────────────────

describe('sumOpenDeductions', () => {
  it('sums claim_amount only for invoiced claims', () => {
    // fixture has two invoiced claims: 1500 + 2500 = 4000
    expect(sumOpenDeductions(claims)).toBe(4000)
  })

  it('ignores recovered claims even if they have an amount', () => {
    // 'recovered' 3000 is in the fixture but must not count
    const total = sumOpenDeductions(claims)
    expect(total).toBe(4000)
    expect(total).not.toBe(7000)
  })

  it('skips invoiced claims with a null amount', () => {
    const mix: ClaimForFilter[] = [
      make('invoiced', 'epc-a', null),
      make('invoiced', 'epc-b', 500),
    ]
    expect(sumOpenDeductions(mix)).toBe(500)
  })

  it('skips invoiced claims with a zero amount (falsy short-circuit)', () => {
    const mix: ClaimForFilter[] = [
      make('invoiced', 'epc-a', 0),
      make('invoiced', 'epc-b', 250),
    ]
    // The component treats 0 as "no deduction" — documented behavior.
    expect(sumOpenDeductions(mix)).toBe(250)
  })

  it('returns 0 for an empty list', () => {
    expect(sumOpenDeductions([])).toBe(0)
  })

  it('returns 0 when no claims are invoiced', () => {
    const none = claims.filter((c) => c.status !== 'invoiced')
    expect(sumOpenDeductions(none)).toBe(0)
  })
})
