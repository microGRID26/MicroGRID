'use client'

import { useState, useMemo } from 'react'
import { STAGE_LABELS, STAGE_ORDER, SLA_THRESHOLDS, daysAgo } from '@/lib/utils'
import type { Project } from '@/types/database'

// ── TASK DEFINITIONS ──────────────────────────────────────────────────────────
const TASKS: Record<string, { id: string; name: string; pre: string[]; req: boolean }[]> = {
  evaluation: [
    { id: 'welcome',      name: 'Welcome Call',               pre: [],                req: true  },
    { id: 'ia',           name: 'IA Confirmation',            pre: [],                req: true  },
    { id: 'ub',           name: 'UB Confirmation',            pre: [],                req: true  },
    { id: 'sched_survey', name: 'Schedule Site Survey',       pre: [],                req: true  },
    { id: 'ntp',          name: 'NTP Procedure',              pre: [],                req: true  },
  ],
  survey: [
    { id: 'site_survey',  name: 'Site Survey',                pre: ['sched_survey'],  req: true  },
    { id: 'survey_review',name: 'Survey Review',              pre: ['site_survey'],   req: true  },
  ],
  design: [
    { id: 'build_design',    name: 'Build Design',            pre: ['survey_review'], req: true  },
    { id: 'scope',           name: 'Scope of Work',           pre: ['build_design'],  req: true  },
    { id: 'monitoring',      name: 'Monitoring',              pre: ['scope'],         req: true  },
    { id: 'build_eng',       name: 'Build Engineering',       pre: ['scope'],         req: true  },
    { id: 'eng_approval',    name: 'Engineering Approval',    pre: ['build_eng'],     req: true  },
    { id: 'stamps',          name: 'Stamps Required',         pre: ['eng_approval'],  req: false },
    { id: 'wp1',             name: 'WP1',                     pre: ['scope'],         req: false },
    { id: 'prod_add',        name: 'Production Addendum',     pre: ['scope'],         req: false },
    { id: 'new_ia',          name: 'Create New IA',           pre: ['scope'],         req: false },
    { id: 'reroof',          name: 'Reroof Procedure',        pre: ['scope'],         req: false },
    { id: 'onsite_redesign', name: 'OnSite Redesign',         pre: ['scope'],         req: false },
    { id: 'quote_ext_scope', name: 'Quote — Extended Scope',  pre: ['scope'],         req: false },
  ],
  permit: [
    { id: 'hoa',          name: 'HOA Approval',               pre: ['eng_approval'],  req: true  },
    { id: 'om_review',    name: 'OM Project Review',          pre: ['eng_approval'],  req: true  },
    { id: 'city_permit',  name: 'City Permit Approval',       pre: ['eng_approval'],  req: true  },
    { id: 'util_permit',  name: 'Utility Permit Approval',    pre: ['eng_approval'],  req: true  },
    { id: 'checkpoint1',  name: 'Check Point 1',              pre: ['city_permit','util_permit','ntp'], req: false },
    { id: 'revise_ia',    name: 'Revise IA',                  pre: [],                req: false },
  ],
  install: [
    { id: 'sched_install',name: 'Schedule Installation',      pre: ['om_review'],     req: true  },
    { id: 'inventory',    name: 'Inventory Allocation',       pre: ['sched_install'], req: true  },
    { id: 'install_done', name: 'Installation Complete',      pre: ['sched_install'], req: true  },
    { id: 'elec_redesign',name: 'Electrical Onsite Redesign', pre: [],                req: false },
  ],
  inspection: [
    { id: 'insp_review',  name: 'Inspection Review',          pre: ['install_done'],  req: true  },
    { id: 'sched_city',   name: 'Schedule City Inspection',   pre: ['insp_review'],   req: true  },
    { id: 'sched_util',   name: 'Schedule Utility Inspection',pre: ['insp_review'],   req: true  },
    { id: 'city_insp',    name: 'City Inspection',            pre: ['sched_city'],    req: true  },
    { id: 'util_insp',    name: 'Utility Inspection',         pre: ['sched_util'],    req: true  },
    { id: 'city_upd',     name: 'City Permit Update',         pre: ['insp_review'],   req: false },
    { id: 'util_upd',     name: 'Utility Permit Update',      pre: ['insp_review'],   req: false },
    { id: 'wpi28',        name: 'WPI 2 & 8',                  pre: ['install_done'],  req: false },
  ],
  complete: [
    { id: 'pto',          name: 'Permission to Operate',      pre: ['util_insp'],     req: true  },
    { id: 'in_service',   name: 'In Service',                 pre: ['pto'],           req: true  },
  ],
}

