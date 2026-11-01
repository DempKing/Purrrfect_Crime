// Drawing stage 1: the floor and everything painted on it (light, cones, reach outlines, the path).
import type { Level } from '../../core/level';
import {
  camerasActive,
  key,
  KIND_SIGHT,
  PRINT_TURNS,
  ROBO_RANGE,
  roboOff,
  sensorsActive,
  SIGHT_RANGE,
  type State,
  tileNow,
} from '../../core/game';
import { project } from '../iso';
import { CREAK, PLATE } from '../surfaces';
import type { HeistView } from '../view';
import type { Actor, Frame, Overlay } from './types';
import { COL, hatchVision } from './style';
import { diamond, diamondOutline } from './shapes';
import { floorTile, gap, grate, planks, plate } from './walls';
import { belt, paint } from './furniture';
import { decoyCard, drawAlert, keycard, pawPrint, region, riskMark, viewCone } from './overlays';

/** The floor colour for a tile when there's no texture for it. */
function floorColour(level: Level, s: State, x: number, y: number): number {
  const t = tileNow(level, s, x, y);
  const odd = (x + y) % 2 === 1;
  if (t === 'floor' && level.tiles[y][x] === 'tidal') return odd ? 0xa58a5e : 0x9a8056; // wet sand
  if (t === 'exit') return COL.exit;
  if (t === 'marble') return odd ? COL.marbleA : COL.marbleB;
  if (t === 'squeaky') return odd ? 0x7a5634 : 0x6e4c2d;
  return odd ? COL.carpetA : COL.carpetB;
}

/** Draws one tile into the cached floor picture: its texture or colour, then light and shade. */
function drawCachedTile(view: HeistView, fr: Frame, level: Level, s: State, x: number, y: number): void {
  const fb = fr.fb!;
  const t = tileNow(level, s, x, y);
  const sand = t === 'floor' && level.tiles[y][x] === 'tidal';

  // Texture first; plain colour if there isn't one.
  const skin =
    sand || t === 'exit'
      ? null
      : t === 'squeaky'
        ? CREAK
        : t === 'plate'
          ? PLATE
          : t === 'marble'
            ? view.look.marble
            : view.look.floor;
  const skinned = !!skin && floorTile(view, fb, x, y, skin);
  if (!skinned) diamond(view, fb, x, y, 0.5, floorColour(level, s, x, y), 1, COL.floorLine);
  if (t === 'squeaky' && !skinned) planks(view, fb, x, y);
  if (t === 'plate' && !skinned) plate(view, fb, x, y);
  if (t === 'paint') paint(view, fb, x, y);

  // Light: dark tiles shaded, lit tiles (and spotlights) brightened.
  const spotlit =
    fr.spots.some((sp) => Math.hypot(x - sp.at.x, y - sp.at.y) <= sp.radius + 0.01) || fr.beam.has(key(x, y));
  const l = spotlit ? 2 : fr.light[y][x];
  if (l === 0) diamond(view, fb, x, y, 0.5, 0x05060c, 0.55);
  else if (l === 2) diamond(view, fb, x, y, 0.5, spotlit ? 0xfff6d8 : COL.lampGlow, spotlit ? 0.32 : 0.16);

  if (t === 'grate') grate(view, fb, x, y);
  // In the vents or rafters, the floor below goes dark.
  if (fr.inVent || fr.inRafters) diamond(view, fb, x, y, 0.5, 0x02030a, 0.45);
}

/** Every floor tile: the cached picture (only when it changed) plus the per-frame highlights. */
export function drawFloor(view: HeistView, fr: Frame, level: Level, s: State, ov: Overlay): void {
  const f = fr.f;
  for (let y = 0; y < level.h; y++)
    for (let x = 0; x < level.w; x++) {
      const t = tileNow(level, s, x, y);
      if (t === 'wall' || t === 'pillar' || t === 'stack' || t === 'panel' || t === 'fuse') continue;
      const k = key(x, y);

      // Gaps and tightropes have no floor.
      if (t === 'gap' || t === 'wire') {
        gap(view, f, level, x, y);
        continue;
      }
      if (t === 'keycard') keycard(view, f, x, y);
      if (t === 'belt-e' || t === 'belt-w') belt(view, f, x, y, t === 'belt-e' ? 1 : -1);
      if (fr.fb) drawCachedTile(view, fr, level, s, x, y);

      // Fish market: a faint shimmer where sniffers can't smell.
      if ((level.def.fishy ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h))
        diamond(view, f, x, y, 0.5, 0x6fd6a0, 0.07 + Math.sin(view.time * 1.5 + x * 0.7 + y) * 0.03);
      // Motion sensor zones pulse while they're on.
      if (level.motion[y][x] && sensorsActive(s))
        diamondOutline(view, f, x, y, COL.motion, 1, 0.1, 0.35 + Math.sin(view.time * 3) * 0.1);
      // Tiles a gadget can be aimed at.
      if (ov.targets.has(k)) {
        diamond(view, f, x, y, 0.4, COL.target, 0.28 + Math.sin(view.time * 5) * 0.08);
        diamondOutline(view, f, x, y, COL.target, 1.5, 0.12, 0.8);
      }
      // Danger marks on reachable tiles.
      const r = ov.risky.get(k);
      if (r && (ov.reach1.has(k) || ov.reach2.has(k))) riskMark(view, f, x, y, r.kind);
    }
}

