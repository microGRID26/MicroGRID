// ── Query Limits ────────────────────────────────────────────────────────────
// Centralized limit constants for Supabase queries.
// Reference tables: small datasets that rarely change.
// Data tables: core business data that grows with projects.

/** Reference tables (AHJs, utilities, financiers, crews) */
export const LIMIT_REFERENCE = 500

/** Standard data table queries (projects, funding, schedule) */
export const LIMIT_DATA = 2000

/** Large data table queries (task_state, equipment) */
export const LIMIT_LARGE = 5000

/** Maximum data fetch (commissions aggregate, legacy) */
export const LIMIT_MAX = 10000

/** Task state — all tasks across all projects */
export const LIMIT_TASK_STATE = 50000

// ── Polling Intervals ───────────────────────────────────────────────────────

/** Notification/ticket badge polling (30s) */
export const POLL_NOTIFICATIONS = 30_000

/** Session heartbeat (60s) */
export const POLL_HEARTBEAT = 60_000

/** Feature flag refresh (5min) */
export const POLL_FEATURE_FLAGS = 300_000

// ── Time Constants ──────────────────────────────────────────────────────────

/** Milliseconds in one day */
export const MS_PER_DAY = 86_400_000

// ── Toast Duration ──────────────────────────────────────────────────────────

/** Default toast display duration */
export const TOAST_DURATION = 3000
