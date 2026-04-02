// Offline cache using MMKV — instant app launch with stale-while-revalidate
// Data is cached locally and served immediately, then refreshed in background.

import { MMKV } from 'react-native-mmkv'

const storage = new MMKV({ id: 'microgrid-cache' })

const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry<T> {
  data: T
  timestamp: number
}

/**
 * Get cached data. Returns null if no cache or expired beyond hard limit (24h).
 */
export function getCache<T>(key: string): T | null {
  try {
    const raw = storage.getString(key)
    if (!raw) return null
    const entry: CacheEntry<T> = JSON.parse(raw)
    // Hard expiry: 24 hours
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) return null
    return entry.data
  } catch {
    return null
  }
}

/**
 * Check if cache is stale (older than TTL but not expired).
 */
export function isCacheStale(key: string): boolean {
  try {
    const raw = storage.getString(key)
    if (!raw) return true
    const entry = JSON.parse(raw)
    return Date.now() - entry.timestamp > CACHE_TTL
  } catch {
    return true
  }
}

/**
 * Save data to cache.
 */
export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() }
    storage.set(key, JSON.stringify(entry))
  } catch (err) {
    console.warn('[cache] write failed:', err)
  }
}

/**
 * Clear all cached data.
 */
export function clearCache(): void {
  storage.clearAll()
}

/**
 * Stale-while-revalidate pattern:
 * 1. Return cached data immediately (if available)
 * 2. Fetch fresh data in background
 * 3. Update cache and call onUpdate with new data
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  onUpdate: (data: T) => void,
): Promise<T | null> {
  const cached = getCache<T>(key)

  if (cached && !isCacheStale(key)) {
    // Fresh cache — use it, no fetch needed
    return cached
  }

  if (cached) {
    // Stale cache — return it immediately, fetch in background
    fetcher().then(fresh => {
      setCache(key, fresh)
      onUpdate(fresh)
    }).catch(() => {})
    return cached
  }

  // No cache — fetch and wait
  try {
    const fresh = await fetcher()
    setCache(key, fresh)
    return fresh
  } catch {
    return null
  }
}
