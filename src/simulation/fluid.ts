/**
 * 2D Stable Fluids solver (Jos Stam method)
 * Solves incompressible Navier-Stokes on a staggered grid.
 */

export interface FluidConfig {
  width: number;
  height: number;
  dt: number;
  viscosity: number;
  diffusion: number;
  iterations: number;
}

export class FluidSolver {
  readonly width: number;
  readonly height: number;
  readonly dt: number;
  readonly viscosity: number;
  readonly diffusion: number;
  readonly iterations: number;

  // Velocity field (staggered grid: u at x-faces, v at y-faces)
  u: Float32Array;
  v: Float32Array;
  u0: Float32Array;
  v0: Float32Array;

  // Density / tracer field
  density: Float32Array;
  density0: Float32Array;

  // Solid mask: 1 = fluid, 0 = solid wall
  solid: Uint8Array;

  /** Velocity injected at the left edge of the domain. */
  inflowVelocity = 0;

  constructor(config: FluidConfig) {
    this.width = config.width;
    this.height = config.height;
    this.dt = config.dt;
    this.viscosity = config.viscosity;
    this.diffusion = config.diffusion;
    this.iterations = config.iterations;

    const n = this.width * this.height;
    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    this.u0 = new Float32Array(n);
    this.v0 = new Float32Array(n);
    this.density = new Float32Array(n);
    this.density0 = new Float32Array(n);
    this.solid = new Uint8Array(n).fill(1);
  }

  idx(x: number, y: number): number {
    return y * this.width + x;
  }

