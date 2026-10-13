/**
 * Main simulation engine that orchestrates fluid solver, particles,
 * treatment processes, and energy calculations.
 */

import { FluidSolver, FluidConfig } from './fluid';
import { ParticleSystem, ParticleType } from './particles';
import { TreatmentParams, DEFAULT_PARAMS, INFLUENT_QUALITY, WaterQuality, calculateTreatment } from './treatment';
import { EnergyBreakdown, calculateEnergy } from './energy';

export interface OptimizationResult {
  params: TreatmentParams;
  energy: EnergyBreakdown;
  quality: { turbidity: number; bod: number; do: number };
}

export interface SimulationState {
  time: number;
  running: boolean;
  params: TreatmentParams;
  quality: {
    influent: WaterQuality;
    afterCoagulation: WaterQuality;
    afterFlocculation: WaterQuality;
    afterSedimentation: WaterQuality;
    afterFiltration: WaterQuality;
    effluent: WaterQuality;
  };
  energy: EnergyBreakdown;
  particleStats: { total: number; solids: number; flocs: number; bubbles: number; settled: number };
  treatmentResults: ReturnType<typeof calculateTreatment>;
}

export interface ZoneConfig {
  name: string;
  xStart: number;
  xEnd: number;
  color: string;
  label: string;
}

const GRID_WIDTH = 200;
const GRID_HEIGHT = 60;

export const ZONES: ZoneConfig[] = [
  { name: 'inflow', xStart: 0, xEnd: 15, color: '#4a90d9', label: 'Inflow' },
  { name: 'Coagulation', xStart: 15, xEnd: 35, color: '#e8a838', label: 'Coagulation' },
  { name: 'Flocculation', xStart: 35, xEnd: 70, color: '#d4782e', label: 'Flocculation' },
  { name: 'Sedimentation', xStart: 70, xEnd: 110, color: '#7cb342', label: 'Sedimentation' },
  { name: 'Filtration', xStart: 110, xEnd: 140, color: '#26a69a', label: 'Filtration' },
  { name: 'Aeration', xStart: 140, xEnd: 175, color: '#42a5f5', label: 'Aeration' },
  { name: 'effluent', xStart: 175, xEnd: 200, color: '#66bb6a', label: 'Effluent' },
];

export class SimulationEngine {
  fluid: FluidSolver;
  particles: ParticleSystem;
  params: TreatmentParams;
  time: number = 0;
  running: boolean = true;
  private frameCount: number = 0;
  private treatmentResults: ReturnType<typeof calculateTreatment> | null = null;
  private energyResults: EnergyBreakdown | null = null;

  constructor() {
    const fluidConfig: FluidConfig = {
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
      dt: 0.1,
      viscosity: 0.0001,
      diffusion: 0.0001,
      iterations: 2,
    };

    this.fluid = new FluidSolver(fluidConfig);
    this.particles = new ParticleSystem(this.fluid, ZONES);
    this.params = { ...DEFAULT_PARAMS };

    this.setupGeometry();
    this.updateTreatmentResults();
  }

  private setupGeometry(): void {
    // Bottom wall
    for (let x = 0; x < GRID_WIDTH; x++) {
      this.fluid.setSolid(x, GRID_HEIGHT - 1, true);
    }

    // Top wall (partial - allow visual overflow)
    for (let x = 0; x < GRID_WIDTH; x++) {
      this.fluid.setSolid(x, 0, true);
    }

    // Left wall (inflow boundary)
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.fluid.setSolid(0, y, true);
    }

    // Right wall (effluent boundary)
    for (let y = 0; y < GRID_HEIGHT; y++) {
      this.fluid.setSolid(GRID_WIDTH - 1, y, true);
    }

    // Baffle between coagulation and flocculation (drives flow down)
    for (let y = 5; y < GRID_HEIGHT - 1; y++) {
      this.fluid.setSolid(35, y, true);
    }

    // Baffle between flocculation and sedimentation (drives flow up)
    for (let y = 0; y < GRID_HEIGHT - 25; y++) {
      this.fluid.setSolid(70, y, true);
    }

    // Sedimentation zone: sloped bottom for sludge collection
    for (let x = 70; x < 110; x++) {
      const depth = Math.floor((x - 70) / 40 * 8);
      for (let y = GRID_HEIGHT - 2 - depth; y < GRID_HEIGHT - 1; y++) {
        this.fluid.setSolid(x, y, true);
      }
    }

