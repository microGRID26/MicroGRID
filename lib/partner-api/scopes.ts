// lib/partner-api/scopes.ts — Server-side scope enforcement.
//
// The canonical list of scopes lives in ./scope-constants.ts so client
// components can import the same values without pulling in server-only code.
// This file adds the enforcement helpers that throw ApiError.

import { ApiError } from './errors'
import { SCOPES, SCOPE_PRESETS, type Scope } from './scope-constants'

export { SCOPES, SCOPE_PRESETS }
export type { Scope }

/** Sanity check: is `s` one of the declared scopes? */
export function isValidScope(s: string): s is Scope {
  return (SCOPES as readonly string[]).includes(s)
}

/** Returns true iff the granted list includes the required scope. */
export function hasScope(granted: readonly string[], required: Scope): boolean {
  return granted.includes(required)
}

/** Throw ApiError(forbidden) if any required scope is missing. */
export function requireScopes(granted: readonly string[], required: readonly Scope[]): void {
  const missing = required.filter((r) => !hasScope(granted, r))
  if (missing.length > 0) {
    throw new ApiError('forbidden', `Missing required scope(s): ${missing.join(', ')}`, {
      required,
      missing,
    })
  }
}

