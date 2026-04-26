import { describe, it, expect } from 'vitest'
import { shouldRenderMicroInverterComponent, MICROINVERTER_COMPONENTS } from '@/lib/planset-topology'

describe('shouldRenderMicroInverterComponent', () => {
  it('returns false for string-mppt (new Duracell projects)', () => {
    expect(shouldRenderMicroInverterComponent('string-mppt')).toBe(false)
  })
  it('returns true for micro-inverter (legacy Hambrick-style projects)', () => {
    expect(shouldRenderMicroInverterComponent('micro-inverter')).toBe(true)
  })
})

describe('MICROINVERTER_COMPONENTS', () => {
  it('lists the 5 components William flagged for removal from Duracell SLDs', () => {
    expect(MICROINVERTER_COMPONENTS).toEqual(['DPCRGM', 'DTU', 'CT', 'ETHERNET', 'PLC'])
  })
})
