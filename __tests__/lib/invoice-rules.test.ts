import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabase } from '../../vitest.setup'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockChain(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: vi.fn((cb: any) => Promise.resolve(result).then(cb)),
  }
  return chain
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

const RULE_1 = {
  id: 'rule-1',
  name: 'Engineering Design Services',
  milestone: 'installation',
  from_org_type: 'engineering',
  to_org_type: 'epc',
  line_items: [{ description: 'System Design & Engineering', quantity: 1, unit_price: 1200, category: 'engineering' }],
  active: true,
  created_at: '2026-03-28T12:00:00Z',
  updated_at: '2026-03-28T12:00:00Z',
}

const RULE_2 = {
  id: 'rule-2',
  name: 'Equipment & Materials',
  milestone: 'installation',
  from_org_type: 'supply',
  to_org_type: 'epc',
  line_items: [
    { description: 'Solar Panels', category: 'equipment' },
    { description: 'Inverter', category: 'equipment' },
  ],
  active: true,
  created_at: '2026-03-28T12:00:00Z',
  updated_at: '2026-03-28T12:00:00Z',
}

const RULE_INACTIVE = {
  ...RULE_1,
  id: 'rule-3',
  name: 'Retail Energy & VPP — Light Energy',
  active: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ── loadInvoiceRules ────────────────────────────────────────────────────────

describe('loadInvoiceRules', () => {
  it('loads all rules without filter', async () => {
    const chain = mockChain({ data: [RULE_1, RULE_2, RULE_INACTIVE], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadInvoiceRules } = await import('@/lib/api/invoices')
    const result = await loadInvoiceRules()

    expect(mockSupabase.from).toHaveBeenCalledWith('invoice_rules')
    expect(chain.select).toHaveBeenCalled()
    expect(chain.order).toHaveBeenCalledWith('name', { ascending: true })
    expect(chain.limit).toHaveBeenCalledWith(100)
    expect(chain.eq).not.toHaveBeenCalled()
    expect(result).toHaveLength(3)
  })

  it('filters by active when activeOnly is true', async () => {
    const chain = mockChain({ data: [RULE_1, RULE_2], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadInvoiceRules } = await import('@/lib/api/invoices')
    const result = await loadInvoiceRules(true)

    expect(chain.eq).toHaveBeenCalledWith('active', true)
    expect(result).toHaveLength(2)
  })

  it('does not filter by active when activeOnly is false/undefined', async () => {
    const chain = mockChain({ data: [RULE_1, RULE_2, RULE_INACTIVE], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadInvoiceRules } = await import('@/lib/api/invoices')
    await loadInvoiceRules(false)

    expect(chain.eq).not.toHaveBeenCalled()
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'db error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadInvoiceRules } = await import('@/lib/api/invoices')
    const result = await loadInvoiceRules()

    expect(result).toEqual([])
  })
})

// ── addInvoiceRule ──────────────────────────────────────────────────────────

describe('addInvoiceRule', () => {
  it('inserts a new rule and returns it on success', async () => {
    const chain = mockChain({ data: RULE_1, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addInvoiceRule } = await import('@/lib/api/invoices')
    const result = await addInvoiceRule({
      name: 'Engineering Design Services',
      milestone: 'installation',
      from_org_type: 'engineering',
      to_org_type: 'epc',
      line_items: [{ description: 'System Design', quantity: 1, unit_price: 1200, category: 'engineering' }],
    })

    expect(mockSupabase.from).toHaveBeenCalledWith('invoice_rules')
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Engineering Design Services',
      milestone: 'installation',
      from_org_type: 'engineering',
      to_org_type: 'epc',
      active: true,
    }))
    expect(chain.select).toHaveBeenCalled()
    expect(result).toEqual(RULE_1)
  })

  it('uses provided active value when specified', async () => {
    const chain = mockChain({ data: RULE_INACTIVE, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addInvoiceRule } = await import('@/lib/api/invoices')
    await addInvoiceRule({
      name: 'Inactive Rule',
      milestone: 'monthly',
      from_org_type: 'epc',
      to_org_type: 'customer',
      line_items: [],
      active: false,
    })

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      active: false,
    }))
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'insert error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { addInvoiceRule } = await import('@/lib/api/invoices')
    const result = await addInvoiceRule({
      name: 'Bad Rule',
      milestone: 'installation',
      from_org_type: 'engineering',
      to_org_type: 'epc',
      line_items: [],
    })

    expect(result).toBeNull()
  })
})

// ── updateInvoiceRule ───────────────────────────────────────────────────────

describe('updateInvoiceRule', () => {
  it('updates rule fields and returns updated rule on success', async () => {
    const updated = { ...RULE_1, name: 'Updated Name', design_fee: '1500' }
    const chain = mockChain({ data: updated, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateInvoiceRule } = await import('@/lib/api/invoices')
    const result = await updateInvoiceRule('rule-1', { name: 'Updated Name' })

    expect(mockSupabase.from).toHaveBeenCalledWith('invoice_rules')
    expect(chain.update).toHaveBeenCalledWith({ name: 'Updated Name' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'rule-1')
    expect(chain.select).toHaveBeenCalled()
    expect(result).toEqual(updated)
  })

  it('can toggle active status', async () => {
    const updated = { ...RULE_1, active: false }
    const chain = mockChain({ data: updated, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateInvoiceRule } = await import('@/lib/api/invoices')
    const result = await updateInvoiceRule('rule-1', { active: false })

    expect(chain.update).toHaveBeenCalledWith({ active: false })
    expect(result?.active).toBe(false)
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'update error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { updateInvoiceRule } = await import('@/lib/api/invoices')
    const result = await updateInvoiceRule('rule-1', { name: 'fail' })

    expect(result).toBeNull()
  })
})

// ── deleteInvoiceRule ───────────────────────────────────────────────────────

describe('deleteInvoiceRule', () => {
  it('deletes a rule and returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { deleteInvoiceRule } = await import('@/lib/api/invoices')
    const result = await deleteInvoiceRule('rule-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('invoice_rules')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'rule-1')
    expect(result).toBe(true)
  })

  it('returns false on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'delete error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { deleteInvoiceRule } = await import('@/lib/api/invoices')
    const result = await deleteInvoiceRule('rule-999')

    expect(result).toBe(false)
  })
})

// ── MILESTONE_LABELS ────────────────────────────────────────────────────────

describe('MILESTONE_LABELS', () => {
  it('has labels for all milestones used in seed data', async () => {
    const { MILESTONE_LABELS } = await import('@/lib/api/invoices')

    // These are the milestones used in the 8 seed rules (051-invoice-rules-seed.sql)
    const seedMilestones = ['contract_signed', 'ntp', 'installation', 'pto', 'monthly']
    for (const m of seedMilestones) {
      expect(MILESTONE_LABELS[m]).toBeDefined()
      expect(typeof MILESTONE_LABELS[m]).toBe('string')
    }
  })

  it('includes additional milestones for completeness', async () => {
    const { MILESTONE_LABELS } = await import('@/lib/api/invoices')

    expect(MILESTONE_LABELS['design_complete']).toBeDefined()
    expect(MILESTONE_LABELS['install_complete']).toBeDefined()
    expect(MILESTONE_LABELS['inspection_passed']).toBeDefined()
  })
})
