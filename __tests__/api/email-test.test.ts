import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSendEmail = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

const mockGetTemplate = vi.fn()
vi.mock('@/lib/email-templates', () => ({
  getTemplate: (...args: any[]) => mockGetTemplate(...args),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  originalEnv = { ...process.env }
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.ADMIN_API_SECRET = 'test-admin-secret'
  // Default: templates return valid content
  mockGetTemplate.mockReturnValue({
    subject: 'MicroGRID Day 1',
    html: '<p>Day 1 content</p>',
  })
})

afterEach(() => {
  process.env = originalEnv
})

function makeRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request('https://localhost/api/email/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// ── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/email/test — auth', () => {
  it('returns 401 without valid secret', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    const req = makeRequest(
      { email: 'test@test.com', day: 1 },
      { Authorization: 'Bearer wrong-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 with no Authorization header', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    const req = makeRequest({ email: 'test@test.com', day: 1 })
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(401)
  })

  it('accepts CRON_SECRET', async () => {
    const req = makeRequest(
      { email: 'test@test.com', day: 1 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(200)
  })

  it('accepts ADMIN_API_SECRET', async () => {
    delete process.env.CRON_SECRET

    const req = makeRequest(
      { email: 'test@test.com', day: 1 },
      { Authorization: 'Bearer test-admin-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(200)
  })
})

// ── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/email/test — validation', () => {
  it('returns 400 when email is missing', async () => {
    const req = makeRequest(
      { day: 1 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Missing email or day')
  })

  it('returns 400 when day is missing', async () => {
    const req = makeRequest(
      { email: 'test@test.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Missing email or day')
  })

  it('returns 400 for invalid template day (no template found)', async () => {
    mockGetTemplate.mockReturnValue(null)

    const req = makeRequest(
      { email: 'test@test.com', day: 999 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('No template for day')
  })
})

// ── Sending ──────────────────────────────────────────────────────────────────

describe('POST /api/email/test — sending', () => {
  it('successfully sends test email and returns masked address', async () => {
    const req = makeRequest(
      { email: 'john@gomicrogridenergy.com', day: 1 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(true)
    expect(json.day).toBe(1)
    // Email should be masked
    expect(json.email).toContain('***')
    expect(json.email).not.toBe('john@gomicrogridenergy.com')

    // Verify sendEmail call
    expect(mockSendEmail).toHaveBeenCalledWith(
      'john@gomicrogridenergy.com',
      'MicroGRID Day 1',
      '<p>Day 1 content</p>'
    )
  })

  it('passes custom name to template', async () => {
    const req = makeRequest(
      { email: 'test@test.com', day: 3, name: 'Jane' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    await POST(req as any)

    expect(mockGetTemplate).toHaveBeenCalledWith(3, 'Jane')
  })

  it('uses "Test User" as default name when not provided', async () => {
    const req = makeRequest(
      { email: 'test@test.com', day: 2 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    await POST(req as any)

    expect(mockGetTemplate).toHaveBeenCalledWith(2, 'Test User')
  })

  it('returns sent: false when sendEmail fails', async () => {
    mockSendEmail.mockResolvedValueOnce(false)

    const req = makeRequest(
      { email: 'test@test.com', day: 1 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(false)
  })

  it('returns 500 on unexpected error', async () => {
    mockSendEmail.mockRejectedValueOnce(new Error('Resend API down'))

    const req = makeRequest(
      { email: 'test@test.com', day: 1 },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/email/test/route')
    const res = await POST(req as any)

    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Internal error')
  })
})
