// Things drawn on the floor for the player: view cones, outlines, danger marks, paw prints.
import { Graphics } from 'pixi.js';
import { blocksSight, type Level, type Point } from '../../core/level';
import { DIRS, key, type Notice, SIGHT_HALF_ANGLE, type State, tileNow } from '../../core/game';
import { project } from '../iso';
import type { HeistView } from '../view';
import { COL } from './style';
import { diamondOutline } from './shapes';

/** A view cone: a fan of rays, each stopping at the first thing that blocks sight. */
export function viewCone(
  view: HeistView,
  g: Graphics,
  level: Level,
  s: State,
  x: number,
  y: number,
  facing: number,
  range: number,
  color: number,
  alpha: number,
): void {
  const d = DIRS[facing];
  const base = Math.atan2(d.y, d.x);
  const half = (SIGHT_HALF_ANGLE * Math.PI) / 180;
  const rays = 28;
  // Rays only change when the watcher moves/turns or a door opens, so cache them.
  const id = `${x.toFixed(2)},${y.toFixed(2)},${facing},${range},${s.turn},${s.ap},${s.smashed.length}`;
  let ends = view.coneCache.get(id);
  if (!ends) {
    ends = [];
    for (let i = 0; i <= rays; i++) {
      const a = base - half + (2 * half * i) / rays;
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      let len = range + 0.5;
      for (let t = 0.3; t <= range + 0.5; t += 0.1) {
        const tx = Math.floor(x + ux * t);
        const ty = Math.floor(y + uy * t);
        if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h || blocksSight(tileNow(level, s, tx, ty))) {
          len = t;
          break;
        }
      }
      ends.push(x + ux * len, y + uy * len);
    }
    if (view.coneCache.size > 400) view.coneCache.clear();
    view.coneCache.set(id, ends);
  }
  const pts: number[] = [];
  const start = project(view.proj, x, y);
  pts.push(start.x, start.y);
  for (let i = 0; i < ends.length; i += 2) {
    const p = project(view.proj, ends[i], ends[i + 1]);
    pts.push(p.x, p.y);
  }
  const pulse = 1 + Math.sin(view.time * 2.5) * 0.12;
  if (alpha > 0)
    g.poly(pts)
      .fill({ color, alpha: alpha * pulse })
      .stroke({ width: 2, color, alpha: 0.55, join: 'round' });
  else g.poly(pts).stroke({ width: 1.5, color, alpha: 0.35 + Math.sin(view.time * 4) * 0.1, join: 'round' });
}
/** Who-noticed-what marker: a pulsing ring on the spot and a dashed line back to the guard or camera. */
export function drawAlert(view: HeistView, g: Graphics, a: Notice): void {
  const color = a.kind === 'spotted' ? COL.warn : COL.danger;
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
  const at = project(view.proj, a.at.x + 0.5, a.at.y + 0.5);
  diamondOutline(view, g, a.at.x, a.at.y, color, 4, 0.02 - 0.08 * pulse, 0.6 + 0.4 * pulse);
  if (!a.from) return;
  const from = project(view.proj, a.from.x + 0.5, a.from.y + 0.5);
  const len = Math.hypot(at.x - from.x, at.y - from.y);
  const n = Math.max(1, Math.floor(len / 14));
  for (let i = 0; i < n; i += 2) {
    const t0 = i / n;
    const t1 = Math.min(1, (i + 1) / n);
    g.moveTo(from.x + (at.x - from.x) * t0, from.y + (at.y - from.y) * t0).lineTo(
      from.x + (at.x - from.x) * t1,
      from.y + (at.y - from.y) * t1,
    );
  }
  g.stroke({ width: 3, color, alpha: 0.9, cap: 'round' });
  g.ellipse(from.x, from.y, 22, 11).stroke({ width: 3, color, alpha: 0.6 + 0.4 * pulse });
}
/** Outlines an area of tiles (only its outer edges). Dashed for guard sight in the colour-blind palette. */
export function region(
  view: HeistView,
  g: Graphics,
  tiles: Set<string>,
  color: number,
  width: number,
  alpha: number,
  dashed = false,
): void {
  if (!tiles.size) return;
  const edge = (x0: number, y0: number, x1: number, y1: number) => {
    const a = project(view.proj, x0, y0);
    const b = project(view.proj, x1, y1);
    if (!dashed) return void g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    for (const [t0, t1] of [
      [0, 0.35],
      [0.65, 1],
    ])
      g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0).lineTo(
        a.x + (b.x - a.x) * t1,
        a.y + (b.y - a.y) * t1,
      );
  };
  for (const k of tiles) {
    const [x, y] = k.split(',').map(Number);
    if (!tiles.has(key(x, y - 1))) edge(x, y, x + 1, y);
    if (!tiles.has(key(x, y + 1))) edge(x, y + 1, x + 1, y + 1);
    if (!tiles.has(key(x - 1, y))) edge(x, y, x, y + 1);
    if (!tiles.has(key(x + 1, y))) edge(x + 1, y, x + 1, y + 1);
  }
  g.stroke({ width, color, alpha, cap: 'round', join: 'round' });
}
/** Danger mark: red cross (caught or alarm) or orange ring (spotted). */
export function riskMark(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  r: 'caught' | 'alarm' | 'seen',
): void {
  const c = project(view.proj, x + 0.5, y + 0.5);
  if (r === 'seen') {
    g.ellipse(c.x, c.y, 11, 5.5).stroke({ width: 2.5, color: COL.warn, alpha: 0.9 });
    return;
  }
  const a = project(view.proj, x + 0.3, y + 0.3);
  const b = project(view.proj, x + 0.7, y + 0.7);
  const d = project(view.proj, x + 0.7, y + 0.3);
  const e = project(view.proj, x + 0.3, y + 0.7);
  g.moveTo(a.x, a.y)
    .lineTo(b.x, b.y)
    .moveTo(d.x, d.y)
    .lineTo(e.x, e.y)
    .stroke({ width: 3, color: COL.danger, alpha: 0.9, cap: 'round' });
}
/** A wet paw print, fading as it dries. */
export function pawPrint(view: HeistView, g: Graphics, at: Point, fresh: number): void {
  const c = project(view.proj, at.x + 0.5, at.y + 0.5);
  const a = 0.25 + 0.6 * fresh;
  g.ellipse(c.x, c.y + 2, 5, 3.5).fill({ color: 0xe0314b, alpha: a });
  for (const [dx, dy] of [
    [-5, -3],
    [-2, -6],
    [2, -6],
    [5, -3],
  ])
    g.circle(c.x + dx, c.y + dy, 1.6).fill({ color: 0xe0314b, alpha: a });
}
/** Name of a piece of loot. */
export function lootName(view: HeistView, li: number): string {
  return view.lvl?.def.loot[li]?.name ?? '';
}
/** A ? or ! over a character's head, bobbing. */
export function mark(
  view: HeistView,
  g: Graphics,
  x: number,
  head: number,
  mark: '' | '?' | '!',
  bang: number,
  query: number,
): void {
  if (!mark) return;
  const top = head - 32 + Math.sin(view.time * 6) * 2;
  g.roundRect(x - 10, top, 20, 26, 5)
    .fill({ color: mark === '!' ? bang : query })
    .stroke({ width: 2, color: 0xffffff });
  if (mark === '!') {
    g.rect(x - 2, top + 4, 4, 12).fill({ color: 0xffffff });
    g.rect(x - 2, top + 19, 4, 4).fill({ color: 0xffffff });
  } else {
    // A fresh path each time, so the curve doesn't join up with whatever was drawn before it.
    g.beginPath()
      .arc(x, top + 9, 5, Math.PI, Math.PI * 2.25)
      .stroke({ width: 3, color: 0x1a1205 });
    g.beginPath()
      .moveTo(x + 1, top + 13)
      .lineTo(x, top + 17)
      .stroke({ width: 3, color: 0x1a1205 });
    g.rect(x - 1.5, top + 19, 3, 3).fill({ color: 0x1a1205 });
  }
}
/** A keycard lying on the floor. */
export function keycard(view: HeistView, g: Graphics, x: number, y: number): void {
  const c = project(view.proj, x + 0.5, y + 0.5, 1);
  const glow = 0.25 + Math.sin(view.time * 4) * 0.1;
  g.circle(c.x, c.y, 12).fill({ color: 0x5ef0ff, alpha: glow });
  g.poly([c.x - 9, c.y, c.x, c.y - 5, c.x + 9, c.y, c.x, c.y + 5])
    .fill({ color: 0xffffff })
    .stroke({ width: 1, color: 0x1b1b22 });
  g.circle(c.x - 2, c.y, 1.8).fill({ color: 0x2fb8a3 });
}
/** A decoy calling card on the floor. */
export function decoyCard(view: HeistView, g: Graphics, at: Point): void {
  const c = project(view.proj, at.x + 0.5, at.y + 0.5, 2);
  g.poly([c.x - 10, c.y, c.x, c.y - 6, c.x + 10, c.y, c.x, c.y + 6])
    .fill({ color: 0xf7f4ec })
    .stroke({ width: 1, color: 0x1b1b22 });
  g.circle(c.x, c.y, 2).fill({ color: 0xd8262f });
}
