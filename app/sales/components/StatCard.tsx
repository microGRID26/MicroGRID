import React from 'react'

export function StatCard({ label, value, icon, accent }: {
  label: string; value: string | number; icon: React.ReactNode; accent: string
}) {
  const colors: Record<string, { bg: string; border: string; text: string; iconColor: string }> = {
    green: { bg: 'bg-green-900/30', border: 'border-green-700/50', text: 'text-green-400', iconColor: 'text-green-500' },
    blue: { bg: 'bg-blue-900/30', border: 'border-blue-700/50', text: 'text-blue-400', iconColor: 'text-blue-500' },
    amber: { bg: 'bg-amber-900/30', border: 'border-amber-700/50', text: 'text-amber-400', iconColor: 'text-amber-500' },
    purple: { bg: 'bg-purple-900/30', border: 'border-purple-700/50', text: 'text-purple-400', iconColor: 'text-purple-500' },
    red: { bg: 'bg-red-900/30', border: 'border-red-700/50', text: 'text-red-400', iconColor: 'text-red-500' },
  }
  const c = colors[accent] ?? colors.green
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">{label}</span>
        <span className={c.iconColor}>{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${c.text} tracking-tight`}>{value}</p>
    </div>
  )
}
