// Floors, walls and what's built into them: doors, vents, gaps, glass, wall decorations.
import { Graphics, Matrix, type Texture } from 'pixi.js';
import { type FloorSkin, surface } from '../surfaces';
import { project } from '../iso';
import { blocksSight, type Level } from '../../core/level';
import { type State, tileNow } from '../../core/game';
import {
  type ClockFace,
  DECOR_DENSITY,
  LEVEL_WALL_DECOR,
  LIT_ON_WALL,
  prop,
  type PropName,
  WALL_DECOR,
} from '../props';
import { tileHash } from '../../core/exhibits';
import { flat, type FlatName, WALL_FLATS } from '../flats';
import type { HeistView } from '../view';
import { type Drawable, NEIGHBORS } from './types';
import { corners, diamond, diamondOutline, prism, tintColor } from './shapes';
import { sprite } from './characters';
import { WALL_H } from './style';

/** A textured floor tile (false until the texture loads). */
export function floorTile(view: HeistView, g: Graphics, x: number, y: number, skin: FloorSkin): boolean {
  const tex = surface(skin.tex);
  if (!tex) return false;
  const k = skin.tiles / tex.width; // tiles per texel
  const o = project(view.proj, 0, 0);
  const ex = project(view.proj, 1, 0);
  const ey = project(view.proj, 0, 1);
  const m = new Matrix((ex.x - o.x) * k, (ex.y - o.y) * k, (ey.x - o.x) * k, (ey.y - o.y) * k, o.x, o.y);
  const c = corners(view, x, y, x + 1, y + 1, 0);
  g.poly(c.flatMap((q) => [q.x, q.y]))
    .fill({ texture: tex, matrix: m, textureSpace: 'global', color: 0xc4c4d2 })
    .stroke({ width: 1, color: 0x000000, alpha: 0.22 });
  return true;
}
/** Decorations on some visible wall faces: pictures, clocks, windows and so on. */
export function wallDecor(
  view: HeistView,
  level: Level,
  s: State,
  x: number,
  y: number,
  d: number,
  items: Drawable[],
): void {
  const choices = LEVEL_WALL_DECOR[level.def.id] ?? WALL_DECOR[view.district] ?? WALL_DECOR['old-town'];
  const c = Math.cos(view.proj.angle);
  const sn = Math.sin(view.proj.angle);
  NEIGHBORS.forEach((n, i) => {
    const fx = x + n.x;
    const fy = y + n.y;
    if (fx < 0 || fy < 0 || fx >= level.w || fy >= level.h) return;
    const t = tileNow(level, s, fx, fy);
    if (t !== 'floor' && t !== 'marble' && t !== 'squeaky' && t !== 'grate' && t !== 'plate') return;
    if (c * n.x - sn * n.y + (sn * n.x + c * n.y) <= 0.3) return; // the face turned away from the camera
    const density = DECOR_DENSITY[level.def.id] ?? 0.2;
    const h = tileHash(x, y, i);
    if (h > density) return;
    let pick = Math.floor((h / density) * choices.length);
    // Windows only on outside walls (half of them).
    const outside = x === 0 || y === 0 || x === level.w - 1 || y === level.h - 1;
    if (outside && choices.includes('spr_window') && tileHash(x, y, i + 20) < 0.5)
      pick = choices.indexOf('spr_window');
    while (
      choices[pick % choices.length] === 'spr_window' &&
      !outside &&
      choices.some((c) => c !== 'spr_window')
    )
      pick++;
    const name = choices[pick % choices.length];
    if (name.startsWith('pclock_')) {
      const size = 0.95 + tileHash(x, y, i + 30) * 1.05;
      const tint = tintColor(view, fx, fy);
      items.push({
        depth: d + 0.35,
        draw: (g) =>
          clockFace(
            view,
            g,
            name as ClockFace,
            x + 0.5 + n.x * 0.52,
            y + 0.5 + n.y * 0.52,
            n,
            size,
            tint,
            tileHash(x, y, i + 40),
          ),
      });
      return;
    }
    const tint = tintColor(view, fx, fy);
    const bx = x + 0.5 + n.x * 0.5;
    const by = y + 0.5 + n.y * 0.5;
    items.push({
      depth: d + 0.35,
      draw: (g) => {
        const flatSpec = WALL_FLATS[name as FlatName];
        const pic = flatSpec && flat(name as FlatName);
        const model = flatSpec ? undefined : prop(name as PropName);
        if (!pic && !model) return;
        // Height on the wall, keeping the picture's proportions.
        const tall =
          pic && flatSpec ? (flatSpec.width * 58.8 * pic.height) / pic.width : (model?.height ?? 0);
        const middle = flatSpec ? flatSpec.z : 50;
        const lit = flatSpec ? !!flatSpec.lit : LIT_ON_WALL.has(name as PropName);
        const top = middle + tall / 2 + 6;
        if (lit) {
          // A wash of warm light down the wall from the picture light.
          const a = project(view.proj, bx - n.y * 0.22, by + n.x * 0.22, top);
          const b = project(view.proj, bx + n.y * 0.22, by - n.x * 0.22, top);
          const c2 = project(view.proj, bx + n.y * 0.4, by - n.x * 0.4, top - 62);
          const d2 = project(view.proj, bx - n.y * 0.4, by + n.x * 0.4, top - 62);
          g.poly([a.x, a.y, b.x, b.y, c2.x, c2.y, d2.x, d2.y]).fill({ color: 0xffe2a0, alpha: 0.16 });
        }
        if (pic && flatSpec)
          onWall(view, g, pic, bx + n.x * 0.02, by + n.y * 0.02, n, flatSpec.width, middle, tall, tint);
        else sprite(view, g, name as PropName, bx, by, 0, Math.atan2(n.y, n.x) - Math.PI / 2, 1, tint);
        if (lit) {
          // The brass picture light itself, on a short arm out from the wall.
          const ox = bx + n.x * 0.07;
          const oy = by + n.y * 0.07;
          const l = project(view.proj, ox - n.y * 0.16, oy + n.x * 0.16, top + 4);
          const r = project(view.proj, ox + n.y * 0.16, oy - n.x * 0.16, top + 4);
          const w = project(view.proj, bx, by, top + 9);
          const m = project(view.proj, ox, oy, top + 4);
          g.moveTo(w.x, w.y).lineTo(m.x, m.y).stroke({ width: 1.5, color: 0x6b4f1e });
          g.moveTo(l.x, l.y).lineTo(r.x, r.y).stroke({ width: 3.5, color: 0xc9a24a, cap: 'round' });
          g.moveTo(l.x, l.y + 1.5)
            .lineTo(r.x, r.y + 1.5)
            .stroke({ width: 1.5, color: 0xfff1c0, alpha: 0.9, cap: 'round' });
        }
      },
    });
  });
}
/** A clock on a wall face (one of four styles). `seed` sets its time and speed so no two match. */
export function clockFace(
  view: HeistView,
  g: Graphics,
  kind: ClockFace,
  bx: number,
  by: number,
  n: { x: number; y: number },
  size: number,
  tint: number,
  seed: number,
): void {
  let tx = -n.y;
  let ty = n.x;
  const b = project(view.proj, bx, by, 52);
  if (project(view.proj, bx + tx, by + ty).x < project(view.proj, bx, by).x) {
    tx = -tx;
    ty = -ty;
  }
  // Local units are game pixels on the wall: x along it, y down it.
  const along = project(view.proj, bx + tx, by + ty, 52);
  const m = new Matrix(((along.x - b.x) / 58.8) * size, ((along.y - b.y) / 58.8) * size, 0, size, b.x, b.y);
  const shade = (c: number) => {
    const k = (tint & 0xff) / 255;
    return (
      (((((c >> 16) & 0xff) * k) | 0) << 16) | (((((c >> 8) & 0xff) * k) | 0) << 8) | (((c & 0xff) * k) | 0)
    );
  };
  const t = view.time * (0.4 + seed * 0.8) + seed * 40;
  const hand = (len: number, a: number, w: number, col: number) =>
    g
      .moveTo(0, 0)
      .lineTo(Math.sin(a) * len, -Math.cos(a) * len)
      .stroke({ width: w, color: col, cap: 'round' });
  const gear = (cx: number, cy: number, r: number, teeth: number, a: number, col: number) => {
    const pts: number[] = [];
    for (let i = 0; i < teeth * 2; i++) {
      const rr = i % 2 ? r : r * 0.8;
      const aa = a + (i * Math.PI) / teeth;
      pts.push(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
    }
    g.poly(pts)
      .fill({ color: col })
      .stroke({ width: 0.8, color: shade(0x4a3410) });
    g.circle(cx, cy, r * 0.28).fill({ color: shade(0x2a1d08) });
  };
  g.save();
  g.setTransform(m);
  if (kind === 'pclock_roman') {
    g.circle(0, 0, 11).fill({ color: shade(0x8a6a2a) });
    g.circle(0, 0, 9.5)
      .fill({ color: shade(0xf1e8d0) })
      .stroke({ width: 0.8, color: shade(0x3a2a10) });
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      g.moveTo(Math.sin(a) * 7.2, -Math.cos(a) * 7.2)
        .lineTo(Math.sin(a) * 8.6, -Math.cos(a) * 8.6)
        .stroke({ width: i % 3 ? 0.6 : 1.4, color: shade(0x1a1a1a) });
    }
    hand(5, t * 0.08, 1.4, shade(0x1a1a1a));
    hand(7.5, t, 0.9, shade(0x1a1a1a));
    g.circle(0, 0, 1).fill({ color: shade(0xb08a3a) });
  } else if (kind === 'pclock_gears') {
    gear(-4, 2, 7, 10, t * 0.6, shade(0xc9a24a));
    gear(6, -4, 5, 8, -t * 0.84 + 0.3, shade(0xb08a3a));
    gear(5, 7, 3.6, 6, t * 1.2, shade(0xd9b45a));
    g.circle(-4, 2, 4.4).fill({ color: shade(0xf1e8d0), alpha: 0.85 });
    hand(3.2, t * 0.1, 0.9, shade(0x1a1a1a));
    hand(4.2, t * 1.1, 0.6, shade(0x1a1a1a));
  } else if (kind === 'pclock_odd') {
    // The odd clock: 13 hours, one hand going backwards.
    g.poly([0, -11, 9, -5, 10, 5, 0, 11, -10, 5, -9, -5])
      .fill({ color: shade(0x3a2a4a) })
      .stroke({ width: 1, color: shade(0xc9a24a) });
    g.circle(0, 0, 7.6).fill({ color: shade(0xd8d0f0) });
    for (let i = 0; i < 13; i++) {
      const a = (i * Math.PI * 2) / 13;
      g.circle(Math.sin(a) * 6.3, -Math.cos(a) * 6.3, 0.55).fill({ color: shade(0x2a1a3a) });
    }
    hand(5.5, t * 0.7, 0.9, shade(0x2a1a3a));
    hand(4, -t * 1.3, 0.9, shade(0x8a1a2a));
    hand(6.5, t * 3.1, 0.4, shade(0x2a1a3a));
    g.ellipse(0, 0, 1.8, 1.1).fill({ color: shade(0xffffff) });
    g.circle(Math.sin(t) * 0.5, 0, 0.6).fill({ color: shade(0x1a1a1a) });
  } else {
    // A pendulum clock: a wooden case, a small face, and the bob swinging below.
    g.roundRect(-6, -10, 12, 30, 2)
      .fill({ color: shade(0x5a3a1e) })
      .stroke({ width: 0.8, color: shade(0x2a1a0a) });
    g.circle(0, -4, 4.6).fill({ color: shade(0xf1e8d0) });
    hand(3, t * 0.1, 0.8, shade(0x1a1a1a));
    hand(4, t, 0.5, shade(0x1a1a1a));
    g.rect(-4, 3, 8, 15).fill({ color: shade(0x2a1a0a) });
    const swing = Math.sin(view.time * 3 + seed * 6) * 0.35;
    g.moveTo(0, 3)
      .lineTo(Math.sin(swing) * 11, 3 + Math.cos(swing) * 11)
      .stroke({ width: 0.6, color: shade(0xc9a24a) });
    g.circle(Math.sin(swing) * 11, 3 + Math.cos(swing) * 11, 1.9).fill({ color: shade(0xd9b45a) });
  }
  g.restore();
}
/** A flat picture on a wall face, `width` tiles wide, centerd `middle` px up. */
export function onWall(
  view: HeistView,
  g: Graphics,
  tex: Texture,
  bx: number,
  by: number,
  n: { x: number; y: number },
  width: number,
  middle: number,
  tall: number,
  tint: number,
): void {
  // Along the wall, left to right as the camera sees it, so the picture is never mirrored.
  let tx = -n.y;
  let ty = n.x;
  const b = project(view.proj, bx, by);
  if (project(view.proj, bx + tx, by + ty).x < b.x) {
    tx = -tx;
    ty = -ty;
  }
  const l = project(view.proj, bx - (tx * width) / 2, by - (ty * width) / 2, middle + tall / 2);
  const r = project(view.proj, bx + (tx * width) / 2, by + (ty * width) / 2, middle + tall / 2);
  const m = new Matrix((r.x - l.x) / tex.width, (r.y - l.y) / tex.width, 0, tall / tex.height, l.x, l.y);
  g.save();
  g.setTransform(m);
  g.setFillStyle({ color: 0xffffff, alpha: 1 });
  g.texture(tex, tint, 0, 0, tex.width, tex.height);
  g.restore();
}
/** A vent grate in the floor. */
export function grate(view: HeistView, g: Graphics, x: number, y: number): void {
  diamond(view, g, x, y, 0.32, 0x14161f, 1);
  for (let i = -2; i <= 2; i++) {
    const a = project(view.proj, x + 0.5 + i * 0.1, y + 0.22);
    const b = project(view.proj, x + 0.5 + i * 0.1, y + 0.78);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.5, color: 0x8a90a8, alpha: 0.9 });
  }
}
/** A door; its knob turns green once Leo has started picking it. */
export function door(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  h: number,
  alpha: number,
  picks: number,
): void {
  prism(view, g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, h, 0x8a6a45, 0x6b4a2a, 0x553a20, alpha);
  const sp = project(view.proj, x + 0.5, y + 0.5, h * 0.45);
  g.circle(sp.x, sp.y, 4).fill({ color: picks > 0 ? 0x9ff0c8 : 0xf2c46b });
}
/** A control box on the wall: the camera panel (screens) or the fuse box (lever). Changes look once used. */
export function controlBox(
  view: HeistView,
  g: Graphics,
  level: Level,
  s: State,
  x: number,
  y: number,
  kind: 'panel' | 'fuse',
  off: boolean,
): void {
  const c = Math.cos(view.proj.angle);
  const sn = Math.sin(view.proj.angle);
  for (const n of NEIGHBORS) {
    const t = tileNow(level, s, x + n.x, y + n.y);
    if (blocksSight(t) || t === 'gap' || t === 'wire') continue;
    if (c * n.x - sn * n.y + (sn * n.x + c * n.y) <= 0.3) continue; // the face turned away from the camera
    let tx = -n.y;
    let ty = n.x;
    const bx = x + 0.5 + n.x * 0.52;
    const by = y + 0.5 + n.y * 0.52;
    const o = project(view.proj, bx, by, 46);
    if (project(view.proj, bx + tx, by + ty).x < project(view.proj, bx, by).x) {
      tx = -tx;
      ty = -ty;
    }
    const along = project(view.proj, bx + tx, by + ty, 46);
    // Draw in the wall face's own coordinates (x along, y down).
    const m = new Matrix((along.x - o.x) / 58.8, (along.y - o.y) / 58.8, 0, 1, o.x, o.y);
    const glow = off ? 0 : 0.35 + Math.sin(view.time * 3 + x + y) * 0.2;
    g.save();
    g.setTransform(m);
    if (glow)
      g.roundRect(-20, -24, 40, 46, 8).fill({
        color: kind === 'panel' ? 0x5ef0ff : 0xffd23f,
        alpha: glow * 0.35,
      });
    g.roundRect(-16, -20, 32, 38, 4).fill({ color: 0x5b6472 }).stroke({ width: 2, color: 0x1c1233 });
    g.rect(-13, -17, 26, 32).fill({ color: 0x6e7888 });
    if (kind === 'panel') {
      // Four little camera feeds, live or dead.
      for (const [sx, sy] of [
        [-11, -14],
        [1, -14],
        [-11, -4],
        [1, -4],
      ])
        g.rect(sx, sy, 10, 8)
          .fill({ color: off ? 0x1a1d24 : 0x2fb8a3 })
          .stroke({ width: 1, color: 0x1c1233 });
      if (!off)
        for (const [sx, sy] of [
          [-11, -14],
          [1, -14],
          [-11, -4],
          [1, -4],
        ])
          g.rect(sx + 1, sy + 3 + ((view.time * 6 + sx) % 4), 8, 1).fill({ color: 0xbaf7ec, alpha: 0.6 });
      g.circle(-8, 9, 2.2).fill({
        color: off ? 0x7a1d16 : Math.sin(view.time * 5) > 0 ? 0xff3b30 : 0x8a1a14,
      });
      g.rect(-2, 7, 11, 4).fill({ color: 0x1c1233 });
    } else {
      // Fuse box: lever up while the power is on, down once cut.
      g.poly([-1, -16, -7, -6, -2, -6, -5, 2, 5, -9, 0, -9, 3, -16])
        .fill({ color: 0xffd23f })
        .stroke({ width: 1, color: 0x1c1233 });
      g.rect(-4, 3, 8, 12).fill({ color: 0x2a2f3a });
      g.rect(-2.5, off ? 9 : 2, 5, 6)
        .fill({ color: off ? 0xff3b30 : 0x4dff88 })
        .stroke({ width: 1, color: 0x1c1233 });
      g.circle(9, 12, 2).fill({ color: off ? 0xff3b30 : 0x4dff88 });
    }
    g.restore();
    g.beginPath();
  }
}
/** A pressure plate: a raised metal square with a seam round it. */
export function plate(view: HeistView, g: Graphics, x: number, y: number): void {
  diamond(view, g, x, y, 0.36, 0x6a7080, 1);
  diamondOutline(view, g, x, y, 0x2a2e38, 1.5, 0.16, 0.9);
  diamond(view, g, x, y, 0.22, 0x8a90a0, 1);
}
/** Squeaky floorboards. */
export function planks(view: HeistView, g: Graphics, x: number, y: number): void {
  for (const t of [0.33, 0.66]) {
    const a = project(view.proj, x + t, y + 0.05);
    const b = project(view.proj, x + t, y + 0.95);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a2614, alpha: 0.8 });
  }
  const n = project(view.proj, x + 0.5, y + 0.5);
  g.circle(n.x, n.y, 1.5).fill({ color: 0x2a1a0c });
}
/** A card-reader door: steel, with a red light, green once Leo has the card. */
export function keydoor(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  h: number,
  alpha: number,
  canOpen: boolean,
): void {
  prism(view, g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, h, 0x8a93a8, 0x646c80, 0x4e5566, alpha);
  const sp = project(view.proj, x + 0.5, y + 0.5, h * 0.5);
  g.roundRect(sp.x - 5, sp.y - 7, 10, 14, 2).fill({ color: 0x1c2233 });
  g.circle(sp.x, sp.y - 3, 2.5).fill({ color: canOpen ? 0x4dff88 : 0xff3b30 });
}
/** A round vault door in a steel frame, with its dials. */
export function vault(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  h: number,
  alpha: number,
  dials: number,
  known: boolean,
): void {
  prism(view, g, x, y, x + 1, y + 1, h, 0x9aa1b2, 0x6e7586, 0x575d6c, alpha);
  const c = project(view.proj, x + 0.5, y + 0.5, h + 2);
  g.circle(c.x, c.y, 12).fill({ color: 0xc0c6d4, alpha }).stroke({ width: 2, color: 0x2e333e });
  for (let i = 0; i < 2; i++)
    g.circle(c.x - 5 + i * 10, c.y, 3).fill({ color: i < dials ? 0x6ee7a8 : known ? 0xf2c46b : 0x2e333e });
}
/** A gap between rooftops (a long way down) or the water at the docks. */
export function gap(view: HeistView, g: Graphics, level: Level, x: number, y: number): void {
  const water = level.def.gaps === 'water';
  diamond(view, g, x, y, 0.5, water ? 0x0f2a44 : 0x05060c, 1);
  if (water) {
    const a = project(view.proj, x + 0.25, y + 0.5);
    const w = Math.sin(view.time * 2 + x + y) * 2;
    g.moveTo(a.x, a.y + w)
      .quadraticCurveTo(a.x + 8, a.y - 4 + w, a.x + 16, a.y + w)
      .stroke({ width: 1.5, color: 0x5aa0d0, alpha: 0.6 });
  } else if ((x * 7 + y * 13) % 5 === 0) {
    // Streetlights far below.
    const c = project(view.proj, x + 0.5, y + 0.5);
    g.circle(c.x, c.y, 1.5).fill({ color: 0xf2c46b, alpha: 0.7 });
  }
}
/** A wire strung across a gap, from each neighbor that isn't open air. */
export function wire(view: HeistView, g: Graphics, level: Level, x: number, y: number): void {
  const c = project(view.proj, x + 0.5, y + 0.5, 4);
  for (const d of [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]) {
    if (level.tiles[y + d.y]?.[x + d.x] === 'gap' || level.tiles[y + d.y]?.[x + d.x] === undefined) continue;
    const e = project(view.proj, x + 0.5 + d.x * 0.5, y + 0.5 + d.y * 0.5, 4);
    g.moveTo(c.x, c.y).lineTo(e.x, e.y).stroke({ width: 2, color: 0xc8ccd8 });
  }
}
/** A glass wall: see-through panes that join up with their neighbors. */
export function glass(view: HeistView, g: Graphics, level: Level, x: number, y: number): void {
  const t = (dx: number, dy: number) =>
    ['glass', 'wall', 'pillar'].includes(level.tiles[y + dy]?.[x + dx] ?? '');
  const horizontal = t(-1, 0) || t(1, 0);
  const [x0, y0, x1, y1] = horizontal ? [x, y + 0.42, x + 1, y + 0.58] : [x + 0.42, y, x + 0.58, y + 1];
  prism(view, g, x0, y0, x1, y1, WALL_H - 14, 0xbfe9ff, 0x9fd7ff, 0x86c4ef, 0.28);
  const top0 = project(view.proj, horizontal ? x : x + 0.5, horizontal ? y + 0.5 : y, WALL_H - 14);
  const top1 = project(view.proj, horizontal ? x + 1 : x + 0.5, horizontal ? y + 0.5 : y + 1, WALL_H - 14);
  g.moveTo(top0.x, top0.y).lineTo(top1.x, top1.y).stroke({ width: 2, color: 0xe6f6ff, alpha: 0.7 });
}
