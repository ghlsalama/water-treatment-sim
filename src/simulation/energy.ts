/**
 * Energy consumption model for water treatment processes.
 * Calculates energy for each stage based on operational parameters.
 */

import { TreatmentParams, WaterQuality, calculateTreatment } from './treatment';

export interface EnergyBreakdown {
  coagulation: number;    // kWh/m^3
  flocculation: number;
  sedimentation: number;
  filtration: number;
  aeration: number;
  pumping: number;         // total pumping
  chemical: number;        // chemical production + transport
  total: number;           // kWh/m^3
  costPerDay: number;      // £/day
  carbonPerDay: number;    // kg CO2/day
}

// Energy intensity constants (kWh/m^3 per unit of parameter)
const ENERGY_CONSTANTS = {
  // Coagulation: rapid mixing (G-value based)
  MIXING_ENERGY_PER_INTENSITY: 0.015,  // kWh/m^3 per unit intensity

  // Flocculation: slow mixing (lower energy)
  FLOCC_ENERGY_PER_TIME: 0.0008,       // kWh/m^3 per second of residence

  // Sedimentation: minimal direct energy (mostly pumping for sludge removal)
  SLUDGE_PUMPING_PER_DEPTH: 0.008,     // kWh/m^3 per m of sludge depth

  // Filtration: backwashing + head loss
  FILTER_BACKWASH: 0.03,               // kWh/m^3 filtered
  FILTER_HEAD_LOSS_BASE: 0.012,        // kWh/m^3 base head loss
  FILTER_LOADING_FACTOR: 0.002,        // per m/h loading rate

  // Aeration: typically the largest energy consumer
  BLOWER_EFFICIENCY: 0.65,             // blower efficiency
  O2_ENERGY_PER_RATE: 0.45,            // kWh/m^3 per m^3 air/m^3 water/h

  // Pumping: based on flow and head
  PUMP_EFFICIENCY: 0.75,               // pump efficiency
  STATIC_HEAD: 2.0,                    // m static head
  FRICTION_FACTOR: 0.8,                // friction losses

  // Chemical dosing (production + transport + dosing pumps)
  CHEMICAL_ENERGY_PER_DOSE: 0.0003,    // kWh/m^3 per mg/L dose

  // Carbon factor (UK grid average 2024)
  GRID_CARBON_FACTOR: 0.233,           // kg CO2/kWh
  ELECTRICITY_COST: 0.28,              // £/kWh (commercial rate)
};

export function calculateEnergy(params: TreatmentParams): EnergyBreakdown {
  // Coagulation energy: rapid mixing
  const coagulation = params.mixingIntensity * ENERGY_CONSTANTS.MIXING_ENERGY_PER_INTENSITY;

  // Flocculation energy: slow mixing over residence time
  const flocculation = (params.flocculationTime / 3600) * ENERGY_CONSTANTS.FLOCC_ENERGY_PER_TIME * params.mixingIntensity * 0.3;

  // Sedimentation: sludge removal pumping
  const sedimentation = params.sludgeBlanketDepth * ENERGY_CONSTANTS.SLUDGE_PUMPING_PER_DEPTH;

  // Filtration: backwash + hydraulic loading
  const filtration = ENERGY_CONSTANTS.FILTER_BACKWASH +
    ENERGY_CONSTANTS.FILTER_HEAD_LOSS_BASE +
    params.filterLoadingRate * ENERGY_CONSTANTS.FILTER_LOADING_FACTOR;

  // Aeration: blower energy (largest component)
  const aeration = params.aerationRate * ENERGY_CONSTANTS.O2_ENERGY_PER_RATE / ENERGY_CONSTANTS.BLOWER_EFFICIENCY;

  // Pumping: total dynamic head
  const totalHead = ENERGY_CONSTANTS.STATIC_HEAD + ENERGY_CONSTANTS.FRICTION_FACTOR * (params.flowRate / 100);
  const pumping = (totalHead * 9.81) / (3600 * ENERGY_CONSTANTS.PUMP_EFFICIENCY);

  // Chemical energy: dose-related
  const chemical = params.coagulantDose * ENERGY_CONSTANTS.CHEMICAL_ENERGY_PER_DOSE;

  const total = coagulation + flocculation + sedimentation + filtration + aeration + pumping + chemical;

  // Daily totals
  const dailyVolume = params.flowRate * 24; // m^3/day
  const costPerDay = total * dailyVolume * ENERGY_CONSTANTS.ELECTRICITY_COST;
  const carbonPerDay = total * dailyVolume * ENERGY_CONSTANTS.GRID_CARBON_FACTOR;

  return {
    coagulation,
    flocculation,
    sedimentation,
    filtration,
    aeration,
    pumping,
    chemical,
    total,
    costPerDay,
    carbonPerDay,
  };
}

