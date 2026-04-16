// lib/partner-api/rate-limit.ts — Per-key tiered rate limiting.
//
// Tiers come from partner_api_keys.rate_limit_tier; endpoint categories come
// from the route declaration (read / write / upload). The middleware composes
// them and calls the shared lib/rate-limit helper (Upstash-aware, in-memory
// fallback) with the right window + max.

import { rateLimit as sharedRateLimit } from '@/lib/rate-limit'
import { ApiError } from './errors'

export type RateTier = 'standard' | 'premium' | 'unlimited'
export type RateCategory = 'read' | 'write' | 'upload'

interface Limit { windowMs: number; max: number }

const LIMITS: Record<RateTier, Record<RateCategory, Limit | null>> = {
  standard: {
    read:   { windowMs: 60_000, max: 60 },
    write:  { windowMs: 60_000, max: 20 },
    upload: { windowMs: 60_000, max: 5 },
  },
  premium: {
    read:   { windowMs: 60_000, max: 300 },
    write:  { windowMs: 60_000, max: 100 },
    upload: { windowMs: 60_000, max: 25 },
  },
  unlimited: {
    read: null,
    write: null,
    upload: null,
  },
}

/** Check rate limit for a partner key + endpoint category. Throws on violation. */
export async function enforceRateLimit(args: {
  keyId: string
  tier: RateTier
  category: RateCategory
}): Promise<void> {
  const limit = LIMITS[args.tier][args.category]
  if (limit == null) return          // unlimited
  const bucket = `${args.keyId}:${args.category}`
  const { success } = await sharedRateLimit(bucket, {
    windowMs: limit.windowMs,
    max: limit.max,
    prefix: 'partner-api',
  })
  if (!success) {
    throw new ApiError('rate_limited', `Rate limit exceeded (${limit.max} ${args.category}s per minute on ${args.tier} tier)`, {
      tier: args.tier,
      category: args.category,
      limit: limit.max,
      window_ms: limit.windowMs,
    })
  }
}
