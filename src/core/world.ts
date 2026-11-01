// Questions about the world right now: what a tile is this turn, the tide, lasers, cameras, smoke.
import { type GuardKind, type Level, type Point, type Tile, tileAt } from './level';
import { type Camera, key, type State } from './state';

// The world as it is now (doors opened, loot taken)

export function tileNow(level: Level, s: State, x: number, y: number): Tile {
  const t = tileAt(level, x, y);
  if ((t === 'door' || t === 'keydoor' || t === 'vault') && s.openDoors.includes(key(x, y))) return 'floor';
  if (t === 'keycard' && s.card) return 'floor';
  if (t === 'tidal') return flooded(level, s) ? 'gap' : 'floor';
  return t;
}
/** High tide: the tidal sand is under water. */
export function flooded(level: Level, s: State): boolean {
  const tide = level.def.tide;
  return !!tide && Math.floor((s.turn - 1) / tide.period) % 2 === (tide.high ? 0 : 1);
}
/** Turns until the tide turns (1 means it turns at the end of this one). */
export function tideTurnsLeft(level: Level, s: State): number {
  const period = level.def.tide?.period ?? 1;
  return period - ((s.turn - 1) % period);
}
/** Is p inside any of these rectangles? */
export const inRects = (rects: { x: number; y: number; w: number; h: number }[] | undefined, p: Point) =>
  (rects ?? []).some((m) => p.x >= m.x && p.x < m.x + m.w && p.y >= m.y && p.y < m.y + m.h);
/** Leo, curled up in a crate: nobody sees him, smells him or bumps into him. */
export function hiddenAt(level: Level, s: State, p: Point): boolean {
  return s.layer === 'floor' && tileAt(level, p.x, p.y) === 'crate';
}
/** Index of the loot at x,y, or -1. */
export function lootAt(level: Level, x: number, y: number): number {
  return level.def.loot.findIndex((l) => l.at.x === x && l.at.y === y);
}
/** Space used in Leo's bag. */
export function inventoryUsed(level: Level, s: State): number {
  return s.inventory.reduce((n, i) => n + level.def.loot[i].space, 0);
}
/** Total value in Leo's bag. */
export function inventoryValue(level: Level, s: State): number {
  return s.inventory.reduce((v, i) => v + level.def.loot[i].value, 0);
}
/** Are the lasers on? */
export function lasersActive(level: Level, s: State): boolean {
  return !s.lasersOff && s.lasersOffTurns <= 0 && (!level.def.pulsingLasers || s.turn % 2 === 1);
}
/** Motion sensors run off the same fuse box as the lasers. */
export function sensorsActive(s: State): boolean {
  return !s.lasersOff && s.lasersOffTurns <= 0;
}
/** Which step of a path (an index into it) would trip a motion sensor, or -1. */
export function motionTrip(level: Level, s: State, path: Point[]): number {
  if (s.layer !== 'floor' || !sensorsActive(s)) return -1;
  let n = 0;
  for (let i = 1; i < path.length; i++) if (level.motion[path[i].y][path[i].x] && ++n === 2) return i;
  return -1;
}
/** A Robo-Guard runs on the same power as the lasers: no power, no robot. */
export function roboOff(s: State, g: { kind?: GuardKind }): boolean {
  return g.kind === 'robo' && !sensorsActive(s);
}
/** Is this camera working (not switched off at the panel or knocked out for a few turns)? */
export function camerasActive(s: State, c: Camera): boolean {
  return !s.camerasOff && c.offTurns <= 0;
}
/** Is x,y inside a smoke cloud? */
export function inSmoke(s: State, x: number, y: number): boolean {
  return s.smoke.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
}
