'use client'

import { fmt$ } from '@/lib/utils'

interface PipelineStage { stage: string; count: number; value: number; label: string; color: string }

interface SalesTabProps {
  stats: {
    totalProjects: number
    totalValue: number
    pipeline: PipelineStage[]
  }
}

export function SalesTab({ stats }: SalesTabProps) {
  return (
    <div className="space-y-6 md:space-y-12">
      {/* Commission pipeline */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Your Commission Pipeline</h2>
        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 animate-flow" style={{ marginTop: '-1px' }} />
        </div>
        <div className="flex items-center gap-1 overflow-x-auto pb-2 relative z-10">
          {[
            { step: 'Contract Signed', desc: 'Deal enters pipeline', color: '#3b82f6', icon: '📝' },
            { step: 'NTP Approved', desc: 'Notice to proceed', color: '#8b5cf6', icon: '✅' },
            { step: 'Design & Permit', desc: 'Engineering + AHJ', color: '#f59e0b', icon: '📐' },
            { step: 'Install Complete', desc: 'System on the roof', color: '#f97316', icon: '🔨' },
            { step: 'Inspection Passed', desc: 'City/utility approval', color: '#06b6d4', icon: '🔍' },
            { step: 'PTO Received', desc: 'Permission to operate', color: '#22c55e', icon: '⚡' },
            { step: 'Commission Paid', desc: 'Rep gets paid', color: '#1D9E75', icon: '💰' },
          ].map((s, i) => (
            <div key={s.step} className="flex items-center flex-shrink-0">
              <div className="rounded-xl px-3 md:px-4 py-3 md:py-4 text-center min-w-[90px] md:min-w-[120px] border" style={{ backgroundColor: `${s.color}10`, borderColor: `${s.color}40` }}>
                <div className="text-lg md:text-xl mb-1">{s.icon}</div>
                <div className="text-[10px] font-bold" style={{ color: s.color }}>{s.step}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">{s.desc}</div>
              </div>
              {i < 6 && <span className="mx-1 text-gray-600">&rarr;</span>}
            </div>
          ))}
        </div>
      </div>

      {/* What happens after you submit */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-2">What Happens After You Close</h2>
        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">You close the sale — here&apos;s how your deal moves toward your paycheck.</p>
        <div className="space-y-2">
          {[
            { step: 1, who: 'Your Deal', action: 'Contract enters the pipeline. Your commission is calculated and tracked from this moment.', color: '#3b82f6' },
            { step: 2, who: 'Survey', action: 'Site survey gets scheduled. The faster this happens, the faster you get paid.', color: '#1D9E75' },
            { step: 3, who: 'Design', action: 'Engineering designs the system and gets stamps. Any change orders are tracked so you know if the deal changes.', color: '#8b5cf6' },
            { step: 4, who: 'Approved', action: 'Notice to Proceed approved. Your deal is greenlit for installation.', color: '#22c55e' },
            { step: 5, who: 'Permits', action: 'Permits submitted. This is the waiting game — the system tracks every deadline and follows up automatically.', color: '#f59e0b' },
            { step: 6, who: 'Install', action: 'Crew installs the system. When complete, your first commission payment is triggered automatically.', color: '#f97316' },
            { step: 7, who: 'Paid', action: 'Inspections pass, system goes live, final funding hits. Your full commission is paid out. Check your Earnings Dashboard anytime.', color: '#1D9E75' },
          ].map(s => (
            <div key={s.step} className={`flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-3 border border-gray-700 animate-slide animate-slide-${s.step}`}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ backgroundColor: `${s.color}20`, color: s.color, boxShadow: `0 0 12px ${s.color}20` }}>{s.step}</div>
              <div className="flex-1">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mr-2" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{s.who}</span>
                <span className="text-xs text-gray-300">{s.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How you get paid */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">How You Get Paid</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-sm font-bold text-green-400 mb-3">Deal Snapshot</h3>
            <div className="space-y-3">
              {[
                { label: 'Avg System Size', value: `${stats.totalProjects > 0 ? (stats.pipeline.reduce((s, p) => s + p.count, 0) > 0 ? '8.4' : '\u2014') : '\u2014'} kW`, color: '#1D9E75' },
                { label: 'Avg Contract Value', value: `${stats.totalValue > 0 ? fmt$(Math.round(stats.totalValue / stats.totalProjects)) : '\u2014'}`, color: '#3b82f6' },
                { label: 'Active Pipeline', value: `${stats.totalProjects} deals`, color: '#8b5cf6' },
                { label: 'Pipeline Value', value: fmt$(stats.totalValue), color: '#f59e0b' },
                { label: 'Avg Sale to Install', value: '~60 days', color: '#f97316' },
              ].map(t => (
                <div key={t.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{t.label}</span>
                  <span className="text-sm font-bold" style={{ color: t.color }}>{t.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
            <h3 className="text-sm font-bold text-amber-400 mb-3">How Your Deal Tracks</h3>
            <div className="space-y-3">
              {[
                { label: 'Deal Submitted', icon: '📝', desc: 'Commission calculated instantly' },
                { label: 'Install Complete', icon: '🔨', desc: 'First payment triggered' },
                { label: 'System Live', icon: '⚡', desc: 'Final payment processed' },
                { label: 'Earnings Dashboard', icon: '📊', desc: 'Track every dollar, every deal' },
              ].map(t => (
                <div key={t.label} className="flex items-center gap-3">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <div className="text-xs font-medium text-white">{t.label}</div>
                    <div className="text-[10px] text-gray-500">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 text-[10px] text-gray-500">
              Your pay scale is in your profile · Talk to your manager about tier upgrades
            </div>
          </div>
        </div>
      </div>

      {/* Rep tools */}
      <div>
        <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Your Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { name: 'Commission Calculator', desc: 'Enter system size + adders \u2192 see your payout breakdown by role', color: '#1D9E75', href: '/commissions' },
            { name: 'Earnings Dashboard', desc: 'YTD earnings, deal history, pending vs paid commissions', color: '#3b82f6', href: '/commissions' },
            { name: 'Leaderboard', desc: 'Team rankings by commission, deals, kW sold with period filters', color: '#f59e0b', href: '/commissions' },
            { name: 'Onboarding Tracker', desc: 'License, W-9, ICA, background check status all in one place', color: '#8b5cf6', href: '/sales' },
            { name: 'Spark Proposals', desc: 'Create customer proposals with roof design, pricing, and e-signature', color: '#ec4899', href: 'https://spark-portal.vercel.app' },
            { name: 'Rep Scorecard', desc: 'Deals, total earned, paid, pending, average per deal', color: '#06b6d4', href: '/sales' },
          ].map(t => (
            <a key={t.name} href={t.href} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-opacity-100 transition-colors block" style={{ borderColor: `${t.color}30` }}>
              <h3 className="text-xs font-bold" style={{ color: t.color }}>{t.name} &rarr;</h3>
              <p className="text-[10px] text-gray-400 mt-1">{t.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
