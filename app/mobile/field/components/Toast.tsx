import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export function Toast({ message, type = 'success', onDone }: { message: string; type?: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 5000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className={cn(
      'fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-sm px-5 py-3 rounded-xl shadow-xl max-w-[90vw] text-center',
      type === 'success' ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'
    )}>
      {message}
    </div>
  )
}
