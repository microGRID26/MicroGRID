import React, { useState } from 'react'
import { addSalesTeam, updateSalesTeam } from '@/lib/api'
import type { SalesTeam } from '@/lib/api'
import { X } from 'lucide-react'

export function AddTeamModal({ onClose, onSaved, orgId, users, editing }: {
  onClose: () => void
  onSaved: () => void
  orgId: string | null
  users: { id: string; name: string }[]
  editing?: SalesTeam | null
}) {
  const [name, setName] = useState(editing?.name ?? '')
  const [vpUserId, setVpUserId] = useState(editing?.vp_user_id ?? '')
  const [vpName, setVpName] = useState(editing?.vp_name ?? '')
  const [regionalUserId, setRegionalUserId] = useState(editing?.regional_user_id ?? '')
  const [regionalName, setRegionalName] = useState(editing?.regional_name ?? '')
  const [managerUserId, setManagerUserId] = useState(editing?.manager_user_id ?? '')
  const [managerName, setManagerName] = useState(editing?.manager_name ?? '')
  const [asstManagerUserId, setAsstManagerUserId] = useState(editing?.assistant_manager_user_id ?? '')
  const [asstManagerName, setAsstManagerName] = useState(editing?.assistant_manager_name ?? '')
  const [stackPerWatt, setStackPerWatt] = useState(String(editing?.stack_per_watt ?? '0.40'))
  const [saving, setSaving] = useState(false)

  const selectUser = (setter: (v: string) => void, nameSetter: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    const uid = e.target.value
    setter(uid)
    const u = users.find(u => u.id === uid)
    nameSetter(u?.name ?? '')
  }

  async function save() {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      name: name.trim(),
      vp_user_id: vpUserId || undefined,
      vp_name: vpName || undefined,
      regional_user_id: regionalUserId || undefined,
      regional_name: regionalName || undefined,
      manager_user_id: managerUserId || undefined,
      manager_name: managerName || undefined,
      assistant_manager_user_id: asstManagerUserId || undefined,
      assistant_manager_name: asstManagerName || undefined,
      stack_per_watt: parseFloat(stackPerWatt) || 0.40,
      org_id: orgId || undefined,
    }
    if (editing) {
      await updateSalesTeam(editing.id, payload)
    } else {
      await addSalesTeam(payload)
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-white">{editing ? 'Edit Team' : 'Add Team'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Team Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'VP', value: vpUserId, onChange: selectUser(setVpUserId, setVpName) },
              { label: 'Regional', value: regionalUserId, onChange: selectUser(setRegionalUserId, setRegionalName) },
              { label: 'Manager', value: managerUserId, onChange: selectUser(setManagerUserId, setManagerName) },
              { label: 'Asst. Manager', value: asstManagerUserId, onChange: selectUser(setAsstManagerUserId, setAsstManagerName) },
            ].map(f => (
              <div key={f.label}>
                <label className="text-xs text-gray-400 font-medium block mb-1">{f.label}</label>
                <select value={f.value} onChange={f.onChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
                  <option value="">-- None --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium block mb-1">Stack Rate ($/W)</label>
            <input type="number" step="0.01" value={stackPerWatt} onChange={e => setStackPerWatt(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-md">
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Team'}
          </button>
        </div>
      </div>
    </div>
  )
}
