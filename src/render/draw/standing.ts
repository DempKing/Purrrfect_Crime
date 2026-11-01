// Drawing stage 2: everything standing up (walls, furniture, loot, cameras, characters), as a list of
// Drawables that view.ts sorts by depth so nearer things cover farther ones.
import type { Level, Tile } from '../../core/level';
import {
  camerasActive,
  hiddenAt,
  key,
  lasersActive,
  lootAt,
  lootGone,
  roboOff,
  type State,
  tileNow,
} from '../../core/game';
import { tileHash } from '../../core/exhibits';
import { project } from '../iso';
import { surface } from '../surfaces';
import { prop } from '../props';
import { lootPicture } from '../characters';
import type { HeistView } from '../view';
import type { Actor, Drawable, Frame } from './types';
import { COL, LOOT_COLORS, RAFTER_Z, STUB_H, WALL_H } from './style';
import { nearOuterWall, prism, tintColor } from './shapes';
import { controlBox, door, keydoor, vault, wallDecor, wire, glass } from './walls';
import {
  crate,
  crateStack,
  desk,
  displayCase,
  drawBeam,
  exhibitUnderLight,
  kennel,
  ladder,
  plinth,
  safe,
} from './furniture';
import { camera, drawLamp, exitSign, laser, lightSwitch } from './lights';
import { drawGuard, drawLeo, drawNightClaw, drawRival, drawRobo, sprite, zzz } from './characters';

const WALLISH: Tile[] = ['wall', 'pillar', 'stack', 'door', 'keydoor', 'vault', 'panel', 'fuse', 'switch'];

/** Walls, pillars, doors and control boxes. Walls near Leo (or the rival) drop to stubs so you can see past. */
function wallItem(
  view: HeistView,
  fr: Frame,
  level: Level,
  s: State,
  x: number,
  y: number,
  t: Tile,
  d: number,
  leo: Actor,
  rival: Actor | undefined,
  rivalIn: boolean,
  items: Drawable[],
): void {
  const k = key(x, y);
  const box = t === 'panel' || t === 'fuse'; // control boxes always stay full height
  const rivalDepth = rival ? project(fr.p, rival.x, rival.y).depth : 0;
  const near =
    !box &&
    (fr.inVent ||
      fr.inRafters ||
      (Math.hypot(x + 0.5 - leo.x, y + 0.5 - leo.y) < 3.6 && d > fr.leoDepth + 0.2) ||
      (rivalIn && Math.hypot(x + 0.5 - rival!.x, y + 0.5 - rival!.y) < 2.6 && d > rivalDepth + 0.2) ||
      nearOuterWall(view, level, x, y));
  const h = near ? STUB_H : t === 'pillar' ? WALL_H - 6 : WALL_H;
  const a = near ? 0.75 : 1;
  const add = (draw: Drawable['draw']) => items.push({ depth: d, draw });

  if (t === 'wall' && !near) wallDecor(view, level, s, x, y, d, items);

  if (t === 'stack') add((g) => crateStack(view, g, x, y, near ? STUB_H : WALL_H - 20, a));
  else if (t === 'pillar' && level.def.id === 'l2-clocktower' && prop('vintage_grandfather_clock_01')) {
    // Clocktower: the pillars are grandfather clocks, each turned its own way.
    const turn = Math.floor(tileHash(x, y, 5) * 4) * (Math.PI / 2);
    add(
      (g) =>
        void sprite(
          view,
          g,
          'vintage_grandfather_clock_01',
          x + 0.5,
          y + 0.5,
          0,
          turn,
          near ? 0.35 : 1,
          tintColor(view, x, y),
        ),
    );
  } else if (t === 'pillar')
    add((g) => prism(view, g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, h, 0xe6e0d0, COL.pillar, 0x948f82, a));
  else if (t === 'door') add((g) => door(view, g, x, y, near ? STUB_H : WALL_H - 10, a, s.picks[k] ?? 0));
  else if (t === 'keydoor')
    add((g) => keydoor(view, g, x, y, near ? STUB_H : WALL_H - 10, a, s.card === 'leo' || s.perks.masterKey));
  else if (t === 'vault')
    add((g) => vault(view, g, x, y, near ? STUB_H : WALL_H - 4, a, s.picks[k] ?? 0, s.combination));
  else
    add((g) => {
      // A plain wall block (also under light switches and control boxes).
      const top = t === 'switch' ? 0xe6e0d0 : surface(view.look.wall.tex) ? view.look.wall.top : COL.wallTop;
      prism(view, g, x, y, x + 1, y + 1, h, top, COL.wallA, COL.wallB, a, 0, view.look.wall);
      if (box) controlBox(view, g, level, s, x, y, t, t === 'panel' ? s.camerasOff : s.lasersOff);
      if (t === 'switch') {
        const off = (level.def.switches ?? []).some(
          (w) => w.at.x === x && w.at.y === y && w.lamps.some((i) => s.lampsOff.includes(i)),
        );
        lightSwitch(view, g, x, y, h, off);
      }
    });
}

