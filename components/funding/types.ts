import type { Project, ProjectFunding } from '@/types/database'

export type MilestoneKey = 'm1' | 'm2' | 'm3'
export type FundingFilter = 'all' | 'ready' | 'submitted' | 'pending' | 'revision' | 'funded' | 'nonfunded'

/** Row shape returned by the funding_dashboard Postgres view */
export interface FundingDashboardRow {
  id: string
  name: string
  city: string | null
  address: string | null
  financier: string | null
  ahj: string | null
  install_complete_date: string | null
  pto_date: string | null
  contract: number | null
  sale_date: string | null
  stage: string
  disposition: string | null
  m1_amount: number | null
  m1_funded_date: string | null
  m1_status: string | null
  m1_notes: string | null
  m1_cb: string | null
  m1_cb_credit: number | null
  m2_amount: number | null
  m2_funded_date: string | null
  m2_status: string | null
  m2_notes: string | null
  m2_cb: string | null
  m2_cb_credit: number | null
  m3_amount: number | null
  m3_funded_date: string | null
  m3_status: string | null
  m3_notes: string | null
  m3_projected: number | null
  nonfunded_code_1: string | null
  nonfunded_code_2: string | null
  nonfunded_code_3: string | null
}

export interface MsData {
  amount: number | null
  funded_date: string | null
  status: string | null
  notes: string | null
  isEligible: boolean
  isFunded: boolean
}

export interface FundingRow {
  project: Project
  funding: ProjectFunding | null
  m1: MsData
  m2: MsData
  m3: MsData
  nf1: string | null
  nf2: string | null
  nf3: string | null
}

export function getMsData(f: ProjectFunding | null, p: Project, ms: MilestoneKey): MsData {
  const eligible = ms === 'm1' ? true : ms === 'm2' ? !!p.install_complete_date : !!p.pto_date
  if (!f) return { amount: null, funded_date: null, status: null, notes: null, isEligible: eligible, isFunded: false }
  const amount = ms === 'm1' ? f.m1_amount : ms === 'm2' ? f.m2_amount : f.m3_amount
  const funded_date = ms === 'm1' ? f.m1_funded_date : ms === 'm2' ? f.m2_funded_date : f.m3_funded_date
  const status = ms === 'm1' ? f.m1_status : ms === 'm2' ? f.m2_status : f.m3_status
  const notes = ms === 'm1' ? f.m1_notes : ms === 'm2' ? f.m2_notes : f.m3_notes
  return { amount, funded_date, status, notes, isEligible: eligible, isFunded: !!funded_date }
}

/** All sortable column keys */
export type SortColumn = 'name' | 'financier' | 'ahj' | 'install' | 'pto' | 'contract' | 'stage'
  | 'm1_amount' | 'm1_funded' | 'm1_status'
  | 'm2_amount' | 'm2_funded' | 'm2_status'
  | 'm3_amount' | 'm3_funded' | 'm3_status'
  | 'nf'
