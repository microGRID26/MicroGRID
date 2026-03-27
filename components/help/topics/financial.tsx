import type { HelpTopicData } from './index'

function FundingOverview() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Every project has three funding milestones:</p>
      <div className="space-y-2 text-xs">
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-green-500">
          <span className="text-green-400 font-bold">M1 -- Advance</span>
          <p className="text-gray-400 mt-1">Paid at or near the sale. Funded by the financier after NTP is confirmed.</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-blue-500">
          <span className="text-blue-400 font-bold">M2 -- Substantial Completion</span>
          <p className="text-gray-400 mt-1">Funded when installation is complete. Typically 65% of contract value.</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-amber-500">
          <span className="text-amber-400 font-bold">M3 -- Final</span>
          <p className="text-gray-400 mt-1">Funded after PTO and in-service. Typically 35% of contract value.</p>
        </div>
      </div>
    </div>
  )
}

function FundingPage() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">The Funding page provides a full-featured dashboard for managing M1/M2/M3 milestones across all active projects.</p>
      <div className="space-y-2 text-xs">
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-green-500">
          <span className="text-green-400 font-bold">Inline Editing</span>
          <p className="text-gray-400 mt-1">Click any amount, date, or notes cell to edit directly. Press Enter to save, Escape to cancel. Status dropdowns update instantly.</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-blue-500">
          <span className="text-blue-400 font-bold">Task-Based Sections</span>
          <p className="text-gray-400 mt-1">Three collapsible sections above the table: Ready to Submit, Awaiting Payment (with stale submission highlighting), and Needs Attention (pending/revision).</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-amber-500">
          <span className="text-amber-400 font-bold">Filters, Sorting & Export</span>
          <p className="text-gray-400 mt-1">Filter by status, financier, and search (name, ID, city, AHJ). Click any column header to sort. Export filtered results to CSV.</p>
        </div>
        <div className="bg-gray-800 rounded-lg px-4 py-3 border-l-2 border-red-500">
          <span className="text-red-400 font-bold">NF Codes</span>
          <p className="text-gray-400 mt-1">Click + in the NF Codes column to search and assign nonfunded codes. Click x to remove. Up to 3 codes per project.</p>
        </div>
      </div>
    </div>
  )
}

function FundingStatuses() {
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center gap-2"><span className="bg-amber-900 text-amber-300 px-2 py-0.5 rounded">RTS</span><span className="text-gray-400">-- Ready To Start, milestone triggered</span></div>
      <div className="flex items-center gap-2"><span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded">Sub</span><span className="text-gray-400">-- Submitted to financier, awaiting payment</span></div>
      <div className="flex items-center gap-2"><span className="bg-red-900 text-red-300 px-2 py-0.5 rounded">Pnd</span><span className="text-gray-400">-- Pending Resolution, nonfunded code issue</span></div>
      <div className="flex items-center gap-2"><span className="bg-amber-900 text-amber-300 px-2 py-0.5 rounded">Rev</span><span className="text-gray-400">-- Revision Required, needs someone to redo a task</span></div>
      <div className="flex items-center gap-2"><span className="bg-green-900 text-green-300 px-2 py-0.5 rounded">Fun</span><span className="text-gray-400">-- Funded, payment received</span></div>
    </div>
  )
}

function FundingTriggers() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Milestones trigger automatically when PMs complete tasks:</p>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="bg-green-900 text-green-300 px-1.5 py-0.5 rounded">Install Complete</span>
          <span className="text-gray-500">&rarr;</span>
          <span className="bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">M2 Eligible</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-green-900 text-green-300 px-1.5 py-0.5 rounded">PTO Received</span>
          <span className="text-gray-500">&rarr;</span>
          <span className="bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded">M3 Eligible</span>
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">No manual action needed -- milestones become Eligible the moment the task is marked Complete.</p>
    </div>
  )
}

export const financialTopics: HelpTopicData[] = [
  {
    id: 'funding-overview',
    title: 'Funding Milestones',
    description: 'M1, M2, M3 milestone overview',
    category: 'Financial',
    keywords: ['funding', 'milestone', 'm1', 'm2', 'm3', 'advance', 'completion', 'final'],
    relatedTopics: ['funding-statuses', 'funding-triggers'],
    content: FundingOverview,
  },
  {
    id: 'funding-page',
    title: 'Funding Page',
    description: 'Inline editing, task sections, stale alerts, CSV export',
    category: 'Financial',
    keywords: ['funding', 'page', 'table', 'sort', 'filter', 'financier', 'inline', 'edit', 'csv', 'export', 'stale', 'nf', 'nonfunded'],
    tryItLink: '/funding',
    relatedTopics: ['funding-statuses', 'funding-triggers'],
    content: FundingPage,
  },
  {
    id: 'funding-statuses',
    title: 'Funding Statuses',
    description: 'RTS, Sub, Pnd, Rev, Fun explained',
    category: 'Financial',
    keywords: ['status', 'rts', 'submitted', 'pending', 'revision', 'funded', 'nonfunded'],
    relatedTopics: ['funding-overview', 'funding-page'],
    content: FundingStatuses,
  },
  {
    id: 'funding-triggers',
    title: 'Automatic Funding Triggers',
    description: 'Auto M2 on install, M3 on PTO',
    category: 'Financial',
    keywords: ['trigger', 'auto', 'install', 'pto', 'eligible', 'automatic'],
    relatedTopics: ['funding-overview', 'automations'],
    content: FundingTriggers,
  },
]
