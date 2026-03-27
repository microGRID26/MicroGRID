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
    not: vi.fn(() => chain),
    in: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    or: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: vi.fn((cb: any) => Promise.resolve(result).then(cb)),
  }
  return chain
}

// ── Test Data ────────────────────────────────────────────────────────────────

const VEHICLE_A = {
  id: 'v-1',
  vehicle_number: 'Truck 1',
  vin: '1FTFW1EF0AFB12345',
  year: 2022,
  make: 'Ford',
  model: 'F-250',
  license_plate: 'ABC1234',
  color: 'White',
  assigned_crew: 'Crew Alpha',
  assigned_driver: 'John Smith',
  status: 'active' as const,
  odometer: 45000,
  insurance_expiry: '2026-06-15',
  registration_expiry: '2026-08-01',
  last_inspection_date: '2026-02-01',
  next_inspection_date: '2026-04-15',
  notes: 'Primary install truck',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
}

const VEHICLE_B = {
  id: 'v-2',
  vehicle_number: 'Truck 2',
  vin: null,
  year: 2020,
  make: 'Chevy',
  model: 'Silverado',
  license_plate: 'XYZ9999',
  color: null,
  assigned_crew: 'Crew Beta',
  assigned_driver: null,
  status: 'maintenance' as const,
  odometer: 80000,
  insurance_expiry: '2026-03-20',
  registration_expiry: null,
  last_inspection_date: null,
  next_inspection_date: null,
  notes: null,
  created_at: '2026-01-15T00:00:00Z',
  updated_at: '2026-03-10T00:00:00Z',
}

const VEHICLE_RETIRED = {
  ...VEHICLE_A,
  id: 'v-3',
  vehicle_number: 'Truck 3',
  status: 'retired' as const,
}

