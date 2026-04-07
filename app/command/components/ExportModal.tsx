'use client'

import { useState } from 'react'
import { exportProjectsCSV, ALL_EXPORT_FIELDS, DEFAULT_EXPORT_KEYS } from '@/lib/export-utils'
import { usePreferences } from '@/lib/usePreferences'
import type { ExportPreset } from '@/lib/usePreferences'
import type { Project } from '@/types/database'

// ── EXPORT FIELD PICKER ───────────────────────────────────────────────────────
const FIELD_GROUPS = [
  { label: 'Core',        keys: ['id','name','city','address','phone','email'] },
  { label: 'Project',     keys: ['stage','stage_date','pm','sale_date','contract','systemkw','financier','financing_type','disposition','blocker'] },
  { label: 'Team',        keys: ['advisor','consultant','dealer'] },
  { label: 'Permitting',  keys: ['ahj','utility','permit_number','utility_app_number','hoa','esid'] },
  { label: 'Dates',       keys: ['ntp_date','survey_scheduled_date','survey_date','install_scheduled_date','install_complete_date','city_permit_date','utility_permit_date','city_inspection_date','utility_inspection_date','pto_date','in_service_date'] },
  { label: 'Equipment',   keys: ['module','module_qty','inverter','inverter_qty','battery','battery_qty'] },
]

export function ExportModal({ projects, onClose }: { projects: Project[]; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(DEFAULT_EXPORT_KEYS))
  const { prefs, updatePref } = usePreferences()
  const presets = prefs.export_presets
  const [presetName, setPresetName] = useState('')
  const [showSave, setShowSave] = useState(false)

  function toggle(key: string) {
    setSelected(s => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function toggleGroup(keys: string[]) {
    const allOn = keys.every(k => selected.has(k))
    setSelected(s => {
      const n = new Set(s)
      keys.forEach(k => allOn ? n.delete(k) : n.add(k))
      return n
    })
  }

  function loadPreset(preset: ExportPreset) {
    setSelected(new Set(preset.keys))
  }

  function savePreset() {
    if (!presetName.trim()) return
    const newPreset: ExportPreset = { name: presetName.trim(), keys: [...selected] }
    const updated = [...presets.filter(p => p.name !== newPreset.name), newPreset]
    updatePref('export_presets', updated)
    setPresetName('')
    setShowSave(false)
  }

  function deletePreset(name: string) {
    updatePref('export_presets', presets.filter(p => p.name !== name))
  }

  function doExport() {
    exportProjectsCSV(projects, [...selected])
    onClose()
  }

  const fieldMap = Object.fromEntries(ALL_EXPORT_FIELDS.map(f => [f.key, f.label]))

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-semibold text-white">Export CSV</h2>
            <p className="text-xs text-gray-500 mt-0.5">{projects.length} projects · {selected.size} fields selected</p>
          </div>
          <button onClick={onClose} aria-label="Close export dialog" className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Presets row */}
          <div className="flex items-center gap-2 flex-wrap">
            {presets.length > 0 && (
              <select
                onChange={e => {
                  const p = presets.find(pr => pr.name === e.target.value)
                  if (p) loadPreset(p)
                  e.target.value = ''
                }}
                defaultValue=""
                className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-2 py-1"
              >
                <option value="" disabled>Load preset...</option>
                {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
            {!showSave ? (
              <button onClick={() => setShowSave(true)}
                className="text-xs text-green-400 hover:text-green-300 transition-colors">Save preset</button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePreset()}
                  placeholder="Preset name"
                  className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-2 py-1 w-28"
                  autoFocus
                />
                <button onClick={savePreset} className="text-xs text-green-400 hover:text-green-300">Save</button>
                <button onClick={() => setShowSave(false)} className="text-xs text-gray-500 hover:text-white">Cancel</button>
              </div>
            )}
            {presets.length > 0 && (
              <select
                onChange={e => {
                  if (e.target.value) deletePreset(e.target.value)
                  e.target.value = ''
                }}
                defaultValue=""
                className="text-xs bg-gray-800 text-gray-200 border border-gray-700 rounded-md px-2 py-1"
              >
                <option value="" disabled>Delete preset...</option>
                {presets.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => setSelected(new Set(DEFAULT_EXPORT_KEYS))}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Select all</button>
            <span className="text-gray-700">·</span>
            <button onClick={() => setSelected(new Set())}
              className="text-xs text-gray-400 hover:text-white transition-colors">Clear all</button>
          </div>
          {FIELD_GROUPS.map(group => (
            <div key={group.label}>
              <button onClick={() => toggleGroup(group.keys)} className="flex items-center gap-2 mb-2 group">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider group-hover:text-white transition-colors">
                  {group.label}
                </span>
                <span className="text-xs text-gray-600">
                  ({group.keys.filter(k => selected.has(k)).length}/{group.keys.length})
                </span>
              </button>
              <div className="grid grid-cols-2 gap-1">
                {group.keys.map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={selected.has(key)} onChange={() => toggle(key)}
                      className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-green-500 focus:ring-offset-gray-900" />
                    <span className={`text-xs transition-colors ${selected.has(key) ? 'text-gray-200' : 'text-gray-600'}`}>
                      {fieldMap[key] ?? key}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-800">
          <button onClick={onClose}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-md px-4 py-1.5 transition-colors">
            Cancel
          </button>
          <button onClick={doExport} disabled={selected.size === 0}
            className="text-xs bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-medium rounded-md px-4 py-1.5 transition-colors flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
        </div>
      </div>
    </div>
  )
}
