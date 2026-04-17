// lib/partner-api/context.ts — Request-scoped context for partner API handlers.
//
// Every request that clears withPartnerAuth carries a PartnerContext that
// handlers can read to know which org made the call, which key it came from,
// which scopes are granted, and which rep (actor) initiated it when relevant.

export interface PartnerContext {
  orgId: string
  orgType: string                       // 'engineering' | 'sales_d2d' | etc.
  orgSlug: string
  keyId: string
  keyName: string
  scopes: readonly string[]
  rateLimitTier: 'standard' | 'premium' | 'unlimited'
  customerPiiScope: boolean
  actorExternalId: string | null        // from X-MG-Actor header (Solicit rep, etc.)
  requestId: string
  startedAtMs: number
}

/**
 * Generate a URL-safe request ID of the form `req_<ts><16 hex>`.
 * Uses crypto.randomBytes (CSPRNG) rather than Math.random so IDs are not
 * predictable from one another — matters because request IDs land in
 * `partner_api_logs` and external partners compare them in support tickets.
 * A predictable RNG would let a log-tampering attacker guess other partners'
 * request IDs.
 */
import { randomBytes } from 'crypto'
export function newRequestId(): string {
  const ts = Date.now().toString(36)
  const rand = randomBytes(8).toString('hex')
  return `req_${ts}${rand}`
}
