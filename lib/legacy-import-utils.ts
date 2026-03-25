/**
 * Pure mapping/parsing functions for the legacy NetSuite → NOVA import.
 *
 * Extracted from scripts/import-legacy-projects.ts so they can be unit-tested
 * independently of the file-system / Supabase side-effects in the script.
 */

/** Extract refName from an object field, or return the value if it's a string */
export function extractRefName(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'string') return val || null
  if (typeof val === 'object' && 'refName' in (val as Record<string, unknown>)) {
    const rn = (val as Record<string, unknown>).refName
    return typeof rn === 'string' ? rn : null
  }
  return null
}

/** Parse a date string to YYYY-MM-DD format, return null if invalid */
export function parseDate(val: unknown): string | null {
  if (val == null) return null
  if (typeof val !== 'string' || !val) return null
  // Already YYYY-MM-DD
  const ymd = val.match(/^(\d{4}-\d{2}-\d{2})/)
  if (ymd) return ymd[1]
  // ISO datetime
  try {
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

/** Map NetSuite stage text to our stage enum */
export function mapStage(stageText: string | null): string {
  if (!stageText) return 'evaluation'
  const s = stageText.toLowerCase()

  if (s.includes('complete') || s.includes('closed')) return 'complete'
  if (s.includes('inspection') || s.includes('pto')) return 'inspection'
  if (s.includes('install')) return 'install'
  if (s.includes('permit')) return 'permit'
  if (s.includes('design') || s.includes('engineer') || s.includes('cad')) return 'design'
  if (s.includes('survey') || s.includes('site')) return 'survey'
  // Default
  return 'evaluation'
}

/** Extract PROJ-XXXXX from entityId strings like "PROJ-15480 Jimmy Villanueva" */
export function extractProjId(entityId: string | null | undefined): string | null {
  if (!entityId) return null
  const m = entityId.match(/(PROJ-\d+)/)
  return m ? m[1] : null
}

/** Parse a number from various formats, return null if invalid */
export function parseNum(val: unknown): number | null {
  if (val == null) return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val === 'string') {
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }
  return null
}

/** Map NetSuite disposition to our values */
export function mapDisposition(val: unknown): string | null {
  const rn = extractRefName(val)
  if (!rn) return null
  const d = rn.toLowerCase()
  if (d.includes('cancel') || d.includes('void')) return 'Cancelled'
  if (d.includes('loyalty')) return 'Loyalty'
  if (d.includes('in service') || d.includes('service')) return 'In Service'
  if (d.includes('sale')) return 'Sale'
  return rn // preserve original if unrecognized
}

/** Extract financier name from refName like "CUS-2531 GoodLeap" */
export function extractFinancierName(val: unknown): string | null {
  const rn = extractRefName(val)
  if (!rn) return null
  const cleaned = rn.replace(/^CUS-\d+\s+/, '')
  return cleaned || null
}

/** Check if a project should be included in the legacy import (In Service only) */
export function isLegacyImportEligible(disposition: string | null): boolean {
  return disposition === 'In Service'
}
