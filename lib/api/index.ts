// ── Centralized API Layer ────────────────────────────────────────────────────
// All data access functions in one place.
// Pages should import from here instead of using Supabase directly.
//
// Usage:
//   import { loadProjects, loadTaskStates } from '@/lib/api'

export { loadProjects, loadTaskStates, loadProjectFunding, updateProject, loadUsers } from './projects'
export { loadProjectNotes, loadTaskNotes, addNote, deleteNote, createMentionNotification } from './notes'
export { upsertTaskState, loadTaskHistory, insertTaskHistory, loadProjectAdders, addProjectAdder, deleteProjectAdder } from './tasks'