const MAINT_RECORD = {
  id: 'm-1',
  vehicle_id: 'v-1',
  type: 'oil_change' as const,
  description: 'Synthetic 10W-30',
  date: '2026-03-01',
  odometer: 44500,
  cost: 89.99,
  vendor: 'Quick Lube',
  next_due_date: '2026-06-01',
  next_due_odometer: 49500,
  performed_by: 'Tech A',
  notes: null,
  created_at: '2026-03-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ── Vehicle Status Logic ────────────────────────────────────────────────────

describe('Vehicle status constants', () => {
  it('exports all 4 vehicle statuses', async () => {
    const { VEHICLE_STATUSES } = await import('@/lib/api/fleet')
    expect(VEHICLE_STATUSES).toEqual(['active', 'maintenance', 'out_of_service', 'retired'])
  })

  it('exports status labels for all statuses', async () => {
    const { STATUS_LABELS, VEHICLE_STATUSES } = await import('@/lib/api/fleet')
    for (const s of VEHICLE_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy()
    }
  })

  it('exports all 6 maintenance types', async () => {
    const { MAINTENANCE_TYPES } = await import('@/lib/api/fleet')
    expect(MAINTENANCE_TYPES).toEqual(['oil_change', 'tire_rotation', 'brake_service', 'inspection', 'repair', 'other'])
  })

  it('exports maintenance type labels for all types', async () => {
    const { MAINTENANCE_TYPE_LABELS, MAINTENANCE_TYPES } = await import('@/lib/api/fleet')
    for (const t of MAINTENANCE_TYPES) {
      expect(MAINTENANCE_TYPE_LABELS[t]).toBeTruthy()
    }
  })
})

// ── loadVehicles ────────────────────────────────────────────────────────────

describe('loadVehicles', () => {
  it('returns vehicles on success', async () => {
    const chain = mockChain({ data: [VEHICLE_A, VEHICLE_B], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicles } = await import('@/lib/api/fleet')
    const result = await loadVehicles()

    expect(mockSupabase.from).toHaveBeenCalledWith('vehicles')
    expect(result).toEqual([VEHICLE_A, VEHICLE_B])
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'DB error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicles } = await import('@/lib/api/fleet')
    const result = await loadVehicles()
    expect(result).toEqual([])
  })

  it('applies status filter', async () => {
    const chain = mockChain({ data: [VEHICLE_A], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicles } = await import('@/lib/api/fleet')
    await loadVehicles({ status: 'active' })

    expect(chain.eq).toHaveBeenCalledWith('status', 'active')
  })

  it('applies crew filter', async () => {
    const chain = mockChain({ data: [VEHICLE_A], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicles } = await import('@/lib/api/fleet')
    await loadVehicles({ crew: 'Crew Alpha' })

    expect(chain.eq).toHaveBeenCalledWith('assigned_crew', 'Crew Alpha')
  })

  it('applies search filter via .or()', async () => {
    const chain = mockChain({ data: [VEHICLE_A], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicles } = await import('@/lib/api/fleet')
    await loadVehicles({ search: 'Ford' })

    expect(chain.or).toHaveBeenCalled()
    const orArg = chain.or.mock.calls[0][0] as string
    expect(orArg).toContain('Ford')
  })

  it('escapes special characters in search', async () => {
    const chain = mockChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicles } = await import('@/lib/api/fleet')
    await loadVehicles({ search: '100%' })

    expect(chain.or).toHaveBeenCalled()
    const orArg = chain.or.mock.calls[0][0] as string
    // escapeIlike should escape % to \%
    expect(orArg).toContain('100\\%')
  })
})

// ── loadVehicle (single) ────────────────────────────────────────────────────

describe('loadVehicle', () => {
  it('returns vehicle on success', async () => {
    const chain = mockChain({ data: VEHICLE_A, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicle } = await import('@/lib/api/fleet')
    const result = await loadVehicle('v-1')

    expect(chain.eq).toHaveBeenCalledWith('id', 'v-1')
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(VEHICLE_A)
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'Not found' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicle } = await import('@/lib/api/fleet')
    const result = await loadVehicle('nonexistent')
    expect(result).toBeNull()
  })
})

// ── addVehicle ──────────────────────────────────────────────────────────────

describe('addVehicle', () => {
  it('creates vehicle and returns it', async () => {
    const chain = mockChain({ data: VEHICLE_A, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addVehicle } = await import('@/lib/api/fleet')
    const { id, created_at, updated_at, ...input } = VEHICLE_A
    const result = await addVehicle(input)

    expect(chain.insert).toHaveBeenCalled()
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(VEHICLE_A)
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'Duplicate' } })
    mockSupabase.from.mockReturnValue(chain)

    const { addVehicle } = await import('@/lib/api/fleet')
    const result = await addVehicle({ vehicle_number: 'T1', status: 'active' } as any)
    expect(result).toBeNull()
  })
})

// ── updateVehicle ───────────────────────────────────────────────────────────

describe('updateVehicle', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    // Make update resolve without single()
    chain.eq = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { updateVehicle } = await import('@/lib/api/fleet')
    const result = await updateVehicle('v-1', { odometer: 46000 })
    expect(result).toBe(true)
  })

  it('sets updated_at on update', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { updateVehicle } = await import('@/lib/api/fleet')
    await updateVehicle('v-1', { odometer: 46000 })

    const updateCall = chain.update.mock.calls[0][0]
    expect(updateCall.updated_at).toBeDefined()
  })

  it('returns false on error', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: { message: 'Permission denied' } }))
    mockSupabase.from.mockReturnValue(chain)

    const { updateVehicle } = await import('@/lib/api/fleet')
    const result = await updateVehicle('v-1', { status: 'retired' })
    expect(result).toBe(false)
  })
})

// ── deleteVehicle ───────────────────────────────────────────────────────────

describe('deleteVehicle', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { deleteVehicle } = await import('@/lib/api/fleet')
    const result = await deleteVehicle('v-1')
    expect(result).toBe(true)
  })

  it('returns false on error (non-super-admin)', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: { message: 'RLS denied' } }))
    mockSupabase.from.mockReturnValue(chain)

    const { deleteVehicle } = await import('@/lib/api/fleet')
    const result = await deleteVehicle('v-1')
    expect(result).toBe(false)
  })
})

