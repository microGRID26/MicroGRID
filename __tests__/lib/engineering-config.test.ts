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

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ── loadEngineeringConfig ───────────────────────────────────────────────────

describe('loadEngineeringConfig', () => {
  it('returns config as a Record from key/value rows', async () => {
    const chain = mockChain({
      data: [
        { config_key: 'exclusive_partner_org_slug', value: 'rush' },
        { config_key: 'design_fee', value: '1200' },
        { config_key: 'auto_route_enabled', value: 'true' },
      ],
      error: null,
    })
    mockSupabase.from.mockReturnValue(chain)

    const { loadEngineeringConfig } = await import('@/lib/api/engineering-config')
    const result = await loadEngineeringConfig()

    expect(mockSupabase.from).toHaveBeenCalledWith('engineering_config')
    expect(chain.select).toHaveBeenCalledWith('config_key, value')
    expect(chain.limit).toHaveBeenCalledWith(50)
    expect(result).toEqual({
      exclusive_partner_org_slug: 'rush',
      design_fee: '1200',
      auto_route_enabled: 'true',
    })
  })

  it('returns fallback defaults on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'db error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadEngineeringConfig } = await import('@/lib/api/engineering-config')
    const result = await loadEngineeringConfig()

    expect(result).toEqual({
      exclusive_partner_org_slug: 'rush',
      design_fee: '1200',
      auto_route_enabled: 'true',
    })
  })

  it('returns empty config (cast) when no rows exist', async () => {
    const chain = mockChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadEngineeringConfig } = await import('@/lib/api/engineering-config')
    const result = await loadEngineeringConfig()

    // Returns an empty object cast as EngineeringConfig
    expect(result).toEqual({})
  })
})

// ── updateEngineeringConfig ─────────────────────────────────────────────────

describe('updateEngineeringConfig', () => {
  it('updates a config key and returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateEngineeringConfig } = await import('@/lib/api/engineering-config')
    const result = await updateEngineeringConfig('design_fee', '1500')

    expect(mockSupabase.from).toHaveBeenCalledWith('engineering_config')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      value: '1500',
      updated_at: expect.any(String),
    }))
    expect(chain.eq).toHaveBeenCalledWith('config_key', 'design_fee')
    expect(result).toBe(true)
  })

  it('returns false on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'rls denied' } })
    mockSupabase.from.mockReturnValue(chain)

    const { updateEngineeringConfig } = await import('@/lib/api/engineering-config')
    const result = await updateEngineeringConfig('design_fee', '1500')

    expect(result).toBe(false)
  })
})

// ── autoRouteAssignment ─────────────────────────────────────────────────────

describe('autoRouteAssignment', () => {
  it('reads config, looks up org by slug, and creates assignment', async () => {
    // Call 1: loadEngineeringConfig — reads engineering_config table
    const configChain = mockChain({
      data: [
        { config_key: 'exclusive_partner_org_slug', value: 'rush' },
        { config_key: 'design_fee', value: '1200' },
        { config_key: 'auto_route_enabled', value: 'true' },
      ],
      error: null,
    })

    // Call 2: look up org by slug
    const orgChain = mockChain({
      data: { id: 'org-rush-1', name: 'Rush Engineering' },
      error: null,
    })

    // Call 3: submitAssignment inserts into engineering_assignments
    const assignmentChain = mockChain({
      data: {
        id: 'ea-auto-1',
        project_id: 'PROJ-00001',
        assigned_org: 'org-rush-1',
        requesting_org: 'org-epc-1',
        assignment_type: 'new_design',
        status: 'pending',
        priority: 'normal',
        notes: '[Auto-routed to Rush Engineering]',
        created_by: 'John PM',
        created_by_id: 'user-1',
      },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return configChain       // loadEngineeringConfig
      if (callCount === 2) return orgChain           // org lookup
      return assignmentChain                          // submitAssignment
    })

    const { autoRouteAssignment } = await import('@/lib/api/engineering-config')
    const result = await autoRouteAssignment(
      'PROJ-00001', 'org-epc-1', 'user-1', 'John PM',
    )

    // Verify config was loaded
    expect(configChain.select).toHaveBeenCalledWith('config_key, value')

    // Verify org lookup used the slug from config
    expect(orgChain.eq).toHaveBeenCalledWith('slug', 'rush')
    expect(orgChain.eq).toHaveBeenCalledWith('active', true)

    // Verify assignment was created with the auto-route note prefix
    expect(assignmentChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      project_id: 'PROJ-00001',
      assigned_org: 'org-rush-1',
      requesting_org: 'org-epc-1',
      assignment_type: 'new_design',
      status: 'pending',
      priority: 'normal',
      notes: '[Auto-routed to Rush Engineering]',
    }))
    expect(result).toBeTruthy()
    expect(result?.assigned_org).toBe('org-rush-1')
  })

  it('returns null when partner org not found', async () => {
    const configChain = mockChain({
      data: [{ config_key: 'exclusive_partner_org_slug', value: 'missing-org' }],
      error: null,
    })
    const orgChain = mockChain({ data: null, error: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? configChain : orgChain
    })

    const { autoRouteAssignment } = await import('@/lib/api/engineering-config')
    const result = await autoRouteAssignment(
      'PROJ-00001', 'org-epc-1', 'user-1', 'John PM',
    )

    expect(result).toBeNull()
  })

  it('returns null when config has no slug', async () => {
    // Config with empty slug
    const configChain = mockChain({
      data: [{ config_key: 'exclusive_partner_org_slug', value: '' }],
      error: null,
    })
    mockSupabase.from.mockReturnValue(configChain)

    const { autoRouteAssignment } = await import('@/lib/api/engineering-config')
    const result = await autoRouteAssignment(
      'PROJ-00001', 'org-epc-1', 'user-1', 'John PM',
    )

    expect(result).toBeNull()
  })

  it('passes optional type, priority, and notes through', async () => {
    const configChain = mockChain({
      data: [{ config_key: 'exclusive_partner_org_slug', value: 'rush' }],
      error: null,
    })
    const orgChain = mockChain({
      data: { id: 'org-rush-1', name: 'Rush Engineering' },
      error: null,
    })
    const assignmentChain = mockChain({
      data: { id: 'ea-auto-2', assigned_org: 'org-rush-1' },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return configChain
      if (callCount === 2) return orgChain
      return assignmentChain
    })

    const { autoRouteAssignment } = await import('@/lib/api/engineering-config')
    await autoRouteAssignment(
      'PROJ-00001', 'org-epc-1', 'user-1', 'John PM',
      'redesign', 'high', 'Urgent redesign needed',
    )

    expect(assignmentChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      assignment_type: 'redesign',
      priority: 'high',
      notes: '[Auto-routed to Rush Engineering] Urgent redesign needed',
    }))
  })

  it('defaults type to new_design and priority to normal', async () => {
    const configChain = mockChain({
      data: [{ config_key: 'exclusive_partner_org_slug', value: 'rush' }],
      error: null,
    })
    const orgChain = mockChain({
      data: { id: 'org-rush-1', name: 'Rush Engineering' },
      error: null,
    })
    const assignmentChain = mockChain({
      data: { id: 'ea-auto-3' },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) return configChain
      if (callCount === 2) return orgChain
      return assignmentChain
    })

    const { autoRouteAssignment } = await import('@/lib/api/engineering-config')
    await autoRouteAssignment('PROJ-00001', 'org-epc-1', 'user-1', 'John PM')

    expect(assignmentChain.insert).toHaveBeenCalledWith(expect.objectContaining({
      assignment_type: 'new_design',
      priority: 'normal',
    }))
  })
})
