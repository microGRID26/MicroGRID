// lib/partner-api/leads.ts — Pure validation + shape helpers for lead endpoints.

import { ApiError } from './errors'

export interface LeadCreateInput {
  name: string
  address: string
  city: string | null
  zip: string | null
  phone: string | null
  email: string | null
  systemkw: number | null
  sale_date: string | null
  dealer: string | null
}

export function validateLeadCreate(raw: unknown): LeadCreateInput {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('invalid_request', 'Body must be a JSON object')
  }
  const b = raw as Record<string, unknown>
  if (typeof b.name !== 'string' || !b.name.trim()) {
    throw new ApiError('invalid_request', 'name is required (customer full name)')
  }
  if (typeof b.address !== 'string' || !b.address.trim()) {
    throw new ApiError('invalid_request', 'address is required')
  }
  if (!b.phone && !b.email) {
    throw new ApiError('invalid_request', 'at least one of phone or email is required')
  }
  if (b.sale_date !== undefined && b.sale_date !== null) {
    if (typeof b.sale_date !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(b.sale_date)) {
      throw new ApiError('invalid_request', 'sale_date must be ISO date (YYYY-MM-DD)')
    }
  }
  if (b.systemkw !== undefined && b.systemkw !== null) {
    if (typeof b.systemkw !== 'number' || !Number.isFinite(b.systemkw) || b.systemkw <= 0) {
      throw new ApiError('invalid_request', 'systemkw must be a positive finite number')
    }
  }
  const opt = (v: unknown): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t.length > 0 ? t : null
  }
  return {
    name: (b.name as string).trim(),
    address: (b.address as string).trim(),
    city: opt(b.city),
    zip: opt(b.zip),
    phone: opt(b.phone),
    email: opt(b.email),
    systemkw: typeof b.systemkw === 'number' ? b.systemkw : null,
    sale_date: typeof b.sale_date === 'string' ? b.sale_date : null,
    dealer: opt(b.dealer),
  }
}

export const LEAD_PATCHABLE_FIELDS = new Set<string>([
  'name', 'address', 'city', 'zip', 'phone', 'email', 'systemkw', 'dealer',
])

export interface LeadPatchResult {
  updates: Record<string, unknown>
  ignored: string[]
}

export function validateLeadPatch(raw: unknown): LeadPatchResult {
  if (!raw || typeof raw !== 'object') {
    throw new ApiError('invalid_request', 'Body must be a JSON object')
  }
  const b = raw as Record<string, unknown>
  const updates: Record<string, unknown> = {}
  const ignored: string[] = []
  for (const [key, value] of Object.entries(b)) {
    if (!LEAD_PATCHABLE_FIELDS.has(key)) {
      ignored.push(key)
      continue
    }
    if (key === 'systemkw') {
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value <= 0)) {
        throw new ApiError('invalid_request', 'systemkw must be a positive finite number or null')
      }
      updates[key] = value
    } else if (value === null) {
      updates[key] = null
    } else if (typeof value !== 'string') {
      throw new ApiError('invalid_request', `${key} must be a string or null`)
    } else {
      // R1 fix (Medium): coerce empty/whitespace strings to null so PATCH
      // semantics match POST (validateLeadCreate). A partner clearing a
      // field shouldn't leave the column storing "".
      const trimmed = value.trim()
      updates[key] = trimmed.length > 0 ? trimmed : null
    }
  }
  if (Object.keys(updates).length === 0) {
    throw new ApiError(
      'invalid_request',
      `No patchable fields provided. Allowed: ${[...LEAD_PATCHABLE_FIELDS].join(', ')}`,
    )
  }
  return { updates, ignored }
}

import { randomBytes } from 'crypto'

/** Generate a new lead id of the form `LEAD-<12 hex chars>`.
 *
 *  R1 fix (Medium): 48 bits of entropy. Birthday-paradox collision probability
 *  at 1M leads is ~1.8e-3, and at 100M is ~1.8% — comfortably headroom for
 *  MicroGRID's scale. If the underlying PK UNIQUE catches a collision the
 *  caller retries with a fresh id. */
export function generateLeadId(): string {
  return `LEAD-${randomBytes(6).toString('hex')}`
}

export const VALID_LEAD_DOC_TYPES = new Set([
  'signed_contract',
  'utility_bill',
  'id',
  'site_photo',
  'other',
])
