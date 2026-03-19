import { describe, it, expect } from 'vitest'

describe('service status tabs', () => {
  const calls = [
    { id: 'SC1', status: 'open', description: 'Panel issue' },
    { id: 'SC2', status: 'open', description: 'Inverter fault' },
    { id: 'SC3', status: 'closed', description: 'Resolved' },
    { id: 'SC4', status: 'scheduled', description: 'Follow-up' },
    { id: 'SC5', status: 'in_progress', description: 'Working' },
  ]

  it('counts all calls', () => {
    expect(calls.length).toBe(5)
  })

  it('filters by open status', () => {
    expect(calls.filter(c => c.status === 'open')).toHaveLength(2)
  })

  it('filters by closed status', () => {
    expect(calls.filter(c => c.status === 'closed')).toHaveLength(1)
  })

  it('filters by scheduled status', () => {
    expect(calls.filter(c => c.status === 'scheduled')).toHaveLength(1)
  })

  it('all status shows everything', () => {
    const statusFilter = 'all'
    const filtered = statusFilter === 'all' ? calls : calls.filter(c => c.status === statusFilter)
    expect(filtered).toHaveLength(5)
  })
})

describe('service filter composition', () => {
  const calls = [
    { id: 'SC1', status: 'open', description: 'Panel issue', project_name: 'Smith' },
    { id: 'SC2', status: 'closed', description: 'Panel fix', project_name: 'Smith' },
    { id: 'SC3', status: 'open', description: 'Inverter', project_name: 'Jones' },
  ]

  function filter(items: typeof calls, statusFilter: string, search: string) {
    return items.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!c.project_name?.toLowerCase().includes(q) && !c.id?.toLowerCase().includes(q) && !c.description?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }

  it('search does NOT override status filter', () => {
    // Smith has both open and closed — searching "Smith" with status=open should only show open
    const result = filter(calls, 'open', 'Smith')
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('open')
  })

  it('search + status both applied', () => {
    const result = filter(calls, 'open', 'Panel')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('SC1')
  })

  it('empty search respects status filter', () => {
    const result = filter(calls, 'closed', '')
    expect(result).toHaveLength(1)
  })
})
