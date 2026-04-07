'use client'

import { useState, useMemo } from 'react'
import { Pagination } from '@/components/Pagination'
import {
  loadPOLineItems, updatePurchaseOrderStatus, updatePurchaseOrder,
  PO_STATUSES, PO_STATUS_COLORS,
} from '@/lib/api/inventory'
import type { PurchaseOrder, POLineItem } from '@/lib/api/inventory'
import { fmtDate, fmt$ } from '@/lib/utils'
import { Search, ChevronDown, ChevronUp, Truck, CheckCircle2, X } from 'lucide-react'
import { searchVendors } from '@/lib/api/vendors'
import type { Vendor } from '@/lib/api/vendors'

export interface PurchaseOrdersTabProps {
  purchaseOrders: PurchaseOrder[]
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>
}

const PO_PAGE_SIZE = 50

export function PurchaseOrdersTab({ purchaseOrders, setPurchaseOrders }: PurchaseOrdersTabProps) {
  const [poSearch, setPOSearch] = useState('')
  const [poFilterStatus, setPOFilterStatus] = useState('')
  const [expandedPO, setExpandedPO] = useState<string | null>(null)
  const [poLineItems, setPOLineItems] = useState<Record<string, POLineItem[]>>({})
  const [poPage, setPOPage] = useState(1)
  const [toast, setToast] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ poId: string; newStatus: string; accurate?: boolean; discrepancy?: string } | null>(null)
  const [poAdvancing, setPOAdvancing] = useState(false)

  // ── Vendor contact lookup cache ────────────────────────────────────────────
  const [vendorInfoCache, setVendorInfoCache] = useState<Record<string, Vendor | null>>({})
  async function lookupVendor(vendorName: string) {
    if (vendorInfoCache[vendorName] !== undefined) return
    setVendorInfoCache(prev => ({ ...prev, [vendorName]: null }))
    const results = await searchVendors(vendorName)
    const match = results.find(v => v.name.toLowerCase() === vendorName.toLowerCase()) ?? results[0] ?? null
    setVendorInfoCache(prev => ({ ...prev, [vendorName]: match }))
  }

  // Load line items when expanding a PO
  async function handleExpandPO(poId: string) {
    if (expandedPO === poId) {
      setExpandedPO(null)
      return
    }
    setExpandedPO(poId)
    if (!poLineItems[poId]) {
      const items = await loadPOLineItems(poId)
      setPOLineItems(prev => ({ ...prev, [poId]: items }))
    }
    // Look up vendor contact info
    const po = purchaseOrders.find(p => p.id === poId)
    if (po?.vendor) lookupVendor(po.vendor)
  }

  // Status advance (with double-submit guard)
  async function handleStatusAdvance(poId: string, newStatus: string) {
    if (poAdvancing) return
    setPOAdvancing(true)
    // Save delivery accuracy when marking as delivered
    if (newStatus === 'delivered' && confirmAction) {
      const updates: Record<string, unknown> = {}
      if (confirmAction.accurate !== undefined) updates.delivery_accurate = confirmAction.accurate
      if (confirmAction.discrepancy) updates.delivery_discrepancy = confirmAction.discrepancy
      if (Object.keys(updates).length > 0) {
        await updatePurchaseOrder(poId, updates)
      }
    }
    setConfirmAction(null)
    const ok = await updatePurchaseOrderStatus(poId, newStatus)
    if (ok) {
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, status: newStatus, updated_at: new Date().toISOString() } : p))
      setToast(`PO updated to ${newStatus}`)
    } else {
      setToast('Failed to update PO status')
    }
    setTimeout(() => setToast(null), 3000)
    setPOAdvancing(false)
  }

  // Save PO field edits
  async function handleSavePOField(poId: string, updates: Partial<PurchaseOrder>) {
    const ok = await updatePurchaseOrder(poId, updates)
    if (ok) {
      setPurchaseOrders(prev => prev.map(p => p.id === poId ? { ...p, ...updates } : p))
      setToast('PO updated')
      setTimeout(() => setToast(null), 3000)
    }
  }

  // ── Filtered POs ────────────────────────────────────────────────────────
  const filteredPOs = useMemo(() => {
    let list = purchaseOrders
    if (poFilterStatus) list = list.filter(p => p.status === poFilterStatus)
    if (poSearch.trim()) {
      const q = poSearch.toLowerCase()
      list = list.filter(p =>
        p.po_number.toLowerCase().includes(q) ||
        p.vendor.toLowerCase().includes(q) ||
        (p.project_id ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [purchaseOrders, poFilterStatus, poSearch])

  const poTotalPages = Math.max(1, Math.ceil(filteredPOs.length / PO_PAGE_SIZE))
  const pagedPOs = filteredPOs.slice((poPage - 1) * PO_PAGE_SIZE, poPage * PO_PAGE_SIZE)

  // ── PO status counts ───────────────────────────────────────────────────
  const poStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of PO_STATUSES) counts[s] = 0
    for (const p of purchaseOrders) counts[p.status] = (counts[p.status] || 0) + 1
    return counts
  }, [purchaseOrders])

  // Reset page when filters change
  // (using a key-based approach since we can't useEffect cleanly for this)
  const filterKey = `${poFilterStatus}|${poSearch}`
  const [lastFilterKey, setLastFilterKey] = useState(filterKey)
  if (filterKey !== lastFilterKey) {
    setLastFilterKey(filterKey)
    if (poPage !== 1) setPOPage(1)
  }

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-green-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Confirmation dialog */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center" onClick={() => setConfirmAction(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-white mb-2">Confirm Status Change</h3>
            <p className="text-xs text-gray-400 mb-4">
              Advance this PO to <span className={`px-1.5 py-0.5 rounded ${PO_STATUS_COLORS[confirmAction.newStatus]}`}>{confirmAction.newStatus}</span>?
              {confirmAction.newStatus === 'delivered' && (
                <span className="block mt-2 text-amber-400">This will also mark all linked materials as delivered.</span>
              )}
            </p>
            {confirmAction.newStatus === 'delivered' && (
              <div className="mb-4 space-y-3 border-t border-gray-700 pt-3">
                <div className="text-[10px] text-gray-500 uppercase font-medium">Delivery Accuracy</div>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmAction(a => a ? { ...a, accurate: true } : a)}
                    className={`flex-1 text-xs py-1.5 rounded border ${confirmAction.accurate === true ? 'bg-green-900/40 border-green-500 text-green-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    All Correct
                  </button>
                  <button onClick={() => setConfirmAction(a => a ? { ...a, accurate: false } : a)}
                    className={`flex-1 text-xs py-1.5 rounded border ${confirmAction.accurate === false ? 'bg-red-900/40 border-red-500 text-red-400' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                    Has Issues
                  </button>
                </div>
                {confirmAction.accurate === false && (
                  <input
                    placeholder="Describe discrepancy (missing items, wrong qty, damage...)"
                    value={confirmAction.discrepancy ?? ''}
                    onChange={e => setConfirmAction(a => a ? { ...a, discrepancy: e.target.value } : a)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-500"
                  />
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="text-xs px-3 py-1.5 rounded bg-gray-700 text-gray-300 hover:bg-gray-600">Cancel</button>
              <button
                onClick={() => handleStatusAdvance(confirmAction.poId, confirmAction.newStatus)}
                disabled={poAdvancing}
                className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {poAdvancing ? 'Updating\u2026' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['draft', 'submitted', 'confirmed', 'shipped', 'delivered'] as const).map(s => (
          <div key={s} className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 capitalize">{s}</div>
            <div className="text-xl font-bold text-white mt-1">{poStatusCounts[s] || 0}</div>
          </div>
        ))}
      </div>

      {/* Vendor Performance -- cycle times + accuracy */}
      {(() => {
        const delivered = purchaseOrders.filter(p => p.status === 'delivered')
        if (delivered.length === 0) return null
        const byVendor = new Map<string, { count: number; totalDays: number; accurate: number; rated: number }>()
        for (const po of delivered) {
          const v = byVendor.get(po.vendor) ?? { count: 0, totalDays: 0, accurate: 0, rated: 0 }
          v.count++
          if (po.submitted_at && po.delivered_at) {
            v.totalDays += Math.round((new Date(po.delivered_at).getTime() - new Date(po.submitted_at).getTime()) / 86400000)
          }
          if (po.delivery_accurate === true) { v.accurate++; v.rated++ }
          else if (po.delivery_accurate === false) { v.rated++ }
          byVendor.set(po.vendor, v)
        }
        const vendors = [...byVendor.entries()].sort((a, b) => b[1].count - a[1].count)
        return (
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Vendor Delivery Performance</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {vendors.map(([name, v]) => (
                <div key={name} className="bg-gray-900 rounded-lg p-3">
                  <div className="text-xs font-medium text-white truncate mb-2">{name}</div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] text-gray-500">POs</div>
                      <div className="text-sm font-bold text-white">{v.count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">Avg Days</div>
                      <div className="text-sm font-bold text-blue-400">{v.count > 0 ? Math.round(v.totalDays / v.count) : '\u2014'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500">Accuracy</div>
                      <div className={`text-sm font-bold ${v.rated > 0 ? (v.accurate / v.rated >= 0.9 ? 'text-green-400' : 'text-amber-400') : 'text-gray-500'}`}>
                        {v.rated > 0 ? `${Math.round(v.accurate / v.rated * 100)}%` : '\u2014'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={poSearch}
            onChange={e => setPOSearch(e.target.value)}
            placeholder="Search PO#, vendor, project..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white placeholder-gray-500"
          />
        </div>
        <select
          value={poFilterStatus}
          onChange={e => setPOFilterStatus(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
        >
          <option value="">All Statuses</option>
          {PO_STATUSES.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* PO Table */}
      {purchaseOrders.length === 0 && !filteredPOs.length ? (
        <div className="text-gray-500 text-sm py-8 text-center">
          No purchase orders yet. Create POs from the Materials tab in a project panel.
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="text-gray-500 text-sm py-8 text-center">
          No purchase orders match your filters.
        </div>
      ) : (
        <>
          <div className="space-y-1">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_120px_100px_80px_80px_100px_100px_auto] gap-2 text-xs text-gray-500 font-medium px-4 py-1.5">
              <span>PO #</span>
              <span>Vendor</span>
              <span>Project</span>
              <span className="text-center">Items</span>
              <span className="text-right">Total</span>
              <span className="text-center">Status</span>
              <span>Expected</span>
              <span></span>
            </div>
            {pagedPOs.map(po => {
              const isExpanded = expandedPO === po.id
              const items = poLineItems[po.id] ?? []
              const statusIdx = (PO_STATUSES as readonly string[]).indexOf(po.status)
              const nextStatus = statusIdx >= 0 && statusIdx < PO_STATUSES.length - 2
                ? PO_STATUSES[statusIdx + 1]
                : null

              return (
                <div key={po.id}>
                  {/* PO Row */}
                  <div
                    className={`grid grid-cols-[1fr_120px_100px_80px_80px_100px_100px_auto] gap-2 items-center text-sm px-4 py-3 rounded-lg transition-colors cursor-pointer ${
                      isExpanded ? 'bg-gray-800 border border-gray-700' : 'bg-gray-800/50 hover:bg-gray-800'
                    }`}
                    onClick={() => handleExpandPO(po.id)}
                  >
                    <div>
                      <span className="text-blue-400 font-mono text-xs font-medium">{po.po_number}</span>
                    </div>
                    <span className="text-white text-xs truncate">{po.vendor}</span>
                    <span className="text-green-400 font-mono text-xs">{po.project_id ?? '\u2014'}</span>
                    <span className="text-xs text-gray-400 text-center">{items.length > 0 ? items.length : '\u2014'}</span>
                    <span className="text-xs text-gray-300 text-right">{po.total_amount ? fmt$(po.total_amount) : '\u2014'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded text-center ${PO_STATUS_COLORS[po.status] ?? PO_STATUS_COLORS.draft}`}>
                      {po.status}
                    </span>
                    <span className="text-xs text-gray-400">{po.expected_delivery ?? '\u2014'}</span>
                    <span>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                        : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                    </span>
                  </div>

                  {/* Expanded PO Detail */}
                  {isExpanded && (
                    <div className="bg-gray-800 border border-gray-700 border-t-0 rounded-b-lg p-5 space-y-4 -mt-1">
                      {/* Status timeline */}
                      <div className="flex items-center gap-1">
                        {PO_STATUSES.filter(s => s !== 'cancelled').map((s, i) => {
                          const currentIdx = (PO_STATUSES as readonly string[]).indexOf(po.status)
                          const thisIdx = PO_STATUSES.indexOf(s)
                          const isActive = thisIdx <= currentIdx && po.status !== 'cancelled'
                          const isCurrent = s === po.status
                          return (
                            <div key={s} className="flex items-center gap-1">
                              {i > 0 && (
                                <div className={`w-6 h-0.5 ${isActive ? 'bg-green-500' : 'bg-gray-700'}`} />
                              )}
                              <div
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  isCurrent
                                    ? PO_STATUS_COLORS[s]
                                    : isActive
                                      ? 'bg-green-900/30 text-green-500'
                                      : 'bg-gray-900 text-gray-600'
                                }`}
                              >
                                {s}
                              </div>
                            </div>
                          )
                        })}
                        {po.status === 'cancelled' && (
                          <span className="ml-2 px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 font-medium">cancelled</span>
                        )}
                      </div>

                      {/* Vendor contact info */}
                      {(() => {
                        const vi = vendorInfoCache[po.vendor]
                        if (!vi) return null
                        return (vi.contact_phone || vi.contact_email || vi.contact_name) ? (
                          <div className="bg-gray-900 rounded-lg px-3 py-2 flex flex-wrap gap-4 text-xs">
                            <span className="text-gray-400 font-medium">Vendor Contact:</span>
                            {vi.contact_name && <span className="text-gray-300">{vi.contact_name}</span>}
                            {vi.contact_phone && <span className="text-blue-400">{vi.contact_phone}</span>}
                            {vi.contact_email && <span className="text-blue-400">{vi.contact_email}</span>}
                          </div>
                        ) : null
                      })()}

                      {/* PO header details */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500 block">Created</span>
                          <span className="text-gray-300">{fmtDate(po.created_at)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Submitted</span>
                          <span className="text-gray-300">{po.submitted_at ? fmtDate(po.submitted_at) : '\u2014'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Tracking #</span>
                          <span className="text-gray-300">{po.tracking_number || '\u2014'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Expected Delivery</span>
                          <span className="text-gray-300">{po.expected_delivery || '\u2014'}</span>
                        </div>
                      </div>

                      {/* Line items table */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-2">Line Items</h4>
                        {items.length === 0 ? (
                          <div className="text-xs text-gray-600 py-2">Loading line items...</div>
                        ) : (
                          <div className="bg-gray-900 rounded-lg overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-800 text-gray-500">
                                  <th className="text-left px-3 py-1.5">Item</th>
                                  <th className="text-center px-3 py-1.5">Qty</th>
                                  <th className="text-right px-3 py-1.5">Unit Price</th>
                                  <th className="text-right px-3 py-1.5">Total</th>
                                  <th className="text-left px-3 py-1.5">Notes</th>
                                </tr>
                              </thead>
                              <tbody>
                                {items.map(item => (
                                  <tr key={item.id} className="border-b border-gray-800/50">
                                    <td className="px-3 py-1.5 text-white">{item.name}</td>
                                    <td className="px-3 py-1.5 text-center text-gray-300">{item.quantity}</td>
                                    <td className="px-3 py-1.5 text-right text-gray-300">{item.unit_price ? fmt$(item.unit_price) : '\u2014'}</td>
                                    <td className="px-3 py-1.5 text-right text-gray-300">{item.total_price ? fmt$(item.total_price) : '\u2014'}</td>
                                    <td className="px-3 py-1.5 text-gray-500 truncate max-w-[150px]">{item.notes || '\u2014'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      <div>
                        <h4 className="text-xs font-semibold text-gray-400 mb-1">Notes</h4>
                        <p className="text-xs text-gray-300">{po.notes || 'No notes.'}</p>
                      </div>

                      {/* Cycle time + Delivery accuracy */}
                      {po.status === 'delivered' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-700">
                          <div>
                            <span className="text-gray-500 text-xs block">Cycle Time</span>
                            <span className="text-white text-sm font-semibold">
                              {po.submitted_at && po.delivered_at
                                ? `${Math.round((new Date(po.delivered_at).getTime() - new Date(po.submitted_at).getTime()) / 86400000)}d`
                                : '\u2014'}
                            </span>
                            <span className="text-[10px] text-gray-500 block">submit &rarr; deliver</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs block">Delivered</span>
                            <span className="text-white text-sm">{fmtDate(po.delivered_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs block">Accuracy</span>
                            {po.delivery_accurate === true && <span className="text-green-400 text-sm font-medium">All Correct</span>}
                            {po.delivery_accurate === false && <span className="text-red-400 text-sm font-medium">Has Issues</span>}
                            {po.delivery_accurate == null && <span className="text-gray-500 text-sm">Not rated</span>}
                          </div>
                          {po.delivery_discrepancy && (
                            <div>
                              <span className="text-gray-500 text-xs block">Discrepancy</span>
                              <span className="text-red-300 text-xs">{po.delivery_discrepancy}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                        {nextStatus && po.status !== 'cancelled' && (
                          <button
                            onClick={() => setConfirmAction({ poId: po.id, newStatus: nextStatus })}
                            className="text-xs px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-500 transition-colors flex items-center gap-1"
                          >
                            {nextStatus === 'delivered' && <Truck className="w-3 h-3" />}
                            {nextStatus === 'confirmed' && <CheckCircle2 className="w-3 h-3" />}
                            Advance to {nextStatus}
                          </button>
                        )}
                        {po.status !== 'cancelled' && po.status !== 'delivered' && (
                          <button
                            onClick={() => setConfirmAction({ poId: po.id, newStatus: 'cancelled' })}
                            className="text-xs px-3 py-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Cancel PO
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{filteredPOs.length} PO{filteredPOs.length !== 1 ? 's' : ''}</span>
            <Pagination
              currentPage={poPage}
              totalCount={filteredPOs.length}
              pageSize={PO_PAGE_SIZE}
              hasMore={poPage < poTotalPages}
              onPrevPage={() => setPOPage(p => Math.max(1, p - 1))}
              onNextPage={() => setPOPage(p => Math.min(poTotalPages, p + 1))}
            />
          </div>
        </>
      )}
    </>
  )
}
