// lib/api/sales-teams.ts — Pay scale stacks, sales teams, reps, and onboarding
// Sequifi-inspired: named pay tiers, deductive override calculation, rep onboarding docs

import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { escapeFilterValue } from '@/lib/utils'

// ── Type Re-exports ─────────────────────────────────────────────────────────

export type { PayScale, PayDistribution, SalesTeam, SalesRep, OnboardingRequirement, OnboardingDocument, RepStatus, OnboardingDocStatus } from '@/types/database'
import type { PayScale, PayDistribution, SalesTeam, SalesRep, OnboardingRequirement, OnboardingDocument, RepStatus, OnboardingDocStatus } from '@/types/database'

// ── Constants ───────────────────────────────────────────────────────────────

export const REP_STATUSES: RepStatus[] = ['onboarding', 'active', 'inactive', 'terminated']

export const REP_STATUS_LABELS: Record<RepStatus, string> = {
  onboarding: 'Onboarding',
  active: 'Active',
  inactive: 'Inactive',
  terminated: 'Terminated',
}

export const REP_STATUS_BADGE: Record<RepStatus, string> = {
  onboarding: 'bg-blue-900 text-blue-300',
  active: 'bg-green-900 text-green-300',
  inactive: 'bg-gray-700 text-gray-300',
  terminated: 'bg-red-900 text-red-300',
}

export const DOC_STATUSES: OnboardingDocStatus[] = ['pending', 'sent', 'viewed', 'signed', 'uploaded', 'verified', 'rejected']

export const DOC_STATUS_LABELS: Record<OnboardingDocStatus, string> = {
  pending: 'Pending',
  sent: 'Sent',
  viewed: 'Viewed',
  signed: 'Signed',
  uploaded: 'Uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
}

export const DOC_STATUS_BADGE: Record<OnboardingDocStatus, string> = {
  pending: 'bg-gray-700 text-gray-300',
  sent: 'bg-blue-900 text-blue-300',
  viewed: 'bg-cyan-900 text-cyan-300',
  signed: 'bg-emerald-900 text-emerald-300',
  uploaded: 'bg-amber-900 text-amber-300',
  verified: 'bg-green-900 text-green-300',
  rejected: 'bg-red-900 text-red-300',
}

export const DEFAULT_ROLE_KEYS = [
  { key: 'energy_consultant', label: 'Energy Consultant' },
  { key: 'energy_advisor', label: 'Energy Advisor' },
  { key: 'incentive_budget', label: 'Incentive Budget' },
  { key: 'project_manager', label: 'Project Manager' },
  { key: 'assistant_manager', label: 'Assistant Manager' },
  { key: 'vp', label: 'VP' },
  { key: 'regional', label: 'Regional' },
] as const

// ── Pay Scales ──────────────────────────────────────────────────────────────

export async function loadPayScales(orgId?: string | null): Promise<PayScale[]> {
  const supabase = createClient()
  let query = supabase
    .from('pay_scales')
    .select('id, name, description, per_watt_rate, adder_percentage, referral_bonus, sort_order, active, org_id, created_at, updated_at')
    .eq('active', true)
    .order('sort_order')
    .limit(200)

  if (orgId) {
    query = query.or(`org_id.eq.${escapeFilterValue(orgId)},org_id.is.null`)
  }

  const { data, error } = await query
  if (error) { console.error('loadPayScales error:', error); return [] }
  return (data ?? []) as PayScale[]
}

export async function addPayScale(scale: {
  name: string
  per_watt_rate: number
  description?: string
  adder_percentage?: number
  referral_bonus?: number
  sort_order?: number
  org_id?: string
}): Promise<PayScale | null> {
  const { data, error } = await db()
    .from('pay_scales')
    .insert(scale)
    .select()
    .single()
  if (error) { console.error('addPayScale error:', error); return null }
  return data as PayScale
}

export async function updatePayScale(id: string, updates: Partial<PayScale>): Promise<boolean> {
  const { error } = await db()
    .from('pay_scales')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('updatePayScale error:', error); return false }
  return true
}

export async function deletePayScale(id: string): Promise<boolean> {
  const { error } = await db()
    .from('pay_scales')
    .delete()
    .eq('id', id)
  if (error) { console.error('deletePayScale error:', error); return false }
  return true
}

// ── Pay Distribution ────────────────────────────────────────────────────────

