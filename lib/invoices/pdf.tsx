// lib/invoices/pdf.tsx — Server-rendered invoice PDF template
//
// Renders a MicroGRID-branded invoice PDF given an Invoice row, its line items,
// and the from/to Organization rows. Called from POST /api/invoices/[id]/send
// which pipes the rendered buffer to Resend as an email attachment.
//
// Intentionally stateless: no DB access, no network. All data comes in via props.

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from '@react-pdf/renderer'

import type { Invoice, InvoiceLineItem, Organization } from '@/types/database'
import { MILESTONE_LABELS } from '@/lib/api/invoices'

// ── Types ───────────────────────────────────────────────────────────────────

export interface InvoicePDFProps {
  invoice: Invoice
  lineItems: InvoiceLineItem[]
  fromOrg: Pick<Organization, 'id' | 'name' | 'billing_email' | 'billing_address'>
  toOrg: Pick<Organization, 'id' | 'name' | 'billing_email' | 'billing_address'>
}

// ── Formatters ──────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// ── Styles ──────────────────────────────────────────────────────────────────

const BRAND_GREEN = '#1D9E75'
const INK = '#111827'
const MUTED = '#6b7280'
const DIVIDER = '#e5e7eb'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: INK,
    lineHeight: 1.4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: BRAND_GREEN,
  },
  brand: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
  },
  brandTag: {
    fontSize: 9,
    color: MUTED,
    marginTop: 2,
  },
  invoiceBlock: {
    alignItems: 'flex-end',
  },
  invoiceLabel: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  invoiceNumber: {
    fontSize: 11,
    color: MUTED,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  metaBlock: {
    flex: 1,
    marginRight: 16,
  },
  metaLabel: {
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    color: INK,
  },
  metaValueBold: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  table: {
    marginTop: 8,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  tableHeaderCell: {
    fontSize: 8,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Helvetica-Bold',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: DIVIDER,
  },
  cellDescription: { flex: 4 },
  cellQuantity: { flex: 1, textAlign: 'right' },
  cellUnitPrice: { flex: 1.2, textAlign: 'right' },
  cellTotal: { flex: 1.2, textAlign: 'right' },
  totalsBlock: {
    marginLeft: 'auto',
    width: '45%',
    marginTop: 8,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: MUTED,
  },
  totalsValue: {
    fontSize: 10,
    color: INK,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: BRAND_GREEN,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: INK,
  },
  grandTotalValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: BRAND_GREEN,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
    paddingTop: 8,
    textAlign: 'center',
    lineHeight: 1.5,
  },
})

// ── React component ────────────────────────────────────────────────────────

export function InvoicePDF({ invoice, lineItems, fromOrg, toOrg }: InvoicePDFProps) {
  const milestoneLabel = invoice.milestone ? (MILESTONE_LABELS[invoice.milestone] ?? invoice.milestone) : null

  return (
    <Document
      title={`Invoice ${invoice.invoice_number}`}
      author={fromOrg.name}
      subject={`Invoice from ${fromOrg.name} to ${toOrg.name}`}
    >
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{fromOrg.name}</Text>
            <Text style={styles.brandTag}>Solar energy, engineered right.</Text>
          </View>
          <View style={styles.invoiceBlock}>
            <Text style={styles.invoiceLabel}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Bill to / meta */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bill To</Text>
            <Text style={styles.metaValueBold}>{toOrg.name}</Text>
            {toOrg.billing_address ? (
              <Text style={styles.metaValue}>{toOrg.billing_address}</Text>
            ) : null}
            {toOrg.billing_email ? (
              <Text style={styles.metaValue}>{toOrg.billing_email}</Text>
            ) : null}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>From</Text>
            <Text style={styles.metaValueBold}>{fromOrg.name}</Text>
            {fromOrg.billing_address ? (
              <Text style={styles.metaValue}>{fromOrg.billing_address}</Text>
            ) : null}
            {fromOrg.billing_email ? (
              <Text style={styles.metaValue}>{fromOrg.billing_email}</Text>
            ) : null}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Issued</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.created_at)}</Text>
            <Text style={[styles.metaLabel, { marginTop: 8 }]}>Due</Text>
            <Text style={styles.metaValue}>{fmtDate(invoice.due_date)}</Text>
            {milestoneLabel ? (
              <>
                <Text style={[styles.metaLabel, { marginTop: 8 }]}>Milestone</Text>
                <Text style={styles.metaValue}>{milestoneLabel}</Text>
              </>
            ) : null}
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.cellDescription]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.cellQuantity]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.cellUnitPrice]}>Unit Price</Text>
            <Text style={[styles.tableHeaderCell, styles.cellTotal]}>Total</Text>
          </View>
          {lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={styles.cellDescription}>{item.description}</Text>
              <Text style={styles.cellQuantity}>{item.quantity}</Text>
              <Text style={styles.cellUnitPrice}>{fmtMoney(item.unit_price)}</Text>
              <Text style={styles.cellTotal}>{fmtMoney(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{fmtMoney(invoice.subtotal)}</Text>
          </View>
          {invoice.tax > 0 ? (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax</Text>
              <Text style={styles.totalsValue}>{fmtMoney(invoice.tax)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{fmtMoney(invoice.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Payment due within 30 days of invoice date. Questions: billing@gomicrogridenergy.com{'\n'}
          {fromOrg.name} · Generated {fmtDate(invoice.created_at)}
        </Text>
      </Page>
    </Document>
  )
}

// ── Render helper ───────────────────────────────────────────────────────────

/**
 * Render the invoice PDF to a Node Buffer suitable for attaching to a Resend
 * email or streaming as an HTTP response body.
 */
export async function renderInvoicePDF(props: InvoicePDFProps): Promise<Buffer> {
  return renderToBuffer(<InvoicePDF {...props} />)
}
