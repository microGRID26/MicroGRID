import type { ProjectInput, TargetSystem, ProcessedResults, StringConfig } from './types'

// ── CALCULATION (duplicated from redesign page) ──────────────────────────────

function emptyResults(): ProcessedResults {
  return {
    vocCorrected: 0, maxModulesPerString: 0, minModulesPerString: 0,
    recommendedStringSize: 0, totalStringInputs: 0, vmpHot: 0,
    panelFitEstimates: [], stringConfigs: [], engineeringNotes: [],
    newTotalPanels: 0, newSystemDc: 0, oldSystemDc: 0,
    newTotalAc: 0, oldTotalAc: 0, newTotalStorage: 0, oldTotalStorage: 0,
    warnings: [],
  }
}

export function calculateRedesign(project: ProjectInput, target: TargetSystem): ProcessedResults {
  const absCoeff = Math.abs(target.vocTempCoeff / 100)

  // String sizing
  const vocCorrected = target.panelVoc * (1 + absCoeff * (25 - target.designTempLow))
  const maxModulesPerString = Math.floor(target.maxVoc / vocCorrected)
  const vmpHot = target.panelVmp * (1 - absCoeff * 50)
  const minModulesPerString = Math.ceil(target.mpptMin / vmpHot)

  // Recommended: highest value <= max that keeps Vmp*modules within MPPT range
  let recommendedStringSize = minModulesPerString
  for (let n = maxModulesPerString; n >= minModulesPerString; n--) {
    if (n * target.panelVmp <= target.mpptMax) {
      recommendedStringSize = n
      break
    }
  }

  if (recommendedStringSize <= 0) {
    return { ...emptyResults(), warnings: ['Invalid string configuration — check panel/inverter specs'] }
  }

  if (target.panelWattage <= 0) {
    return { ...emptyResults(), warnings: ['Target panel wattage must be greater than zero'] }
  }

  const totalStringInputs = target.inverterCount * target.mpptsPerInverter * target.stringsPerMppt

  // Panel fit estimates per roof face
  const panelAreaSqFt = target.panelLengthMm > 0 && target.panelWidthMm > 0
    ? (target.panelLengthMm * target.panelWidthMm / 1_000_000) * 10.764
    : 0

  const panelFitEstimates = project.roofFaces.slice(0, project.roofFaceCount).map((rf, i) => {
    let newCount: number
    let method: string
    if (panelAreaSqFt > 0 && rf.roofArea > 0) {
      newCount = Math.floor(rf.roofArea / panelAreaSqFt)
      method = 'area-based'
    } else {
      newCount = Math.floor(rf.panelCount * (project.panelWattage / target.panelWattage) * 1.05)
      method = 'ratio-based'
    }
    return { roofIndex: i, oldCount: rf.panelCount, newCount, method }
  })

  const newTotalPanels = panelFitEstimates.reduce((s, e) => s + e.newCount, 0)

  // Auto string configuration
  const stringConfigs: StringConfig[] = []
  const maxStrings = totalStringInputs
  const neededStrings = Math.min(Math.ceil(newTotalPanels / recommendedStringSize), maxStrings)
  const baseSize = Math.floor(newTotalPanels / neededStrings)
  const extraPanels = newTotalPanels % neededStrings

  const stringSizes: number[] = []
  for (let i = 0; i < neededStrings; i++) {
    let size = baseSize + (i < extraPanels ? 1 : 0)
    if (size > maxModulesPerString) size = maxModulesPerString
    stringSizes.push(size)
  }

  // Assign strings to roof faces proportionally
  const roofFaceAssignments: number[] = []
  let stringIdx = 0
  for (let ri = 0; ri < panelFitEstimates.length && stringIdx < stringSizes.length; ri++) {
    let roofRemaining = panelFitEstimates[ri].newCount
    while (roofRemaining > 0 && stringIdx < stringSizes.length) {
      const take = Math.min(stringSizes[stringIdx], roofRemaining)
      if (take < minModulesPerString && roofRemaining < minModulesPerString) break
      roofFaceAssignments[stringIdx] = ri
      roofRemaining -= stringSizes[stringIdx]
      stringIdx++
    }
  }
  while (stringIdx < stringSizes.length) {
    roofFaceAssignments[stringIdx] = -1
    stringIdx++
  }

  // Build string configs with inverter/MPPT assignment
  for (let i = 0; i < stringSizes.length; i++) {
    const mpptGlobal = Math.floor(i / target.stringsPerMppt) + 1
    const stringInMppt = (i % target.stringsPerMppt) + 1
    const modules = stringSizes[i]

    stringConfigs.push({
      mppt: mpptGlobal,
      string: stringInMppt,
      modules,
      vocCold: parseFloat((modules * vocCorrected).toFixed(1)),
      vmpNominal: parseFloat((modules * target.panelVmp).toFixed(1)),
      current: target.panelImp,
      roofFaceIndex: roofFaceAssignments[i] ?? -1,
    })
  }

  // Warnings / engineering notes
  const warnings: string[] = []
  const engineeringNotes: string[] = []
  const newSystemDc = parseFloat(((newTotalPanels * target.panelWattage) / 1000).toFixed(2))
  const totalMaxPv = (target.inverterCount * target.maxPvPower) / 1000

  if (newSystemDc > totalMaxPv) {
    warnings.push(`System DC (${newSystemDc} kW) exceeds inverter PV capacity (${totalMaxPv.toFixed(1)} kW)`)
  }

  for (const sc of stringConfigs) {
    if (sc.vocCold > target.maxVoc) {
      warnings.push(`MPPT ${sc.mppt} Str ${sc.string}: Voc_cold (${sc.vocCold}V) > max Voc (${target.maxVoc}V)`)
    }
    if (sc.vmpNominal < target.mpptMin) {
      warnings.push(`MPPT ${sc.mppt} Str ${sc.string}: Vmp (${sc.vmpNominal}V) < MPPT min (${target.mpptMin}V)`)
    }
  }

  if (newTotalPanels !== project.panelCount) {
    engineeringNotes.push('Structural letter may need update — panel count changed')
  }
  engineeringNotes.push('String calculations require PE review before permitting')

  const oldSystemDc = parseFloat(((project.panelCount * project.panelWattage) / 1000).toFixed(2))
  const oldTotalAc = project.inverterCount * project.inverterAcPower
  const newTotalAc = target.inverterCount * 15
  const oldTotalStorage = project.batteryCount * project.batteryCapacity
  const newTotalStorage = target.batteryCount * target.batteryCapacity

  return {
    vocCorrected: parseFloat(vocCorrected.toFixed(2)),
    maxModulesPerString,
    minModulesPerString,
    recommendedStringSize,
    totalStringInputs,
    vmpHot: parseFloat(vmpHot.toFixed(2)),
    panelFitEstimates,
    stringConfigs,
    engineeringNotes,
    newTotalPanels,
    newSystemDc,
    oldSystemDc,
    newTotalAc,
    oldTotalAc,
    newTotalStorage,
    oldTotalStorage,
    warnings,
  }
}