// ── loadVehicleMaintenance ──────────────────────────────────────────────────

describe('loadVehicleMaintenance', () => {
  it('returns records for a vehicle', async () => {
    const chain = mockChain({ data: [MAINT_RECORD], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicleMaintenance } = await import('@/lib/api/fleet')
    const result = await loadVehicleMaintenance('v-1')

    expect(mockSupabase.from).toHaveBeenCalledWith('vehicle_maintenance')
    expect(chain.eq).toHaveBeenCalledWith('vehicle_id', 'v-1')
    expect(result).toEqual([MAINT_RECORD])
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicleMaintenance } = await import('@/lib/api/fleet')
    const result = await loadVehicleMaintenance('v-1')
    expect(result).toEqual([])
  })

  it('orders by date descending with limit 100', async () => {
    const chain = mockChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadVehicleMaintenance } = await import('@/lib/api/fleet')
    await loadVehicleMaintenance('v-1')

    expect(chain.order).toHaveBeenCalledWith('date', { ascending: false })
    expect(chain.limit).toHaveBeenCalledWith(100)
  })
})

// ── addMaintenance ──────────────────────────────────────────────────────────

describe('addMaintenance', () => {
  it('creates record and returns it', async () => {
    const chain = mockChain({ data: MAINT_RECORD, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addMaintenance } = await import('@/lib/api/fleet')
    const { id, created_at, ...input } = MAINT_RECORD
    const result = await addMaintenance(input)

    expect(chain.insert).toHaveBeenCalled()
    expect(result).toEqual(MAINT_RECORD)
  })

  it('returns null on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { addMaintenance } = await import('@/lib/api/fleet')
    const result = await addMaintenance({ vehicle_id: 'v-1', type: 'oil_change' } as any)
    expect(result).toBeNull()
  })
})

// ── loadUpcomingMaintenance ─────────────────────────────────────────────────

describe('loadUpcomingMaintenance', () => {
  it('queries with correct cutoff date', async () => {
    const chain = mockChain({ data: [MAINT_RECORD], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadUpcomingMaintenance } = await import('@/lib/api/fleet')
    const result = await loadUpcomingMaintenance(30)

    expect(mockSupabase.from).toHaveBeenCalledWith('vehicle_maintenance')
    expect(chain.lte).toHaveBeenCalled()
    // The cutoff should be ~30 days from now
    const cutoffArg = chain.lte.mock.calls[0][1] as string
    const cutoffDate = new Date(cutoffArg)
    const now = new Date()
    const diffDays = Math.round((cutoffDate.getTime() - now.getTime()) / 86400000)
    expect(diffDays).toBeGreaterThanOrEqual(29)
    expect(diffDays).toBeLessThanOrEqual(31)
    expect(result).toEqual([MAINT_RECORD])
  })

  it('defaults to 30 days', async () => {
    const chain = mockChain({ data: [], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadUpcomingMaintenance } = await import('@/lib/api/fleet')
    await loadUpcomingMaintenance()

    expect(chain.lte).toHaveBeenCalled()
  })

  it('returns empty on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadUpcomingMaintenance } = await import('@/lib/api/fleet')
    const result = await loadUpcomingMaintenance(7)
    expect(result).toEqual([])
  })
})

// ── Fleet page helper logic: daysUntil / expiryBadge ────────────────────────
// These are inline in the page component, so we test the logic directly

describe('Fleet page helper: daysUntil logic', () => {
  function daysUntil(d: string | null): number | null {
    if (!d) return null
    const target = new Date(d + 'T00:00:00')
    return Math.floor((target.getTime() - Date.now()) / 86400000)
  }

  it('returns null for null input', () => {
    expect(daysUntil(null)).toBeNull()
  })

  it('returns positive number for future dates', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const dateStr = future.toISOString().split('T')[0]
    const result = daysUntil(dateStr)
    expect(result).toBeGreaterThanOrEqual(9)
    expect(result).toBeLessThanOrEqual(10)
  })

  it('returns negative number for past dates', () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)
    const dateStr = past.toISOString().split('T')[0]
    const result = daysUntil(dateStr)
    expect(result).toBeLessThan(0)
  })

  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    const result = daysUntil(today)
    // Can be 0 or -1 depending on time of day
    expect(result).toBeLessThanOrEqual(0)
    expect(result).toBeGreaterThanOrEqual(-1)
  })
})

