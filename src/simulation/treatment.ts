/**
 * Water treatment process models.
 * Each zone applies specific physics: coagulation, flocculation,
 * sedimentation, filtration, and aeration.
 */

export interface TreatmentParams {
  // Coagulation
  coagulantDose: number;       // mg/L (alum equivalent)
  coagulantConcentration: number; // visual intensity
  mixingIntensity: number;     // 0-1, rapid mix energy

  // Flocculation
  flocculationTime: number;    // seconds residence
  flocGrowthRate: number;     // floc formation speed

  // Sedimentation
  sedimentationEfficiency: number; // 0-1 removal rate
  sludgeBlanketDepth: number;  // settled solids accumulation

  // Filtration
  filterLoadingRate: number;   // m/h
  filterRemovalEfficiency: number; // 0-1

  // Aeration
  aerationRate: number;        // m^3 air/m^3 water/h
  oxygenTransferEfficiency: number; // 0-1
  dissolvedOxygen: number;      // mg/L

  // Flow
  flowRate: number;            // m^3/h
  hydraulicLoading: number;    // m/h
}

export interface WaterQuality {
  turbidity: number;           // NTU
  bod: number;                 // mg/L Biological Oxygen Demand
  cod: number;                 // mg/L Chemical Oxygen Demand
  suspendedSolids: number;     // mg/L
  dissolvedOxygen: number;     // mg/L
  ph: number;
  temperature: number;         // Celsius
}

export const DEFAULT_PARAMS: TreatmentParams = {
  coagulantDose: 25,
  coagulantConcentration: 0.5,
  mixingIntensity: 0.6,
  flocculationTime: 1800,
  flocGrowthRate: 0.3,
  sedimentationEfficiency: 0.85,
  sludgeBlanketDepth: 0.5,
  filterLoadingRate: 8,
  filterRemovalEfficiency: 0.95,
  aerationRate: 2.5,
  oxygenTransferEfficiency: 0.25,
  dissolvedOxygen: 6.0,
  flowRate: 100,
  hydraulicLoading: 2.0,
};

export const INFLUENT_QUALITY: WaterQuality = {
  turbidity: 45,
  bod: 180,
  cod: 320,
  suspendedSolids: 120,
  dissolvedOxygen: 2.0,
  ph: 7.2,
  temperature: 15,
};

/**
 * Calculate treatment performance based on parameters.
 * Returns effluent quality after each stage.
 */
export function calculateTreatment(params: TreatmentParams, influent: WaterQuality): {
  afterCoagulation: WaterQuality;
  afterFlocculation: WaterQuality;
  afterSedimentation: WaterQuality;
  afterFiltration: WaterQuality;
  afterAeration: WaterQuality;
  overallRemovalEfficiency: number;
} {
  // Coagulation: removes turbidity and some BOD via charge neutralization
  const coagTurbidityRemoval = Math.min(0.7, 0.3 + params.coagulantDose * 0.012);
  const coagBodRemoval = Math.min(0.4, 0.15 + params.coagulantDose * 0.006);
  const coagRemoval = Math.min(0.6, 0.2 + params.coagulantDose * 0.012);

  const afterCoagulation: WaterQuality = {
    ...influent,
    turbidity: influent.turbidity * (1 - coagTurbidityRemoval),
    bod: influent.bod * (1 - coagBodRemoval),
    cod: influent.cod * (1 - coagRemoval),
    suspendedSolids: influent.suspendedSolids * (1 - coagRemoval * 0.5),
  };

  // Flocculation: grows flocs, improves settling
  const flocTurbidityRemoval = Math.min(0.85, 0.4 + params.flocGrowthRate * 0.4);
  const flocBodRemoval = Math.min(0.6, 0.2 + params.flocGrowthRate * 0.3);

  const afterFlocculation: WaterQuality = {
    ...afterCoagulation,
    turbidity: afterCoagulation.turbidity * (1 - flocTurbidityRemoval),
    bod: afterCoagulation.bod * (1 - flocBodRemoval),
    cod: afterCoagulation.cod * (1 - flocTurbidityRemoval * 0.7),
    suspendedSolids: afterCoagulation.suspendedSolids * (1 - flocTurbidityRemoval * 0.8),
  };

  // Sedimentation: gravity settling of flocs
  const sedTurbidityRemoval = params.sedimentationEfficiency;
  const sedBodRemoval = params.sedimentationEfficiency * 0.7;
  const sedSsRemoval = params.sedimentationEfficiency * 0.9;

  const afterSedimentation: WaterQuality = {
    ...afterFlocculation,
    turbidity: afterFlocculation.turbidity * (1 - sedTurbidityRemoval),
    bod: afterFlocculation.bod * (1 - sedBodRemoval),
    cod: afterFlocculation.cod * (1 - sedTurbidityRemoval * 0.8),
    suspendedSolids: afterFlocculation.suspendedSolids * (1 - sedSsRemoval),
  };

  // Filtration: physical straining of remaining particles
  const filtTurbidityRemoval = params.filterRemovalEfficiency;
  const filtSsRemoval = params.filterRemovalEfficiency;

  const afterFiltration: WaterQuality = {
    ...afterSedimentation,
    turbidity: afterSedimentation.turbidity * (1 - filtTurbidityRemoval),
    bod: afterSedimentation.bod * (1 - filtTurbidityRemoval * 0.5),
    cod: afterSedimentation.cod * (1 - filtTurbidityRemoval * 0.6),
    suspendedSolids: afterSedimentation.suspendedSolids * (1 - filtSsRemoval),
  };

  // Aeration: biological treatment, adds dissolved oxygen
  const aerBodRemoval = Math.min(0.95, params.aerationRate * 0.15 * params.oxygenTransferEfficiency * 4);
  const targetDO = Math.min(8, params.dissolvedOxygen * (0.5 + params.aerationRate * 0.2));

  const afterAeration: WaterQuality = {
    ...afterFiltration,
    bod: afterFiltration.bod * (1 - aerBodRemoval),
    cod: afterFiltration.cod * (1 - aerBodRemoval * 0.7),
    dissolvedOxygen: Math.max(afterFiltration.dissolvedOxygen, targetDO),
    ph: afterFiltration.ph + 0.1,
  };

  // Overall efficiency based on BOD removal
  const overallRemovalEfficiency = (influent.bod - afterAeration.bod) / influent.bod;

  return {
    afterCoagulation,
    afterFlocculation,
    afterSedimentation,
    afterFiltration,
    afterAeration,
    overallRemovalEfficiency,
  };
}
