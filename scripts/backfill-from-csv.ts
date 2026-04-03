/**
 * Backfill legacy_projects from NetSuite CSV exports.
 * Uses Projects_equipment_home_improvement CSV for module/inverter/battery data.
 *
 * Usage: npx tsx scripts/backfill-from-csv.ts [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from 'csv-parse/sync'

// Load env
const envFile = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
const envVars: Record<string, string> = {}
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key && val.length) envVars[key.trim()] = val.join('=').trim()
})

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY
const dryRun = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars'); process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const CSV_DIR = join(process.env.HOME ?? '', 'Desktop/NetSuite/Project Records')

async function main() {
  console.log(`=== CSV Backfill (${dryRun ? 'DRY RUN' : 'LIVE'}) ===`)

  // Load equipment CSV
  const equipCsv = readFileSync(join(CSV_DIR, 'Projects_equipment_home_improvement_1.28.26.csv'), 'utf-8')
  const equipRows = parse(equipCsv, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[]
  console.log(`Equipment CSV: ${equipRows.length} rows`)

  // Load project info CSV for additional fields
  const infoCsv = readFileSync(join(CSV_DIR, 'Projects_project_information_1.28.26.csv'), 'utf-8')
  const infoRows = parse(infoCsv, { columns: true, skip_empty_lines: true, bom: true }) as Record<string, string>[]
  console.log(`Project Info CSV: ${infoRows.length} rows`)

  // Build lookup maps by project ID
  const equipMap = new Map<string, Record<string, string>>()
  for (const row of equipRows) {
    const id = row['ID']?.trim()
    if (id) equipMap.set(id, row)
  }

  const infoMap = new Map<string, Record<string, string>>()
  for (const row of infoRows) {
    const id = row['ID']?.trim()
    if (id) infoMap.set(id, row)
  }

  // Load legacy project IDs with null fields
  const { data: nullModules } = await supabase
    .from('legacy_projects')
    .select('id')
    .is('module', null)
    .limit(20000)

  const { data: nullVoltage } = await supabase
    .from('legacy_projects')
    .select('id')
    .is('voltage', null)
    .limit(20000)

  const { data: nullMsp } = await supabase
    .from('legacy_projects')
    .select('id')
    .is('msp_bus_rating', null)
    .limit(20000)

  const nullModuleIds = new Set((nullModules ?? []).map((r: { id: string }) => r.id))
  const nullVoltageIds = new Set((nullVoltage ?? []).map((r: { id: string }) => r.id))
  const nullMspIds = new Set((nullMsp ?? []).map((r: { id: string }) => r.id))

  console.log(`DB null counts — module: ${nullModuleIds.size}, voltage: ${nullVoltageIds.size}, msp: ${nullMspIds.size}`)

  // Find matches
  let updated = 0
  let fieldsUpdated = 0
  let noData = 0

  const allNullIds = new Set([...nullModuleIds, ...nullVoltageIds, ...nullMspIds])
  console.log(`Total projects with at least one null field: ${allNullIds.size}`)

  for (const projectId of allNullIds) {
    const equip = equipMap.get(projectId)
    const info = infoMap.get(projectId)
    const updates: Record<string, string | number> = {}

    if (nullModuleIds.has(projectId) && equip) {
      const mod = equip['Module']?.trim()
      if (mod) updates.module = mod
      const modQty = parseInt(equip['Module Quantity']?.trim())
      if (!isNaN(modQty) && modQty > 0) updates.module_qty = modQty
    }

    if (nullModuleIds.has(projectId) && equip) {
      const inv = equip['Inverter Item']?.trim()
      if (inv) updates.inverter = inv
      const invQty = parseInt(equip['Inverter Quantity']?.trim())
      if (!isNaN(invQty) && invQty > 0) updates.inverter_qty = invQty
      const bat = equip['Battery']?.trim()
      if (bat) updates.battery = bat
      const batQty = parseInt(equip['Battery Quantity']?.trim())
      if (!isNaN(batQty) && batQty > 0) updates.battery_qty = batQty
    }

    // Check info CSV for voltage, msp, etc
    if (info) {
      // Column names may vary — check what's available
      for (const [csvCol, dbCol] of [
        ['Voltage', 'voltage'],
        ['MSP Bus Rating', 'msp_bus_rating'],
        ['System Size (kW)', 'systemkw'],
      ]) {
        const val = info[csvCol]?.trim()
        if (val && ((dbCol === 'voltage' && nullVoltageIds.has(projectId)) ||
                    (dbCol === 'msp_bus_rating' && nullMspIds.has(projectId)) ||
                    (dbCol === 'systemkw' && nullModuleIds.has(projectId)))) {
          if (dbCol === 'systemkw') {
            const num = parseFloat(val)
            if (!isNaN(num) && num > 0) updates[dbCol] = num
          } else {
            updates[dbCol] = val
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      noData++
      continue
    }

    if (dryRun) {
      if (updated < 10) console.log(`  Would update ${projectId}: ${Object.keys(updates).join(', ')}`)
      updated++
      fieldsUpdated += Object.keys(updates).length
      continue
    }

    const { error } = await supabase
      .from('legacy_projects')
      .update(updates)
      .eq('id', projectId)

    if (error) {
      console.error(`  Error ${projectId}:`, error.message)
    } else {
      updated++
      fieldsUpdated += Object.keys(updates).length
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Updated: ${updated}`)
  console.log(`Fields filled: ${fieldsUpdated}`)
  console.log(`No CSV data: ${noData}`)
}

main().catch(err => { console.error(err); process.exit(1) })