// ── TASK STATUSES ─────────────────────────────────────────────────────────────
const TASK_STATUSES = ['Not Ready','Ready To Start','In Progress','Scheduled','Pending Resolution','Revision Required','Complete']

const STATUS_STYLE: Record<string, string> = {
  'Complete':           'bg-green-900 text-green-300',
  'In Progress':        'bg-blue-900 text-blue-300',
  'Scheduled':          'bg-indigo-900 text-indigo-300',
  'Pending Resolution': 'bg-red-900 text-red-300',
  'Revision Required':  'bg-amber-900 text-amber-300',
  'Ready To Start':     'bg-gray-700 text-gray-200',
  'Not Ready':          'bg-gray-800 text-gray-500',
}

// ── PENDING RESOLUTION REASONS — keyed by task ID ────────────────────────────
const PENDING_REASONS: Record<string, string[]> = {
  welcome: [
    'Credit Declined','Customer Unresponsive','EC Has Not Completed the Lead',
    'H/O Requested Another Time','IA Not Signed','Invalid ACH Information',
    'LA Not Signed','Need to Change Lenders','No Lender Yet',
    'Pending Cancellation','Welcome Checklist/Call Not Completed',
  ],
  ia: [
    'Incorrect Adders','Incorrect Email','Incorrect Name','Incorrect Phone',
    'Incorrect Price','Incorrect Site Address','Incorrect System Data',
    'Missing Adder','Missing Document','Missing Information','Missing Promise','Not Signed',
  ],
  ub: [
    'Document Not Found','Missing Account #','Missing Customer Name','Missing ESID',
    'Missing Meter #','Missing Service Address','Missing Utility Company Name',
    'Not Current','Not Readable',
  ],
  sched_survey: ['Awaiting Customer Reply','Customer Wants to Wait','Scheduling Conflict'],
  ntp: [
    'IA Resign','Missing Utility Bill','Need ACH Information','Need Drivers License / ID',
    'Need Income Verification','Need Property Ownership','NTP Not Granted',
    'NTP Requires Other','Pending HCO','Pending NCCO',
    'Requires Shade Study and Plan Set','Title Stip',
  ],
  site_survey: [
    'Customer Requested','Invalid ACH Information','Requires Secondary Site Survey',
    'Rescheduled','Structural/Electrical Incomplete',
  ],
  survey_review: [
    'Extended Scope of Work - Asbestos','Extended Scope of Work - Electrical',
    'Extended Scope of Work - Structural','Missing Attic Pics','Missing Documents',
    'Missing Drone Pics','Missing Electrical Pics','Missing Roof Pics',
    'MPU Review','Pending DQ','Requires Secondary Site Survey',
    'Roof Review Needed','Utility Bill Rejection','Waiting for AHJ/Utility',
  ],
  build_design: [
    'Extended Scope of Work - Asbestos','Extended Scope of Work - Electrical',
    'Extended Scope of Work - Structural','Missing Adder','MPU Review','Pending DQ',
    'Requires Missing Document Upload','Requires Photo Re-upload',
    'Requires Secondary Site Survey','Requires Table Discussion','Utility Bill Rejection',
  ],
  scope: [
    'Extended Scope of Work - Electrical','Extended Scope of Work - Structural',
    'Pending Approval','Requires Missing Document Upload','Requires Photo Re-upload',
    'Requires Secondary Site Survey','Requires Table Discussion','Reroof Required',
  ],
  build_eng: [
    'Battery Review','Escalated','ESID #','Extended Scope of Work - Electrical',
    'Extended Scope of Work - Structural','Internal Battery Check',
    'Utility Bill Rejection','Waiting for Confirmation',
  ],
  eng_approval: [
    'Battery Review','Extended Scope of Work - Electrical','Extended Scope of Work - Structural',
    'Internal Battery Checking','Missing Document','Missing Photos',
    'Pending Cancellation','Pending DQ','Sent for Stamps','Stamps Required',
  ],
  stamps: [
    'Electrical DQ','Missing Document','Pending EC or Homeowner',
    'Pending Site Survey Photos','Pending Stamps','Structural DQ',
  ],
  prod_add: ['Production Addendum Sent'],
  new_ia:   ['Awaiting Customer Reply','Awaiting Dealer Reply','IA Not Signed'],
  reroof:   ['Awaiting Change Order','Awaiting Discovery','Getting Estimate','Locating Vendor','Onboarding Vendor'],
  onsite_redesign: ['Awaiting Customer Reply','Missing Signature'],
  hoa: [
    'Awaiting Application Receipt Confirmation','Awaiting Customer Reply',
    'Awaiting EC Reply','Awaiting HOA Prep Completion','Awaiting HOA Reply',
    'City Permit Required','Engineering Stamp Required','Fee Receipt Confirmation Required',
    'Fee Required','HOA Denial Attention Required','HOA Escalation',
    'Legal Escalation Required','Lot Survey with Panel Placement Required',
    'Missing Neighbor Signatures','More Information Required by HOA',
    'Need 10% Design/Letter','Need Customer to Submit to HOA',
    'PV Watts/NREL Calculations Required','Specific HOA Document Required',
  ],
  city_permit: [
    'City Registration Need/Sent/Pending','Customer Requesting Design Change',
    'EC/Customer Concerns','Licensing/Compliance','Objection Letter',
    'Open Permits/Pending Inspection','Pending Cancellation','Pending Customer Signature',
    'Pending Deed/Proof of Ownership','Pending Engineer Stamped Plans',
    'Pending Engineering Revision','Pending HOA Approval',
    'Pending Homeowner Authorization/Action','Pending Utility Approval First',
    'Pending WPI Documents','Permit Drop Off/Pickup',
    'Previous Unpaid Permits','Unpaid Property Taxes',
  ],
  util_permit: [
    'Customer Authorization','Customer Requesting Design Change','Duplicate Under Review',
    'EC/Customer Concerns','Licensing/Compliance','Missing Site Survey Photos',
    'Open Permits/Pending Inspection','Pending Cancellation','Pending City Registration',
    'Pending City Reply','Pending CPS Signed Documents','Pending Customer Signature',
    'Pending Deed/Proof of Ownership','Pending Engineer Stamped Plans',
    'Pending Engineering Revision','Pending HOA Approval',
    'Pending ICA and PTO for Existing System','Pending Proof of Insurance',
    'Pending Utility Approval (No Objection Letter)','Pending Utility Availability',
    'Pending Utility Bill/Account Information','Pending Utility Reply',
    'Pending WPI Documents','Permit Drop Off/Pick-Up','Previous Unpaid Permits',
  ],
  checkpoint1: [
    'Asbestos Removal/Restoration','Awaiting Field Ops',
    'Contract Issue - Addendum Not Signed','Contract Issue - Agreements Mismatch',
    'Contract Issue - Unsigned Docs','Credit Expired','Engineering/IA Mismatch',
    'Homeowner Request Wait or Cancel','Inventory - Battery Shortage',
    'Inventory - Inverter Shortage','Inventory - Module Shortage',
    'Inventory - Racking Shortage','Legal','Need Design Revision',
    'Need Engineering Revision','Need HOA Approval','Need New IA','Need Reroof',
    'NTP Not Granted','Pending HCO','Pending NCCO','Pending Paykeeper Deposit',
    'Pending Permit Approval per Requirement','Pending Reroof Cure',
    'Pending Roof Completion','Pending Utility Outage',
    'Production Addendum Required','Reroof Discovered',
  ],
  sched_install: [
    'Awaiting Customer Reply','Crew Availability','Customer Wants to Wait',
    'Pending Cancellation','Pending Equipment','Pending Permit Approval',
  ],
  inventory:    ['Equipment Ordered','Equipment Shortage','Inventory Ordered','Inventory Shortage'],
  insp_review: [
    'City Permit Approval Pending','City Permit Update Needed','Design Update Needed',
    'Engineering Update Needed','Gen 2 Duracell','Legal',
    'Pending Solrite Subcontractor Completion','Pending Sonnen Battery Commissioning',
    'Service Needed','Utility Permit Approval Pending','Utility Permit Update Needed',
  ],
  sched_city: [
    'Awaiting City Reply','Awaiting Customer Reply','Customer Escalation',
    'Install is Incomplete','Legal','Licensing/Compliance','Pending Cancellation',
    'Pending City Availability','Pending Crew Availability','Pending Engineering',
    'Pending Homeowner Availability','Pending Inspection Corrections',
    'Pending Permit Approval','Pending Permit Revision','Pending Post Install Letter',
    'Pending QC','Pending Service','Pending WPI8',
  ],
  sched_util: [
    'Awaiting City Reply','Awaiting Customer Reply','Awaiting Utility Reply',
    'Install is Incomplete','Legal','Licensing/Compliance','Pending Cancellation',
    'Pending City Approval First','Pending Crew Availability','Pending Customer Signature',
    'Pending Engineering','Pending Homeowner Availability','Pending Inspection Corrections',
    'Pending Permit Approval','Pending QC','Pending Service',
    'Pending SunRaise Release','Pending Utility Approval','Pending Utility Availability',
  ],
  city_insp: [
    'Awaiting City Reply','Escalated to Customer Service',
    'Inspection Report Requested','Pending Install','Pending Utility Approval First',
  ],
  util_insp: ['Escalated to Customer Service','Pending Customer Signature','Pending Install','Pending Meter Set'],
  city_upd: [
    'Licensing/Compliance','Need City Registration','Need Customer Signature',
    'Need Deed/Proof of Ownership','Need Engineer Stamped Plans','Need Engineering Revision',
    'Need HOA Approval','Need WPI Documents','Objection Letter',
    'Open Permits/Pending Inspection','Pending Utility Approval',
    'Permit Drop Off/Pickup','Possible Dispositions','Previous Unpaid Permits',
  ],
  util_upd: ['Need Customer Signature','Need Proof of Insurance','Pending Transformer Upgrade','Transformer Upgrade Review'],
  pto:       ['Pending PTO Issuance'],
  in_service: [
    'Abnormal Grid','Awaiting Customer Reply','Awaiting RMA',
    'Awaiting System Update To Take Effect','Battery Issues','CT Issues',
    'Gateway/DTU Not Reporting','Meter Set','Production Issue/MNR','System Activation Incomplete',
  ],
}

