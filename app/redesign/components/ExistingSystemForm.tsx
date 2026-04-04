import { Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { NumField, TextField } from './FormFields'
import type { ExistingSystem, RoofFace } from './types'

interface ExistingSystemFormProps {
  existing: ExistingSystem
  showExisting: boolean
  setShowExisting: (v: boolean) => void
  updateExisting: <K extends keyof ExistingSystem>(key: K, val: ExistingSystem[K]) => void
  updateRoofFace: (idx: number, key: keyof RoofFace, val: number) => void
  handleRoofFaceCountChange: (count: number) => void
}

export function ExistingSystemForm({
  existing, showExisting, setShowExisting, updateExisting, updateRoofFace, handleRoofFaceCountChange
}: ExistingSystemFormProps) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <button
        onClick={() => setShowExisting(!showExisting)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold">Existing System</h2>
        </div>
        {showExisting ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {showExisting && (
        <div className="px-4 pb-4 space-y-4">
          {/* Project info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TextField label="Project Name" value={existing.projectName} onChange={v => updateExisting('projectName', v)} />
            <TextField label="Address" value={existing.address} onChange={v => updateExisting('address', v)} />
          </div>

          {/* Panels */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-green-400 font-semibold mb-2">Panels</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <TextField label="Panel Model" value={existing.panelModel} onChange={v => updateExisting('panelModel', v)} />
              </div>
              <NumField label="Wattage" value={existing.panelWattage} onChange={v => updateExisting('panelWattage', v)} unit="W" />
              <NumField label="Count" value={existing.panelCount} onChange={v => updateExisting('panelCount', v)} step={1} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <NumField label="Voc" value={existing.panelVoc} onChange={v => updateExisting('panelVoc', v)} unit="V" />
              <NumField label="Vmp" value={existing.panelVmp} onChange={v => updateExisting('panelVmp', v)} unit="V" />
              <NumField label="Isc" value={existing.panelIsc} onChange={v => updateExisting('panelIsc', v)} unit="A" />
              <NumField label="Imp" value={existing.panelImp} onChange={v => updateExisting('panelImp', v)} unit="A" />
            </div>
          </div>

          {/* Inverter */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-green-400 font-semibold mb-2">Inverter</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <TextField label="Model" value={existing.inverterModel} onChange={v => updateExisting('inverterModel', v)} />
              <NumField label="Count" value={existing.inverterCount} onChange={v => updateExisting('inverterCount', v)} step={1} />
              <NumField label="AC Power" value={existing.inverterAcPower} onChange={v => updateExisting('inverterAcPower', v)} unit="kW" />
            </div>
          </div>

          {/* Battery */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-green-400 font-semibold mb-2">Battery</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <TextField label="Model" value={existing.batteryModel} onChange={v => updateExisting('batteryModel', v)} />
              <NumField label="Count" value={existing.batteryCount} onChange={v => updateExisting('batteryCount', v)} step={1} />
              <NumField label="Capacity" value={existing.batteryCapacity} onChange={v => updateExisting('batteryCapacity', v)} unit="kWh" />
            </div>
          </div>

          {/* Racking */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-green-400 font-semibold mb-2">Racking</p>
            <TextField label="Racking Type" value={existing.rackingType} onChange={v => updateExisting('rackingType', v)} />
          </div>

          {/* Roof Faces */}
          <div className="border-t border-gray-700 pt-3">
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs text-green-400 font-semibold">Roof Faces</p>
              <NumField label="" value={existing.roofFaceCount} onChange={handleRoofFaceCountChange} step={1} />
            </div>
            {existing.roofFaces.slice(0, existing.roofFaceCount).map((rf, i) => (
              <div key={i} className="bg-gray-750 rounded p-3 mb-2 bg-gray-900/50">
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
      )}
    </div>
  )
}
