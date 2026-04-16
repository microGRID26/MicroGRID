// lib/partner-api/project-access.ts — Per-request partner→project scope check.
//
// A partner can read a project only if their org has an active engineering
// assignment on it. Platform tenants can read any project.

import { partnerApiAdmin } from './supabase-admin'

export async function partnerHasProjectAccess(args: {
  orgId: string
  orgType: string
  projectId: string
}): Promise<boolean> {
  if (args.orgType === 'platform') return true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = partnerApiAdmin() as any
  const { data, error } = await sb
    .from('engineering_assignments')
    .select('id')
    .eq('project_id', args.projectId)
    .eq('assigned_org', args.orgId)
    .neq('status', 'cancelled')
    .limit(1)
    .maybeSingle()
  if (error) return false
  return !!data
}
