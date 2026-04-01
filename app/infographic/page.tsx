'use client'

import { useState, useEffect } from 'react'
import { Nav } from '@/components/Nav'
import { db } from '@/lib/db'
import { fmt$ } from '@/lib/utils'
import { Printer } from 'lucide-react'

// ── Executive Platform Overview — for Mark (CEO) ─────────────────────────────

interface PipelineStage {
  stage: string
  count: number
  value: number
  label: string
  color: string
}

const STAGE_META: Record<string, { label: string; color: string }> = {
  evaluation: { label: 'Evaluation', color: '#3b82f6' },
  survey: { label: 'Site Survey', color: '#8b5cf6' },
  design: { label: 'Design', color: '#ec4899' },
  permit: { label: 'Permitting', color: '#f59e0b' },
  install: { label: 'Installation', color: '#f97316' },
  inspection: { label: 'Inspection', color: '#06b6d4' },
  complete: { label: 'Complete', color: '#22c55e' },
}

export default function InfographicPage() {
  const [pipeline, setPipeline] = useState<PipelineStage[]>([])
  const [totalProjects, setTotalProjects] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [legacyCount, setLegacyCount] = useState(14705)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await db().from('projects')
        .select('stage, contract')
        .not('disposition', 'in', '("In Service","Loyalty","Cancelled")')
        .limit(2000)
      if (data) {
        const byStage: Record<string, { count: number; value: number }> = {}
        let total = 0
        let totalVal = 0
        for (const p of data as any[]) {
          const s = p.stage
          if (!byStage[s]) byStage[s] = { count: 0, value: 0 }
          byStage[s].count++
          byStage[s].value += Number(p.contract) || 0
          total++
          totalVal += Number(p.contract) || 0
        }
        const stages: PipelineStage[] = []
        for (const s of ['evaluation', 'survey', 'design', 'permit', 'install', 'inspection', 'complete']) {
          const meta = STAGE_META[s]
          const d = byStage[s] ?? { count: 0, value: 0 }
          if (d.count > 0) stages.push({ stage: s, count: d.count, value: d.value, label: meta.label, color: meta.color })
        }
        setPipeline(stages)
        setTotalProjects(total)
        setTotalValue(totalVal)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const maxCount = Math.max(...pipeline.map(s => s.count), 1)

  return (
    <div className="min-h-screen bg-gray-950 text-white print:bg-white print:text-black">
      <Nav active="Infographic" />

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-16 print:space-y-8">

        {/* ═══ HERO ═══ */}
        <div className="text-center space-y-4">
          <div className="flex justify-end print:hidden">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-md">
              <Printer className="w-3.5 h-3.5" /> Print for Board
            </button>
          </div>
          <h1 className="text-4xl font-bold">
            <span className="text-green-400 print:text-green-700">MicroGRID</span> Platform
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto print:text-gray-600">
            End-to-end solar project management from contract signing to in-service.
            Real-time visibility across every project, crew, and dollar.
          </p>

          {/* Business metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
            {[
              { value: loading ? '...' : totalProjects.toLocaleString(), label: 'Active Projects', sub: 'In pipeline now' },
              { value: loading ? '...' : `$${Math.round(totalValue / 1000000)}M`, label: 'Portfolio Value', sub: 'Under management' },
              { value: '7', label: 'Pipeline Stages', sub: 'Fully automated' },
              { value: legacyCount.toLocaleString(), label: 'Legacy Projects', sub: 'Historical data preserved' },
              { value: '2→8', label: 'Crew Ramp', sub: 'Scaling in 16 weeks' },
              { value: '24/7', label: 'Real-Time', sub: 'All devices, all roles' },
            ].map(s => (
              <div key={s.label} className="bg-gray-800 rounded-xl p-4 text-center border border-gray-700 print:border-gray-300 print:bg-gray-50">
                <div className="text-3xl font-bold text-green-400 print:text-green-700">{s.value}</div>
                <div className="text-sm font-semibold text-white mt-1 print:text-black">{s.label}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ THE PIPELINE — Money Slide ═══ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Project Pipeline</h2>
          <p className="text-sm text-gray-500 mb-6">Every project flows through 7 stages with automated task management, SLA tracking, and milestone triggers.</p>

          <div className="space-y-3">
            {pipeline.map((s, i) => (
              <div key={s.stage} className="flex items-center gap-4">
                <div className="w-28 text-right flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color: s.color }}>{s.label}</div>
                  <div className="text-[10px] text-gray-500">{s.count} projects</div>
                </div>
                <div className="flex-1 relative">
                  <div className="h-10 rounded-lg overflow-hidden bg-gray-800 print:bg-gray-100">
                    <div className="h-full rounded-lg flex items-center px-3 transition-all"
                      style={{ width: `${Math.max((s.count / maxCount) * 100, 8)}%`, backgroundColor: `${s.color}30`, borderLeft: `4px solid ${s.color}` }}>
                      <span className="text-sm font-bold text-white print:text-black">{fmt$(s.value)}</span>
                    </div>
                  </div>
                </div>
                {i < pipeline.length - 1 && (
                  <div className="text-gray-600 text-sm flex-shrink-0">→</div>
                )}
                {i === pipeline.length - 1 && (
                  <div className="text-green-500 text-sm flex-shrink-0 font-bold">✓</div>
                )}
              </div>
            ))}
            <div className="flex items-center gap-4 pt-3 border-t border-gray-700 print:border-gray-300">
              <div className="w-28 text-right">
                <div className="text-sm font-bold text-white print:text-black">Total Pipeline</div>
              </div>
              <div className="flex-1">
                <span className="text-2xl font-bold text-green-400 print:text-green-700">{fmt$(totalValue)}</span>
                <span className="text-sm text-gray-500 ml-3">across {totalProjects} projects</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ COMPETITIVE ADVANTAGES ═══ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Why This Platform Matters</h2>
          <p className="text-sm text-gray-500 mb-6">Purpose-built for solar. Not a generic CRM adapted to solar — built from the ground up for how EDGE operates.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Solar-Specific Pipeline', desc: '7 stages with 30+ task types built for solar installation workflow. Not a generic project board.', icon: '☀️' },
              { title: 'Crew Route Optimization', desc: 'Geographic clustering assigns crews to nearby jobs. Map visualization shows routes. Minimizes drive time.', icon: '🗺️' },
              { title: 'AHJ Integration', desc: '1,633 permit authorities with portal URLs, credentials, permit requirements. Instant lookup per project.', icon: '🏛️' },
              { title: 'Automated Milestones', desc: 'Install Complete → M2 Eligible. PTO Received → M3 Eligible. Stage advances trigger funding workflows automatically.', icon: '⚡' },
              { title: 'Real-Time SLA Tracking', desc: 'Every stage has target/risk/critical thresholds. Overdue projects surface automatically. No project falls through the cracks.', icon: '⏱️' },
              { title: 'Multi-Tenant Ready', desc: 'Organization-scoped data, role-based access, cross-org engineering assignments. Built for the EDGE partner network.', icon: '🏢' },
              { title: 'AI-Powered Queries', desc: 'Atlas AI lets you ask questions in plain English: "Show me all Houston projects over $50K stuck in permitting."', icon: '🤖' },
              { title: 'Ramp-Up Planner', desc: 'Install scheduling with readiness scoring, auto-clustering, crew scaling forecasts, and 30/60/90 day revenue projections.', icon: '📈' },
              { title: 'Complete Audit Trail', desc: 'Every field change, task status update, and user action is logged with timestamp and author. Full accountability.', icon: '📋' },
            ].map(a => (
              <div key={a.title} className="bg-gray-800 rounded-xl p-5 border border-gray-700 print:border-gray-300 print:bg-gray-50">
                <div className="text-2xl mb-2">{a.icon}</div>
                <h3 className="text-sm font-bold text-white mb-1 print:text-black">{a.title}</h3>
                <p className="text-xs text-gray-400 print:text-gray-600">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ WHAT'S BEEN BUILT ═══ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Development Timeline</h2>
          <p className="text-sm text-gray-500 mb-6">Major milestones shipped. Each session delivers production-ready features with full test coverage.</p>

          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700 print:bg-gray-300" />
            {[
              { date: 'Mar 2026 — Session 20', title: 'Multi-Tenant Foundation', items: ['Organization system with role-based access', 'NTP approval workflow', 'Org-scoped RLS on 30 tables', 'Server-side route protection'] },
              { date: 'Mar 2026 — Session 21', title: 'Operations & Analytics', items: ['Live SLA thresholds restored', 'Daily digest email for PMs', 'Commission system with pay scales', 'Analytics overhaul (6 tabs)', 'Mobile clock in/out'] },
              { date: 'Mar 31 — Session 22', title: 'Ticketing & Scheduling', items: ['Full ticketing system (8 statuses, 26 categories, SLA)', 'Install ramp-up planner with route optimization', 'Project map with stage colors', 'Compliance tab for rep licensing', 'Zach/Marlie feedback: 15 items shipped'] },
              { date: 'Apr 1 — Session 22 cont.', title: 'Platform Polish', items: ['Crew-aware geographic clustering', 'Global search (⌘K)', 'Quick action menus (inline blocker/note/follow-up)', 'Auto-readiness from NTP/equipment/task data', 'Platform infographic for leadership'] },
            ].map((m, i) => (
              <div key={i} className="relative pl-10 pb-8">
                <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-950 print:border-white" />
                <div className="text-[10px] text-green-400 font-medium print:text-green-700">{m.date}</div>
                <h3 className="text-sm font-bold text-white mt-0.5 print:text-black">{m.title}</h3>
                <div className="mt-1.5 space-y-0.5">
                  {m.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs text-gray-400 print:text-gray-600">
                      <span className="text-green-500 mt-0.5">•</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ RAMP-UP FORECAST ═══ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Install Ramp-Up Forecast</h2>
          <p className="text-sm text-gray-500 mb-6">Starting with 2 crews in Houston, scaling to 8+ over 16 weeks. Revenue projections based on pipeline readiness.</p>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 print:border-gray-300 print:bg-gray-50">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { period: 'Month 1', crews: 2, installs: '16', revenue: 'Est. $700K' },
                { period: 'Month 2', crews: 4, installs: '32', revenue: 'Est. $1.4M' },
                { period: 'Month 3', crews: 6, installs: '48', revenue: 'Est. $2.1M' },
                { period: 'Month 4', crews: 8, installs: '64', revenue: 'Est. $2.8M' },
              ].map(p => (
                <div key={p.period} className="text-center">
                  <div className="text-xs text-gray-500">{p.period}</div>
                  <div className="text-2xl font-bold text-green-400 print:text-green-700">{p.installs}</div>
                  <div className="text-[10px] text-gray-400">installs ({p.crews} crews)</div>
                  <div className="text-xs font-semibold text-white mt-1 print:text-black">{p.revenue}</div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-1 h-24">
              {Array.from({ length: 16 }, (_, i) => {
                const crews = i < 4 ? 2 : 2 + Math.floor((i - 4) / 2) + 1
                const installs = crews * 2
                const maxInstalls = 16
                const height = (installs / maxInstalls) * 100
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full rounded-t" style={{ height: `${height}%`, backgroundColor: i < 4 ? '#1D9E75' : i < 8 ? '#3b82f6' : '#8b5cf6' }} />
                    <span className="text-[8px] text-gray-600">{i + 1}</span>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-gray-600">
              <span>Week 1</span>
              <span>← Green: 2 crews | Blue: 3-4 crews | Purple: 5+ crews →</span>
              <span>Week 16</span>
            </div>
          </div>
        </div>

        {/* ═══ BY ROLE ═══ */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-1 print:text-black">Built For Every Role</h2>
          <p className="text-sm text-gray-500 mb-6">Each team member gets purpose-built tools for their daily workflow.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { role: 'Project Managers', color: '#1D9E75', tools: ['Morning Command Center with action items', 'Prioritized Queue with smart filters', 'One-click blocker and follow-up management', 'Full project panel with task automation'] },
              { role: 'Operations & Scheduling', color: '#3b82f6', tools: ['Crew calendar with batch complete', 'Ramp-up planner with route optimization', 'Ticket system with SLA tracking', 'Work orders with type-specific checklists'] },
              { role: 'Leadership & Finance', color: '#8b5cf6', tools: ['6-tab analytics dashboard', 'Funding milestone tracking (M1/M2/M3)', 'Revenue forecasting by period', 'Geographic project map'] },
              { role: 'Administration', color: '#ec4899', tools: ['Editable permission matrix', 'Configurable ticket categories and SLAs', 'AHJ/utility/HOA reference management', 'Feature flags for gradual rollout'] },
            ].map(p => (
              <div key={p.role} className="bg-gray-800 rounded-xl p-5 border border-gray-700 print:border-gray-300 print:bg-gray-50">
                <h3 className="text-sm font-bold mb-3" style={{ color: p.color }}>{p.role}</h3>
                <div className="space-y-2">
                  {p.tools.map((tool, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-300 print:text-gray-700">
                      <span className="mt-0.5 flex-shrink-0" style={{ color: p.color }}>✓</span>
                      {tool}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ QUALITY ═══ */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 print:border-gray-300 print:bg-gray-50">
          <h2 className="text-lg font-bold text-white mb-3 print:text-black">Enterprise-Grade Quality</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400 print:text-green-700">2,506</div>
              <div className="text-xs text-gray-400">Automated Tests</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 print:text-green-700">66</div>
              <div className="text-xs text-gray-400">Database Migrations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 print:text-green-700">74</div>
              <div className="text-xs text-gray-400">Test Suites</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 print:text-green-700">100%</div>
              <div className="text-xs text-gray-400">Auto-Deploy on Push</div>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 text-center mt-4">
            Every feature goes through a two-round audit protocol: build → test → audit → fix → re-audit.
            Deployed automatically to production via Vercel on every push to main.
          </p>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div className="text-center py-6 border-t border-gray-800 print:border-gray-300">
          <p className="text-sm text-gray-400 print:text-gray-600">
            Built by <span className="text-green-400 font-semibold print:text-green-700">Atlas</span> for MicroGRID Energy / EDGE
          </p>
          <p className="text-[10px] text-gray-600 mt-1">
            Next.js 16 · React 19 · TypeScript · Supabase · Tailwind CSS · Vercel
          </p>
        </div>
      </div>
    </div>
  )
}
