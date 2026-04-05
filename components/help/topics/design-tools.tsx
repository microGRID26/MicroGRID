import type { HelpTopicData } from './index'

function RedesignCalculator() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Calculator for system changes. Enter existing and target specs, get string sizing, voltage/current checks, and downloadable DXF files.</p>
      <div className="space-y-1 text-xs">
        {[
          'Redesign (/redesign) -- single project calculator',
          'Batch Design (/batch) -- process multiple redesigns with shared target equipment',
          'Planset (/planset) -- Duracell SLD generator with SVG engineering sheets',
          'All accessible from the "More" dropdown in the nav',
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

function LegacyProjects() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Read-only archive of 14,705 historical MicroGRID &quot;In Service&quot; projects at <span className="text-green-400 font-mono">/legacy</span>.</p>
      <div className="space-y-1 text-xs">
        {[
          'Search by name, phone, email, address, city, or project ID',
          'Click any row to open detail panel with customer info, specs, financials, permits',
          'Full BluChat history (150,000+ messages) with original authors and timestamps',
          'New notes can be added by any team member',
          'Legacy projects do not appear in any active CRM views',
        ].map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-gray-400">
            <span className="text-gray-600 mt-0.5">&bull;</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 bg-gray-800 rounded-lg px-4 py-3 text-xs">
        <span className="text-gray-300 font-medium">Use Legacy for:</span>
        <span className="text-gray-400"> customer calls, warranty questions, service history, historical project lookup</span>
      </div>
    </div>
  )
}

function DocumentManagement() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">View project files synced from Google Drive. Document checklist tracks required documents per stage.</p>
      <div className="space-y-1 text-xs">
        {[
          'Documents hub (/documents) -- search files across all projects',
          'Files tab in Project Panel -- Google Drive link + document checklist',
          '23 document requirements across all 7 stages',
          'Missing docs report (/documents/missing) -- find projects lacking paperwork',
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

export const designToolsTopics: HelpTopicData[] = [
  {
    id: 'redesign-calculator',
    title: 'Redesign Calculator',
    description: 'String sizing, DXF export, batch design',
    category: 'Design Tools',
    keywords: ['redesign', 'calculator', 'string', 'sizing', 'dxf', 'sld', 'planset', 'batch'],
    tryItLink: '/redesign',
    relatedTopics: ['legacy-projects'],
    content: RedesignCalculator,
  },
  {
    id: 'legacy-projects',
    title: 'Legacy Projects',
    description: '14,705 legacy records with BluChat history',
    category: 'Design Tools',
    keywords: ['legacy', 'microgrid', 'historical', 'archive', 'bluchat', 'old', 'in service'],
    tryItLink: '/legacy',
    content: LegacyProjects,
  },
  {
    id: 'document-management',
    title: 'Document Management',
    description: 'Google Drive sync and missing docs report',
    category: 'Design Tools',
    keywords: ['document', 'file', 'drive', 'google', 'checklist', 'missing', 'upload'],
    tryItLink: '/documents',
    relatedTopics: ['file-references'],
    content: DocumentManagement,
  },
]
