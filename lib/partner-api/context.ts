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
 * Generate a URL-safe request ID of the form `req_<26-char-base36>`.
 * Not a UUID — request IDs only need uniqueness within the log horizon,
 * and base36 is cheaper to generate + read in logs.
 */
export function newRequestId(): string {
  const ts = Date.now().toString(36)
  let rand = ''
  for (let i = 0; i < 16; i++) {
    rand += Math.floor(Math.random() * 36).toString(36)
  }
  return `req_${ts}${rand}`
}
