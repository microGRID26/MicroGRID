import { db } from '@/lib/db'

// ── Change order data access ─────────────────────────────────────────────────
// Org filtering: inherited via project_id FK — RLS SELECT policy uses
// EXISTS (SELECT 1 FROM projects WHERE id = change_orders.project_id AND org_id = ...)
// No direct org_id column exists on this table; RLS enforces org scope.

/** Load all change orders with project join */
export async function loadChangeOrders(limit = 2000) {
  // Uses db() because the select includes a join (project:projects) which requires untyped query
  const { data, error } = await db().from('change_orders')
    .select('*, project:projects(name, city, pm, pm_id)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) console.error('change_orders load failed:', error)
  return { data: data ?? [], error }
}
