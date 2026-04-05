const TASK_STATUS_STYLE: Record<string, string> = {
  'In Progress':        'bg-blue-900/60 text-blue-300',
  'Scheduled':          'bg-indigo-900/60 text-indigo-300',
  'Ready To Start':     'bg-gray-700/60 text-gray-300',
  'Not Ready':          'bg-gray-800/60 text-gray-500',
  'Pending Resolution': 'bg-red-900/60 text-red-300',
  'Revision Required':  'bg-amber-900/60 text-amber-300',
  'Complete':           'bg-green-900/60 text-green-300',
}

export function TaskStatusBadge({ status }: { status: string }) {
  const short: Record<string, string> = {
    'In Progress': 'In Prog',
    'Scheduled': 'Sched',
    'Ready To Start': 'Ready',
    'Not Ready': 'Not Ready',
    'Pending Resolution': 'Pending',
    'Revision Required': 'Revision',
    'Complete': 'Done',
  }
  return (
    <span className={`text-[9px] px-1 py-0.5 rounded ${TASK_STATUS_STYLE[status] ?? 'bg-gray-800 text-gray-500'}`}>
      {short[status] ?? status}
    </span>
  )
}
