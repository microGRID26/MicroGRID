/**
 * Import legacy NetSuite projects into NOVA CRM
 *
 * Reads JOB_*.json files from a directory, maps NetSuite fields to our schema,
 * skips projects that already exist in NOVA, and outputs a JSON array ready
 * for Supabase bulk insert.
 *
 * Usage:
 *   npx tsx scripts/import-legacy-projects.ts [inputDir] [--output path.json] [--dry-run]
 *
 * Default input: ~/Desktop/ns_job_export_ALL_20260226_154512/json/
 */

import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_INPUT_DIR = path.join(
  process.env.HOME || '~',
  'Desktop/ns_job_export_ALL_20260226_154512/json/'
)

function parseArgs() {
  const args = process.argv.slice(2)
  let inputDir = DEFAULT_INPUT_DIR
  let outputPath: string | null = null
  let dryRun = false

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) {
      outputPath = args[++i]
    } else if (args[i] === '--dry-run') {
      dryRun = true
    } else if (!args[i].startsWith('--')) {
      inputDir = args[i]
    }
  }

  return { inputDir, outputPath, dryRun }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract refName from an object field, or return the value if it's a string */
function refName(val: unknown): string | null {
  if (val == null) return null
  if (typeof val === 'string') return val || null
  if (typeof val === 'object' && 'refName' in (val as Record<string, unknown>)) {
    const rn = (val as Record<string, unknown>).refName
    return typeof rn === 'string' ? rn : null
  }
  return null
}

/** Parse a number from various formats, return null if invalid */
function parseNum(val: unknown): number | null {
  if (val == null) return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  if (typeof val === 'string') {
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }
  return null
}

