import type { Project } from '@/types/database'
import { STAGE_LABELS } from '@/lib/utils'

export function exportProjectsCSV(projects: Project[]) {
  const headers = [
    'ID','Name','City','Address','Phone','Email','Stage','Stage Date',
    'PM','Sale Date','Contract','System kW','Financier','Financing Type',
    'AHJ','Utility','Advisor','Consultant','Dealer','Disposition',
    'NTP Date','Survey Scheduled','Survey Complete','Install Scheduled',
    'Install Complete','City Permit Date','Utility Permit Date',
    'City Inspection','Utility Inspection','PTO Date','In Service Date',
    'Permit #','Utility App #','Module','Module Qty','Inverter','Inverter Qty',
    'Battery','Battery Qty','HOA','ESID','Blocker'
  ]

  const rows = projects.map(p => [
    p.id, p.name, p.city, p.address, p.phone, p.email,
    STAGE_LABELS[p.stage] ?? p.stage, p.stage_date,
    p.pm, p.sale_date, p.contract, p.systemkw,
    p.financier, p.financing_type, p.ahj, p.utility,
    p.advisor, p.consultant, p.dealer, p.disposition,
    p.ntp_date, p.survey_scheduled_date, p.survey_date,
    p.install_scheduled_date, p.install_complete_date,
    p.city_permit_date, p.utility_permit_date,
    p.city_inspection_date, p.utility_inspection_date,
    p.pto_date, p.in_service_date,
    p.permit_number, p.utility_app_number,
    p.module, p.module_qty, p.inverter, p.inverter_qty,
    p.battery, p.battery_qty, p.hoa, p.esid, p.blocker
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => {
      const val = cell == null ? '' : String(cell)
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `microgrid-projects-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