// ── REVISION REQUIRED REASONS — keyed by stage ───────────────────────────────
const REVISION_REASONS: Record<string, string[]> = {
  evaluation: [
    'Incorrect Customer Info','Need ACH Information','Need Drivers License / ID',
    'Need Income Verification','Need New IA','Need New Loan Doc',
    'Need Property Ownership','Plan Revision','PPW Too High',
    'Rejected - Other','Updated Shade Study Required',
  ],
  survey: [
    'Animals Present','Customer Postponed','Customer Request to Cancel',
    'Missing Attic Pics','Missing Drone Pics','Missing Electrical Pics',
    'Missing Roof Pics','Missing Site Pics','Need Equipment',
    'No Access to Attic','No Access to Site','Reroof Procedure',
  ],
  design: [
    'AHJ Correction','Attachment Change','Battery Addition','Confirmed DQ',
    'Customer Request','Electrical Corrections','Engineering Audit',
    'HOA Request','Layout Change','Lender Request','Missing Stamps/Letters',
    'Need New IA DS','New Electrical Notes','Panel Count Change','Panel Type Change',
    'Production Addendum Required','Reengineer – Customer Request',
    'Requested Cancel','Supply Chain Issues','Utility Correction','Windspeed Change',
  ],
  permit: [
    'City Permit Revision','CP1 - Need Reroof','Incorrect / Missing Data on Plans',
    'Incorrect / Missing PV Labels','Incorrect Adders','Incorrect Email',
    'Incorrect Name','Incorrect Permit Submitted','Incorrect Phone','Incorrect Price',
    'Incorrect Site Address','Incorrect System Data','Incorrect or No Setbacks',
    'Loan Doc Not Signed','Missing Adder','Missing Wind Cert Docs (WPI1/8)',
    'Need Engineering Revision','Need New CPS Form','Need New IA','New NTP Required',
    'Pending City Approval','Pending Stipulations','Plan Revision',
    'Production Addendum Required','Reroof Discovered',
    'Updated Shade Study Required','Utility Permit Revision','Workflow Cancelled',
  ],
  install: [
    'AHJ Denied','City No-Show','Correction Needed (Specify in Comments)',
    'Crew Not Available/Call-In','Customer Canceled','Customer Reschedule',
    'Customer Unresponsive / Not Available','Disconnect/Reconnect',
    'HOA Denied','Incident','Inspection Delay','Missing Material','Missing Photos',
    'Need Reroof','OSR Required','Pending Battery Completion',
    'Ran Out of Daylight','System Commissioning Error',
    'TriSMART Reschedule','Utility No-Show','Waiting for HOA Approval','Weather',
  ],
  inspection: [
    'AHJ Reschedule / Cancel','Battery Corrections Needed','City No-Show',
    'Conduit Strapping','Correction Needed (Specify in Comments)',
    'Crew Not Available / Call-In','Customer Canceled',
    'Customer Issue (Previous Work / Existing Issue)','Customer Reschedule',
    'Customer Unresponsive / Not Available','Electrical Wall Install Error',
    'Grounding, Electrical Wall','Grounding, Roof',
    'Incorrect / Missing Data on Plans','Incorrect / Missing PV Labels',
    'Incorrect Equipment Installed','Incorrect Permit Submitted',
    'Incorrect or No Setbacks','Install Not Matching Plans',
    'LST/IPC Interconnection Not to Code','Microinverter(s) Not Reporting',
    'Missing Barriers','Missing Documents on Site','Missing Equipment',
    'Missing Homeowner / Gate Locked','Missing Host','Missing Material',
    'Missing Photos','Missing Smoke Detectors','Missing Wind Cert Docs (WPI1/8)',
    'New AHJ Requirement','Not Scheduled with AHJ','OSR Required',
    'Pending Battery Completion','Ran Out of Daylight',
    'Rejected - Need Engineer Stamped Plans','Rough Inspection Required',
    'System Commissioning Error','Trench','TriSMART Rescheduled',
    'Utility No-Show','Weather','Wire Management','Workmanship',
  ],
  complete: ['Need PTO Letter','Needs to Reschedule','Tech Required'],
}