export async function loadPayDistribution(orgId?: string | null): Promise<PayDistribution[]> {
  const supabase = createClient()
  let query = supabase
    .from('pay_distribution')
    .select('id, role_key, label, percentage, sort_order, active, org_id, created_at')
    .eq('active', true)
    .order('sort_order')
    .limit(200)

  if (orgId) {
    query = query.or(`org_id.eq.${escapeFilterValue(orgId)},org_id.is.null`)
  }

  const { data, error } = await query
  if (error) { console.error('loadPayDistribution error:', error); return [] }
  return (data ?? []) as PayDistribution[]
}

export async function updatePayDistribution(id: string, updates: Partial<PayDistribution>): Promise<boolean> {
  const { error } = await db()
    .from('pay_distribution')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('updatePayDistribution error:', error); return false }
  return true
}

export async function addPayDistribution(dist: {
  role_key: string
  label: string
  percentage: number
  sort_order?: number
  active?: boolean
  org_id?: string
}): Promise<PayDistribution | null> {
  const { data, error } = await db()
    .from('pay_distribution')
    .insert(dist)
    .select()
    .single()
  if (error) { console.error('addPayDistribution error:', error); return null }
  return data as PayDistribution
}

export async function deletePayDistribution(id: string): Promise<boolean> {
  const { error } = await db()
    .from('pay_distribution')
    .delete()
    .eq('id', id)
  if (error) { console.error('deletePayDistribution error:', error); return false }
  return true
}

// ── Sales Teams ─────────────────────────────────────────────────────────────

export async function loadSalesTeams(orgId?: string | null): Promise<SalesTeam[]> {
  const supabase = createClient()
  let query = supabase
    .from('sales_teams')
    .select('id, name, vp_user_id, vp_name, regional_user_id, regional_name, manager_user_id, manager_name, assistant_manager_user_id, assistant_manager_name, stack_per_watt, active, org_id, created_at, updated_at')
    .order('name')
    .limit(200)

  if (orgId) {
    query = query.or(`org_id.eq.${escapeFilterValue(orgId)},org_id.is.null`)
  }

  const { data, error } = await query
  if (error) { console.error('loadSalesTeams error:', error); return [] }
  return (data ?? []) as SalesTeam[]
}

export async function addSalesTeam(team: {
  name: string
  stack_per_watt?: number
  vp_user_id?: string
  vp_name?: string
  regional_user_id?: string
  regional_name?: string
  manager_user_id?: string
  manager_name?: string
  assistant_manager_user_id?: string
  assistant_manager_name?: string
  org_id?: string
}): Promise<SalesTeam | null> {
  const { data, error } = await db()
    .from('sales_teams')
    .insert(team)
    .select()
    .single()
  if (error) { console.error('addSalesTeam error:', error); return null }
  return data as SalesTeam
}

export async function updateSalesTeam(id: string, updates: Partial<SalesTeam>): Promise<boolean> {
  const { error } = await db()
    .from('sales_teams')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('updateSalesTeam error:', error); return false }
  return true
}

export async function deleteSalesTeam(id: string): Promise<boolean> {
  const { error } = await db()
    .from('sales_teams')
    .delete()
    .eq('id', id)
  if (error) { console.error('deleteSalesTeam error:', error); return false }
  return true
}

// ── Sales Reps ──────────────────────────────────────────────────────────────

export interface SalesRepFilters {
  teamId?: string
  status?: RepStatus
  orgId?: string | null
  search?: string
}

export async function loadSalesReps(filters?: SalesRepFilters): Promise<SalesRep[]> {
  const supabase = createClient()
  let query = supabase
    .from('sales_reps')
    .select('id, user_id, auth_user_id, first_name, last_name, email, phone, team_id, pay_scale_id, role_key, hire_date, status, split_percentage, split_partner_id, notes, recheck_id, blacklisted, blacklist_reason, org_id, created_at, updated_at')
    .order('last_name')
    .limit(500)

  if (filters?.teamId) {
    query = query.eq('team_id', filters.teamId)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.orgId) {
    query = query.or(`org_id.eq.${escapeFilterValue(filters.orgId)},org_id.is.null`)
  }

  const { data, error } = await query
  if (error) { console.error('loadSalesReps error:', error); return [] }

  let reps = (data ?? []) as SalesRep[]

  // Client-side search filter (name, email)
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    reps = reps.filter(r =>
      r.first_name.toLowerCase().includes(q) ||
      r.last_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    )
  }

  return reps
}

