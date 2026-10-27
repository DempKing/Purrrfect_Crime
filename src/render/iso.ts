// Isometric projection with a camera that can turn. The angle is continuous, so turning between
// the four 90° views animates smoothly and everything is drawn from the same tile data.

export const TILE_W = 96;
export const TILE_H = 48;

export interface Projector {
  angle: number; // radians
  cx: number; // grid point the view turns around
  cy: number;
}

export interface Screen {
  x: number;
  y: number;
  depth: number; // larger is nearer the camera
}

export function rotate(p: Projector, x: number, y: number): { rx: number; ry: number } {
  const dx = x - p.cx;
  const dy = y - p.cy;
  const c = Math.cos(p.angle);
  const s = Math.sin(p.angle);
  return { rx: c * dx - s * dy, ry: s * dx + c * dy };
}

export function project(p: Projector, x: number, y: number, z = 0): Screen {
  const { rx, ry } = rotate(p, x, y);
  return { x: ((rx - ry) * TILE_W) / 2, y: ((rx + ry) * TILE_H) / 2 - z, depth: rx + ry };
}

/** The grid point under a screen point on the floor (z = 0). */
export function unproject(p: Projector, sx: number, sy: number): { x: number; y: number } {
  const a = (2 * sx) / TILE_W; // rx - ry
  const b = (2 * sy) / TILE_H; // rx + ry
  const rx = (a + b) / 2;
  const ry = (b - a) / 2;
  const c = Math.cos(-p.angle);
  const s = Math.sin(-p.angle);
  return { x: c * rx - s * ry + p.cx, y: s * rx + c * ry + p.cy };
}

/** A direction on the grid as it appears on screen (for facing a sprite). */
export function screenDir(p: Projector, dx: number, dy: number): { x: number; y: number } {
  const c = Math.cos(p.angle);
  const s = Math.sin(p.angle);
  const rx = c * dx - s * dy;
  const ry = s * dx + c * dy;
  const x = rx - ry;
  const y = (rx + ry) / 2;
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}