// ── FLAT TASK NAME LOOKUP — used by history view ──────────────────────────────
const ALL_TASKS_MAP: Record<string, string> = {}
Object.values(TASKS).flat().forEach(t => { ALL_TASKS_MAP[t.id] = t.name })

// ── Find which stage a task belongs to ──────────────────────────────────────
const TASK_TO_STAGE: Record<string, string> = {}
for (const [stage, tasks] of Object.entries(TASKS)) {
  for (const t of tasks) TASK_TO_STAGE[t.id] = stage
}

// ── isLocked helper ──────────────────────────────────────────────────────────
function isLocked(task: { pre: string[] }, taskStates: Record<string, string>): boolean {
  return task.pre.some(preId => taskStates[preId] !== 'Complete')
}

// ── ROW BORDER / BG STYLES ──────────────────────────────────────────────────
function rowStyle(status: string): string {
  switch (status) {
    case 'Complete':           return 'border-l-2 border-l-green-500 bg-green-950/20'
    case 'Pending Resolution': return 'border-l-2 border-l-red-500 bg-red-950/20'
    case 'Revision Required':  return 'border-l-2 border-l-amber-500 bg-amber-950/20'
    case 'In Progress':        return 'border-l-2 border-l-blue-500 bg-blue-950/10'
    case 'Scheduled':          return 'border-l-2 border-l-indigo-400'
    default:                   return 'border-l-2 border-l-transparent'
  }
}

