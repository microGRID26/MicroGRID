'use client'

export function InsideOpsTab() {
  return (
    <div className="space-y-6 md:space-y-12">
      <div className="text-center py-2">
        <h2 className="text-xl md:text-2xl font-bold">Inside Operations</h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1">For PMs, ops managers, and inside coordinators</p>
      </div>

      {/* Daily workflow */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Your Daily Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { step: '1', name: 'Command Center', desc: 'Action items, stuck tasks, follow-ups, today\'s schedule', color: '#1D9E75', href: '/command' },
            { step: '2', name: 'Queue', desc: 'Prioritized worklist — smart filters, inline actions', color: '#3b82f6', href: '/queue' },
            { step: '3', name: 'Pipeline', desc: 'Visual Kanban board — change status, add notes, set follow-ups', color: '#f59e0b', href: '/pipeline' },
            { step: '4', name: 'Schedule', desc: 'Confirm jobs, assign crews, batch complete installs', color: '#8b5cf6', href: '/schedule' },
            { step: '5', name: 'Tickets', desc: 'Handle issues, track SLA, resolve complaints', color: '#ec4899', href: '/tickets' },
          ].map(s => (
            <a key={s.step} href={s.href} className="rounded-xl p-5 text-center border block hover:opacity-80 transition-opacity" style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}30` }}>
              <div className="text-3xl font-black" style={{ color: s.color }}>{s.step}</div>
              <div className="text-sm font-bold text-white mt-2">{s.name}</div>
              <div className="text-[10px] text-gray-500 mt-1">{s.desc}</div>
            </a>
          ))}
        </div>
      </div>

      {/* Automations */}
      <div>
        {/* Total time saved */}
        <div className="bg-gradient-to-r from-green-900/20 to-green-900/5 border border-green-800/30 rounded-xl p-5 text-center">
          <div className="text-3xl font-black text-green-400 drop-shadow-[0_0_20px_rgba(29,158,117,0.3)]">~45 min/day saved</div>
          <div className="text-sm text-gray-400 mt-1">Per PM through automation — that&apos;s 3.75 hours per week back</div>
        </div>

        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Automation Saves You Time</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { category: 'Pipeline', color: '#1D9E75', items: [
              { before: 'Manually advance stage', now: 'Auto-advances on task complete', saved: '~2 min/project' },
              { before: 'Check M2 eligibility', now: 'Auto-sets on install complete', saved: '~1 min/project' },
              { before: 'Set project blocker', now: 'Auto-sets on stuck task', saved: '~1 min/project' },
            ]},
            { category: 'Scheduling', color: '#3b82f6', items: [
              { before: 'Figure out crew routes', now: 'Geographic clustering suggests crews', saved: '~15 min/week' },
              { before: 'Update tasks after install', now: 'Batch complete syncs tasks', saved: '~2 min/day' },
              { before: 'Calculate readiness', now: 'Auto-scored from task data', saved: '~10 min/week' },
            ]},
            { category: 'Communication', color: '#8b5cf6', items: [
              { before: 'Remember follow-ups', now: 'Bell notification when overdue', saved: '~5 min/day' },
              { before: 'Notify team on @mention', now: 'Instant notification badge', saved: '~1 min/mention' },
            ]},
          ].map(group => (
            <div key={group.category} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: group.color }}>{group.category}</h3>
              <div className="space-y-3">
                {group.items.map((a, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-red-400 line-through">{a.before}</div>
                    <div className="text-xs text-green-400">{a.now}</div>
                    <div className="text-[9px] text-amber-400 mt-0.5">{a.saved}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shortcuts */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Tips & Shortcuts</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { shortcut: '\u2318K', desc: 'Global search — find any project from any page' },
            { shortcut: '\u00b7\u00b7\u00b7', desc: 'Quick Actions on Queue cards — set blocker, add note, follow-up' },
            { shortcut: 'Select', desc: 'Batch select on Queue/Pipeline/Tasks — bulk update multiple items' },
            { shortcut: 'Auto-Fill', desc: 'Ramp planner fills all crew slots with best-fit projects' },
            { shortcut: '@name', desc: 'Mention anyone in notes or tickets — instant bell notification' },
            { shortcut: 'CSV', desc: 'Export any page to spreadsheet — projects, tickets, analytics' },
          ].map((t, i) => (
            <div key={i} className="bg-gray-800 rounded-lg px-4 py-3 border border-gray-700 flex items-start gap-3">
              <span className="text-[10px] bg-gray-700 text-green-400 px-2 py-0.5 rounded font-mono flex-shrink-0">{t.shortcut}</span>
              <span className="text-xs text-gray-300">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick start */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">New PM Quick Start</h2>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          {['Log in with Google (@gomicrogridenergy.com)', 'Command Center loads — check your action items and stuck tasks', 'Queue shows your assigned projects filtered by default', 'Click any project \u2192 Tasks tab to update statuses and add notes', 'Questions? Help page or @mention someone in Notes'].map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <div className="w-6 h-6 rounded-full bg-green-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</div>
              <span className="text-sm text-gray-300 pt-0.5">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