/** Each guard's and camera's view cone, cut off by walls (not shown from the vents or rafters). */
export function drawViewCones(view: HeistView, fr: Frame, level: Level, s: State, guards: Actor[]): void {
  if (fr.inVent || fr.inRafters) return;
  guards.forEach((a, i) => {
    const g = s.guards[i];
    if (!g || g.asleep || roboOff(s, g) || s.status !== 'playing') return;
    const range = g.kind === 'robo' ? ROBO_RANGE * s.perks.sight : SIGHT_RANGE.lit * KIND_SIGHT[g.kind];
    const alert = g.mode !== 'patrol';
    viewCone(view, fr.f, level, s, a.x, a.y, a.facing, range, alert ? COL.danger : COL.vision, 0);
  });
  for (const c of s.cameras) {
    if (!camerasActive(s, c)) continue;
    const cx = c.at.x + 0.5;
    const cy = c.at.y + 0.5;
    viewCone(view, fr.f, level, s, cx, cy, c.sweep[c.idx], c.range, COL.camera, 0);
    // Where it will point after the guards' turn.
    const next = c.sweep[(c.idx + 1) % c.sweep.length];
    if (next !== c.sweep[c.idx]) viewCone(view, fr.f, level, s, cx, cy, next, c.range, COL.camera, 0);
  }
}

/** In the vents or the rafters: the walkable layer drawn on the floor like a blueprint. */
export function drawLayerPlan(view: HeistView, fr: Frame, level: Level): void {
  const grid = fr.inVent ? level.ducts : fr.inRafters ? level.rafters : null;
  if (!grid) return;
  const colour = fr.inVent ? COL.duct : COL.beam;
  for (let y = 0; y < level.h; y++)
    for (let x = 0; x < level.w; x++) {
      if (!grid[y][x]) continue;
      diamond(view, fr.f, x, y, 0.42, colour, fr.inVent ? 0.18 : 0.2);
      diamondOutline(view, fr.f, x, y, colour, 1.5, 0.08, 0.6);
    }
}

/** Marks on top of the floor: area outlines, decoys, paw prints, footprints, the path and the hovered tile. */
export function drawFloorMarks(view: HeistView, fr: Frame, s: State, ov: Overlay): void {
  const { f, p } = fr;

  // Area outlines: camera sight, guard sight, then reach (yellow = 2 AP, blue = 1 AP on top).
  region(view, f, ov.cameraVision, COL.camera, 2.5, 0.95);
  region(view, f, ov.vision, COL.vision, 2.5, 0.95, hatchVision);
  region(view, f, new Set([...ov.reach1, ...ov.reach2]), COL.reach2, 3, 0.95);
  region(view, f, ov.reach1, COL.reach1, 3, 0.95);

  for (const d of s.decoys) decoyCard(view, f, d);
  for (const pr of s.prints) pawPrint(view, f, pr, pr.turns / PRINT_TURNS);

  // Dots where the guards (and the rival) will step next turn.
  for (const fp of ov.footprints) {
    const sp = project(p, fp.x + 0.5, fp.y + 0.5);
    f.circle(sp.x, sp.y, 4).fill({ color: COL.step, alpha: 0.75 });
  }
  for (const fp of ov.rivalPath) {
    const sp = project(p, fp.x + 0.5, fp.y + 0.5);
    f.circle(sp.x - 3, sp.y, 3).fill({ color: COL.rival, alpha: 0.85 });
    f.circle(sp.x + 3, sp.y - 2, 3).fill({ color: COL.rival, alpha: 0.85 });
  }

  // The walk to the hovered tile, coloured by danger.
  for (let i = 1; i < ov.path.length; i++) {
    const a = project(p, ov.path[i - 1].x + 0.5, ov.path[i - 1].y + 0.5);
    const b = project(p, ov.path[i].x + 0.5, ov.path[i].y + 0.5);
    const d = ov.pathDanger.get(key(ov.path[i].x, ov.path[i].y)) ?? 0;
    const color = d === 2 ? COL.danger : d === 1 ? COL.warn : COL.path;
    f.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 4, color, alpha: 0.95 });
  }

  for (const a of ov.alerts) drawAlert(view, f, a);

  // The hovered tile, in the colour of the worst danger on the way there.
  if (ov.hover) {
    const worst = Math.max(0, ...ov.pathDanger.values());
    const color = worst === 2 ? COL.danger : worst === 1 ? COL.warn : COL.path;
    diamondOutline(view, f, ov.hover.x, ov.hover.y, color, 3.5, 0.02, 1);
  }
}
