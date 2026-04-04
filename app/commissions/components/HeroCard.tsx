import React from 'react'

// ── Hero Stat Card ──────────────────────────────────────────────────────────

export function HeroCard({ label, value, icon, accent, subtitle }: {
  label: string
  value: string
  icon: React.ReactNode
  accent: 'green' | 'blue' | 'amber' | 'emerald'
  subtitle?: string
}) {
  const colors = {
    green: { bg: 'bg-green-900/30', border: 'border-green-700/50', text: 'text-green-400', icon: 'text-green-500' },
    blue: { bg: 'bg-blue-900/30', border: 'border-blue-700/50', text: 'text-blue-400', icon: 'text-blue-500' },
    amber: { bg: 'bg-amber-900/30', border: 'border-amber-700/50', text: 'text-amber-400', icon: 'text-amber-500' },
    emerald: { bg: 'bg-emerald-900/30', border: 'border-emerald-700/50', text: 'text-emerald-400', icon: 'text-emerald-500' },
  }
  const c = colors[accent]

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4 md:p-6`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className={c.icon}>{icon}</span>
      </div>
      <p className={`text-2xl md:text-3xl font-bold ${c.text} tracking-tight`}>{value}</p>
      {subtitle && <p className="text-[10px] text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}
