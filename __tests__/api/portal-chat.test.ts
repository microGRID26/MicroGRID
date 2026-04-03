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
    gte: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    then: vi.fn((cb: any) => Promise.resolve(result).then(cb)),
  }
  return chain
}

const mockServiceDb = {
  from: vi.fn(() => mockChain({ data: null, error: null })),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockServiceDb),
}))

const mockAuthUser = { id: 'user-123', email: 'customer@example.com' }
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: mockAuthUser }, error: null })),
    },
  })),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}))

const mockAnthropicCreate = vi.fn()
class MockAnthropic {
  messages = { create: mockAnthropicCreate }
}
vi.mock('@anthropic-ai/sdk', () => ({
  default: MockAnthropic,
  __esModule: true,
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
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
})

afterEach(() => {
  process.env = originalEnv
})

function makeRequest(body: object, headers: Record<string, string> = {}): Request {
  return new Request('https://localhost/api/portal/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// ── GET Health Check ────────────────────────────────────────────────────────

describe('GET /api/portal/chat', () => {
  it('returns health check with API key status', async () => {
    const { GET } = await import('@/app/api/portal/chat/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.status).toBe('Atlas Portal Chat API')
    expect(json.active).toBe(true)
  })

  it('reports inactive when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const { GET } = await import('@/app/api/portal/chat/route')
    const res = await GET()
    const json = await res.json()
    expect(json.active).toBe(false)
  })
})

// ── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/portal/chat — auth', () => {
  it('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY
    const req = makeRequest({ messages: [{ role: 'user', content: 'Hi' }] })
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(503)
    const json = await res.json()
    expect(json.error).toBe('AI service not configured')
  })

  it('returns 401 when no authenticated user found', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    ;(createServerClient as any).mockReturnValueOnce({
      auth: {
        getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      },
    })

    const req = makeRequest({ messages: [{ role: 'user', content: 'Hi' }] })
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Not authenticated')
  })

  it('returns 403 when user has no active customer account', async () => {
    // Service client returns no account
    mockServiceDb.from.mockReturnValue(mockChain({ data: null, error: null }))

    const req = makeRequest({ messages: [{ role: 'user', content: 'Hi' }] })
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Not a registered customer')
  })
})

// ── Validation ──────────────────────────────────────────────────────────────

describe('POST /api/portal/chat — validation', () => {
  it('returns 400 when messages is missing', async () => {
    // Setup account found
    let callCount = 0
    mockServiceDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain({ data: { id: 'acct-1', project_id: 'PROJ-1', name: 'Customer', status: 'active' }, error: null })
      }
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest({})
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Messages required')
  })

  it('returns 400 when messages is empty array', async () => {
    let callCount = 0
    mockServiceDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain({ data: { id: 'acct-1', project_id: 'PROJ-1', name: 'Customer', status: 'active' }, error: null })
      }
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest({ messages: [] })
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(400)
  })
})

// ── AI Response ─────────────────────────────────────────────────────────────

describe('POST /api/portal/chat — AI response', () => {
  it('returns AI response on successful chat', async () => {
    let callCount = 0
    mockServiceDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // customer_accounts
        return mockChain({ data: { id: 'acct-1', project_id: 'PROJ-1', name: 'John Smith', status: 'active' }, error: null })
      }
      if (callCount === 2) {
        // projects
        return mockChain({ data: { id: 'PROJ-1', name: 'John Smith', stage: 'install', stage_date: '2026-04-01' }, error: null })
      }
      // schedule, stage_history
      return mockChain({ data: [], error: null })
    })

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Your installation is scheduled for next week!' }],
    })

    const req = makeRequest({
      messages: [{ role: 'user', content: 'When is my installation?' }],
    })
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.response).toBe('Your installation is scheduled for next week!')
  })

  it('passes conversation history to Anthropic', async () => {
    let callCount = 0
    mockServiceDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain({ data: { id: 'acct-1', project_id: 'PROJ-1', name: 'Customer', status: 'active' }, error: null })
      }
      return mockChain({ data: null, error: null })
    })

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Response' }],
    })

    const req = makeRequest({
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello!' },
        { role: 'user', content: 'What stage?' },
      ],
    })
    const { POST } = await import('@/app/api/portal/chat/route')
    await POST(req as any)

    const callArgs = mockAnthropicCreate.mock.calls[0][0]
    expect(callArgs.messages).toHaveLength(3)
    expect(callArgs.system).toContain('Atlas')
  })

  it('handles Anthropic API error gracefully', async () => {
    let callCount = 0
    mockServiceDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain({ data: { id: 'acct-1', project_id: 'PROJ-1', name: 'Customer', status: 'active' }, error: null })
      }
      return mockChain({ data: null, error: null })
    })

    mockAnthropicCreate.mockRejectedValue(new Error('Rate limit exceeded'))

    const req = makeRequest({
      messages: [{ role: 'user', content: 'Hello' }],
    })
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toContain('Rate limit exceeded')
  })

  it('supports Bearer token auth for mobile app', async () => {
    let callCount = 0
    mockServiceDb.from.mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return mockChain({ data: { id: 'acct-1', project_id: 'PROJ-1', name: 'Mobile User', status: 'active' }, error: null })
      }
      return mockChain({ data: null, error: null })
    })

    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'Hi from Atlas!' }],
    })

    const req = makeRequest(
      { messages: [{ role: 'user', content: 'Hi' }] },
      { Authorization: 'Bearer mobile-jwt-token' }
    )
    const { POST } = await import('@/app/api/portal/chat/route')
    const res = await POST(req as any)
    expect(res.status).toBe(200)
  })
})
