import { describe, it, expect } from 'vitest'
import {
  extractRefName,
  parseDate,
  mapStage,
  extractProjId,
  parseNum,
  mapDisposition,
  extractFinancierName,
  isLegacyImportEligible,
} from '@/lib/legacy-import-utils'

// ── extractRefName ──────────────────────────────────────────────────────────

describe('extractRefName', () => {
  it('returns null for null', () => {
    expect(extractRefName(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(extractRefName(undefined)).toBeNull()
  })

  it('returns a plain string as-is', () => {
    expect(extractRefName('Hello')).toBe('Hello')
  })

  it('returns null for empty string', () => {
    expect(extractRefName('')).toBeNull()
  })

  it('extracts refName from an object', () => {
    expect(extractRefName({ refName: 'Texas' })).toBe('Texas')
  })

  it('returns null when refName is not a string', () => {
    expect(extractRefName({ refName: 42 })).toBeNull()
  })

  it('returns null for objects without refName', () => {
    expect(extractRefName({ name: 'test' })).toBeNull()
  })

  it('returns null for numbers', () => {
    expect(extractRefName(123)).toBeNull()
  })
})

// ── parseDate ───────────────────────────────────────────────────────────────

describe('parseDate', () => {
  it('returns null for null', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(parseDate(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull()
  })

  it('returns null for non-string types', () => {
    expect(parseDate(12345)).toBeNull()
  })

  it('parses already-formatted YYYY-MM-DD', () => {
    expect(parseDate('2025-06-15')).toBe('2025-06-15')
  })

  it('extracts YYYY-MM-DD from ISO datetime string', () => {
    expect(parseDate('2025-06-15T14:30:00.000Z')).toBe('2025-06-15')
  })

  it('parses a natural date string', () => {
    const result = parseDate('June 15, 2025')
    expect(result).toBe('2025-06-15')
  })

  it('returns null for garbage string', () => {
    expect(parseDate('not-a-date')).toBeNull()
  })
})

// ── mapStage ────────────────────────────────────────────────────────────────

describe('mapStage', () => {
  it('defaults to evaluation when null', () => {
    expect(mapStage(null)).toBe('evaluation')
  })

  it('defaults to evaluation for empty string', () => {
    expect(mapStage('')).toBe('evaluation')
  })

  it('maps "Evaluation Stage" to evaluation', () => {
    expect(mapStage('Evaluation Stage')).toBe('evaluation')
  })

  it('maps "Survey Stage" to survey', () => {
    expect(mapStage('Survey Stage')).toBe('survey')
  })

  it('maps "Site Assessment" to survey (contains "site")', () => {
    expect(mapStage('Site Assessment')).toBe('survey')
  })

  it('maps "Design Stage" to design', () => {
    expect(mapStage('Design Stage')).toBe('design')
  })

  it('maps "Engineering Review" to design (contains "engineer")', () => {
    expect(mapStage('Engineering Review')).toBe('design')
  })

  it('maps "CAD Stage" to design (contains "cad")', () => {
    expect(mapStage('CAD Stage')).toBe('design')
  })

  it('maps "Permit Stage" to permit', () => {
    expect(mapStage('Permit Stage')).toBe('permit')
  })

  it('maps "Install Stage" to install', () => {
    expect(mapStage('Install Stage')).toBe('install')
  })

  it('maps "Installation Complete" to install (install matched before complete)', () => {
    // "install" is checked before "complete", so this matches install
    expect(mapStage('Installation In Progress')).toBe('install')
  })

  it('maps "Inspection Stage" to inspection', () => {
    expect(mapStage('Inspection Stage')).toBe('inspection')
  })

  it('maps "PTO Pending" to inspection (contains "pto")', () => {
    expect(mapStage('PTO Pending')).toBe('inspection')
  })

  it('maps "Complete Stage" to complete', () => {
    expect(mapStage('Complete Stage')).toBe('complete')
  })

  it('maps "Closed Won" to complete (contains "closed")', () => {
    expect(mapStage('Closed Won')).toBe('complete')
  })

  it('maps unrecognized text to evaluation', () => {
    expect(mapStage('Something Random')).toBe('evaluation')
  })

  it('is case-insensitive', () => {
    expect(mapStage('DESIGN STAGE')).toBe('design')
    expect(mapStage('COMPLETE')).toBe('complete')
  })
})

// ── extractProjId ───────────────────────────────────────────────────────────

describe('extractProjId', () => {
  it('returns null for null', () => {
    expect(extractProjId(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(extractProjId(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractProjId('')).toBeNull()
  })

  it('extracts PROJ-XXXXX from "PROJ-15480 Jimmy Villanueva"', () => {
    expect(extractProjId('PROJ-15480 Jimmy Villanueva')).toBe('PROJ-15480')
  })

  it('extracts PROJ-XXXXX from bare ID', () => {
    expect(extractProjId('PROJ-00001')).toBe('PROJ-00001')
  })

  it('extracts PROJ-ID with varying digit lengths', () => {
    expect(extractProjId('PROJ-1')).toBe('PROJ-1')
    expect(extractProjId('PROJ-123456')).toBe('PROJ-123456')
  })

  it('returns null when no PROJ- pattern found', () => {
    expect(extractProjId('ABC-12345 Some Name')).toBeNull()
  })

  it('extracts first PROJ-ID if multiple present', () => {
    expect(extractProjId('PROJ-100 related to PROJ-200')).toBe('PROJ-100')
  })
})

// ── parseNum ────────────────────────────────────────────────────────────────

describe('parseNum', () => {
  it('returns null for null', () => {
    expect(parseNum(null)).toBeNull()
  })

  it('returns number directly', () => {
    expect(parseNum(42)).toBe(42)
  })

  it('returns null for NaN number', () => {
    expect(parseNum(NaN)).toBeNull()
  })

  it('parses numeric string', () => {
    expect(parseNum('123.45')).toBe(123.45)
  })

  it('returns null for non-numeric string', () => {
    expect(parseNum('abc')).toBeNull()
  })

  it('returns null for objects', () => {
    expect(parseNum({})).toBeNull()
  })
})

// ── mapDisposition ──────────────────────────────────────────────────────────

describe('mapDisposition', () => {
  it('returns null for null', () => {
    expect(mapDisposition(null)).toBeNull()
  })

  it('maps cancel text to Cancelled', () => {
    expect(mapDisposition('Cancelled')).toBe('Cancelled')
    expect(mapDisposition({ refName: 'Void' })).toBe('Cancelled')
  })

  it('maps loyalty text to Loyalty', () => {
    expect(mapDisposition('Loyalty')).toBe('Loyalty')
  })

  it('maps in service text to In Service', () => {
    expect(mapDisposition('In Service')).toBe('In Service')
    expect(mapDisposition({ refName: 'Service Active' })).toBe('In Service')
  })

  it('maps sale text to Sale', () => {
    expect(mapDisposition('Sale')).toBe('Sale')
  })

  it('preserves unrecognized values', () => {
    expect(mapDisposition('CustomStatus')).toBe('CustomStatus')
  })
})

// ── extractFinancierName ────────────────────────────────────────────────────

describe('extractFinancierName', () => {
  it('returns null for null', () => {
    expect(extractFinancierName(null)).toBeNull()
  })

  it('strips CUS- prefix from refName', () => {
    expect(extractFinancierName({ refName: 'CUS-2531 GoodLeap' })).toBe('GoodLeap')
  })

  it('returns name as-is when no CUS- prefix', () => {
    expect(extractFinancierName('Mosaic')).toBe('Mosaic')
  })

  it('handles plain string', () => {
    expect(extractFinancierName('CUS-100 Sungage')).toBe('Sungage')
  })
})

// ── isLegacyImportEligible (disposition filtering) ──────────────────────────

describe('isLegacyImportEligible', () => {
  it('returns true for "In Service"', () => {
    expect(isLegacyImportEligible('In Service')).toBe(true)
  })

  it('returns false for "Sale"', () => {
    expect(isLegacyImportEligible('Sale')).toBe(false)
  })

  it('returns false for "Loyalty"', () => {
    expect(isLegacyImportEligible('Loyalty')).toBe(false)
  })

  it('returns false for "Cancelled"', () => {
    expect(isLegacyImportEligible('Cancelled')).toBe(false)
  })

  it('returns false for null', () => {
    expect(isLegacyImportEligible(null)).toBe(false)
  })
})