/** Everything else on a tile: cases, plinths, lamps, lasers, safes, crates and so on. */
function fixtureItem(
  view: HeistView,
  fr: Frame,
  level: Level,
  s: State,
  x: number,
  y: number,
  t: Tile,
  d: number,
  lasersOn: boolean,
  items: Drawable[],
): void {
  const k = key(x, y);
  const li = lootAt(level, x, y);
  const add = (draw: Drawable['draw'], depth = d) => items.push({ depth, draw });

  if (t === 'case' || t === 'plinth') fr.ceiling.push({ x, y, on: true, lamp: false });

  if (t === 'case') {
    const taken = li >= 0 && lootGone(s, li);
    const broken = s.smashed.includes(k);
    add((g) => displayCase(view, g, x, y, li, taken, broken));
  } else if (t === 'plinth') {
    add((g) => plinth(view, g, x, y, li >= 0 && !lootGone(s, li), s.rivalLoot.includes(li)));
  } else if (t === 'lamp') {
    // A lamp: an exhibit under its light if it has one, otherwise a floor lamp.
    const off = s.lampsOff.includes(level.lamps.findIndex((l) => l.at.x === x && l.at.y === y));
    const gone = li >= 0 && lootGone(s, li);
    if (!exhibitUnderLight(view, items, d, x, y, !off, gone)) add((g) => drawLamp(view, g, x, y, !off));
    fr.ceiling.push({ x, y, on: !off, lamp: true });
  } else if (t === 'laser') add((g) => laser(view, g, level, x, y, lasersOn), d + 0.3);
  else if (t === 'exit') add((g) => exitSign(view, g, x, y), d - 0.4);
  else if (t === 'safe') {
    const open = s.smashed.includes(k) || (li >= 0 && lootGone(s, li));
    add((g) => safe(view, g, level, x, y, open, s.picks[k] ?? 0, s.perks.safeCracks));
  } else if (t === 'seat')
    add((g) => prism(view, g, x + 0.08, y + 0.2, x + 0.92, y + 0.8, 20, 0x9c2a3a, 0x7a1f2c, 0x5e1722, 1));
  else if (t === 'ladder') add((g) => ladder(view, g, x, y), d + 0.2);
  else if (t === 'wire') add((g) => wire(view, g, level, x, y));
  else if (t === 'glass') add((g) => glass(view, g, level, x, y));
  else if (t === 'kennel') add((g) => kennel(view, g, x, y));
  else if (t === 'crate') {
    const inside = hiddenAt(level, s, { x, y }) && s.leo.x === x && s.leo.y === y;
    add((g) => crate(view, g, x, y, inside));
  } else if (t === 'desk') add((g) => desk(view, g, x, y, s.combination));

  // Rafters: beams overhead, faint unless Leo is up there.
  if (level.rafters[y][x]) add((g) => drawBeam(view, g, x, y, fr.inRafters ? 0.95 : 0.35), d + 0.6);
}

/** Walls and fixtures for every tile of the map. */
export function standingItems(
  view: HeistView,
  fr: Frame,
  level: Level,
  s: State,
  leo: Actor,
  rival?: Actor,
): Drawable[] {
  const items: Drawable[] = [];
  const rivalIn = !!rival && !!s.rival && (s.rival.phase === 'in' || s.rival.phase === 'leaving');
  const lasersOn = lasersActive(level, s);
  for (let y = 0; y < level.h; y++)
    for (let x = 0; x < level.w; x++) {
      const t = tileNow(level, s, x, y);
      const d = project(fr.p, x + 0.5, y + 0.5).depth;
      if (WALLISH.includes(t)) wallItem(view, fr, level, s, x, y, t, d, leo, rival, rivalIn, items);
      fixtureItem(view, fr, level, s, x, y, t, d, lasersOn, items);
    }
  return items;
}

