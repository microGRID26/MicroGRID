// lib/api/invoices.ts — Invoice data access layer
// Orgs create invoices to bill other orgs for engineering, materials, etc.

import { db } from '@/lib/db'
import type { Invoice, InvoiceLineItem, InvoiceStatus } from '@/types/database'

// ── Re-exports ──────────────────────────────────────────────────────────────
export type { Invoice, InvoiceLineItem, InvoiceStatus }

export const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled', 'disputed'] as const

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
}

export const INVOICE_STATUS_BADGE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-700 text-gray-300',
  sent: 'bg-blue-900 text-blue-300',
  viewed: 'bg-cyan-900 text-cyan-300',
  paid: 'bg-green-900 text-green-300',
  overdue: 'bg-red-900 text-red-300',
  cancelled: 'bg-gray-800 text-gray-400',
  disputed: 'bg-orange-900 text-orange-300',
}

// ── Status Transition Validation ────────────────────────────────────────────

const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['viewed', 'paid', 'overdue', 'cancelled', 'disputed'],
  viewed: ['paid', 'overdue', 'cancelled', 'disputed'],
  overdue: ['paid', 'cancelled', 'disputed'],
  disputed: ['sent', 'cancelled'],
  paid: [],      // terminal
  cancelled: [], // terminal
}

/**
 * Returns allowed next statuses for a given current invoice status.
 * Terminal statuses (paid, cancelled) return an empty array.
 */
export function getValidInvoiceTransitions(currentStatus: InvoiceStatus): InvoiceStatus[] {
  return VALID_INVOICE_TRANSITIONS[currentStatus] ?? []
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Load invoices, optionally filtered by org (matches from_org or to_org) and status.
 */
export async function loadInvoices(orgId?: string, status?: InvoiceStatus): Promise<Invoice[]> {
  const supabase = db()
  let q = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (orgId) q = q.or(`from_org.eq.${orgId},to_org.eq.${orgId}`)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) console.error('[loadInvoices]', error.message)
  return (data ?? []) as Invoice[]
}

/**
 * Load a single invoice with its line items.
 */
export async function loadInvoice(invoiceId: string): Promise<{ invoice: Invoice; lineItems: InvoiceLineItem[] } | null> {
  const supabase = db()
  const [invResult, itemsResult] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', invoiceId).single(),
    supabase.from('invoice_line_items').select('*').eq('invoice_id', invoiceId).order('sort_order', { ascending: true }).limit(500),
  ])
  if (invResult.error) {
    console.error('[loadInvoice]', invResult.error.message)
    return null
  }
  return {
    invoice: invResult.data as Invoice,
    lineItems: (itemsResult.data ?? []) as InvoiceLineItem[],
  }
}

/**
 * Load invoices for a specific project.
 */
export async function loadProjectInvoices(projectId: string): Promise<Invoice[]> {
  const supabase = db()
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) console.error('[loadProjectInvoices]', error.message)
  return (data ?? []) as Invoice[]
}

/**
 * Generate a unique invoice number: INV-YYYYMMDD-NNN
 */
export async function generateInvoiceNumber(): Promise<string> {
  const supabase = db()
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const prefix = `INV-${today}-`
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1)
  const last = (data as { invoice_number: string }[] | null)?.[0]?.invoice_number
  const nextNum = last ? parseInt(last.split('-').pop() ?? '0', 10) + 1 : 1
  return `${prefix}${String(nextNum).padStart(3, '0')}`
}

/**
 * Create an invoice with line items. Auto-calculates subtotal/total.
 * Retries up to 3 times on invoice_number unique constraint violation (code 23505)
 * to handle race conditions from concurrent requests.
 */
export async function createInvoice(
  invoice: {
    invoice_number: string
    project_id: string | null
    from_org: string
    to_org: string
    milestone?: string | null
    due_date?: string | null
    notes?: string | null
    created_by?: string | null
    created_by_id?: string | null
  },
  lineItems: {
    description: string
    quantity: number
    unit_price: number
    category?: string | null
    sort_order?: number
  }[],
): Promise<Invoice | null> {
  const supabase = db()

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const tax = 0  // Tax logic can be added later
  const total = subtotal + tax

  // Retry loop: regenerate invoice number on unique constraint violation
  let invoiceNumber = invoice.invoice_number
  const MAX_RETRIES = 3
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const { data: inv, error: invError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        project_id: invoice.project_id,
        from_org: invoice.from_org,
        to_org: invoice.to_org,
        status: 'draft' as InvoiceStatus,
        milestone: invoice.milestone ?? null,
        subtotal,
        tax,
        total,
        due_date: invoice.due_date ?? null,
        notes: invoice.notes ?? null,
        created_by: invoice.created_by ?? null,
        created_by_id: invoice.created_by_id ?? null,
      })
      .select()
      .single()

    if (invError) {
      // 23505 = unique_violation — invoice_number collision from concurrent request
      if (invError.code === '23505' && attempt < MAX_RETRIES - 1) {
        console.warn(`[createInvoice] invoice_number collision (attempt ${attempt + 1}), regenerating...`)
        invoiceNumber = await generateInvoiceNumber()
        continue
      }
      console.error('[createInvoice]', invError.message)
      return null
    }

    const invoiceData = inv as Invoice

    // Insert line items
    if (lineItems.length > 0) {
      const items = lineItems.map((item, i) => ({
        invoice_id: invoiceData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        category: item.category ?? null,
        sort_order: item.sort_order ?? i,
      }))
      const { error: itemsError } = await supabase.from('invoice_line_items').insert(items)
      if (itemsError) console.error('[createInvoice] line items', itemsError.message)
    }

    return invoiceData
  }

  return null // Should not reach here, but TypeScript requires it
}

