export interface FundingRecord {
  project_id: string
  m1_status: string | null
  m2_status: string | null
  m3_status: string | null
}

export type DaysRange = '' | '<7' | '7-30' | '30-90' | '90+'