    // Filter bed in filtration zone
    for (let x = 115; x < 135; x++) {
      for (let y = GRID_HEIGHT - 12; y < GRID_HEIGHT - 4; y++) {
        this.fluid.setSolid(x, y, true);
      }
    }
  }

  step(): void {
    if (!this.running) return;

    this.frameCount++;

    // Apply inflow boundary condition (left edge)
    const inflowVelocity = this.params.flowRate / 50;
    for (let y = 2; y < GRID_HEIGHT - 2; y++) {
      this.fluid.u[this.fluid.idx(1, y)] = inflowVelocity;
      this.fluid.v[this.fluid.idx(1, y)] = 0;
    }

    // Mixing in coagulation zone (adds turbulence)
    if (this.frameCount % 2 === 0) {
      const mixIntensity = this.params.mixingIntensity * 0.3;
      for (let y = 5; y < GRID_HEIGHT - 5; y++) {
        for (let x = 16; x < 34; x++) {
          if (this.fluid.isFluid(x, y)) {
            this.fluid.addVelocity(x, y,
              (Math.random() - 0.5) * mixIntensity,
              (Math.random() - 0.5) * mixIntensity * 0.5
            );
          }
        }
      }
    }

    // Gentle mixing in flocculation zone
    if (this.frameCount % 5 === 0) {
      const flocMix = 0.05;
      for (let y = 5; y < GRID_HEIGHT - 5; y++) {
        for (let x = 36; x < 69; x++) {
          if (this.fluid.isFluid(x, y)) {
            this.fluid.addVelocity(x, y,
              (Math.random() - 0.5) * flocMix,
              (Math.random() - 0.5) * flocMix * 0.3
            );
          }
        }
      }
    }

    // Emit particles based on flow rate
    this.emitParticles();

    // Step fluid and particles
    this.fluid.step();
    this.particles.update();

    // Update treatment results (every 30 frames to save computation)
    if (this.frameCount % 30 === 0) {
      this.updateTreatmentResults();
    }

    this.time += this.fluid.dt;
  }

  private emitParticles(): void {
    const emissionRate = Math.ceil(this.params.flowRate / 20);

    // Inflow solids
    if (this.frameCount % 3 === 0) {
      this.particles.emit('solid', 2, 10 + Math.random() * 30, emissionRate);
    }

    // Coagulant in coagulation zone
    if (this.frameCount % 5 === 0 && this.params.coagulantDose > 5) {
      this.particles.emit('chemical', 18, 5 + Math.random() * 20, 1);
    }

    // Flocs forming in flocculation zone
    if (this.frameCount % 10 === 0) {
      this.particles.emit('floc', 40 + Math.random() * 25, 10 + Math.random() * 30, 1);
    }

    // Air bubbles in aeration zone
    if (this.frameCount % 2 === 0 && this.params.aerationRate > 0.5) {
      const bubbleCount = Math.ceil(this.params.aerationRate * 0.8);
      this.particles.emit('bubble', 145 + Math.random() * 25, GRID_HEIGHT - 5, bubbleCount);
    }
  }

  private updateTreatmentResults(): void {
    this.treatmentResults = calculateTreatment(this.params, INFLUENT_QUALITY);
    this.energyResults = calculateEnergy(this.params);
  }

  getState(): SimulationState {
    if (!this.treatmentResults || !this.energyResults) {
      this.updateTreatmentResults();
    }

    return {
      time: this.time,
      running: this.running,
      params: { ...this.params },
      quality: {
        influent: INFLUENT_QUALITY,
        afterCoagulation: this.treatmentResults!.afterCoagulation,
        afterFlocculation: this.treatmentResults!.afterFlocculation,
        afterSedimentation: this.treatmentResults!.afterSedimentation,
        afterFiltration: this.treatmentResults!.afterFiltration,
        effluent: this.treatmentResults!.afterAeration,
      },
      energy: this.energyResults!,
      particleStats: this.particles.getStats(),
      treatmentResults: this.treatmentResults!,
    };
  }

  setParams(params: Partial<TreatmentParams>): void {
    this.params = { ...this.params, ...params };
    this.updateTreatmentResults();
  }

  toggleRunning(): void {
    this.running = !this.running;
  }

  reset(): void {
    this.time = 0;
    this.frameCount = 0;
    this.particles.particles = [];
    this.fluid.u.fill(0);
    this.fluid.v.fill(0);
    this.fluid.density.fill(0);
    this.updateTreatmentResults();
  }
}
