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

const mockSendEmail = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

const mockGetTemplate = vi.fn().mockReturnValue({
  subject: 'Welcome to MicroGRID - Day 1',
  html: '<p>Welcome!</p>',
})
vi.mock('@/lib/email-templates', () => ({
  getTemplate: (...args: any[]) => mockGetTemplate(...args),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  process.env.CRON_SECRET = 'test-cron-secret'
})

afterEach(() => {
  process.env = originalEnv
})

function makeRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request('https://localhost/api/email/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// ── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/email/enroll — auth', () => {
  it('returns 401 without valid secret', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    const req = makeRequest(
      { user_id: 'u1', user_email: 'test@test.com' },
      { Authorization: 'Bearer wrong-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when no Authorization header at all', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    const req = makeRequest({ user_id: 'u1', user_email: 'test@test.com' })
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('accepts CRON_SECRET', async () => {
    // Setup for successful enroll
    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })
    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    const req = makeRequest(
      { user_id: 'u1', user_email: 'test@gomicrogridenergy.com', user_name: 'Test' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('accepts ADMIN_API_SECRET', async () => {
    delete process.env.CRON_SECRET
    process.env.ADMIN_API_SECRET = 'admin-key'

    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })
    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    const req = makeRequest(
      { user_id: 'u1', user_email: 'test@gomicrogridenergy.com', user_name: 'Test' },
      { Authorization: 'Bearer admin-key' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
  })
})

// ── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/email/enroll — validation', () => {
  it('returns 400 when user_id is missing', async () => {
    const req = makeRequest(
      { user_email: 'test@test.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('user_id')
  })

  it('returns 400 when user_email is missing', async () => {
    const req = makeRequest(
      { user_id: 'u1' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('user_email')
  })

  it('returns 400 for invalid email format', async () => {
    const req = makeRequest(
      { user_id: 'u1', user_email: 'not-an-email' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Invalid email')
  })

  it('returns 400 for email without domain', async () => {
    const req = makeRequest(
      { user_id: 'u1', user_email: 'user@' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})

// ── Rate limiting ────────────────────────────────────────────────────────────

describe('POST /api/email/enroll — rate limiting', () => {
  it('returns 429 when rate limited', async () => {
    // The rate limiter is in-module state. We need to call it 11 times.
    const { POST } = await import('@/app/api/email/enroll/route')

    // Set up mocks for successful calls
    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })
    mockDb.from.mockImplementation(() => {
      // Alternate between lookup and insert chains
      return mockChain({ data: [], error: null })
    })

    let lastRes: Response | null = null
    for (let i = 0; i < 12; i++) {
      const req = makeRequest(
        { user_id: `u${i}`, user_email: `test${i}@gomicrogridenergy.com` },
        { Authorization: 'Bearer test-cron-secret' }
      )
      lastRes = await POST(req)
    }

    // The 11th or 12th call should be rate limited (limit is 10)
    expect(lastRes!.status).toBe(429)
    const json = await lastRes!.json()
    expect(json.error).toContain('Rate limit')
  })
})

// ── Enrollment ───────────────────────────────────────────────────────────────

describe('POST /api/email/enroll — enrollment', () => {
  it('successfully enrolls new user and returns enrolled: true', async () => {
    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })

    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    const req = makeRequest(
      { user_id: 'new-user-1', user_email: 'newuser@gomicrogridenergy.com', user_name: 'New User' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.enrolled).toBe(true)
    expect(json.day).toBe(1)

    // Verify insert was called with correct fields
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'new-user-1',
        user_email: 'newuser@gomicrogridenergy.com',
        user_name: 'New User',
        current_day: 1,
      })
    )
  })

  it('returns already enrolled for duplicate user', async () => {
    const lookupChain = mockChain({
      data: [{ id: 'existing-enrollment' }],
      error: null,
    })
    mockDb.from.mockReturnValue(lookupChain)

    const req = makeRequest(
      { user_id: 'existing-user', user_email: 'existing@gomicrogridenergy.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.enrolled).toBe(false)
    expect(json.message).toContain('already enrolled')
  })

  it('sends Day 1 email on enrollment', async () => {
    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })

    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    const req = makeRequest(
      { user_id: 'u-day1', user_email: 'day1@gomicrogridenergy.com', user_name: 'Day One' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    await POST(req)

    // Verify getTemplate was called with day 1
    expect(mockGetTemplate).toHaveBeenCalledWith(1, 'Day One')
    // Verify sendEmail was called
    expect(mockSendEmail).toHaveBeenCalledWith(
      'day1@gomicrogridenergy.com',
      'Welcome to MicroGRID - Day 1',
      '<p>Welcome!</p>'
    )
  })

  it('uses "there" as fallback name when user_name not provided', async () => {
    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })

    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    const req = makeRequest(
      { user_id: 'u-noname', user_email: 'noname@gomicrogridenergy.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    await POST(req)

    expect(mockGetTemplate).toHaveBeenCalledWith(1, 'there')
  })

  it('returns 500 when insert fails', async () => {
    const lookupChain = mockChain({ data: [], error: null })
    const insertChain = mockChain({ data: null, error: null })
    // Make the insert return an error
    insertChain.then = vi.fn((cb: any) =>
      Promise.resolve({ data: null, error: { message: 'unique constraint violated' } }).then(cb)
    )

    let callCount = 0
    mockDb.from.mockImplementation(() => {
      callCount++
      return callCount === 1 ? lookupChain : insertChain
    })

    const req = makeRequest(
      { user_id: 'u-fail', user_email: 'fail@gomicrogridenergy.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/enroll/route')
    const res = await POST(req)

    expect(res.status).toBe(500)
  })
})
