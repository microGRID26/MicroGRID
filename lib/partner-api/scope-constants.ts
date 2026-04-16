// lib/partner-api/scope-constants.ts — Client-safe scope constants.
//
// Exports the SCOPES array + SCOPE_PRESETS map with NO server-only imports,
// so the admin UI (client component) can import the same canonical list as
// the server middleware. Single source of truth prevents drift.

export const SCOPES = [
  'engineering:assignments:read',
  'engineering:assignments:write',
  'projects:read',
  'projects:photos:read',
  'projects:planset:read',
  'leads:create',
  'leads:read',
  'leads:write',
  'webhooks:manage',
  'admin:logs:read',
] as const

export type Scope = typeof SCOPES[number]

export const SCOPE_PRESETS: Record<string, readonly Scope[]> = {
  'Engineering partner (Rush)': [
    'engineering:assignments:read',
    'engineering:assignments:write',
    'projects:read',
    'projects:photos:read',
    'projects:planset:read',
    'webhooks:manage',
    'admin:logs:read',
  ],
  'D2D sales (Solicit)': [
    'leads:create',
    'leads:read',
    'leads:write',
    'webhooks:manage',
    'admin:logs:read',
  ],
  'Read-only observer': [
    'projects:read',
    'admin:logs:read',
  ],
}
