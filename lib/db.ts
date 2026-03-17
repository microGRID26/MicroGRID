// db.ts — typed Supabase helper that bypasses strict update type errors
// Use this instead of createClient() when you need to write to the DB
// Import: import { db } from '@/lib/db'
// Usage:  await db.from('projects').update({ blocker: 'text' }).eq('id', pid)

import { createClient } from '@/lib/supabase/client'

// Returns supabase client cast to any for writes — avoids 'never' type errors
// on update/insert while keeping full query chaining support
export function db() {
  return createClient() as any
}

// For reads where you want full type safety, use createClient() directly
export { createClient }
