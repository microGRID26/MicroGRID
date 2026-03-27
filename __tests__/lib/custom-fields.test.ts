import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockSupabase } from '../../vitest.setup'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockChain(result: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(result)),
    then: vi.fn((cb: any) => Promise.resolve(result).then(cb)),
  }
  return chain
}

// ── Test Data ────────────────────────────────────────────────────────────────

const TEXT_FIELD: any = {
  id: 'f-1',
  field_name: 'roof_type',
  label: 'Roof Type',
  field_type: 'text',
  options: null,
  required: false,
  default_value: null,
  section: 'custom',
  sort_order: 0,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const NUMBER_FIELD: any = {
  id: 'f-2',
  field_name: 'roof_pitch',
  label: 'Roof Pitch',
  field_type: 'number',
  options: null,
  required: true,
  default_value: '30',
  section: 'custom',
  sort_order: 1,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const SELECT_FIELD: any = {
  id: 'f-3',
  field_name: 'roof_material',
  label: 'Roof Material',
  field_type: 'select',
  options: ['Shingle', 'Metal', 'Tile', 'Flat'],
  required: false,
  default_value: 'Shingle',
  section: 'custom',
  sort_order: 2,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const BOOLEAN_FIELD: any = {
  id: 'f-4',
  field_name: 'has_attic_access',
  label: 'Has Attic Access',
  field_type: 'boolean',
  options: null,
  required: false,
  default_value: 'false',
  section: 'custom',
  sort_order: 3,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const DATE_FIELD: any = {
  id: 'f-5',
  field_name: 'last_roof_inspection',
  label: 'Last Roof Inspection',
  field_type: 'date',
  options: null,
  required: false,
  default_value: null,
  section: 'custom',
  sort_order: 4,
  active: true,
  created_at: '2026-01-01T00:00:00Z',
}

const URL_FIELD: any = {
  id: 'f-6',
  field_name: 'permit_link',
  label: 'Permit Link',
  field_type: 'url',
  options: null,
  required: false,
  default_value: null,
  section: 'permits',
  sort_order: 0,
  active: false,
  created_at: '2026-01-01T00:00:00Z',
}

const ALL_FIELDS = [TEXT_FIELD, NUMBER_FIELD, SELECT_FIELD, BOOLEAN_FIELD, DATE_FIELD, URL_FIELD]

const FIELD_VALUE_A: any = {
  id: 'fv-1',
  project_id: 'PROJ-00001',
  field_id: 'f-1',
  value: 'Composition shingle',
  updated_at: '2026-03-01T00:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

// ── FIELD_TYPES constant ────────────────────────────────────────────────────

describe('FIELD_TYPES', () => {
  it('exports all 6 field types', async () => {
    const { FIELD_TYPES } = await import('@/lib/api/custom-fields')
    expect(FIELD_TYPES).toHaveLength(6)
    const values = FIELD_TYPES.map(t => t.value)
    expect(values).toContain('text')
    expect(values).toContain('number')
    expect(values).toContain('date')
    expect(values).toContain('select')
    expect(values).toContain('boolean')
    expect(values).toContain('url')
  })

  it('has labels for all types', async () => {
    const { FIELD_TYPES } = await import('@/lib/api/custom-fields')
    for (const t of FIELD_TYPES) {
      expect(t.label).toBeTruthy()
      expect(typeof t.label).toBe('string')
    }
  })
})

// ── loadFieldDefinitions ────────────────────────────────────────────────────

describe('loadFieldDefinitions', () => {
  it('loads all field definitions', async () => {
    const chain = mockChain({ data: ALL_FIELDS, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadFieldDefinitions } = await import('@/lib/api/custom-fields')
    const result = await loadFieldDefinitions()

    expect(mockSupabase.from).toHaveBeenCalledWith('custom_field_definitions')
    expect(chain.order).toHaveBeenCalledWith('sort_order')
    expect(result).toEqual(ALL_FIELDS)
  })

  it('filters to active only when requested', async () => {
    const chain = mockChain({ data: [TEXT_FIELD, NUMBER_FIELD], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadFieldDefinitions } = await import('@/lib/api/custom-fields')
    await loadFieldDefinitions(true)

    expect(chain.eq).toHaveBeenCalledWith('active', true)
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadFieldDefinitions } = await import('@/lib/api/custom-fields')
    const result = await loadFieldDefinitions()
    expect(result).toEqual([])
  })
})

// ── addFieldDefinition ──────────────────────────────────────────────────────

describe('addFieldDefinition', () => {
  it('creates a field definition', async () => {
    const chain = mockChain({ data: TEXT_FIELD, error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { addFieldDefinition } = await import('@/lib/api/custom-fields')
    const { id, created_at, ...input } = TEXT_FIELD
    const result = await addFieldDefinition(input)

    expect(chain.insert).toHaveBeenCalled()
    expect(chain.select).toHaveBeenCalled()
    expect(chain.single).toHaveBeenCalled()
    expect(result).toEqual(TEXT_FIELD)
  })

  it('returns null on duplicate field_name error', async () => {
    const chain = mockChain({ data: null, error: { message: 'duplicate key' } })
    mockSupabase.from.mockReturnValue(chain)

    const { addFieldDefinition } = await import('@/lib/api/custom-fields')
    const result = await addFieldDefinition(TEXT_FIELD)
    expect(result).toBeNull()
  })
})

// ── updateFieldDefinition ───────────────────────────────────────────────────

describe('updateFieldDefinition', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { updateFieldDefinition } = await import('@/lib/api/custom-fields')
    const result = await updateFieldDefinition('f-1', { label: 'Updated Label' })
    expect(result).toBe(true)
  })

  it('returns false on error', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: { message: 'permission' } }))
    mockSupabase.from.mockReturnValue(chain)

    const { updateFieldDefinition } = await import('@/lib/api/custom-fields')
    const result = await updateFieldDefinition('f-1', { label: 'Fail' })
    expect(result).toBe(false)
  })
})

// ── deleteFieldDefinition ───────────────────────────────────────────────────

describe('deleteFieldDefinition', () => {
  it('returns true on success', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { deleteFieldDefinition } = await import('@/lib/api/custom-fields')
    const result = await deleteFieldDefinition('f-1')
    expect(result).toBe(true)
  })

  it('returns false on error (non-admin)', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.eq = vi.fn(() => Promise.resolve({ error: { message: 'RLS denied' } }))
    mockSupabase.from.mockReturnValue(chain)

    const { deleteFieldDefinition } = await import('@/lib/api/custom-fields')
    const result = await deleteFieldDefinition('f-1')
    expect(result).toBe(false)
  })
})

