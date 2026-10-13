/**
 * Particle system for suspended solids, flocs, and air bubbles.
 * Particles interact with the fluid velocity field and treatment zone physics.
 */

import { FluidSolver } from './fluid';

export type ParticleType = 'solid' | 'floc' | 'bubble' | 'chemical';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
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
  settlingVelocity: number;
  bubbleRiseVelocity: number;
}

export class ParticleSystem {
  particles: Particle[] = [];
  readonly config: ParticleConfig;
  private fluid: FluidSolver;

  // Zone boundaries (in grid coordinates)
  zoneBoundaries: { name: string; xStart: number; xEnd: number; color: string }[];

  constructor(fluid: FluidSolver, zoneBoundaries: { name: string; xStart: number; xEnd: number; color: string }[]) {
    this.fluid = fluid;
    this.zoneBoundaries = zoneBoundaries;
    this.config = {
      maxParticles: 800,
      solidSize: 1.5,
      flocSize: 3.0,
      bubbleSize: 2.5,
      chemicalSize: 1.0,
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
        vx: 0,
        vy: 0,
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
        p.opacity = Math.max(0, 1 - p.life / 300);
        if (p.life > 300) {
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
        case 'solid': {
          // Solids follow flow + settle
          p.vx = p.vx * 0.9 + fluidU * 0.1;
          p.vy = p.vy * 0.9 + fluidV * 0.1 + this.config.settlingVelocity * 0.05;

          // Enhanced settling in sedimentation zone
          if (zone === 'Sedimentation') {
            p.vy += this.config.settlingVelocity * 0.15;
          }
          break;
        }
        case 'floc': {
          // Flocs settle faster
          p.vx = p.vx * 0.85 + fluidU * 0.15;
          p.vy = p.vy * 0.85 + fluidV * 0.15 + this.config.settlingVelocity * 0.12;

          if (zone === 'Sedimentation') {
            p.vy += this.config.settlingVelocity * 0.2;
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
          if (p.life > p.maxLife) {
            this.particles.splice(i, 1);
            continue;
          }
          break;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      // Boundary checks
      if (p.x < 1) p.x = 1;
      if (p.x > width - 2) p.x = width - 2;
      if (p.y > height - 2) {
        p.y = height - 2;
        if (p.type === 'solid' || p.type === 'floc') {
          p.settled = true;
          p.vx = 0;
          p.vy = 0;
        }
      }
      if (p.y < 1) p.y = 1;
    }
  }

  getStats(): { total: number; solids: number; flocs: number; bubbles: number; settled: number } {
    let solids = 0, flocs = 0, bubbles = 0, settled = 0;
    for (const p of this.particles) {
      if (p.settled) settled++;
      else if (p.type === 'solid') solids++;
      else if (p.type === 'floc') flocs++;
      else if (p.type === 'bubble') bubbles++;
    }
    return { total: this.particles.length, solids, flocs, bubbles, settled };
  }
}
