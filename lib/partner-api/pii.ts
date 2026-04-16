// lib/partner-api/pii.ts — Customer-PII redaction.
//
// Partners whose key has customer_pii_scope=true see full customer contact
// info. All other keys get email + phone redacted before we serialize. Street
// address stays (required for stamp drawings); name stays (required for
// labeling + deliverables).

const PII_KEYS = new Set([
  'email', 'phone', 'mobile', 'cell',
  'phone_home', 'phone_mobile', 'phone_work',
  'email_primary', 'email_secondary',
])

/** Shallow-redact customer PII on a row. Does not recurse; we only store
 *  these fields at the top level of the projects + customer_accounts rows. */
export function redactCustomerFields<T extends Record<string, unknown>>(
  row: T,
  hasPiiScope: boolean,
): T {
  if (hasPiiScope) return row
  const out: Record<string, unknown> = { ...row }
  for (const key of Object.keys(out)) {
    if (PII_KEYS.has(key.toLowerCase())) {
      out[key] = null
    }
  }
  return out as T
}
