import { describe, it, expect } from 'vitest'
import { DxfBuilder } from '@/lib/dxf-generator'

describe('DxfBuilder', () => {
  it('creates a valid empty DXF', () => {
    const b = new DxfBuilder()
    const dxf = b.toString()
    expect(dxf).toContain('SECTION')
    expect(dxf).toContain('HEADER')
    expect(dxf).toContain('ENTITIES')
    expect(dxf).toContain('EOF')
  })

  it('adds layers to the TABLES section', () => {
    const b = new DxfBuilder()
    b.addLayer('WIRE', 1)
    b.addLayer('PANEL', 3)
    const dxf = b.toString()
    expect(dxf).toContain('WIRE')
    expect(dxf).toContain('PANEL')
  })

  it('adds a LINE entity with correct coordinates', () => {
    const b = new DxfBuilder()
    b.addLayer('L1', 7)
    b.addLine(0, 0, 100, 200, 'L1')
    const dxf = b.toString()
    expect(dxf).toContain('LINE')
    expect(dxf).toContain('0.0000') // x1
    expect(dxf).toContain('100.0000') // x2
    expect(dxf).toContain('200.0000') // y2
  })

  it('adds a RECT as 4 LINE entities', () => {
    const b = new DxfBuilder()
    b.addLayer('BOX', 5)
    b.addRect(10, 20, 50, 30, 'BOX')
    const dxf = b.toString()
    // Rect = 4 lines
    const lineCount = (dxf.match(/\nLINE\n/g) || []).length
    expect(lineCount).toBe(4)
  })

  it('adds a CIRCLE entity', () => {
    const b = new DxfBuilder()
    b.addLayer('C1', 2)
    b.addCircle(50, 50, 25, 'C1')
    const dxf = b.toString()
    expect(dxf).toContain('CIRCLE')
    expect(dxf).toContain('50.0000')
    expect(dxf).toContain('25.0000') // radius
  })

  it('adds TEXT entity', () => {
    const b = new DxfBuilder()
    b.addLayer('TXT', 7)
    b.addText(10, 20, 3.5, 'Hello World', 'TXT')
    const dxf = b.toString()
    expect(dxf).toContain('TEXT')
    expect(dxf).toContain('Hello World')
    expect(dxf).toContain('3.5') // height
  })

  it('handles decimal precision', () => {
    const b = new DxfBuilder()
    b.addLayer('L', 1)
    b.addLine(1.123456, 2.654321, 3.999999, 4.000001, 'L')
    const dxf = b.toString()
    // Should be 4 decimal places
    expect(dxf).toContain('1.1235')
    expect(dxf).toContain('2.6543')
  })

  it('build produces string output', () => {
    const b = new DxfBuilder()
    const dxf = b.toString()
    expect(typeof dxf).toBe('string')
    expect(dxf.length).toBeGreaterThan(100)
  })
})
