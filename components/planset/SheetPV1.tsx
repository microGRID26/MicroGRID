import type { PlansetData } from '@/lib/planset-types'
import { TitleBlockHtml } from './TitleBlockHtml'

export function SheetPV1({ data }: { data: PlansetData }) {
  const generalNotes = [
    'ALL WORK SHALL COMPLY WITH THE LATEST EDITION OF THE NEC (NFPA 70) AND ALL APPLICABLE LOCAL CODES.',
    'ALL WIRING METHODS AND MATERIALS SHALL COMPLY WITH NEC ARTICLES 690, 705, AND 706.',
    'ALL PV MODULES SHALL BE LISTED TO UL 1703 OR UL 61730.',
    'INVERTER(S) SHALL BE LISTED TO UL 1741 AND/OR UL 1741SA FOR UTILITY INTERACTIVE OPERATION.',
    'ALL EQUIPMENT SHALL BE INSTALLED PER MANUFACTURER INSTRUCTIONS AND SPECIFICATIONS.',
    'RAPID SHUTDOWN SHALL COMPLY WITH NEC 690.12. MODULE-LEVEL POWER ELECTRONICS PROVIDE COMPLIANCE.',
    'ARC-FAULT CIRCUIT PROTECTION SHALL COMPLY WITH NEC 690.11.',
    'ALL ROOF PENETRATIONS SHALL BE PROPERLY FLASHED AND SEALED TO MAINTAIN ROOF WARRANTY.',
    'EQUIPMENT GROUNDING SHALL COMPLY WITH NEC 250.134 AND 690.43.',
    'GROUNDING ELECTRODE SYSTEM SHALL COMPLY WITH NEC 250.50 AND 250.52.',
    'PV SYSTEM DC CIRCUITS SHALL BE INSTALLED PER NEC 690.31.',
    'MAXIMUM SYSTEM VOLTAGE SHALL NOT EXCEED 600V DC PER NEC 690.7.',
    'OVERCURRENT PROTECTION SHALL COMPLY WITH NEC 690.9.',
    'ALL CONDUCTORS SHALL BE COPPER AND RATED FOR WET LOCATIONS.',
    'GROUND-MOUNTED OR ROOF-MOUNTED CONDUIT SHALL BE RATED FOR OUTDOOR USE.',
    'SYSTEM SHALL BE INSPECTED AND APPROVED PRIOR TO INTERCONNECTION.',
  ]

  const pvNotes = [
    'PV ARRAY OUTPUT CIRCUIT CONDUCTORS SHALL BE SIZED AT 125% OF Isc PER NEC 690.8(A).',
    'MAXIMUM SYSTEM VOLTAGE (Voc CORRECTED) SHALL NOT EXCEED INVERTER MAXIMUM INPUT VOLTAGE.',
    'STRING VOLTAGE RANGE (Vmp) SHALL FALL WITHIN INVERTER MPPT OPERATING RANGE.',
    'PV SOURCE CIRCUITS SHALL BE PROVIDED WITH OCPD PER NEC 690.9.',
    'ALL DC WIRING SHALL USE PV WIRE OR USE RATED PER NEC 690.31(C).',
    'MODULE-LEVEL RAPID SHUTDOWN DEVICES SHALL COMPLY WITH NEC 690.12(B)(2).',
    'BATTERY ENERGY STORAGE SYSTEM SHALL COMPLY WITH NEC ARTICLE 706.',
    'ESS SHALL BE INSTALLED IN ACCORDANCE WITH MANUFACTURER INSTALLATION MANUAL.',
  ]

  const codeRefs = [
    'NEC 2020 (NFPA 70)', 'IBC 2015', 'IRC 2015', 'ASCE 7-16',
    'UL 1703 / UL 61730', 'UL 1741 / UL 1741SA', 'UL 9540 (ESS)', 'IEEE 1547',
  ]

  const unitIndex: [string, string][] = [
    ['MSP', 'MAIN SERVICE PANEL'], ['SP', 'SUB PANEL'], ['MDP', 'MAIN DISTRIBUTION PANEL'],
    ['GP', 'GROUND POINT'], ['PV', 'PHOTOVOLTAIC'], ['ESS', 'ENERGY STORAGE SYSTEM'],
    ['OCPD', 'OVERCURRENT PROTECTION DEVICE'], ['GEC', 'GROUNDING ELECTRODE CONDUCTOR'],
    ['EGC', 'EQUIPMENT GROUNDING CONDUCTOR'], ['RSD', 'RAPID SHUTDOWN DEVICE'],
    ['MPPT', 'MAX POWER POINT TRACKER'], ['Voc', 'OPEN CIRCUIT VOLTAGE'],
    ['Vmp', 'MAXIMUM POWER VOLTAGE'], ['Isc', 'SHORT CIRCUIT CURRENT'],
    ['Imp', 'MAXIMUM POWER CURRENT'],
  ]

  const sheetIndex: [string, string][] = [
    ['PV-1', 'COVER PAGE & GENERAL NOTES'], ['PV-2', 'PROJECT DATA'],
    ['PV-3', 'SITE PLAN'],
    ['PV-5', 'SINGLE LINE DIAGRAM'], ['PV-5.1', 'PCS LABELS'],
    ['PV-6', 'WIRING CALCULATIONS'], ['PV-7', 'WARNING LABELS'],
    ['PV-7.1', 'EQUIPMENT PLACARDS'], ['PV-8', 'CONDUCTOR SCHEDULE & BOM'],
  ]

  const storiesLabel = data.stories === 1 ? 'ONE' : String(data.stories)

  return (
    <div className="sheet" style={{ display: 'grid', gridTemplateColumns: '1fr 2.5in', border: '2px solid #000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8pt', width: '16.5in', height: '10.5in', overflow: 'hidden', position: 'relative' }}>
      <div className="sheet-content" style={{ padding: '0.15in 0.2in', overflow: 'hidden' }}>
        <div className="sheet-title" style={{ fontSize: '14pt', fontWeight: 'bold', color: '#111' }}>
          ROOF INSTALLATION OF {data.systemDcKw.toFixed(2)} KW DC PHOTOVOLTAIC SYSTEM
        </div>
        <div className="sheet-subtitle" style={{ fontSize: '8pt', color: '#555', marginBottom: '8pt' }}>
          WITH {data.totalStorageKwh} KWH BATTERY ENERGY STORAGE SYSTEM
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr 0.9fr', gap: '8px' }}>
          {/* LEFT COLUMN */}
          <div>
            {/* PROJECT DATA */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>PROJECT DATA</div>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.5pt' }}>
                <tbody>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>PROJECT:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.projectId} {data.owner}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>ADDRESS:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.address}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>SYSTEM SIZE:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.systemDcKw.toFixed(2)} kWDC / {data.systemAcKw} kWAC</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>PV MODULES:</td><td style={{ padding: '2px 4px', color: '#333' }}>({data.panelCount}) {data.panelModel}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>INVERTERS:</td><td style={{ padding: '2px 4px', color: '#333' }}>({data.inverterCount}) {data.inverterModel}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>BATTERIES:</td><td style={{ padding: '2px 4px', color: '#333' }}>({data.batteryCount}) {data.batteryModel} = {data.totalStorageKwh} kWh</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>RACKING:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.rackingModel}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>ATTACHMENTS:</td><td style={{ padding: '2px 4px', color: '#333' }}>({data.racking.attachmentCount}) {data.racking.attachmentModel}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>RAIL:</td><td style={{ padding: '2px 4px', color: '#333' }}>({data.racking.railCount}) {data.racking.railModel}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>UTILITY:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.utility}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>METER #:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.meter}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>ESID:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.esid}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>BUILDING:</td><td style={{ padding: '2px 4px', color: '#333' }}>{storiesLabel} STORY, {data.buildingType}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>ROOF:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.roofType}, {data.rafterSize}</td></tr>
                  <tr><td style={{ fontWeight: 'bold', padding: '2px 4px', color: '#111' }}>WIND SPEED:</td><td style={{ padding: '2px 4px', color: '#333' }}>{data.windSpeed} MPH, Cat {data.riskCategory}, Exp {data.exposure}</td></tr>
                </tbody>
              </table>
            </div>

            {/* EXISTING SYSTEM */}
            {data.existingPanelModel && (
              <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
                <div style={{ background: '#555', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>EXISTING SYSTEM (TO REMAIN)</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.5pt' }}>
                  <tbody>
                    <tr><td style={{ fontWeight: 'bold', padding: '2px 4px' }}>PV MODULES:</td><td style={{ padding: '2px 4px' }}>({data.existingPanelCount ?? 0}) {data.existingPanelModel} ({data.existingPanelWattage ?? 0}W)</td></tr>
                    <tr><td style={{ fontWeight: 'bold', padding: '2px 4px' }}>INVERTERS:</td><td style={{ padding: '2px 4px' }}>({data.existingInverterCount ?? 0}) {data.existingInverterModel}</td></tr>
                    <tr><td style={{ fontWeight: 'bold', padding: '2px 4px' }}>EXISTING DC:</td><td style={{ padding: '2px 4px' }}>{((data.existingPanelCount ?? 0) * (data.existingPanelWattage ?? 0) / 1000).toFixed(2)} kW</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* CODE REFERENCES */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>CODE REFERENCES</div>
              <div style={{ padding: '4px 6px', fontSize: '6.5pt', lineHeight: 1.7 }}>
                {codeRefs.map((ref, i) => <div key={i}>{ref}</div>)}
              </div>
            </div>

            {/* UNIT INDEX */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>UNIT INDEX</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6pt' }}>
                <tbody>
                  {unitIndex.map(([abbr, def], i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 'bold', padding: '1px 4px', color: '#111', width: '40px' }}>{abbr}</td>
                      <td style={{ padding: '1px 4px', color: '#333' }}>{def}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div>
            {/* GENERAL NOTES */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>GENERAL NOTES</div>
              <ol style={{ padding: '4px 6px 4px 18px', fontSize: '5.5pt', lineHeight: 1.8, color: '#333' }}>
                {generalNotes.map((note, i) => <li key={i}>{note}</li>)}
              </ol>
            </div>

            {/* PHOTOVOLTAIC NOTES */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>PHOTOVOLTAIC NOTES</div>
              <ol style={{ padding: '4px 6px 4px 18px', fontSize: '5.5pt', lineHeight: 1.8, color: '#333' }}>
                {pvNotes.map((note, i) => <li key={i}>{note}</li>)}
              </ol>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div>
            {/* CONTRACTOR */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>CONTRACTOR</div>
              <div style={{ padding: '6px 8px', fontSize: '7pt', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 'bold' }}>{data.contractor.name}</div>
                <div>{data.contractor.address}</div>
                <div>{data.contractor.city}</div>
                <div>Phone: {data.contractor.phone}</div>
                <div>License# {data.contractor.license}</div>
                <div>{data.contractor.email}</div>
              </div>
            </div>

            {/* SHEET INDEX */}
            <div className="section-box" style={{ border: '1px solid #111', marginBottom: '6px' }}>
              <div className="section-header" style={{ background: '#111', color: 'white', padding: '4px 6px', fontSize: '8pt', fontWeight: 'bold', textAlign: 'center' }}>SHEET INDEX</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.5pt' }}>
                <tbody>
                  {sheetIndex.map(([num, title], i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 'bold', padding: '2px 6px', color: '#111', width: '45px' }}>{num}</td>
                      <td style={{ padding: '2px 4px', color: '#333' }}>{title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <TitleBlockHtml sheetName="COVER PAGE & GENERAL NOTES" sheetNumber="PV-1" data={data} />
    </div>
  )
}
