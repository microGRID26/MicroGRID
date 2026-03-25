import type { HelpTopicData } from './index'

function AddingNotes() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Open any project, go to Notes tab. Type and press Add Note. Notes are timestamped with your name and visible to the whole team.</p>
      <div className="bg-gray-800 rounded-lg p-3 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-xs text-gray-500">Type a note...</div>
          <span className="px-3 py-2 bg-green-700 text-white text-xs rounded-md font-medium">Add Note</span>
        </div>
        <div className="space-y-2 text-xs">
          <div className="bg-gray-900 rounded-md px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500 text-[10px]">Mar 20, 2026 2:15 PM</span>
              <span className="text-gray-400 text-[10px]">Greg Kelsch</span>
            </div>
            <div className="text-gray-300">Spoke with homeowner -- confirmed install date for Thursday. Gate code is 4521.</div>
          </div>
          <div className="bg-gray-900 rounded-md px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-gray-500 text-[10px]">Mar 19, 2026 10:30 AM</span>
              <span className="text-gray-400 text-[10px]">Jen Harper</span>
            </div>
            <div className="text-gray-300">Engineering revision submitted. Waiting on updated stamps.</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Mentions() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-3">Type <span className="text-green-400 font-medium">@</span> in any note to trigger autocomplete of active team members. Tagged users receive a notification.</p>
      <div className="space-y-1 text-xs">
        {[
          'Dropdown shows all active users with @gomicrogridenergy.com emails',
          'Tagged users get a notification via the bell icon',
          'Click a notification to open the project panel on Notes tab',
          'Mentions render as green highlighted names in the note text',
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

function NotificationBell() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">The bell icon in the nav bar polls every 30 seconds. Shows blocked projects, task revisions/pending resolutions, and @mention alerts.</p>
      <p className="text-xs text-gray-400">Click a mention notification to open <span className="text-green-400 font-mono">/pipeline?open=PROJ-ID&tab=notes</span>. Other notifications navigate to Queue with a search filter.</p>
    </div>
  )
}

function FileReferences() {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Filenames in project notes appear as clickable blue links. Click to search for that file in the project&apos;s Google Drive folder. Inline images are excluded from link detection.</p>
    </div>
  )
}

export const notesCommunicationTopics: HelpTopicData[] = [
  {
    id: 'adding-notes',
    title: 'Adding Notes',
    description: 'Timestamped project notes visible to all',
    category: 'Notes & Communication',
    keywords: ['notes', 'add', 'comment', 'message', 'timestamp', 'project'],
    relatedTopics: ['mentions', 'task-notes'],
    content: AddingNotes,
  },
  {
    id: 'mentions',
    title: '@Mentions',
    description: 'Tag team members with autocomplete',
    category: 'Notes & Communication',
    keywords: ['mention', 'tag', 'at', '@', 'notify', 'team', 'autocomplete'],
    relatedTopics: ['notification-bell', 'adding-notes'],
    content: Mentions,
  },
  {
    id: 'notification-bell',
    title: 'Notification Bell',
    description: 'Polling alerts for mentions and blockers',
    category: 'Notes & Communication',
    keywords: ['notification', 'bell', 'alert', 'mention', 'blocked', 'polling'],
    relatedTopics: ['mentions'],
    content: NotificationBell,
  },
  {
    id: 'file-references',
    title: 'File References in Notes',
    description: 'Clickable links to Google Drive files',
    category: 'Notes & Communication',
    keywords: ['file', 'link', 'drive', 'google', 'document', 'attachment', 'clickable'],
    relatedTopics: ['adding-notes', 'document-management'],
    content: FileReferences,
  },
]
