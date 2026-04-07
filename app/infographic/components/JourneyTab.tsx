'use client'

export function JourneyTab() {
  return (
    <div className="space-y-6 md:space-y-12">
      {/* Hero */}
      <div className="text-center py-2 md:py-4">
        <h2 className="text-xl md:text-2xl font-bold">The Homeowner Experience</h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1">From contract signing to powering their home — here&apos;s what the customer experiences at every step.</p>
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-1 rounded-full hidden md:block" style={{ background: 'linear-gradient(to bottom, #3b82f6, #8b5cf6, #ec4899, #f59e0b, #f97316, #06b6d4, #22c55e)' }} />
        {[
          { stage: 'Contract Signed', days: 'Day 0', customer: 'Signs proposal via Spark. Chooses financing. Picks equipment package.', ops: 'Project created automatically. Drive folder generated. Welcome call scheduled.', color: '#3b82f6', icon: '📝' },
          { stage: 'Site Survey', days: 'Day 3-5', customer: 'Crew visits home. Takes measurements and photos. Checks electrical panel.', ops: 'Survey data uploaded. Engineering design initiated. HOA check if applicable.', color: '#8b5cf6', icon: '📐' },
          { stage: 'Design & Engineering', days: 'Day 5-15', customer: 'Receives system design for approval. Reviews panel layout and equipment.', ops: 'String sizing, structural analysis, planset generation. Stamps applied.', color: '#ec4899', icon: '📋' },
          { stage: 'Permitting', days: 'Day 15-45', customer: 'Waits for city/county approval. May need HOA sign-off.', ops: 'Permit submitted to AHJ. Utility interconnection filed. NTP processed. This is often the longest wait.', color: '#f59e0b', icon: '🏛️' },
          { stage: 'Installation', days: 'Day 45-55', customer: 'Crew arrives. Panels go on the roof. Inverter and battery installed. 1-2 day process.', ops: 'Equipment delivered from warehouse. Crew scheduled via ramp planner. Quality checklist completed.', color: '#f97316', icon: '🔨' },
          { stage: 'Inspection', days: 'Day 55-70', customer: 'City inspector visits. Utility inspection scheduled. Customer does not need to be home for most.', ops: 'Inspections scheduled and tracked. Any failures create tickets. Re-inspection if needed.', color: '#06b6d4', icon: '🔍' },
          { stage: 'PTO & In Service', days: 'Day 70-90', customer: 'System turned on! Monitoring activated. Customer sees solar production on their app.', ops: 'PTO received from utility. Monitoring configured. M3 funding triggered. Project complete.', color: '#22c55e', icon: '⚡' },
        ].map((s) => (
          <div key={s.stage} className="relative pl-0 md:pl-20 pb-8">
            <div className="hidden md:flex absolute left-5 top-2 w-7 h-7 rounded-full items-center justify-center text-sm border-2 border-gray-950" style={{ backgroundColor: s.color }}>{s.icon}</div>
            <div className="bg-gray-800 rounded-xl p-5 border border-gray-700 ml-0">
              <div className="flex items-center gap-3 mb-3">
                <span className="md:hidden text-xl">{s.icon}</span>
                <h3 className="text-base font-bold" style={{ color: s.color }}>{s.stage}</h3>
                <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">{s.days}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">What the Customer Sees</div>
                  <p className="text-xs text-gray-300">{s.customer}</p>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">What Happens Behind the Scenes</div>
                  <p className="text-xs text-gray-400">{s.ops}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Where delays happen */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Where Delays Happen & How We Prevent Them</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { blocker: 'Permit rejection', stage: 'Permitting', fix: 'AHJ database with 1,633 records — portal URLs, requirements, and notes from past submissions. Tickets auto-created on rejection.', color: '#f59e0b' },
            { blocker: 'Equipment not delivered', stage: 'Installation', fix: 'Purchase order tracking with vendor performance metrics. Delivery accuracy tracking. Auto-alerts on delays.', color: '#f97316' },
            { blocker: 'Failed inspection', stage: 'Inspection', fix: 'Ticket auto-created with SLA timer. Re-inspection scheduled. Blocker auto-set on project.', color: '#06b6d4' },
            { blocker: 'Utility PTO delay', stage: 'PTO', fix: 'Utility tracking with application numbers. Follow-up reminders. Escalation to utility rep.', color: '#22c55e' },
            { blocker: 'HOA not approved', stage: 'Design', fix: 'HOA database with contacts. Auto-tracked in task system. Follow-up dates with notifications.', color: '#ec4899' },
            { blocker: 'Customer unreachable', stage: 'Any', fix: 'Follow-up dates surface on Command Center. Overdue notifications in bell. PM sees it every morning.', color: '#ef4444' },
          ].map(b => (
            <div key={b.blocker} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: `${b.color}20`, color: b.color }}>{b.stage}</span>
                <span className="text-xs font-bold text-white">{b.blocker}</span>
              </div>
              <p className="text-[10px] text-gray-400">{b.fix}</p>
            </div>
          ))}
        </div>
      </div>

      {/* The numbers */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">By the Numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: '~90', unit: 'days', label: 'Avg Sale to In-Service', color: '#1D9E75', pct: 100 },
            { value: '~55', unit: 'days', label: 'Avg Sale to Install', color: '#3b82f6', pct: 61 },
            { value: '7', unit: 'stages', label: 'Automated Pipeline', color: '#f59e0b', pct: 100 },
            { value: '30+', unit: 'tasks', label: 'Per Project Tracked', color: '#8b5cf6', pct: 100 },
          ].map(n => (
            <div key={n.label} className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700 relative overflow-hidden">
              <svg className="ring-chart w-20 h-20 mx-auto mb-2" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#1f2937" strokeWidth="6" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={n.color} strokeWidth="6" strokeLinecap="round"
                  strokeDasharray="283" strokeDashoffset={283 - (283 * n.pct / 100)}
                  className="animate-grow" style={{ animationDuration: '1.5s' }} />
              </svg>
              <div className="text-3xl font-black" style={{ color: n.color }}>{n.value}</div>
              <div className="text-xs text-gray-400">{n.unit}</div>
              <div className="text-[10px] text-gray-500 mt-1">{n.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
