/**
 * Centralized error handling for MicroGRID CRM.
 *
 * Classifies errors by type, produces user-facing messages, and reports
 * to Sentry when configured. Every catch block in the app should route
 * through handleApiError() instead of bare console.log().
 */

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export type ErrorType = 'network' | 'auth' | 'data' | 'unknown'

export interface ClassifiedError {
  /** Machine-readable category */
  type: ErrorType
  /** Developer-facing detail (for logs / Sentry) */
  message: string
  /** Safe to show to the user in a toast */
  userMessage: string
}

/**
 * Classify an unknown thrown value into a structured error.
 *
 * Heuristics (checked in order):
 *  1. Network — fetch failures, timeouts, CORS
 *  2. Auth — 401/403, JWT expired, missing session
 *  3. Data — Supabase/PostgREST query errors (4xx codes)
 *  4. Unknown — everything else
 */
export function classifyError(err: unknown): ClassifiedError {
  const raw = extractMessage(err)
  const lower = raw.toLowerCase()

  // --- Network -----------------------------------------------------------
  if (
    err instanceof TypeError && lower.includes('fetch') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('econnrefused') ||
    lower.includes('econnreset') ||
    lower.includes('cors') ||
    lower.includes('failed to fetch') ||
    lower.includes('load failed') ||
    lower.includes('aborted')
  ) {
    return {
      type: 'network',
      message: raw,
      userMessage: 'Network error — check your connection and try again.',
    }
  }

  // --- Auth --------------------------------------------------------------
  if (
    lower.includes('jwt') ||
    lower.includes('401') ||
    lower.includes('403') ||
    lower.includes('unauthorized') ||
    lower.includes('forbidden') ||
    lower.includes('not authenticated') ||
    lower.includes('invalid claim') ||
    lower.includes('session') && lower.includes('expired')
  ) {
    return {
      type: 'auth',
      message: raw,
      userMessage: 'Session expired — please sign in again.',
    }
  }

  // --- Data (Supabase / PostgREST) ---------------------------------------
  if (
    lower.includes('pgrst') ||
    lower.includes('violates') ||
    lower.includes('duplicate key') ||
    lower.includes('not found') ||
    lower.includes('could not find') ||
    lower.includes('null value in column') ||
    lower.includes('relation') && lower.includes('does not exist') ||
    lower.includes('column') && lower.includes('does not exist')
  ) {
    return {
      type: 'data',
      message: raw,
      userMessage: 'Data error — the request could not be completed. Try refreshing.',
    }
  }

  // --- Unknown -----------------------------------------------------------
  return {
    type: 'unknown',
    message: raw,
    userMessage: 'Something went wrong. Try refreshing the page.',
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

/**
 * Handle an API/data error consistently:
 *  1. Classify it
 *  2. Log to console with context prefix
 *  3. Report to Sentry (if configured) with context breadcrumb
 *  4. Return the classified error so callers can surface userMessage
 *
 * @param err   - The thrown value (Error, string, or unknown)
 * @param context - Human-readable label, e.g. "[command] loadProjects"
 */
export function handleApiError(err: unknown, context: string): ClassifiedError {
  const classified = classifyError(err)

  // Always log for local dev
  console.error(`[${context}] ${classified.type}: ${classified.message}`)

  // Report to Sentry if available (lazy import to avoid bundling when DSN is unset)
  reportToSentry(err, context, classified)

  return classified
}

// ---------------------------------------------------------------------------
// Sentry integration (lazy, no-op when DSN not configured)
// ---------------------------------------------------------------------------

let sentryModule: typeof import('@sentry/nextjs') | null | undefined

async function loadSentry(): Promise<typeof import('@sentry/nextjs') | null> {
  if (sentryModule !== undefined) return sentryModule
  try {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      sentryModule = null
      return null
    }
    sentryModule = await import('@sentry/nextjs')
    return sentryModule
  } catch {
    sentryModule = null
    return null
  }
}

function reportToSentry(
  err: unknown,
  context: string,
  classified: ClassifiedError,
) {
  // Fire-and-forget — never block the caller
  loadSentry().then(sentry => {
    if (!sentry) return
    sentry.withScope(scope => {
      scope.setTag('error.type', classified.type)
      scope.setContext('api_error', {
        context,
        type: classified.type,
        message: classified.message,
      })
      if (err instanceof Error) {
        sentry.captureException(err)
      } else {
        sentry.captureMessage(`[${context}] ${classified.message}`, 'error')
      }
    })
  }).catch(() => {
    // Sentry reporting failed — swallow silently, we already logged to console
  })
}

/**
 * Check a Supabase response error and handle it if present.
 * Designed for the common `const { data, error } = await supabase...` pattern.
 * Returns true if there was an error, false if clean.
 *
 * @example
 *   const { data, error } = await supabase.from('projects').select()
 *   if (checkSupabaseError(error, '[command] loadProjects')) return
 */
export function checkSupabaseError(
  error: { message: string } | null | undefined,
  context: string,
): boolean {
  if (!error) return false
  handleApiError(error, context)
  return true
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message)
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}
