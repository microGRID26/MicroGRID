import type { HelpTopicData } from './index'

function SchedulePage() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Weekly calendar showing crew assignments by day. Each cell shows the job type, project, and crew. Filter by crew or job type.</p>
      <div className="border border-gray-700 rounded-lg overflow-hidden text-xs">
        <div className="grid grid-cols-6 gap-0 bg-gray-800/50 border-b border-gray-700">
          <span className="px-2 py-2 text-gray-500 font-medium">Crew</span>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (
            <span key={d} className="px-2 py-2 text-gray-500 font-medium text-center">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-6 gap-0 border-b border-gray-800">
          <span className="px-2 py-2 text-gray-300 font-medium">HOU1</span>
          <span className="px-2 py-2 text-center"><span className="bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">Install</span></span>
          <span className="px-2 py-2 text-center"><span className="bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded text-[10px]">Install</span></span>
          <span className="px-2 py-2 text-center"><span className="bg-green-900 text-green-300 px-1.5 py-0.5 rounded text-[10px]">Survey</span></span>
          <span className="px-2 py-2 text-center text-gray-600">--</span>
          <span className="px-2 py-2 text-center"><span className="bg-amber-900 text-amber-300 px-1.5 py-0.5 rounded text-[10px]">Inspect</span></span>
        </div>
      </div>
    </div>
  )
}

function CrewView() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Mobile-optimized daily job view at <span className="text-green-400 font-mono">/crew</span>. Shows jobs grouped by date with:</p>
      <div className="space-y-1 text-xs">
        {[
          'Customer name and address (tap for Google Maps)',
          'Phone number (tap to call)',
          'Equipment specs and crew assignments',
          'Read-only -- designed for phones and tablets in the field',
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

export const scheduleTopics: HelpTopicData[] = [
  {
    id: 'schedule-page',
    title: 'Schedule Page',
    description: 'Weekly calendar with crew assignments',
    category: 'Schedule & Crews',
    keywords: ['schedule', 'calendar', 'crew', 'week', 'job', 'assign', 'install', 'survey'],
    tryItLink: '/schedule',
    relatedTopics: ['crew-view'],
    content: SchedulePage,
  },
  {
    id: 'crew-view',
    title: 'Crew Mobile View',
    description: 'Mobile-optimized daily jobs for field crews',
    category: 'Schedule & Crews',
    keywords: ['crew', 'mobile', 'field', 'daily', 'job', 'phone', 'tablet'],
    tryItLink: '/crew',
    relatedTopics: ['schedule-page'],
    content: CrewView,
  },
]
