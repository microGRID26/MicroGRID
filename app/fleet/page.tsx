'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Nav } from '@/components/Nav'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { cn } from '@/lib/utils'
import {
  loadVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  loadVehicleMaintenance,
  addMaintenance,
  VEHICLE_STATUSES,
} from '@/lib/api/fleet'
import type { Vehicle, MaintenanceRecord, VehicleStatus, MaintenanceType } from '@/lib/api/fleet'
import { loadActiveCrews } from '@/lib/api/crews'
import {
  Truck, Search, Plus, ChevronDown, ChevronUp, Download, ChevronLeft, ChevronRight, LogIn,
} from 'lucide-react'
import { ExpandableRow } from './components/VehicleDetail'
import { AddVehicleModal } from './components/AddVehicleModal'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50

const STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  out_of_service: 'Out of Service',
  retired: 'Retired',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(d: string | null): number | null {
  if (!d) return null
  const target = new Date(d + 'T00:00:00')
  return Math.floor((target.getTime() - Date.now()) / 86400000)
}

function expiryBadge(d: string | null): { label: string; cls: string } | null {
  if (!d) return null
  const days = daysUntil(d)
  if (days === null) return null
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, cls: 'bg-red-500/20 text-red-400' }
  if (days <= 30) return { label: `${days}d left`, cls: 'bg-amber-500/20 text-amber-400' }
  return null
}

