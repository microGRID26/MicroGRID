import React from 'react'

export function ScoringLegend() {
  return (
    <div className="bg-gray-800/50 rounded-lg px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1">
      <span className="text-[10px] text-gray-500 uppercase font-medium tracking-wider">Scoring:</span>
      <div className="flex items-center gap-4 text-[10px]">
        <span className="text-gray-400"><span className="text-white font-semibold">Readiness</span> (50%): NTP 20 + Redesign 20 + Ext Scope 20 + Equipment 20 + Utility 10 + Permit 5 + HOA 5 = 100pt</span>
      </div>
      <div className="flex items-center gap-4 text-[10px]">
        <span className="text-gray-400"><span className="text-white font-semibold">Proximity</span> (20%): Distance from warehouse</span>
        <span className="text-gray-400"><span className="text-white font-semibold">Contract</span> (15%): Higher value = higher priority</span>
        <span className="text-gray-400"><span className="text-white font-semibold">Cluster</span> (15%): Projects in same zip</span>
      </div>
      <div className="flex items-center gap-3 text-[10px] ml-auto">
        <span className="text-green-400">T1: 60+</span>
        <span className="text-amber-400">T2: 40-59</span>
        <span className="text-blue-400">T3: 20-39</span>
        <span className="text-red-400">T4: 0-19</span>
      </div>
    </div>
  )
}
