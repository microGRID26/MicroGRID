// lib/planset-topology.ts
// Helpers for system topology discrimination in SLD rendering.

export type SystemTopology = 'string-mppt' | 'micro-inverter'

/**
 * Components that ONLY appear on micro-inverter-era projects (Hambrick-style).
 * Gating is symmetric: a string-mppt project should never render these.
 *
 * Per William Carter's feedback (2026-04-26): new Duracell projects don't
 * use DPCRGM, DTU, CTs, Ethernet switches, or PLCs. Strings route directly
 * to inverter MPPT inputs.
 */
export const MICROINVERTER_COMPONENTS = [
  'DPCRGM',
  'DTU',
  'CT',
  'ETHERNET',
  'PLC',
] as const

export function shouldRenderMicroInverterComponent(topology: SystemTopology): boolean {
  return topology === 'micro-inverter'
}
