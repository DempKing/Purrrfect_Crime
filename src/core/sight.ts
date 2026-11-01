// What guards and cameras can see.
import { blocksMove, blocksSight, type GuardKind, type Level, type Point, type Tile, tileAt } from './level';
import { type Camera, DIRS, type Guard, key, type Light, type State } from './state';
import { camerasActive, inSmoke, roboOff, tileNow } from './world';
import { KIND_SIGHT, ROBO_RANGE, SCENT_RANGE, SIGHT_HALF_ANGLE, SIGHT_RANGE } from './constants';
import { lightNow } from './light';

// Sight

export function faceToward(from: Point, to: Point): number {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const i = DIRS.findIndex((d) => d.x === dx && d.y === dy);
  return i < 0 ? 0 : i;
}
/** Is the line between two points clear of anything that blocks sight? */
export function clearLine(
  level: Level,
  a: Point,
  b: Point,
  blocks: (t: Tile) => boolean,
  s?: State,
): boolean {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 3;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
    if (blocks(s ? tileNow(level, s, x, y) : tileAt(level, x, y))) return false;
    if (s && inSmoke(s, x, y)) return false;
  }
  return true;
}
/** Sight range for a light level. */
export function rangeFor(light: Light): number {
  return light === 2 ? SIGHT_RANGE.lit : light === 1 ? SIGHT_RANGE.dim : SIGHT_RANGE.dark;
}
/** Is x,y inside a viewer's cone (facing, half-angle and range)? */
export function inCone(
  from: Point,
  facing: number,
  x: number,
  y: number,
  range: number,
  halfAngle = SIGHT_HALF_ANGLE,
): boolean {
  const dx = x - from.x;
  const dy = y - from.y;
  if (dx === 0 && dy === 0) return true;
  const dist = Math.hypot(dx, dy);
  if (dist > range + 0.01) return false;
  const f = DIRS[facing];
  const cos = (dx * f.x + dy * f.y) / (dist * Math.hypot(f.x, f.y));
  return cos >= Math.cos((halfAngle * Math.PI) / 180) - 1e-9;
}
/** How far away Leo can be seen at x,y. Stealth and Blend help Leo; `thing` is for objects (no perks). */
function sightRange(level: Level, s: State, x: number, y: number, thing: boolean, catsEyes = false): number {
  const light = lightNow(level, s, x, y);
  const up = (l: Light): Light => (catsEyes ? (Math.min(2, l + 1) as Light) : l);
  if (thing) return rangeFor(up(light));
  return rangeFor(up(s.perks.blend && light === 1 ? 0 : light)) * s.perks.sight;
}
/** Can this guard see Leo (or an object, with `thing`) at x,y? */
export function guardSees(
  level: Level,
  s: State,
  g: { x: number; y: number; facing: number; kind?: GuardKind; asleep?: boolean },
  x: number,
  y: number,
  thing = false,
): boolean {
  if (g.asleep || inSmoke(s, x, y) || roboOff(s, g)) return false;
  // A robot's heat scanner sees a warm cat in any light, but not an empty case.
  if (g.kind === 'robo' && thing) return false;
  // NightClaw has a cat's eyes: to him the dark is only dim, and dim as good as lit.
  const range =
    g.kind === 'robo'
      ? ROBO_RANGE * s.perks.sight
      : sightRange(level, s, x, y, thing, g.kind === 'nightclaw') * KIND_SIGHT[g.kind ?? 'watch'];
  if (!inCone(g, g.facing, x, y, range)) return false;
  return clearLine(level, g, { x, y }, blocksSight, s);
}
/** Can this camera see x,y? */
export function cameraSees(level: Level, s: State, c: Camera, x: number, y: number): boolean {
  if (!camerasActive(s, c) || inSmoke(s, x, y)) return false;
  const facing = c.sweep[c.idx];
  if (!inCone(c.at, facing, x, y, Math.min(c.range, sightRange(level, s, x, y, false)))) return false;
  return clearLine(level, c.at, { x, y }, blocksSight, s);
}
/** Tiles a guard would see Leo on (cone, walls and light all considered), for drawing. */
export function guardView(level: Level, s: State, g: Guard): Set<string> {
  const out = new Set<string>();
  if (g.asleep) return out;
  const r = Math.ceil(SIGHT_RANGE.lit * KIND_SIGHT[g.kind]);
  for (let y = g.y - r; y <= g.y + r; y++)
    for (let x = g.x - r; x <= g.x + r; x++) {
      if (blocksSight(tileNow(level, s, x, y))) continue;
      if (guardSees(level, s, g, x, y)) out.add(key(x, y));
      // A sniffer's nose works through walls.
      else if (
        g.kind === 'sniffer' &&
        Math.hypot(x - g.x, y - g.y) <= SCENT_RANGE + 0.01 &&
        !blocksMove(tileNow(level, s, x, y))
      )
        out.add(key(x, y));
    }
  return out;
}
/** All the tiles a camera sees (for drawing its cone). */
export function cameraView(level: Level, s: State, c: Camera, idx = c.idx): Set<string> {
  const out = new Set<string>();
  if (!camerasActive(s, c)) return out;
  const cam = { ...c, idx };
  for (let y = c.at.y - c.range; y <= c.at.y + c.range; y++)
    for (let x = c.at.x - c.range; x <= c.at.x + c.range; x++) {
      if (blocksSight(tileNow(level, s, x, y))) continue;
      if (cameraSees(level, s, cam, x, y)) out.add(key(x, y));
    }
  return out;
}
