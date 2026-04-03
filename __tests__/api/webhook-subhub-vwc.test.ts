import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

function mockChain(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
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

const mockDb = {
  from: vi.fn(() => mockChain({ data: null, error: null })),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockDb),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
})

afterEach(() => {
  process.env = originalEnv
})

function makeRequest(body: any, headers: Record<string, string> = {}): Request {
  const init: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  }
  if (typeof body === 'string') {
    init.body = body
  } else {
    init.body = JSON.stringify(body)
  }
  return new Request('https://localhost/api/webhooks/subhub-vwc', init)
}

// ── Configuration ────────────────────────────────────────────────────────────

describe('POST /api/webhooks/subhub-vwc — configuration', () => {
  it('returns 503 when SUPABASE_SECRET_KEY not configured', async () => {
    delete process.env.SUPABASE_SECRET_KEY

    const req = makeRequest({ event_type: 'survey_completed' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toContain('not configured')
  })

  it('returns 503 when SUPABASE_URL not configured', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL

    const req = makeRequest({ event_type: 'survey_completed' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(503)
  })
})

// ── Auth (timing-safe) ──────────────────────────────────────────────────────

describe('POST /api/webhooks/subhub-vwc — auth', () => {
  it('returns 401 for invalid webhook secret (timing-safe)', async () => {
    process.env.SUBHUB_WEBHOOK_SECRET = 'correct-secret'

    const req = makeRequest(
      { event_type: 'survey_completed' },
      { Authorization: 'Bearer wrong-secret' }
    )
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 for secret with different length (timing-safe)', async () => {
    process.env.SUBHUB_WEBHOOK_SECRET = 'correct-secret-123'

    const req = makeRequest(
      { event_type: 'survey_completed' },
      { Authorization: 'Bearer short' }
    )
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('accepts request with correct secret via Authorization header', async () => {
    process.env.SUBHUB_WEBHOOK_SECRET = 'my-webhook-secret'

    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest(
      { event_type: 'survey_completed', name: 'Jane' },
      { Authorization: 'Bearer my-webhook-secret' }
    )
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
  })

  it('accepts request with correct secret via X-Webhook-Secret header', async () => {
    process.env.SUBHUB_WEBHOOK_SECRET = 'my-webhook-secret'

    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest(
      { event_type: 'survey_completed' },
      { 'X-Webhook-Secret': 'my-webhook-secret' }
    )
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('allows request when no secret is configured (optional auth)', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET

    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ event_type: 'survey_completed' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
  })
})

// ── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/webhooks/subhub-vwc — validation', () => {
  it('returns 400 for invalid JSON', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET

    const req = new Request('https://localhost/api/webhooks/subhub-vwc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not{valid}json',
    })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON')
  })
})

// ── Storage ──────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/subhub-vwc — storage', () => {
  it('successfully stores payload and returns stored: true', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET

    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const payload = {
      subhub_id: 'SH-001',
      name: 'Jane Doe',
      event_type: 'survey_completed',
      answers: { question1: 'Yes', question2: 'No' },
    }
    const req = makeRequest(payload)
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
    expect(json.stored).toBe(true)

    // Verify insert was called with correct fields
    expect(mockDb.from).toHaveBeenCalledWith('welcome_call_logs')
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source_id: 'SH-001',
        customer_name: 'Jane Doe',
        event_type: 'survey_completed',
        payload: payload,
      })
    )
  })

  it('handles storage failure gracefully (returns 200 with stored: false)', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET

    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) =>
      Promise.resolve({ data: null, error: { message: 'RLS violation' } }).then(cb)
    )
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ event_type: 'survey_completed' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await POST(req)

    // Returns 200 so SubHub does not retry
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.received).toBe(true)
    expect(json.stored).toBe(false)
    expect(json.error).toContain('Storage failed')
  })
})

// ── Identifier extraction ────────────────────────────────────────────────────

describe('POST /api/webhooks/subhub-vwc — identifier extraction', () => {
  it('extracts source_id from subhub_id field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ subhub_id: 'SH-100' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.source_id).toBe('SH-100')
  })

  it('extracts source_id from subhub_uuid field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ subhub_uuid: 'uuid-abc-123' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.source_id).toBe('uuid-abc-123')
  })

  it('extracts source_id from proposal_id field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ proposal_id: 'PROP-42' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.source_id).toBe('PROP-42')
  })

  it('extracts source_id from project_id field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ project_id: 'PROJ-99' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.source_id).toBe('PROJ-99')
  })

  it('extracts customer_name from name field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ name: 'Bob Smith' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.customer_name).toBe('Bob Smith')
  })

  it('extracts customer_name from customer_name field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ customer_name: 'Alice Jones' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.customer_name).toBe('Alice Jones')
  })

  it('extracts event_type from event field', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ event: 'call_scheduled' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.event_type).toBe('call_scheduled')
  })

  it('defaults event_type to "unknown" when not provided', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ some_other_field: 'value' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.event_type).toBe('unknown')
  })

  it('sets source_id to null when no identifier fields present', async () => {
    delete process.env.SUBHUB_WEBHOOK_SECRET
    const insertChain = mockChain({ data: null, error: null })
    insertChain.then = vi.fn((cb: any) => Promise.resolve({ data: null, error: null }).then(cb))
    mockDb.from.mockReturnValue(insertChain)

    const req = makeRequest({ random_field: 'value' })
    const { POST } = await import('@/app/api/webhooks/subhub-vwc/route')
    await POST(req)

    const insertArg = insertChain.insert.mock.calls[0][0]
    expect(insertArg.source_id).toBeNull()
    expect(insertArg.customer_name).toBeNull()
  })
})

// ── GET health check ─────────────────────────────────────────────────────────

describe('GET /api/webhooks/subhub-vwc — health check', () => {
  it('returns ok status with endpoint info', async () => {
    const { GET } = await import('@/app/api/webhooks/subhub-vwc/route')
    const res = await GET()

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.endpoint).toBe('subhub-vwc')
  })
})
