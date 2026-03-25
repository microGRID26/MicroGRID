'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchEquipment } from '@/lib/api/equipment'
import type { Equipment } from '@/lib/api/equipment'

const RECENT_KEY_PREFIX = 'mg_equipment_recent_'
const MAX_RECENT = 5

function getRecentIds(category: string): string[] {
  try {
    const raw = localStorage.getItem(`${RECENT_KEY_PREFIX}${category}`)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addRecentId(category: string, id: string) {
  try {
    const ids = getRecentIds(category).filter(i => i !== id)
    ids.unshift(id)
    localStorage.setItem(`${RECENT_KEY_PREFIX}${category}`, JSON.stringify(ids.slice(0, MAX_RECENT)))
  } catch { /* ignore */ }
}

interface EquipmentAutocompleteProps {
  category: 'module' | 'inverter' | 'battery' | 'optimizer'
  value: string
  onChange: (value: string, equipment?: Equipment) => void
  placeholder?: string
  disabled?: boolean
}

export function EquipmentAutocomplete({ category, value, onChange, placeholder, disabled }: EquipmentAutocompleteProps) {
  const [query, setQuery] = useState(value ?? '')
  const [results, setResults] = useState<Equipment[]>([])
  const [recentItems, setRecentItems] = useState<Equipment[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [searched, setSearched] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Sync external value changes
  useEffect(() => {
    setQuery(value ?? '')
  }, [value])

  const loadRecents = useCallback(async () => {
    const ids = getRecentIds(category)
    if (ids.length === 0) { setRecentItems([]); return }
    // Load each recent item by searching for it
    const { searchEquipment: search } = await import('@/lib/api/equipment')
    // We need to load by ID - use loadEquipment and filter
    const { loadEquipment } = await import('@/lib/api/equipment')
    const all = await loadEquipment(category)
    const items = ids.map(id => all.find(e => e.id === id)).filter(Boolean) as Equipment[]
    setRecentItems(items)
  }, [category])

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([])
      setSearched(false)
      return
    }
    const items = await searchEquipment(q, category)
    setResults(items)
    setSearched(true)
    setOpen(true)
    setActiveIndex(-1)
  }, [category])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    onChange(v)
    // Debounced search
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (v.trim().length < 1) {
      setResults([])
      setSearched(false)
      return
    }
    debounceRef.current = setTimeout(() => doSearch(v), 200)
  }

  const handleSelect = (item: Equipment) => {
    setQuery(item.name)
    onChange(item.name, item)
    setOpen(false)
    setResults([])
    setSearched(false)
    addRecentId(category, item.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    const allItems = getDisplayItems()
    if (allItems.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, allItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(allItems[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const handleFocus = () => {
    if (query.trim().length >= 1) {
      if (results.length > 0 || searched) setOpen(true)
    } else {
      // Show recents on empty focus
      loadRecents().then(() => setOpen(true))
    }
  }

  // Click outside closes dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Determine what to show in dropdown
  const getDisplayItems = (): Equipment[] => {
    if (results.length > 0) return results
    if (!searched && query.trim().length < 1 && recentItems.length > 0) return recentItems
    return []
  }

  const showRecentsHeader = !searched && query.trim().length < 1 && recentItems.length > 0
  const showNoResults = searched && results.length === 0
  const displayItems = getDisplayItems()
  const showDropdown = open && (displayItems.length > 0 || showNoResults)

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full bg-gray-700 text-white text-xs rounded px-2 py-2 border border-gray-600 focus:border-green-500 focus:outline-none"
      />
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-xl max-h-48 overflow-y-auto">
          {showRecentsHeader && (
            <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-700">
              Recently used
            </div>
          )}
          {displayItems.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors ${
                idx === activeIndex
                  ? 'bg-green-700/40 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <span className="truncate">{item.name}</span>
              <span className="text-gray-500 text-[10px] flex-shrink-0 flex items-center gap-1.5">
                {item.watts && <span>{item.watts}W</span>}
                {item.watts && item.manufacturer && <span>·</span>}
                {item.manufacturer && <span>{item.manufacturer}</span>}
              </span>
            </button>
          ))}
          {showNoResults && (
            <div className="px-3 py-3 text-xs text-gray-500 text-center">
              No equipment found — type to enter custom value
            </div>
          )}
        </div>
      )}
    </div>
  )
}
