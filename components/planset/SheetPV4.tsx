import type { PlansetData } from '@/lib/planset-types'
import { TitleBlockHtml } from './TitleBlockHtml'

/**
 * PV-4: Roof Plan with Modules
 * Shows the module layout on the roof with string assignments, attachment spacing, compass rose, and legend.
 * Base image: uploaded SubHub satellite screenshot with module placement overlay.
 * SVG annotations: string labels, setback lines, compass rose, attachment spacing note.
 */
export function SheetPV4({ data, roofPlanImageUrl }: { data: PlansetData; roofPlanImageUrl: string | null }) {
  const hasImage = !!roofPlanImageUrl

  return (
    <div className="sheet" style={{
      width: '16.5in', height: '10.5in', display: 'grid',
      gridTemplateColumns: '1fr 2.5in', border: '2px solid #000',
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt',
      overflow: 'hidden', position: 'relative',
    }}>
      <div className="sheet-content" style={{ padding: '0.15in 0.2in', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.1in' }}>
          {/* Info boxes */}
          <div style={{ display: 'flex', gap: '0.15in' }}>
            {/* Legend */}
            <div style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '6.5pt' }}>
              <div style={{ fontWeight: 'bold', fontSize: '7pt', marginBottom: '2px', borderBottom: '1px solid #000', paddingBottom: '2px' }}>LEGEND</div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <span>▬▬ 18&quot; Setback</span>
                <span>✕✕✕ 6&quot; Setback</span>
              </div>
              <div><span>▬ ▬ 36&quot; Setback</span></div>
            </div>
            {/* Meter / ESID */}
            {(data.meter || data.esid) && (
              <div style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '6.5pt' }}>
                {data.meter && <div>METER NUMBER: {data.meter}</div>}
                {data.esid && <div>ESID NUMBER: {data.esid}</div>}
              </div>
            )}
          </div>
          {/* STC summary */}
          <div style={{ border: '1px solid #000', padding: '4px 8px', fontSize: '6.5pt', textAlign: 'right' }}>
            <div style={{ fontWeight: 'bold' }}>STC</div>
            <div>MODULES: {data.panelCount} x {data.panelWattage} = {data.systemDcKw.toFixed(3)} kW DC</div>
            <div>INVERTER(S): {data.inverterCount} x {data.inverterAcPower} kW AC</div>
            <div style={{ fontWeight: 'bold' }}>TOTAL kW AC = {data.systemAcKw.toFixed(3)} kW AC</div>
          </div>
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {hasImage ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <img
                src={roofPlanImageUrl}
                alt="Roof Plan with Modules"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
              {/* SVG annotation overlay */}
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 1400 800" preserveAspectRatio="xMidYMid meet">
                {/* String labels — positioned at approximate center of each string's roof area */}
                {data.strings.map((s, i) => {
                  // Distribute labels across the image area
                  const cols = Math.ceil(Math.sqrt(data.strings.length))
                  const row = Math.floor(i / cols)
                  const col = i % cols
                  const x = 120 + col * (1100 / cols)
                  const y = 100 + row * 200
                  return (
                    <g key={s.id}>
                      <rect x={x - 35} y={y - 12} width={70} height={24} rx={4} fill="rgba(0,0,0,0.75)" />
                      <text x={x} y={y + 5} textAnchor="middle" fill="#fff" fontSize="14" fontWeight="bold" fontFamily="Arial">
                        S{s.id} ({s.modules})
                      </text>
                    </g>
                  )
                })}

                {/* Compass rose — bottom right */}
                <g transform="translate(1320, 720)">
                  <polygon points="0,-30 -8,0 8,0" fill="#000" />
                  <polygon points="0,30 -8,0 8,0" fill="#ccc" stroke="#000" strokeWidth="0.5" />
                  <text x="0" y="-35" textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="Arial">N</text>
                </g>
              </svg>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#999' }}>
              <div style={{ fontSize: '14pt', fontWeight: 'bold', marginBottom: '8px' }}>ROOF PLAN WITH MODULES</div>
              <div style={{ fontSize: '10pt' }}>Upload the SubHub satellite screenshot showing module placement</div>
              <div style={{ fontSize: '8pt', marginTop: '4px' }}>Use the Overrides panel &rarr; Roof Plan Image (PV-4)</div>
            </div>
          )}
        </div>

        {/* Bottom bar: attachment note + module count table */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.1in' }}>
          <div style={{ fontSize: '9pt', fontWeight: 'bold' }}>
            NOTE:<br />- MAXIMUM ATTACHMENT SPACING IS 45&quot;
          </div>
          {/* Roof face table */}
          {data.roofFaces.length > 0 && (
            <table style={{ borderCollapse: 'collapse', fontSize: '6.5pt' }}>
              <thead>
                <tr style={{ background: '#111', color: '#fff' }}>
                  <th style={{ padding: '2px 6px', border: '1px solid #000' }}>ROOF</th>
                  <th style={{ padding: '2px 6px', border: '1px solid #000' }}>MODULES</th>
                  <th style={{ padding: '2px 6px', border: '1px solid #000' }}>TILT</th>
                  <th style={{ padding: '2px 6px', border: '1px solid #000' }}>AZIMUTH</th>
                </tr>
              </thead>
              <tbody>
                {data.roofFaces.map(rf => (
                  <tr key={rf.id}>
                    <td style={{ padding: '2px 6px', border: '1px solid #ccc', textAlign: 'center' }}>Roof {rf.id}</td>
                    <td style={{ padding: '2px 6px', border: '1px solid #ccc', textAlign: 'center' }}>{rf.modules}</td>
                    <td style={{ padding: '2px 6px', border: '1px solid #ccc', textAlign: 'center' }}>{rf.tilt}&deg;</td>
                    <td style={{ padding: '2px 6px', border: '1px solid #ccc', textAlign: 'center' }}>{rf.azimuth}&deg;</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold' }}>
                  <td style={{ padding: '2px 6px', border: '1px solid #ccc', textAlign: 'center' }}>TOTAL</td>
                  <td style={{ padding: '2px 6px', border: '1px solid #ccc', textAlign: 'center' }}>{data.roofFaces.reduce((s, rf) => s + rf.modules, 0)}</td>
                  <td colSpan={2} style={{ border: '1px solid #ccc' }}></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Scale label */}
        <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '8pt', fontWeight: 'bold' }}>
          <span style={{ fontSize: '12pt' }}>1</span> ROOF PLAN WITH MODULES
          <div style={{ fontSize: '7pt', fontWeight: 'normal' }}>SCALE: 1&quot; = 10&apos;</div>
        </div>
      </div>

      <TitleBlockHtml data={data} sheetName="ROOF PLAN WITH MODULES" sheetNumber="PV-4" />
    </div>
  )
}
