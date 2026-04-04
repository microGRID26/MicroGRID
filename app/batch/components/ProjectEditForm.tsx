import { NumField, TextField } from './FormFields'
import type { ProjectInput, RoofFace } from './types'

// ── PROJECT EDIT FORM ────────────────────────────────────────────────────────

export function ProjectEditForm({ project, onChange }: {
  project: ProjectInput
  onChange: (updated: ProjectInput) => void
}) {
  function update<K extends keyof ProjectInput>(key: K, val: ProjectInput[K]) {
    onChange({ ...project, [key]: val })
  }

  function updateRoofFace(idx: number, key: keyof RoofFace, val: number) {
    const faces = [...project.roofFaces]
    faces[idx] = { ...faces[idx], [key]: val }
    onChange({ ...project, roofFaces: faces })
  }

  function handleRoofFaceCountChange(count: number) {
    const clamped = Math.max(1, Math.min(8, count))
    const faces = [...project.roofFaces]
    while (faces.length < clamped) faces.push({ panelCount: 0, azimuth: 180, tilt: 20, roofArea: 0 })
    onChange({ ...project, roofFaceCount: clamped, roofFaces: faces.slice(0, clamped) })
  }

  return (
    <div className="space-y-4 p-4 bg-gray-900/50 rounded-lg">
      {/* Project info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="Project Name" value={project.projectName} onChange={v => update('projectName', v)} />
        <TextField label="Address" value={project.address} onChange={v => update('address', v)} />
      </div>

      {/* Panels */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-green-400 font-semibold mb-2">Existing Panels</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <TextField label="Panel Model" value={project.panelModel} onChange={v => update('panelModel', v)} />
          <NumField label="Wattage" value={project.panelWattage} onChange={v => update('panelWattage', v)} unit="W" />
          <NumField label="Count" value={project.panelCount} onChange={v => update('panelCount', v)} step={1} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
          <NumField label="Voc" value={project.panelVoc} onChange={v => update('panelVoc', v)} unit="V" />
          <NumField label="Vmp" value={project.panelVmp} onChange={v => update('panelVmp', v)} unit="V" />
          <NumField label="Isc" value={project.panelIsc} onChange={v => update('panelIsc', v)} unit="A" />
          <NumField label="Imp" value={project.panelImp} onChange={v => update('panelImp', v)} unit="A" />
        </div>
      </div>

      {/* Inverter */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-green-400 font-semibold mb-2">Existing Inverter</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <TextField label="Model" value={project.inverterModel} onChange={v => update('inverterModel', v)} />
          <NumField label="Count" value={project.inverterCount} onChange={v => update('inverterCount', v)} step={1} />
          <NumField label="AC Power" value={project.inverterAcPower} onChange={v => update('inverterAcPower', v)} unit="kW" />
        </div>
      </div>

      {/* Battery */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-green-400 font-semibold mb-2">Existing Battery</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <TextField label="Model" value={project.batteryModel} onChange={v => update('batteryModel', v)} />
          <NumField label="Count" value={project.batteryCount} onChange={v => update('batteryCount', v)} step={1} />
          <NumField label="Capacity" value={project.batteryCapacity} onChange={v => update('batteryCapacity', v)} unit="kWh" />
        </div>
      </div>

      {/* Racking */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-xs text-green-400 font-semibold mb-2">Racking</p>
        <TextField label="Racking Type" value={project.rackingType} onChange={v => update('rackingType', v)} />
      </div>

      {/* Roof Faces */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center gap-3 mb-2">
          <p className="text-xs text-green-400 font-semibold">Roof Faces</p>
          <input
            type="number"
            min={1}
            max={8}
            value={project.roofFaceCount}
            onChange={e => handleRoofFaceCountChange(parseInt(e.target.value) || 1)}
            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-green-500 focus:outline-none"
          />
        </div>
        {project.roofFaces.slice(0, project.roofFaceCount).map((rf, i) => (
          <div key={i} className="bg-gray-800/50 rounded p-3 mb-2">
            <p className="text-xs text-gray-400 mb-2">Roof Face {i + 1}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <NumField label="Panels" value={rf.panelCount} onChange={v => updateRoofFace(i, 'panelCount', v)} step={1} />
              <NumField label="Azimuth" value={rf.azimuth} onChange={v => updateRoofFace(i, 'azimuth', v)} unit="deg" />
              <NumField label="Tilt" value={rf.tilt} onChange={v => updateRoofFace(i, 'tilt', v)} unit="deg" />
              <NumField label="Array Area" value={rf.roofArea} onChange={v => updateRoofFace(i, 'roofArea', v)} unit="sqft" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
