import { useState, useEffect, useRef, useMemo } from 'react'

// ── MultiSelect component ────────────────────────────────────────────────────

export function MultiSelect({ label, options, selected, onChange }: {
  label: string
  options: { value: string; label: string }[]
  selected: string
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selectedSet = useMemo(() => new Set(selected ? selected.split(',') : []), [selected])
  const count = selectedSet.size

  // Empty deps is correct: handler checks ref.current at call time, not at setup time
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(value: string) {
    const next = new Set(selectedSet)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange(Array.from(next).join(','))
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs bg-gray-800 text-gray-300 border border-gray-700 rounded-md px-2 py-1.5 hover:border-gray-600 transition-colors"
      >
        {count ? `${label} (${count})` : `All ${label}${label.endsWith('s') ? '' : 's'}`}
        <span className="ml-1 text-gray-500">&#9662;</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto min-w-[200px]">
          {count > 0 && (
            <button
              onClick={() => onChange('')}
              className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-gray-700 border-b border-gray-700"
            >
              Clear all
            </button>
          )}
          {options.map(o => (
            <label key={o.value} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedSet.has(o.value)}
                onChange={() => toggle(o.value)}
                className="rounded border-gray-600 bg-gray-900 text-green-500 focus:ring-green-500 focus:ring-offset-0"
              />
              {o.label}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