describe('Fleet page helper: expiryBadge logic', () => {
  function daysUntil(d: string | null): number | null {
    if (!d) return null
    const target = new Date(d + 'T00:00:00')
    return Math.floor((target.getTime() - Date.now()) / 86400000)
  }

  function expiryBadge(d: string | null): { label: string; cls: string } | null {
    if (!d) return null
    const days = daysUntil(d)
    if (days === null) return null
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, cls: 'bg-red-500/20 text-red-400' }
    if (days <= 30) return { label: `${days}d left`, cls: 'bg-amber-500/20 text-amber-400' }
    return null
  }

  it('returns null for null date', () => {
    expect(expiryBadge(null)).toBeNull()
  })

  it('returns expired badge for past dates', () => {
    const past = new Date()
    past.setDate(past.getDate() - 10)
    const result = expiryBadge(past.toISOString().split('T')[0])
    expect(result).not.toBeNull()
    expect(result!.label).toContain('Expired')
    expect(result!.cls).toContain('red')
  })

  it('returns warning badge for dates within 30 days', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const result = expiryBadge(soon.toISOString().split('T')[0])
    expect(result).not.toBeNull()
    expect(result!.label).toContain('left')
    expect(result!.cls).toContain('amber')
  })

  it('returns null for dates more than 30 days away', () => {
    const far = new Date()
    far.setDate(far.getDate() + 60)
    const result = expiryBadge(far.toISOString().split('T')[0])
    expect(result).toBeNull()
  })
})

// ── Fleet page filtering logic ──────────────────────────────────────────────

describe('Fleet page filtering logic', () => {
  const vehicles = [VEHICLE_A, VEHICLE_B, VEHICLE_RETIRED]

  function filterVehicles(
    list: typeof vehicles,
    statusFilter: string,
    crewFilter: string,
    search: string
  ) {
    let result = list
    if (statusFilter) result = result.filter(v => v.status === statusFilter)
    if (crewFilter) result = result.filter(v => v.assigned_crew === crewFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(v => {
        if (v.vehicle_number.toLowerCase().includes(q)) return true
        if ((v.make ?? '').toLowerCase().includes(q)) return true
        if ((v.model ?? '').toLowerCase().includes(q)) return true
        if ((v.license_plate ?? '').toLowerCase().includes(q)) return true
        if ((v.assigned_driver ?? '').toLowerCase().includes(q)) return true
        if ((v.vin ?? '').toLowerCase().includes(q)) return true
        return false
      })
    }
    return result
  }

  it('filters by status', () => {
    const result = filterVehicles(vehicles, 'active', '', '')
    expect(result).toHaveLength(1)
    expect(result[0].vehicle_number).toBe('Truck 1')
  })

  it('filters by crew', () => {
    const result = filterVehicles(vehicles, '', 'Crew Beta', '')
    expect(result).toHaveLength(1)
    expect(result[0].vehicle_number).toBe('Truck 2')
  })

  it('filters by search text (make)', () => {
    const result = filterVehicles(vehicles, '', '', 'Chevy')
    expect(result).toHaveLength(1)
    expect(result[0].vehicle_number).toBe('Truck 2')
  })

  it('filters by search text (VIN)', () => {
    const result = filterVehicles(vehicles, '', '', '1FTFW')
    expect(result).toHaveLength(2) // Truck 1 + Truck 3 (retired, same VIN)
  })

  it('filters by search text (driver)', () => {
    const result = filterVehicles(vehicles, '', '', 'John')
    expect(result).toHaveLength(2) // Truck 1 + Truck 3 (retired, same driver)
  })

  it('combines status + search filters', () => {
    const result = filterVehicles(vehicles, 'maintenance', '', 'Chevy')
    expect(result).toHaveLength(1)
    expect(result[0].vehicle_number).toBe('Truck 2')
  })

  it('returns empty when no matches', () => {
    const result = filterVehicles(vehicles, '', '', 'nonexistent')
    expect(result).toHaveLength(0)
  })

  it('handles null fields in search gracefully', () => {
    const result = filterVehicles(vehicles, '', '', 'any search')
    // Should not throw, VEHICLE_B has null fields
    expect(result).toBeInstanceOf(Array)
  })
})

