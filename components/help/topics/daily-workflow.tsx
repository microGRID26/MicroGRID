import type { HelpTopicData } from './index'

function CommandCenter() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Your home base. Projects grouped by urgency into collapsible sections. Metric cards at the top show counts -- click any card to expand that section.</p>
      <div className="space-y-1.5 text-xs">
        {[
          { label: 'Overdue Tasks', color: 'bg-red-900 text-red-300', count: 3 },
          { label: 'Blocked', color: 'bg-red-900 text-red-300', count: 8 },
          { label: 'Pending Resolution', color: 'bg-red-900/80 text-red-300', count: 12 },
          { label: 'Critical', color: 'bg-red-900 text-red-300', count: 15 },
          { label: 'At Risk', color: 'bg-amber-900 text-amber-300', count: 22 },
          { label: 'On Track', color: 'bg-green-900 text-green-300', count: 187 },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 bg-gray-800 rounded-md px-3 py-2">
            <span className={`px-2 py-0.5 rounded font-medium text-[10px] ${s.color}`}>{s.count}</span>
            <span className="text-gray-200">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CommandSections() {
  return (
    <div className="space-y-2 text-xs">
      {[
        { section: 'Overdue Tasks', desc: 'Tasks past their scheduled completion date. Immediate attention.' },
        { section: 'Blocked', desc: 'Active blocker set. Auto-set when a task enters Pending Resolution.' },
        { section: 'Pending Resolution', desc: 'Tasks waiting on external action, not yet at Critical SLA.' },
        { section: 'Critical', desc: 'Past the critical SLA threshold for the current stage.' },
        { section: 'At Risk', desc: 'Approaching the critical threshold but not past it yet.' },
        { section: 'Stalled', desc: 'SLA ok but no movement for 5+ days.' },
        { section: 'Aging', desc: '90+ day total cycle time from sale date.' },
        { section: 'On Track', desc: 'Healthy SLA, no blockers, progressing normally.' },
        { section: 'Loyalty', desc: 'Disposition set to Loyalty -- retention efforts underway.' },
        { section: 'In Service', desc: 'Completed the pipeline, now in post-installation mode.' },
      ].map(s => (
        <div key={s.section} className="flex items-start gap-2">
          <span className="text-green-500 mt-0.5 font-bold shrink-0">&bull;</span>
          <span><span className="text-white font-medium">{s.section}</span> -- {s.desc}</span>
        </div>
      ))}
    </div>
  )
}

function QueuePage() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Your daily worklist. PM-filtered, task-based collapsible sections. All start collapsed except Follow-ups Today.</p>
      <div className="space-y-1 text-xs">
        {[
          'Follow-ups Today -- task follow-up dates due today or overdue',
          'City Permit Ready -- City Permit Approval is Ready To Start',
          'City Permit Submitted -- permits in progress, waiting for approval',
          'Utility Permit Submitted -- utility permits in progress',
          'Utility Inspection Ready -- ready to schedule utility inspection',
          'Utility Inspection Submitted -- inspections in progress',
          'Blocked -- projects with a blocker set',
          'Active -- everything else',
          'Complete -- finished projects',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-gray-400">
            <span className="text-gray-600 mt-0.5">&bull;</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OpeningProject() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Click any project row or card anywhere to open the detail panel. It slides in from the right as a modal.</p>
      <div className="bg-gray-800 rounded-lg px-4 py-3 text-xs">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-green-400 font-mono">PROJ-30456</span>
          <span className="text-white font-medium">Johnson Residence</span>
          <span className="ml-auto text-[10px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">Design</span>
        </div>
        <div className="flex gap-2">
          {['Tasks', 'Notes', 'Info', 'BOM', 'Files'].map(tab => (
            <span key={tab} className={`text-[10px] px-2 py-1 rounded ${tab === 'Tasks' ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>{tab}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SearchAndFilter() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Search matches project name, ID, city, and address simultaneously. Combine with dropdown filters for PM, financier, AHJ, and utility.</p>
      <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-3 text-xs">
        <div className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-gray-500">Search by name, ID, city, address...</div>
        <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-[10px]">PM: All</span>
        <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded text-[10px]">AHJ: All</span>
      </div>
    </div>
  )
}

function CsvExport() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Click Export in the Command nav. Pick exactly which fields to include (50+ available, grouped by category). Respects your active PM filter and search.</p>
    </div>
  )
}

function SlaIndicators() {
  return (
    <div>
      <div className="space-y-2 text-xs mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-green-900 text-green-300 font-medium">2d</span>
          <span className="text-gray-400">Green -- on track</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-300 font-medium">5d</span>
          <span className="text-gray-400">Amber -- approaching risk threshold</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-red-900 text-red-300 font-medium">12d</span>
          <span className="text-gray-400">Red -- past risk threshold</span>
        </div>
      </div>
      <p className="text-xs text-amber-400">Note: SLA thresholds are currently paused (all set to 999 days). Projects will show as On Track until re-enabled.</p>
    </div>
  )
}

function StuckTasks() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Stuck task badges appear below project rows throughout the system:</p>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-red-900 text-red-300 px-1.5 py-0.5 rounded text-[10px]">Pending Resolution</span>
          <span className="text-red-400 text-[10px]">MPU Review</span>
          <span className="text-gray-500">-- blocked, waiting on external action</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">Revision Required</span>
          <span className="text-amber-400 text-[10px]">Panel Count Change</span>
          <span className="text-gray-500">-- needs rework</span>
        </div>
      </div>
    </div>
  )
}

export const dailyWorkflowTopics: HelpTopicData[] = [
  {
    id: 'command-center',
    title: 'Command Center',
    description: 'Your home base for all active projects',
    category: 'Daily Workflow',
    keywords: ['command', 'dashboard', 'home', 'overview', 'urgency', 'priority'],
    tryItLink: '/command',
    relatedTopics: ['command-sections', 'sla-indicators'],
    content: CommandCenter,
  },
  {
    id: 'command-sections',
    title: 'Command Center Sections',
    description: 'Overdue, Blocked, Critical, At Risk, and more',
    category: 'Daily Workflow',
    keywords: ['overdue', 'blocked', 'critical', 'at risk', 'stalled', 'aging', 'on track', 'sections'],
    relatedTopics: ['command-center', 'stuck-tasks'],
    content: CommandSections,
  },
  {
    id: 'queue-page',
    title: 'My Queue',
    description: 'Task-based daily worklist for PMs',
    category: 'Daily Workflow',
    keywords: ['queue', 'worklist', 'daily', 'follow-up', 'permit', 'blocked', 'active'],
    tryItLink: '/queue',
    relatedTopics: ['setting-pm-filter', 'command-center'],
    content: QueuePage,
  },
  {
    id: 'opening-project',
    title: 'Opening a Project',
    description: 'Click to open the ProjectPanel with tabs',
    category: 'Daily Workflow',
    keywords: ['project', 'panel', 'open', 'detail', 'modal', 'tabs'],
    relatedTopics: ['task-statuses', 'adding-notes'],
    content: OpeningProject,
  },
  {
    id: 'search-and-filter',
    title: 'Search and Filter',
    description: 'Search bar, PM/financier/AHJ dropdowns',
    category: 'Daily Workflow',
    keywords: ['search', 'filter', 'find', 'pm', 'financier', 'ahj', 'utility', 'dropdown'],
    content: SearchAndFilter,
  },
  {
    id: 'csv-export',
    title: 'CSV Export',
    description: 'Export projects with custom field picker',
    category: 'Daily Workflow',
    keywords: ['export', 'csv', 'download', 'spreadsheet', 'excel', 'fields'],
    tryItLink: '/command',
    content: CsvExport,
  },
  {
    id: 'sla-indicators',
    title: 'SLA Indicators',
    description: 'Green/amber/red badges (currently paused)',
    category: 'Daily Workflow',
    keywords: ['sla', 'threshold', 'green', 'amber', 'red', 'days', 'stage', 'paused'],
    relatedTopics: ['command-sections'],
    content: SlaIndicators,
  },
  {
    id: 'stuck-tasks',
    title: 'Stuck Task Badges',
    description: 'Red/amber badges with reasons',
    category: 'Daily Workflow',
    keywords: ['stuck', 'badge', 'pending', 'revision', 'reason', 'blocked'],
    relatedTopics: ['task-statuses', 'blocker-detection'],
    content: StuckTasks,
  },
]
