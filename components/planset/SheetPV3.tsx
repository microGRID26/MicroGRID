import type { PlansetData } from '@/lib/planset-types'
import { TitleBlockHtml } from './TitleBlockHtml'

export function SheetPV3({ data }: { data: PlansetData }) {
  if (!data.sitePlanImageUrl) {
    return (
      <div className="sheet" style={{ display: 'grid', gridTemplateColumns: '1fr 2.5in', border: '2px solid #000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', width: '16.5in', height: '10.5in', overflow: 'hidden', position: 'relative' }}>
        <div className="sheet-content" style={{ padding: '0.15in 0.2in', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '8px' }}>SITE PLAN</div>
            <div style={{ fontSize: '10pt' }}>No site plan image uploaded.</div>
            <div style={{ fontSize: '8pt', marginTop: '4px' }}>Upload an image in the overrides panel above.</div>
          </div>
        </div>
        <TitleBlockHtml sheetName="SITE PLAN" sheetNumber="PV-3" data={data} />
      </div>
    )
  }

  return (
    <div className="sheet" style={{ display: 'grid', gridTemplateColumns: '1fr 2.5in', border: '2px solid #000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', width: '16.5in', height: '10.5in', overflow: 'hidden', position: 'relative' }}>
      <div className="sheet-content" style={{ padding: '0.1in', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={data.sitePlanImageUrl} alt="Site Plan" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
      </div>
      <TitleBlockHtml sheetName="SITE PLAN" sheetNumber="PV-3" data={data} />
    </div>
  )
}
