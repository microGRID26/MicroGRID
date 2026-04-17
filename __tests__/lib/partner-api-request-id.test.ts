import { describe, it, expect } from 'vitest'
import { newRequestId } from '@/lib/partner-api/context'

// R1 audit 2026-04-17: Math.random() was replaced with crypto.randomBytes so
// partner log request IDs can't be guessed across partners. These tests don't
// prove CSPRNG quality but do catch a regression back to a weak source.

describe('newRequestId', () => {
  it('has the req_ prefix', () => {
    expect(newRequestId()).toMatch(/^req_/)
  })

  it('has 16 hex chars after the timestamp segment', () => {
    const id = newRequestId()
    const tail = id.slice(-16)
    expect(tail).toMatch(/^[0-9a-f]{16}$/)
  })

  it('does not collide across 10k calls (entropy check)', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 10_000; i++) seen.add(newRequestId())
    expect(seen.size).toBe(10_000)
  })

  it('random tail has meaningful spread (not Math.random low-entropy)', () => {
    // A base36 Math.random() tail only populates [0-9a-z]. crypto.randomBytes
    // hex tails only populate [0-9a-f]. If this regresses to base36, the test
    // catches it by finding [g-z] chars in the tail.
    const tails = Array.from({ length: 200 }, () => newRequestId().slice(-16))
    const joined = tails.join('')
    expect(joined).not.toMatch(/[g-z]/)
  })
})
