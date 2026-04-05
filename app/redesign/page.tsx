'use client'

import { useState, useRef, useEffect } from 'react'
import { Nav } from '@/components/Nav'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { handleApiError } from '@/lib/errors'
import { Calculator, Sun } from 'lucide-react'
import type { ExistingSystem, TargetSystem, RoofFace, Results } from './components/types'
import { DEFAULT_EXISTING, DEFAULT_TARGET } from './components/defaults'
import { ExistingSystemForm } from './components/ExistingSystemForm'
import { TargetSystemForm } from './components/TargetSystemForm'
import { ResultsPanel } from './components/ResultsPanel'

// ── PAGE ─────────────────────────────────────────────────────────────────────

export default function RedesignPage() {
  const { user: redesignUser, loading: redesignUserLoading } = useCurrentUser()

  // Role gate: Manager+ only
  if (!redesignUserLoading && redesignUser && !redesignUser.isManager) {
    return (
      <>
        <Nav active="Redesign" />
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-gray-400">Access Restricted</p>
            <p className="text-sm text-gray-500 mt-2">Redesign is available to Managers and above.</p>
            <a href="/command" className="inline-block mt-4 text-xs text-blue-400 hover:text-blue-300 transition-colors">
              ← Back to Command Center
            </a>
          </div>
        </div>
      </>
    )
  }

  const [existing, setExisting] = useState<ExistingSystem>(DEFAULT_EXISTING)
  const [target, setTarget] = useState<TargetSystem>(DEFAULT_TARGET)
  const [results, setResults] = useState<Results | null>(null)
  const [showExisting, setShowExisting] = useState(true)
  const [showTarget, setShowTarget] = useState(true)
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'|'info'} | null>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => { if (scrollTimer.current) clearTimeout(scrollTimer.current) }
  }, [])

  // ── Updaters ───────────────────────────────────────────────────────────────
  function updateExisting<K extends keyof ExistingSystem>(key: K, val: ExistingSystem[K]) {
    setExisting(prev => ({ ...prev, [key]: val }))
  }

  function updateTarget<K extends keyof TargetSystem>(key: K, val: TargetSystem[K]) {
    setTarget(prev => ({ ...prev, [key]: val }))
  }

  function updateRoofFace(idx: number, key: keyof RoofFace, val: number) {
    setExisting(prev => {
      const faces = [...prev.roofFaces]
      faces[idx] = { ...faces[idx], [key]: val }
      return { ...prev, roofFaces: faces }
    })
  }

  function handleRoofFaceCountChange(count: number) {
    const clamped = Math.max(1, Math.min(5, count))
    setExisting(prev => {
      const faces = [...prev.roofFaces]
      while (faces.length < clamped) faces.push({ panelCount: 0, azimuth: 180, tilt: 20, roofArea: 0 })
      return { ...prev, roofFaceCount: clamped, roofFaces: faces.slice(0, clamped) }
    })
  }

  // ── Calculate ──────────────────────────────────────────────────────────────
  function calculate() {
    // Validate required fields
    const errors: string[] = []
    if (!target.panelWattage || target.panelWattage <= 0) errors.push('Target panel wattage must be > 0')
    if (!target.panelVoc || target.panelVoc <= 0) errors.push('Target panel Voc must be > 0')
    if (!target.panelVmp || target.panelVmp <= 0) errors.push('Target panel Vmp must be > 0')
    if (!target.maxVoc || target.maxVoc <= 0) errors.push('Target max Voc must be > 0')
    if (!target.designTempLow && target.designTempLow !== 0) errors.push('Design temp low is required')
    if (!target.vocTempCoeff && target.vocTempCoeff !== 0) errors.push('Voc temp coefficient is required')
    if (!target.inverterCount || target.inverterCount <= 0) errors.push('Inverter count must be > 0')
    if (!target.mpptsPerInverter || target.mpptsPerInverter <= 0) errors.push('MPPTs per inverter must be > 0')
    if (!target.stringsPerMppt || target.stringsPerMppt <= 0) errors.push('Strings per MPPT must be > 0')
    if (!existing.panelWattage || existing.panelWattage <= 0) errors.push('Existing panel wattage must be > 0')
    if (errors.length > 0) {
      setToast({ message: 'Validation errors: ' + errors.join(', '), type: 'error' }); setTimeout(() => setToast(null), 3000)
      return
    }
    try {
    const absCoeff = Math.abs(target.vocTempCoeff / 100)

    // String sizing
    const vocCorrected = target.panelVoc * (1 + absCoeff * (25 - target.designTempLow))
    const maxModulesPerString = Math.floor(target.maxVoc / vocCorrected)
    const vmpHot = target.panelVmp * (1 - absCoeff * 50)
    const minModulesPerString = Math.ceil(target.mpptMin / vmpHot)

    // Recommended: highest value <= max that keeps Vmp*modules within MPPT range
    let recommendedStringSize = minModulesPerString
    for (let n = maxModulesPerString; n >= minModulesPerString; n--) {
      if (n * target.panelVmp <= target.mpptMax) {
        recommendedStringSize = n
        break
      }
    }

    if (recommendedStringSize <= 0) {
      setToast({ message: 'Invalid string configuration — check panel/inverter specs', type: 'error' }); setTimeout(() => setToast(null), 3000)
      return
    }

    if (target.panelWattage <= 0) {
      setToast({ message: 'Target panel wattage must be greater than zero', type: 'error' }); setTimeout(() => setToast(null), 3000)
      return
    }

    const totalStringInputs = target.inverterCount * target.mpptsPerInverter * target.stringsPerMppt

    // Panel fit estimates per roof face
    const panelAreaSqFt = target.panelLengthMm > 0 && target.panelWidthMm > 0
      ? (target.panelLengthMm * target.panelWidthMm / 1_000_000) * 10.764
      : 0

    const panelFitEstimates = existing.roofFaces.slice(0, existing.roofFaceCount).map((rf, i) => {
      let newCount: number
      let method: string
      if (panelAreaSqFt > 0 && rf.roofArea > 0) {
        newCount = Math.floor(rf.roofArea / panelAreaSqFt)
        method = 'area-based'
      } else {
        newCount = target.panelWattage > 0
          ? Math.floor(rf.panelCount * (existing.panelWattage / target.panelWattage) * 1.05)
          : 0
        method = 'ratio-based'
      }
      return { roofIndex: i, oldCount: rf.panelCount, newCount, method }
    })

    const newTotalPanels = panelFitEstimates.reduce((s, e) => s + e.newCount, 0)

    // Auto string configuration — distribute panels evenly, never below minimum
    const stringConfigs: { mppt: number; string: number; modules: number; vocCold: number; vmpNominal: number; current: number; roofFaceIndex: number }[] = []

    // Step 1: figure out how many strings we need and size them evenly
    const maxStrings = totalStringInputs
    const neededStrings = Math.min(Math.ceil(newTotalPanels / recommendedStringSize), maxStrings)
    const baseSize = Math.floor(newTotalPanels / neededStrings)
    const extraPanels = newTotalPanels % neededStrings

    // Build string sizes: distribute remainder across first N strings
    const stringSizes: number[] = []
    for (let i = 0; i < neededStrings; i++) {
      let size = baseSize + (i < extraPanels ? 1 : 0)
      // Clamp to max modules per string
      if (size > maxModulesPerString) size = maxModulesPerString
      stringSizes.push(size)
    }

    // Step 2: assign strings to roof faces proportionally
    const roofFaceAssignments: number[] = [] // which roof face each string belongs to
    let stringIdx = 0
    for (let ri = 0; ri < panelFitEstimates.length && stringIdx < stringSizes.length; ri++) {
      let roofRemaining = panelFitEstimates[ri].newCount
      while (roofRemaining > 0 && stringIdx < stringSizes.length) {
        const take = Math.min(stringSizes[stringIdx], roofRemaining)
        if (take < minModulesPerString && roofRemaining < minModulesPerString) {
          // Not enough panels left on this roof for a full string — move to next roof
          break
        }
        roofFaceAssignments[stringIdx] = ri
        roofRemaining -= stringSizes[stringIdx]
        stringIdx++
      }
    }
    // Any unassigned strings get -1 (overflow)
    while (stringIdx < stringSizes.length) {
      roofFaceAssignments[stringIdx] = -1
      stringIdx++
    }

    // Step 3: build string configs with inverter/MPPT assignment
    for (let i = 0; i < stringSizes.length; i++) {
      const mpptGlobal = Math.floor(i / target.stringsPerMppt) + 1
      const stringInMppt = (i % target.stringsPerMppt) + 1
      const modules = stringSizes[i]

      stringConfigs.push({
        mppt: mpptGlobal,
        string: stringInMppt,
        modules,
        vocCold: parseFloat((modules * vocCorrected).toFixed(1)),
        vmpNominal: parseFloat((modules * target.panelVmp).toFixed(1)),
        current: target.panelImp,
        roofFaceIndex: roofFaceAssignments[i] ?? -1,
      })
    }

    // Engineering notes
    const engineeringNotes: string[] = []
    const newSystemDc = (newTotalPanels * target.panelWattage) / 1000
    const totalMaxPv = (target.inverterCount * target.maxPvPower) / 1000

    if (newSystemDc > totalMaxPv) {
      engineeringNotes.push(`WARNING: System DC (${newSystemDc.toFixed(1)} kW) exceeds total inverter PV capacity (${totalMaxPv.toFixed(1)} kW)`)
    }

    for (const sc of stringConfigs) {
      if (sc.vocCold > target.maxVoc) {
        engineeringNotes.push(`WARNING: MPPT ${sc.mppt} String ${sc.string} Voc_cold (${sc.vocCold}V) exceeds max Voc (${target.maxVoc}V)`)
      }
      if (sc.vmpNominal < target.mpptMin) {
        engineeringNotes.push(`WARNING: MPPT ${sc.mppt} String ${sc.string} Vmp (${sc.vmpNominal}V) below MPPT minimum (${target.mpptMin}V)`)
      }
    }

    if (newTotalPanels !== existing.panelCount) {
      engineeringNotes.push('Structural letter may need update — panel count changed')
    }

    engineeringNotes.push('String calculations require PE review before permitting')

    const existingSystemDc = (existing.panelCount * existing.panelWattage) / 1000
    const existingTotalAc = existing.inverterCount * existing.inverterAcPower
    const newTotalAc = target.inverterCount * 15 // Using model name for kW
    const existingTotalStorage = existing.batteryCount * existing.batteryCapacity
    const newTotalStorage = target.batteryCount * target.batteryCapacity

    setResults({
      vocCorrected: parseFloat(vocCorrected.toFixed(2)),
      maxModulesPerString,
      minModulesPerString,
      recommendedStringSize,
      totalStringInputs,
      vmpHot: parseFloat(vmpHot.toFixed(2)),
      panelFitEstimates,
      stringConfigs,
      engineeringNotes,
      newTotalPanels,
      newSystemDc: parseFloat(newSystemDc.toFixed(2)),
      existingSystemDc: parseFloat(existingSystemDc.toFixed(2)),
      newTotalAc,
      existingTotalAc,
      newTotalStorage,
      existingTotalStorage,
    })
    // Scroll to results after render
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      document.getElementById('redesign-results')?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
    } catch (err) {
      handleApiError(err, '[redesign] calculate')
      setToast({ message: 'Calculation error: ' + (err instanceof Error ? err.message : String(err)), type: 'error' }); setTimeout(() => setToast(null), 3000)
    }
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav active="Redesign" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Sun className="w-6 h-6 text-green-400" />
            <h1 className="text-xl font-bold">Solar System Redesign Tool</h1>
          </div>
          <a href="/batch"
            className="flex items-center gap-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Calculator className="w-4 h-4" />
            Batch Processor — Multiple Projects
          </a>
        </div>

        {/* Input Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ExistingSystemForm
            existing={existing}
            showExisting={showExisting}
            setShowExisting={setShowExisting}
            updateExisting={updateExisting}
            updateRoofFace={updateRoofFace}
            handleRoofFaceCountChange={handleRoofFaceCountChange}
          />
          <TargetSystemForm
            target={target}
            showTarget={showTarget}
            setShowTarget={setShowTarget}
            updateTarget={updateTarget}
          />
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={calculate}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-3 rounded-lg text-base transition-colors shadow-lg shadow-green-900/30"
          >
            <Calculator className="w-5 h-5" />
            Calculate Redesign
          </button>
        </div>

        {/* ── Results ──────────────────────────────────────────────────────── */}
        {results && (
          <ResultsPanel
            existing={existing}
            target={target}
            results={results}
          />
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
