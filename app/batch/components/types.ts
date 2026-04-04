// ── TYPES ────────────────────────────────────────────────────────────────────

export interface RoofFace {
  panelCount: number
  azimuth: number
  tilt: number
  roofArea: number
}

export interface ProjectInput {
  id: string
  fileName: string
  projectName: string
  address: string
  // Existing system
  panelModel: string
  panelWattage: number
  panelCount: number
  panelVoc: number
  panelVmp: number
  panelIsc: number
  panelImp: number
  inverterModel: string
  inverterCount: number
  inverterAcPower: number
  batteryModel: string
  batteryCount: number
  batteryCapacity: number
  rackingType: string
  roofFaceCount: number
  roofFaces: RoofFace[]
  // Processing state
  status: 'pending' | 'editing' | 'processing' | 'complete' | 'error'
  results?: ProcessedResults
  error?: string
}

export interface StringConfig {
  mppt: number
  string: number
  modules: number
  vocCold: number
  vmpNominal: number
  current: number
  roofFaceIndex: number
}

export interface PanelFitEstimate {
  roofIndex: number
  oldCount: number
  newCount: number
  method: string
}

export interface ProcessedResults {
  vocCorrected: number
  maxModulesPerString: number
  minModulesPerString: number
  recommendedStringSize: number
  totalStringInputs: number
  vmpHot: number
  panelFitEstimates: PanelFitEstimate[]
  stringConfigs: StringConfig[]
  engineeringNotes: string[]
  newTotalPanels: number
  newSystemDc: number
  oldSystemDc: number
  newTotalAc: number
  oldTotalAc: number
  newTotalStorage: number
  oldTotalStorage: number
  warnings: string[]
}

export interface TargetSystem {
  panelModel: string
  panelWattage: number
  panelVoc: number
  panelVmp: number
  panelIsc: number
  panelImp: number
  panelLengthMm: number
  panelWidthMm: number
  inverterModel: string
  inverterCount: number
  maxPvPower: number
  maxVoc: number
  mpptMin: number
  mpptMax: number
  mpptsPerInverter: number
  stringsPerMppt: number
  maxCurrentPerMppt: number
  batteryModel: string
  batteryCount: number
  batteryCapacity: number
  batteriesPerStack: number
  rackingModel: string
  designTempLow: number
  vocTempCoeff: number
}

// ── DEFAULTS ─────────────────────────────────────────────────────────────────

export const DEFAULT_TARGET: TargetSystem = {
  panelModel: 'AMP 410W Domestic',
  panelWattage: 410,
  panelVoc: 37.4,
  panelVmp: 31.3,
  panelIsc: 14.0,
  panelImp: 13.1,
  panelLengthMm: 1722,
  panelWidthMm: 1134,
  inverterModel: 'Duracell Power Center Max Hybrid 15kW',
  inverterCount: 2,
  maxPvPower: 19500,
  maxVoc: 500,
  mpptMin: 125,
  mpptMax: 425,
  mpptsPerInverter: 3,
  stringsPerMppt: 2,
  maxCurrentPerMppt: 26,
  batteryModel: 'Duracell 5kWh LFP',
  batteryCount: 16,
  batteryCapacity: 5,
  batteriesPerStack: 8,
  rackingModel: 'IronRidge XR100',
  designTempLow: -5,
  vocTempCoeff: -0.28,
}

export const SAMPLE_PROJECT: Omit<ProjectInput, 'id'> = {
  fileName: 'PROJ-29857_Aguilera_PlanSet.pdf',
  projectName: 'PROJ-29857 Miguel Aguilera',
  address: '7822 Brooks Crossing Dr, Baytown TX 77521',
  panelModel: 'Seraphim SRP-440-BTD-BG',
  panelWattage: 440,
  panelCount: 53,
  panelVoc: 41.5,
  panelVmp: 34.8,
  panelIsc: 13.5,
  panelImp: 12.65,
  inverterModel: 'EcoFlow OCEAN Pro',
  inverterCount: 1,
  inverterAcPower: 24,
  batteryModel: 'EcoFlow OCEAN Pro 10kWh',
  batteryCount: 8,
  batteryCapacity: 10,
  rackingType: 'EcoFasten Clickfit SmartFoot',
  roofFaceCount: 3,
  roofFaces: [
    { panelCount: 30, azimuth: 351, tilt: 26, roofArea: 645 },
    { panelCount: 10, azimuth: 81, tilt: 27, roofArea: 216 },
    { panelCount: 13, azimuth: 171, tilt: 26, roofArea: 280 },
  ],
  status: 'editing',
  results: undefined,
  error: undefined,
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

let _nextId = 1
export function genId() { return `batch-${Date.now()}-${_nextId++}` }