export async function addSalesRep(rep: {
  first_name: string
  last_name: string
  email: string
  phone?: string
  team_id?: string
  pay_scale_id?: string
  role_key?: string
  hire_date?: string
  status?: RepStatus
  split_percentage?: number
  split_partner_id?: string
  notes?: string
  org_id?: string
  user_id?: string
  auth_user_id?: string
}): Promise<SalesRep | null> {
  const { data, error } = await db()
    .from('sales_reps')
    .insert(rep)
    .select()
    .single()
  if (error) { console.error('addSalesRep error:', error); return null }
  return data as SalesRep
}

export async function updateSalesRep(id: string, updates: Partial<SalesRep>): Promise<boolean> {
  const { error } = await db()
    .from('sales_reps')
    .update(updates)
    .eq('id', id)
  if (error) { console.error('updateSalesRep error:', error); return false }
  return true
}

export async function loadRepById(id: string): Promise<SalesRep | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sales_reps')
    .select('id, user_id, auth_user_id, first_name, last_name, email, phone, team_id, pay_scale_id, role_key, hire_date, status, split_percentage, split_partner_id, notes, recheck_id, blacklisted, blacklist_reason, org_id, created_at, updated_at')
    .eq('id', id)
    .single()
  if (error) { console.error('loadRepById error:', error); return null }
  return data as SalesRep
}

// ── Onboarding Requirements ────────────────────────────────────────────────

export async function loadOnboardingRequirements(orgId?: string | null): Promise<OnboardingRequirement[]> {
  const supabase = createClient()
  let query = supabase
    .from('onboarding_requirements')
    .select('id, name, description, required, sort_order, active, org_id, created_at')
    .eq('active', true)
    .order('sort_order')
    .limit(200)

  if (orgId) {
    query = query.or(`org_id.eq.${escapeFilterValue(orgId)},org_id.is.null`)
  }

  const { data, error } = await query
  if (error) { console.error('loadOnboardingRequirements error:', error); return [] }
  return (data ?? []) as OnboardingRequirement[]
}

// ── Onboarding Documents ───────────────────────────────────────────────────

export async function loadRepDocuments(repId: string): Promise<OnboardingDocument[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('onboarding_documents')
    .select('id, rep_id, requirement_id, status, sent_at, viewed_at, signed_at, uploaded_at, verified_at, verified_by, file_url, notes, created_at, updated_at')
    .eq('rep_id', repId)
    .order('created_at')
    .limit(200)
  if (error) { console.error('loadRepDocuments error:', error); return [] }
  return (data ?? []) as OnboardingDocument[]
}

export async function updateOnboardingDocStatus(
  docId: string,
  status: OnboardingDocStatus,
  notes?: string
): Promise<boolean> {
  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status }

  // Auto-set lifecycle timestamps based on status transition
  switch (status) {
    case 'sent':
      updates.sent_at = now
      break
    case 'viewed':
      updates.viewed_at = now
      break
    case 'signed':
      updates.signed_at = now
      break
    case 'uploaded':
      updates.uploaded_at = now
      break
    case 'verified':
      updates.verified_at = now
      break
  }

  if (notes !== undefined) {
    updates.notes = notes
  }

  const { error } = await db()
    .from('onboarding_documents')
    .update(updates)
    .eq('id', docId)
  if (error) { console.error('updateDocumentStatus error:', error); return false }
  return true
}

/**
 * Update the file URL on an onboarding document (contract/doc link).
 */
export async function updateDocFileUrl(docId: string, fileUrl: string | null): Promise<boolean> {
  const { error } = await db()
    .from('onboarding_documents')
    .update({ file_url: fileUrl })
    .eq('id', docId)
  if (error) { console.error('updateDocFileUrl error:', error); return false }
  return true
}

/**
 * Create pending document records for all active requirements.
 * Called when a new rep is created to bootstrap their onboarding checklist.
 */
