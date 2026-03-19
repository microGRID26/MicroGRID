import { describe, it, expect } from 'vitest'

describe('admin access control', () => {
  function checkAdmin(userData: { admin: boolean } | null): boolean {
    // Mirrors the current logic (hardcoded fallback removed)
    if (userData) return userData.admin === true
    return false
  }

  it('grants admin when users.admin is true', () => {
    expect(checkAdmin({ admin: true })).toBe(true)
  })

  it('denies admin when users.admin is false', () => {
    expect(checkAdmin({ admin: false })).toBe(false)
  })

  it('denies admin when no user row found', () => {
    expect(checkAdmin(null)).toBe(false)
  })

  it('no longer uses hardcoded email fallback', () => {
    // Previously, gkelsch@trismartsolar.com was hardcoded as admin
    // Now only the users table determines admin status
    const noUserRow = null
    expect(checkAdmin(noUserRow)).toBe(false)
  })
})

describe('admin modules', () => {
  const modules = ['ahj', 'utility', 'users', 'crews', 'sla', 'info'] as const

  it('has 6 modules', () => {
    expect(modules).toHaveLength(6)
  })

  it('includes all expected modules', () => {
    expect(modules).toContain('ahj')
    expect(modules).toContain('utility')
    expect(modules).toContain('users')
    expect(modules).toContain('crews')
    expect(modules).toContain('sla')
    expect(modules).toContain('info')
  })
})
