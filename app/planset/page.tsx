'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Nav } from '@/components/Nav'
import { calculateSldLayout } from '@/lib/sld-layout'
import { SldRenderer } from '@/components/SldRenderer'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { handleApiError } from '@/lib/errors'
import { loadProjectById, searchProjects } from '@/lib/api'
import { buildPlansetData, DURACELL_DEFAULTS } from '@/lib/planset-types'
import { autoDistributeStrings } from '@/lib/planset-calcs'
import { SheetPV1, SheetPV2, SheetPV3, SheetPV5, SheetPV51, SheetPV6, SheetPV7, SheetPV71, SheetPV8 } from '@/components/planset'
import type { PlansetData, PlansetOverrides, PlansetString, PlansetRoofFace } from '@/lib/planset-types'
import type { Project } from '@/types/database'
import { Search, ChevronDown, ChevronUp, X, Loader2, FileText } from 'lucide-react'

// ── PRINT CSS ───────────────────────────────────────────────────────────────

const PRINT_CSS = `
@page {
  size: 17in 11in;
  margin: 0.25in;
}
* { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
body { background: white; }
.sheet {
  width: 16.5in;
  height: 10.5in;
  page-break-after: always;
  page-break-inside: avoid;
  display: grid;
  grid-template-columns: 1fr 2.5in;
  border: 2px solid #000;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8pt;
  position: relative;
  overflow: hidden;
}
.sheet:last-child { page-break-after: auto; }
.sheet.sld-sheet { grid-template-columns: 1fr; }
.sheet-content {
  padding: 0.15in 0.2in;
  overflow: hidden;
}
.sheet-sidebar {
  border-left: 1px solid #000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.stamp-box {
  border: 1.5px solid #000;
  height: 0.8in;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7pt;
  color: #999;
  margin: 0.05in 0.05in;
}
.title-block {
  border-top: 1px solid #000;
  padding: 0.08in;
  font-size: 6.5pt;
  line-height: 1.5;
}
.title-block .contractor-line { font-weight: bold; font-size: 7pt; }
.title-block .project-line { font-weight: bold; margin-top: 3pt; }
.title-block .sheet-name { font-weight: bold; font-size: 8pt; margin-top: 4pt; }
.title-block .sheet-number { font-weight: bold; font-size: 14pt; }
.title-block .sheet-of { font-size: 7pt; color: #333; }

/* Tables */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7pt;
}
.data-table th {
  background: #111;
  color: white;
  padding: 3px 4px;
  text-align: left;
  font-weight: bold;
  font-size: 6pt;
  text-transform: uppercase;
}
.data-table td {
  padding: 2px 4px;
  border-bottom: 1px solid #ddd;
}
.data-table tr:nth-child(even) td {
  background: #f5f5f5;
}
.data-table .label-cell {
  font-weight: bold;
  color: #999;
  width: 35%;
}
.data-table .value-cell {
  color: #111;
}

/* Section headers */
.section-header {
  background: #111;
  color: white;
  padding: 4px 6px;
  font-size: 8pt;
  font-weight: bold;
  text-transform: uppercase;
  text-align: center;
}
.section-header-alt {
  background: #555;
  color: white;
  padding: 4px 6px;
  font-size: 8pt;
  font-weight: bold;
  text-align: center;
}
.section-header-green {
  background: #1D9E75;
  color: white;
  padding: 4px 6px;
  font-size: 8pt;
  font-weight: bold;
  text-align: center;
}

/* Section box */
.section-box {
  border: 1px solid #111;
  margin-bottom: 6px;
  overflow: hidden;
}

/* Sheet title */
.sheet-title {
  font-size: 14pt;
  font-weight: bold;
  color: #111;
  margin-bottom: 2pt;
}
.sheet-subtitle {
  font-size: 8pt;
  color: #555;
  margin-bottom: 8pt;
}

/* Multi-column layouts */
.cols-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.cols-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

/* Label boxes for PV-5.1 and PV-7 */
.label-box {
  border: 1.5px solid #111;
  overflow: hidden;
}
.label-box.red { border-color: #cc0000; border-width: 2px; }
.label-box.yellow { border-color: #cc9900; border-width: 2px; }
.label-box-header {
  background: #111;
  color: white;
  padding: 3px 6px;
  font-size: 8pt;
  font-weight: bold;
  text-align: center;
  position: relative;
}
.label-box.red .label-box-header { background: #cc0000; }
.label-box.yellow .label-box-header { background: #cc9900; }
.label-box-nec {
  position: absolute;
  right: 5px;
  top: 3px;
  font-size: 6pt;
  color: #ddd;
  font-weight: normal;
}
.label-box-content {
  padding: 5px 8px;
  font-size: 6.5pt;
  line-height: 1.6;
}
.label-box-content .warn-text { color: #cc0000; font-weight: bold; }
.label-box-content .bold-text { font-weight: bold; }

/* Warning label outer border for PV-7 */
.warning-outer {
  border: 3px solid #111;
  padding: 3px;
}
.warning-outer.red { border-color: #cc0000; }
.warning-outer.yellow { border-color: #cc9900; }

/* Placard for PV-7.1 */
.placard {
  border: 1.5px solid #111;
  overflow: hidden;
}
.placard-header {
  background: #111;
  color: white;
  padding: 4px 8px;
  font-size: 8pt;
  font-weight: bold;
  text-align: center;
}
.placard-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.5pt;
}
.placard-table td {
  padding: 2px 6px;
  border-bottom: 1px solid #eee;
}
.placard-table tr:nth-child(even) td { background: #f5f5f5; }
.placard-table .p-label { font-weight: bold; color: #111; width: 30%; }
.placard-table .p-value { color: #333; }

/* Small font table for conductor schedule */
.small-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 5.5pt;
}
.small-table th {
  background: #111;
  color: white;
  padding: 2px 3px;
  text-align: left;
  font-weight: bold;
  font-size: 5pt;
  text-transform: uppercase;
  white-space: nowrap;
}
.small-table td {
  padding: 1px 3px;
  border-bottom: 1px solid #ddd;
  white-space: nowrap;
}
.small-table tr:nth-child(even) td { background: #f5f5f5; }

/* BOM table */
.bom-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7pt;
}
.bom-table th {
  background: #111;
  color: white;
  padding: 3px 6px;
  text-align: left;
  font-weight: bold;
  font-size: 6.5pt;
}
.bom-table td {
  padding: 2px 6px;
  border-bottom: 1px solid #ddd;
}
.bom-table tr:nth-child(even) td { background: #f5f5f5; }
.bom-table .bom-label { font-weight: bold; color: #111; }

/* Status colors */
.pass { color: #006600; font-weight: bold; }
.fail { color: #cc0000; font-weight: bold; }

/* Notes */
.notes-list {
  font-size: 5.5pt;
  line-height: 1.8;
  color: #333;
  padding: 4px;
}
.notes-list li { margin-bottom: 1px; }

/* Sheet index / unit index */
.index-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 6.5pt;
}
.index-table td { padding: 1px 4px; }
.index-table .idx-key { font-weight: bold; color: #111; width: 50px; }
.index-table .idx-val { color: #333; }

/* SLD sheet — SVG fills the content area */
.sld-content svg {
  width: 100%;
  height: 100%;
  display: block;
}

/* Site plan image — fit within sheet */
.sheet img { max-width: 100%; max-height: 100%; object-fit: contain; }

/* Installation notes at bottom of sheets */
.install-notes {
  font-size: 6.5pt;
  color: #333;
  margin-top: 6px;
  line-height: 1.6;
}
.install-notes strong { color: #111; }

/* Formula note */
.formula-note {
  font-size: 6.5pt;
  color: #555;
  margin-top: 4px;
  line-height: 1.5;
}
.formula-note strong { color: #111; }

@media print {
  .sheet { break-after: page; break-inside: avoid; }
  .sheet:last-child { break-after: auto; }
}
`

