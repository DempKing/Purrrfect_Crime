// Basic shapes on the iso grid: tile diamonds, outlines and boxes.
import { Graphics, Matrix } from 'pixi.js';
import type { Level } from '../../core/level';
import { project } from '../iso';
import { surface, type WallSkin } from '../surfaces';
import type { HeistView } from '../view';
import { WALL_H } from './style';

/** Tint for something standing on x,y, matching the light there. */
export function tintColor(view: HeistView, x: number, y: number): number {
  const l = view.light[y]?.[x] ?? 1;
  return l === 0 ? 0x7d84a0 : l === 1 ? 0xdcdbe6 : 0xffffff;
}
/** Is this an outer wall on the camera's side? (Those are always drawn low.) */
export function nearOuterWall(view: HeistView, level: Level, x: number, y: number): boolean {
  const c = Math.cos(view.proj.angle);
  const s = Math.sin(view.proj.angle);
  const faces = (nx: number, ny: number) => c * nx - s * ny + (s * nx + c * ny) > 0.3;
  return (
    (x === 0 && faces(-1, 0)) ||
    (x === level.w - 1 && faces(1, 0)) ||
    (y === 0 && faces(0, -1)) ||
    (y === level.h - 1 && faces(0, 1))
  );
}
/** The 4 screen corners of a rectangle on the grid, at height z. */
export function corners(view: HeistView, x0: number, y0: number, x1: number, y1: number, z: number) {
  const p = view.proj;
  return [project(p, x0, y0, z), project(p, x1, y0, z), project(p, x1, y1, z), project(p, x0, y1, z)];
}
/** A filled tile diamond (inset by `inset`), with an optional outline. */
export function diamond(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  r: number,
  color: number,
  alpha: number,
  line?: number,
): void {
  const c = corners(view, x + 0.5 - r, y + 0.5 - r, x + 0.5 + r, y + 0.5 + r, 0);
  g.poly(c.flatMap((q) => [q.x, q.y])).fill({ color, alpha });
  if (line !== undefined) g.stroke({ width: 1, color: line, alpha: 0.6 });
}
/** The outline of a tile diamond. */
export function diamondOutline(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  color: number,
  width: number,
  inset = 0.04,
  alpha = 0.95,
): void {
  const c = corners(view, x + inset, y + inset, x + 1 - inset, y + 1 - inset, 0);
  g.poly(c.flatMap((q) => [q.x, q.y])).stroke({ width, color, alpha });
}
/** A box (only the faces towards the camera are drawn). */
export function prism(
  view: HeistView,
  g: Graphics,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  h: number,
  top: number,
  sideA: number,
  sideB: number,
  alpha: number,
  z0 = 0,
  skin?: WallSkin,
): void {
  const paper = skin && surface(skin.tex);
  const b = corners(view, x0, y0, x1, y1, z0);
  const t = corners(view, x0, y0, x1, y1, z0 + h);
  const normals = [
    { n: { x: 0, y: -1 }, i: 0, j: 1 },
    { n: { x: 1, y: 0 }, i: 1, j: 2 },
    { n: { x: 0, y: 1 }, i: 2, j: 3 },
    { n: { x: -1, y: 0 }, i: 3, j: 0 },
  ];
  const c = Math.cos(view.proj.angle);
  const s = Math.sin(view.proj.angle);
  for (const f of normals) {
    const rx = c * f.n.x - s * f.n.y;
    const ry = s * f.n.x + c * f.n.y;
    if (rx + ry <= 0.001) continue;
    const shade = rx > ry ? sideA : sideB;
    const face = [b[f.i].x, b[f.i].y, b[f.j].x, b[f.j].y, t[f.j].x, t[f.j].y, t[f.i].x, t[f.i].y];
    if (paper) {
      // Textured wall: one copy of the texture per face.
      let l = b[f.i];
      let r = b[f.j];
      if (r.x < l.x) [l, r] = [r, l];
      const m = new Matrix(
        (r.x - l.x) / paper.width,
        (r.y - l.y) / paper.width,
        0,
        WALL_H / paper.height,
        l.x,
        l.y - WALL_H,
      );
      g.poly(face)
        .fill({
          texture: paper,
          matrix: m,
          textureSpace: 'global',
          color: rx > ry ? 0xd6d6de : 0x9c9cac,
          alpha,
        })
        .stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
    } else
      g.poly(face)
        .fill({ color: shade, alpha })
        .stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
  }
  g.poly(t.flatMap((q) => [q.x, q.y]))
    .fill({ color: top, alpha })
    .stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
}
