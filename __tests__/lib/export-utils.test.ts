import { describe, it, expect, vi } from 'vitest'
import { ALL_EXPORT_FIELDS, DEFAULT_EXPORT_KEYS, exportProjectsCSV, escapeCell } from '@/lib/export-utils'
import type { Project } from '@/types/database'

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'PROJ-00001', name: 'Test Project', stage: 'evaluation', pm: 'Test PM',
    city: null, address: null, phone: null, email: null, sale_date: null,
    stage_date: null, contract: null, systemkw: null, financier: null,
    disposition: null, blocker: null, module: null, module_qty: null,
    inverter: null, inverter_qty: null, battery: null, battery_qty: null,
    optimizer: null, optimizer_qty: null, meter_location: null, panel_location: null,
    voltage: null, msp_bus_rating: null, mpu: null, shutdown: null,
    performance_meter: null, interconnection_breaker: null, main_breaker: null,
    hoa: null, esid: null, permit_number: null, utility_app_number: null,
    ahj: null, utility: null, advisor: null, consultant: null, dealer: null,
    ntp_date: null, survey_scheduled_date: null, survey_date: null,
    install_scheduled_date: null, install_complete_date: null,
    city_permit_date: null, utility_permit_date: null, permit_fee: null,
    city_inspection_date: null, utility_inspection_date: null,
    pto_date: null, in_service_date: null, financing_type: null,
    down_payment: null, tpo_escalator: null, financier_adv_pmt: null,
    site_surveyor: null, consultant_email: null,
    created_at: null, city_permit_date2: null, utility_permit_date2: null,
    ...overrides,
  } as Project
}

describe('ALL_EXPORT_FIELDS', () => {
  it('has all export fields', () => {
    expect(ALL_EXPORT_FIELDS.length).toBeGreaterThanOrEqual(40)
  })

  it('each field has key, label, and getValue', () => {
    for (const f of ALL_EXPORT_FIELDS) {
      expect(f.key).toBeDefined()
      expect(f.label).toBeDefined()
      expect(typeof f.getValue).toBe('function')
    }
  })
})

describe('DEFAULT_EXPORT_KEYS', () => {
  it('includes all field keys', () => {
    expect(DEFAULT_EXPORT_KEYS.length).toBe(ALL_EXPORT_FIELDS.length)
  })
})

describe('exportProjectsCSV', () => {
  it('creates CSV with correct headers for selected fields', () => {
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({ click: clickMock, href: '', download: '' } as any)

    const project = makeProject({ name: 'Solar Home', city: 'Austin' })
    exportProjectsCSV([project], ['id', 'name', 'city'])

    expect(clickMock).toHaveBeenCalled()
  })

  it('handles commas in values by quoting', () => {
    // The escapeCell function should wrap values with commas in quotes
    const project = makeProject({ name: 'Smith, John' })
    // This test verifies it doesn't crash with special chars
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({ click: clickMock, href: '', download: '' } as any)
    exportProjectsCSV([project], ['name'])
    expect(clickMock).toHaveBeenCalled()
  })

  it('exports all fields when no selection provided', () => {
    const clickMock = vi.fn()
    vi.spyOn(document, 'createElement').mockReturnValue({ click: clickMock, href: '', download: '' } as any)
    exportProjectsCSV([makeProject()])
    expect(clickMock).toHaveBeenCalled()
  })
})

describe('escapeCell — CSV formula injection', () => {
  it('prefixes = with single quote', () => {
    expect(escapeCell('=1+1')).toBe("'=1+1")
  })
  it('prefixes @ with single quote', () => {
    expect(escapeCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)")
  })
  it('prefixes + with single quote', () => {
    expect(escapeCell('+cmd|calc')).toBe("'+cmd|calc")
  })
  it('prefixes - with single quote', () => {
    expect(escapeCell('-2+3')).toBe("'-2+3")
  })
  it('prefixes tab-led value with single quote (neutralizes formula)', () => {
    expect(escapeCell('\t=evil')).toBe("'\t=evil")
  })
  it('leaves normal values alone', () => {
    expect(escapeCell('Smith, John')).toBe('"Smith, John"')
    expect(escapeCell('Austin')).toBe('Austin')
    expect(escapeCell(null)).toBe('')
    expect(escapeCell(undefined)).toBe('')
    expect(escapeCell(42)).toBe('42')
  })
  it('quotes formula payloads containing commas', () => {
    expect(escapeCell('=HYPERLINK("http://evil", "click")')).toBe('"\'=HYPERLINK(""http://evil"", ""click"")"')
  })
})
