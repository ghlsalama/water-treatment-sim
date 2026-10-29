/**
 * Particle system for suspended solids, flocs, and air bubbles.
 * Particles interact with the fluid velocity field and treatment zone physics.
 */

import { FluidSolver } from './fluid';
import { TreatmentParams } from './treatment';

export type ParticleType = 'solid' | 'floc' | 'bubble' | 'chemical' | 'tracer';

/** Grid row where the sludge blanket sits in the sedimentation basin. */
const SLUDGE_BLANKET_Y = 50;
/** Grid row where the filter media starts. */
const FILTER_MEDIA_Y = 46;

export interface Particle {
  x: number;
  y: number;
  /** Normalised depth across the tank, -1 (far wall) to 1 (near wall). */
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  type: ParticleType;
  life: number;
  maxLife: number;
  settled: boolean;
  opacity: number;
}

export interface ParticleConfig {
  maxParticles: number;
  solidSize: number;
  flocSize: number;
  bubbleSize: number;
  chemicalSize: number;
  tracerSize: number;
  settlingVelocity: number;
  bubbleRiseVelocity: number;
}

export class ParticleSystem {
  particles: Particle[] = [];
  readonly config: ParticleConfig;
  private fluid: FluidSolver;
  private getParams: () => TreatmentParams;

  // Zone boundaries (in grid coordinates)
  zoneBoundaries: { name: string; xStart: number; xEnd: number; color: string }[];

  constructor(
    fluid: FluidSolver,
    zoneBoundaries: { name: string; xStart: number; xEnd: number; color: string }[],
    getParams: () => TreatmentParams
  ) {
    this.fluid = fluid;
    this.zoneBoundaries = zoneBoundaries;
    this.getParams = getParams;
    this.config = {
      maxParticles: 1200,
      solidSize: 1.5,
      flocSize: 3.0,
      bubbleSize: 2.5,
      chemicalSize: 1.0,
      tracerSize: 1.2,
      settlingVelocity: 0.15,
      bubbleRiseVelocity: 0.2,
    };
  }

