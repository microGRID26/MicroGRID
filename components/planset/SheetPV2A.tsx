import type { PlansetData } from '@/lib/planset-types'
import { TitleBlockHtml } from './TitleBlockHtml'

const LEGEND_ITEMS: Array<{ sym: string; label: string }> = [
  { sym: 'M',       label: 'Utility Meter' },
  { sym: 'MSP',     label: 'Main Service Panel' },
  { sym: 'SP',      label: 'Sub Panel' },
  { sym: 'INV',     label: 'Duracell Max Hybrid Inverter' },
  { sym: 'BAT',     label: 'Duracell 5+ Battery Module' },
  { sym: 'RSD',     label: 'Rapid Shutdown Device (RSD-D-20)' },
  { sym: 'CTX',     label: 'Cantex High-Current Distribution Bar' },
  { sym: '═══',     label: 'EMT Conduit (above ground, wall mount)' },
  { sym: '─ ─ ─',   label: 'PVC Conduit (below ground, trench)' },
  { sym: '▨▨',     label: 'Fire Setback (no panels — walking path required for fire access)' },
  { sym: '↻',       label: 'Walkable Ridge (clear path for fire personnel)' },
  { sym: 'AZ',      label: 'Azimuth (compass direction roof faces, in degrees)' },
  { sym: '°',       label: 'Tilt (roof pitch, in degrees)' },
]

export function SheetPV2A({ data }: { data: PlansetData }) {
  return (
    <div className="sheet" style={{ display: 'grid', gridTemplateColumns: '1fr 2.5in', border: '2px solid #000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', width: '16.5in', height: '10.5in', overflow: 'hidden', position: 'relative' }}>
      <div className="sheet-content" style={{ padding: '0.15in 0.2in', overflow: 'hidden' }}>
        <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#111' }}>UNIT INDEX / LEGEND</div>
        <div style={{ fontSize: '8pt', color: '#555', marginBottom: '12pt' }}>
          Symbol reference for all subsequent sheets in this plan set
        </div>

        <div style={{ border: '1px solid #111', maxWidth: '6in' }}>
          <div style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>
            SYMBOL LEGEND
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt' }}>
            <thead>
              <tr style={{ background: '#eee' }}>
                <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '7pt', borderBottom: '1px solid #ccc', width: '120px' }}>SYMBOL</th>
                <th style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 'bold', fontSize: '7pt', borderBottom: '1px solid #ccc' }}>DEFINITION</th>
              </tr>
            </thead>
            <tbody>
              {LEGEND_ITEMS.map((item, i) => (
                <tr key={item.sym} style={{ background: i % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', fontWeight: 'bold', fontSize: '9pt', color: '#111' }}>{item.sym}</td>
                  <td style={{ padding: '5px 8px', color: '#333' }}>{item.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '16pt', fontSize: '7pt', color: '#555', maxWidth: '6in' }}>
          <strong style={{ color: '#111' }}>CONDUIT NOTATION:</strong> Solid lines represent above-ground conduit (EMT); dashed lines represent below-ground conduit (PVC, trenched).
          All conduit runs are shown schematically — refer to the site plan (PV-3) for routing and dimensions.
        </div>
        <div style={{ marginTop: '6pt', fontSize: '7pt', color: '#555', maxWidth: '6in' }}>
          <strong style={{ color: '#111' }}>FIRE SETBACK / ACCESS:</strong> Hatched areas on the roof plan represent required fire department access paths per IFC 2018.
          No modules or equipment may be placed within fire setback zones.
        </div>
      </div>
      <TitleBlockHtml sheetName="UNIT INDEX / LEGEND" sheetNumber="PV-2A" data={data} />
    </div>
  )
}
