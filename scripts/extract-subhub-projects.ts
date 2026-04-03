/**
 * Extract all projects from SubHub via their Public API v2.
 *
 * Usage:
 *   SUBHUB_API_KEY=your_key npx tsx scripts/extract-subhub-projects.ts
 *
 * Options:
 *   --dry-run     Print stats without writing to Supabase
 *   --limit N     Stop after N pages (for testing)
 *   --page-size N Records per page (default 50, max unknown)
 *
 * Requires: SUBHUB_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { createClient } from '@supabase/supabase-js'

const API_BASE = 'https://api.virtualsaleportal.com'
const API_KEY = process.env.SUBHUB_API_KEY

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY

// ── CLI Args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const limitIdx = args.indexOf('--limit')
const pageLimit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity
const pageSizeIdx = args.indexOf('--page-size')
const pageSize = pageSizeIdx >= 0 ? parseInt(args[pageSizeIdx + 1]) : 50

// ── Validation ──────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error('Error: SUBHUB_API_KEY environment variable required')
  console.error('Usage: SUBHUB_API_KEY=your_key npx tsx scripts/extract-subhub-projects.ts')
  process.exit(1)
}

if (!dryRun && (!SUPABASE_URL || !SUPABASE_KEY)) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY required (or use --dry-run)')
  process.exit(1)
}

const supabase = (!dryRun && SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null

// ── Types ───────────────────────────────────────────────────────────────────

interface SubHubProject {
  subhub_id: number
  subhub_uuid: string
  external_id: string | null
  name: string
  first_name: string
  last_name: string
  email: string
  phone: string
  street: string
  city: string
  state: string
  postal_code: string
  system_size_kw: number
  contract_amount: number
  module_name: string | null
  inverter_name: string | null
  battery_name: string | null
  finance_type: string | null
  finance_partner: string | null
  stages: StageField[]
  documents: DocRef[]
  proposal_url: string | null
  contract_signed_url: string | null
  contract_signed_date: string | null
  [key: string]: unknown
}

interface StageField {
  label: string
  field_key: string
  type: string
  value: unknown
  options?: { label: string; value: string }[]
}

interface DocRef {
  url: string
  label: string
}

interface ApiResponse {
  current_page: number
  last_page: number
  data: SubHubProject[]
  total: number
  per_page: string | number
}

// ── Fetch ───────────────────────────────────────────────────────────────────

async function fetchPage(page: number): Promise<ApiResponse> {
  const url = `${API_BASE}/api/public/v2/get-projects?publicapikey=${API_KEY}&page=${page}&limit=${pageSize}`

  // Use child_process curl because Node fetch hangs on this API
  const { spawnSync } = await import('child_process')
  const result = spawnSync('curl', ['-s', '--max-time', '60', '-H', 'Accept: application/json', url], { encoding: 'utf-8', timeout: 65000 })
  if (result.error || result.status !== 0) {
    throw new Error(`curl failed: ${result.error?.message ?? `exit ${result.status}`} ${result.stderr}`)
  }
  const raw = result.stdout

  let parsed: ApiResponse
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error(`SubHub API returned invalid JSON on page ${page}`)
  }

  return parsed
}

// ── Match to MicroGRID ──────────────────────────────────────────────────────

async function loadMicrogridProjects(): Promise<Map<string, string>> {
  if (!supabase) return new Map()

  // Build lookup map: customer name → project ID
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, address, city')
    .limit(2000)

  if (error) {
    console.error('Failed to load MicroGRID projects:', error.message)
    return new Map()
  }

  const map = new Map<string, string>()
  for (const p of data ?? []) {
    // Match by customer name (case-insensitive)
    if (p.name) map.set(p.name.toLowerCase(), p.id)
    // Also try address match
    if (p.address && p.city) {
      map.set(`${p.address.toLowerCase()}|${p.city.toLowerCase()}`, p.id)
    }
  }
  return map
}

function matchProject(
  project: SubHubProject,
  mgMap: Map<string, string>,
): string | null {
  // Try name match
  const name = project.name?.toLowerCase()
  if (name && mgMap.has(name)) return mgMap.get(name)!

  // Try address match
  const addr = project.street?.toLowerCase()
  const city = project.city?.toLowerCase()
  if (addr && city) {
    const key = `${addr}|${city}`
    if (mgMap.has(key)) return mgMap.get(key)!
  }

  return null
}

// ── Extract Welcome Call Data ───────────────────────────────────────────────

function extractWelcomeCallData(project: SubHubProject) {
  // Look for welcome-call-related stage fields
  const wcFields = project.stages?.filter(s =>
    s.field_key?.includes('welcome') ||
    s.field_key?.includes('vwc') ||
    s.label?.toLowerCase().includes('welcome call')
  ) ?? []

  // Look for welcome call documents
  const wcDocs = project.documents?.filter(d =>
    d.label?.toLowerCase().includes('welcome') ||
    d.label?.toLowerCase().includes('vwc')
  ) ?? []

  return { wcFields, wcDocs }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SubHub Project Extraction ===')
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE (writing to Supabase)'}`)
  console.log(`Page size: ${pageSize}`)
  if (pageLimit < Infinity) console.log(`Page limit: ${pageLimit}`)

  // Load MicroGRID project lookup
  const mgMap = await loadMicrogridProjects()
  console.log(`Loaded ${mgMap.size / 2} MicroGRID projects for matching`)

  let page = 1
  let lastPage = 1
  let totalFetched = 0
  let totalMatched = 0
  let totalDocs = 0
  let totalWcFields = 0
  let stored = 0
  let errors = 0

  do {
    if (page > pageLimit) break

    console.log(`\nFetching page ${page}/${lastPage}...`)
    let response: ApiResponse

    try {
      response = await fetchPage(page)
    } catch (err) {
      console.error(`Page ${page} failed:`, err)
      errors++
      page++
      continue
    }

    lastPage = response.last_page
    const projects = response.data ?? []
    totalFetched += projects.length

    console.log(`  Got ${projects.length} projects (total: ${response.total}, page ${response.current_page}/${response.last_page})`)

    for (const project of projects) {
      const projectId = matchProject(project, mgMap)
      if (projectId) totalMatched++

      const docCount = project.documents?.length ?? 0
      totalDocs += docCount

      const { wcFields, wcDocs } = extractWelcomeCallData(project)
      totalWcFields += wcFields.length

      // Store to Supabase
      if (!dryRun && supabase) {
        const { error: insertErr } = await supabase
          .from('welcome_call_logs')
          .insert({
            source_id: String(project.subhub_id),
            customer_name: project.name,
            event_type: 'project_export',
            payload: project as unknown as Record<string, unknown>,
            project_id: projectId,
            processed: false,
          })

        if (insertErr) {
          // Skip duplicates
          if (insertErr.message?.includes('duplicate')) {
            // Already stored, skip
          } else {
            console.error(`  Error storing ${project.subhub_id}:`, insertErr.message)
            errors++
          }
        } else {
          stored++
        }
      }

      // Log notable findings
      if (wcFields.length > 0 || wcDocs.length > 0) {
        console.log(`  📞 ${project.name} (${project.subhub_id}): ${wcFields.length} WC fields, ${wcDocs.length} WC docs`)
      }
    }

    page++

    // Rate limit: 200ms between pages
    await new Promise(r => setTimeout(r, 200))

  } while (page <= lastPage)

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Total projects fetched: ${totalFetched}`)
  console.log(`Matched to MicroGRID:   ${totalMatched}`)
  console.log(`Total documents:        ${totalDocs}`)
  console.log(`Welcome call fields:    ${totalWcFields}`)
  if (!dryRun) {
    console.log(`Stored to Supabase:     ${stored}`)
  }
  console.log(`Errors:                 ${errors}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