/**
 * Update invoice status with auto-set timestamps.
 * Validates the transition is allowed before applying.
 * Returns null if the transition is invalid or the update fails.
 * - sent: sets sent_at
 * - paid: sets paid_at, paid_amount, payment_method, payment_reference
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  details?: {
    paid_amount?: number
    payment_method?: string
    payment_reference?: string
  },
): Promise<Invoice | null> {
  const supabase = db()

  // Read current status to validate transition
  const { data: current, error: readErr } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .single()
  if (readErr || !current) {
    console.error('[updateInvoiceStatus] read current status', readErr?.message)
    return null
  }
  const currentStatus = (current as { status: InvoiceStatus }).status
  const allowed = getValidInvoiceTransitions(currentStatus)
  if (!allowed.includes(status)) {
    console.error(`[updateInvoiceStatus] invalid transition: ${currentStatus} → ${status}`)
    return null
  }

  const now = new Date().toISOString()
  const updates: Record<string, unknown> = { status }

  if (status === 'sent') {
    updates.sent_at = now
  }
  if (status === 'paid') {
    updates.paid_at = now
    if (details?.paid_amount !== undefined) updates.paid_amount = details.paid_amount
    if (details?.payment_method) updates.payment_method = details.payment_method
    if (details?.payment_reference) updates.payment_reference = details.payment_reference
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId)
    .select()
    .single()
  if (error) {
    console.error('[updateInvoiceStatus]', error.message)
    return null
  }
  return data as Invoice
}

/**
 * Add a line item to an existing invoice. Recalculates totals.
 */
export async function addLineItem(
  invoiceId: string,
  item: { description: string; quantity: number; unit_price: number; category?: string | null },
): Promise<InvoiceLineItem | null> {
  const supabase = db()

  // Get current max sort_order (limit(1) is sufficient here since we only need the max)
  const { data: existing } = await supabase
    .from('invoice_line_items')
    .select('sort_order')
    .eq('invoice_id', invoiceId)
    .order('sort_order', { ascending: false })
    .limit(1)
  // Note: this query already has .limit(1) — no need for a higher limit
  const nextOrder = ((existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1

  const { data, error } = await supabase
    .from('invoice_line_items')
    .insert({
      invoice_id: invoiceId,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total: item.quantity * item.unit_price,
      category: item.category ?? null,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) {
    console.error('[addLineItem]', error.message)
    return null
  }

  // Recalculate invoice totals
  await recalcInvoiceTotals(invoiceId)

  return data as InvoiceLineItem
}

/**
 * Delete a line item and recalculate invoice totals.
 */
export async function deleteLineItem(lineItemId: string, invoiceId: string): Promise<boolean> {
  const supabase = db()
  const { error } = await supabase.from('invoice_line_items').delete().eq('id', lineItemId)
  if (error) {
    console.error('[deleteLineItem]', error.message)
    return false
  }
  await recalcInvoiceTotals(invoiceId)
  return true
}

/**
 * Recalculate subtotal/total on an invoice from its line items.
 * Preserves the current tax value when computing the total.
 */
async function recalcInvoiceTotals(invoiceId: string): Promise<void> {
  const supabase = db()
  const [{ data: items }, { data: inv }] = await Promise.all([
    supabase
      .from('invoice_line_items')
      .select('total')
      .eq('invoice_id', invoiceId)
      .limit(500),
    supabase
      .from('invoices')
      .select('tax')
      .eq('id', invoiceId)
      .single(),
  ])
  const subtotal = (items as { total: number }[] | null)?.reduce((sum, i) => sum + i.total, 0) ?? 0
  const currentTax = (inv as { tax: number } | null)?.tax ?? 0
  const total = subtotal + currentTax
  await supabase.from('invoices').update({ subtotal, total }).eq('id', invoiceId)
}
