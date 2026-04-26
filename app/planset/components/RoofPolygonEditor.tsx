'use client'

import { useState, useEffect } from 'react'
import { polygonToSvgPath } from '@/lib/planset-polygons'
import type { PlansetRoofFace } from '@/lib/planset-types'

interface Props {
  faceId: number
  initialPolygon: Array<[number, number]>
  initialSetbacks?: PlansetRoofFace['setbacks']
  onSave: (polygon: Array<[number, number]>, setbacks: PlansetRoofFace['setbacks']) => void
  onClose: () => void
}

const W = 600
const H = 400

export function RoofPolygonEditor({ faceId, initialPolygon, initialSetbacks, onSave, onClose }: Props) {
  // Convert normalized initial polygon to canvas coords
  const [points, setPoints] = useState<Array<[number, number]>>(
    initialPolygon.map(([x, y]) => [x * W, y * H] as [number, number])
  )
  const [setbacks, setSetbacks] = useState<PlansetRoofFace['setbacks']>(
    initialSetbacks ?? { ridge: false, eave: false, rake: false, pathClear: 'walkable' }
  )

  // Escape key closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function onCanvasClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPoints(prev => [...prev, [x, y]])
  }

  function handleSave() {
    // Convert canvas coords back to normalized 0–1
    const normalized = points.map(([x, y]) => [x / W, y / H] as [number, number])
    onSave(normalized, setbacks)
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-800 rounded-lg p-4 max-w-3xl w-full">
        <header className="flex justify-between items-center mb-3">
          <h2 className="text-white text-lg font-medium">
            Roof Plane Editor — Face #{faceId}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white">
            ✕
          </button>
        </header>

        <p className="text-gray-300 text-sm mb-2">
          Click on the canvas to add polygon vertices. Set the setback flags below per face.
        </p>

        <svg
          data-testid="polygon-canvas"
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          onClick={onCanvasClick}
          className="bg-gray-100 cursor-crosshair"
        >
          {points.length >= 3 && (
            <path
              d={polygonToSvgPath(points)}
              fill="rgba(0,128,255,0.2)"
              stroke="#06f"
              strokeWidth={2}
            />
          )}
          {points.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={4} fill="#06f" />
          ))}
        </svg>

        <div className="grid grid-cols-2 gap-3 mt-3 text-white text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Ridge setback required"
              checked={setbacks.ridge}
              onChange={e => setSetbacks({ ...setbacks, ridge: e.target.checked })}
            />
            Ridge setback required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Eave setback required"
              checked={setbacks.eave}
              onChange={e => setSetbacks({ ...setbacks, eave: e.target.checked })}
            />
            Eave setback required
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              aria-label="Rake setback required"
              checked={setbacks.rake}
              onChange={e => setSetbacks({ ...setbacks, rake: e.target.checked })}
            />
            Rake setback required
          </label>
          <label className="flex items-center gap-2">
            <span>Path:</span>
            <select
              value={setbacks.pathClear}
              onChange={e => setSetbacks({ ...setbacks, pathClear: e.target.value as 'walkable' | 'partial' | 'blocked' })}
              className="bg-gray-700 text-white px-2 py-1 rounded"
            >
              <option value="walkable">Walkable</option>
              <option value="partial">Partial</option>
              <option value="blocked">Blocked</option>
            </select>
          </label>
        </div>

        <footer className="mt-4 flex gap-2 justify-end">
          <button
            onClick={() => setPoints([])}
            className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-500"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-500"
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  )
}
