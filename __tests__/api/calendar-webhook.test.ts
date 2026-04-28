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
    not: vi.fn(() => chain),
    in: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    gte: vi.fn(() => chain),
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

vi.mock('@/lib/google-calendar', () => ({
  listCalendarEvents: vi.fn(() => Promise.resolve([])),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
  process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN = 'valid-token'
})

afterEach(() => {
  process.env = originalEnv
})

function makeWebhookRequest(headers: Record<string, string> = {}): Request {
  return new Request('https://localhost/api/calendar/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

// ── GET Health Check ────────────────────────────────────────────────────────

describe('GET /api/calendar/webhook', () => {
  it('returns health check response', async () => {
    const { GET } = await import('@/app/api/calendar/webhook/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ok')
    expect(json.endpoint).toBe('calendar-webhook')
  })
})

// ── Auth / Token Verification ───────────────────────────────────────────────

describe('POST /api/calendar/webhook — auth', () => {
  it('returns 403 when no channel token provided', async () => {
    const req = makeWebhookRequest({})
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Invalid token')
  })

  it('returns 403 when channel token is wrong', async () => {
    const req = makeWebhookRequest({ 'x-goog-channel-token': 'wrong-token' })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })

  it('returns 403 when GOOGLE_CALENDAR_WEBHOOK_TOKEN is not set', async () => {
    delete process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN
    const req = makeWebhookRequest({ 'x-goog-channel-token': 'any-token' })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(403)
  })
})

// ── Sync Event ──────────────────────────────────────────────────────────────

describe('POST /api/calendar/webhook — sync', () => {
  it('acknowledges sync resource state', async () => {
    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'sync',
      'x-goog-channel-id': 'nova-crew-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('sync acknowledged')
  })
})

// ── Ignored Resource States ─────────────────────────────────────────────────

describe('POST /api/calendar/webhook — ignored states', () => {
  it('ignores unknown resource states', async () => {
    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'not_exists',
      'x-goog-channel-id': 'nova-crew-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ignored')
  })
})

// ── Configuration Errors ────────────────────────────────────────────────────

describe('POST /api/calendar/webhook — config', () => {
  it('returns 500 when SUPABASE_SECRET_KEY is not set', async () => {
    delete process.env.SUPABASE_SECRET_KEY
    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'exists',
      'x-goog-channel-id': 'nova-crew-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(500)
  })
})

// ── Event Processing ────────────────────────────────────────────────────────

describe('POST /api/calendar/webhook — processing', () => {
  it('ignores when crew_id cannot be extracted from channel ID', async () => {
    const settingsChain = mockChain({ data: [], error: null })
    mockDb.from.mockReturnValue(settingsChain)

    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'exists',
      'x-goog-channel-id': '',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('ignored')
  })

  it('returns no-calendar when crew has no calendar configured', async () => {
    const settingsChain = mockChain({ data: [{}], error: null })
    mockDb.from.mockReturnValue(settingsChain)

    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'exists',
      'x-goog-channel-id': 'nova-crew-11111111-2222-3333-4444-555555555555',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('no calendar configured for crew')
  })

  it('processes events and returns result with zero updates when no sync entries match', async () => {
    const { listCalendarEvents } = await import('@/lib/google-calendar')
    ;(listCalendarEvents as any).mockResolvedValue([
      { id: 'event-1', start: { date: '2026-04-10' }, end: { date: '2026-04-11' } },
    ])

    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // calendar_settings
        return mockChain({ data: [{ calendar_id: 'cal@example.com' }], error: null })
      }
      if (callCount === 2) {
        // calendar_sync — no matching entries
        return mockChain({ data: [], error: null })
      }
      return mockChain({ data: [], error: null })
    })

    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'exists',
      'x-goog-channel-id': 'nova-crew-11111111-2222-3333-4444-555555555555',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('processed')
    expect(json.crew_id).toBe('11111111-2222-3333-4444-555555555555')
    expect(json.updated).toBe(0)
  })

  it('handles processing errors gracefully', async () => {
    const { listCalendarEvents } = await import('@/lib/google-calendar')
    ;(listCalendarEvents as any).mockRejectedValue(new Error('Google API error'))

    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain({ data: [{ calendar_id: 'cal@example.com' }], error: null })
      }
      return mockChain({ data: [], error: null })
    })

    const req = makeWebhookRequest({
      'x-goog-channel-token': 'valid-token',
      'x-goog-resource-state': 'exists',
      'x-goog-channel-id': 'nova-crew-11111111-2222-3333-4444-555555555555',
    })
    const { POST } = await import('@/app/api/calendar/webhook/route')
    const res = await POST(req as any)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Processing error')
  })
})
