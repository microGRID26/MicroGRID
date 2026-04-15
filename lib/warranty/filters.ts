// lib/warranty/filters.ts — pure filter + aggregation helpers for /warranty/claims.
// Extracted from app/warranty/claims/page.tsx so the logic can be unit-tested
// without mounting the whole client component.

export interface ClaimForFilter {
  status: string
  claim_amount: number | null
  original_epc: { id: string } | null
}

/**
 * Narrow a list of claims to those whose original EPC matches `epcId`.
 * When `epcId === 'all'` (or empty), returns the input unchanged.
 */
export function filterClaimsByEpc<T extends ClaimForFilter>(claims: T[], epcId: string): T[] {
  if (!epcId || epcId === 'all') return claims
  return claims.filter((c) => c.original_epc?.id === epcId)
}

/**
 * Count claims by status. Returns a map where every status that appears
 * in `claims` has a positive count; missing statuses are absent (caller
 * uses `?? 0` to render).
 */
export function countClaimsByStatus<T extends ClaimForFilter>(claims: T[]): Record<string, number> {
  return claims.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1
    return acc
  }, {})
}

/**
 * Sum the claim_amount of every claim currently in `invoiced` status.
 * Represents the pool of funding deductions queued to net on the next
 * EPC → EDGE payment. Claims with a null amount are skipped.
 */
export function sumOpenDeductions<T extends ClaimForFilter>(claims: T[]): number {
  return claims
    .filter((c) => c.status === 'invoiced' && c.claim_amount)
    .reduce((sum, c) => sum + (c.claim_amount ?? 0), 0)
}
