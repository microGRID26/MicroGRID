// lib/api/permits.ts — AHJ / permit data access

import { db } from '@/lib/db'

export interface AHJ {
  id: string
  name: string
  [key: string]: unknown
}

/** Load all AHJs ordered by name. */
export async function loadAHJs(): Promise<AHJ[]> {
  const supabase = db()
  const { data, error } = await supabase
    .from('ahjs')
    .select('*')
    .order('name', { ascending: true })
    .limit(5000)
  if (error) console.error('[loadAHJs]', error.message)
  return (data ?? []) as AHJ[]
}
