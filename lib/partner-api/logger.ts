// lib/partner-api/logger.ts — Fire-and-forget request log writer.
//
// Logs every partner API request to partner_api_logs (monthly-partitioned).
// Never throws or blocks the handler — any error is swallowed.

import type { PartnerContext } from './context'
import { partnerApiAdmin } from './supabase-admin'

// R1 fix (Medium): partners may (incorrectly) put secrets in query strings.
// Redact keys that look like credentials before we persist them.
const SENSITIVE_QUERY_KEYS = new Set([
  'token', 'tokens',
  'key', 'keys', 'api_key', 'apikey',
  'secret', 'password', 'passwd',
  'authorization', 'auth',
  'access_token', 'refresh_token', 'id_token',
  'signature', 'x_mg_signature',
])

export function redactQueryParams(raw: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!raw) return null
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    out[k] = SENSITIVE_QUERY_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v
  }
  return out
}

export interface LogArgs {
  ctx: PartnerContext | null           // null for failed-auth requests — we log org_id=null
  method: string
  path: string
  queryParams: Record<string, unknown> | null
  statusCode: number
  durationMs: number
  errorMessage: string | null
  apiKeyId: string | null              // populated even when ctx is null if we got past lookup
  actorExternalId: string | null
  ip: string | null
  userAgent: string | null
}

export function logPartnerRequest(args: LogArgs): void {
  // Intentionally not awaited — logging must not delay the response.
  void writeLog(args).catch((err) => {
    // Swallow. Log to console for dev visibility; production-critical logs
    // should be on Sentry breadcrumbs at the middleware layer anyway.
    console.error('[partner-api logger] log write failed:', err)
  })
}

async function writeLog(args: LogArgs): Promise<void> {
  const sb = partnerApiAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from('partner_api_logs').insert({
    org_id: args.ctx?.orgId ?? null,
    api_key_id: args.apiKeyId,
    actor_external_id: args.actorExternalId,
    request_id: args.ctx?.requestId ?? 'req_preauth',
    method: args.method,
    path: args.path,
    query_params: redactQueryParams(args.queryParams),
    status_code: args.statusCode,
    duration_ms: args.durationMs,
    error_message: args.errorMessage,
  })
}

/** Update partner_api_keys.last_used_* columns. Fire-and-forget. */
export function touchKeyLastUsed(keyId: string, ip: string | null, userAgent: string | null): void {
  void (async () => {
    try {
      const sb = partnerApiAdmin()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (sb as any).from('partner_api_keys')
        .update({ last_used_at: new Date().toISOString(), last_used_ip: ip, last_used_user_agent: userAgent })
        .eq('id', keyId)
    } catch { /* swallow */ }
  })()
}