  emit(type: ParticleType, x: number, y: number, count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.config.maxParticles) return;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 2,
        y: y + (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
        vx: 0,
        vy: 0,
        vz: (Math.random() - 0.5) * 0.02,
        size: this.getSizeForType(type),
        type,
        life: 0,
        maxLife: 200 + Math.random() * 400,
        settled: false,
        opacity: 1,
      });
    }
  }

  private getSizeForType(type: ParticleType): number {
    switch (type) {
      case 'solid': return this.config.solidSize;
      case 'floc': return this.config.flocSize;
      case 'bubble': return this.config.bubbleSize;
      case 'chemical': return this.config.chemicalSize;
      case 'tracer': return this.config.tracerSize;
    }
  }

  getZoneAt(x: number): string {
    for (const zone of this.zoneBoundaries) {
      if (x >= zone.xStart && x < zone.xEnd) return zone.name;
    }
    return 'unknown';
  }

  update(): void {
    const { width, height, u, v } = this.fluid;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.settled) {
        p.life++;
        p.opacity = Math.max(0, 1 - p.life / 150);
        if (p.life > 150) {
          this.particles.splice(i, 1);
        }
        continue;
      }

      // Sample fluid velocity at particle position
      const gx = Math.floor(Math.max(0, Math.min(width - 1, p.x)));
      const gy = Math.floor(Math.max(0, Math.min(height - 1, p.y)));
      const gi = gy * width + gx;

      const fluidU = u[gi];
      const fluidV = v[gi];

      // Blend fluid velocity with particle-specific behavior
      const zone = this.getZoneAt(p.x);

      switch (p.type) {
        case 'solid':
        case 'floc': {
          // Solids follow the flow. Upstream of the clarifier they are kept
          // in suspension by the mixing - only the sedimentation basin lets
          // them settle out.
          p.vx = p.vx * 0.9 + fluidU * 0.1;
          p.vy = p.vy * 0.9 + fluidV * 0.1;

          if (zone === 'Sedimentation') {
            // The clarifier is quiescent: solids drop out of the water column
            // and collect on the sludge blanket.
            p.vy += this.config.settlingVelocity * 0.8;

            // Reached the sludge blanket: most solids are captured, the rest
            // are carried over the effluent weir.
            if (p.y >= SLUDGE_BLANKET_Y) {
              if (Math.random() < this.getParams().sedimentationEfficiency) {
                p.settled = true;
                p.vx = 0;
                p.vy = 0;
              } else {
                p.vy = -0.08;
              }
            }
          }

          if (zone === 'Filtration') {
            // The media bed strains the flow: particles are intercepted with a
            // probability that reflects the filter removal efficiency.
            if (Math.random() < this.getParams().filterRemovalEfficiency * 0.15) {
              p.settled = true;
              p.vx = 0;
              p.vy = 0;
            } else if (p.y >= FILTER_MEDIA_Y && Math.random() < 0.3) {
              p.settled = true;
              p.vx = 0;
              p.vy = 0;
            }
          }
          break;
        }
        case 'bubble': {
          // Bubbles rise
          p.vx = p.vx * 0.8 + fluidU * 0.2;
          p.vy = p.vy * 0.8 + fluidV * 0.2 - this.config.bubbleRiseVelocity;
          p.life++;
          if (p.life > p.maxLife || p.y < 2) {
            this.particles.splice(i, 1);
            continue;
          }
          break;
        }
        case 'chemical': {
          // Chemicals diffuse with flow
          p.vx = p.vx * 0.7 + fluidU * 0.3;
          p.vy = p.vy * 0.7 + fluidV * 0.3;
          p.life++;
          p.opacity = Math.max(0, 1 - p.life / p.maxLife);

          // Coagulant is consumed as it binds to the flocs it is forming.
          if (zone === 'Flocculation' && Math.random() < 0.05) {
            this.particles.splice(i, 1);
            continue;
          }

          if (p.life > p.maxLife) {
            this.particles.splice(i, 1);
            continue;
          }
          break;
        }
        case 'tracer': {
          // Tracers follow flow exactly, no settling
          p.vx = fluidU;
          p.vy = fluidV;
          p.life++;
          p.opacity = Math.max(0, 1 - p.life / p.maxLife);
          if (p.life > p.maxLife) {
            this.particles.splice(i, 1);
            continue;
          }
          break;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // Lateral drift across the tank depth. The flow solver is 2D, so this
      // supplies the spread you would see across a real basin.
      p.z += p.vz;
      if (p.z > 1) {
        p.z = 1;
        p.vz = -Math.abs(p.vz);
      } else if (p.z < -1) {
        p.z = -1;
        p.vz = Math.abs(p.vz);
      }
      p.vz += (Math.random() - 0.5) * 0.012;

      // Boundary checks
      if (p.x < 1) p.x = 1;
      if (p.y > height - 2) {
        p.y = height - 2;
        if (p.type === 'solid' || p.type === 'floc') {
          p.settled = true;
          p.vx = 0;
          p.vy = 0;
        }
      }
      if (p.y < 1) p.y = 1;

      // Anything that reaches the effluent leaves the plant.
      if (p.x > width - 3) {
        this.particles.splice(i, 1);
        continue;
      }
    }
  }

  getStats(): { total: number; solids: number; flocs: number; bubbles: number; chemicals: number; settled: number; tracers: number } {
    let solids = 0, flocs = 0, bubbles = 0, chemicals = 0, settled = 0, tracers = 0;
    for (const p of this.particles) {
      if (p.settled) settled++;
      else if (p.type === 'solid') solids++;
      else if (p.type === 'floc') flocs++;
      else if (p.type === 'bubble') bubbles++;
      else if (p.type === 'chemical') chemicals++;
      else if (p.type === 'tracer') tracers++;
    }
    return { total: this.particles.length, solids, flocs, bubbles, chemicals, settled, tracers };
  }
}
