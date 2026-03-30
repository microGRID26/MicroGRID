'use client'

import { useEffect, useState } from 'react'
import { loadEngineeringConfig, updateEngineeringConfig } from '@/lib/api/engineering-config'
import type { EngineeringConfig } from '@/lib/api/engineering-config'
import { SaveBtn } from './shared'

const CONFIG_FIELDS: { key: string; label: string; description: string; type: 'text' | 'number' | 'toggle' }[] = [
  {
    key: 'exclusive_partner_org_slug',
    label: 'Exclusive Partner Org Slug',
    description: 'The organization slug of the exclusive engineering partner (e.g., "rush" for Rush Engineering).',
    type: 'text',
  },
  {
    key: 'design_fee',
    label: 'Design Fee ($)',
    description: 'Flat fee per funded project at installation. Rush invoices this amount per funded project.',
    type: 'number',
  },
  {
    key: 'auto_route_enabled',
    label: 'Auto-Route Enabled',
    description: 'When enabled, all new engineering assignments are automatically routed to the exclusive partner. EPCs cannot select a different partner.',
    type: 'toggle',
  },
]

export function EngineeringConfigManager() {
  const [config, setConfig] = useState<EngineeringConfig | null>(null)
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    async function load() {
      const data = await loadEngineeringConfig()
      setConfig(data)
      setDraft({ ...data })
    }
    load()
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const updateDraft = (key: string, value: string) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const save = async () => {
    if (!config) return
    setSaving(true)
    let allOk = true
    for (const field of CONFIG_FIELDS) {
      const newVal = draft[field.key]
      const oldVal = config[field.key]
      if (newVal !== oldVal) {
        const ok = await updateEngineeringConfig(field.key, newVal)
        if (!ok) {
          allOk = false
          break
        }
      }
    }
    setSaving(false)
    if (allOk) {
      setConfig({ ...draft } as EngineeringConfig)
      setHasChanges(false)
      flash('Engineering config saved')
    } else {
      flash('Save failed — check console')
    }
  }

  if (!config) {
    return <div className="text-gray-500 text-sm">Loading engineering config...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {toast && (
        <div className="fixed bottom-5 right-5 bg-green-700 text-white text-xs px-4 py-2 rounded-md shadow-lg z-[200]">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Engineering Configuration</h2>
          <p className="text-xs text-gray-500 mt-0.5">Rush Engineering auto-routing and design fee settings</p>
        </div>
      </div>

      <div className="space-y-6">
        {CONFIG_FIELDS.map(field => (
          <div key={field.key} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">{field.label}</label>
              {field.type === 'toggle' && (
                <button
                  onClick={() => updateDraft(field.key, draft[field.key] === 'true' ? 'false' : 'true')}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    draft[field.key] === 'true' ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    draft[field.key] === 'true' ? 'left-5' : 'left-0.5'
                  }`} />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 mb-3">{field.description}</p>
            {field.type === 'text' && (
              <input
                value={draft[field.key] ?? ''}
                onChange={e => updateDraft(field.key, e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white
                           focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            )}
            {field.type === 'number' && (
              <div className="relative w-48">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="number"
                  value={draft[field.key] ?? ''}
                  onChange={e => updateDraft(field.key, e.target.value)}
                  className="w-full pl-7 bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm text-white
                             focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
        <p className="text-xs text-gray-500 leading-relaxed">
          <strong className="text-gray-400">How auto-routing works:</strong> When enabled, all design
          assignments submitted by EPCs are automatically sent to the configured exclusive partner
          (currently <span className="text-green-400">{draft.exclusive_partner_org_slug || '—'}</span>).
          The design fee of <span className="text-green-400">${draft.design_fee || '0'}</span> is
          invoiced at the installation milestone for each funded project.
        </p>
      </div>

      <div className="flex justify-end mt-4">
        <SaveBtn onClick={save} saving={saving} />
      </div>
    </div>
  )
}
