'use client'

import { useState, useEffect, useRef } from 'react'

const CASCADE_STEPS = [
  { step: '1', action: 'Task status saved', detail: 'The install_done task is set to "Complete" in the database. Timestamp and user recorded.', color: '#1D9E75', ms: '50ms' },
  { step: '2', action: 'Install date auto-set', detail: 'The project\'s install_complete_date field is automatically populated with today.', color: '#3b82f6', ms: '100ms' },
  { step: '3', action: 'M2 funding triggered', detail: 'The system checks: "Is M2 not yet submitted?" If so, it sets M2 to Eligible. This means you can now collect the second funding milestone.', color: '#f59e0b', ms: '200ms' },
  { step: '4', action: 'EDGE Portal notified', detail: 'A secure webhook fires to the EDGE financier portal with the install date and updated funding status.', color: '#8b5cf6', ms: '300ms' },
  { step: '5', action: 'Stage auto-advances', detail: 'The engine checks: "Are all required install tasks done?" If yes, the project moves to Inspection automatically.', color: '#ec4899', ms: '500ms' },
  { step: '6', action: 'Everyone sees it — instantly', detail: 'Real-time sync pushes the change to every open browser. The pipeline board updates. The queue re-sorts. Analytics recalculate.', color: '#06b6d4', ms: '800ms' },
]

export function CascadeSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [visibleSteps, setVisibleSteps] = useState<number>(0)
  const [hasTriggered, setHasTriggered] = useState(false)
  const [lineHeight, setLineHeight] = useState(0)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered) {
          setHasTriggered(true)
          // Stagger each step: 0ms, 400ms, 800ms, 1200ms, 1600ms, 2000ms
          CASCADE_STEPS.forEach((_, i) => {
            setTimeout(() => {
              setVisibleSteps(prev => prev + 1)
              setLineHeight(((i + 1) / CASCADE_STEPS.length) * 100)
            }, i * 400)
          })
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasTriggered])

  return (
    <div ref={ref}>
      <h2 className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">What Happens When You Click a Button</h2>
      <p className="text-sm text-gray-400 mb-5">When a PM marks &quot;Install Complete&quot; on a project, here&apos;s everything that happens in under 2 seconds — automatically.</p>
      <div className="relative">
        {/* Animated growing line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-800 hidden md:block" />
        <div
          className="absolute left-6 top-0 w-0.5 hidden md:block transition-all duration-500 ease-out"
          style={{ height: `${lineHeight}%`, background: 'linear-gradient(to bottom, #1D9E75, #3b82f6, #f59e0b, #8b5cf6, #ec4899, #06b6d4)' }}
        />
        {CASCADE_STEPS.map((s, i) => (
          <div
            key={s.step}
            className="relative pl-0 md:pl-14 pb-3 transition-all duration-500 ease-out"
            style={{
              opacity: i < visibleSteps ? 1 : 0,
              transform: i < visibleSteps ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
            }}
          >
            {/* Step circle — pulses when it first appears */}
            <div
              className="hidden md:flex absolute left-3.5 top-2 w-5 h-5 rounded-full items-center justify-center text-[10px] font-bold border transition-all duration-300"
              style={{
                backgroundColor: i < visibleSteps ? `${s.color}30` : `${s.color}10`,
                borderColor: s.color,
                color: s.color,
                boxShadow: i === visibleSteps - 1 ? `0 0 12px ${s.color}60` : 'none',
              }}
            >
              {s.step}
            </div>
            <div
              className="rounded-lg px-4 py-3 border transition-all duration-300"
              style={{
                backgroundColor: i < visibleSteps ? `${s.color}08` : `${s.color}02`,
                borderColor: i < visibleSteps ? `${s.color}40` : `${s.color}10`,
                boxShadow: i === visibleSteps - 1 ? `0 0 20px ${s.color}15` : 'none',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="md:hidden text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{s.step}</span>
                <span className="text-xs font-bold" style={{ color: s.color }}>{s.action}</span>
                <span className="text-[9px] text-gray-600 ml-auto font-mono">{s.ms}</span>
              </div>
              <p className="text-[11px] text-gray-400">{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
      <div
        className="text-center mt-4 text-xs transition-all duration-500"
        style={{ opacity: visibleSteps >= 6 ? 1 : 0, color: visibleSteps >= 6 ? '#1D9E75' : '#6b7280' }}
      >
        One click. Six automated actions. Under 1 second. No manual follow-up needed.
      </div>
    </div>
  )
}
