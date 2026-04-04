import { RefObject } from 'react'
import {
  Upload, Plus, ChevronDown, ChevronUp,
  AlertTriangle, FileText, Trash2, ArrowRight,
} from 'lucide-react'
import { StatusBadge } from './FormFields'
import { ProjectEditForm } from './ProjectEditForm'
import { ProjectResultsDetail } from './ProjectResultsDetail'
import type { ProjectInput, TargetSystem } from './types'

// ── PROJECT QUEUE ────────────────────────────────────────────────────────────

export function ProjectQueue({
  projects,
  target,
  expandedProject,
  setExpandedProject,
  addSampleProject,
  addProject,
  updateProject,
  removeProject,
  handleDrop,
  handleDragOver,
  handleFiles,
  fileInputRef,
}: {
  projects: ProjectInput[]
  target: TargetSystem
  expandedProject: string | null
  setExpandedProject: (id: string | null) => void
  addSampleProject: () => void
  addProject: (partial?: Partial<ProjectInput>) => void
  updateProject: (id: string, updated: ProjectInput) => void
  removeProject: (id: string) => void
  handleDrop: (e: React.DragEvent) => void
  handleDragOver: (e: React.DragEvent) => void
  handleFiles: (files: FileList | null) => void
  fileInputRef: RefObject<HTMLInputElement | null>
}) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mb-6 p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4 text-green-400" />
          Project Queue
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={addSampleProject}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Sample Project
          </button>
          <button
            onClick={() => addProject()}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Blank Project
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-600 hover:border-green-500/50 rounded-lg p-8 text-center cursor-pointer transition-colors mb-4"
      >
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
        <p className="text-sm text-gray-400">
          Drag & drop PDF plan sets here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Specs will need to be entered manually for now — AI extraction coming soon
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No projects in queue. Add a sample project or upload PDFs to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(project => {
            const isExpanded = expandedProject === project.id

            return (
              <div key={project.id} className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden">
                {/* Project header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <FileText className="w-4 h-4 text-gray-500 shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {project.projectName || project.fileName || 'Untitled Project'}
                    </p>
                    {project.address && (
                      <p className="text-xs text-gray-400 truncate">{project.address}</p>
                    )}
                  </div>

                  {/* Extracted specs summary */}
                  {project.panelCount > 0 && (
                    <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
                      <span>{project.panelCount}x {project.panelWattage}W</span>
                      <span>{(project.panelCount * project.panelWattage / 1000).toFixed(1)} kW</span>
                    </div>
                  )}

                  {/* Results summary when complete */}
                  {project.results && (
                    <div className="hidden md:flex items-center gap-3 text-xs">
                      <span className="text-gray-400">
                        {project.results.oldSystemDc} kW
                        <ArrowRight className="w-3 h-3 inline mx-1" />
                        <span className="text-green-400 font-semibold">{project.results.newSystemDc} kW</span>
                      </span>
                      <span className="text-gray-400">
                        {project.results.stringConfigs.length} strings
                      </span>
                      {project.results.warnings.length > 0 && (
                        <span className="text-red-400 flex items-center gap-0.5">
                          <AlertTriangle className="w-3 h-3" />
                          {project.results.warnings.length}
                        </span>
                      )}
                    </div>
                  )}

                  <StatusBadge status={project.status} />

                  {/* Error message */}
                  {project.error && (
                    <span className="text-xs text-red-400 max-w-[200px] truncate" title={project.error}>
                      {project.error}
                    </span>
                  )}

                  <button
                    onClick={() => removeProject(project.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors p-1"
                    title="Remove project"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-700 px-4 py-3">
                    {project.status === 'complete' && project.results ? (
                      <ProjectResultsDetail project={project} target={target} />
                    ) : (
                      <ProjectEditForm
                        project={project}
                        onChange={updated => updateProject(project.id, updated)}
                      />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
