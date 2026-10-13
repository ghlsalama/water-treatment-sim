/**
 * Energy consumption model for water treatment processes.
 * Calculates energy for each stage based on operational parameters.
 */

import { TreatmentParams } from './treatment';

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

/**
 * Optimize parameters for minimum energy while meeting quality targets.
 * Uses gradient-guided search with constraint handling.
 */
export function optimizeEnergy(
  params: TreatmentParams,
  targets: { maxTurbidity: number; maxBod: number; minDO: number },
  influentQuality: { turbidity: number; bod: number }
): { params: TreatmentParams; energy: EnergyBreakdown; quality: { turbidity: number; bod: number; do: number } } {
  // Define bounds for each parameter
  const bounds = {
    coagulantDose: [5, 60] as [number, number],
    mixingIntensity: [0.2, 1.0] as [number, number],
    flocculationTime: [600, 3600] as [number, number],
    flocGrowthRate: [0.1, 0.8] as [number, number],
    sedimentationEfficiency: [0.6, 0.98] as [number, number],
    sludgeBlanketDepth: [0.1, 1.5] as [number, number],
    filterLoadingRate: [4, 15] as [number, number],
    filterRemovalEfficiency: [0.8, 0.99] as [number, number],
    aerationRate: [0.5, 6.0] as [number, number],
    oxygenTransferEfficiency: [0.1, 0.5] as [number, number],
    dissolvedOxygen: [2, 10] as [number, number],
    flowRate: [50, 200] as [number, number],
  };

  // Start from current params
  let best = { ...params };
  let bestEnergy = calculateEnergy(best);

  // Try reducing aeration first (biggest energy consumer)
  const aerationSteps = 20;
  for (let i = 0; i <= aerationSteps; i++) {
    const aerationRate = bounds.aerationRate[0] + (bounds.aerationRate[1] - bounds.aerationRate[0]) * (i / aerationSteps);
    const candidate = { ...best, aerationRate };
    const energy = calculateEnergy(candidate);

    // Check if quality targets are still met (simplified check)
    const estimatedBodRemoval = 0.5 + aerationRate * 0.08;
    const estimatedBod = influentQuality.bod * (1 - estimatedBodRemoval);

    if (estimatedBod <= targets.maxBod && energy.total < bestEnergy.total) {
      best = candidate;
      bestEnergy = energy;
    }
  }

  // Try reducing mixing intensity
  const mixSteps = 15;
  for (let i = 0; i <= mixSteps; i++) {
    const mixingIntensity = bounds.mixingIntensity[0] + (bounds.mixingIntensity[1] - bounds.mixingIntensity[0]) * (i / mixSteps);
    const candidate = { ...best, mixingIntensity };
    const energy = calculateEnergy(candidate);

    // Coag effectiveness must stay above threshold
    const coagEffectiveness = 0.2 + candidate.coagulantDose * 0.012 + mixingIntensity * 0.15;
    if (coagEffectiveness >= 0.5 && energy.total < bestEnergy.total) {
      best = candidate;
      bestEnergy = energy;
    }
  }

  // Try reducing coagulant dose
  const doseSteps = 15;
  for (let i = 0; i <= doseSteps; i++) {
    const coagulantDose = bounds.coagulantDose[0] + (bounds.coagulantDose[1] - bounds.coagulantDose[0]) * (i / doseSteps);
    const candidate = { ...best, coagulantDose };
    const energy = calculateEnergy(candidate);

    const coagEffectiveness = 0.2 + coagulantDose * 0.012 + best.mixingIntensity * 0.15;
    if (coagEffectiveness >= 0.5 && energy.total < bestEnergy.total) {
      best = candidate;
      bestEnergy = energy;
    }
  }

  // Fine-tune flow rate
  const flowSteps = 10;
  for (let i = 0; i <= flowSteps; i++) {
    const flowRate = bounds.flowRate[0] + (bounds.flowRate[1] - bounds.flowRate[0]) * (i / flowSteps);
    const candidate = { ...best, flowRate };
    const energy = calculateEnergy(candidate);

    // Higher flow = less residence time = worse treatment
    const residenceFactor = Math.min(1, 100 / flowRate);
    if (residenceFactor >= 0.5 && energy.total < bestEnergy.total) {
      best = candidate;
      bestEnergy = energy;
    }
  }

  // Estimate final quality
  const estimatedBod = influentQuality.bod * (1 - (0.5 + best.aerationRate * 0.08));
  const estimatedTurbidity = influentQuality.turbidity * (1 - Math.min(0.7, 0.3 + best.coagulantDose * 0.012)) * 0.1;

  return {
    params: best,
    energy: bestEnergy,
    quality: {
      turbidity: estimatedTurbidity,
      bod: estimatedBod,
      do: best.dissolvedOxygen * (0.5 + best.aerationRate * 0.2),
    },
  };
}
