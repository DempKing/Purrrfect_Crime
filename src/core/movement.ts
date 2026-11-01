// Where Leo can get to this turn, and what it costs in action points.
import { blocksMove, isDuct, isRafter, type Level, type Point } from './level';
import { DIRS, key, type Layer, type State } from './state';
import { tileNow } from './world';
import { AP_PER_TURN, MOVE_PER_AP } from './constants';

// ---------------------------------------------------------------------------------------------
// Movement

export function walkable(level: Level, s: State, layer: Layer, x: number, y: number): boolean {
  if (layer === 'vent') return isDuct(level, x, y);
  if (layer === 'rafter') return isRafter(level, x, y);
  const t = tileNow(level, s, x, y);
  return t === 'wire' ? s.perks.tightrope : t === 'crate' || !blocksMove(t);
}
function stepCost(level: Level, s: State, layer: Layer, from: Point, dx: number, dy: number): number {
  if (!walkable(level, s, layer, from.x + dx, from.y + dy)) return Infinity;
  const mult = layer === 'vent' ? s.perks.crawl : 1;
  if (dx !== 0 && dy !== 0) {
    // No cutting corners past walls or furniture.
    if (!walkable(level, s, layer, from.x + dx, from.y) || !walkable(level, s, layer, from.x, from.y + dy))
      return Infinity;
    return 1.5 * mult;
  }
  return mult;
}
export interface Reach {
  cost: Map<string, number>;
  prev: Map<string, string>;
}
export function reachable(
  level: Level,
  s: State,
  from: Point,
  budget: number,
  layer: Layer,
  occupied: Set<string> = new Set(),
): Reach {
  const cost = new Map<string, number>([[key(from.x, from.y), 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[0, from.x, from.y]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [c, x, y] = open.splice(bi, 1)[0];
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const d of DIRS) {
      const nc = c + stepCost(level, s, layer, { x, y }, d.x, d.y);
      const nk = key(x + d.x, y + d.y);
      if (nc > budget || occupied.has(nk)) continue;
      if (nc < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, nc);
        prev.set(nk, key(x, y));
        open.push([nc, x + d.x, y + d.y]);
      }
    }
  }
  return { cost, prev };
}
export function pathTo(reach: Reach, to: Point): Point[] | null {
  const k = key(to.x, to.y);
  if (!reach.cost.has(k)) return null;
  const out: Point[] = [];
  for (let cur: string | undefined = k; cur; cur = reach.prev.get(cur)) {
    const [x, y] = cur.split(',').map(Number);
    out.unshift({ x, y });
  }
  return out;
}
export function apCost(moveCost: number, movePerAp = MOVE_PER_AP): number {
  return moveCost <= 0 ? 0 : moveCost <= movePerAp ? 1 : 2;
}
/** Action points a move of this cost takes Leo, with his Agility. */
export function moveAp(s: State, moveCost: number): number {
  return apCost(moveCost, s.perks.movePerAp);
}
export function guardTiles(s: State): Set<string> {
  return new Set(s.guards.map((g) => key(g.x, g.y)));
}
/** Where Leo can go this turn: one action point's worth (blue) and a dash (yellow). */
export function leoReach(level: Level, s: State): Reach {
  return reachable(
    level,
    s,
    s.leo,
    Math.min(s.ap, AP_PER_TURN) * s.perks.movePerAp,
    s.layer,
    s.layer === 'floor' ? guardTiles(s) : new Set(),
  );
}
