import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SheetPV2A } from '@/components/planset/SheetPV2A'
import type { PlansetData } from '@/lib/planset-types'
import { MICROGRID_CONTRACTOR } from '@/lib/planset-types'

const baseData: Partial<PlansetData> = {
  contractor: MICROGRID_CONTRACTOR,
}

describe('SheetPV2A — Unit Index / Legend', () => {
  it('renders all legend entries', () => {
    const { container } = render(<SheetPV2A data={baseData as PlansetData} />)
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBeGreaterThanOrEqual(16)
  })

  it('includes RSD-D-20 callout', () => {
    const { container } = render(<SheetPV2A data={baseData as PlansetData} />)
    expect(container.textContent).toContain('RSD-D-20')
  })

  it('includes Cantex bar entry', () => {
    const { container } = render(<SheetPV2A data={baseData as PlansetData} />)
    expect(container.textContent?.toLowerCase()).toContain('cantex')
  })

  it('includes EMT conduit symbol but not PVC (Duracell projects use EMT only)', () => {
    const { container } = render(<SheetPV2A data={baseData as PlansetData} />)
    expect(container.textContent).toContain('EMT')
    expect(container.textContent).not.toContain('PVC')
  })

  it('includes fire setback entry', () => {
    const { container } = render(<SheetPV2A data={baseData as PlansetData} />)
    expect(container.textContent?.toLowerCase()).toContain('setback')
  })

  it('includes walking ridge entry', () => {
    const { container } = render(<SheetPV2A data={baseData as PlansetData} />)
    expect(container.textContent?.toLowerCase()).toMatch(/walking|walkable/)
  })
})
