/**
 * Backfill missing fields on legacy_projects from NetSuite JSON exports.
 *
 * Usage:
 *   npx tsx scripts/backfill-legacy-fields.ts [--dry-run]
 *
 * Reads JOB_*.json files from ~/Desktop/ns_job_export_ALL_20260226_154512/json/
 * and updates legacy_projects where fields are null.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const JSON_DIR = join(process.env.HOME ?? '', 'Desktop/ns_job_export_ALL_20260226_154512/json')

// Load env from .env.local
const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const envVars: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) envVars[key.trim()] = val.join('=').trim()
})

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Field Extraction from NetSuite JSON ─────────────────────────────────────

function extractRef(obj: unknown): string | null {
  if (!obj) return null
  if (typeof obj === 'string') return obj
  if (typeof obj === 'object' && 'refName' in (obj as Record<string, unknown>)) {
    return (obj as { refName: string }).refName
  }
  return null
}

function extractProjectId(job: Record<string, unknown>): string | null {
  const ref = extractRef(job.cseg_bb_project)
  if (ref) {
    const match = ref.match(/PROJ-\d+/)
    return match ? match[0] : null
  }
  return null
}

function extractFields(job: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {}

  // Module
  const module = extractRef(job.custentity_bb_module_item)
  if (module) fields.module = module

  // Module qty
  const moduleQty = job.custentity_bb_module_quantity_num
  if (moduleQty && typeof moduleQty === 'number' && moduleQty > 0) fields.module_qty = moduleQty

  // Inverter
  const inverter = extractRef(job.custentity_bb_inverter_item)
  if (inverter) fields.inverter = inverter

  // Inverter qty
  const inverterQty = job.custentity_bb_inverter_quantity_num
  if (inverterQty && typeof inverterQty === 'number' && inverterQty > 0) fields.inverter_qty = inverterQty

  // Battery
  const battery = extractRef(job.custentity_bb_battery_item)
  if (battery) fields.battery = battery

  // Battery qty
  const batteryQty = job.custentity_bb_battery_quantity
  if (batteryQty && typeof batteryQty === 'number' && batteryQty > 0) fields.battery_qty = batteryQty

  // System size
  const systemkw = job.custentity_bb_system_size_decimal
  if (systemkw && typeof systemkw === 'number' && systemkw > 0) fields.systemkw = systemkw

  // Contract value
  const contract = job.custentity_bb_total_contract_value_amt
  if (contract && typeof contract === 'number' && contract > 0) fields.contract = contract

  // Financier
  const financier = extractRef(job.custentity_bb_financier_customer)
  if (financier) {
    // Strip "CUS-XXXX " prefix
    fields.financier = financier.replace(/^CUS-\d+\s*/, '')
  }

  // Utility
  const utility = extractRef(job.custentity_bb_utility_company) ?? extractRef(job.custentity_ts_cf_utility_display_name)
  if (utility) fields.utility = utility

  // AHJ
  const ahj = extractRef(job.custentity_bb_auth_having_jurisdiction)
  if (ahj) fields.ahj = ahj

  // Voltage
  const voltage = job.custentityvoltage as string | undefined
  if (voltage && typeof voltage === 'string') fields.voltage = voltage

  // MSP bus rating
  const msp = job.custentitymsp_bus_rating as string | undefined
  if (msp && typeof msp === 'string') fields.msp_bus_rating = msp

  // Utility app number
  const utilApp = job.custentity_utility_application_number as string | undefined
  if (utilApp && typeof utilApp === 'string') fields.utility_app_number = utilApp

  // Permit number
  const permit = job.custentity_permit_number as string | undefined ?? job.custentity_bb_permit_number as string | undefined
  if (permit && typeof permit === 'string') fields.permit_number = permit

  // PM
  const pm = extractRef(job.custentity_bb_project_manager_employee)
  if (pm) fields.pm = pm

  // Consultant
  const consultant = extractRef(job.custentity_ts_ec)
  if (consultant) fields.consultant = consultant

  // Advisor
  const advisor = extractRef(job.custentity_ts_ea)
  if (advisor) fields.advisor = advisor

  // Dealer
  const dealer = extractRef(job.custentity_bb_originator_vendor)
  if (dealer) fields.dealer = dealer

  return fields
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`=== Legacy Project Field Backfill ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`JSON dir: ${JSON_DIR}`)

  // Read all JSON files
  const files = readdirSync(JSON_DIR).filter(f => f.startsWith('JOB_') && f.endsWith('.json'))
  console.log(`Found ${files.length} NetSuite JSON files`)

  // Load legacy project IDs to know which exist
  const { data: legacyIds } = await supabase
    .from('legacy_projects')
    .select('id')
    .limit(20000)

  const existingIds = new Set((legacyIds ?? []).map((r: { id: string }) => r.id))
  console.log(`Found ${existingIds.size} legacy projects in DB`)

  let matched = 0
  let updated = 0
  let fieldsUpdated = 0
  let skipped = 0
  let errors = 0

  for (let i = 0; i < files.length; i++) {
    if (i > 0 && i % 1000 === 0) {
      console.log(`  Progress: ${i}/${files.length} files (${matched} matched, ${updated} updated, ${fieldsUpdated} fields)`)
    }

    try {
      const raw = readFileSync(join(JSON_DIR, files[i]), 'utf-8')
      const job = JSON.parse(raw) as Record<string, unknown>

      const projectId = extractProjectId(job)
      if (!projectId || !existingIds.has(projectId)) {
        skipped++
        continue
      }

      matched++
      const fields = extractFields(job)
      if (Object.keys(fields).length === 0) continue

      if (dryRun) {
        if (Object.keys(fields).length > 3) {
          console.log(`  Would update ${projectId}: ${Object.keys(fields).join(', ')}`)
        }
        fieldsUpdated += Object.keys(fields).length
        updated++
        continue
      }

      // Only update null fields — build a conditional update
      // Supabase doesn't support "SET x = COALESCE(x, newval)" directly,
      // so we fetch current values first, then only update nulls
      const { data: current } = await supabase
        .from('legacy_projects')
        .select(Object.keys(fields).join(','))
        .eq('id', projectId)
        .single()

      if (!current) continue

      const updates: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(fields)) {
        if ((current as Record<string, unknown>)[key] == null) {
          updates[key] = val
        }
      }

      if (Object.keys(updates).length === 0) continue

      const { error } = await supabase
        .from('legacy_projects')
        .update(updates)
        .eq('id', projectId)

      if (error) {
        errors++
        if (errors <= 5) console.error(`  Error updating ${projectId}:`, error.message)
      } else {
        updated++
        fieldsUpdated += Object.keys(updates).length
      }
    } catch (err) {
      errors++
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Files scanned:  ${files.length}`)
  console.log(`Matched to DB:  ${matched}`)
  console.log(`Updated:        ${updated}`)
  console.log(`Fields filled:  ${fieldsUpdated}`)
  console.log(`Skipped:        ${skipped}`)
  console.log(`Errors:         ${errors}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
