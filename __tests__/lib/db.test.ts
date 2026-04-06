import { describe, it, expect } from 'vitest'
import { db, createClient } from '@/lib/db'

describe('db', () => {
  it('returns a supabase client', () => {
    const client = db()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('returns untyped client that accepts any table name', () => {
    const client = db()
    // Should not throw for any table name — that's the point of the untyped wrapper
    const query = client.from('nonexistent_table')
    expect(query).toBeDefined()
    expect(typeof query.select).toBe('function')
  })

  it('exports createClient for typed reads', () => {
    expect(typeof createClient).toBe('function')
    const client = createClient()
    expect(client).toBeDefined()
    expect(typeof client.from).toBe('function')
  })

  it('db and createClient return the same underlying client type', () => {
    const untyped = db()
    const typed = createClient()
    // Both should have the same shape
    expect(typeof untyped.from).toBe(typeof typed.from)
    expect(typeof untyped.rpc).toBe(typeof typed.rpc)
  })
})
