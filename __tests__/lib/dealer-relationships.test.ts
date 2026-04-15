import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabase } from '../../vitest.setup'

// Mock chain helper — mirrors the pattern in other lib/api tests.
function mockChain(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: vi.fn((cb: (v: typeof result) => unknown) => Promise.resolve(result).then(cb)),
  }
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Constants ────────────────────────────────────────────────────────────────

describe('dealer-relationships constants', () => {
  it('DEALER_STATUSES has all 4 lifecycle states', async () => {
    const { DEALER_STATUSES } = await import('@/lib/api/dealer-relationships')
    expect(DEALER_STATUSES).toEqual([
      'pending_signature',
      'active',
      'suspended',
      'terminated',
    ])
  })

  it('DEALER_STATUS_LABELS covers every status', async () => {
    const { DEALER_STATUSES, DEALER_STATUS_LABELS } = await import('@/lib/api/dealer-relationships')
    for (const s of DEALER_STATUSES) {
      expect(DEALER_STATUS_LABELS[s]).toBeTruthy()
      expect(typeof DEALER_STATUS_LABELS[s]).toBe('string')
    }
  })

  it('DEALER_STATUS_BADGE covers every status with a class string', async () => {
    const { DEALER_STATUSES, DEALER_STATUS_BADGE } = await import('@/lib/api/dealer-relationships')
    for (const s of DEALER_STATUSES) {
      expect(DEALER_STATUS_BADGE[s]).toMatch(/bg-/)
    }
  })

  it('UNDERWRITING_FEE_TYPES has 3 entries matching the migration CHECK', async () => {
    const { UNDERWRITING_FEE_TYPES } = await import('@/lib/api/dealer-relationships')
    expect(UNDERWRITING_FEE_TYPES).toEqual([
      'one_time_onboarding',
      'recurring_gatekeeping',
      'per_project_review',
    ])
  })

  it('UNDERWRITING_FEE_STATUSES has 5 entries matching the migration CHECK', async () => {
    const { UNDERWRITING_FEE_STATUSES } = await import('@/lib/api/dealer-relationships')
    expect(UNDERWRITING_FEE_STATUSES).toEqual([
      'pending',
      'invoiced',
      'paid',
      'waived',
      'disputed',
    ])
  })

  it('UNDERWRITING_FEE_TYPE_LABELS covers every fee type', async () => {
    const { UNDERWRITING_FEE_TYPES, UNDERWRITING_FEE_TYPE_LABELS } = await import('@/lib/api/dealer-relationships')
    for (const t of UNDERWRITING_FEE_TYPES) {
      expect(UNDERWRITING_FEE_TYPE_LABELS[t]).toBeTruthy()
    }
  })

  it('UNDERWRITING_FEE_STATUS_BADGE covers every status', async () => {
    const { UNDERWRITING_FEE_STATUSES, UNDERWRITING_FEE_STATUS_BADGE } = await import('@/lib/api/dealer-relationships')
    for (const s of UNDERWRITING_FEE_STATUSES) {
      expect(UNDERWRITING_FEE_STATUS_BADGE[s]).toMatch(/bg-/)
    }
  })
})

// ── sales_dealer_relationships CRUD ─────────────────────────────────────────

describe('loadDealerRelationships', () => {
  it('returns the array on success', async () => {
    const rows = [
      { id: 'rel-1', epc_org_id: 'epc-1', originator_org_id: 'orig-1', status: 'active' },
      { id: 'rel-2', epc_org_id: 'epc-2', originator_org_id: 'orig-1', status: 'pending_signature' },
    ]
    mockSupabase.from.mockReturnValue(mockChain({ data: rows, error: null }))

    const { loadDealerRelationships } = await import('@/lib/api/dealer-relationships')
    const result = await loadDealerRelationships()

    expect(mockSupabase.from).toHaveBeenCalledWith('sales_dealer_relationships')
    expect(result).toEqual(rows)
  })

  it('returns empty array + logs on error', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'boom' } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { loadDealerRelationships } = await import('@/lib/api/dealer-relationships')
    const result = await loadDealerRelationships()

    expect(result).toEqual([])
    expect(spy).toHaveBeenCalledWith('[loadDealerRelationships]', 'boom')
    spy.mockRestore()
  })

  it('returns empty array when data is null', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: null }))

    const { loadDealerRelationships } = await import('@/lib/api/dealer-relationships')
    expect(await loadDealerRelationships()).toEqual([])
  })
})

