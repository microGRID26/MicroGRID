'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { searchProjects } from '@/lib/api'
import { Search, X, Loader2, FileText } from 'lucide-react'
import type { Project } from '@/types/database'

export function ProjectSelector({ onSelect }: { onSelect: (id: string) => void }) {
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