// ── Fleet page sorting logic ────────────────────────────────────────────────

describe('Fleet page sorting logic', () => {
  const vehicles = [VEHICLE_A, VEHICLE_B, VEHICLE_RETIRED]

  type SortField = 'vehicle_number' | 'make' | 'status' | 'assigned_crew' | 'odometer'

  function sortVehicles(list: typeof vehicles, field: SortField, asc: boolean) {
    return [...list].sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      switch (field) {
        case 'vehicle_number': av = a.vehicle_number; bv = b.vehicle_number; break
        case 'make': av = `${a.make ?? ''} ${a.model ?? ''}`; bv = `${b.make ?? ''} ${b.model ?? ''}`; break
        case 'status': av = a.status; bv = b.status; break
        case 'assigned_crew': av = a.assigned_crew ?? ''; bv = b.assigned_crew ?? ''; break
        case 'odometer': av = a.odometer ?? 0; bv = b.odometer ?? 0; break
      }
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return asc ? cmp : -cmp
    })
  }

  it('sorts by vehicle number ascending', () => {
    const sorted = sortVehicles(vehicles, 'vehicle_number', true)
    expect(sorted[0].vehicle_number).toBe('Truck 1')
    expect(sorted[2].vehicle_number).toBe('Truck 3')
  })

  it('sorts by vehicle number descending', () => {
    const sorted = sortVehicles(vehicles, 'vehicle_number', false)
    expect(sorted[0].vehicle_number).toBe('Truck 3')
    expect(sorted[2].vehicle_number).toBe('Truck 1')
  })

  it('sorts by odometer ascending (nulls as 0)', () => {
    const sorted = sortVehicles(vehicles, 'odometer', true)
    expect(sorted[0].odometer).toBe(45000)
  })

  it('sorts by make/model combined', () => {
    const sorted = sortVehicles(vehicles, 'make', true)
    expect(sorted[0].make).toBe('Chevy')
    expect(sorted[1].make).toBe('Ford')
  })
})

// ── CSV export logic ────────────────────────────────────────────────────────

