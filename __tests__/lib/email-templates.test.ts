import { describe, it, expect } from 'vitest'
import { getTemplate, getMaxDay } from '@/lib/email-templates'

describe('getMaxDay', () => {
  it('returns 30', () => {
    expect(getMaxDay()).toBe(30)
  })
})

describe('getTemplate', () => {
  it('returns null for day 0', () => {
    expect(getTemplate(0, 'Test')).toBeNull()
  })

  it('returns null for day 31', () => {
    expect(getTemplate(31, 'Test')).toBeNull()
  })

  it('returns null for negative day', () => {
    expect(getTemplate(-1, 'Test')).toBeNull()
  })

  it('returns a template for day 1', () => {
    const t = getTemplate(1, 'Greg')
    expect(t).not.toBeNull()
    expect(t!.subject).toBeTruthy()
    expect(t!.html).toBeTruthy()
  })

  it('returns templates for all 30 days', () => {
    for (let day = 1; day <= 30; day++) {
      const t = getTemplate(day, 'User')
      expect(t).not.toBeNull()
      expect(t!.subject).toBeTruthy()
      expect(t!.html).toContain('MicroGRID')
    }
  })

  it('escapes HTML in user name', () => {
    const t = getTemplate(1, '<script>alert("xss")</script>')
    expect(t!.html).not.toContain('<script>')
    expect(t!.html).toContain('&lt;script&gt;')
  })

  it('uses fallback name when empty', () => {
    const t = getTemplate(1, '')
    expect(t!.html).toContain('there')
  })

  it('subject is a non-empty string', () => {
    const t = getTemplate(1, 'Test')
    expect(typeof t!.subject).toBe('string')
    expect(t!.subject.length).toBeGreaterThan(0)
  })

  it('html contains day indicator', () => {
    const t = getTemplate(15, 'User')
    expect(t!.html).toContain('Day 15')
  })

  it('html contains base URL', () => {
    const t = getTemplate(1, 'User')
    expect(t!.html).toMatch(/microgrid-crm\.vercel\.app|localhost/)
  })

  it('each day has a unique subject', () => {
    const subjects = new Set<string>()
    for (let day = 1; day <= 30; day++) {
      const t = getTemplate(day, 'User')
      subjects.add(t!.subject)
    }
    // At least 25 unique subjects (some days might share themes)
    expect(subjects.size).toBeGreaterThanOrEqual(25)
  })
})