export async function initializeRepDocuments(repId: string, orgId?: string | null): Promise<boolean> {
  const requirements = await loadOnboardingRequirements(orgId)
  if (requirements.length === 0) return true

  // Check for existing docs to prevent duplicates on retry
  const { data: existing } = await db()
    .from('onboarding_documents')
    .select('requirement_id')
    .eq('rep_id', repId)
    .limit(200)
  const existingArr = Array.isArray(existing) ? existing : []
  const existingReqIds = new Set(existingArr.map((d: { requirement_id: string }) => d.requirement_id))

  const rows = requirements
    .filter(req => !existingReqIds.has(req.id))
    .map(req => ({
      rep_id: repId,
      requirement_id: req.id,
      status: 'pending',
    }))

  if (rows.length === 0) return true // all already initialized

  const { error } = await db()
    .from('onboarding_documents')
    .insert(rows)
  if (error) { console.error('initializeRepDocuments error:', error); return false }
  return true
}

// ── Override Calculation Engine (pure functions, no DB) ─────────────────────

export interface OverrideBreakdown {
  teamStackRate: number
  repRate: number
  overridePerWatt: number
  systemWatts: number
  totalOverride: number
}

/**
 * Calculate deductive leader override.
 * Override = (team stack rate - rep pay scale rate) * system watts
 *
 * Example: Team stack $0.40/W, rep is Consultant at $0.20/W, 10kW system
 *   Override = ($0.40 - $0.20) * 10,000 = $2,000
 *   The $2,000 is then distributed across leadership via pay_distribution percentages.
 */
export function calculateOverride(
  teamStackRate: number,
  repPayScaleRate: number,
  systemWatts: number
): OverrideBreakdown {
  const overridePerWatt = Math.max(0, teamStackRate - repPayScaleRate)
  const totalOverride = overridePerWatt * systemWatts

  return {
    teamStackRate,
    repRate: repPayScaleRate,
    overridePerWatt,
    systemWatts,
    totalOverride,
  }
}

/**
 * Calculate override amount for a split stack.
 * When two reps split a deal, the override is calculated on the split percentage.
 */
export function calculateSplitOverride(
  overrideAmount: number,
  splitPercentage: number
): number {
  return overrideAmount * (splitPercentage / 100)
}

export interface DistributionLine {
  roleKey: string
  label: string
  percentage: number
  amount: number
}

/**
 * Apply percentage distribution to a total stack override amount.
 * Returns per-role breakdown.
 *
 * Example: $2,000 total override with default distribution:
 *   Energy Consultant: 40% = $800
 *   Energy Advisor: 40% = $800
 *   PM: 3% = $60
 *   etc.
 */
export function calculateTeamDistribution(
  totalStackAmount: number,
  distribution: PayDistribution[]
): DistributionLine[] {
  return distribution
    .filter(d => d.active)
    .map(d => ({
      roleKey: d.role_key,
      label: d.label,
      percentage: d.percentage,
      amount: Math.round((totalStackAmount * d.percentage / 100) * 100) / 100,
    }))
}

// ── Rep Notes (timestamped log) ────────────────────────────────────────────

export interface RepNote {
  id: string
  rep_id: string
  text: string
  author: string
  author_id: string | null
  created_at: string
}

export async function loadRepNotes(repId: string): Promise<RepNote[]> {
  const { data, error } = await db().from('rep_notes')
    .select('id, rep_id, text, author, author_id, created_at')
    .eq('rep_id', repId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) { console.error('[loadRepNotes]', error); return [] }
  return (data ?? []) as RepNote[]
}

export async function addRepNote(repId: string, text: string, author: string, authorId?: string): Promise<RepNote | null> {
  const { data, error } = await db().from('rep_notes')
    .insert({ rep_id: repId, text, author, author_id: authorId ?? null })
    .select()
    .single()
  if (error) { console.error('[addRepNote]', error); return null }
  return data as RepNote
}

export async function deleteRepNote(noteId: string): Promise<boolean> {
  const { error } = await db().from('rep_notes').delete().eq('id', noteId)
  if (error) { console.error('[deleteRepNote]', error); return false }
  return true
}

// ── Rep Files ─────────────────────────────────────────────────────────────

export interface RepFile {
  id: string
  rep_id: string
  file_type: string
  file_name: string
  file_url: string
  uploaded_by: string | null
  notes: string | null
  created_at: string
}

export const REP_FILE_TYPES = ['license_front', 'license_back', 'w9', 'ica', 'photo', 'other'] as const
export const REP_FILE_TYPE_LABELS: Record<string, string> = {
  license_front: 'License (Front)',
  license_back: 'License (Back)',
  w9: 'W-9',
  ica: 'ICA',
  photo: 'Photo',
  other: 'Other',
}