// Sheet + TitleBlockHtml components imported from @/components/planset/

// ── PRINT HANDLER ───────────────────────────────────────────────────────────

function handlePrintAll(data: PlansetData) {
  const sheetsContainer = document.getElementById('planset-sheets')
  if (!sheetsContainer) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    const t = document.createElement('div')
    t.textContent = 'Please allow popups to print.'
    t.className = 'fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-red-600 text-white'
    document.body.appendChild(t)
    setTimeout(() => t.remove(), 3000)
    return
  }

  // Extract only the .sheet elements (skip CRM chrome wrappers)
  const sheetElements = sheetsContainer.querySelectorAll('.sheet')
  let sheetsHtml = ''
  sheetElements.forEach(el => {
    sheetsHtml += el.outerHTML
  })

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <title>Plan Set — ${data.projectId} ${data.owner}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>${sheetsHtml}</body>
</html>`)

  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
}

// ── PROJECT SELECTOR ────────────────────────────────────────────────────────

function ProjectSelector({ onSelect }: { onSelect: (id: string) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Pick<Project, 'id' | 'name' | 'city'>[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); setShowDropdown(false); return }
    setSearching(true)
    try {
      const results = await searchProjects(q, 15)
      setSearchResults(results)
      setShowDropdown(results.length > 0)
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery, doSearch])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="max-w-2xl mx-auto" ref={containerRef}>
      <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-8 h-8 text-green-400" />
          <div>
            <h2 className="text-xl font-bold text-white">Generate Plan Set</h2>
            <p className="text-sm text-gray-400 mt-1">Search for a project by ID or homeowner name</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
            placeholder="e.g. PROJ-29857 or Aguilera"
            className="w-full pl-10 pr-10 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            autoFocus
          />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />}
          {!searching && searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowDropdown(false) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          )}

          {showDropdown && (
            <div className="absolute z-50 mt-1 w-full bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-72 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => { onSelect(p.id); setShowDropdown(false); setSearchQuery(`${p.id} ${p.name}`) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-700 transition-colors border-b border-gray-700/50 last:border-0"
                >
                  <span className="text-xs font-mono text-green-400">{p.id}</span>
                  <span className="text-sm text-white ml-2">{p.name}</span>
                  {p.city && <span className="text-xs text-gray-500 ml-2">{p.city}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Tip: You can also link directly with <code className="text-gray-400">?project=PROJ-XXXXX</code>
        </p>
      </div>
    </div>
  )
}

// ── OVERRIDES PANEL ─────────────────────────────────────────────────────────

function OverridesPanel({ data, strings, onStringsChange, overrides, onOverridesChange, roofFaces, onRoofFacesChange, sitePlanImageUrl, onSitePlanChange }: {
  data: PlansetData
  strings: PlansetString[]
  onStringsChange: (s: PlansetString[]) => void
  overrides: PlansetOverrides
  onOverridesChange: (o: PlansetOverrides) => void
  roofFaces: PlansetRoofFace[]
  onRoofFacesChange: (rf: PlansetRoofFace[]) => void
  sitePlanImageUrl: string | null
  onSitePlanChange: (url: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)

  const updateStringModules = (idx: number, modules: number) => {
    const updated = [...strings]
    updated[idx] = {
      ...updated[idx],
      modules,
      vocCold: parseFloat((modules * data.vocCorrected).toFixed(1)),
      vmpNominal: parseFloat((modules * data.panelVmp).toFixed(1)),
    }
    onStringsChange(updated)
  }

  const addString = () => {
    const nextId = strings.length > 0 ? Math.max(...strings.map(s => s.id)) + 1 : 1
    const nextMppt = strings.length > 0 ? Math.max(...strings.map(s => s.mppt)) + 1 : 1
    onStringsChange([...strings, {
      id: nextId,
      mppt: nextMppt,
      modules: 9,
      roofFace: 1,
      vocCold: parseFloat((9 * data.vocCorrected).toFixed(1)),
      vmpNominal: parseFloat((9 * data.panelVmp).toFixed(1)),
      current: data.panelImp,
    }])
  }

  const removeString = (idx: number) => {
    onStringsChange(strings.filter((_, i) => i !== idx))
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        <span>Overrides &amp; String Configuration ({strings.length} strings, {strings.reduce((s, x) => s + x.modules, 0)} modules)</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-4 space-y-6">
          {/* Building overrides */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Building Info</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Roof Type', key: 'roofType' as const, val: overrides.roofType ?? data.roofType },
                { label: 'Rafter Size', key: 'rafterSize' as const, val: overrides.rafterSize ?? data.rafterSize },
                { label: 'Stories', key: 'stories' as const, val: String(overrides.stories ?? data.stories) },
                { label: 'Wind Speed (MPH)', key: 'windSpeed' as const, val: String(overrides.windSpeed ?? data.windSpeed) },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={e => {
                      const v = e.target.value
                      if (f.key === 'stories' || f.key === 'windSpeed') {
                        onOverridesChange({ ...overrides, [f.key]: parseInt(v) || 0 })
                      } else {
                        onOverridesChange({ ...overrides, [f.key]: v })
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Existing system overrides */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Existing System (Optional)</h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Panel Model', key: 'existingPanelModel' as const, val: overrides.existingPanelModel ?? data.existingPanelModel ?? '' },
                { label: 'Panel Count', key: 'existingPanelCount' as const, val: String(overrides.existingPanelCount ?? data.existingPanelCount ?? '') },
                { label: 'Panel Wattage', key: 'existingPanelWattage' as const, val: String(overrides.existingPanelWattage ?? data.existingPanelWattage ?? '') },
                { label: 'Inverter Model', key: 'existingInverterModel' as const, val: overrides.existingInverterModel ?? data.existingInverterModel ?? '' },
                { label: 'Inverter Count', key: 'existingInverterCount' as const, val: String(overrides.existingInverterCount ?? data.existingInverterCount ?? '') },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={e => {
                      const v = e.target.value
                      if (['existingPanelCount', 'existingPanelWattage', 'existingInverterCount'].includes(f.key)) {
                        onOverridesChange({ ...overrides, [f.key]: parseInt(v) || undefined })
                      } else {
                        onOverridesChange({ ...overrides, [f.key]: v || undefined })
                      }
                    }}
                    className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white focus:ring-1 focus:ring-green-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Site Plan Image */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Site Plan Image (PV-3)</h3>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer px-4 py-2 text-sm rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors">
                {sitePlanImageUrl ? 'Replace Image' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (sitePlanImageUrl) URL.revokeObjectURL(sitePlanImageUrl)
                    const url = URL.createObjectURL(file)
                    onSitePlanChange(url)
                    e.target.value = ''
                  }}
                />
              </label>
              {sitePlanImageUrl && (
                <button
                  onClick={() => {
                    URL.revokeObjectURL(sitePlanImageUrl)
                    onSitePlanChange(null)
                  }}
                  className="px-3 py-2 text-sm rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
                >
                  Remove
                </button>
              )}
              {sitePlanImageUrl && (
                <div className="flex items-center gap-2">
                  <img src={sitePlanImageUrl} alt="Site plan preview" className="h-16 rounded border border-gray-600" />
                  <span className="text-xs text-gray-500">Preview</span>
                </div>
              )}
              {!sitePlanImageUrl && (
                <span className="text-xs text-gray-500">No image uploaded. Accepts image files or PDF.</span>
              )}
            </div>
          </div>

          {/* Roof Faces */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Roof Faces</h3>
            {roofFaces.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-3">No roof faces derived yet. Add strings with roof face assignments to populate.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-700">
                    <th className="text-left py-1 px-2">Roof Face</th>
                    <th className="text-left py-1 px-2">Modules</th>
                    <th className="text-left py-1 px-2">Tilt (&deg;)</th>
                    <th className="text-left py-1 px-2">Azimuth (&deg;)</th>
                  </tr>
                </thead>
                <tbody>
                  {roofFaces.map((rf, i) => (
                    <tr key={rf.id} className="border-b border-gray-700/50">
                      <td className="py-1 px-2 text-gray-300">Roof {rf.id}</td>
                      <td className="py-1 px-2 text-gray-400 text-xs">{rf.modules}</td>
                      <td className="py-1 px-2">
                        <input value={rf.tilt} onChange={e => {
                          const updated = [...roofFaces]
                          updated[i] = { ...rf, tilt: parseInt(e.target.value) || 0 }
                          onRoofFacesChange(updated)
                        }} className="w-16 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                      </td>
                      <td className="py-1 px-2">
                        <input value={rf.azimuth} onChange={e => {
                          const updated = [...roofFaces]
                          updated[i] = { ...rf, azimuth: parseInt(e.target.value) || 0 }
                          onRoofFacesChange(updated)
                        }} className="w-16 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="text-xs text-gray-600 mt-2">Roof faces are auto-derived from string assignments. Edit tilt and azimuth here.</p>
          </div>

          {/* String configuration table */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">String Configuration</h3>
              <button onClick={addString}
                className="text-xs px-3 py-1 rounded bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors">
                + Add String
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-700">
                  <th className="text-left py-1 px-2">String</th>
                  <th className="text-left py-1 px-2">MPPT</th>
                  <th className="text-left py-1 px-2">Modules</th>
                  <th className="text-left py-1 px-2">Roof Face</th>
                  <th className="text-left py-1 px-2">Voc Cold</th>
                  <th className="text-left py-1 px-2">Vmp</th>
                  <th className="text-left py-1 px-2">Imp</th>
                  <th className="text-left py-1 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {strings.map((s, i) => (
                  <tr key={s.id} className="border-b border-gray-700/50">
                    <td className="py-1 px-2 text-gray-300">S{s.id}</td>
                    <td className="py-1 px-2">
                      <input value={s.mppt} onChange={e => {
                        const updated = [...strings]; updated[i] = { ...s, mppt: parseInt(e.target.value) || 1 }; onStringsChange(updated)
                      }} className="w-14 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                    </td>
                    <td className="py-1 px-2">
                      <input value={s.modules} onChange={e => updateStringModules(i, parseInt(e.target.value) || 0)}
                        className="w-14 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                    </td>
                    <td className="py-1 px-2">
                      <input value={s.roofFace} onChange={e => {
                        const updated = [...strings]; updated[i] = { ...s, roofFace: parseInt(e.target.value) || 1 }; onStringsChange(updated)
                      }} className="w-14 px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs text-white" />
                    </td>
                    <td className="py-1 px-2 text-gray-400 text-xs">{s.vocCold.toFixed(1)}V</td>
                    <td className="py-1 px-2 text-gray-400 text-xs">{s.vmpNominal.toFixed(1)}V</td>
                    <td className="py-1 px-2 text-gray-400 text-xs">{s.current}A</td>
                    <td className="py-1 px-2">
                      <button onClick={() => removeString(i)} className="text-red-400/60 hover:text-red-400 text-xs">
                        <X className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {strings.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No strings configured. Click &quot;+ Add String&quot; or auto-distribute will be used.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── PAGE COMPONENT ──────────────────────────────────────────────────────────

export default function PlanSetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900"><Nav active="Redesign" /></div>}>
      <PlanSetPageInner />
    </Suspense>
  )
}

function PlanSetPageInner() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const searchParams = useSearchParams()
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null)

  const [projectId, setProjectId] = useState<string>('')
  const [data, setData] = useState<PlansetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [strings, setStrings] = useState<PlansetString[]>([])
  const [roofFaces, setRoofFaces] = useState<PlansetRoofFace[]>([])
  const [overrides, setOverrides] = useState<PlansetOverrides>({})
  const [sitePlanUrl, setSitePlanUrl] = useState<string | null>(null)

  const loadProject = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const project = await loadProjectById(id)
      if (!project) {
        setToast({ message: `Project ${id} not found`, type: 'error' })
        setTimeout(() => setToast(null), 3000)
        return
      }

      const panelCount = overrides.panelCount ?? project.module_qty ?? 0
      const d = DURACELL_DEFAULTS
      const panelVoc = overrides.panelVoc ?? d.panelVoc
      const absCoeff = Math.abs(d.vocTempCoeff / 100)
      const vocCorrected = panelVoc * (1 + absCoeff * (25 - d.designTempLow))
      const panelVmp = overrides.panelVmp ?? d.panelVmp
      const panelImp = overrides.panelImp ?? d.panelImp
      const inverterCount = overrides.inverterCount ?? project.inverter_qty ?? d.inverterCount
      const mpptsPerInverter = overrides.mpptsPerInverter ?? d.mpptsPerInverter
      const stringsPerMppt = overrides.stringsPerMppt ?? d.stringsPerMppt
      const maxVoc = overrides.maxPvPower ? 500 : d.maxVoc

      const autoStrings = autoDistributeStrings(
        panelCount, vocCorrected, panelVmp, panelImp,
        inverterCount, mpptsPerInverter, stringsPerMppt, maxVoc
      )

      const finalStrings = overrides.strings ?? autoStrings
      setStrings(finalStrings)

      const plansetData = buildPlansetData(project, { ...overrides, strings: finalStrings, roofFaces: roofFaces.length > 0 ? roofFaces : undefined, sitePlanImageUrl: sitePlanUrl ?? undefined })
      setRoofFaces(plansetData.roofFaces)
      setData(plansetData)
      setProjectId(id)
    } catch (err) {
      handleApiError(err, '[planset] loadProject')
      setToast({ message: 'Failed to load project', type: 'error' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLoading(false)
    }
  }, [overrides, roofFaces, sitePlanUrl])

  useEffect(() => {
    const urlProject = searchParams.get('project')
    if (urlProject && !projectId) {
      loadProject(urlProject)
    }
  }, [searchParams, projectId, loadProject])

  const rebuildData = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const project = await loadProjectById(projectId)
      if (!project) return
      const plansetData = buildPlansetData(project, { ...overrides, strings, roofFaces: roofFaces.length > 0 ? roofFaces : undefined, sitePlanImageUrl: sitePlanUrl ?? undefined })
      setData(plansetData)
    } finally {
      setLoading(false)
    }
  }, [projectId, strings, overrides, roofFaces, sitePlanUrl])

  const rebuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!projectId) return
    if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current)
    rebuildTimerRef.current = setTimeout(() => rebuildData(), 500)
    return () => { if (rebuildTimerRef.current) clearTimeout(rebuildTimerRef.current) }
  }, [projectId, strings, overrides, roofFaces, sitePlanUrl, rebuildData])

  const clearProject = () => {
    setProjectId('')
    setData(null)
    setStrings([])
    setRoofFaces([])
    setOverrides({})
    if (sitePlanUrl) URL.revokeObjectURL(sitePlanUrl)
    setSitePlanUrl(null)
  }

  if (!userLoading && currentUser && !currentUser.isManager) {
    return (
      <>
        <Nav active="Redesign" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-lg text-gray-400">Access Restricted</p>
            <p className="text-sm text-gray-500 mt-2">Plan sets are available to Managers and above.</p>
          </div>
        </div>
      </>
    )
  }

  // Screen-mode scale for 11x17 sheets to fit in a browser window
  const screenScale = 0.55

  return (
    <div className="min-h-screen bg-gray-900">
      <Nav active="Redesign" />

      <div className="max-w-[1200px] mx-auto px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-green-400 animate-spin mr-3" />
            <span className="text-gray-400 text-sm">Loading project data...</span>
          </div>
        )}

        {!loading && !data && (
          <ProjectSelector onSelect={loadProject} />
        )}

        {!loading && data && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Plan Set: {data.projectId} {data.owner}
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  {data.address} &mdash; {data.systemDcKw.toFixed(2)} kW DC / {data.totalStorageKwh} kWh ESS
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={clearProject}
                  className="px-4 py-2 text-sm rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                  Change Project
                </button>
                <a href="/redesign"
                  className="px-4 py-2 text-sm rounded-md bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                  Back to Redesign
                </a>
                <button
                  onClick={() => handlePrintAll(data)}
                  className="px-5 py-2 text-sm font-medium rounded-md bg-green-600 hover:bg-green-500 text-white transition-colors">
                  Download as PDF
                </button>
                <span className="text-xs text-gray-500">Select &quot;Save as PDF&quot; in the print dialog</span>
              </div>
            </div>

            <OverridesPanel
              data={data}
              strings={strings}
              onStringsChange={setStrings}
              overrides={overrides}
              onOverridesChange={setOverrides}
              roofFaces={roofFaces}
              onRoofFacesChange={setRoofFaces}
              sitePlanImageUrl={sitePlanUrl}
              onSitePlanChange={setSitePlanUrl}
            />

            {/* Sheets — rendered at print size, scaled down for screen */}
            <div id="planset-sheets" className="space-y-8">
              {[
                { id: 'PV-1', label: 'Cover Page & General Notes', component: <SheetPV1 data={data} /> },
                { id: 'PV-2', label: 'Project Data', component: <SheetPV2 data={data} /> },
                { id: 'PV-3', label: 'Site Plan', component: <SheetPV3 data={data} /> },
                { id: 'PV-5', label: 'Single Line Diagram', component: <SheetPV5 data={data} /> },
                { id: 'PV-5.1', label: 'PCS Labels', component: <SheetPV51 data={data} /> },
                { id: 'PV-6', label: 'Wiring Calculations', component: <SheetPV6 data={data} /> },
                { id: 'PV-7', label: 'Warning Labels', component: <SheetPV7 data={data} /> },
                { id: 'PV-7.1', label: 'Equipment Placards', component: <SheetPV71 data={data} /> },
                { id: 'PV-8', label: 'Conductor Schedule & BOM', component: <SheetPV8 data={data} /> },
              ].map(sheet => (
                <div key={sheet.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-green-400 bg-gray-800 px-2 py-1 rounded">{sheet.id}</span>
                    <span className="text-sm text-gray-400">{sheet.label}</span>
                  </div>
                  <div className="border border-gray-700 rounded-lg overflow-hidden" style={{
                    width: `${16.5 * 96 * screenScale}px`,
                    height: `${10.5 * 96 * screenScale}px`,
                  }}>
                    <div style={{
                      transform: `scale(${screenScale})`,
                      transformOrigin: 'top left',
                      width: '16.5in',
                      height: '10.5in',
                      background: 'white',
                    }}>
                      {sheet.component}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 mb-4 text-center text-xs text-gray-600">
              Generated by MicroGRID &mdash; {data.drawnDate} &mdash; For PE Review Only
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
        }`}>{toast.message}</div>
      )}
    </div>
  )
}