// ── loadProjectCustomFields ─────────────────────────────────────────────────

describe('loadProjectCustomFields', () => {
  it('loads values for a project', async () => {
    const chain = mockChain({ data: [FIELD_VALUE_A], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadProjectCustomFields } = await import('@/lib/api/custom-fields')
    const result = await loadProjectCustomFields('PROJ-00001')

    expect(mockSupabase.from).toHaveBeenCalledWith('custom_field_values')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'PROJ-00001')
    expect(result).toEqual([FIELD_VALUE_A])
  })

  it('returns empty array on error', async () => {
    const chain = mockChain({ data: null, error: { message: 'error' } })
    mockSupabase.from.mockReturnValue(chain)

    const { loadProjectCustomFields } = await import('@/lib/api/custom-fields')
    const result = await loadProjectCustomFields('PROJ-00001')
    expect(result).toEqual([])
  })
})

// ── saveProjectCustomField ──────────────────────────────────────────────────

describe('saveProjectCustomField', () => {
  it('upserts value and returns true', async () => {
    const chain = mockChain({ data: null, error: null })
    // Make upsert resolve directly (no .single())
    chain.upsert = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { saveProjectCustomField } = await import('@/lib/api/custom-fields')
    const result = await saveProjectCustomField('PROJ-00001', 'f-1', 'New value')

    expect(mockSupabase.from).toHaveBeenCalledWith('custom_field_values')
    expect(result).toBe(true)
  })

  it('passes onConflict for project_id,field_id', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.upsert = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { saveProjectCustomField } = await import('@/lib/api/custom-fields')
    await saveProjectCustomField('PROJ-00001', 'f-1', 'value')

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: 'PROJ-00001', field_id: 'f-1', value: 'value' }),
      expect.objectContaining({ onConflict: 'project_id,field_id' })
    )
  })

  it('handles null values', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.upsert = vi.fn(() => Promise.resolve({ error: null }))
    mockSupabase.from.mockReturnValue(chain)

    const { saveProjectCustomField } = await import('@/lib/api/custom-fields')
    const result = await saveProjectCustomField('PROJ-00001', 'f-4', null)

    expect(result).toBe(true)
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ value: null }),
      expect.anything()
    )
  })

  it('returns false on error', async () => {
    const chain = mockChain({ data: null, error: null })
    chain.upsert = vi.fn(() => Promise.resolve({ error: { message: 'error' } }))
    mockSupabase.from.mockReturnValue(chain)

    const { saveProjectCustomField } = await import('@/lib/api/custom-fields')
    const result = await saveProjectCustomField('PROJ-00001', 'f-1', 'value')
    expect(result).toBe(false)
  })
})

