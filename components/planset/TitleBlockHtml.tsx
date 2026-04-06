import type { PlansetData } from '@/lib/planset-types'

export function TitleBlockHtml({ sheetName, sheetNumber, data }: { sheetName: string; sheetNumber: string; data: PlansetData }) {
  return (
    <div className="sheet-sidebar" style={{ borderLeft: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div style={{ flex: 1 }} />
      <div className="stamp-box" style={{ border: '1.5px solid #000', height: '0.8in', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', color: '#999', margin: '0.05in' }}>
        ENGINEER&apos;S STAMP
      </div>
      <div className="title-block" style={{ borderTop: '1px solid #000', padding: '0.08in', fontSize: '6.5pt', lineHeight: 1.5 }}>
        <div style={{ fontWeight: 'bold', fontSize: '7pt' }}>{data.contractor.name}</div>
        <div>{data.contractor.address}, {data.contractor.city}</div>
        <div>Ph: {data.contractor.phone} | Lic# {data.contractor.license}</div>
        <div style={{ fontWeight: 'bold', marginTop: '3pt' }}>{data.projectId} {data.owner}</div>
        <div>{data.address}</div>
        <div style={{ fontSize: '6pt', color: '#333' }}>DRAWN: MicroGRID | DATE: {data.drawnDate}</div>
        <div style={{ fontWeight: 'bold', fontSize: '8pt', marginTop: '4pt' }}>{sheetName}</div>
        <div>
          <span style={{ fontWeight: 'bold', fontSize: '14pt' }}>{sheetNumber}</span>
          <span style={{ fontSize: '7pt', color: '#333', marginLeft: '8px' }}>of {data.sheetTotal}</span>
        </div>
      </div>
    </div>
  )
}
