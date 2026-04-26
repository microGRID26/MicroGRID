import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SheetPV3 } from '@/components/planset/SheetPV3'
import type { PlansetData, PlansetRoofFace, PlansetString } from '@/lib/planset-types'
import { MICROGRID_CONTRACTOR } from '@/lib/planset-types'

const square: [number, number][] = [[0.1, 0.1], [0.9, 0.1], [0.9, 0.9], [0.1, 0.9]]

const face: PlansetRoofFace = {
  id: 1, tilt: 25, azimuth: 180, modules: 12,
  polygon: square,
  setbacks: { ridge: true, eave: false, rake: false, pathClear: 'walkable' },
}

const str: PlansetString = {
  id: 1, mppt: 1, modules: 12, roofFace: 1, vocCold: 0, vmpNominal: 0, current: 0,
}

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
  roofFaces: [face],
  strings: [str],
  panelModel: 'Seraphim 440',
  panelCount: 12,
  systemDcKw: 5.28,
  systemAcKw: 15,
  totalStorageKwh: 80,
  inverterModel: 'Duracell Power Center Max Hybrid 15kW',
  inverterCount: 2,
  batteryCount: 16,
  batteryModel: 'Duracell 5kWh LFP',
  batteryCapacity: 5,
}

describe('SheetPV3 — polygon roof rendering', () => {
  it('renders RoofPlaneSvg with per-string labels when faces have polygon data', () => {
    const { container } = render(<SheetPV3 data={baseData as PlansetData} />)
    expect(container.textContent).toContain('STRING 1')
    expect(container.textContent).toContain('12 MODULES')
  })

  it('renders ROOF #1 callout', () => {
    const { container } = render(<SheetPV3 data={baseData as PlansetData} />)
    expect(container.textContent).toContain('ROOF #1')
  })

  it('does not render the inline "Detail A" block (moved to SheetPV4)', () => {
    const { container } = render(<SheetPV3 data={baseData as PlansetData} />)
    expect(container.textContent).not.toMatch(/detail a/i)
  })
})
