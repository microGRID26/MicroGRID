import React from 'react'
import { X } from 'lucide-react'

interface InstructionalGuideProps {
  onDismiss: () => void
}

export function InstructionalGuide({ onDismiss }: InstructionalGuideProps) {
  return (
    <div className="bg-gray-900 border-b border-gray-700 px-4 py-5">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-4 flex-1 pr-8">
            <div>
              <h2 className="text-sm font-bold text-white">Install Ramp-Up Planner — Complete Guide</h2>
              <p className="text-[11px] text-gray-500 mt-1">This tool manages the entire install scheduling pipeline: score project readiness, group by geographic clusters, assign to crews, track 30/60/90-day forecasts.</p>
            </div>

            {/* Step-by-step workflow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-green-400 font-semibold mb-1.5">Step 1: Understand the Tier Cards</div>
                <p className="text-gray-400">At the top of the page, four <span className="text-white">Tier Cards</span> show project counts by readiness score. <span className="text-green-400">Tier 1 (60+)</span> = ready to schedule now. <span className="text-amber-400">Tier 2 (40-59)</span> = almost ready, may need one checklist item. Click any tier card to filter the <span className="text-white">Readiness Queue</span> to just that tier.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-blue-400 font-semibold mb-1.5">Step 2: Update Readiness Checklist</div>
                <p className="text-gray-400">Go to the <span className="text-white">Readiness Queue</span> tab. Each project has a checklist row: <span className="text-white">NTP, Redesign, Ext Scope, Equipment, Utility, Permit, HOA</span>. Click each badge to toggle it on/off — the score recalculates instantly. Focus on getting Tier 2 projects to Tier 1 by confirming their blockers are cleared.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-amber-400 font-semibold mb-1.5">Step 3: Use Proximity Clusters</div>
                <p className="text-gray-400">On the <span className="text-white">Week Planner</span> tab, the map shows all projects color-coded by proximity tier. <span className="text-green-400">Green (0-3 mi)</span>, <span className="text-blue-400">Blue (3-6 mi)</span>, <span className="text-amber-400">Amber (6-12 mi)</span>, <span className="text-gray-300">Gray (12-24 mi)</span> from the warehouse. Click any project dot on the map to see nearby projects and a suggested route. Projects are <span className="text-white">auto-clustered by zip code</span> so crews drive less between jobs. The system groups nearby projects together and assigns them to the same crew.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-purple-400 font-semibold mb-1.5">Step 4: Schedule with Crews</div>
                <p className="text-gray-400">Each crew has slots for the week (default 2 installs/crew/week). Assign projects manually by clicking <span className="text-green-400">+ [Crew Name]</span> on suggested projects, or hit <span className="text-green-400">Auto-Fill Week</span> to let the system assign the best-fit clustered projects to all empty crew slots. Use the <span className="text-white">Activity Filter</span> (Surveys, Installs, Inspections) to focus on one job type.</p>
              </div>
            </div>

            {/* Second row — advanced features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-cyan-400 font-semibold mb-1.5">Complete & Track</div>
                <p className="text-gray-400">On the <span className="text-white">30/60/90 Timeline</span> tab, view your rolling install forecast by week. Click <span className="text-green-400">Complete</span> on a finished install — this automatically updates the project&apos;s Install Complete task, sets M2 funding eligible, and advances the pipeline to Inspection stage. Click <span className="text-red-400">Cancel</span> to reschedule.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-pink-400 font-semibold mb-1.5">Scoring Formula</div>
                <p className="text-gray-400"><span className="text-white">Priority Score</span> = Readiness (50%) + Proximity (20%) + Contract Value (15%) + Cluster Density (15%). Readiness = NTP 20pts + Redesign 20pts + Ext Scope 20pts + Equipment 20pts + Utility 10pts + Permit 5pts + HOA 5pts = 100pt max. Higher-value projects near other ready projects in the same area get scheduled first.</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="text-orange-400 font-semibold mb-1.5">Week Navigation & Config</div>
                <p className="text-gray-400">Use <span className="text-white">← →</span> arrows to navigate weeks. The ramp schedule starts from your configured ramp start date with 2 crews, adding 1 crew every 2 weeks. Warehouse address, installs per crew, and crew assignments are configurable in Admin &gt; Ramp Config. The map always shows the current week&apos;s assignments with route lines between clustered jobs.</p>
              </div>
            </div>

            {/* Quick reference */}
            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[10px] text-gray-500 pt-1 border-t border-gray-700/50">
              <span><span className="text-green-400 font-medium">Tier 1 (60+)</span> Ready to schedule</span>
              <span><span className="text-amber-400 font-medium">Tier 2 (40-59)</span> Almost ready</span>
              <span><span className="text-blue-400 font-medium">Tier 3 (20-39)</span> Needs work</span>
              <span><span className="text-red-400 font-medium">Tier 4 (0-19)</span> Not ready</span>
              <span className="text-gray-600">|</span>
              <span><span className="text-green-400">A</span> 0-3 mi · <span className="text-blue-400">B</span> 3-6 mi · <span className="text-amber-400">C</span> 6-12 mi · <span className="text-gray-300">D</span> 12-24 mi from warehouse</span>
              <span className="text-gray-600">|</span>
              <span>Ramp: 2 crews month 1 → +1 crew every 2 weeks</span>
            </div>
          </div>
          <button onClick={onDismiss}
            className="text-gray-500 hover:text-white flex-shrink-0 mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