describe('addDealerRelationship', () => {
  const newRow = {
    epc_org_id: 'epc-1',
    originator_org_id: 'orig-1',
    status: 'pending_signature' as const,
    contract_url: null,
    signed_at: null,
    effective_date: null,
    termination_date: null,
    underwriting_notes: null,
    created_by_id: null,
  }

  it('inserts and returns the created row', async () => {
    const created = { id: 'rel-new', ...newRow, created_at: 't', updated_at: 't' }
    const chain = mockChain({ data: created, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addDealerRelationship } = await import('@/lib/api/dealer-relationships')
    const result = await addDealerRelationship(newRow)

    expect(mockSupabase.from).toHaveBeenCalledWith('sales_dealer_relationships')
    expect(chain.insert).toHaveBeenCalledWith(newRow)
    expect(result).toEqual(created)
  })

  it('throws a real Error on failure so the caller can surface it', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'unique violation' } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { addDealerRelationship } = await import('@/lib/api/dealer-relationships')
    await expect(addDealerRelationship(newRow)).rejects.toThrow('unique violation')

    spy.mockRestore()
  })
})

describe('updateDealerRelationship', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateDealerRelationship } = await import('@/lib/api/dealer-relationships')
    const result = await updateDealerRelationship('rel-1', { status: 'active' })

    expect(chain.update).toHaveBeenCalledWith({ status: 'active' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'rel-1')
    expect(result).toBe(true)
  })

  it('throws on error', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'not found' } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { updateDealerRelationship } = await import('@/lib/api/dealer-relationships')
    await expect(updateDealerRelationship('rel-1', { status: 'active' })).rejects.toThrow('not found')

    spy.mockRestore()
  })
})

describe('deleteDealerRelationship', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { deleteDealerRelationship } = await import('@/lib/api/dealer-relationships')
    const result = await deleteDealerRelationship('rel-1')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'rel-1')
    expect(result).toBe(true)
  })

  it('throws on error', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'permission denied' } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { deleteDealerRelationship } = await import('@/lib/api/dealer-relationships')
    await expect(deleteDealerRelationship('rel-1')).rejects.toThrow('permission denied')

    spy.mockRestore()
  })
})

// ── epc_underwriting_fees CRUD ──────────────────────────────────────────────

describe('loadUnderwritingFees', () => {
  it('returns the array on success', async () => {
    const rows = [
      { id: 'fee-1', epc_org_id: 'epc-1', fee_amount: 5000, fee_type: 'one_time_onboarding', status: 'pending' },
    ]
    mockSupabase.from.mockReturnValue(mockChain({ data: rows, error: null }))

    const { loadUnderwritingFees } = await import('@/lib/api/dealer-relationships')
    const result = await loadUnderwritingFees()

    expect(mockSupabase.from).toHaveBeenCalledWith('epc_underwriting_fees')
    expect(result).toEqual(rows)
  })

  it('returns empty array on error', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'fail' } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { loadUnderwritingFees } = await import('@/lib/api/dealer-relationships')
    expect(await loadUnderwritingFees()).toEqual([])
    spy.mockRestore()
  })
})

describe('addUnderwritingFee', () => {
  const newRow = {
    epc_org_id: 'epc-1',
    underwriter_org_id: 'mg-1',
    billed_to_org_id: 'edge-1',
    relationship_id: null,
    fee_amount: 5000,
    fee_type: 'one_time_onboarding' as const,
    invoice_id: null,
    status: 'pending' as const,
    notes: null,
    created_by_id: null,
  }

  it('inserts and returns the created row', async () => {
    const created = { id: 'fee-new', ...newRow, created_at: 't', updated_at: 't' }
    const chain = mockChain({ data: created, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addUnderwritingFee } = await import('@/lib/api/dealer-relationships')
    const result = await addUnderwritingFee(newRow)

    expect(chain.insert).toHaveBeenCalledWith(newRow)
    expect(result).toEqual(created)
  })

  it('throws when the insert fails', async () => {
    mockSupabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'fee_amount must be positive' } }))
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { addUnderwritingFee } = await import('@/lib/api/dealer-relationships')
    await expect(addUnderwritingFee(newRow)).rejects.toThrow('fee_amount must be positive')

    spy.mockRestore()
  })
})

describe('updateUnderwritingFee', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateUnderwritingFee } = await import('@/lib/api/dealer-relationships')
    const result = await updateUnderwritingFee('fee-1', { status: 'paid' })

    expect(chain.update).toHaveBeenCalledWith({ status: 'paid' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'fee-1')
    expect(result).toBe(true)
  })
})

describe('deleteUnderwritingFee', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { deleteUnderwritingFee } = await import('@/lib/api/dealer-relationships')
    const result = await deleteUnderwritingFee('fee-1')

    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'fee-1')
    expect(result).toBe(true)
  })
})