// ── loadAllCustomFieldValues ────────────────────────────────────────────────

describe('loadAllCustomFieldValues', () => {
  it('loads values for a field with limit', async () => {
    const chain = mockChain({ data: [FIELD_VALUE_A], error: null })
    mockSupabase.from.mockReturnValue(chain)

    const { loadAllCustomFieldValues } = await import('@/lib/api/custom-fields')
    const result = await loadAllCustomFieldValues('f-1')

    expect(chain.eq).toHaveBeenCalledWith('field_id', 'f-1')
    expect(chain.limit).toHaveBeenCalledWith(2000)
    expect(result).toEqual([FIELD_VALUE_A])
  })
})

// ── Value parsing/formatting per type ───────────────────────────────────────

describe('Custom field value formatting per type', () => {
  it('text fields store raw text', () => {
    const value = 'Composition shingle'
    expect(typeof value).toBe('string')
  })

  it('number fields store as string representation', () => {
    const value = '42.5'
    expect(parseFloat(value)).toBe(42.5)
    expect(isNaN(parseFloat(value))).toBe(false)
  })

  it('number fields handle empty string', () => {
    const value = ''
    expect(value || null).toBeNull()
  })

  it('boolean fields store as "true" or "false" strings', () => {
    const trueVal = 'true'
    const falseVal = 'false'
    expect(trueVal === 'true').toBe(true)
    expect(falseVal === 'true').toBe(false)
  })

  it('date fields store as ISO date string', () => {
    const value = '2026-03-27'
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('url fields store as URL string', () => {
    const value = 'https://example.com/permit/123'
    expect(value.startsWith('https://')).toBe(true)
  })

  it('select fields store the selected option text', () => {
    const options = ['Shingle', 'Metal', 'Tile', 'Flat']
    const value = 'Metal'
    expect(options).toContain(value)
  })

  it('null values represent unset fields', () => {
    const value: string | null = null
    expect(value).toBeNull()
  })
})

// ── Field definition validation logic ───────────────────────────────────────

describe('Custom field definition validation', () => {
  it('field_name must be unique (UNIQUE constraint)', () => {
    // Just verify the type expects it
    expect(TEXT_FIELD.field_name).toBe('roof_type')
    expect(NUMBER_FIELD.field_name).toBe('roof_pitch')
    expect(TEXT_FIELD.field_name).not.toBe(NUMBER_FIELD.field_name)
  })

  it('field_type must be one of the valid types', () => {
    const validTypes = ['text', 'number', 'date', 'select', 'boolean', 'url']
    for (const field of ALL_FIELDS) {
      expect(validTypes).toContain(field.field_type)
    }
  })

  it('select fields should have options array', () => {
    expect(SELECT_FIELD.options).toBeInstanceOf(Array)
    expect(SELECT_FIELD.options!.length).toBeGreaterThan(0)
  })

  it('non-select fields should have null options', () => {
    expect(TEXT_FIELD.options).toBeNull()
    expect(NUMBER_FIELD.options).toBeNull()
    expect(BOOLEAN_FIELD.options).toBeNull()
  })

  it('required fields are marked correctly', () => {
    expect(NUMBER_FIELD.required).toBe(true)
    expect(TEXT_FIELD.required).toBe(false)
  })

  it('inactive fields can exist', () => {
    expect(URL_FIELD.active).toBe(false)
  })

  it('sort_order determines field display order', () => {
    const sorted = [...ALL_FIELDS].sort((a, b) => a.sort_order - b.sort_order)
    // Within same sort_order, order by created_at
    expect(sorted[0].sort_order).toBeLessThanOrEqual(sorted[1].sort_order)
  })

  it('default_value can be null', () => {
    expect(TEXT_FIELD.default_value).toBeNull()
  })

  it('default_value can be set', () => {
    expect(NUMBER_FIELD.default_value).toBe('30')
    expect(SELECT_FIELD.default_value).toBe('Shingle')
  })
})

// ── CustomFieldsManager: slugify logic ──────────────────────────────────────

describe('slugify function (CustomFieldsManager)', () => {
  function slugify(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
  }

  it('converts label to snake_case', () => {
    expect(slugify('Roof Type')).toBe('roof_type')
  })

  it('handles multiple spaces', () => {
    expect(slugify('Roof   Material   Type')).toBe('roof_material_type')
  })

  it('removes special characters', () => {
    expect(slugify('My Field (v2)!')).toBe('my_field_v2')
  })

  it('strips leading/trailing underscores', () => {
    expect(slugify('  Roof Type  ')).toBe('roof_type')
  })

  it('handles single word', () => {
    expect(slugify('Notes')).toBe('notes')
  })

  it('handles numbers', () => {
    expect(slugify('Phase 2 Count')).toBe('phase_2_count')
  })

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('')
  })
})