// ── SLA color helper ────────────────────────────────────────────────────────
function slaColor(stage: string, days: number): string {
  const t = SLA_THRESHOLDS[stage]
  if (!t) return 'text-gray-500'
  if (days >= t.crit) return 'text-red-400'
  if (days >= t.risk) return 'text-amber-400'
  return 'text-green-400'
}

// ── PROPS ────────────────────────────────────────────────────────────────────
interface TasksTabProps {
  project: Project
  taskStates: Record<string, string>
  taskReasons: Record<string, string>
  taskStatesRaw: { task_id: string; status: string; reason?: string; completed_date?: string | null }[]
  taskHistory: any[]
  taskHistoryLoaded: boolean
  stageHistory: any[]
  updateTaskStatus: (taskId: string, status: string) => void
  updateTaskReason: (taskId: string, reason: string) => void
}

// ── COMPONENT ────────────────────────────────────────────────────────────────
export function TasksTab({
  project,
  taskStates,
  taskReasons,
  taskStatesRaw,
  taskHistory,
  taskHistoryLoaded,
  stageHistory,
  updateTaskStatus,
  updateTaskReason,
}: TasksTabProps) {
  const [viewStage, setViewStage] = useState<string>(project.stage)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'stages' | 'history'>('stages')

  // ── Computed: stage completion counts ──────────────────────────────────────
  const stageCounts = useMemo(() => {
    const counts: Record<string, { done: number; total: number; stuck: number }> = {}
    for (const stageId of STAGE_ORDER) {
      const tasks = TASKS[stageId] ?? []
      const done = tasks.filter(t => taskStates[t.id] === 'Complete').length
      const stuck = tasks.filter(t =>
        taskStates[t.id] === 'Pending Resolution' || taskStates[t.id] === 'Revision Required'
      ).length
      counts[stageId] = { done, total: tasks.length, stuck }
    }
    return counts
  }, [taskStates])

  // ── Computed: revision counts per task from history ────────────────────────
  const revisionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const entry of taskHistory) {
      if (entry.status === 'Revision Required') {
        counts[entry.task_id] = (counts[entry.task_id] ?? 0) + 1
      }
    }
    return counts
  }, [taskHistory])

  // ── Computed: task-level history lookup ────────────────────────────────────
  const taskHistoryByTask = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (const entry of taskHistory) {
      if (!map[entry.task_id]) map[entry.task_id] = []
      map[entry.task_id].push(entry)
    }
    return map
  }, [taskHistory])

  // ── Days in the viewed stage ──────────────────────────────────────────────
  const viewedStageDays = useMemo(() => {
    if (viewStage === project.stage) return daysAgo(project.stage_date)
    // Find from stage history
    const entry = stageHistory.find((h: any) => h.stage === viewStage)
    if (!entry) return 0
    // Find when they left this stage (next entry chronologically)
    const sorted = [...stageHistory].sort((a: any, b: any) =>
      new Date(a.entered).getTime() - new Date(b.entered).getTime()
    )
    const idx = sorted.findIndex((h: any) => h.stage === viewStage)
    if (idx >= 0 && idx < sorted.length - 1) {
      const entered = new Date(sorted[idx].entered + 'T00:00:00').getTime()
      const exited = new Date(sorted[idx + 1].entered + 'T00:00:00').getTime()
      return Math.max(0, Math.floor((exited - entered) / 86400000))
    }
    return daysAgo(entry.entered)
  }, [viewStage, project.stage, project.stage_date, stageHistory])

  const viewedTasks = TASKS[viewStage] ?? []
  const isCurrent = viewStage === project.stage
  const sc = stageCounts[viewStage] ?? { done: 0, total: 0, stuck: 0 }
  const pct = sc.total > 0 ? Math.round((sc.done / sc.total) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">

        {/* ── View Mode Toggle ─────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('stages')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'stages' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Stage View
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                viewMode === 'history' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Full History
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════ */}
        {/* STAGE VIEW                                                  */}
        {/* ════════════════════════════════════════════════════════════ */}
        {viewMode === 'stages' && (
          <>
            {/* ── Stage Navigation Bar ───────────────────────────────── */}
            <div className="flex flex-wrap gap-1 mb-4">
              {STAGE_ORDER.filter(s => TASKS[s]).map(stageId => {
                const c = stageCounts[stageId] ?? { done: 0, total: 0, stuck: 0 }
                const active = stageId === viewStage
                const isCur = stageId === project.stage
                return (
                  <button
                    key={stageId}
                    onClick={() => setViewStage(stageId)}
                    className={`text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                      active
                        ? 'bg-gray-700 text-white ring-1 ring-gray-600'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCur && <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                    <span>{STAGE_LABELS[stageId]}</span>
                    <span className={`text-[10px] ${
                      c.done === c.total && c.total > 0 ? 'text-green-400' :
                      c.stuck > 0 ? 'text-red-400' : 'text-gray-500'
                    }`}>
                      {c.done}/{c.total}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── Stage Progress Header ──────────────────────────────── */}
            <div className="bg-gray-800/50 rounded-lg px-4 py-3 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-bold text-white uppercase tracking-wider">
                  {STAGE_LABELS[viewStage]}
                </span>
                {isCurrent && (
                  <span className="text-[10px] bg-green-900 text-green-300 px-1.5 py-0.5 rounded font-medium uppercase">
                    Current
                  </span>
                )}
                <span className={`text-xs ${slaColor(viewStage, viewedStageDays)}`}>
                  {viewedStageDays}d in stage
                </span>
                {sc.stuck > 0 && (
                  <span className="text-xs text-red-400 font-medium">{sc.stuck} stuck</span>
                )}
                <span className="text-xs text-gray-500 ml-auto">{pct}%</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct === 100 ? 'bg-green-500' :
                    isCurrent && SLA_THRESHOLDS[viewStage] && viewedStageDays >= SLA_THRESHOLDS[viewStage].crit ? 'bg-red-500' :
                    isCurrent && SLA_THRESHOLDS[viewStage] && viewedStageDays >= SLA_THRESHOLDS[viewStage].risk ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            {/* ── Task Table ──────────────────────────────────────────── */}
            {viewedTasks.length === 0 ? (
              <div className="text-gray-500 text-xs text-center py-8">No tasks defined for this stage.</div>
            ) : (
              <div className="border border-gray-800 rounded-lg overflow-hidden">
                {/* Task rows */}
                {viewedTasks.map(task => {
                  const status = taskStates[task.id] ?? 'Not Ready'
                  const reason = taskReasons[task.id] ?? ''
                  const locked = isLocked(task, taskStates)
                  const completedDate = taskStatesRaw.find(t => t.task_id === task.id)?.completed_date ?? null
                  const revCount = revisionCounts[task.id] ?? 0
                  const isExpanded = expandedTask === task.id
                  const history = taskHistoryByTask[task.id] ?? []
                  const showReason = status === 'Pending Resolution' || status === 'Revision Required'
                  const pendingReasons = PENDING_REASONS[task.id] ?? []
                  const revisionReasonsList = REVISION_REASONS[viewStage] ?? []
                  const reasonOptions = status === 'Pending Resolution' ? pendingReasons : revisionReasonsList

                  return (
                    <div key={task.id}>
                      {/* Main row */}
                      <div
                        className={`flex items-center gap-2 px-3 py-2 border-b border-gray-800/60 ${
                          rowStyle(status)
                        } ${locked ? 'opacity-40' : ''}`}
                      >
                        {/* Required indicator */}
                        <div className="w-3 flex-shrink-0 text-center">
                          {task.req && <span className="text-green-500 text-xs font-bold">*</span>}
                        </div>

                        {/* Expand chevron */}
                        <div className="w-4 flex-shrink-0 text-center">
                          {history.length > 0 ? (
                            <button
                              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                              className="text-gray-500 hover:text-white text-xs transition-colors"
                            >
                              {isExpanded ? '▾' : '▸'}
                            </button>
                          ) : null}
                        </div>

                        {/* Task name */}
                        <span className={`flex-1 text-xs truncate min-w-0 ${
                          locked ? 'text-gray-600' :
                          task.req ? 'text-gray-100' : 'text-gray-400'
                        }`}>
                          {locked && '🔒 '}{task.name}
                          {!task.req && <span className="text-gray-600 ml-1">(opt)</span>}
                        </span>

                        {/* Revision count badge */}
                        {revCount > 0 && (
                          <span className="text-[10px] bg-amber-900/60 text-amber-400 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            {revCount} rev
                          </span>
                        )}

                        {/* Completed date */}
                        {completedDate && (
                          <span className="text-[10px] text-gray-500 flex-shrink-0">
                            {(() => {
                              const raw = String(completedDate).slice(0, 10)
                              const d = new Date(raw + 'T00:00:00')
                              return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            })()}
                          </span>
                        )}

                        {/* Status dropdown */}
                        <select
                          value={status}
                          disabled={locked}
                          onChange={e => updateTaskStatus(task.id, e.target.value)}
                          className={`text-xs rounded px-1.5 py-0.5 border-0 cursor-pointer flex-shrink-0 ${
                            STATUS_STYLE[status] ?? 'bg-gray-800 text-gray-400'
                          } ${locked ? 'cursor-not-allowed' : ''}`}
                        >
                          {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      {/* Reason row — shown below when Pending/Revision */}
                      {showReason && (
                        <div className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-800/60 pl-10 ${
                          status === 'Pending Resolution' ? 'bg-red-950/10' : 'bg-amber-950/10'
                        }`}>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">Reason</span>
                          {reasonOptions.length > 0 ? (
                            <select
                              value={reason}
                              onChange={e => updateTaskReason(task.id, e.target.value)}
                              className={`text-xs rounded px-1.5 py-0.5 border-0 cursor-pointer flex-1 ${
                                status === 'Pending Resolution' ? 'bg-red-950 text-red-300' : 'bg-amber-950 text-amber-300'
                              }`}
                            >
                              <option value="">Select reason...</option>
                              {reasonOptions.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={reason}
                              placeholder="Enter reason..."
                              onChange={e => updateTaskReason(task.id, e.target.value)}
                              className={`text-xs rounded px-1.5 py-0.5 border-0 flex-1 ${
                                status === 'Pending Resolution' ? 'bg-red-950 text-red-300 placeholder:text-red-800' : 'bg-amber-950 text-amber-300 placeholder:text-amber-800'
                              }`}
                            />
                          )}
                        </div>
                      )}

                      {/* Saved reason — dim context when status changed away */}
                      {!showReason && reason && (
                        <div className="px-3 py-1 pl-10 border-b border-gray-800/60">
                          <span className="text-[11px] text-gray-600 italic">{reason}</span>
                        </div>
                      )}

                      {/* Expanded inline history */}
                      {isExpanded && history.length > 0 && (
                        <div className="bg-gray-850 border-b border-gray-800/60 pl-10 pr-4 py-2">
                          <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 font-medium">
                            History ({history.length})
                          </div>
                          <div className="space-y-1">
                            {history.map((entry: any, i: number) => {
                              const when = entry.changed_at
                                ? new Date(entry.changed_at).toLocaleDateString('en-US', {
                                    month: 'short', day: 'numeric',
                                  })
                                : ''
                              const time = entry.changed_at
                                ? new Date(entry.changed_at).toLocaleTimeString('en-US', {
                                    hour: 'numeric', minute: '2-digit',
                                  })
                                : ''
                              return (
                                <div key={`${entry.task_id}-${entry.changed_at}-${i}`} className="flex items-center gap-2 text-[11px]">
                                  <span className="text-gray-600 w-16 flex-shrink-0">{when}</span>
                                  <span className="text-gray-600 w-14 flex-shrink-0">{time}</span>
                                  <span className={`px-1 py-0.5 rounded flex-shrink-0 ${
                                    STATUS_STYLE[entry.status] ?? 'bg-gray-800 text-gray-500'
                                  }`}>
                                    {entry.status}
                                  </span>
                                  {entry.reason && (
                                    <span className={`truncate ${
                                      entry.status === 'Pending Resolution' ? 'text-red-400' :
                                      entry.status === 'Revision Required'  ? 'text-amber-400' :
                                      'text-gray-500'
                                    }`}>
                                      {entry.reason}
                                    </span>
                                  )}
                                  {entry.changed_by && entry.changed_by !== 'migration' && (
                                    <span className="text-gray-600 ml-auto flex-shrink-0">{entry.changed_by}</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-600">
              <span><span className="text-green-500 font-bold">*</span> = required</span>
              <span>Rev = revision count</span>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════════════════ */}
        {/* FULL HISTORY VIEW                                           */}
        {/* ════════════════════════════════════════════════════════════ */}
        {viewMode === 'history' && (
          <div>
            {!taskHistoryLoaded ? (
              <div className="text-xs text-gray-500 text-center py-12 animate-pulse">
                Loading history...
              </div>
            ) : taskHistory.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-12">
                No history recorded yet.
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-600 mb-3">{taskHistory.length} change{taskHistory.length !== 1 ? 's' : ''} — most recent first</div>
                <div className="divide-y divide-gray-800">
                  {[...taskHistory].sort((a, b) => {
                    const ta = a.changed_at ? new Date(a.changed_at).getTime() : 0
                    const tb = b.changed_at ? new Date(b.changed_at).getTime() : 0
                    return tb - ta
                  }).map((entry, i) => {
                    const taskName = ALL_TASKS_MAP[entry.task_id] ?? entry.task_id
                    const stage = TASK_TO_STAGE[entry.task_id]
                    const when = entry.changed_at
                      ? new Date(entry.changed_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit',
                        })
                      : ''
                    return (
                      <div key={`${entry.task_id}-${entry.changed_at}-${i}`} className={`flex items-start gap-3 py-2.5 px-2 hover:bg-gray-800/40 rounded ${rowStyle(entry.status)}`}>
                        {/* Task + status + reason */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {stage && (
                              <span className="text-[10px] text-gray-600 uppercase">{STAGE_LABELS[stage]}</span>
                            )}
                            <span className="text-xs font-medium text-gray-200">{taskName}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_STYLE[entry.status] ?? 'bg-gray-800 text-gray-500'}`}>
                              {entry.status}
                            </span>
                          </div>
                          {entry.reason && (
                            <div className={`mt-0.5 text-xs px-1.5 py-0.5 rounded inline-block ${
                              entry.status === 'Pending Resolution' ? 'bg-red-950 text-red-400' :
                              entry.status === 'Revision Required'  ? 'bg-amber-950 text-amber-400' :
                              'text-gray-500'
                            }`}>
                              {entry.reason}
                            </div>
                          )}
                        </div>

                        {/* Who + when */}
                        <div className="text-right flex-shrink-0">
                          {entry.changed_by && entry.changed_by !== 'migration' && (
                            <div className="text-xs text-gray-400">{entry.changed_by}</div>
                          )}
                          <div className="text-xs text-gray-600">{when}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
