import React, { useState } from 'react'
import { addSalesRep, initializeRepDocuments } from '@/lib/api'
import type { SalesTeam, PayScale } from '@/lib/api'
import { X } from 'lucide-react'

export function AddRepModal({ onClose, onSaved, orgId, teams, payScales }: {
  onClose: () => void
  onSaved: () => void
  orgId: string | null
  teams: SalesTeam[]
  payScales: PayScale[]
}) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [teamId, setTeamId] = useState('')
  const [payScaleId, setPayScaleId] = useState('')
  const [roleKey, setRoleKey] = useState('energy_consultant')
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10))

  const ROLE_PAY_SCALE: Record<string, string> = {
    energy_consultant: 'Consultant',
    energy_advisor: 'Consultant',
    project_manager: 'Pro',
    assistant_manager: 'Elite',
    vp: 'Exclusive',
    regional: 'Exclusive',
  }
  const handleRoleChange = (role: string) => {
    setRoleKey(role)
    const scaleName = ROLE_PAY_SCALE[role]
    if (scaleName) {
      const match = payScales.find(s => s.active && s.name === scaleName)
      if (match) setPayScaleId(match.id)
    }
  }
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    setSaving(true)
    const rep = await addSalesRep({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      team_id: teamId || undefined,
      pay_scale_id: payScaleId || undefined,
      role_key: roleKey,
      hire_date: hireDate || undefined,
      status: 'onboarding',
      org_id: orgId || undefined,
    })
    if (rep) {
      await initializeRepDocuments(rep.id, orgId)
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
          <h2 className="text-sm font-semibold text-white">Add Sales Rep</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Last Name *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Team</label>
              <select value={teamId} onChange={e => setTeamId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
                <option value="">-- Unassigned --</option>
                {teams.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Pay Scale</label>
              <select value={payScaleId} onChange={e => setPayScaleId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
                <option value="">-- Select --</option>
                {payScales.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} (${s.per_watt_rate}/W)</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Role</label>
              <select value={roleKey} onChange={e => handleRoleChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500">
                <option value="energy_consultant">Energy Consultant</option>
                <option value="energy_advisor">Energy Advisor</option>
                <option value="project_manager">Project Manager</option>
                <option value="assistant_manager">Assistant Manager</option>
                <option value="vp">VP</option>
                <option value="regional">Regional</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium block mb-1">Hire Date</label>
              <input type="date" value={hireDate} onChange={e => setHireDate(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white focus:outline-none focus:border-green-500" />
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
          <button onClick={save} disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-md">
            {saving ? 'Creating...' : 'Create Rep'}
          </button>
        </div>
      </div>
    </div>
  )
}
