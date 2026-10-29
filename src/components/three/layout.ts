/**
 * Shared geometry for the 3D scene.
 *
 * The simulation runs on a 200 x 60 grid (x left-to-right, y top-to-bottom).
 * Everything in the 3D scene - tank shells, equipment, labels and particles -
 * derives its position from this single mapping so nothing drifts out of
 * alignment.
 */

import { ZONES } from '../../simulation/engine';

export const GRID_WIDTH = 200;
export const GRID_HEIGHT = 60;

/** World-space width of the whole treatment train. */
export const SCENE_WIDTH = 55;
export const TANK_HEIGHT = 5;
export const TANK_DEPTH = 8;

/** Grid row 59 (floor) maps to FLOOR_Y, grid row 0 (surface) maps to SURFACE_Y. */
export const FLOOR_Y = 0.2;
export const SURFACE_Y = 2.6;

/** World units per grid cell. */
export const CELL_SIZE = SCENE_WIDTH / GRID_WIDTH;

/** Width of each zone in world units. */
export const ZONE_WIDTHS: number[] = ZONES.map(
  zone => ((zone.xEnd - zone.xStart) / GRID_WIDTH) * SCENE_WIDTH
);

/** Left edge of each zone in world units. */
export const ZONE_STARTS: number[] = (() => {
  const starts: number[] = [];
  let x = 0;
  for (const zone of ZONES) {
    starts.push(x);
    x += ((zone.xEnd - zone.xStart) / GRID_WIDTH) * SCENE_WIDTH;
  }
  return starts;
})();

/** Centre of each zone in world units. */
export const ZONE_CENTERS: number[] = ZONE_STARTS.map((start, i) => start + ZONE_WIDTHS[i] / 2);

/** Index of each zone by name, for readable lookups. */
export const ZONE_INDEX: Record<string, number> = ZONES.reduce(
  (acc, zone, i) => ({ ...acc, [zone.name]: i }),
  {} as Record<string, number>
);

/** Zone index for a grid x coordinate. */
export function zoneIndexForGridX(gridX: number): number {
  for (let i = 0; i < ZONES.length; i++) {
    if (gridX >= ZONES[i].xStart && gridX < ZONES[i].xEnd) return i;
  }
  return gridX < ZONES[0].xStart ? 0 : ZONES.length - 1;
}

/** Grid x (0..200) to world x (0..SCENE_WIDTH). */
export function gridToWorldX(gridX: number): number {
  return (gridX / GRID_WIDTH) * SCENE_WIDTH;
}

/**
 * Grid y (0..60, top to bottom) to world y.
 * Row 0 is the top of the water column, row 59 sits on the tank floor.
 */
export function gridToWorldY(gridY: number): number {
  const t = gridY / (GRID_HEIGHT - 1);
  return SURFACE_Y - t * (SURFACE_Y - FLOOR_Y);
}

/** Normalised depth (-1..1) to world z inside the tank. */
export function gridZToWorldZ(depth: number): number {
  return depth * (TANK_DEPTH / 2 - 0.6);
}

/** Water surface height of a zone for the given flow rate. */
export function waterLevelForZone(index: number, flowRate: number): number {
  const baseLevels = [2.0, 2.5, 3.0, 2.2, 1.8, 2.8, 2.0];
  const flowEffect = (flowRate / 200) * 0.5;
  return (baseLevels[index] ?? 2.5) + flowEffect;
}

/** Clamp a world y so it stays under the local water surface. */
export function clampToWater(worldY: number, waterLevel: number): number {
  return Math.min(worldY, Math.max(FLOOR_Y, waterLevel - 0.15));
}

/**
 * Water tint from turbidity: muddy brown when loaded, teal once clarified.
 */
export function turbidityColor(turbidity: number): string {
  const t = Math.min(1, Math.max(0, turbidity / 60));
  const clear = [30, 138, 140];
  const muddy = [122, 88, 48];
  const rgb = clear.map((c, i) => Math.round(c + (muddy[i] - c) * t));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}