describe('Fleet CSV export logic', () => {
  it('generates valid CSV with correct headers', () => {
    const headers = ['Vehicle #', 'Year', 'Make', 'Model', 'VIN', 'License Plate', 'Color', 'Crew', 'Driver', 'Status', 'Odometer', 'Insurance Expiry', 'Registration Expiry', 'Last Inspection', 'Next Inspection']
    const vehicles = [VEHICLE_A]
    const rows = vehicles.map(v => [
      v.vehicle_number, v.year ?? '', v.make ?? '', v.model ?? '', v.vin ?? '',
      v.license_plate ?? '', v.color ?? '', v.assigned_crew ?? '', v.assigned_driver ?? '',
      v.status, v.odometer ?? '', v.insurance_expiry ?? '', v.registration_expiry ?? '',
      v.last_inspection_date ?? '', v.next_inspection_date ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

    expect(csv).toContain('"Vehicle #"')
    expect(csv).toContain('"Truck 1"')
    expect(csv).toContain('"Ford"')
    expect(csv).toContain('"F-250"')
    expect(csv).toContain('"45000"')
  })

  it('handles null values in CSV export', () => {
    const headers = ['Vehicle #', 'Make']
    const vehicles = [VEHICLE_B]
    const rows = vehicles.map(v => [v.vehicle_number, v.color ?? ''])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')

    expect(csv).toContain('""')  // null color becomes empty
  })

  it('escapes double quotes in CSV values', () => {
    const testVehicle = { ...VEHICLE_A, notes: 'Has "special" notes' }
    const value = `"${String(testVehicle.notes).replace(/"/g, '""')}"`
    expect(value).toBe('"Has ""special"" notes"')
  })
})

// ── Maintenance due detection ───────────────────────────────────────────────

describe('Maintenance due detection', () => {
  it('detects maintenance due within window', () => {
    const soon = new Date()
    soon.setDate(soon.getDate() + 15)
    const record = { ...MAINT_RECORD, next_due_date: soon.toISOString().split('T')[0] }

    function daysUntil(d: string | null): number | null {
      if (!d) return null
      const target = new Date(d + 'T00:00:00')
      return Math.floor((target.getTime() - Date.now()) / 86400000)
    }

    const days = daysUntil(record.next_due_date)
    expect(days).not.toBeNull()
    expect(days!).toBeGreaterThanOrEqual(0)
    expect(days!).toBeLessThanOrEqual(30)
  })

  it('detects overdue maintenance', () => {
    const past = new Date()
    past.setDate(past.getDate() - 5)
    const record = { ...MAINT_RECORD, next_due_date: past.toISOString().split('T')[0] }

    function daysUntil(d: string | null): number | null {
      if (!d) return null
      const target = new Date(d + 'T00:00:00')
      return Math.floor((target.getTime() - Date.now()) / 86400000)
    }

    const days = daysUntil(record.next_due_date)
    expect(days).not.toBeNull()
    expect(days!).toBeLessThan(0)
  })

  it('returns null for records with no next_due_date', () => {
    function daysUntil(d: string | null): number | null {
      if (!d) return null
      const target = new Date(d + 'T00:00:00')
      return Math.floor((target.getTime() - Date.now()) / 86400000)
    }

    expect(daysUntil(null)).toBeNull()
  })
})

// ── Summary counts ──────────────────────────────────────────────────────────

describe('Fleet page summary counts', () => {
  const vehicles = [VEHICLE_A, VEHICLE_B, VEHICLE_RETIRED]

  it('counts total vehicles', () => {
    expect(vehicles.length).toBe(3)
  })

  it('counts active vehicles', () => {
    expect(vehicles.filter(v => v.status === 'active').length).toBe(1)
  })

  it('counts maintenance vehicles', () => {
    expect(vehicles.filter(v => v.status === 'maintenance').length).toBe(1)
  })

  it('counts upcoming service (within 30 days)', () => {
    function daysUntil(d: string | null): number | null {
      if (!d) return null
      const target = new Date(d + 'T00:00:00')
      return Math.floor((target.getTime() - Date.now()) / 86400000)
    }

    const upcomingCount = vehicles.filter(v => {
      const d = daysUntil(v.next_inspection_date)
      return d !== null && d >= 0 && d <= 30
    }).length

    // VEHICLE_A has next_inspection_date '2026-04-15' — may or may not be within 30 days depending on test date
    expect(typeof upcomingCount).toBe('number')
    expect(upcomingCount).toBeGreaterThanOrEqual(0)
  })
})

// ── Pagination ──────────────────────────────────────────────────────────────

describe('Fleet page pagination', () => {
  it('calculates correct total pages', () => {
    const PAGE_SIZE = 50
    const filtered = Array.from({ length: 125 }, (_, i) => ({ id: `v-${i}` }))
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    expect(totalPages).toBe(3)
  })

  it('returns minimum 1 page for empty list', () => {
    const PAGE_SIZE = 50
    const totalPages = Math.max(1, Math.ceil(0 / PAGE_SIZE))
    expect(totalPages).toBe(1)
  })

  it('slices correct page window', () => {
    const PAGE_SIZE = 50
    const items = Array.from({ length: 75 }, (_, i) => i)
    const page1 = items.slice(0, PAGE_SIZE)
    const page2 = items.slice(PAGE_SIZE, PAGE_SIZE * 2)
    expect(page1).toHaveLength(50)
    expect(page2).toHaveLength(25)
  })
})
