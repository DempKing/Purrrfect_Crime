// Furniture and fixtures: display cases, plinths, safes, desks, crates, ladders and the like.
import { Graphics, Matrix } from 'pixi.js';
import { lootPicture } from '../characters';
import { project } from '../iso';
import { lootAt } from '../../core/game';
import { exhibitAt, tileHash } from '../../core/exhibits';
import { flat, type FlatName, STANDING_FLATS } from '../flats';
import { prop, type PropName } from '../props';
import { blocksMove, type Level } from '../../core/level';
import type { HeistView } from '../view';
import { type Drawable, NEIGHBOURS } from './types';
import { corners, diamond, prism, tintColor } from './shapes';
import { COL, LOOT_COLORS, RAFTER_Z } from './style';
import { lootName } from './overlays';
import { sprite } from './characters';

/** A glass display case with its loot (or empty / smashed). */
export function displayCase(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  li: number,
  taken: boolean,
  broken: boolean,
): void {
  prism(view, g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 22, 0x6b5946, COL.caseBase, 0x47392b, 1);
  const pic = li >= 0 ? lootPicture(lootName(view, li)) : undefined;
  if (!taken && pic) {
    const sp = project(view.proj, x + 0.5, y + 0.5, 34 + Math.sin(view.time * 1.6 + x) * 1.5);
    const k = 30 / Math.max(pic.w, pic.h);
    g.setFillStyle({ color: 0xffffff, alpha: 1 });
    g.texture(pic.tex, pic.tint, sp.x - (pic.w * k) / 2, sp.y - (pic.h * k) / 2, pic.w * k, pic.h * k);
  } else if (!taken && li >= 0) {
    const sp = project(view.proj, x + 0.5, y + 0.5, 32);
    const col = LOOT_COLORS[li % LOOT_COLORS.length];
    g.circle(sp.x, sp.y, 10).fill({ color: col, alpha: 0.18 });
    g.poly([sp.x, sp.y - 8, sp.x + 6, sp.y, sp.x, sp.y + 5, sp.x - 6, sp.y])
      .fill({ color: col })
      .stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
  }
  if (broken) {
    // Shards on the floor around the case.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + x;
      const sp = project(view.proj, x + 0.5 + Math.cos(a) * 0.45, y + 0.5 + Math.sin(a) * 0.45, 1);
      g.poly([sp.x, sp.y - 3, sp.x + 3, sp.y, sp.x - 1, sp.y + 2]).fill({
        color: COL.caseGlass,
        alpha: 0.8,
      });
    }
  } else
    prism(
      view,
      g,
      x + 0.16,
      y + 0.16,
      x + 0.84,
      y + 0.84,
      30,
      COL.caseGlass,
      COL.caseGlass,
      COL.caseGlass,
      0.2,
      22,
    );
}
/** The centrepiece plinth, with the prize on it until taken. */
export function plinth(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  hasGem: boolean,
  rivalTook = false,
): void {
  prism(view, g, x + 0.18, y + 0.18, x + 0.82, y + 0.82, 34, 0xf3eee0, COL.plinth, 0xa9a392, 1);
  const sp = project(view.proj, x + 0.5, y + 0.5, 50);
  const pic = hasGem ? lootPicture(lootName(view, lootAt(view.lvl!, x, y))) : undefined;
  if (pic) {
    const k = 40 / Math.max(pic.w, pic.h);
    const y0 = sp.y - (pic.h * k) / 2 - 6 + Math.sin(view.time * 1.4) * 2;
    g.circle(sp.x, y0 + (pic.h * k) / 2, 26).fill({
      color: 0xfff3c4,
      alpha: 0.14 + Math.sin(view.time * 2) * 0.04,
    });
    g.setFillStyle({ color: 0xffffff, alpha: 1 });
    g.texture(pic.tex, pic.tint, sp.x - (pic.w * k) / 2, y0, pic.w * k, pic.h * k);
  } else if (hasGem) {
    const hue = [0x9fe8ff, 0xff9ff3, 0xb6ffb0, 0xffe39f][Math.floor(view.time * 2) % 4];
    g.circle(sp.x, sp.y, 20).fill({ color: hue, alpha: 0.2 });
    g.poly([sp.x, sp.y - 13, sp.x + 9, sp.y, sp.x, sp.y + 9, sp.x - 9, sp.y])
      .fill({ color: hue })
      .stroke({ width: 1.5, color: 0xffffff });
  } else if (rivalTook) {
    // Nothing but dust where the prize was.
    g.ellipse(sp.x, sp.y + 3, 9, 4).fill({ color: 0x8a8578, alpha: 0.6 });
  } else {
    // Leo's calling card on the empty plinth.
    g.roundRect(sp.x - 9, sp.y - 2, 18, 11, 2)
      .fill({ color: 0xf5f5f5 })
      .stroke({ width: 1, color: 0x222222 });
    g.circle(sp.x, sp.y + 3.5, 2.5).fill({ color: 0xd8262f });
  }
}
/** The exhibit under a ceiling light (statue, bust, plant...). False until the sprites load. */
export function exhibitUnderLight(
  view: HeistView,
  items: Drawable[],
  d: number,
  x: number,
  y: number,
  on: boolean,
  gone: boolean,
): boolean {
  const e = exhibitAt(view.districtOf, x, y);
  const tint = on ? 0xfff6e6 : 0x8a8ea8;
  if (gone) {
    // Taken: nothing left but the pedestal (or a dusty patch where the chest stood).
    items.push({
      depth: d,
      draw: (g) => {
        if (e.pedestal || e.flat)
          prism(view, g, x + 0.24, y + 0.24, x + 0.76, y + 0.76, 28, 0xe9e3d3, 0xc9c2b0, 0xa49d8b, 1);
        else diamond(view, g, x, y, 0.3, 0x8a8578, 0.35);
      },
    });
    return true;
  }
  if (e.flat) {
    // Drawn standing up, facing the camera: the aquarium's tanks, a statue.
    const tex = flat(e.flat as FlatName);
    if (!tex) return false;
    const h = STANDING_FLATS[e.flat as FlatName] ?? 60;
    const w = (h * tex.width) / tex.height;
    items.push({
      depth: d,
      draw: (g) => {
        const sp = project(view.proj, x + 0.5, y + 0.5);
        g.ellipse(sp.x, sp.y, w * 0.45, w * 0.2).fill({ color: 0x000000, alpha: 0.3 });
        g.setFillStyle({ color: 0xffffff, alpha: 1 });
        g.texture(tex, tint, sp.x - w / 2, sp.y - h + w * 0.12, w, h);
      },
    });
    return true;
  }
  const model = e.model as PropName;
  if (!prop(model)) return false;
  const turn = Math.floor(tileHash(x, y, 12) * 4) * (Math.PI / 2);
  items.push({
    depth: d,
    draw: (g) => {
      if (e.pedestal)
        prism(view, g, x + 0.24, y + 0.24, x + 0.76, y + 0.76, 28, 0xe9e3d3, 0xc9c2b0, 0xa49d8b, 1);
      sprite(view, g, model, x + 0.5, y + 0.5, e.pedestal ? 28 : 0, turn, 1, tint);
    },
  });
  return true;
}
/** A safe: dial and handle on the door, a green light per crack attempt, and the door swung open once cracked. */
export function safe(
  view: HeistView,
  g: Graphics,
  level: Level,
  x: number,
  y: number,
  open: boolean,
  cracks: number,
  goes: number,
): void {
  const c = Math.cos(view.proj.angle);
  const sn = Math.sin(view.proj.angle);
  // It faces into the room: the side with the most open floor in front of it.
  const run = (d: { x: number; y: number }) => {
    let k = 0;
    while (k < 5 && !blocksMove(level.tiles[y + d.y * (k + 1)]?.[x + d.x * (k + 1)] ?? 'wall')) k++;
    return k;
  };
  const n = NEIGHBOURS.reduce((best, d) => (run(d) > run(best) ? d : best), NEIGHBOURS[1]);
  const H = 46;
  prism(view, g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, H, 0x6b7584, 0x4a5262, 0x363c4a, 1);
  // A dark plinth band at the foot and a lighter lip on the top, so it reads as heavy.
  const foot = corners(view, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0);
  g.poly(foot.flatMap((q) => [q.x, q.y])).fill({ color: 0x000000, alpha: 0.35 });
  const lid = corners(view, x + 0.18, y + 0.18, x + 0.82, y + 0.82, H);
  g.poly(lid.flatMap((q) => [q.x, q.y])).stroke({ width: 1.5, color: 0x3a404c, alpha: 0.8 });
  let tx = -n.y;
  let ty = n.x;
  const fx = x + 0.5 + n.x * 0.385;
  const fy = y + 0.5 + n.y * 0.385;
  if (project(view.proj, fx + tx, fy + ty).x < project(view.proj, fx, fy).x) {
    tx = -tx;
    ty = -ty;
  }
  const faceVisible = c * n.x - sn * n.y + (sn * n.x + c * n.y) > 0.3;
  // Draw in the front face's own coordinates (x across, y down).
  const o = project(view.proj, fx, fy, H / 2);
  const along = project(view.proj, fx + tx, fy + ty, H / 2);
  const m = new Matrix((along.x - o.x) / 58.8, (along.y - o.y) / 58.8, 0, 1, o.x, o.y);
  const W = 20; // half the face's width
  if (faceVisible) {
    g.save();
    g.setTransform(m);
    if (open) {
      // The empty inside: dark, a shelf, a few loose papers left behind.
      g.rect(-W + 3, -H / 2 + 4, W * 2 - 6, H - 8)
        .fill({ color: 0x14161c })
        .stroke({ width: 2, color: 0x1c1233 });
      g.rect(-W + 4, -1, W * 2 - 8, 2).fill({ color: 0x3a404c });
      g.poly([-10, 15, -2, 13, 0, 17, -8, 19]).fill({ color: 0xe8e2d0, alpha: 0.8 });
      g.poly([4, -6, 11, -7, 12, -3, 5, -2]).fill({ color: 0xe8e2d0, alpha: 0.6 });
    } else {
      // The door: an inset steel panel with rivets, hinges on the left, a brass plate at the top.
      g.rect(-W + 3, -H / 2 + 4, W * 2 - 6, H - 8)
        .fill({ color: 0x7c8696 })
        .stroke({ width: 2, color: 0x1c1233 });
      for (const [rx, ry] of [
        [-W + 6, -H / 2 + 7],
        [W - 6, -H / 2 + 7],
        [-W + 6, H / 2 - 7],
        [W - 6, H / 2 - 7],
      ])
        g.circle(rx, ry, 1.3).fill({ color: 0xc9d0dc });
      for (const hy of [-H / 2 + 10, H / 2 - 12]) g.rect(-W + 1, hy, 3, 6).fill({ color: 0x2a2f3a });
      g.rect(-7, -H / 2 + 6, 14, 4)
        .fill({ color: 0xd9b14a })
        .stroke({ width: 1, color: 0x6b4f1e });
      // The dial: ticks round a black face, its knob turning while it's locked.
      g.circle(-4, 0, 8.5).fill({ color: 0xe4e8ef }).stroke({ width: 2, color: 0x1c1233 });
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        g.moveTo(-4 + Math.cos(a) * 6.5, Math.sin(a) * 6.5)
          .lineTo(-4 + Math.cos(a) * 8, Math.sin(a) * 8)
          .stroke({ width: 1, color: 0x1c1233 });
      }
      g.circle(-4, 0, 4).fill({ color: 0x2a2f3a });
      const turn = view.time * 0.7 + cracks;
      g.moveTo(-4, 0)
        .lineTo(-4 + Math.cos(turn) * 3.5, Math.sin(turn) * 3.5)
        .stroke({ width: 1.5, color: 0xe4e8ef });
      // The handle: three spokes round a hub.
      for (let i = 0; i < 3; i++) {
        const a = (i * Math.PI * 2) / 3 + 0.4;
        g.moveTo(11, 4)
          .lineTo(11 + Math.cos(a) * 6, 4 + Math.sin(a) * 6)
          .stroke({ width: 2, color: 0x2a2f3a, cap: 'round' });
      }
      g.circle(11, 4, 2.2).fill({ color: 0xc9d0dc }).stroke({ width: 1, color: 0x1c1233 });
      // A tumbler light for each go it takes: green once cracked, dim until then.
      for (let i = 0; i < goes; i++)
        g.circle(-4 - (goes - 1) * 3 + i * 6, 13, 1.8)
          .fill({ color: i < cracks ? 0x4dff88 : 0x2a3a30 })
          .stroke({ width: 0.8, color: 0x1c1233 });
    }
    g.restore();
    g.beginPath();
  }
  if (open) {
    // Open: the door swung out wide.
    const hinge = { x: fx - tx * 0.34, y: fy - ty * 0.34 };
    const swing = (105 * Math.PI) / 180;
    const dx = tx * Math.cos(swing) + n.x * Math.sin(swing);
    const dy = ty * Math.cos(swing) + n.y * Math.sin(swing);
    const len = 0.66;
    const p0 = project(view.proj, hinge.x, hinge.y, 4);
    const p1 = project(view.proj, hinge.x + dx * len, hinge.y + dy * len, 4);
    const p2 = project(view.proj, hinge.x + dx * len, hinge.y + dy * len, H - 4);
    const p3 = project(view.proj, hinge.x, hinge.y, H - 4);
    g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y])
      .fill({ color: 0x8a94a4 })
      .stroke({ width: 2, color: 0x1c1233 });
    // The door's thickness, and the dial still on its outside.
    const q = project(view.proj, hinge.x + dx * len * 0.55, hinge.y + dy * len * 0.55, H / 2);
    g.circle(q.x, q.y, 5).fill({ color: 0xe4e8ef }).stroke({ width: 1.5, color: 0x1c1233 });
    g.circle(q.x, q.y, 2).fill({ color: 0x2a2f3a });
  }
}
/** A kennel with a sleeping guard dog's nose poking out. */
export function kennel(view: HeistView, g: Graphics, x: number, y: number): void {
  prism(view, g, x + 0.15, y + 0.15, x + 0.85, y + 0.85, 26, 0x9c4a2a, 0x7a3a20, 0x5e2c18, 1);
  const roof = project(view.proj, x + 0.5, y + 0.5, 40);
  const l = project(view.proj, x + 0.12, y + 0.5, 26);
  const r = project(view.proj, x + 0.88, y + 0.5, 26);
  g.poly([l.x, l.y, roof.x, roof.y, r.x, r.y])
    .fill({ color: 0x5a2a1a })
    .stroke({ width: 1, color: 0x1a1d2c });
  const nose = project(view.proj, x + 0.5, y + 0.9, 6);
  g.circle(nose.x, nose.y, 3.5).fill({ color: 0xc8a06a });
  g.circle(nose.x, nose.y - 1, 1.5).fill({ color: 0x1b1b22 });
  const z = project(view.proj, x + 0.7, y + 0.3, 48 + Math.sin(view.time * 2 + x) * 3);
  g.moveTo(z.x - 3, z.y - 3)
    .lineTo(z.x + 3, z.y - 3)
    .lineTo(z.x - 3, z.y + 3)
    .lineTo(z.x + 3, z.y + 3)
    .stroke({ width: 1.5, color: 0xe6e6f0, alpha: 0.8 });
}
/** A desk, with the combination somewhere in it (papers on top until Leo finds it). */
export function desk(view: HeistView, g: Graphics, x: number, y: number, found: boolean): void {
  const model: PropName =
    view.district === 'downtown' || view.district === 'harbour' ? 'metal_office_desk' : 'ClassicConsole_01';
  const drawn = sprite(view, g, model, x + 0.5, y + 0.5, 0, 0, 1, tintColor(view, x, y));
  if (!drawn) prism(view, g, x + 0.08, y + 0.2, x + 0.92, y + 0.8, 24, 0x7a5634, 0x5e4228, 0x4a341f, 1);
  const c = project(view.proj, x + 0.5, y + 0.5, drawn ? (prop(model)?.height ?? 24) + 1 : 25);
  if (!found)
    g.poly([c.x - 8, c.y, c.x, c.y - 4, c.x + 8, c.y, c.x, c.y + 4])
      .fill({ color: 0xf7f4ec })
      .stroke({ width: 1, color: 0x8a8578 });
  g.circle(c.x + 10, c.y - 2, 3).fill({ color: 0xf2c46b, alpha: 0.9 });
}
/** A wooden crate with its lid off. With Leo inside, two eyes peek over the edge. */
export function crate(view: HeistView, g: Graphics, x: number, y: number, leoInside: boolean): void {
  const drawn = sprite(
    view,
    g,
    'wooden_crate_01',
    x + 0.5,
    y + 0.5,
    0,
    Math.floor(tileHash(x, y) * 4) * (Math.PI / 2),
    1,
    tintColor(view, x, y),
  );
  if (!drawn) {
    prism(view, g, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 30, 0x3a2a18, 0xa07a48, 0x86643a, 1);
    for (const t of [0.35, 0.65]) {
      const a = project(view.proj, x + 0.1, y + t, 30);
      const b = project(view.proj, x + 0.9, y + t, 30);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x5e4428, alpha: 0.8 });
    }
  }
  if (leoInside) {
    const c = project(view.proj, x + 0.5, y + 0.5, drawn ? (prop('wooden_crate_01')?.height ?? 30) + 2 : 32);
    const blink = Math.sin(view.time * 2) > 0.95;
    for (const dx of [-4, 4]) g.ellipse(c.x + dx, c.y, 2.5, blink ? 0.5 : 2.5).fill({ color: 0xe9d36b });
    g.poly([c.x - 9, c.y - 2, c.x - 6, c.y - 9, c.x - 3, c.y - 3]).fill({ color: 0x1b1b22 });
    g.poly([c.x + 9, c.y - 2, c.x + 6, c.y - 9, c.x + 3, c.y - 3]).fill({ color: 0x1b1b22 });
  }
}
/** Crates stacked high, each a little askew. */
export function crateStack(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  h: number,
  alpha: number,
): void {
  const a = prop('wooden_crate_02');
  const b = prop('wooden_military_crate');
  if (a && b) {
    let z = 0;
    for (let i = 0; z < h - 6; i++) {
      const name: PropName = tileHash(x, y, i) < 0.5 ? 'wooden_crate_02' : 'wooden_military_crate';
      sprite(
        view,
        g,
        name,
        x + 0.5,
        y + 0.5,
        z,
        Math.floor(tileHash(x, y, i + 3) * 4) * (Math.PI / 2),
        alpha,
        tintColor(view, x, y),
      );
      z += Math.max(10, (name === 'wooden_crate_02' ? a : b).height);
    }
    return;
  }
  const n = Math.max(1, Math.round(h / 22));
  for (let i = 0; i < n; i++) {
    const o = ((x * 3 + y * 5 + i * 7) % 3) * 0.03;
    prism(
      view,
      g,
      x + 0.06 + o,
      y + 0.06 + o,
      x + 0.94 - o,
      y + 0.94 - o,
      h / n - 1,
      0xb88a52,
      0xa07a48,
      0x86643a,
      alpha,
      (i * h) / n,
    );
  }
}
/** A conveyor belt: dark rubber with chevrons creeping along it. */
export function belt(view: HeistView, g: Graphics, x: number, y: number, dir: number): void {
  diamond(view, g, x, y, 0.42, 0x2a2c34, 1);
  const shift = ((view.time * 0.6) % 1) * dir;
  for (const i of [-0.25, 0.25]) {
    const cx = x + 0.5 + i + shift * 0.25;
    const a = project(view.proj, cx - 0.08 * dir, y + 0.3);
    const m = project(view.proj, cx + 0.08 * dir, y + 0.5);
    const b = project(view.proj, cx - 0.08 * dir, y + 0.7);
    g.moveTo(a.x, a.y).lineTo(m.x, m.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0xf2c46b, alpha: 0.8 });
  }
}
/** A puddle of wet paint, in a different colour on every tile. */
export function paint(view: HeistView, g: Graphics, x: number, y: number): void {
  const col = [0xe0314b, 0x3fbf7f, 0x5ec8ff, 0xf2c46b][(x * 7 + y * 3) % 4];
  const c = project(view.proj, x + 0.5, y + 0.5);
  g.ellipse(c.x, c.y, 22, 10).fill({ color: col, alpha: 0.85 });
  g.ellipse(c.x - 8, c.y + 2, 6, 3).fill({ color: 0xffffff, alpha: 0.25 });
}
/** A ladder up to the rafters. */
export function ladder(view: HeistView, g: Graphics, x: number, y: number): void {
  for (const side of [0.3, 0.7]) {
    const a = project(view.proj, x + side, y + 0.5, 0);
    const b = project(view.proj, x + side, y + 0.5, RAFTER_Z);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: 0x8a6a45 });
  }
  for (let z = 10; z < RAFTER_Z; z += 14) {
    const a = project(view.proj, x + 0.3, y + 0.5, z);
    const b = project(view.proj, x + 0.7, y + 0.5, z);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0xa88458 });
  }
}
/** A rafter beam overhead. */
export function drawBeam(view: HeistView, g: Graphics, x: number, y: number, alpha: number): void {
  prism(view, g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 6, 0x8a6a45, 0x6b4a2a, 0x553a20, alpha, RAFTER_Z - 8);
}
