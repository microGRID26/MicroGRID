'use client'

import { VEHICLE_STATUSES } from '@/lib/api/fleet'
import type { Vehicle, VehicleStatus } from '@/lib/api/fleet'
import { X } from 'lucide-react'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Active',
  maintenance: 'Maintenance',
  out_of_service: 'Out of Service',
  retired: 'Retired',
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface AddVehicleModalProps {
  addDraft: Partial<Vehicle>
  setAddDraft: (v: Partial<Vehicle> | ((prev: Partial<Vehicle>) => Partial<Vehicle>)) => void
  addSaving: boolean
  onAdd: () => void
  onClose: () => void
  crewNames: string[]
}

// ── Component ────────────────────────────────────────────────────────────────

export function AddVehicleModal({
  addDraft, setAddDraft, addSaving, onAdd, onClose, crewNames,
}: AddVehicleModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onKeyDown={e => { if (e.key === 'Escape') onClose() }}>
      <div role="dialog" aria-label="Add Vehicle" className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-sm font-semibold">Add Vehicle</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Vehicle # *</label>
              <input value={addDraft.vehicle_number ?? ''} onChange={e => setAddDraft(d => ({ ...d, vehicle_number: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500"
                placeholder="e.g. Truck 1" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">VIN</label>
              <input value={addDraft.vin ?? ''} onChange={e => setAddDraft(d => ({ ...d, vin: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Year</label>
              <input type="number" value={addDraft.year ?? ''} onChange={e => setAddDraft(d => ({ ...d, year: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Make</label>
              <input value={addDraft.make ?? ''} onChange={e => setAddDraft(d => ({ ...d, make: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500"
                placeholder="e.g. Ford" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Model</label>
              <input value={addDraft.model ?? ''} onChange={e => setAddDraft(d => ({ ...d, model: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500"
                placeholder="e.g. F-250" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">License Plate</label>
              <input value={addDraft.license_plate ?? ''} onChange={e => setAddDraft(d => ({ ...d, license_plate: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Color</label>
              <input value={addDraft.color ?? ''} onChange={e => setAddDraft(d => ({ ...d, color: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Odometer</label>
              <input type="number" value={addDraft.odometer ?? ''} onChange={e => setAddDraft(d => ({ ...d, odometer: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Assigned Crew</label>
              <select value={addDraft.assigned_crew ?? ''} onChange={e => setAddDraft(d => ({ ...d, assigned_crew: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500">
                <option value="">None</option>
                {crewNames.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Assigned Driver</label>
              <input value={addDraft.assigned_driver ?? ''} onChange={e => setAddDraft(d => ({ ...d, assigned_driver: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Insurance Expiry</label>
              <input type="date" value={addDraft.insurance_expiry ?? ''} onChange={e => setAddDraft(d => ({ ...d, insurance_expiry: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Registration Expiry</label>
              <input type="date" value={addDraft.registration_expiry ?? ''} onChange={e => setAddDraft(d => ({ ...d, registration_expiry: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Next Inspection</label>
              <input type="date" value={addDraft.next_inspection_date ?? ''} onChange={e => setAddDraft(d => ({ ...d, next_inspection_date: e.target.value || undefined }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 uppercase mb-1 block">Status</label>
              <select value={addDraft.status ?? 'active'} onChange={e => setAddDraft(d => ({ ...d, status: e.target.value as VehicleStatus }))}
                className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500">
                {VEHICLE_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase mb-1 block">Notes</label>
            <textarea value={addDraft.notes ?? ''} onChange={e => setAddDraft(d => ({ ...d, notes: e.target.value }))}
              className="w-full px-3 py-1.5 text-xs bg-gray-900 border border-gray-700 rounded-md text-white focus:outline-none focus:border-green-500 h-16 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
          <button onClick={onClose} className="text-xs px-4 py-1.5 rounded-md bg-gray-700 text-gray-300 hover:text-white">Cancel</button>
          <button onClick={onAdd} disabled={addSaving || !addDraft.vehicle_number?.trim()}
            className="text-xs px-4 py-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white font-medium disabled:opacity-50">
            {addSaving ? 'Adding...' : 'Add Vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}