/** Parse a date string to YYYY-MM-DD format, return null if invalid */
function parseDate(val: unknown): string | null {
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

/** Extract PROJ-XXXXX from entityId like "PROJ-15480 Jimmy Villanueva" */
function extractProjId(entityId: string | null | undefined): string | null {
  if (!entityId) return null
  const m = entityId.match(/(PROJ-\d+)/)
  return m ? m[1] : null
}

/** Extract financier name from refName like "CUS-2531 GoodLeap" */
function extractFinancierName(val: unknown): string | null {
  const rn = refName(val)
  if (!rn) return null
  // Strip "CUS-XXXX " prefix if present
  const cleaned = rn.replace(/^CUS-\d+\s+/, '')
  return cleaned || null
}

/** Map NetSuite stage text to our stage enum */
function mapStage(stageText: string | null): string {
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

/** Map NetSuite disposition to our values */
function mapDisposition(val: unknown): string | null {
  const rn = refName(val)
  if (!rn) return null
  const d = rn.toLowerCase()
  if (d.includes('cancel') || d.includes('void')) return 'Cancelled'
  if (d.includes('loyalty')) return 'Loyalty'
  if (d.includes('in service') || d.includes('service')) return 'In Service'
  if (d.includes('sale')) return 'Sale'
  return rn // preserve original if unrecognized
}

// ---------------------------------------------------------------------------
// Field mapping
// ---------------------------------------------------------------------------

interface MappedProject {
  id: string
  ns_internal_id: string | null
  name: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  lat: number | null
  lon: number | null
  systemkw: number | null
  module: string | null
  module_qty: number | null
  inverter: string | null
  inverter_qty: number | null
  battery: string | null
  battery_qty: number | null
  contract: number | null
  financier: string | null
  financing_type: string | null
  dealer: string | null
  advisor: string | null
  consultant: string | null
  pm: string | null
  sale_date: string | null
  survey_date: string | null
  install_complete_date: string | null
  pto_date: string | null
  in_service_date: string | null
  disposition: string | null
  ahj: string | null
  utility: string | null
  hoa: string | null
  permit_number: string | null
  utility_app_number: string | null
  voltage: string | null
  msp_bus_rating: string | null
  main_breaker: string | null
  stage: string
  stage_date: string | null
}

interface FundingRecord {
  project_id: string
  m2_amount: number | null
  m2_funded_date: string | null
  m3_amount: number | null
  m3_funded_date: string | null
}

function mapProject(data: Record<string, unknown>): { project: MappedProject; funding: FundingRecord | null } | null {
  // Extract PROJ-ID from entityId or externalId
  const projId =
    extractProjId(data.entityId as string) ||
    extractProjId(data.externalId as string) ||
    extractProjId(refName(data.cseg_bb_project))

  if (!projId) return null

  const nsInternalId = data.cseg_bb_project && typeof data.cseg_bb_project === 'object'
    ? ((data.cseg_bb_project as Record<string, unknown>).id as string) || null
    : null

  const stageText = refName(data.custentity_bb_project_stage_text) ||
    (typeof data.custentity_bb_project_stage_text === 'string' ? data.custentity_bb_project_stage_text : null)

  const saleDate = parseDate(data.custentityts_sale_date)

  const project: MappedProject = {
    id: projId,
    ns_internal_id: nsInternalId,
    name: (data.companyName as string) || null,
    phone: (data.custentity_bb_home_owner_phone as string) || null,
    email: (data.custentity_bb_home_owner_primary_email as string) || null,
    address: (data.custentity_bb_install_address_1_text as string) || null,
    city: (data.custentity_bb_install_city_text as string) || null,
    state: refName(data.custentity_bb_install_state),
    zip: (data.custentity_bb_install_zip_code_text as string) || null,
    lat: parseNum(data.custentity_bb_entity_latitude_text),
    lon: parseNum(data.custentity_bb_entity_longitude_text),
    systemkw: parseNum(data.custentity_bb_system_size_decimal),
    module: refName(data.custentity_bb_module_item),
    module_qty: parseNum(data.custentity_bb_module_quantity_num),
    inverter: refName(data.custentity_bb_inverter_item),
    inverter_qty: parseNum(data.custentity_bb_inverter_quantity_num),
    battery: refName(data.custentity_bb_battery),
    battery_qty: parseNum(data.custentity_bb_battery_quantity),
    contract: parseNum(data.custentity_bb_total_contract_value_amt),
    financier: extractFinancierName(data.custentity_bb_financier_customer),
    financing_type: refName(data.custentity_bb_financing_type) ||
      (typeof data.custentity_proj_financing_type === 'string' ? data.custentity_proj_financing_type : null),
    dealer: (data.custentity_ts_custom_dealer_name as string) || null,
    advisor: (data.custentity_ts_cf_ea_display_name as string) || null,
    consultant: (data.custentity_ts_energ_consult as string) || null,
    pm: refName(data.custentity_ts_cust_serv_rep) || refName(data.custentityoperations_manager) || null,
    sale_date: saleDate,
    survey_date: parseDate(data.custentityts_site_survey_date),
    install_complete_date: parseDate(data.custentityts_installation_start_date),
    pto_date: parseDate(data.custentityts_pto_date),
    in_service_date: parseDate(data.custentity_ts_in_service_date),
    disposition: mapDisposition(data.custentity_ts_disposition),
    ahj: refName(data.custentity_bb_auth_having_jurisdiction),
    utility: refName(data.custentity_bb_utility_company),
    hoa: refName(data.custentity_bb_homeowner_association),
    permit_number: (data.custentity_permit_number as string) || null,
    utility_app_number: (data.custentity_utility_application_number as string) || null,
    voltage: typeof data.custentityvoltage === 'string'
      ? data.custentityvoltage
      : refName(data.custentityvoltage),
    msp_bus_rating: refName(data.custentitymsp_bus_rating),
    main_breaker: refName(data.custentitymain_breaker_size) || refName(data.custentitynew_main_breaker),
    stage: mapStage(stageText),
    stage_date: saleDate, // use sale_date as initial stage_date
  }

  // Build funding record if any m2/m3 data exists
  const m2Amount = parseNum(data.custentitym2_funding)
  const m2Date = parseDate(data.custentitym2_funded_date)
  const m3Amount = parseNum(data.custentitym3_funding)
  const m3Date = parseDate(data.custentitym3_funded_date)

  const funding: FundingRecord | null =
    (m2Amount != null || m2Date || m3Amount != null || m3Date)
      ? { project_id: projId, m2_amount: m2Amount, m2_funded_date: m2Date, m3_amount: m3Amount, m3_funded_date: m3Date }
      : null

  return { project, funding }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const { inputDir, outputPath, dryRun } = parseArgs()

  console.log(`\n=== NOVA Legacy Project Import ===`)
  console.log(`Input directory: ${inputDir}`)
  console.log(`Output: ${outputPath || 'stdout'}`)
  console.log(`Dry run: ${dryRun}\n`)

  // Validate input directory
  if (!fs.existsSync(inputDir)) {
    console.error(`ERROR: Input directory does not exist: ${inputDir}`)
    process.exit(1)
  }

  // Load existing project IDs from Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars')
    console.error('Set them in .env.local or export them before running.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  console.log('Loading existing project IDs from NOVA...')
  const existingIds = new Set<string>()

  if (!dryRun) {
    const { data: existing, error } = await supabase
      .from('projects')
      .select('id')
      .limit(50000)

    if (error) {
      console.error('ERROR querying existing projects:', error.message)
      process.exit(1)
    }

    for (const row of existing || []) {
      existingIds.add(row.id)
    }
    console.log(`Found ${existingIds.size} existing projects in NOVA.\n`)
  } else {
    console.log('Dry run - skipping Supabase query.\n')
  }

  // Enumerate JOB_*.json files
  const allFiles = fs.readdirSync(inputDir).filter(f => f.startsWith('JOB_') && f.endsWith('.json'))
  console.log(`Found ${allFiles.length} JOB_*.json files.\n`)

  // Process files
  const projects: MappedProject[] = []
  const fundingRecords: FundingRecord[] = []
  let skipped = 0
  let errors = 0
  let noProjId = 0

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i]
    const filePath = path.join(inputDir, file)

    // Progress logging every 1000 files
    if ((i + 1) % 1000 === 0) {
      console.log(`  Processing file ${i + 1}/${allFiles.length}...`)
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw) as Record<string, unknown>

      const result = mapProject(data)

      if (!result) {
        noProjId++
        continue
      }

      // Skip if already in NOVA
      if (existingIds.has(result.project.id)) {
        skipped++
        continue
      }

      projects.push(result.project)
      if (result.funding) {
        fundingRecords.push(result.funding)
      }
    } catch (err) {
      errors++
      if (errors <= 10) {
        console.error(`  ERROR processing ${file}: ${(err as Error).message}`)
      }
    }
  }

  // Output
  const output = {
    projects,
    funding: fundingRecords,
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))
    console.log(`\nOutput written to: ${outputPath}`)
  } else {
    // Write to stdout
    process.stdout.write(JSON.stringify(output, null, 2))
  }

  // Stats
  console.error(`\n=== Import Stats ===`)
  console.error(`Total JOB files:        ${allFiles.length}`)
  console.error(`No PROJ-ID found:       ${noProjId}`)
  console.error(`Skipped (in NOVA):      ${skipped}`)
  console.error(`Ready to import:        ${projects.length}`)
  console.error(`With funding data:      ${fundingRecords.length}`)
  console.error(`Errors:                 ${errors}`)

  // Sample output
  if (projects.length > 0) {
    console.error(`\nSample project:`)
    console.error(JSON.stringify(projects[0], null, 2))
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