/**
 * Energy efficiency score (higher = more efficient per unit of treatment)
 */
export function efficiencyScore(params: TreatmentParams, bodRemovalEfficiency: number): number {
  const energy = calculateEnergy(params);
  if (energy.total === 0) return 0;
  // Score = treatment efficiency / energy intensity (0-100 scale)
  return Math.min(100, (bodRemovalEfficiency * 100) / (energy.total * 2));
}

/** Round a tuned setting to a value an operator would actually dial in. */
function roundForDisplay(knob: keyof TreatmentParams, value: number): number {
  switch (knob) {
    case 'flowRate': return Math.round(value);
    case 'flocculationTime': return Math.round(value / 10) * 10;
    case 'coagulantDose':
    case 'filterLoadingRate': return Math.round(value * 10) / 10;
    case 'mixingIntensity':
    case 'sludgeBlanketDepth': return Math.round(value * 100) / 100;
    case 'aerationRate': return Math.round(value * 100) / 100;
    default: return value;
  }
}

/** Smallest adjustment an operator could make on each control. */
function stepFor(knob: keyof TreatmentParams): number {
  switch (knob) {
    case 'flowRate': return 1;
    case 'flocculationTime': return 10;
    case 'coagulantDose':
    case 'filterLoadingRate': return 0.1;
    default: return 0.01;
  }
}

/**
 * Optimize parameters for minimum energy while meeting quality targets.
 *
 * Every knob below is monotone in energy - lower is always cheaper - so each
 * one is walked down to the lowest value that still meets the effluent
 * targets. Quality is judged with the real treatment model rather than an
 * estimate, so the result is the cheapest set of parameters that the plant
 * can actually run at.
 */
export function optimizeEnergy(
  params: TreatmentParams,
  targets: { maxTurbidity: number; maxBod: number; minDO: number },
  influentQuality: WaterQuality
): { params: TreatmentParams; energy: EnergyBreakdown; quality: { turbidity: number; bod: number; do: number } } {
  // Bounds for each tunable parameter
  const bounds: Partial<Record<keyof TreatmentParams, [number, number]>> = {
    coagulantDose: [5, 60],
    mixingIntensity: [0.2, 1.0],
    flocculationTime: [600, 3600],
    sludgeBlanketDepth: [0.1, 1.5],
    filterLoadingRate: [4, 15],
    aerationRate: [0.5, 6.0],
    flowRate: [50, 200],
  };

  const meetsTargets = (candidate: TreatmentParams): boolean => {
    const q = calculateTreatment(candidate, influentQuality);
    return (
      q.afterAeration.turbidity <= targets.maxTurbidity &&
      q.afterAeration.bod <= targets.maxBod &&
      q.afterAeration.dissolvedOxygen >= targets.minDO
    );
  };

  let best = { ...params };

  // Ordered by how much each knob is worth: the aeration blower dominates
  // the energy bill, so it is tuned first and the cheap wins follow.
  const knobs: (keyof TreatmentParams)[] = [
    'aerationRate',
    'coagulantDose',
    'mixingIntensity',
    'filterLoadingRate',
    'sludgeBlanketDepth',
    'flocculationTime',
    'flowRate',
  ];

  for (const knob of knobs) {
    const range = bounds[knob];
    if (!range) continue;

    const [min, max] = range;
    let low = min;
    let high = Math.min(max, best[knob]);

    // If the plant already breaks the targets at its current setting there is
    // nothing to gain by turning this knob down.
    if (!meetsTargets({ ...best, [knob]: high })) continue;

    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (meetsTargets({ ...best, [knob]: mid })) {
        high = mid;
      } else {
        low = mid;
      }
    }

    // Round to a dial-able value, but never at the cost of a target: if the
    // rounded number breaks a limit, nudge it back up until it is legal.
    let chosen = roundForDisplay(knob, high);
    const step = stepFor(knob);
    for (let i = 0; i < 200 && !meetsTargets({ ...best, [knob]: chosen }); i++) {
      chosen = roundForDisplay(knob, chosen + step);
    }
    best = { ...best, [knob]: meetsTargets({ ...best, [knob]: chosen }) ? chosen : high };
  }

  const energy = calculateEnergy(best);
  const quality = calculateTreatment(best, influentQuality);

  return {
    params: best,
    energy,
    quality: {
      turbidity: quality.afterAeration.turbidity,
      bod: quality.afterAeration.bod,
      do: quality.afterAeration.dissolvedOxygen,
    },
  };
}