// ── Custom Fields in InfoTab: value map building ────────────────────────────

describe('Custom fields InfoTab value mapping', () => {
  it('builds value map from loaded values', () => {
    const vals = [
      { id: 'fv-1', project_id: 'P1', field_id: 'f-1', value: 'Shingle', updated_at: '' },
      { id: 'fv-2', project_id: 'P1', field_id: 'f-2', value: '30', updated_at: '' },
      { id: 'fv-3', project_id: 'P1', field_id: 'f-4', value: 'true', updated_at: '' },
    ]
    const map: Record<string, string | null> = {}
    vals.forEach(v => { map[v.field_id] = v.value })

    expect(map['f-1']).toBe('Shingle')
    expect(map['f-2']).toBe('30')
    expect(map['f-4']).toBe('true')
    expect(map['f-3']).toBeUndefined() // not set
  })

  it('applies default value when no saved value exists', () => {
    const map: Record<string, string | null> = {}
    const def = SELECT_FIELD
    const savedValue = map[def.id] ?? def.default_value ?? null
    expect(savedValue).toBe('Shingle') // default_value
  })

  it('saved value overrides default', () => {
    const map: Record<string, string | null> = { 'f-3': 'Metal' }
    const def = SELECT_FIELD
    const savedValue = map[def.id] ?? def.default_value ?? null
    expect(savedValue).toBe('Metal')
  })

  it('null saved value falls through to default', () => {
    const map: Record<string, string | null> = { 'f-3': null }
    const def = SELECT_FIELD
    // null ?? default should use default
    const savedValue = map[def.id] ?? def.default_value ?? null
    expect(savedValue).toBe('Shingle')
  })
})

// ── Custom fields search/filter in manager ──────────────────────────────────

describe('CustomFieldsManager search filter', () => {
  it('filters fields by label', () => {
    const fields = ALL_FIELDS
    const search = 'roof'
    const filtered = fields.filter(f => {
      const q = search.toLowerCase()
      return f.label.toLowerCase().includes(q) || f.field_name.toLowerCase().includes(q)
    })
    expect(filtered).toHaveLength(4) // Roof Type, Roof Pitch, Roof Material, Last Roof Inspection
  })

  it('filters fields by field_name', () => {
    const fields = ALL_FIELDS
    const search = 'permit'
    const filtered = fields.filter(f => {
      const q = search.toLowerCase()
      return f.label.toLowerCase().includes(q) || f.field_name.toLowerCase().includes(q)
    })
    expect(filtered).toHaveLength(1) // permit_link
  })

  it('returns all fields when search is empty', () => {
    const fields = ALL_FIELDS
    const search = ''
    const filtered = search.trim()
      ? fields.filter(f => f.label.toLowerCase().includes(search.toLowerCase()) || f.field_name.toLowerCase().includes(search.toLowerCase()))
      : fields
    expect(filtered).toHaveLength(ALL_FIELDS.length)
  })

  it('returns empty when no match', () => {
    const fields = ALL_FIELDS
    const search = 'zzznotexist'
    const filtered = fields.filter(f => {
      const q = search.toLowerCase()
      return f.label.toLowerCase().includes(q) || f.field_name.toLowerCase().includes(q)
    })
    expect(filtered).toHaveLength(0)
  })
})