type SortField = 'vehicle_number' | 'make' | 'status' | 'assigned_crew' | 'odometer' | 'next_inspection_date' | 'insurance_expiry'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FleetPage() {
  const { user: currentUser, loading: authLoading } = useCurrentUser()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [crewFilter, setCrewFilter] = useState('')
  const [crews, setCrews] = useState<{ id: string; name: string; active: string }[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>('vehicle_number')
  const [sortAsc, setSortAsc] = useState(true)
  const [toast, setToast] = useState<string | null>(null)

  // Add vehicle modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addDraft, setAddDraft] = useState<Partial<Vehicle>>({ status: 'active' })
  const [addSaving, setAddSaving] = useState(false)

  // Maintenance for expanded vehicle
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([])
  const [maintLoading, setMaintLoading] = useState(false)
  const [showAddMaint, setShowAddMaint] = useState(false)
  const [maintDraft, setMaintDraft] = useState<Partial<MaintenanceRecord>>({})
  const [maintSaving, setMaintSaving] = useState(false)

  // Edit mode
  const [editDraft, setEditDraft] = useState<Partial<Vehicle>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Data loading ────────────────────────────────────────────────────────────

  const fetchVehicles = useCallback(async () => {
    setLoading(true)
    const data = await loadVehicles()
    setVehicles(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  useEffect(() => {
    loadActiveCrews().then(res => setCrews((res.data ?? []) as { id: string; name: string; active: string }[]))
  }, [])

  // Load maintenance when expanding
  useEffect(() => {
    if (!expandedId) { setMaintenance([]); return }
    setMaintLoading(true)
    loadVehicleMaintenance(expandedId).then(data => {
      setMaintenance(data)
      setMaintLoading(false)
    })
    // Reset edit mode on expand
    setEditMode(false)
    setShowAddMaint(false)
  }, [expandedId])

  // ── Filtering + sorting ─────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = vehicles
    if (statusFilter) list = list.filter(v => v.status === statusFilter)
    if (crewFilter) list = list.filter(v => v.assigned_crew === crewFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v => {
        if (v.vehicle_number.toLowerCase().includes(q)) return true
        if ((v.make ?? '').toLowerCase().includes(q)) return true
        if ((v.model ?? '').toLowerCase().includes(q)) return true
        if ((v.license_plate ?? '').toLowerCase().includes(q)) return true
        if ((v.assigned_driver ?? '').toLowerCase().includes(q)) return true
        if ((v.vin ?? '').toLowerCase().includes(q)) return true
        return false
      })
    }
    // Sort
    list = [...list].sort((a, b) => {
      let av: string | number = '', bv: string | number = ''
      switch (sortField) {
        case 'vehicle_number': av = a.vehicle_number; bv = b.vehicle_number; break
        case 'make': av = `${a.make ?? ''} ${a.model ?? ''}`; bv = `${b.make ?? ''} ${b.model ?? ''}`; break
        case 'status': av = a.status; bv = b.status; break
        case 'assigned_crew': av = a.assigned_crew ?? ''; bv = b.assigned_crew ?? ''; break
        case 'odometer': av = a.odometer ?? 0; bv = b.odometer ?? 0; break
        case 'next_inspection_date': av = a.next_inspection_date ?? '9999'; bv = b.next_inspection_date ?? '9999'; break
        case 'insurance_expiry': av = a.insurance_expiry ?? '9999'; bv = b.insurance_expiry ?? '9999'; break
      }
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortAsc ? cmp : -cmp
    })
    return list
  }, [vehicles, statusFilter, crewFilter, search, sortField, sortAsc])

  // ── Summary counts ──────────────────────────────────────────────────────────

  const totalCount = vehicles.length
  const activeCount = vehicles.filter(v => v.status === 'active').length
  const maintCount = vehicles.filter(v => v.status === 'maintenance').length
  const upcomingServiceCount = useMemo(() => {
    return vehicles.filter(v => {
      const d = daysUntil(v.next_inspection_date)
      return d !== null && d >= 0 && d <= 30
    }).length
  }, [vehicles])

  // ── Pagination ──────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [search, statusFilter, crewFilter])

  // ── Crew names for dropdown ─────────────────────────────────────────────────

  const crewNames = useMemo(() => {
    const names = new Set<string>()
    for (const v of vehicles) {
      if (v.assigned_crew) names.add(v.assigned_crew)
    }
    for (const c of crews) names.add(c.name)
    return Array.from(names).sort()
  }, [vehicles, crews])

  // ── Sortable header helper ──────────────────────────────────────────────────

  function SortHeader({ field, label, className }: { field: SortField; label: string; className?: string }) {
    return (
      <th
        className={cn('px-3 py-2 text-left text-xs font-medium text-gray-400 cursor-pointer hover:text-white select-none', className)}
        onClick={() => {
          if (sortField === field) setSortAsc(!sortAsc)
          else { setSortField(field); setSortAsc(true) }
        }}
      >
        <span className="flex items-center gap-1">
          {label}
          {sortField === field && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
        </span>
      </th>
    )
  }

  // ── Add vehicle handler ─────────────────────────────────────────────────────

  async function handleAddVehicle() {
    if (!addDraft.vehicle_number?.trim()) return
    setAddSaving(true)
    const result = await addVehicle({
      vehicle_number: addDraft.vehicle_number.trim(),
      vin: addDraft.vin || null,
      year: addDraft.year ?? null,
      make: addDraft.make || null,
      model: addDraft.model || null,
      license_plate: addDraft.license_plate || null,
      color: addDraft.color || null,
      assigned_crew: addDraft.assigned_crew || null,
      assigned_driver: addDraft.assigned_driver || null,
      status: (addDraft.status as VehicleStatus) || 'active',
      odometer: addDraft.odometer ?? null,
      insurance_expiry: addDraft.insurance_expiry || null,
      registration_expiry: addDraft.registration_expiry || null,
      last_inspection_date: addDraft.last_inspection_date || null,
      next_inspection_date: addDraft.next_inspection_date || null,
      notes: addDraft.notes || null,
    })
    if (result) {
      setVehicles(prev => [...prev, result].sort((a, b) => a.vehicle_number.localeCompare(b.vehicle_number)))
      setShowAddModal(false)
      setAddDraft({ status: 'active' })
      showToast('Vehicle added')
    } else {
      showToast('Failed to add vehicle')
    }
    setAddSaving(false)
  }

  // ── Save edit handler ───────────────────────────────────────────────────────

  async function handleSaveEdit(id: string) {
    setEditSaving(true)
    const ok = await updateVehicle(id, editDraft)
    if (ok) {
      setVehicles(prev => prev.map(v => v.id === id ? { ...v, ...editDraft } : v))
      setEditMode(false)
      showToast('Vehicle updated')
    } else {
      showToast('Failed to save')
    }
    setEditSaving(false)
  }

  // ── Delete handler ──────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Delete this vehicle permanently?')) return
    const ok = await deleteVehicle(id)
    if (ok) {
      setVehicles(prev => prev.filter(v => v.id !== id))
      setExpandedId(null)
      showToast('Vehicle deleted')
    } else {
      showToast('Failed to delete — super admin required')
    }
  }

  // ── Add maintenance handler ─────────────────────────────────────────────────

  async function handleAddMaintenance() {
    if (!expandedId || !maintDraft.type) return
    setMaintSaving(true)
    const record = await addMaintenance({
      vehicle_id: expandedId,
      type: maintDraft.type as MaintenanceType,
      description: maintDraft.description || null,
      date: maintDraft.date || null,
      odometer: maintDraft.odometer ?? null,
      cost: maintDraft.cost ?? null,
      vendor: maintDraft.vendor || null,
      next_due_date: maintDraft.next_due_date || null,
      next_due_odometer: maintDraft.next_due_odometer ?? null,
      performed_by: maintDraft.performed_by || null,
      notes: maintDraft.notes || null,
    })
    if (record) {
      setMaintenance(prev => [record, ...prev])
      setShowAddMaint(false)
      setMaintDraft({})
      // Update vehicle odometer if maintenance has higher reading
      if (record.odometer) {
        const v = vehicles.find(v => v.id === expandedId)
        if (v && (v.odometer === null || record.odometer > v.odometer)) {
          await updateVehicle(expandedId, { odometer: record.odometer })
          setVehicles(prev => prev.map(veh => veh.id === expandedId ? { ...veh, odometer: record.odometer } : veh))
        }
      }
      showToast('Maintenance record added')
    } else {
      showToast('Failed to add record')
    }
    setMaintSaving(false)
  }

  // ── CSV export ──────────────────────────────────────────────────────────────

  function exportCSV() {
    const headers = ['Vehicle #', 'Year', 'Make', 'Model', 'VIN', 'License Plate', 'Color', 'Crew', 'Driver', 'Status', 'Odometer', 'Insurance Expiry', 'Registration Expiry', 'Last Inspection', 'Next Inspection']
    const rows = filtered.map(v => [
      v.vehicle_number, v.year ?? '', v.make ?? '', v.model ?? '', v.vin ?? '',
      v.license_plate ?? '', v.color ?? '', v.assigned_crew ?? '', v.assigned_driver ?? '',
      v.status, v.odometer ?? '', v.insurance_expiry ?? '', v.registration_expiry ?? '',
      v.last_inspection_date ?? '', v.next_inspection_date ?? '',
    ])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fleet-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Auth gate ───────────────────────────────────────────────────────────────

  if (authLoading) return <div className="min-h-screen bg-gray-900" />
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LogIn className="w-8 h-8 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Please sign in to access Fleet.</p>
          <a href="/login" className="text-green-400 text-sm hover:underline mt-2 inline-block">Sign in</a>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <Nav active="Fleet" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-green-400" />
            <h1 className="text-xl font-bold">Fleet Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="text-xs px-3 py-1.5 rounded-md bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors flex items-center gap-1.5">
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={() => setShowAddModal(true)} className="text-xs px-3 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white font-medium flex items-center gap-1.5">
              <Plus className="w-3 h-3" /> Add Vehicle
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => { setStatusFilter(''); setCrewFilter('') }}
            className={cn('bg-gray-800 rounded-lg p-4 text-left transition-colors', !statusFilter && !crewFilter ? 'ring-1 ring-green-500/50' : 'hover:bg-gray-750')}
          >
            <p className="text-xs text-gray-400 mb-1">Total Vehicles</p>
            <p className="text-2xl font-bold text-white">{totalCount}</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
            className={cn('bg-gray-800 rounded-lg p-4 text-left transition-colors', statusFilter === 'active' ? 'ring-1 ring-green-500/50' : 'hover:bg-gray-750')}
          >
            <p className="text-xs text-gray-400 mb-1">Active</p>
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'maintenance' ? '' : 'maintenance')}
            className={cn('bg-gray-800 rounded-lg p-4 text-left transition-colors', statusFilter === 'maintenance' ? 'ring-1 ring-amber-500/50' : 'hover:bg-gray-750')}
          >
            <p className="text-xs text-gray-400 mb-1">In Maintenance</p>
            <p className={cn('text-2xl font-bold', maintCount > 0 ? 'text-amber-400' : 'text-white')}>{maintCount}</p>
          </button>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-1">Upcoming Service</p>
            <p className={cn('text-2xl font-bold', upcomingServiceCount > 0 ? 'text-amber-400' : 'text-white')}>
              {upcomingServiceCount}
            </p>
            <p className="text-[10px] text-gray-500">within 30 days</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vehicles..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500"
          >
            <option value="">All Statuses</option>
            {VEHICLE_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            value={crewFilter}
            onChange={e => setCrewFilter(e.target.value)}
            className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500"
          >
            <option value="">All Crews</option>
            {crewNames.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {(statusFilter || crewFilter || search) && (
            <button
              onClick={() => { setStatusFilter(''); setCrewFilter(''); setSearch('') }}
              className="text-xs px-3 py-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-500 text-sm">
              {vehicles.length === 0 ? 'No vehicles yet. Add your first vehicle above.' : 'No vehicles match your filters.'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-700 bg-gray-800/50">
                      <SortHeader field="vehicle_number" label="Vehicle #" />
                      <SortHeader field="make" label="Make / Model" />
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 hidden lg:table-cell">Year</th>
                      <SortHeader field="assigned_crew" label="Crew" />
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 hidden lg:table-cell">Driver</th>
                      <SortHeader field="status" label="Status" />
                      <SortHeader field="odometer" label="Odometer" className="hidden lg:table-cell" />
                      <SortHeader field="next_inspection_date" label="Next Service" className="hidden md:table-cell" />
                      <SortHeader field="insurance_expiry" label="Insurance" className="hidden md:table-cell" />
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-400">Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(v => {
                      const isExpanded = expandedId === v.id
                      const insBadge = expiryBadge(v.insurance_expiry)
                      const regBadge = expiryBadge(v.registration_expiry)
                      const inspDays = daysUntil(v.next_inspection_date)
                      const hasAlerts = !!(insBadge || regBadge || (inspDays !== null && inspDays <= 30))
                      return (
                        <ExpandableRow
                          key={v.id}
                          v={v}
                          isExpanded={isExpanded}
                          onToggle={() => setExpandedId(isExpanded ? null : v.id)}
                          insBadge={insBadge}
                          regBadge={regBadge}
                          inspDays={inspDays}
                          hasAlerts={hasAlerts}
                          maintenance={maintenance}
                          maintLoading={maintLoading}
                          showAddMaint={showAddMaint}
                          setShowAddMaint={setShowAddMaint}
                          maintDraft={maintDraft}
                          setMaintDraft={setMaintDraft}
                          maintSaving={maintSaving}
                          handleAddMaintenance={handleAddMaintenance}
                          editMode={editMode}
                          setEditMode={setEditMode}
                          editDraft={editDraft}
                          setEditDraft={setEditDraft}
                          editSaving={editSaving}
                          handleSaveEdit={handleSaveEdit}
                          handleDelete={handleDelete}
                          crewNames={crewNames}
                          isSuperAdmin={currentUser?.isSuperAdmin ?? false}
                        />
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                  <span className="text-xs text-gray-400">{filtered.length} vehicles</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-400">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="p-1 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <AddVehicleModal
          addDraft={addDraft}
          setAddDraft={setAddDraft}
          addSaving={addSaving}
          onAdd={handleAddVehicle}
          onClose={() => setShowAddModal(false)}
          crewNames={crewNames}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-800 border border-gray-700 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl">
          {toast}
        </div>
      )}
    </div>
  )
}
