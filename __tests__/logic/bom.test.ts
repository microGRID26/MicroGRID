import { describe, it, expect } from 'vitest'

// Mirror calcBOM logic from BomTab.tsx
function calcBOM(moduleQty: number, batteryQty: number, inverterQty: number, arrayCount: number, rowCount: number) {
  const modules = moduleQty || 0
  const batteries = batteryQty || 0
  const inverters = inverterQty || 1
  const arrays = arrayCount || 1
  const rows = rowCount || 1
  const attach = Math.round(modules * 2.4)

  const rsd = Math.ceil(modules / 2)
  const endClamps = Math.round(attach * 0.375)
  const midClamps = Math.max(0, (modules - rows) * 2 - 4)
  const trunkCables = modules + arrays * 2 + 4
  const terminators = arrays * 2 + 1
  const seals = arrays * 2 + 1
  const mlpeMounts = rsd + 4

  return { modules, batteries, inverters, rsd, endClamps, midClamps, trunkCables, terminators, seals, mlpeMounts }
}

describe('BOM calculations', () => {
  it('calculates RSD as ceil(modules/2)', () => {
    expect(calcBOM(20, 0, 1, 1, 1).rsd).toBe(10)
    expect(calcBOM(21, 0, 1, 1, 1).rsd).toBe(11) // ceil
    expect(calcBOM(1, 0, 1, 1, 1).rsd).toBe(1)
  })

  it('calculates MLPE mounts as RSD + 4', () => {
    expect(calcBOM(20, 0, 1, 1, 1).mlpeMounts).toBe(14) // 10 + 4
  })

  it('calculates trunk cables as modules + arrays*2 + 4', () => {
    expect(calcBOM(20, 0, 1, 2, 1).trunkCables).toBe(28) // 20 + 4 + 4
  })

  it('calculates terminators as arrays*2 + 1', () => {
    expect(calcBOM(20, 0, 1, 3, 1).terminators).toBe(7)
  })

  it('mid clamps never go negative', () => {
    // With 1 module and 2 rows: (1-2)*2 - 4 = -6, but max(0, -6) = 0
    expect(calcBOM(1, 0, 1, 1, 2).midClamps).toBe(0)
  })

  it('mid clamps formula: (modules - rows) * 2 - 4', () => {
    // 20 modules, 2 rows: (20-2)*2 - 4 = 32
    expect(calcBOM(20, 0, 1, 1, 2).midClamps).toBe(32)
  })

  it('handles 0 modules gracefully', () => {
    const result = calcBOM(0, 0, 0, 0, 0)
    expect(result.modules).toBe(0)
    expect(result.rsd).toBe(0)
    expect(result.midClamps).toBe(0)
  })

  it('end clamps are ~37.5% of attachments', () => {
    // 20 modules * 2.4 = 48 attachments, * 0.375 = 18
    expect(calcBOM(20, 0, 1, 1, 1).endClamps).toBe(18)
  })
})
