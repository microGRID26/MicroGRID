// lib/api/engineering-config.ts — Engineering partner configuration
// Manages auto-routing config (Rush Engineering exclusive partner, design fee, etc.)

import { db } from '@/lib/db'
import { submitAssignment } from './engineering'
import type { EngineeringAssignment } from '@/types/database'

export interface EngineeringConfig {
  exclusive_partner_org_slug: string
  design_fee: string
  auto_route_enabled: string
  [key: string]: string
}

/**
 * Load all engineering config key/value pairs.
 */
export async function loadEngineeringConfig(): Promise<EngineeringConfig> {
  const supabase = db()
  const { data, error } = await supabase
    .from('engineering_config')
    .select('config_key, value')
    .limit(50)
  if (error) {
    console.error('[loadEngineeringConfig]', error.message)
    return { exclusive_partner_org_slug: 'rush', design_fee: '1200', auto_route_enabled: 'true' }
  }
  const config: Record<string, string> = {}
  for (const row of (data ?? []) as { config_key: string; value: string }[]) {
    config[row.config_key] = row.value
  }
  return config as EngineeringConfig
}

/**
 * Update a single engineering config key/value pair. Admin only (enforced by RLS).
 */
export async function updateEngineeringConfig(key: string, value: string): Promise<boolean> {
  const supabase = db()
  const { error } = await supabase
    .from('engineering_config')
    .update({ value, updated_at: new Date().toISOString() })
    .eq('config_key', key)
  if (error) {
    console.error('[updateEngineeringConfig]', error.message)
    return false
  }
  return true
}

/**
 * Auto-route an engineering assignment to the exclusive partner org.
 * Reads engineering_config to determine the partner org slug, looks up the org,
 * and creates the assignment via submitAssignment.
 */
export async function autoRouteAssignment(
  projectId: string,
  requestingOrg: string,
  userId: string,
  userName: string,
  type?: string,
  priority?: string,
  notes?: string,
): Promise<EngineeringAssignment | null> {
  const supabase = db()

  // Load config to get the exclusive partner org slug
  const config = await loadEngineeringConfig()
  const slug = config.exclusive_partner_org_slug
  if (!slug) {
    console.error('[autoRouteAssignment] No exclusive_partner_org_slug configured')
    return null
  }

  // Look up the org by slug
  const { data: orgData, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('slug', slug)
    .eq('active', true)
    .limit(1)
    .maybeSingle()
  if (orgErr || !orgData) {
    console.error('[autoRouteAssignment] Partner org not found for slug:', slug, orgErr?.message)
    return null
  }
  const partnerOrg = orgData as { id: string; name: string }

  // Create the assignment auto-routed to the partner
  return submitAssignment(
    projectId,
    partnerOrg.id,
    requestingOrg,
    type ?? 'new_design',
    userId,
    userName,
    {
      priority: priority ?? 'normal',
      notes: notes ? `[Auto-routed to ${partnerOrg.name}] ${notes}` : `[Auto-routed to ${partnerOrg.name}]`,
    },
  )
}
