// Leo, the guards, the rival and NightClaw.
import { Graphics, Matrix } from 'pixi.js';
import { charFrame, type CharFrameName, type CharName } from '../characters';
import { project, screenDir } from '../iso';
import { DIRS, type Guard, type RivalId, RIVALS } from '../../core/game';
import { frameFor, prop, type PropName } from '../props';
import type { HeistView } from '../view';
import { type Actor } from './types';
import { COL } from './style';
import { mark } from './overlays';

/**
 * Draws a character from its 3 frames, animated by gait: standing, walk, run, sneak, crawl, pounce, climb,
 * and fidgeting while Leo works a lock. Returns where its head is (null until the art loads).
 */
export function figure(
  view: HeistView,
  g: Graphics,
  name: CharName,
  a: Actor,
  o: {
    lift?: number;
    alpha?: number;
    tint?: number;
    crawl?: boolean;
    hide?: number;
    asleep?: boolean;
    off?: boolean;
    scale?: number;
    flashlight?: boolean;
  } = {},
): { x: number; top: number } | null {
  const still = charFrame(name, 'idle');
  if (!still) return null;
  const s = project(view.proj, a.x, a.y, o.lift ?? 0);
  const f = faceSprite(view, a);
  if (Math.abs(f.x) > 0.05) a.flip = f.x > 0;
  const t = view.time;
  const gait = a.gait ?? (o.crawl ? 'crawl' : undefined);
  const cycle = (a.phase ?? 0) * 2;
  const half = cycle % 1;
  const hop = Math.abs(Math.sin(half * Math.PI));
  // Standing: the front view only when facing more or less toward the camera; otherwise side on, turned
  // the way they face, so nobody seems to look one way while watching the other.
  let frame: CharFrameName = a.gait ? (Math.floor(cycle) % 2 ? 'b' : 'a') : f.y > 0.3 ? 'idle' : 'b';
  let sx = 1;
  let sy = 1;
  let lean = 0;
  let dx = 0;
  let dy = 0;
  let alpha = o.alpha ?? 1;
  switch (gait) {
    case undefined: {
      const breath = Math.sin(t * 2.2 + a.x * 1.7 + a.y);
      sy = 1 + breath * 0.012;
      sx = 1 - breath * 0.008;
      break;
    }
    case 'walk':
      dy = -hop * 3;
      lean = 0.04;
      break;
    case 'run':
      dy = -hop * 7;
      lean = 0.14;
      sx = 1.05;
      sy = 0.96;
      break;
    case 'sneak':
      dy = -hop * 1.5;
      lean = 0.1;
      sx = 1.07;
      sy = 0.82;
      break;
    case 'crawl':
      if (!a.gait) frame = 'b';
      lean = 0.05 + (a.gait ? Math.sin(cycle * Math.PI) * 0.04 : 0);
      sx = 1.18;
      sy = 0.5;
      break;
    case 'leap': {
      const k = a.leapT ?? 0.5;
      frame = 'a';
      lean = 0.45 * (1 - 2 * k);
      sx = 1.08;
      sy = 0.94;
      break;
    }
    case 'climb':
      frame = Math.floor(t * 7) % 2 ? 'a' : 'b';
      lean = Math.sin(t * 7 * Math.PI) * 0.07;
      sx = 0.94;
      break;
  }
  if (a.work && a.work > 0 && !a.gait) {
    frame = Math.floor(t * 11) % 2 ? 'a' : 'b';
    dx = Math.sin(t * 38) * 1.5 * a.work;
    lean += 0.16 * a.work;
    sy *= 1 - 0.07 * a.work;
  }
  if (o.asleep) {
    frame = 'idle';
    lean = -0.14;
    sy = 0.93 + Math.sin(t * 1.4) * 0.015;
  }
  if (o.off) {
    frame = 'idle';
    lean = -0.2;
    sy = 0.95;
  }
  if (o.hide) {
    sy *= 1 - o.hide * 0.85;
    alpha *= 1 - o.hide * 0.5;
  }
  const fr = charFrame(name, frame) ?? still;
  const scale = o.scale ?? 1;
  const dir = a.flip ? 1 : -1; // which way they face on screen
  const by = s.y - a.bob + dy;
  // Shadow underneath, smaller the higher the character is.
  if (o.crawl) g.ellipse(s.x, s.y - 4, 26, 13).stroke({ width: 2, color: COL.duct, alpha: 0.9 });
  else
    g.ellipse(s.x, s.y, 18 * scale * (gait === 'crawl' ? 1.3 : 1), 8 * scale).fill({
      color: 0x000000,
      alpha: 0.35 * (1 - Math.min(0.7, a.bob / 50)),
    });
  // The drawings face left: mirror them to face right, and lean into the way they're going.
  if (o.flashlight) {
    // The flashlight's beam on the floor, out the way the guard is looking.
    const d = DIRS[a.facing];
    const len = Math.hypot(d.x, d.y);
    const ux = d.x / len;
    const uy = d.y / len;
    const at = (along: number, side: number) =>
      project(view.proj, a.x + ux * along - uy * side, a.y + uy * along + ux * side);
    const p0 = at(0.25, -0.08);
    const p1 = at(0.25, 0.08);
    const p2 = at(2.1, 0.75);
    const p3 = at(2.1, -0.75);
    g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill({ color: 0xfff1b8, alpha: 0.13 });
    const c = at(1.6, 0);
    g.ellipse(c.x, c.y, 26, 13).fill({ color: 0xfff1b8, alpha: 0.07 });
  }
  const m = new Matrix()
    .scale(-dir * sx * scale, sy * scale)
    .rotate(lean * dir)
    .translate(s.x + dx, by);
  g.save();
  g.setTransform(m);
  g.setFillStyle({ color: 0xffffff, alpha });
  g.texture(fr.tex, o.tint ?? 0xffffff, -fr.ax, -fr.ay, fr.w, fr.h);
  g.restore();
  g.beginPath();
  g.setFillStyle({ color: 0xffffff, alpha: 1 });
  if (gait === 'run' && hop < 0.3) {
    // Dust kicked up behind.
    for (const i of [0, 1])
      g.circle(s.x - dir * (14 + i * 8), s.y - 3 - i * 2, 3.5 - i).fill({ color: 0xc8c0b0, alpha: 0.35 });
  }
  return { x: s.x + dx, top: by - fr.h * sy * scale };
}
/** Characters are a little darker in the dark, so you can see who's in shadow. */
export function actorTint(view: HeistView, a: Actor, leo = false): number {
  const l = view.light[Math.floor(a.y)]?.[Math.floor(a.x)] ?? 1;
  return l === 0 ? (leo ? 0x8c93b8 : 0x8a90aa) : l === 1 ? 0xeeeef4 : 0xffffff;
}
/** Draws a baked 3D sprite at x,y (z px up, turned `turn` radians). False until the sprites load. */
export function sprite(
  view: HeistView,
  g: Graphics,
  name: PropName,
  x: number,
  y: number,
  z: number,
  turn: number,
  alpha = 1,
  tint = 0xffffff,
): boolean {
  const pr = prop(name);
  if (!pr) return false;
  const sp = project(view.proj, x, y, z);
  g.setFillStyle({ color: 0xffffff, alpha });
  g.texture(pr.frames[frameFor(turn, view.proj.angle)], tint, sp.x - pr.ax, sp.y - pr.ay, pr.w, pr.h);
  g.setFillStyle({ color: 0xffffff, alpha: 1 });
  return true;
}
/** A Robo-Guard (visor goes dark when powered down). */
export function drawRobo(
  view: HeistView,
  g: Graphics,
  a: Actor,
  guard: Guard,
  off: boolean,
  grinning: boolean,
): void {
  const r = figure(view, g, 'robot', a, { off, tint: off ? 0x7a7e8c : actorTint(view, a) });
  if (!r) return;
  if (off) {
    const z = project(view.proj, a.x + 0.3, a.y - 0.3, 80);
    g.moveTo(z.x - 5, z.y)
      .lineTo(z.x + 5, z.y)
      .stroke({ width: 2, color: 0x9aa3b5 });
  } else mark(view, g, r.x, r.top, guard.mode === 'searching' || grinning ? '!' : '', 0xff3b30, 0xffd23f);
}
/** Floating Zs over a sleeping character. */
export function zzz(view: HeistView, g: Graphics, a: Actor, top?: number): void {
  const s = project(view.proj, a.x, a.y);
  for (let i = 0; i < 3; i++) {
    const t = (view.time * 0.8 + i / 3) % 1;
    const x = s.x + 10 + t * 14;
    const y = (top ?? s.y - 50) - 14 - t * 26;
    const z = 4 + i;
    g.moveTo(x - z, y - z)
      .lineTo(x + z, y - z)
      .lineTo(x - z, y + z)
      .lineTo(x + z, y + z)
      .stroke({ width: 2, color: 0xd8e4ff, alpha: 1 - t });
  }
}
/** Where a character's face is on screen. */
export function faceSprite(view: HeistView, a: Actor): { x: number; y: number } {
  const d = DIRS[a.facing];
  return screenDir(view.proj, d.x, d.y);
}
/** Leo Tuxedo, from his drawings. */
export function drawLeo(view: HeistView, g: Graphics, a: Actor, inVent: boolean, lift = 0): void {
  figure(view, g, 'leo', a, {
    lift,
    alpha: inVent ? 0.55 : 1,
    crawl: inVent,
    tint: actorTint(view, a, true),
    hide: view.leoHide,
  });
}
/** A rival thief, with a name tag and the prize if they have it. */
export function drawRival(view: HeistView, g: Graphics, a: Actor, id: RivalId, prize: boolean): void {
  const r = figure(view, g, id === 'paws' ? 'prof' : id, a, { tint: actorTint(view, a), scale: 0.97 });
  if (!r) return;
  if (prize)
    g.circle(r.x, r.top - 10, 7)
      .fill({ color: 0x3a2a4a })
      .stroke({ width: 2, color: COL.rival });
  const name = RIVALS[id].name;
  g.roundRect(r.x - name.length * 2.6, r.top - (prize ? 30 : 16), name.length * 5.2, 12, 4).fill({
    color: COL.rival,
    alpha: 0.85,
  });
}
/** NightClaw. */
export function drawNightClaw(view: HeistView, g: Graphics, a: Actor, guard: Guard, grinning: boolean): void {
  const r = figure(view, g, 'nightclaw', a, { tint: actorTint(view, a) });
  if (!r) return;
  mark(
    view,
    g,
    r.x,
    r.top,
    grinning || guard.mode === 'searching' ? '!' : guard.mode === 'suspicious' ? '?' : '',
    0xb05cff,
    0xd9b8ff,
  );
}
/** A guard. Shows ? when suspicious and ! when searching. */
export function drawGuard(view: HeistView, g: Graphics, a: Actor, guard: Guard, grinning: boolean): void {
  const sniffer = guard.kind === 'sniffer';
  const r = figure(view, g, sniffer ? 'dog' : 'guard', a, {
    asleep: guard.asleep,
    tint: actorTint(view, a),
    scale: guard.kind === 'captain' ? 1.12 : 1,
    flashlight: false,
  });
  if (!r) return;
  if (guard.kind === 'captain') {
    // The captain's gold star, worn on the cap.
    const y = r.top + 6;
    g.star(r.x, y, 5, 4.5, 2).fill({ color: 0xf2c46b }).stroke({ width: 1, color: 0x6b4b12 });
  }
  if (sniffer && !guard.asleep) {
    // Sniffing the air in front of its nose.
    const dir = a.flip ? 1 : -1;
    const nx = r.x + dir * 24;
    const ny = r.top + 14;
    const t = (view.time * 1.5) % 1;
    for (const side of [-1, 1])
      g.moveTo(nx + dir * t * 10, ny + side * (4 + t * 6))
        .quadraticCurveTo(nx + dir * (6 + t * 10), ny, nx + dir * t * 10, ny - side * (4 + t * 6))
        .stroke({ width: 1.5, color: 0xd8e4ff, alpha: 1 - t });
  }
  if (guard.asleep) return zzz(view, g, a, r.top);
  mark(
    view,
    g,
    r.x,
    r.top,
    grinning || guard.mode === 'searching' ? '!' : guard.mode === 'suspicious' ? '?' : '',
    0xff3b30,
    0xffd23f,
  );
}
