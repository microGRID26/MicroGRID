'use client'

import { createContext, useContext, useCallback, useState, useRef } from 'react'
import { AlertTriangle, WifiOff, LogIn, X } from 'lucide-react'
import type { ErrorType } from '@/lib/errors'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Toast {
  id: number
  message: string
  type: ErrorType
}

interface ErrorToastContextValue {
  /** Show an error toast. Returns the toast id for manual dismissal. */
  showError: (message: string, type?: ErrorType) => number
  /** Dismiss a specific toast by id */
  dismiss: (id: number) => void
  /** Dismiss all visible toasts */
  dismissAll: () => void
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ErrorToastContext = createContext<ErrorToastContextValue | null>(null)

export function useErrorToast(): ErrorToastContextValue {
  const ctx = useContext(ErrorToastContext)
  if (!ctx) throw new Error('useErrorToast must be used within ErrorToastProvider')
  return ctx
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 5000

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    timers.current.forEach(timer => clearTimeout(timer))
    timers.current.clear()
    setToasts([])
  }, [])

  const showError = useCallback((message: string, type: ErrorType = 'unknown') => {
    const id = ++nextId.current

    setToasts(prev => {
      // Deduplicate: if the same message is already showing, don't stack it
      if (prev.some(t => t.message === message)) return prev
      // Evict oldest if at capacity
      const next = prev.length >= MAX_VISIBLE ? prev.slice(1) : prev
      return [...next, { id, message, type }]
    })

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    timers.current.set(id, timer)

    return id
  }, [dismiss])

  return (
    <ErrorToastContext.Provider value={{ showError, dismiss, dismissAll }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ErrorToastContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// Toast item
// ---------------------------------------------------------------------------

const ICON_MAP: Record<ErrorType, typeof AlertTriangle> = {
  network: WifiOff,
  auth: LogIn,
  data: AlertTriangle,
  unknown: AlertTriangle,
}

const BG_MAP: Record<ErrorType, string> = {
  network: 'bg-amber-900/95 border-amber-700/50',
  auth: 'bg-blue-900/95 border-blue-700/50',
  data: 'bg-red-900/95 border-red-700/50',
  unknown: 'bg-red-900/95 border-red-700/50',
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = ICON_MAP[toast.type]
  const bg = BG_MAP[toast.type]

  return (
    <div
      className={`${bg} border rounded-lg px-4 py-3 shadow-xl flex items-start gap-3 animate-in slide-in-from-right-5 fade-in duration-200`}
      role="alert"
    >
      <Icon className="w-5 h-5 text-white/80 mt-0.5 shrink-0" />
      <p className="text-sm text-white/90 flex-1">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/50 hover:text-white/80 shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