export async function loadRepFiles(repId: string): Promise<RepFile[]> {
  const { data, error } = await db().from('rep_files')
    .select('id, rep_id, file_type, file_name, file_url, uploaded_by, notes, created_at')
    .eq('rep_id', repId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) { console.error('[loadRepFiles]', error); return [] }
  return (data ?? []) as RepFile[]
}

export async function addRepFile(file: Omit<RepFile, 'id' | 'created_at'>): Promise<RepFile | null> {
  const { data, error } = await db().from('rep_files')
    .insert(file)
    .select()
    .single()
  if (error) { console.error('[addRepFile]', error); return null }
  return data as RepFile
}

export async function deleteRepFile(fileId: string): Promise<boolean> {
  const { error } = await db().from('rep_files').delete().eq('id', fileId)
  if (error) { console.error('[deleteRepFile]', error); return false }
  return true
}

// ── Rep Scorecard ──────────────────────────────────────────────────────────

export interface RepScorecard {
  repId: string
  repName: string
  teamId: string | null
  daysSinceLastSale: number | null
  daysSinceLastInstall: number | null
  daysSinceLastCommission: number | null
  totalDeals: number
  totalKw: number
  totalCommission: number
}

/**
 * Compute scorecards for all active reps by cross-referencing projects and commissions.
 * Pure client-side computation from loaded data.
 */
export function computeRepScorecards(
  reps: SalesRep[],
  projects: { consultant?: string | null; advisor?: string | null; sale_date?: string | null; install_complete_date?: string | null; systemkw?: number | null }[],
  commissionRecords: { user_name?: string | null; paid_at?: string | null; total_commission?: number | null }[]
): RepScorecard[] {
  const now = Date.now()
  const daysSince = (dateStr: string | null | undefined): number | null => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return Math.floor((now - d.getTime()) / 86400000)
  }

  return reps.map(rep => {
    const name = `${rep.first_name} ${rep.last_name}`.trim().toLowerCase()

    // Find projects where this rep is consultant or advisor
    const repProjects = projects.filter(p =>
      p.consultant?.trim().toLowerCase() === name || p.advisor?.trim().toLowerCase() === name
    )

    const saleDates = repProjects.map(p => p.sale_date).filter(Boolean) as string[]
    const installDates = repProjects.map(p => p.install_complete_date).filter(Boolean) as string[]
    const lastSale = saleDates.length > 0 ? saleDates.sort().reverse()[0] : null
    const lastInstall = installDates.length > 0 ? installDates.sort().reverse()[0] : null

    // Find commission records for this rep
    const repCommissions = commissionRecords.filter(c =>
      c.user_name?.toLowerCase() === name
    )
    const paidDates = repCommissions.map(c => c.paid_at).filter(Boolean) as string[]
    const lastPaid = paidDates.length > 0 ? paidDates.sort().reverse()[0] : null

    return {
      repId: rep.id,
      repName: `${rep.first_name} ${rep.last_name}`,
      teamId: rep.team_id ?? null,
      daysSinceLastSale: daysSince(lastSale),
      daysSinceLastInstall: daysSince(lastInstall),
      daysSinceLastCommission: daysSince(lastPaid),
      totalDeals: saleDates.length,
      totalKw: repProjects.reduce((s, p) => s + (Number(p.systemkw) || 0), 0),
      totalCommission: repCommissions.reduce((s, c) => s + (Number(c.total_commission) || 0), 0),
    }
  })
}

// ── Ticket Rep Stats ───────────────────────────────────────────────────────

export interface TicketRepStats {
  sales_rep_id: string
  rep_name: string
  team_id: string | null
  total_tickets: number
  open_tickets: number
  resolved_tickets: number
  service_tickets: number
  sales_tickets: number
  critical_tickets: number
  escalated_tickets: number
  avg_resolution_hours: number | null
}

export async function loadTicketRepStats(): Promise<TicketRepStats[]> {
  const { data, error } = await db().from('ticket_rep_stats').select('sales_rep_id, rep_name, team_id, total_tickets, open_tickets, resolved_tickets, service_tickets, sales_tickets, critical_tickets, escalated_tickets, avg_resolution_hours').limit(500)
  if (error) { console.error('[loadTicketRepStats]', error); return [] }
  return (data ?? []) as TicketRepStats[]
}
