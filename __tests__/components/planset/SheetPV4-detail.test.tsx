import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SheetPV4 } from '@/components/planset/SheetPV4'
import type { PlansetData } from '@/lib/planset-types'
import { MICROGRID_CONTRACTOR } from '@/lib/planset-types'

const baseData: Partial<PlansetData> = {
  projectId: 'TEST-001',
  owner: 'Test Owner',
  address: '123 Main St',
  city: 'Houston',
  state: 'TX',
  zip: '77073',
  utility: 'CenterPoint',
  meter: 'TEST-METER',
  esid: 'TEST-ESID',
  ahj: 'Houston',
  voltage: '120/240V',
  mspBusRating: '200',
  mainBreaker: '200A',
  acConduit: '1-1/4" EMT',
  acRunLengthFt: 50,
  contractor: MICROGRID_CONTRACTOR,
  inverterModel: 'Duracell Power Center Max Hybrid 15kW',
  inverterCount: 2,
  rapidShutdownModel: 'RSD-D-20',
  systemTopology: 'string-mppt',
  hasCantexBar: true,
}

describe('SheetPV4 — dedicated detail page', () => {
  it('renders Detail A content (was previously inline on PV-3)', () => {
    const { container } = render(<SheetPV4 data={baseData as PlansetData} />)
    const text = container.textContent || ''
    // Service / utility tokens
    expect(text.toUpperCase()).toMatch(/UTILITY|METER|MSP|SERVICE|DISCONNECT/)
    // Customer / project context
    expect(text).toMatch(/CenterPoint|TEST-METER|TEST-ESID/)
  })

  it('uses configured AC conduit type from data', () => {
    const { container } = render(<SheetPV4 data={baseData as PlansetData} />)
    expect(container.textContent).toContain('1-1/4" EMT')
  })
})