/** Loot Leo has put down, lying where he left it with a soft glint. */
export function droppedLoot(view: HeistView, fr: Frame, level: Level, s: State): Drawable[] {
  return s.dropped.map((dr, i) => {
    const pic = lootPicture(level.def.loot[dr.li].name);
    return {
      depth: project(fr.p, dr.x + 0.5, dr.y + 0.5).depth - 0.1,
      draw: (g) => {
        const off = (i % 3) * 0.12 - 0.12; // several on one tile spread out a little
        const c = project(fr.p, dr.x + 0.5 + off, dr.y + 0.5 - off, 0);
        g.ellipse(c.x, c.y, 14, 6).fill({
          color: 0xfff3c4,
          alpha: 0.18 + Math.sin(view.time * 3 + i) * 0.06,
        });
        if (pic) {
          const k = 22 / Math.max(pic.w, pic.h);
          g.setFillStyle({ color: 0xffffff, alpha: 1 });
          g.texture(pic.tex, pic.tint, c.x - (pic.w * k) / 2, c.y - pic.h * k + 4, pic.w * k, pic.h * k);
        } else
          g.poly([c.x, c.y - 9, c.x + 6, c.y - 2, c.x, c.y + 3, c.x - 6, c.y - 2])
            .fill({ color: LOOT_COLORS[dr.li % LOOT_COLORS.length] })
            .stroke({ width: 1, color: 0x1c1233 });
      },
    };
  });
}

/** Security cameras on the walls. */
export function cameraItems(view: HeistView, fr: Frame, s: State): Drawable[] {
  return s.cameras.map((c) => {
    const facing = c.sweep[c.idx];
    return {
      depth: project(fr.p, c.at.x + 0.5, c.at.y + 0.5).depth + 0.4,
      draw: (g) => camera(view, g, c.at, facing, !camerasActive(s, c)),
    };
  });
}

/** Leo, the rival and the guards. Also eases Leo up to the rafters and into crates. */
export function characterItems(
  view: HeistView,
  fr: Frame,
  level: Level,
  s: State,
  leo: Actor,
  guards: Actor[],
  rival?: Actor,
): Drawable[] {
  const items: Drawable[] = [];
  const at = (a: Actor) => project(fr.p, a.x, a.y).depth + 0.05;

  // Leo rises to the rafters (or comes down) smoothly, and ducks into a crate he's hiding in.
  const liftTo = fr.inRafters ? RAFTER_Z - 6 : 0;
  const climbing = Math.abs(liftTo - view.leoLift) > 1;
  view.leoLift += Math.max(-fr.dt * 170, Math.min(fr.dt * 170, liftTo - view.leoLift));
  const tucked = hiddenAt(level, s, s.leo) && s.leo.x === Math.floor(leo.x) && s.leo.y === Math.floor(leo.y);
  view.leoHide = Math.max(0, Math.min(1, view.leoHide + (tucked ? fr.dt * 4 : -fr.dt * 6)));
  if (view.leoHide < 0.98)
    items.push({
      depth: fr.leoDepth + 0.05,
      draw: (g) => {
        const gait = leo.gait;
        if (climbing) leo.gait = 'climb';
        drawLeo(view, g, leo, fr.inVent, view.leoLift);
        leo.gait = gait;
        if (s.napTurns > 0) zzz(view, g, leo);
      },
    });

  const r = s.rival;
  if (rival && r && (r.phase === 'in' || r.phase === 'leaving'))
    items.push({ depth: at(rival), draw: (g) => drawRival(view, g, rival, r.id, r.prize) });

  guards.forEach((a, i) => {
    const g0 = s.guards[i];
    const caughtLeo = s.status === 'caught' && s.caughtBy === g0.name;
    items.push({
      depth: at(a),
      draw: (g) =>
        g0.kind === 'nightclaw'
          ? drawNightClaw(view, g, a, g0, caughtLeo)
          : g0.kind === 'robo'
            ? drawRobo(view, g, a, g0, roboOff(s, g0), caughtLeo)
            : drawGuard(view, g, a, g0, caughtLeo),
    });
  });
  return items;
}
