import { describe, it, expect, vi, beforeEach } from 'vitest'
import { classifyError, handleApiError, checkSupabaseError } from '@/lib/errors'

describe('classifyError', () => {
  it('classifies network errors (fetch failure)', () => {
    const err = new TypeError('Failed to fetch')
    const result = classifyError(err)
    expect(result.type).toBe('network')
    expect(result.userMessage).toContain('Network error')
  })

  it('classifies network errors (timeout)', () => {
    const result = classifyError(new Error('Request timeout'))
    expect(result.type).toBe('network')
  })

  it('classifies network errors (CORS)', () => {
    const result = classifyError(new Error('CORS policy blocked'))
    expect(result.type).toBe('network')
  })

  it('classifies network errors (connection reset)', () => {
    const result = classifyError(new Error('ECONNRESET'))
    expect(result.type).toBe('network')
  })

  it('classifies auth errors (401)', () => {
    const result = classifyError(new Error('401 Unauthorized'))
    expect(result.type).toBe('auth')
    expect(result.userMessage).toContain('sign in')
  })

  it('classifies auth errors (JWT expired)', () => {
    const result = classifyError(new Error('JWT expired'))
    expect(result.type).toBe('auth')
  })

  it('classifies auth errors (forbidden)', () => {
    const result = classifyError(new Error('403 Forbidden'))
    expect(result.type).toBe('auth')
  })

  it('classifies auth errors (not authenticated)', () => {
    const result = classifyError(new Error('not authenticated'))
    expect(result.type).toBe('auth')
  })

  it('classifies data errors (PostgREST)', () => {
    const result = classifyError(new Error('PGRST116: Not found'))
    expect(result.type).toBe('data')
    expect(result.userMessage).toContain('Data error')
  })

  it('classifies data errors (duplicate key)', () => {
    const result = classifyError(new Error('duplicate key value violates unique constraint'))
    expect(result.type).toBe('data')
  })

  it('classifies data errors (null value)', () => {
    const result = classifyError(new Error('null value in column "name"'))
    expect(result.type).toBe('data')
  })

  it('classifies data errors (relation does not exist)', () => {
    const result = classifyError(new Error('relation "foo" does not exist'))
    expect(result.type).toBe('data')
  })

  it('classifies unknown errors', () => {
    const result = classifyError(new Error('something completely unexpected'))
    expect(result.type).toBe('unknown')
    expect(result.userMessage).toContain('Something went wrong')
  })

  it('handles string errors', () => {
    const result = classifyError('raw string error')
    expect(result.type).toBe('unknown')
    expect(result.message).toBe('raw string error')
  })

  it('handles null/undefined', () => {
    const result = classifyError(null)
    expect(result.type).toBe('unknown')
  })

  it('handles objects with message property', () => {
    const result = classifyError({ message: 'JWT expired' })
    expect(result.type).toBe('auth')
    expect(result.message).toBe('JWT expired')
  })

  it('handles objects without message property', () => {
    const result = classifyError({ code: 500 })
    expect(result.type).toBe('unknown')
  })
})

describe('handleApiError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('logs to console with context', () => {
    handleApiError(new Error('test failure'), '[test] context')
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('[test] context')
    )
  })

  it('returns classified error', () => {
    const result = handleApiError(new Error('Failed to fetch'), '[test]')
    expect(result.type).toBe('network')
    expect(result.userMessage).toBeTruthy()
    expect(result.message).toBe('Failed to fetch')
  })

  it('classifies and logs auth errors', () => {
    const result = handleApiError(new Error('JWT expired'), '[auth-test]')
    expect(result.type).toBe('auth')
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('auth')
    )
  })
})

describe('checkSupabaseError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns false when no error', () => {
    expect(checkSupabaseError(null, '[test]')).toBe(false)
    expect(checkSupabaseError(undefined, '[test]')).toBe(false)
  })

  it('returns true and handles when error present', () => {
    const error = { message: 'relation "foo" does not exist' }
    const result = checkSupabaseError(error, '[test] query')
    expect(result).toBe(true)
    expect(console.error).toHaveBeenCalled()
  })
})
