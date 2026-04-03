import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

function mockChain(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
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

const mockSendEmail = vi.fn(() => Promise.resolve(true))
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mockSendEmail.mockResolvedValue(true)
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.ADMIN_API_SECRET = 'admin-secret-123'
})

afterEach(() => {
  process.env = originalEnv
})

function makeRequest(body: object): Request {
  return new Request('https://localhost/api/email/announce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/email/announce — auth', () => {
  it('returns 503 when ADMIN_API_SECRET is not configured', async () => {
    delete process.env.ADMIN_API_SECRET
    const req = makeRequest({ subject: 'Test', html: '<p>Hi</p>', adminSecret: 'anything' })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toBe('ADMIN_API_SECRET not configured')
  })

  it('returns 401 when adminSecret does not match', async () => {
    const req = makeRequest({ subject: 'Test', html: '<p>Hi</p>', adminSecret: 'wrong-secret' })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('accepts request with correct adminSecret', async () => {
    const usersChain = mockChain({ data: [], error: null })
    mockDb.from.mockReturnValue(usersChain)

    const req = makeRequest({ subject: 'Test', html: '<p>Hi</p>', adminSecret: 'admin-secret-123' })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(0)
    expect(json.message).toBe('No matching users')
  })
})

// ── Validation ──────────────────────────────────────────────────────────────

describe('POST /api/email/announce — validation', () => {
  it('returns 400 when subject is missing', async () => {
    const req = makeRequest({ html: '<p>Hi</p>', adminSecret: 'admin-secret-123' })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('subject')
  })

  it('returns 400 when html is missing', async () => {
    const req = makeRequest({ subject: 'Test', adminSecret: 'admin-secret-123' })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})

// ── Email Sending ───────────────────────────────────────────────────────────

describe('POST /api/email/announce — sending', () => {
  it('sends email to all active users', async () => {
    const usersChain = mockChain({
      data: [
        { email: 'alice@gomicrogridenergy.com', name: 'Alice' },
        { email: 'bob@gomicrogridenergy.com', name: 'Bob' },
      ],
      error: null,
    })
    mockDb.from.mockReturnValue(usersChain)

    const req = makeRequest({
      subject: 'Big News',
      html: '<p>Hello everyone!</p>',
      adminSecret: 'admin-secret-123',
    })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(2)
    expect(json.total).toBe(2)
    expect(mockSendEmail).toHaveBeenCalledTimes(2)
  })

  it('filters users by targetRole when specified', async () => {
    const usersChain = mockChain({
      data: [{ email: 'mgr@gomicrogridenergy.com', name: 'Manager' }],
      error: null,
    })
    mockDb.from.mockReturnValue(usersChain)

    const req = makeRequest({
      subject: 'Manager Only',
      html: '<p>Managers!</p>',
      adminSecret: 'admin-secret-123',
      targetRole: 'manager',
    })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(usersChain.eq).toHaveBeenCalledWith('role', 'manager')
  })

  it('wraps HTML in email layout with MicroGRID branding', async () => {
    const usersChain = mockChain({
      data: [{ email: 'user@gomicrogridenergy.com', name: 'User' }],
      error: null,
    })
    mockDb.from.mockReturnValue(usersChain)

    const req = makeRequest({
      subject: 'Test',
      html: '<p>Content here</p>',
      adminSecret: 'admin-secret-123',
    })
    const { POST } = await import('@/app/api/email/announce/route')
    await POST(req)

    const sentHtml = mockSendEmail.mock.calls[0][2]
    expect(sentHtml).toContain('MicroGRID')
    expect(sentHtml).toContain('<p>Content here</p>')
    expect(sentHtml).toContain("What's New")
  })

  it('reports failed emails in response', async () => {
    const usersChain = mockChain({
      data: [
        { email: 'good@gomicrogridenergy.com', name: 'Good' },
        { email: 'bad@gomicrogridenergy.com', name: 'Bad' },
      ],
      error: null,
    })
    mockDb.from.mockReturnValue(usersChain)
    mockSendEmail
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const req = makeRequest({
      subject: 'Test',
      html: '<p>Hi</p>',
      adminSecret: 'admin-secret-123',
    })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(json.errors).toContain('bad@gomicrogridenergy.com')
  })

  it('skips users with no email', async () => {
    const usersChain = mockChain({
      data: [
        { email: null, name: 'No Email' },
        { email: 'has@gomicrogridenergy.com', name: 'Has Email' },
      ],
      error: null,
    })
    mockDb.from.mockReturnValue(usersChain)

    const req = makeRequest({
      subject: 'Test',
      html: '<p>Hi</p>',
      adminSecret: 'admin-secret-123',
    })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    const json = await res.json()
    expect(json.sent).toBe(1)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })

  it('returns 500 when user query fails', async () => {
    const usersChain = mockChain({ data: null, error: { message: 'DB error' } })
    mockDb.from.mockReturnValue(usersChain)

    const req = makeRequest({
      subject: 'Test',
      html: '<p>Hi</p>',
      adminSecret: 'admin-secret-123',
    })
    const { POST } = await import('@/app/api/email/announce/route')
    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})

// ── Rate Limiting ───────────────────────────────────────────────────────────

describe('POST /api/email/announce — rate limiting', () => {
  it('returns 429 after exceeding rate limit', async () => {
    // The rate limiter is in-memory, so we must import once and call many times
    const { POST } = await import('@/app/api/email/announce/route')

    const usersChain = mockChain({ data: [], error: null })
    mockDb.from.mockReturnValue(usersChain)

    // Make 11 requests — the 11th should be rate-limited
    for (let i = 0; i < 10; i++) {
      const req = makeRequest({ subject: 'Test', html: '<p>Hi</p>', adminSecret: 'admin-secret-123' })
      await POST(req)
    }

    const req = makeRequest({ subject: 'Test', html: '<p>Hi</p>', adminSecret: 'admin-secret-123' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toBe('Rate limit exceeded')
  })
})
