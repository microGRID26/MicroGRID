'use client'

import { useState, useCallback, useRef } from 'react'
import { Nav } from '@/components/Nav'
import { useCurrentUser } from '@/lib/useCurrentUser'
import { Layers } from 'lucide-react'

import type { ProjectInput, TargetSystem } from './components/types'
import { DEFAULT_TARGET, SAMPLE_PROJECT, genId } from './components/types'
import { calculateRedesign } from './components/calculation'
import { TargetEquipmentPanel } from './components/TargetEquipmentPanel'
import { ProjectQueue } from './components/ProjectQueue'
import { ActionBar } from './components/ActionBar'
import { ResultsTable } from './components/ResultsTable'

// ── PAGE ─────────────────────────────────────────────────────────────────────

export default function BatchPage() {
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  const [target, setTarget] = useState<TargetSystem>(DEFAULT_TARGET)
  const [projects, setProjects] = useState<ProjectInput[]>([])
  const [showTarget, setShowTarget] = useState(false)
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Target updater ──────────────────────────────────────────────────────────
  function updateTarget<K extends keyof TargetSystem>(key: K, val: TargetSystem[K]) {
    setTarget(prev => ({ ...prev, [key]: val }))
  }

  // ── Project management ──────────────────────────────────────────────────────
  function addProject(partial?: Partial<ProjectInput>) {
    const id = genId()
    const newProject: ProjectInput = {
      id,
      fileName: '',
      projectName: '',
      address: '',
      panelModel: '',
      panelWattage: 0,
      panelCount: 0,
      panelVoc: 0,
      panelVmp: 0,
      panelIsc: 0,
      panelImp: 0,
      inverterModel: '',
      inverterCount: 0,
      inverterAcPower: 0,
      batteryModel: '',
      batteryCount: 0,
      batteryCapacity: 0,
      rackingType: '',
      roofFaceCount: 1,
      roofFaces: [{ panelCount: 0, azimuth: 180, tilt: 20, roofArea: 0 }],
      status: 'editing',
      ...partial,
    }
    setProjects(prev => [...prev, newProject])
    setExpandedProject(id)
  }

  function addSampleProject() {
    const id = genId()
    setProjects(prev => [...prev, { ...SAMPLE_PROJECT, id }])
    setExpandedProject(id)
  }

  function updateProject(id: string, updated: ProjectInput) {
    setProjects(prev => prev.map(p => p.id === id ? updated : p))
  }

  function removeProject(id: string) {
    setProjects(prev => prev.filter(p => p.id !== id))
    if (expandedProject === id) setExpandedProject(null)
  }

  // ── File upload handler ─────────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) continue
      const id = genId()
      const newProject: ProjectInput = {
        id,
        fileName: file.name,
        projectName: file.name.replace(/\.pdf$/i, '').replace(/_/g, ' '),
        address: '',
        panelModel: '',
        panelWattage: 0,
        panelCount: 0,
        panelVoc: 0,
        panelVmp: 0,
        panelIsc: 0,
        panelImp: 0,
        inverterModel: '',
        inverterCount: 0,
        inverterAcPower: 0,
        batteryModel: '',
        batteryCount: 0,
        batteryCapacity: 0,
        rackingType: '',
        roofFaceCount: 1,
        roofFaces: [{ panelCount: 0, azimuth: 180, tilt: 20, roofArea: 0 }],
        status: 'editing',
      }
      setProjects(prev => [...prev, newProject])
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  // ── Process all ─────────────────────────────────────────────────────────────
  async function processAll() {
    setProcessing(true)

    // Process each project sequentially with a small delay for UI updates
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i]
      if (p.status === 'complete') continue
      if (p.panelCount === 0 || p.panelWattage === 0) {
        setProjects(prev => prev.map(proj =>
          proj.id === p.id ? { ...proj, status: 'error', error: 'Missing required specs (panel wattage and count)' } : proj
        ))
        continue
      }

      // Mark as processing
      setProjects(prev => prev.map(proj =>
        proj.id === p.id ? { ...proj, status: 'processing' } : proj
      ))

      // Small delay so the UI renders the processing state
      await new Promise(resolve => setTimeout(resolve, 150))

      try {
        const results = calculateRedesign(p, target)
        setProjects(prev => prev.map(proj =>
          proj.id === p.id ? { ...proj, status: 'complete', results, error: undefined } : proj
        ))
      } catch (err) {
        setProjects(prev => prev.map(proj =>
          proj.id === p.id ? { ...proj, status: 'error', error: err instanceof Error ? err.message : String(err) } : proj
        ))
      }
    }

    setProcessing(false)
  }

  // ── Download CSV summary ────────────────────────────────────────────────────
  function downloadSummary() {
    const completed = projects.filter(p => p.status === 'complete' && p.results)
    if (completed.length === 0) return

    const headers = [
      'Project Name', 'Address', 'Old Panel Model', 'Old Wattage', 'Old Count',
      'Old DC (kW)', 'New Panel Model', 'New Wattage', 'New Count', 'New DC (kW)',
      'Panel Delta', 'DC Delta (kW)', 'Strings', 'String Config', 'Warnings',
    ]

    const rows = completed.map(p => {
      const r = p.results!
      const stringConfig = r.stringConfigs.map(sc => `${sc.modules}mod`).join(', ')
      return [
        p.projectName,
        p.address,
        p.panelModel,
        p.panelWattage,
        p.panelCount,
        r.oldSystemDc,
        target.panelModel,
        target.panelWattage,
        r.newTotalPanels,
        r.newSystemDc,
        r.newTotalPanels - p.panelCount,
        (r.newSystemDc - r.oldSystemDc).toFixed(2),
        r.stringConfigs.length,
        stringConfig,
        r.warnings.join('; ') || 'None',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `batch-redesign-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const completedCount = projects.filter(p => p.status === 'complete').length
  const errorCount = projects.filter(p => p.status === 'error').length
  const pendingCount = projects.filter(p => p.status === 'pending' || p.status === 'editing').length
  const totalWarnings = projects.reduce((s, p) => s + (p.results?.warnings.length ?? 0), 0)

  // ── Role gate: Manager+ only ──────────────────────────────────────────────
  if (!userLoading && currentUser && !currentUser.isManager) {
    return (
      <>
        <Nav active="Redesign" />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <p className="text-lg text-gray-400">Access Restricted</p>
            <p className="text-sm text-gray-500 mt-2">Batch processing is available to Managers and above.</p>
          </div>
        </div>
      </>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Nav active="Redesign" />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-green-400" />
            <div>
              <h1 className="text-xl font-bold">Batch Redesign Processor</h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Upload plan sets and batch-process equipment swaps across multiple projects
              </p>
            </div>
          </div>
          {projects.length > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              {completedCount > 0 && <span className="text-green-400">{completedCount} complete</span>}
              {errorCount > 0 && <span className="text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
              {pendingCount > 0 && <span className="text-gray-400">{pendingCount} pending</span>}
            </div>
          )}
        </div>

        {/* Section 1: Target Equipment */}
        <TargetEquipmentPanel
          target={target}
          showTarget={showTarget}
          setShowTarget={setShowTarget}
          updateTarget={updateTarget}
        />

        {/* Section 2: Upload Queue */}
        <ProjectQueue
          projects={projects}
          target={target}
          expandedProject={expandedProject}
          setExpandedProject={setExpandedProject}
          addSampleProject={addSampleProject}
          addProject={addProject}
          updateProject={updateProject}
          removeProject={removeProject}
          handleDrop={handleDrop}
          handleDragOver={handleDragOver}
          handleFiles={handleFiles}
          fileInputRef={fileInputRef}
        />

        {/* Action Bar */}
        <ActionBar
          projects={projects}
          processing={processing}
          completedCount={completedCount}
          processAll={processAll}
          downloadSummary={downloadSummary}
        />

        {/* Section 4: Results Table */}
        <ResultsTable
          projects={projects}
          completedCount={completedCount}
          totalWarnings={totalWarnings}
          expandedProject={expandedProject}
          setExpandedProject={setExpandedProject}
        />
      </div>
    </div>
  )
}
