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

// Defaults reflect the post-2026-04-28 audit fix (#358): the route ALWAYS looks
// up project + PM from the DB and ignores body.pmEmail/pmName. Tests that
// exercise auth-failure or "PM not found" paths override per-test.
const mockDb = {
  from: vi.fn((table: string) => {
    if (table === 'projects') {
      return mockChain({
        data: { id: 'PROJ-1', pm: 'Test PM', pm_id: 'pm-uuid-1', name: 'Test Project' },
        error: null,
      })
    }
    if (table === 'users') {
      // Stuck-task route makes 2 different `users` calls:
      //   1) role-gate lookup (in session-fallback path) — needs role + active
      //   2) PM email lookup (always) — needs email + name
      // Returning all four fields keeps both call sites happy under the default mock.
      return mockChain({
        data: { role: 'manager', active: true, email: 'pm@gomicrogridenergy.com', name: 'Test PM' },
        error: null,
      })
    }
    return mockChain({ data: null, error: null })
  }),
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockDb),
}))

const mockSendEmail = vi.fn().mockResolvedValue(true)
vi.mock('@/lib/email', () => ({
  sendEmail: (...args: any[]) => mockSendEmail(...args),
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

let originalEnv: NodeJS.ProcessEnv

beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  originalEnv = { ...process.env }
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.NEXT_PUBLIC_APP_URL = 'https://microgrid-crm.vercel.app'
  // Restore default mocks so per-test `mockImplementation` overrides don't pollute.
  mockDb.from.mockImplementation((table: string) => {
    if (table === 'projects') {
      return mockChain({
        data: { id: 'PROJ-1', pm: 'Test PM', pm_id: 'pm-uuid-1', name: 'Test Project' },
        error: null,
      })
    }
    if (table === 'users') {
      return mockChain({
        data: { role: 'manager', active: true, email: 'pm@gomicrogridenergy.com', name: 'Test PM' },
        error: null,
      })
    }
    return mockChain({ data: null, error: null })
  })
  // Restore the default supabase createClient mock (negative role-gate tests
  // override it with a session-bearing browser client; reset to the service-role
  // shape every test).
  const supaModule: any = await import('@supabase/supabase-js')
  ;(supaModule.createClient as any).mockImplementation(() => mockDb)
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
  } else if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  return new Request('https://localhost/api/notifications/stuck-task', init)
}

// ── Auth ─────────────────────────────────────────────────────────────────────

describe('POST /api/notifications/stuck-task — auth', () => {
  it('returns 401 when no auth provided and no cookie', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    const req = makeRequest({
      projectId: 'PROJ-1',
      projectName: 'Test',
      taskName: 'Permit',
      status: 'Pending Resolution',
      pmEmail: 'pm@test.com',
    })
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('accepts request with valid CRON_SECRET', async () => {
    const req = makeRequest(
      {
        projectId: 'PROJ-1',
        projectName: 'Test',
        taskName: 'Permit',
        status: 'Pending Resolution',
        pmEmail: 'pm@test.com',
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  it('accepts request with valid ADMIN_API_SECRET', async () => {
    delete process.env.CRON_SECRET
    process.env.ADMIN_API_SECRET = 'admin-key'

    const req = makeRequest(
      {
        projectId: 'PROJ-1',
        projectName: 'Test',
        taskName: 'Permit',
        status: 'Pending Resolution',
        pmEmail: 'pm@test.com',
      },
      { Authorization: 'Bearer admin-key' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
  })

  // ── Session-fallback role-gate negative tests (R2 audit 2026-04-28) ────────
  // Original P1 #358 was "any auth user (incl portal customers) can fire
  // MicroGRID-branded email to attacker-supplied recipient." Closed by the
  // role-gate; these tests document the closed surface.

  it('returns 403 when session-fallback caller has no public.users row (portal customer)', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    // Mock auth.getUser to return a valid session
    const { createClient: createBrowserClient } = await import('@supabase/supabase-js')
    const originalCreateClient = createBrowserClient as any
    ;(createBrowserClient as any).mockImplementation((_url: any, key: any) => ({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-portal', email: 'portal@example.com' } }, error: null })) },
      from: mockDb.from,
    }))

    // Mock the role-check users lookup to return null (no public.users row)
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'users') return mockChain({ data: null, error: null })
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest(
      { projectId: 'PROJ-1', taskName: 'Permit', status: 'Pending Resolution' },
      { cookie: 'sb-test=session' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toContain('manager+ required')

    ;(createBrowserClient as any).mockImplementation(originalCreateClient)
  })

  it('returns 403 when session-fallback caller has role=user (sales rep case)', async () => {
    delete process.env.CRON_SECRET
    delete process.env.ADMIN_API_SECRET

    const { createClient: createBrowserClient } = await import('@supabase/supabase-js')
    const originalCreateClient = createBrowserClient as any
    ;(createBrowserClient as any).mockImplementation((_url: any, key: any) => ({
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-sales', email: 'sales@gomicrogridenergy.com' } }, error: null })) },
      from: mockDb.from,
    }))

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'users') return mockChain({ data: { role: 'user', active: true }, error: null })
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest(
      { projectId: 'PROJ-1', taskName: 'Permit', status: 'Pending Resolution' },
      { cookie: 'sb-test=session' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(403)

    ;(createBrowserClient as any).mockImplementation(originalCreateClient)
  })
})

// ── Validation ───────────────────────────────────────────────────────────────

describe('POST /api/notifications/stuck-task — validation', () => {
  it('returns 400 for invalid JSON', async () => {
    const req = new Request('https://localhost/api/notifications/stuck-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-cron-secret',
      },
      body: 'not-valid-json{{{',
    })
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON')
  })

  it('returns 400 when projectId is missing', async () => {
    const req = makeRequest(
      { taskName: 'Permit', status: 'Pending Resolution', pmEmail: 'pm@test.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('Missing required fields')
  })

  it('returns 400 when taskName is missing', async () => {
    const req = makeRequest(
      { projectId: 'PROJ-1', status: 'Pending Resolution', pmEmail: 'pm@test.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 when status is missing', async () => {
    const req = makeRequest(
      { projectId: 'PROJ-1', taskName: 'Permit', pmEmail: 'pm@test.com' },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 503 when SUPABASE_SECRET_KEY not configured', async () => {
    delete process.env.SUPABASE_SECRET_KEY

    const req = makeRequest(
      {
        projectId: 'PROJ-1',
        projectName: 'Test',
        taskName: 'Permit',
        status: 'Pending Resolution',
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(503)
  })
})

// ── Email templates ──────────────────────────────────────────────────────────

describe('POST /api/notifications/stuck-task — email sending', () => {
  it('PHISHING-RELAY REGRESSION (#358): body.pmEmail and body.projectName are ignored — email goes to DB-resolved PM, not attacker-supplied recipient', async () => {
    const req = makeRequest(
      {
        projectId: 'PROJ-1',
        projectName: 'Your account is locked — click here to verify',  // attacker-controlled HTML
        taskName: 'Permit Application',
        status: 'Pending Resolution',
        reason: 'Missing HOA approval',
        pmEmail: 'attacker@evil.com',  // attacker-supplied recipient
        pmName: 'Phishing Target',
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(true)

    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    const [to, subject, html] = mockSendEmail.mock.calls[0]
    // The original P1 bug: body.pmEmail flowed straight to sendEmail recipient.
    // After fix: email always goes to the project's DB-resolved PM.
    expect(to).toBe('pm@gomicrogridenergy.com')
    expect(to).not.toBe('attacker@evil.com')
    expect(subject).toContain('Pending Resolution')
    expect(subject).toContain('Permit Application')
    // Project name sourced from DB ('Test Project'); body.projectName ignored.
    expect(subject).toContain('Test Project')
    expect(subject).not.toContain('Your account is locked')
    expect(html).toContain('Permit Application')
    expect(html).toContain('Test Project')
    expect(html).not.toContain('Your account is locked')
    expect(html).toContain('Missing HOA approval')
    // Pending Resolution should use red color
    expect(html).toContain('#ef4444')
  })

  it('sends email with Revision Required template (amber color)', async () => {
    const req = makeRequest(
      {
        projectId: 'PROJ-2',
        projectName: 'Jones Solar',
        taskName: 'Design Review',
        status: 'Revision Required',
        reason: 'Panel layout needs update',
        pmEmail: 'jane@gomicrogridenergy.com',
        pmName: 'Jane Smith',
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(true)

    const [to, subject, html] = mockSendEmail.mock.calls[0]
    // After audit fix #358, email goes to DB-resolved PM, not body.pmEmail.
    expect(to).toBe('pm@gomicrogridenergy.com')
    expect(subject).toContain('Revision Required')
    // Revision Required uses amber color
    expect(html).toContain('#f59e0b')
  })

  it('sends email without reason when not provided', async () => {
    const req = makeRequest(
      {
        projectId: 'PROJ-3',
        projectName: 'Davis Install',
        taskName: 'Survey',
        status: 'Pending Resolution',
        pmEmail: 'pm@gomicrogridenergy.com',
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })
})

// ── PM email lookup ──────────────────────────────────────────────────────────

describe('POST /api/notifications/stuck-task — PM lookup', () => {
  it('looks up PM email when not provided', async () => {
    const projectChain = mockChain({
      data: { pm: 'John Doe', pm_id: 'user-123' },
      error: null,
    })
    const userChain = mockChain({
      data: { email: 'john@gomicrogridenergy.com', name: 'John Doe' },
      error: null,
    })

    let fromCallCount = 0
    mockDb.from.mockImplementation((table: string) => {
      fromCallCount++
      if (table === 'projects') return projectChain
      if (table === 'users') return userChain
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest(
      {
        projectId: 'PROJ-1',
        projectName: 'Test Project',
        taskName: 'Install Complete',
        status: 'Pending Resolution',
        // No pmEmail provided
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(true)

    // Verify it queried projects then users
    expect(mockDb.from).toHaveBeenCalledWith('projects')
    expect(mockDb.from).toHaveBeenCalledWith('users')
    expect(mockSendEmail).toHaveBeenCalledWith(
      'john@gomicrogridenergy.com',
      expect.any(String),
      expect.any(String)
    )
  })

  it('returns sent: false when no PM email found', async () => {
    const projectChain = mockChain({
      data: { pm: null, pm_id: null },
      error: null,
    })

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'projects') return projectChain
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest(
      {
        projectId: 'PROJ-ORPHAN',
        projectName: 'Orphan Project',
        taskName: 'Survey',
        status: 'Pending Resolution',
        // No pmEmail, and project has no pm_id
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(false)
    expect(json.reason).toContain('No PM email')
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('includes link to queue search with project ID', async () => {
    // Re-register default mocks (prior test in this describe permanently
    // overrode mockDb.from with a null-project response).
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'projects') {
        return mockChain({
          data: { id: 'PROJ-42', pm: 'Test PM', pm_id: 'pm-uuid-1', name: 'Test Project' },
          error: null,
        })
      }
      if (table === 'users') {
        return mockChain({ data: { email: 'pm@gomicrogridenergy.com', name: 'Test PM' }, error: null })
      }
      return mockChain({ data: null, error: null })
    })

    const req = makeRequest(
      {
        projectId: 'PROJ-42',
        projectName: 'Test',
        taskName: 'Permit',
        status: 'Pending Resolution',
      },
      { Authorization: 'Bearer test-cron-secret' }
    )
    const { POST } = await import('@/app/api/notifications/stuck-task/route')
    await POST(req)

    const [, , html] = mockSendEmail.mock.calls[0]
    expect(html).toContain('/queue?search=PROJ-42')
  })
})
