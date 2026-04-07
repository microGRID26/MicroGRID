'use client'

export function FieldOpsTab() {
  return (
    <div className="space-y-6 md:space-y-12">
      <div className="text-center py-3 md:py-6 relative">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.06) 0%, transparent 70%)' }} />
        <div className="text-2xl md:text-4xl mb-1">🔨</div>
        <h2 className="text-xl md:text-2xl font-bold">Field Operations</h2>
        <p className="text-xs md:text-sm text-gray-500 mt-1">Built for crew leads, installers, and field technicians</p>
      </div>

      {/* Field day workflow */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Your Day in the Field</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            { step: '1', name: 'Check Schedule', desc: 'Open crew view on your phone. See today\'s jobs with addresses and customer info.', color: '#1D9E75', icon: '📱' },
            { step: '2', name: 'Navigate to Site', desc: 'Tap the address for Google Maps directions. Customer phone is one tap away.', color: '#3b82f6', icon: '🗺️' },
            { step: '3', name: 'Complete Checklist', desc: 'Follow the job-type checklist. Mark items done as you go. Add photos and notes.', color: '#f59e0b', icon: '✅' },
            { step: '4', name: 'Mark Complete', desc: 'Hit Complete. Tasks auto-update. Funding milestones trigger. Next job loads.', color: '#22c55e', icon: '🎉' },
          ].map(s => (
            <div key={s.step} className="rounded-xl p-5 text-center border" style={{ backgroundColor: `${s.color}08`, borderColor: `${s.color}30` }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.step}</div>
              <div className="text-sm font-bold text-white mt-1">{s.name}</div>
              <div className="text-[10px] text-gray-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile tools */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Your Mobile Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Crew View', desc: 'See your scheduled jobs for the week. Customer name, address, phone, equipment specs, job type.', color: '#1D9E75', href: '/crew' },
            { name: 'One-Tap Navigation', desc: 'Tap any address to open Google Maps with driving directions. Tap phone to call the customer.', color: '#3b82f6', href: '/crew' },
            { name: 'Job Checklists', desc: '5 checklist templates: Install (9 items), Inspection (5), Service (4), Survey (4), Repair (6).', color: '#f59e0b', href: '/work-orders' },
            { name: 'Clock In/Out', desc: 'GPS-tracked time tracking. Clock in when you arrive, clock out when done. Hours automatically logged.', color: '#8b5cf6', href: '/mobile/field' },
            { name: 'Barcode Scanner', desc: 'Scan warehouse stock barcodes with your phone camera. Check out equipment to a project.', color: '#ec4899', href: '/mobile/scan' },
            { name: 'Report Issues', desc: 'Create a ticket from the field. Priority, category. Ops gets notified immediately.', color: '#ef4444', href: '/tickets' },
          ].map(t => (
            <a key={t.name} href={t.href} className="bg-gray-800 rounded-xl p-5 border border-gray-700 block hover:opacity-80 transition-opacity">
              <h3 className="text-sm font-bold" style={{ color: t.color }}>{t.name} →</h3>
              <p className="text-xs text-gray-400 mt-1">{t.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Work order types */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Job Types & Checklists</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { type: 'Install', items: 9, desc: 'Panels, wiring, inverter, battery, testing, cleanup', color: '#f97316' },
            { type: 'Survey', items: 4, desc: 'Roof measurement, electrical panel, photos, shade', color: '#3b82f6' },
            { type: 'Inspection', items: 5, desc: 'Permit verify, visual, electrical test, photos', color: '#06b6d4' },
            { type: 'Service', items: 4, desc: 'Diagnose, repair, test, customer sign-off', color: '#22c55e' },
            { type: 'RNR', items: 9, desc: 'Disconnect, remove panels/racking, inspect roof, reinstall, test', color: '#ef4444' },
          ].map(t => (
            <div key={t.type} className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
              <div className="text-sm font-bold" style={{ color: t.color }}>{t.type}</div>
              <div className="text-2xl font-black text-white mt-1">{t.items}</div>
              <div className="text-[9px] text-gray-500">checklist items</div>
              <div className="text-[10px] text-gray-400 mt-1">{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick start for field */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Field Quick Start</h2>
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          {[
            'Open MicroGRID on your phone browser (microgrid-crm.vercel.app)',
            'Log in with Google — your crew schedule loads automatically',
            'Tap today\'s job to see customer info, address, and equipment',
            'Tap address for Google Maps directions, tap phone to call',
            'After the job: complete the checklist, add notes, mark done',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 py-2">
              <div className="w-6 h-6 rounded-full bg-blue-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">{i + 1}</div>
              <span className="text-sm text-gray-300 pt-0.5">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
