'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Nav } from '@/components/Nav'
import { WarehouseTab } from '@/components/inventory/WarehouseTab'
import { MaterialsTab } from './components/MaterialsTab'
import { PurchaseOrdersTab } from './components/PurchaseOrdersTab'
import {
  loadAllProjectMaterials, loadWarehouseStock, getLowStockItems,
  loadPurchaseOrders,
  MATERIAL_STATUSES,
} from '@/lib/api/inventory'
import type { ProjectMaterial, WarehouseStock, PurchaseOrder } from '@/lib/api/inventory'
import { loadProjects } from '@/lib/api'
import { Package, Warehouse, ShoppingCart, AlertTriangle } from 'lucide-react'
import { useCurrentUser } from '@/lib/useCurrentUser'

type SortField = 'project_id' | 'name' | 'category' | 'quantity' | 'status' | 'expected_date'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

export default function InventoryPage() {
  const { user: authUser, loading: authLoading } = useCurrentUser()
  const [activeTab, setActiveTab] = useState<'materials' | 'warehouse' | 'purchase-orders'>('materials')
  const [materials, setMaterials] = useState<(ProjectMaterial & { project_name: string | null })[]>([])
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([])
  const [projects, setProjects] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir }>({ field: 'project_id', dir: 'asc' })
  const [page, setPage] = useState(1)

  // ── PO state ──────────────────────────────────────────────────────────────
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])

  // ── Low stock alert count (shown in header) ─────────────────────────────
  const [lowStockCount, setLowStockCount] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [mats, projResult, lowItems] = await Promise.all([
        loadAllProjectMaterials(),
        loadProjects({ limit: 2000 }),
        getLowStockItems(),
      ])
      setMaterials(mats)
      const pMap: Record<string, string> = {}
      for (const p of (projResult.data ?? [])) pMap[p.id] = p.name
      setProjects(pMap)
      setLowStockCount(lowItems.length)
      setLoading(false)
    }
    load()
  }, [])

  // Load warehouse when tab switches
  useEffect(() => {
    if (activeTab === 'warehouse' && warehouseStock.length === 0) {
      loadWarehouseStock().then(setWarehouseStock)
    }
  }, [activeTab, warehouseStock.length])

  // Load POs when tab switches
  const loadPOs = useCallback(async () => {
    const pos = await loadPurchaseOrders()
    setPurchaseOrders(pos)
  }, [])

  useEffect(() => {
    if (activeTab === 'purchase-orders' && purchaseOrders.length === 0) {
      loadPOs()
    }
  }, [activeTab, purchaseOrders.length, loadPOs])

  // ── Filtered + sorted materials ──────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = materials

    if (filterStatus) list = list.filter(m => m.status === filterStatus)
    if (filterCategory) list = list.filter(m => m.category === filterCategory)
    if (filterSource) list = list.filter(m => m.source === filterSource)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => {
        const pName = (m.project_name || projects[m.project_id] || '').toLowerCase()
        return (
          m.name.toLowerCase().includes(q) ||
          m.project_id.toLowerCase().includes(q) ||
          pName.includes(q) ||
          (m.vendor ?? '').toLowerCase().includes(q)
        )
      })
    }

    list = [...list].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      const av = (a as unknown as Record<string, unknown>)[sort.field] ?? ''
      const bv = (b as unknown as Record<string, unknown>)[sort.field] ?? ''
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })

    return list
  }, [materials, filterStatus, filterCategory, filterSource, search, sort, projects])

  // ── Summary counts ───────────────────────────────────────────────────────
  const summaryCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of MATERIAL_STATUSES) counts[s] = 0
    for (const m of materials) {
      counts[m.status] = (counts[m.status] || 0) + 1
    }
    return counts
  }, [materials])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [filterStatus, filterCategory, filterSource, search])

  // ── Auth gate: Manager+ required ──────────────────────────────────────────
  const isManager = authUser?.isManager ?? false

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Checking permissions…</div>
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Nav active="Inventory" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white mb-2">Access Restricted</h1>
            <p className="text-sm text-gray-500">Manager or higher role required to view this page.</p>
            <a href="/command" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Command Center
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <Nav active="Inventory" />

      <div className="flex-1 p-4 md:p-6 space-y-4 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <div>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-green-400" />
            Inventory
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Project materials and warehouse stock</p>
        </div>

        {/* Low stock alert (header-level) */}
        {lowStockCount > 0 && activeTab !== 'warehouse' && (
          <button
            onClick={() => setActiveTab('warehouse')}
            className="w-full bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3 flex items-center gap-3 hover:bg-amber-900/40 transition-colors text-left"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-sm text-amber-300">
              {lowStockCount} warehouse item{lowStockCount !== 1 ? 's' : ''} below reorder point
            </span>
          </button>
        )}

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'materials' ? 'border-b-2 border-green-400 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Project Materials
          </button>
          <button
            onClick={() => setActiveTab('purchase-orders')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'purchase-orders' ? 'border-b-2 border-green-400 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Purchase Orders
          </button>
          <button
            onClick={() => setActiveTab('warehouse')}
            className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'warehouse' ? 'border-b-2 border-green-400 text-green-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Warehouse className="w-3.5 h-3.5" /> Warehouse
          </button>
        </div>

        {/* PROJECT MATERIALS TAB */}
        {activeTab === 'materials' && (
          <MaterialsTab
            materials={materials}
            projects={projects}
            loading={loading}
            search={search}
            onSearchChange={setSearch}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            filterCategory={filterCategory}
            onFilterCategoryChange={setFilterCategory}
            filterSource={filterSource}
            onFilterSourceChange={setFilterSource}
            sort={sort}
            onSortChange={setSort}
            page={page}
            onPageChange={setPage}
            pageSize={PAGE_SIZE}
            filtered={filtered}
            summaryCounts={summaryCounts}
          />
        )}

        {/* PURCHASE ORDERS TAB */}
        {activeTab === 'purchase-orders' && (
          <PurchaseOrdersTab
            purchaseOrders={purchaseOrders}
            setPurchaseOrders={setPurchaseOrders}
          />
        )}

        {/* WAREHOUSE TAB */}
        {activeTab === 'warehouse' && (
          <WarehouseTab projects={projects} />
        )}
      </div>
    </div>
  )
}
