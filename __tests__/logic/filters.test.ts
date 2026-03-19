import { describe, it, expect } from 'vitest'

// Mirror the fixed filter pattern used across pipeline, service, and other pages
interface Filterable {
  name: string
  id: string
  city: string | null
  pm: string | null
  financier: string | null
  status?: string
}

function pipelineFilter(
  items: Filterable[],
  { search = '', pmFilter = 'all', financierFilter = 'all' }: { search?: string; pmFilter?: string; financierFilter?: string }
): Filterable[] {
  return items.filter(p => {
    if (pmFilter !== 'all' && p.pm !== pmFilter) return false
    if (financierFilter !== 'all' && p.financier !== financierFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!p.name?.toLowerCase().includes(q) && !p.id?.toLowerCase().includes(q) && !p.city?.toLowerCase().includes(q)) return false
    }
    return true
  })
}

function serviceFilter(
  items: (Filterable & { status: string; description: string })[],
  { search = '', statusFilter = 'all' }: { search?: string; statusFilter?: string }
): typeof items {
  return items.filter(c => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!c.name?.toLowerCase().includes(q) && !c.id?.toLowerCase().includes(q) && !c.description?.toLowerCase().includes(q)) return false
    }
    return true
  })
}

const projects: Filterable[] = [
  { name: 'Smith Solar', id: 'PROJ-001', city: 'Austin', pm: 'Greg', financier: 'Sunrun' },
  { name: 'Jones Home', id: 'PROJ-002', city: 'Dallas', pm: 'Taylor', financier: 'Mosaic' },
  { name: 'Austin Energy', id: 'PROJ-003', city: 'Austin', pm: 'Greg', financier: 'Mosaic' },
]

describe('pipeline filter composition', () => {
  it('search alone filters by name/id/city', () => {
    const result = pipelineFilter(projects, { search: 'Austin' })
    expect(result).toHaveLength(2) // Smith Solar (city=Austin) + Austin Energy
  })

  it('PM filter alone narrows results', () => {
    const result = pipelineFilter(projects, { pmFilter: 'Greg' })
    expect(result).toHaveLength(2)
  })

  it('search + PM filter combine (don\'t override)', () => {
    // This was the bug: search used to override PM filter
    const result = pipelineFilter(projects, { search: 'Austin', pmFilter: 'Taylor' })
    expect(result).toHaveLength(0) // No Taylor projects in Austin
  })

  it('search + financier filter combine', () => {
    const result = pipelineFilter(projects, { search: 'Austin', financierFilter: 'Mosaic' })
    expect(result).toHaveLength(1) // Only Austin Energy has Mosaic + Austin
  })

  it('all filters combine', () => {
    const result = pipelineFilter(projects, { search: 'Austin', pmFilter: 'Greg', financierFilter: 'Mosaic' })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Austin Energy')
  })

  it('empty search returns all (with other filters)', () => {
    const result = pipelineFilter(projects, { search: '', pmFilter: 'Greg' })
    expect(result).toHaveLength(2)
  })

  it('no filters returns all', () => {
    expect(pipelineFilter(projects, {})).toHaveLength(3)
  })
})

describe('service filter composition', () => {
  const calls = [
    { name: 'Smith', id: 'SC-1', city: null, pm: null, financier: null, status: 'open', description: 'Panel issue' },
    { name: 'Jones', id: 'SC-2', city: null, pm: null, financier: null, status: 'closed', description: 'Inverter fault' },
    { name: 'Smith', id: 'SC-3', city: null, pm: null, financier: null, status: 'open', description: 'Roof leak' },
  ]

  it('status filter alone works', () => {
    const result = serviceFilter(calls, { statusFilter: 'open' })
    expect(result).toHaveLength(2)
  })

  it('search + status filter combine (don\'t override)', () => {
    // This was the bug: search used to override status filter
    const result = serviceFilter(calls, { search: 'Smith', statusFilter: 'closed' })
    expect(result).toHaveLength(0) // Smith has no closed calls
  })

  it('search narrows within status', () => {
    const result = serviceFilter(calls, { search: 'Panel', statusFilter: 'open' })
    expect(result).toHaveLength(1)
    expect(result[0].description).toBe('Panel issue')
  })
})
