/**
 * Upload legacy projects JSON to Supabase
 *
 * Reads the output from import-legacy-projects.ts and bulk inserts
 * into the legacy_projects table in batches of 500.
 *
 * Usage:
 *   npx tsx scripts/upload-legacy-projects.ts /tmp/legacy_import.json
 */

import * as fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 500

async function main() {
  const inputPath = process.argv[2]
  if (!inputPath) {
    console.error('Usage: npx tsx scripts/upload-legacy-projects.ts <input.json>')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    console.error('ERROR: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  const supabase = createClient(url, key)

  console.log(`Reading ${inputPath}...`)
  const raw = fs.readFileSync(inputPath, 'utf-8')
  const data = JSON.parse(raw)
  const projects: Record<string, unknown>[] = data.projects || []

  console.log(`Found ${projects.length} projects to upload.\n`)

  let inserted = 0
  let errors = 0

  for (let i = 0; i < projects.length; i += BATCH_SIZE) {
    const batch = projects.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('legacy_projects')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`  ERROR batch ${i}-${i + batch.length}: ${error.message}`)
      errors += batch.length
    } else {
      inserted += batch.length
    }

    if ((i + BATCH_SIZE) % 2000 === 0 || i + BATCH_SIZE >= projects.length) {
      console.log(`  Progress: ${Math.min(i + BATCH_SIZE, projects.length)} / ${projects.length} (${inserted} inserted, ${errors} errors)`)
    }
  }

  console.log(`\n=== Upload Complete ===`)
  console.log(`Inserted: ${inserted}`)
  console.log(`Errors:   ${errors}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
