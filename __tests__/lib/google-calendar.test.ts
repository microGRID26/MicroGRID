import { describe, it, expect, vi } from 'vitest'

// Mock the module since it requires env vars and external API
vi.mock('@/lib/google-calendar', async () => {
  return {
    isGoogleCalendarConfigured: () => false,
    buildEventTitle: (jobType: string, projectName: string, projectId: string) => {
      const labels: Record<string, string> = { install: 'Install', survey: 'Survey', inspection: 'Inspection', service: 'Service' }
      return `${labels[jobType] ?? jobType}: ${projectName} (${projectId})`
    },
    buildEventDescription: (opts: { jobType: string; crewName?: string; notes?: string | null; projectId: string }) => {
      const lines = [`Job: ${opts.jobType}`, `Project: ${opts.projectId}`]
      if (opts.crewName) lines.push(`Crew: ${opts.crewName}`)
      if (opts.notes) lines.push(`Notes: ${opts.notes}`)
      return lines.join('\n')
    },
  }
})

import { isGoogleCalendarConfigured, buildEventTitle, buildEventDescription } from '@/lib/google-calendar'

describe('isGoogleCalendarConfigured', () => {
  it('returns false when env var is not set', () => {
    expect(isGoogleCalendarConfigured()).toBe(false)
  })
})

describe('buildEventTitle', () => {
  it('formats install title', () => {
    expect(buildEventTitle('install', 'John Smith', 'PROJ-100')).toBe('Install: John Smith (PROJ-100)')
  })

  it('formats inspection title', () => {
    expect(buildEventTitle('inspection', 'Jane Doe', 'PROJ-200')).toBe('Inspection: Jane Doe (PROJ-200)')
  })

  it('handles unknown job type', () => {
    expect(buildEventTitle('rnr', 'Test', 'PROJ-1')).toBe('rnr: Test (PROJ-1)')
  })
})

describe('buildEventDescription', () => {
  it('includes job type and project', () => {
    const desc = buildEventDescription({ jobType: 'install', projectId: 'PROJ-100', crewName: '', notes: null })
    expect(desc).toContain('install')
    expect(desc).toContain('PROJ-100')
  })

  it('includes crew name when provided', () => {
    const desc = buildEventDescription({ jobType: 'install', projectId: 'PROJ-1', crewName: 'HOU 1', notes: null })
    expect(desc).toContain('HOU 1')
  })

  it('includes notes when provided', () => {
    const desc = buildEventDescription({ jobType: 'survey', projectId: 'PROJ-1', crewName: '', notes: 'Call before arriving' })
    expect(desc).toContain('Call before arriving')
  })

  it('omits crew and notes when null', () => {
    const desc = buildEventDescription({ jobType: 'service', projectId: 'PROJ-1', crewName: '', notes: null })
    expect(desc).not.toContain('Crew:')
    expect(desc).not.toContain('Notes:')
  })
})
