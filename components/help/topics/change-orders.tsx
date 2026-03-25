import type { HelpTopicData } from './index'

function ChangeOrderOverview() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">When a system design changes after the initial proposal (usually panel count reduction during engineering), a Homeowner Change Order (HCO) is required. This happens on almost every job.</p>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center gap-2"><span className="bg-red-900 text-red-300 px-2 py-0.5 rounded-full">Open</span><span className="text-gray-400">-- newly created, not started</span></div>
        <div className="flex items-center gap-2"><span className="bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">In Progress</span><span className="text-gray-400">-- auto-set when first step checked</span></div>
        <div className="flex items-center gap-2"><span className="bg-amber-900 text-amber-300 px-2 py-0.5 rounded-full">Waiting On Signature</span><span className="text-gray-400">-- design done, awaiting homeowner</span></div>
        <div className="flex items-center gap-2"><span className="bg-green-900 text-green-300 px-2 py-0.5 rounded-full">Complete</span><span className="text-gray-400">-- all 6 steps done</span></div>
        <div className="flex items-center gap-2"><span className="bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Cancelled</span><span className="text-gray-400">-- change order abandoned</span></div>
      </div>
    </div>
  )
}

function DesignWorkflow() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">6-step design workflow with checkboxes. Check steps as they complete -- saves immediately.</p>
      <div className="bg-gray-800/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Design Workflow</span>
          <span className="text-xs text-gray-500">4/6 steps</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full bg-green-600" style={{ width: '67%' }} />
        </div>
        <div className="space-y-1">
          {[
            { label: '1. Design Request Submitted (HCO)', done: true },
            { label: '2. Design In Progress', done: true },
            { label: '3. Design Pending Approval (HCO)', done: true },
            { label: '4. Design Approved (HCO)', done: true },
            { label: '5. Design Complete', done: false },
            { label: '6. Design Complete and Signed (HCO)', done: false },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg ${s.done ? 'bg-green-900/20' : ''}`}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-green-600 border-green-600' : 'border-gray-600'}`}>
                {s.done && <span className="text-white text-[10px]">&#10003;</span>}
              </div>
              <span className={`text-xs ${s.done ? 'text-green-300 line-through' : 'text-gray-300'}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DesignComparison() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Original vs new design values side-by-side. Changed values highlight green.</p>
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden text-xs">
        <div className="grid grid-cols-3 gap-0 px-3 py-2 bg-gray-800/50 border-b border-gray-800">
          <span className="text-gray-500 font-medium">Field</span>
          <span className="text-gray-500 font-medium text-center">Original</span>
          <span className="text-gray-500 font-medium text-center">New</span>
        </div>
        {[
          { field: 'Panel Count', orig: '48', newVal: '42' },
          { field: 'System Size (kW)', orig: '19.44', newVal: '17.01' },
          { field: 'KWH/YR', orig: '23,953', newVal: '22,346' },
        ].map(r => (
          <div key={r.field} className="grid grid-cols-3 gap-0 px-3 py-1.5 border-b border-gray-800/50">
            <span className="text-gray-400">{r.field}</span>
            <span className="text-gray-300 text-center">{r.orig}</span>
            <span className="text-green-400 font-medium text-center">{r.newVal}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const changeOrderTopics: HelpTopicData[] = [
  {
    id: 'change-order-overview',
    title: 'Change Orders',
    description: 'HCO workflow for design changes',
    category: 'Change Orders',
    keywords: ['change order', 'hco', 'design change', 'panel count', 'workflow', 'status'],
    tryItLink: '/change-orders',
    relatedTopics: ['design-workflow', 'design-comparison'],
    content: ChangeOrderOverview,
  },
  {
    id: 'design-workflow',
    title: 'Design Workflow Steps',
    description: '6-step checkbox workflow with auto-status',
    category: 'Change Orders',
    keywords: ['design', 'workflow', 'steps', 'checkbox', 'approval', 'signed'],
    relatedTopics: ['change-order-overview'],
    content: DesignWorkflow,
  },
  {
    id: 'design-comparison',
    title: 'Design Comparison',
    description: 'Original vs new values side-by-side',
    category: 'Change Orders',
    keywords: ['comparison', 'original', 'new', 'panel', 'system size', 'design'],
    relatedTopics: ['change-order-overview'],
    content: DesignComparison,
  },
]
