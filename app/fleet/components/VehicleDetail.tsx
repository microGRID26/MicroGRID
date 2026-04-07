'use client'

import { cn, fmtDate, fmt$ } from '@/lib/utils'
import {
  VEHICLE_STATUSES,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_LABELS,
} from '@/lib/api/fleet'
import type { Vehicle, MaintenanceRecord, VehicleStatus, MaintenanceType } from '@/lib/api/fleet'
import { Truck, Plus, Wrench, AlertTriangle } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<VehicleStatus, string> = {
  active: 'bg-green-500/20 text-green-400',
  maintenance: 'bg-amber-500/20 text-amber-400',
  out_of_service: 'bg-red-500/20 text-red-400',
  retired: 'bg-gray-500/20 text-gray-400',
}

const STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  out_of_service: 'Out of Service',
  retired: 'Retired',
}

const MAINT_TYPE_COLORS: Record<MaintenanceType, string> = {
  oil_change: 'bg-blue-500/20 text-blue-400',
  tire_rotation: 'bg-purple-500/20 text-purple-400',
  brake_service: 'bg-red-500/20 text-red-400',
  inspection: 'bg-amber-500/20 text-amber-400',
  repair: 'bg-orange-500/20 text-orange-400',
  other: 'bg-gray-500/20 text-gray-400',
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface ExpandableRowProps {
  v: Vehicle
  isExpanded: boolean
  onToggle: () => void
  insBadge: { label: string; cls: string } | null
  regBadge: { label: string; cls: string } | null
  inspDays: number | null
  hasAlerts: boolean
  maintenance: MaintenanceRecord[]
  maintLoading: boolean
  showAddMaint: boolean
  setShowAddMaint: (v: boolean) => void
  maintDraft: Partial<MaintenanceRecord>
  setMaintDraft: (v: Partial<MaintenanceRecord>) => void
  maintSaving: boolean
  handleAddMaintenance: () => void
  editMode: boolean
  setEditMode: (v: boolean) => void
  editDraft: Partial<Vehicle>
  setEditDraft: (v: Partial<Vehicle> | ((prev: Partial<Vehicle>) => Partial<Vehicle>)) => void
  editSaving: boolean
  handleSaveEdit: (id: string) => void
  handleDelete: (id: string) => void
  crewNames: string[]
  isSuperAdmin: boolean
}

// ── Component ────────────────────────────────────────────────────────────────

export function ExpandableRow({
  v, isExpanded, onToggle, insBadge, regBadge, inspDays, hasAlerts,
  maintenance, maintLoading, showAddMaint, setShowAddMaint,
  maintDraft, setMaintDraft, maintSaving, handleAddMaintenance,
  editMode, setEditMode, editDraft, setEditDraft, editSaving, handleSaveEdit, handleDelete,
  crewNames, isSuperAdmin,
}: ExpandableRowProps) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          'border-b border-gray-700/50 cursor-pointer transition-colors',
          isExpanded ? 'bg-gray-700/30' : 'hover:bg-gray-700/20'
        )}
      >
        <td className="px-3 py-2.5 font-medium text-white">{v.vehicle_number}</td>
        <td className="px-3 py-2.5 text-gray-300">{[v.make, v.model].filter(Boolean).join(' ') || '—'}</td>
        <td className="px-3 py-2.5 text-gray-400 hidden lg:table-cell">{v.year ?? '—'}</td>
        <td className="px-3 py-2.5 text-gray-300">{v.assigned_crew ?? '—'}</td>
        <td className="px-3 py-2.5 text-gray-300 hidden lg:table-cell">{v.assigned_driver ?? '—'}</td>
        <td className="px-3 py-2.5">
          <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[v.status])}>
            {STATUS_LABELS[v.status]}
          </span>
        </td>
        <td className="px-3 py-2.5 text-gray-400 hidden lg:table-cell">{v.odometer ? v.odometer.toLocaleString() : '—'}</td>
        <td className="px-3 py-2.5 text-gray-400 hidden md:table-cell">
          {v.next_inspection_date ? fmtDate(v.next_inspection_date) : '—'}
          {inspDays !== null && inspDays <= 30 && inspDays >= 0 && (
            <span className="ml-1 text-[10px] text-amber-400">({inspDays}d)</span>
          )}
        </td>
        <td className="px-3 py-2.5 text-gray-400 hidden md:table-cell">
          {v.insurance_expiry ? fmtDate(v.insurance_expiry) : '—'}
        </td>
        <td className="px-3 py-2.5">
          {hasAlerts ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </td>
      </tr>

      {/* Expanded detail */}
      {isExpanded && (
        <tr>
          <td colSpan={10} className="px-0 py-0">
            <div className="bg-gray-800/50 border-b border-gray-700 px-5 py-4">
              {/* Vehicle Details + Edit */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-green-400" />
                  {v.vehicle_number} — {[v.year, v.make, v.model].filter(Boolean).join(' ')}
                </h3>
                <div className="flex gap-2">
                  {!editMode && (
                    <button onClick={() => { setEditMode(true); setEditDraft(v) }}
                      className="text-xs px-3 py-1 rounded-md bg-gray-700 text-gray-300 hover:text-white">
                      Edit
                    </button>
                  )}
                  {isSuperAdmin && !editMode && (
                    <button onClick={() => handleDelete(v.id)}
                      className="text-xs px-3 py-1 rounded-md bg-red-900/30 text-red-400 hover:bg-red-900/50">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {editMode ? (
                <div className="mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {([
                      ['vehicle_number', 'Vehicle #', 'text'],
                      ['vin', 'VIN', 'text'],
                      ['year', 'Year', 'number'],
                      ['make', 'Make', 'text'],
                      ['model', 'Model', 'text'],
                      ['license_plate', 'License Plate', 'text'],
                      ['color', 'Color', 'text'],
                      ['odometer', 'Odometer', 'number'],
                      ['assigned_driver', 'Driver', 'text'],
                      ['insurance_expiry', 'Insurance Expiry', 'date'],
                      ['registration_expiry', 'Registration Expiry', 'date'],
                      ['last_inspection_date', 'Last Inspection', 'date'],
                      ['next_inspection_date', 'Next Inspection', 'date'],
                    ] as const).map(([key, label, type]) => (
                      <div key={key}>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">{label}</label>
                        <input
                          type={type}
                          value={String((editDraft as Record<string, unknown>)[key] ?? '')}
                          onChange={e => {
                            const val = type === 'number' ? (e.target.value ? Number(e.target.value) : null) : (e.target.value || null)
                            setEditDraft((d: Partial<Vehicle>) => ({ ...d, [key]: val }))
                          }}
                          className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase mb-1 block">Crew</label>
                      <select value={editDraft.assigned_crew ?? ''} onChange={e => setEditDraft((d: Partial<Vehicle>) => ({ ...d, assigned_crew: e.target.value || null }))}
                        className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500">
                        <option value="">None</option>
                        {crewNames.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 uppercase mb-1 block">Status</label>
                      <select value={editDraft.status ?? 'active'} onChange={e => setEditDraft((d: Partial<Vehicle>) => ({ ...d, status: e.target.value as VehicleStatus }))}
                        className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500">
                        {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="text-[10px] text-gray-400 uppercase mb-1 block">Notes</label>
                    <textarea value={editDraft.notes ?? ''} onChange={e => setEditDraft((d: Partial<Vehicle>) => ({ ...d, notes: e.target.value }))}
                      className="w-full px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500 h-12 resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(v.id)} disabled={editSaving}
                      className="text-xs px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50">
                      {editSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => setEditMode(false)} className="text-xs px-4 py-1.5 rounded-md bg-gray-700 text-gray-300 hover:text-white">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 mb-4 text-xs">
                  <div><span className="text-gray-500">VIN:</span> <span className="text-gray-300 ml-1">{v.vin || '—'}</span></div>
                  <div><span className="text-gray-500">License Plate:</span> <span className="text-gray-300 ml-1">{v.license_plate || '—'}</span></div>
                  <div><span className="text-gray-500">Color:</span> <span className="text-gray-300 ml-1">{v.color || '—'}</span></div>
                  <div><span className="text-gray-500">Odometer:</span> <span className="text-gray-300 ml-1">{v.odometer ? v.odometer.toLocaleString() + ' mi' : '—'}</span></div>
                  <div>
                    <span className="text-gray-500">Insurance:</span>
                    <span className="text-gray-300 ml-1">{v.insurance_expiry ? fmtDate(v.insurance_expiry) : '—'}</span>
                    {insBadge && <span className={cn('ml-1 text-[10px] px-1.5 py-0.5 rounded-full', insBadge.cls)}>{insBadge.label}</span>}
                  </div>
                  <div>
                    <span className="text-gray-500">Registration:</span>
                    <span className="text-gray-300 ml-1">{v.registration_expiry ? fmtDate(v.registration_expiry) : '—'}</span>
                    {regBadge && <span className={cn('ml-1 text-[10px] px-1.5 py-0.5 rounded-full', regBadge.cls)}>{regBadge.label}</span>}
                  </div>
                  <div><span className="text-gray-500">Last Inspection:</span> <span className="text-gray-300 ml-1">{v.last_inspection_date ? fmtDate(v.last_inspection_date) : '—'}</span></div>
                  <div><span className="text-gray-500">Next Inspection:</span> <span className="text-gray-300 ml-1">{v.next_inspection_date ? fmtDate(v.next_inspection_date) : '—'}</span></div>
                  {v.notes && (
                    <div className="col-span-full"><span className="text-gray-500">Notes:</span> <span className="text-gray-300 ml-1">{v.notes}</span></div>
                  )}
                </div>
              )}

              {/* Maintenance History */}
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-gray-400" />
                    Maintenance History
                  </h4>
                  <button onClick={() => setShowAddMaint(!showAddMaint)}
                    className="text-xs px-3 py-1 rounded-md bg-gray-700 text-gray-300 hover:text-white flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Record
                  </button>
                </div>

                {/* Add maintenance form */}
                {showAddMaint && (
                  <div className="bg-gray-900 rounded-lg p-4 mb-3 border border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Type *</label>
                        <select value={maintDraft.type ?? ''} onChange={e => setMaintDraft({ ...maintDraft, type: e.target.value as MaintenanceType })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500">
                          <option value="">Select...</option>
                          {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{MAINTENANCE_TYPE_LABELS[t]}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Date</label>
                        <input type="date" value={maintDraft.date ?? ''} onChange={e => setMaintDraft({ ...maintDraft, date: e.target.value || undefined })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Odometer</label>
                        <input type="number" value={maintDraft.odometer ?? ''} onChange={e => setMaintDraft({ ...maintDraft, odometer: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Cost</label>
                        <input type="number" step="0.01" value={maintDraft.cost ?? ''} onChange={e => setMaintDraft({ ...maintDraft, cost: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500"
                          placeholder="$" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Vendor</label>
                        <input value={maintDraft.vendor ?? ''} onChange={e => setMaintDraft({ ...maintDraft, vendor: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Performed By</label>
                        <input value={maintDraft.performed_by ?? ''} onChange={e => setMaintDraft({ ...maintDraft, performed_by: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Next Due Date</label>
                        <input type="date" value={maintDraft.next_due_date ?? ''} onChange={e => setMaintDraft({ ...maintDraft, next_due_date: e.target.value || undefined })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Next Due Odometer</label>
                        <input type="number" value={maintDraft.next_due_odometer ?? ''} onChange={e => setMaintDraft({ ...maintDraft, next_due_odometer: e.target.value ? Number(e.target.value) : undefined })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Description</label>
                        <input value={maintDraft.description ?? ''} onChange={e => setMaintDraft({ ...maintDraft, description: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 uppercase mb-1 block">Notes</label>
                        <input value={maintDraft.notes ?? ''} onChange={e => setMaintDraft({ ...maintDraft, notes: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-green-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleAddMaintenance} disabled={maintSaving || !maintDraft.type}
                        className="text-xs px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50">
                        {maintSaving ? 'Adding...' : 'Add Record'}
                      </button>
                      <button onClick={() => { setShowAddMaint(false); setMaintDraft({}) }}
                        className="text-xs px-4 py-1.5 rounded-md bg-gray-700 text-gray-300 hover:text-white">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Maintenance table */}
                {maintLoading ? (
                  <div className="text-center py-4">
                    <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : maintenance.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">No maintenance records yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Date</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Type</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Description</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Odometer</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Cost</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Vendor</th>
                          <th className="px-2 py-1.5 text-left text-gray-500 font-medium">Next Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenance.map(m => (
                          <tr key={m.id} className="border-b border-gray-700/30">
                            <td className="px-2 py-1.5 text-gray-300">{m.date ? fmtDate(m.date) : '—'}</td>
                            <td className="px-2 py-1.5">
                              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', MAINT_TYPE_COLORS[m.type as MaintenanceType] ?? MAINT_TYPE_COLORS.other)}>
                                {MAINTENANCE_TYPE_LABELS[m.type as MaintenanceType] ?? m.type}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-gray-300 max-w-[200px] truncate">{m.description || '—'}</td>
                            <td className="px-2 py-1.5 text-gray-400">{m.odometer ? m.odometer.toLocaleString() : '—'}</td>
                            <td className="px-2 py-1.5 text-gray-300">{m.cost ? fmt$(m.cost) : '—'}</td>
                            <td className="px-2 py-1.5 text-gray-400">{m.vendor || '—'}</td>
                            <td className="px-2 py-1.5 text-gray-400">{m.next_due_date ? fmtDate(m.next_due_date) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
