// Lights and electrics: ceiling lights, lamps, lasers, exit signs, cameras, beacons, switches.
import { Graphics } from 'pixi.js';
import { project, screenDir } from '../iso';
import { laserAxis, type Level, type Point } from '../../core/level';
import { beaconFacing, DIRS, type State } from '../../core/game';
import { HeistView } from '../view';
import { COL, WALL_H } from './style';
import { sprite } from './characters';

/** A light hanging from the ceiling: a pendant over a lamp's tile, or a small spot over a case or plinth. */
export function ceilingLight(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  on: boolean,
  pendant: boolean,
): void {
  const z = pendant ? 150 : 165;
  const shade = project(view.proj, x + 0.5, y + 0.5, z);
  const cord = project(view.proj, x + 0.5, y + 0.5, z + 70);
  g.moveTo(cord.x, cord.y)
    .lineTo(shade.x, shade.y - 6)
    .stroke({ width: 1.5, color: 0x1a1a22, alpha: 0.8 });
  if (on) {
    // The beam: a soft cone down to the floor, or onto the case.
    const foot = project(view.proj, x + 0.5, y + 0.5, pendant ? 0 : 34);
    const r = pendant ? 42 : 22;
    g.poly([shade.x - 5, shade.y + 3, shade.x + 5, shade.y + 3, foot.x + r, foot.y, foot.x - r, foot.y]).fill(
      { color: 0xffe9b8, alpha: pendant ? 0.07 : 0.06 },
    );
    g.ellipse(foot.x, foot.y, r, r / 2).fill({ color: 0xffe9b8, alpha: pendant ? 0.08 : 0.1 });
  }
  if (pendant) {
    g.poly([
      shade.x - 4,
      shade.y - 7,
      shade.x + 4,
      shade.y - 7,
      shade.x + 12,
      shade.y + 3,
      shade.x - 12,
      shade.y + 3,
    ])
      .fill({ color: 0x2a2a30 })
      .stroke({ width: 1, color: 0xc9a24a, alpha: 0.8 });
    g.ellipse(shade.x, shade.y + 3, 10, 3).fill({ color: on ? 0xfff1c0 : 0x4a4a50 });
    if (on)
      g.circle(shade.x, shade.y + 4, 16).fill({
        color: COL.lampGlow,
        alpha: 0.14 + Math.sin(view.time * 3 + x) * 0.02,
      });
  } else {
    g.roundRect(shade.x - 4, shade.y - 6, 8, 9, 2)
      .fill({ color: 0x1c1c22 })
      .stroke({ width: 1, color: 0x55555e });
    g.ellipse(shade.x, shade.y + 3, 3.5, 1.5).fill({ color: 0xfff1c0 });
  }
}
export function drawLamp(view: HeistView, g: Graphics, x: number, y: number, on = true): void {
  const base = project(view.proj, x + 0.5, y + 0.5);
  const top = project(view.proj, x + 0.5, y + 0.5, 64);
  g.ellipse(base.x, base.y, 10, 5).fill({ color: 0x2a2116 });
  g.moveTo(base.x, base.y).lineTo(top.x, top.y).stroke({ width: 4, color: 0x3a2f20 });
  g.poly([top.x - 14, top.y + 6, top.x + 14, top.y + 6, top.x + 8, top.y - 12, top.x - 8, top.y - 12])
    .fill({ color: on ? 0xf2d29b : 0x6a6250 })
    .stroke({ width: 2, color: 0x6b5634 });
  if (on)
    g.circle(top.x, top.y + 4, 28 + Math.sin(view.time * 3 + x) * 1.5).fill({
      color: COL.lampGlow,
      alpha: 0.12,
    });
}
/** A laser: two beams across the gap, wall to wall (see laserAxis), dotted when they're switched off. */
export function laser(view: HeistView, g: Graphics, level: Level, x: number, y: number, on: boolean): void {
  const across = laserAxis(level, x, y) === 'x';
  for (const z of [14, 30]) {
    const a = across ? project(view.proj, x, y + 0.5, z) : project(view.proj, x + 0.5, y, z);
    const b = across ? project(view.proj, x + 1, y + 0.5, z) : project(view.proj, x + 0.5, y + 1, z);
    if (on) {
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 5, color: COL.laser, alpha: 0.25 });
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.8, color: 0xff8080, alpha: 0.95 });
    } else
      for (let i = 0; i < 4; i++) {
        const t0 = i / 4;
        const t1 = t0 + 0.12;
        g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0)
          .lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1)
          .stroke({ width: 1, color: 0x884444, alpha: 0.5 });
      }
  }
}
export function exitSign(view: HeistView, g: Graphics, x: number, y: number): void {
  const sp = project(view.proj, x + 0.5, y + 0.5, 70);
  g.roundRect(sp.x - 22, sp.y - 10, 44, 20, 4)
    .fill({ color: 0x1f6b49 })
    .stroke({ width: 2, color: 0x9ff0c8 });
  g.moveTo(sp.x - 10, sp.y)
    .lineTo(sp.x + 8, sp.y)
    .moveTo(sp.x + 2, sp.y - 6)
    .lineTo(sp.x + 9, sp.y)
    .lineTo(sp.x + 2, sp.y + 6)
    .stroke({ width: 3, color: 0xffffff });
}
export function camera(view: HeistView, g: Graphics, at: Point, facing: number, off: boolean): void {
  const d = screenDir(view.proj, DIRS[facing].x, DIRS[facing].y);
  const sp = project(view.proj, at.x + 0.5, at.y + 0.5, 74);
  if (
    sprite(
      view,
      g,
      'security_camera_01',
      at.x + 0.5,
      at.y + 0.5,
      62,
      Math.atan2(DIRS[facing].y, DIRS[facing].x) - Math.PI / 2,
      1,
      off ? 0x6a6e7a : 0xffffff,
    )
  ) {
    if (!off && Math.sin(view.time * 5) > 0) g.circle(sp.x, sp.y - 2, 2.5).fill({ color: 0xff3b30 });
    return;
  }
  g.roundRect(sp.x - 9, sp.y - 6, 18, 12, 3)
    .fill({ color: 0x2b2f3d })
    .stroke({ width: 1.5, color: 0x0d0f16 });
  g.moveTo(sp.x, sp.y)
    .lineTo(sp.x + d.x * 14, sp.y + d.y * 14)
    .stroke({ width: 7, color: 0x3b4052 });
  g.circle(sp.x + d.x * 15, sp.y + d.y * 15, 3.5).fill({ color: off ? 0x444444 : 0x9fd7ff });
  if (!off && Math.sin(view.time * 5) > 0) g.circle(sp.x - 5, sp.y - 2, 2).fill({ color: 0xff3b30 });
}
/** A light switch on the wall: lever up (on) or down (off). */
export function lightSwitch(
  view: HeistView,
  g: Graphics,
  x: number,
  y: number,
  h: number,
  off: boolean,
): void {
  const sp = project(view.proj, x + 0.5, y + 0.5, h + 10);
  g.roundRect(sp.x - 7, sp.y - 10, 14, 20, 3)
    .fill({ color: 0xf2eee2 })
    .stroke({ width: 1.5, color: 0x6b5634 });
  g.roundRect(sp.x - 2, off ? sp.y : sp.y - 7, 4, 7, 1).fill({ color: off ? 0x555a66 : 0xf2c46b });
}
/** The lighthouse: a lantern on its tower and the wedge of its beam across the ground. */
export function beacon(view: HeistView, level: Level, s: State): void {
  const b = level.def.beacon!;
  const f = beaconFacing(level, s);
  const c = project(view.proj, b.at.x + 0.5, b.at.y + 0.5, 10);
  const pts = [c.x, c.y];
  for (const a of [-22.5, -11, 0, 11, 22.5]) {
    const ang = Math.atan2(DIRS[f].y, DIRS[f].x) + (a * Math.PI) / 180;
    const e = project(
      view.proj,
      b.at.x + 0.5 + Math.cos(ang) * (b.range + 0.5),
      b.at.y + 0.5 + Math.sin(ang) * (b.range + 0.5),
      10,
    );
    pts.push(e.x, e.y);
  }
  view.fx.poly(pts).fill({ color: 0xfff3c0, alpha: 0.08 });
  const top = project(view.proj, b.at.x + 0.5, b.at.y + 0.5, WALL_H + 20);
  view.fx.circle(top.x, top.y, 16 + Math.sin(view.time * 4) * 2).fill({ color: 0xfff3c0, alpha: 0.35 });
  view.fx.circle(top.x, top.y, 7).fill({ color: 0xfffbe6 });
}
