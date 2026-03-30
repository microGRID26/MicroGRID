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

const ASSIGNMENT = {
  id: 'ea-1',
  project_id: 'PROJ-00001',
  assigned_org: 'org-eng-1',
  requesting_org: 'org-epc-1',
  assignment_type: 'new_design',
  status: 'pending',
  priority: 'normal',
  due_date: null,
  notes: null,
  assigned_to: null,
  created_by: 'John PM',
  created_by_id: 'user-1',
  revision_count: 0,
  deliverables: [],
  assigned_at: null,
  started_at: null,
  completed_at: null,
  created_at: '2026-03-28T12:00:00Z',
  updated_at: '2026-03-28T12:00:00Z',
}

const ASSIGNMENT_IN_PROGRESS = {
  ...ASSIGNMENT,
  id: 'ea-2',
  status: 'in_progress',
  assigned_at: '2026-03-28T13:00:00Z',
  started_at: '2026-03-28T14:00:00Z',
}

const ASSIGNMENT_COMPLETE = {
  ...ASSIGNMENT,
  id: 'ea-3',
  status: 'complete',
  completed_at: '2026-03-29T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ── Constants ────────────────────────────────────────────────────────────────

describe('Engineering constants', () => {
  it('exports all assignment types', async () => {
    const { ASSIGNMENT_TYPES } = await import('@/lib/api/engineering')
    expect(ASSIGNMENT_TYPES).toEqual(['new_design', 'redesign', 'review', 'stamp'])
  })

  it('exports all assignment statuses', async () => {
    const { ASSIGNMENT_STATUSES } = await import('@/lib/api/engineering')
    expect(ASSIGNMENT_STATUSES).toEqual([
      'pending', 'assigned', 'in_progress', 'review', 'revision_needed', 'complete', 'cancelled',
    ])
  })

  it('exports status labels for all statuses', async () => {
    const { ASSIGNMENT_STATUS_LABELS, ASSIGNMENT_STATUSES } = await import('@/lib/api/engineering')
    for (const s of ASSIGNMENT_STATUSES) {
      expect(ASSIGNMENT_STATUS_LABELS[s]).toBeDefined()
    }
    expect(Object.keys(ASSIGNMENT_STATUS_LABELS)).toHaveLength(7)
  })

  it('exports status badges for all statuses', async () => {
    const { ASSIGNMENT_STATUS_BADGE, ASSIGNMENT_STATUSES } = await import('@/lib/api/engineering')
    for (const s of ASSIGNMENT_STATUSES) {
      expect(ASSIGNMENT_STATUS_BADGE[s]).toBeDefined()
      expect(ASSIGNMENT_STATUS_BADGE[s]).toContain('bg-')
      expect(ASSIGNMENT_STATUS_BADGE[s]).toContain('text-')
    }
  })

  it('exports type labels for all types', async () => {
    const { ASSIGNMENT_TYPE_LABELS, ASSIGNMENT_TYPES } = await import('@/lib/api/engineering')
    for (const t of ASSIGNMENT_TYPES) {
      expect(ASSIGNMENT_TYPE_LABELS[t]).toBeDefined()
    }
  })
})

// ── loadAssignments ──────────────────────────────────────────────────────────

describe('loadAssignments', () => {
  it('loads all assignments without filters', async () => {
    const chain = mockChain({ data: [ASSIGNMENT], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignments } = await import('@/lib/api/engineering')
    const result = await loadAssignments()

    expect(mockSupabase.from).toHaveBeenCalledWith('engineering_assignments')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(500)
    expect(chain.or).not.toHaveBeenCalled()
    expect(chain.eq).not.toHaveBeenCalled()
    expect(result).toEqual([ASSIGNMENT])
  })

  it('filters by org when orgId provided', async () => {
    const chain = mockChain({ data: [ASSIGNMENT], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignments } = await import('@/lib/api/engineering')
    await loadAssignments('org-epc-1')

    expect(chain.or).toHaveBeenCalledWith('requesting_org.eq.org-epc-1,assigned_org.eq.org-epc-1')
  })

  it('filters by status when status provided', async () => {
    const chain = mockChain({ data: [ASSIGNMENT], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignments } = await import('@/lib/api/engineering')
    await loadAssignments(null, 'pending')

    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('applies both org and status filters together', async () => {
    const chain = mockChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignments } = await import('@/lib/api/engineering')
    await loadAssignments('org-epc-1', 'in_progress')

    expect(chain.or).toHaveBeenCalledWith('requesting_org.eq.org-epc-1,assigned_org.eq.org-epc-1')
    expect(chain.eq).toHaveBeenCalledWith('status', 'in_progress')
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'db error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignments } = await import('@/lib/api/engineering')
    const result = await loadAssignments()

    expect(result).toEqual([])
  })
})

// ── loadAssignmentByProject ──────────────────────────────────────────────────

describe('loadAssignmentByProject', () => {
  it('returns the most recent assignment for a project', async () => {
    const chain = mockChain({ data: ASSIGNMENT, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentByProject } = await import('@/lib/api/engineering')
    const result = await loadAssignmentByProject('PROJ-00001')

    expect(mockSupabase.from).toHaveBeenCalledWith('engineering_assignments')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'PROJ-00001')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(1)
    expect(result).toEqual(ASSIGNMENT)
  })

  it('returns null when no assignment exists', async () => {
    const chain = mockChain({ data: null, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentByProject } = await import('@/lib/api/engineering')
    const result = await loadAssignmentByProject('PROJ-99999')

    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'db error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentByProject } = await import('@/lib/api/engineering')
    const result = await loadAssignmentByProject('PROJ-00001')

    expect(result).toBeNull()
  })
})

// ── loadAssignmentHistory ────────────────────────────────────────────────────

describe('loadAssignmentHistory', () => {
  it('loads all assignments for a project', async () => {
    const chain = mockChain({ data: [ASSIGNMENT, ASSIGNMENT_IN_PROGRESS], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentHistory } = await import('@/lib/api/engineering')
    const result = await loadAssignmentHistory('PROJ-00001')

    expect(chain.eq).toHaveBeenCalledWith('project_id', 'PROJ-00001')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(50)
    expect(result).toHaveLength(2)
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'db error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentHistory } = await import('@/lib/api/engineering')
    const result = await loadAssignmentHistory('PROJ-00001')

    expect(result).toEqual([])
  })
})

// ── submitAssignment ─────────────────────────────────────────────────────────

describe('submitAssignment', () => {
  it('submits a new assignment with required fields', async () => {
    const chain = mockChain({ data: ASSIGNMENT, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { submitAssignment } = await import('@/lib/api/engineering')
    const result = await submitAssignment(
      'PROJ-00001', 'org-eng-1', 'org-epc-1', 'new_design', 'user-1', 'John PM',
    )

    expect(mockSupabase.from).toHaveBeenCalledWith('engineering_assignments')
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      project_id: 'PROJ-00001',
      assigned_org: 'org-eng-1',
      requesting_org: 'org-epc-1',
      assignment_type: 'new_design',
      status: 'pending',
      priority: 'normal',
      due_date: null,
      notes: null,
      assigned_to: null,
      created_by: 'John PM',
      created_by_id: 'user-1',
    }))
    expect(chain.select).toHaveBeenCalled()
    expect(result).toEqual(ASSIGNMENT)
  })

  it('submits with optional fields when provided', async () => {
    const chain = mockChain({ data: ASSIGNMENT, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { submitAssignment } = await import('@/lib/api/engineering')
    await submitAssignment(
      'PROJ-00001', 'org-eng-1', 'org-epc-1', 'redesign', 'user-1', 'John PM',
      { priority: 'high', due_date: '2026-04-15', notes: 'Urgent redesign', assigned_to: 'Jane Engineer' },
    )

    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({
      priority: 'high',
      due_date: '2026-04-15',
      notes: 'Urgent redesign',
      assigned_to: 'Jane Engineer',
    }))
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'insert error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { submitAssignment } = await import('@/lib/api/engineering')
    const result = await submitAssignment(
      'PROJ-00001', 'org-eng-1', 'org-epc-1', 'new_design', 'user-1', 'John PM',
    )

    expect(result).toBeNull()
  })
})

// ── updateAssignmentStatus ───────────────────────────────────────────────────

describe('updateAssignmentStatus', () => {
  it('sets assigned_at when status is assigned', async () => {
    const chain = mockChain({ data: { ...ASSIGNMENT, status: 'assigned' }, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    const result = await updateAssignmentStatus('ea-1', 'assigned')

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'assigned',
      assigned_at: expect.any(String),
    }))
    expect(chain.eq).toHaveBeenCalledWith('id', 'ea-1')
    expect(result).toBeTruthy()
  })

  it('sets started_at when status is in_progress', async () => {
    const chain = mockChain({ data: ASSIGNMENT_IN_PROGRESS, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    await updateAssignmentStatus('ea-1', 'in_progress')

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'in_progress',
      started_at: expect.any(String),
    }))
  })

  it('sets completed_at when status is complete', async () => {
    const chain = mockChain({ data: ASSIGNMENT_COMPLETE, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    await updateAssignmentStatus('ea-3', 'complete')

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'complete',
      completed_at: expect.any(String),
    }))
  })

  it('increments revision_count for revision_needed', async () => {
    // First call: read current revision_count
    const readChain = mockChain({ data: { revision_count: 2 }, error: null })
    // Second call: update
    const writeChain = mockChain({ data: { ...ASSIGNMENT, status: 'revision_needed', revision_count: 3 }, error: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? readChain : writeChain
    })

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    const result = await updateAssignmentStatus('ea-1', 'revision_needed')

    // Verify the read fetched current revision_count
    expect(readChain.select).toHaveBeenCalledWith('revision_count')
    expect(readChain.eq).toHaveBeenCalledWith('id', 'ea-1')

    // Verify the update set revision_count to 3 (2 + 1)
    expect(writeChain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'revision_needed',
      revision_count: 3,
    }))
    expect(result).toBeTruthy()
  })

  it('sets revision_count to 1 when current is null/missing', async () => {
    const readChain = mockChain({ data: null, error: null })
    const writeChain = mockChain({ data: { ...ASSIGNMENT, status: 'revision_needed', revision_count: 1 }, error: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? readChain : writeChain
    })

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    await updateAssignmentStatus('ea-1', 'revision_needed')

    expect(writeChain.update).toHaveBeenCalledWith(expect.objectContaining({
      revision_count: 1,
    }))
  })

  it('includes notes when provided', async () => {
    const chain = mockChain({ data: { ...ASSIGNMENT, status: 'assigned' }, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    await updateAssignmentStatus('ea-1', 'assigned', 'Taking ownership')

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'assigned',
      notes: 'Taking ownership',
    }))
  })

  it('does not include notes when undefined', async () => {
    const chain = mockChain({ data: { ...ASSIGNMENT, status: 'review' }, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    await updateAssignmentStatus('ea-1', 'review')

    const updateArg = chain.update.mock.calls[0][0]
    expect(updateArg).not.toHaveProperty('notes')
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'update error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { updateAssignmentStatus } = await import('@/lib/api/engineering')
    const result = await updateAssignmentStatus('ea-1', 'assigned')

    expect(result).toBeNull()
  })
})

// ── addDeliverable ───────────────────────────────────────────────────────────

describe('addDeliverable', () => {
  it('appends a deliverable to the existing array', async () => {
    const existingDeliverables = [{ name: 'Plan Set v1', url: 'https://...', type: 'pdf', uploaded_at: '2026-03-28T12:00:00Z' }]

    // First call: read current deliverables
    const readChain = mockChain({ data: { deliverables: existingDeliverables }, error: null })
    // Second call: update with appended deliverable
    const writeChain = mockChain({
      data: { ...ASSIGNMENT, deliverables: [...existingDeliverables, { name: 'Plan Set v2' }] },
      error: null,
    })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? readChain : writeChain
    })

    const { addDeliverable } = await import('@/lib/api/engineering')
    const result = await addDeliverable('ea-1', { name: 'Plan Set v2', url: 'https://drive.google.com/v2', type: 'pdf' })

    expect(readChain.select).toHaveBeenCalledWith('deliverables')
    expect(readChain.eq).toHaveBeenCalledWith('id', 'ea-1')

    expect(writeChain.update).toHaveBeenCalledWith({
      deliverables: expect.arrayContaining([
        expect.objectContaining({ name: 'Plan Set v1' }),
        expect.objectContaining({ name: 'Plan Set v2', uploaded_at: expect.any(String) }),
      ]),
    })
    expect(result).toBeTruthy()
  })

  it('creates array with single item when deliverables is null/empty', async () => {
    const readChain = mockChain({ data: { deliverables: null }, error: null })
    const writeChain = mockChain({ data: { ...ASSIGNMENT, deliverables: [{ name: 'v1' }] }, error: null })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? readChain : writeChain
    })

    const { addDeliverable } = await import('@/lib/api/engineering')
    await addDeliverable('ea-1', { name: 'v1' })

    expect(writeChain.update).toHaveBeenCalledWith({
      deliverables: [expect.objectContaining({ name: 'v1', uploaded_at: expect.any(String) })],
    })
  })

  it('returns null on read error', async () => {
    const readChain = mockChain({ data: null, error: { message: 'read error' } })
    mockSupabase.from.mockReturnValue(readChain)

    const { addDeliverable } = await import('@/lib/api/engineering')
    const result = await addDeliverable('ea-1', { name: 'test' })

    expect(result).toBeNull()
  })

  it('returns null on update error', async () => {
    const readChain = mockChain({ data: { deliverables: [] }, error: null })
    const writeChain = mockChain({ data: null, error: { message: 'update error' } })

    let callCount = 0
    mockSupabase.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? readChain : writeChain
    })

    const { addDeliverable } = await import('@/lib/api/engineering')
    const result = await addDeliverable('ea-1', { name: 'test' })

    expect(result).toBeNull()
  })
})

// ── loadAssignmentQueue ──────────────────────────────────────────────────────

describe('loadAssignmentQueue', () => {
  it('loads all assignments without status filter', async () => {
    const chain = mockChain({ data: [ASSIGNMENT, ASSIGNMENT_IN_PROGRESS], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentQueue } = await import('@/lib/api/engineering')
    const result = await loadAssignmentQueue()

    expect(mockSupabase.from).toHaveBeenCalledWith('engineering_assignments')
    expect(chain.select).toHaveBeenCalledWith('*')
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(500)
    expect(chain.eq).not.toHaveBeenCalled()
    expect(result).toHaveLength(2)
  })

  it('filters by status when provided', async () => {
    const chain = mockChain({ data: [ASSIGNMENT], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentQueue } = await import('@/lib/api/engineering')
    await loadAssignmentQueue('pending')

    expect(chain.eq).toHaveBeenCalledWith('status', 'pending')
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'db error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAssignmentQueue } = await import('@/lib/api/engineering')
    const result = await loadAssignmentQueue()

    expect(result).toEqual([])
  })
})
