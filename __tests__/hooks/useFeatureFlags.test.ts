import { describe, it, expect } from 'vitest'
import { isFeatureEnabled } from '@/lib/useFeatureFlags'
import type { FeatureFlag } from '@/lib/useFeatureFlags'

function makeFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: 'test-id',
    flag_key: 'test_flag',
    label: 'Test Flag',
    description: null,
    enabled: true,
    rollout_percentage: 100,
    allowed_roles: null,
    allowed_org_ids: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('isFeatureEnabled', () => {
  it('returns false when flag does not exist', () => {
    expect(isFeatureEnabled([], 'nonexistent')).toBe(false)
  })

  it('returns true for enabled flag with no restrictions', () => {
    const flags = [makeFlag({ flag_key: 'my_feature', enabled: true })]
    expect(isFeatureEnabled(flags, 'my_feature')).toBe(true)
  })

  it('returns false for disabled flag', () => {
    const flags = [makeFlag({ flag_key: 'my_feature', enabled: false })]
    expect(isFeatureEnabled(flags, 'my_feature')).toBe(false)
  })

  it('returns true when user role is in allowed_roles', () => {
    const flags = [makeFlag({ flag_key: 'admin_only', allowed_roles: ['admin', 'super_admin'] })]
    expect(isFeatureEnabled(flags, 'admin_only', 'user-1', 'admin')).toBe(true)
  })

  it('returns false when user role is not in allowed_roles', () => {
    const flags = [makeFlag({ flag_key: 'admin_only', allowed_roles: ['admin', 'super_admin'] })]
    expect(isFeatureEnabled(flags, 'admin_only', 'user-1', 'user')).toBe(false)
  })

  it('returns false when allowed_roles is set but no userRole provided', () => {
    const flags = [makeFlag({ flag_key: 'admin_only', allowed_roles: ['admin'] })]
    expect(isFeatureEnabled(flags, 'admin_only', 'user-1')).toBe(false)
  })

  it('returns true when allowed_roles is null (all roles allowed)', () => {
    const flags = [makeFlag({ flag_key: 'open', allowed_roles: null })]
    expect(isFeatureEnabled(flags, 'open', 'user-1', 'user')).toBe(true)
  })

  it('returns true when allowed_roles is empty (all roles allowed)', () => {
    const flags = [makeFlag({ flag_key: 'open', allowed_roles: [] })]
    expect(isFeatureEnabled(flags, 'open', 'user-1', 'user')).toBe(true)
  })

  it('rollout_percentage 0 disables for all users', () => {
    const flags = [makeFlag({ flag_key: 'rollout', rollout_percentage: 0 })]
    expect(isFeatureEnabled(flags, 'rollout', 'user-1')).toBe(false)
    expect(isFeatureEnabled(flags, 'rollout', 'user-2')).toBe(false)
  })

  it('rollout_percentage 100 enables for all users', () => {
    const flags = [makeFlag({ flag_key: 'rollout', rollout_percentage: 100 })]
    expect(isFeatureEnabled(flags, 'rollout', 'user-1')).toBe(true)
  })

  it('rollout_percentage < 100 requires userId', () => {
    const flags = [makeFlag({ flag_key: 'rollout', rollout_percentage: 50 })]
    expect(isFeatureEnabled(flags, 'rollout')).toBe(false)
  })

  it('rollout_percentage is deterministic for same user+flag', () => {
    const flags = [makeFlag({ flag_key: 'rollout', rollout_percentage: 50 })]
    const result1 = isFeatureEnabled(flags, 'rollout', 'user-abc')
    const result2 = isFeatureEnabled(flags, 'rollout', 'user-abc')
    expect(result1).toBe(result2)
  })

  it('combines role and rollout checks', () => {
    const flags = [makeFlag({
      flag_key: 'restricted',
      allowed_roles: ['admin'],
      rollout_percentage: 100,
    })]
    // Wrong role
    expect(isFeatureEnabled(flags, 'restricted', 'user-1', 'user')).toBe(false)
    // Right role
    expect(isFeatureEnabled(flags, 'restricted', 'user-1', 'admin')).toBe(true)
  })

  it('finds correct flag among multiple', () => {
    const flags = [
      makeFlag({ flag_key: 'enabled_one', enabled: true }),
      makeFlag({ flag_key: 'disabled_one', enabled: false }),
    ]
    expect(isFeatureEnabled(flags, 'enabled_one')).toBe(true)
    expect(isFeatureEnabled(flags, 'disabled_one')).toBe(false)
  })
})
