import React, { useState, useMemo, useEffect } from 'react'
import { db } from '@/lib/db'
import type { SalesRep } from '@/lib/api'
import { fmtDate } from '@/lib/utils'
import { Users, Shield, Search, Plus, X, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { StatCard } from './StatCard'

interface License {
  id: string
  rep_id: string
  license_type: string
  license_number: string | null
  state: string | null
  expiry_date: string | null
  issued_date: string | null
  status: string
  file_url: string | null
  notes: string | null
  verified_by: string | null
}

interface EditDraft {
  license_number: string
  state: string
  expiry_date: string
  status: string
  file_url: string
  notes: string
}

export function ComplianceTab({ reps, isAdmin }: { reps: SalesRep[]; isAdmin: boolean }) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<EditDraft>({ license_number: '', state: '', expiry_date: '', status: 'active', file_url: '', notes: '' })
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addRepId, setAddRepId] = useState('')
  const [addType, setAddType] = useState('state_license')
  const [addNumber, setAddNumber] = useState('')
  const [addState, setAddState] = useState('')
  const [addExpiry, setAddExpiry] = useState('')
  const [addFileUrl, setAddFileUrl] = useState('')
  const LICENSE_TYPES = ['state_license', 'certification', 'insurance', 'background_check', 'drug_test']
  const STATUS_COLORS: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400',
    expired: 'bg-red-900/40 text-red-400',
    pending: 'bg-amber-900/40 text-amber-400',
    revoked: 'bg-red-900/60 text-red-300',
  }

  useEffect(() => {
    db().from('rep_licenses').select('*').order('expiry_date').limit(500).then(({ data }: { data: License[] | null }) => {
      setLicenses(data ?? [])
    })
  }, [])

  const repMap = useMemo(() => {
    const m = new Map<string, SalesRep>()
    reps.forEach(r => m.set(r.id, r))
    return m
  }, [reps])

  const filtered = useMemo(() => {
    let list = [...licenses]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(l => {
        const rep = repMap.get(l.rep_id)
        return rep && `${rep.first_name} ${rep.last_name}`.toLowerCase().includes(q) || l.license_number?.toLowerCase().includes(q)
      })
    }
    if (filterType) list = list.filter(l => l.license_type === filterType)
    return list
  }, [licenses, search, filterType, repMap])

  const now = new Date()
  const expiringSoon = licenses.filter(l => {
    if (!l.expiry_date || l.status !== 'active') return false
    const d = new Date(l.expiry_date)
    const diff = (d.getTime() - now.getTime()) / 86400000
    return diff <= 30 && diff > 0
  })
  const expired = licenses.filter(l => l.status === 'expired' || (l.expiry_date && new Date(l.expiry_date) < now && l.status === 'active'))

  const reloadLicenses = () => {
    db().from('rep_licenses').select('*').order('expiry_date').limit(500).then(({ data }: { data: License[] | null }) => setLicenses(data ?? []))
  }

  function startEdit(l: License) {
    setEditingId(l.id)
    setEditDraft({ license_number: l.license_number ?? '', state: l.state ?? '', expiry_date: l.expiry_date ?? '', status: l.status, file_url: l.file_url ?? '', notes: l.notes ?? '' })
  }

  async function saveEdit(id: string) {
    await db().from('rep_licenses').update({
      license_number: editDraft.license_number || null,
      state: editDraft.state || null,
      expiry_date: editDraft.expiry_date || null,
      status: editDraft.status,
      file_url: editDraft.file_url || null,
      notes: editDraft.notes || null,
    }).eq('id', id)
    setEditingId(null)
    reloadLicenses()
  }

  async function deleteLicense(id: string) {
    if (!confirm('Delete this license record?')) return
    await db().from('rep_licenses').delete().eq('id', id)
    setExpandedId(null)
    reloadLicenses()
  }

  async function addLicense() {
    if (!addRepId) return
    await db().from('rep_licenses').insert({
      rep_id: addRepId,
      license_type: addType,
      license_number: addNumber || null,
      state: addState || null,
      expiry_date: addExpiry || null,
      file_url: addFileUrl || null,
      status: 'active',
    })
    setShowAdd(false)
    setAddRepId(''); setAddNumber(''); setAddState(''); setAddExpiry(''); setAddFileUrl('')
    reloadLicenses()
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Licenses" value={licenses.length} icon={<Shield className="w-5 h-5" />} accent="green" />
        <StatCard label="Expiring (30d)" value={expiringSoon.length} icon={<AlertTriangle className="w-5 h-5" />} accent="amber" />
        <StatCard label="Expired" value={expired.length} icon={<X className="w-5 h-5" />} accent="red" />
        <StatCard label="Reps Tracked" value={new Set(licenses.map(l => l.rep_id)).size} icon={<Users className="w-5 h-5" />} accent="blue" />
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rep name or license #..."
            className="w-full pl-9 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-md text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-xs text-white">
          <option value="">All Types</option>
          {LICENSE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
        </select>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded-md">
            <Plus className="w-3.5 h-3.5" /> Add License
          </button>
        )}
      </div>

      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-left">
              <th className="px-4 py-2 font-medium">Rep</th>
              <th className="px-4 py-2 font-medium">Type</th>
              <th className="px-4 py-2 font-medium">License #</th>
              <th className="px-4 py-2 font-medium">State</th>
              <th className="px-4 py-2 font-medium">Expiry</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">File</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(l => {
              const rep = repMap.get(l.rep_id)
              const isExpiringSoon = l.expiry_date && l.status === 'active' && new Date(l.expiry_date) > now && (new Date(l.expiry_date).getTime() - now.getTime()) / 86400000 <= 30
              const isExpanded = expandedId === l.id
              const isEditing = editingId === l.id
              return (
                <React.Fragment key={l.id}>
                  <tr className={`border-b border-gray-700/50 hover:bg-gray-750 cursor-pointer ${isExpanded ? 'bg-gray-750' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : l.id)}>
                    <td className="px-4 py-2 text-white font-medium">{rep ? `${rep.first_name} ${rep.last_name}` : 'Unknown'}</td>
                    <td className="px-4 py-2 text-gray-300 capitalize">{l.license_type.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-2 text-gray-300 font-mono">{l.license_number ?? '\u2014'}</td>
                    <td className="px-4 py-2 text-gray-300">{l.state ?? '\u2014'}</td>
                    <td className={`px-4 py-2 ${isExpiringSoon ? 'text-amber-400 font-medium' : 'text-gray-300'}`}>
                      {l.expiry_date ? fmtDate(l.expiry_date) : '\u2014'}
                      {isExpiringSoon && <span className="ml-1 text-[10px]">&#9888;</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[l.status] ?? 'bg-gray-700 text-gray-400'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {l.file_url ? (
                        <a href={l.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-[10px]" onClick={e => e.stopPropagation()}>View</a>
                      ) : '\u2014'}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 bg-gray-900/50 border-b border-gray-700">
                        {isEditing ? (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs" onClick={e => e.stopPropagation()}>
                            <div>
                              <label className="text-[10px] text-gray-500">License #</label>
                              <input value={editDraft.license_number} onChange={e => setEditDraft((d) => ({ ...d, license_number: e.target.value }))}
                                className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white font-mono" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">State</label>
                              <input value={editDraft.state} onChange={e => setEditDraft((d) => ({ ...d, state: e.target.value }))}
                                className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">Expiry Date</label>
                              <input type="date" value={editDraft.expiry_date} onChange={e => setEditDraft((d) => ({ ...d, expiry_date: e.target.value }))}
                                className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">Status</label>
                              <select value={editDraft.status} onChange={e => setEditDraft((d) => ({ ...d, status: e.target.value }))}
                                className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white">
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="pending">Pending</option>
                                <option value="revoked">Revoked</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">File URL</label>
                              <input value={editDraft.file_url} onChange={e => setEditDraft((d) => ({ ...d, file_url: e.target.value }))}
                                className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" placeholder="https://..." />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500">Notes</label>
                              <input value={editDraft.notes} onChange={e => setEditDraft((d) => ({ ...d, notes: e.target.value }))}
                                className="w-full mt-0.5 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white" />
                            </div>
                            <div className="col-span-full flex gap-2 pt-1">
                              <button onClick={() => saveEdit(l.id)} className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-[10px] text-white font-medium">Save</button>
                              <button onClick={() => setEditingId(null)} className="px-3 py-1 text-gray-400 hover:text-white text-[10px]">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="text-gray-500 block text-[10px]">Issued</span>
                              <span className="text-gray-300">{l.issued_date ? fmtDate(l.issued_date) : '\u2014'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px]">Verified By</span>
                              <span className="text-gray-300">{l.verified_by ?? 'Not verified'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px]">Notes</span>
                              <span className="text-gray-300">{l.notes ?? '\u2014'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[10px]">File</span>
                              {l.file_url ? (
                                <a href={l.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Open file</a>
                              ) : <span className="text-gray-500">No file attached</span>}
                            </div>
                            {isAdmin && (
                              <div className="col-span-full flex gap-2 pt-2 border-t border-gray-700/50">
                                <button onClick={(e) => { e.stopPropagation(); startEdit(l) }}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-400 hover:text-blue-300 text-[10px]">
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteLicense(l.id) }}
                                  className="flex items-center gap-1 px-2 py-1 text-red-400 hover:text-red-300 text-[10px]">
                                  <Trash2 className="w-3 h-3" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                {licenses.length === 0 ? 'No licenses tracked yet. Click "Add License" to start.' : 'No licenses match filters.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-semibold text-white">Add License / Certification</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">Sales Rep *</label>
                <select value={addRepId} onChange={e => setAddRepId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
                  <option value="">Select rep...</option>
                  {reps.filter(r => r.status !== 'terminated').map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Type</label>
                  <select value={addType} onChange={e => setAddType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white">
                    {LICENSE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">License #</label>
                  <input value={addNumber} onChange={e => setAddNumber(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">State</label>
                  <input value={addState} onChange={e => setAddState(e.target.value)} placeholder="TX"
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium block mb-1">Expiry Date</label>
                  <input type="date" value={addExpiry} onChange={e => setAddExpiry(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1">File URL (Google Drive / link)</label>
                <input value={addFileUrl} onChange={e => setAddFileUrl(e.target.value)} placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white" />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-gray-800 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">Cancel</button>
              <button onClick={addLicense} disabled={!addRepId}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium rounded-md">
                Add License
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