  isFluid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
    return this.solid[this.idx(x, y)] === 1;
  }

  setSolid(x: number, y: number, solid: boolean): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.solid[this.idx(x, y)] = solid ? 0 : 1;
    if (solid) {
      const i = this.idx(x, y);
      this.u[i] = 0;
      this.v[i] = 0;
    }
  }

  addVelocity(x: number, y: number, du: number, dv: number): void {
    if (!this.isFluid(x, y)) return;
    const i = this.idx(x, y);
    this.u[i] += du;
    this.v[i] += dv;
  }

  addDensity(x: number, y: number, amount: number): void {
    if (!this.isFluid(x, y)) return;
    this.density[this.idx(x, y)] += amount;
  }

  step(): void {
    this.stepVelocity();
    this.stepDensity();
  }

  /**
   * Pin the inlet velocity. This has to happen after the pressure
   * projection, otherwise the projection cancels it out: a closed box with a
   * single velocity boundary conserves zero net flux, so the inflow would
   * simply be projected away and nothing would ever move.
   */
  applyFlowBoundaries(): void {
    if (this.inflowVelocity === 0) return;
    for (let y = 2; y < this.height - 2; y++) {
      const i = this.idx(1, y);
      if (this.solid[i] === 0) continue;
      this.u[i] = this.inflowVelocity;
      this.v[i] = 0;
    }
  }

  private stepVelocity(): void {
    const { u, v, u0, v0, viscosity, dt, iterations } = this;

    // Diffuse velocity
    this.diffuse(u0, u, viscosity, dt);
    this.diffuse(v0, v, viscosity, dt);

    // Project (make divergence-free). u0/v0 double as the pressure and
    // divergence scratch space here.
    this.project(u, v, u0, v0, iterations);

    // Re-pin the inlet so the advection sees the driving velocity.
    this.applyFlowBoundaries();

    // Advect. The velocity field has to be passed as the transport field -
    // u0/v0 hold the pressure at this point, not the velocity.
    this.advect(u0, u, u, v, dt);
    u.set(u0);
    this.advect(v0, v, u, v, dt);
    v.set(v0);

    // Project again
    this.project(u, v, u0, v0, iterations);
    this.applyFlowBoundaries();
  }

  private stepDensity(): void {
    const { density, density0, dt, iterations } = this;
    this.diffuse(density0, density, this.diffusion, dt);
    this.advect(density, density0, this.u, this.v, dt);
  }

  private diffuse(out: Float32Array, inp: Float32Array, diff: number, dt: number): void {
    const a = dt * diff * (this.width - 2) * (this.height - 2);
    const c = 1 + 4 * a;

    for (let k = 0; k < this.iterations; k++) {
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 2; x++) {
          const i = this.idx(x, y);
          if (this.solid[i] === 0) continue;
          out[i] = (inp[i] + a * (
            out[i - 1] + out[i + 1] +
            out[i - this.width] + out[i + this.width]
          )) / c;
        }
      }
      this.setBoundary(out);
    }

    // Write the diffused field back to its source.
    inp.set(out);
  }

  private project(u: Float32Array, v: Float32Array, p: Float32Array, div: Float32Array, iterations: number): void {
    const h = -0.5 / ((this.width - 2) * (this.height - 2));

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const i = this.idx(x, y);
        if (this.solid[i] === 0) continue;
        div[i] = h * (u[i + 1] - u[i - 1] + v[i + this.width] - v[i - this.width]);
        p[i] = 0;
      }
    }

    this.setBoundary(div);
    this.setBoundary(p, true);

    for (let k = 0; k < iterations; k++) {
      for (let y = 1; y < this.height - 1; y++) {
        for (let x = 1; x < this.width - 1; x++) {
          const i = this.idx(x, y);
          if (this.solid[i] === 0) continue;
          p[i] = (div[i] + p[i - 1] + p[i + 1] + p[i - this.width] + p[i + this.width]) / 4;
        }
      }
      this.setBoundary(p, true);
    }

    const s = 0.5;
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const i = this.idx(x, y);
        if (this.solid[i] === 0) continue;
        u[i] -= s * (p[i + 1] - p[i - 1]);
        v[i] -= s * (p[i + this.width] - p[i - this.width]);
      }
    }

    this.setBoundary(u);
    this.setBoundary(v);
  }

  private advect(out: Float32Array, inp: Float32Array, u: Float32Array, v: Float32Array, dt: number): void {
    const dt0x = dt * (this.width - 2);
    const dt0y = dt * (this.height - 2);

    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        const i = this.idx(x, y);
        if (this.solid[i] === 0) continue;

        let px = x - dt0x * u[i];
        let py = y - dt0y * v[i];

        px = Math.max(0.5, Math.min(this.width - 1.5, px));
        py = Math.max(0.5, Math.min(this.height - 1.5, py));

        const i0 = Math.floor(px);
        const j0 = Math.floor(py);
        const i1 = i0 + 1;
        const j1 = j0 + 1;

        const s1 = px - i0;
        const s0 = 1 - s1;
        const t1 = py - j0;
        const t0 = 1 - t1;

        out[i] = s0 * (t0 * inp[this.idx(i0, j0)] + t1 * inp[this.idx(i0, j1)]) +
                 s1 * (t0 * inp[this.idx(i1, j0)] + t1 * inp[this.idx(i1, j1)]);
      }
    }

    this.setBoundary(out);
  }

  private setBoundary(field: Float32Array, isPressure = false): void {
    const w = this.width;
    const h = this.height;
    // Last fluid column: the tank outlet.
    const outlet = w - 2;

    // Domain walls use a zero-gradient condition. This has to stay Neumann:
    // pinning the pressure to zero on the walls lets the projection cancel
    // the inlet jet, and the whole tank goes dead.
    for (let y = 0; y < h; y++) {
      field[this.idx(0, y)] = field[this.idx(1, y)];
      field[this.idx(w - 1, y)] = field[this.idx(outlet, y)];
    }
    for (let x = 0; x < w; x++) {
      field[this.idx(x, 0)] = field[this.idx(x, 1)];
      field[this.idx(x, h - 1)] = field[this.idx(x, h - 2)];
    }

    // Interior obstacles: zero-gradient pressure across the obstacle face and
    // a no-slip velocity.
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = this.idx(x, y);
        if (this.solid[i] === 0) {
          field[i] = isPressure ? field[i - 1] : 0;
        }
      }
    }

    // The outlet column is open to atmosphere (zero pressure) so water can
    // leave the tank instead of piling up against a closed end.
    if (isPressure) {
      for (let y = 0; y < h; y++) {
        field[this.idx(w - 1, y)] = 0;
      }
    }
  }
}
