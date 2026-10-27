// The rules of a heist: Leo's action points and movement, guard sight and patrols, and the turn order.
// Pure data in, data out, so it can be unit-tested and searched by the solver.
import { blocksMove, blocksSight, tileAt, type Level, type Point } from './level';

export const AP_PER_TURN = 2;
/** Tiles of movement one action point buys (diagonals cost 1.5). */
export const MOVE_PER_AP = 5;
export const GUARD_STEPS = 4;
export const SIGHT_RANGE = 6;
/** Half of the vision cone, in degrees. */
export const SIGHT_HALF_ANGLE = 45;

/** Eight facings, clockwise from east. */
export const DIRS: Point[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

export interface Guard {
  name: string;
  x: number;
  y: number;
  facing: number; // index into DIRS
  route: Point[];
  target: number; // index of the waypoint being walked to
}

export type Status = 'playing' | 'caught' | 'escaped';

export interface State {
  leo: Point;
  ap: number;
  turn: number;
  hasLoot: boolean;
  guards: Guard[];
  status: Status;
  caughtBy: string | null;
}

export function newHeist(level: Level): State {
  return {
    leo: { ...level.start },
    ap: AP_PER_TURN,
    turn: 1,
    hasLoot: false,
    guards: level.def.guards.map((g) => ({
      name: g.name,
      x: g.start.x,
      y: g.start.y,
      facing: faceToward(g.start, g.route[0]),
      route: g.route.map((p) => ({ ...p })),
      target: 0,
    })),
    status: 'playing',
    caughtBy: null,
  };
}

export const key = (x: number, y: number) => `${x},${y}`;

// ---------------------------------------------------------------------------------------------
// Movement

function stepCost(level: Level, from: Point, dx: number, dy: number): number {
  const nx = from.x + dx;
  const ny = from.y + dy;
  if (blocksMove(tileAt(level, nx, ny))) return Infinity;
  if (dx !== 0 && dy !== 0) {
    // No cutting corners past walls or furniture.
    if (blocksMove(tileAt(level, from.x + dx, from.y)) || blocksMove(tileAt(level, from.x, from.y + dy))) return Infinity;
    return 1.5;
  }
  return 1;
}

export interface Reach {
  cost: Map<string, number>;
  prev: Map<string, string>;
}

/** Every tile Leo can reach within `budget` movement, with the cheapest route to each. */
export function reachable(level: Level, from: Point, budget: number, occupied: Set<string> = new Set()): Reach {
  const cost = new Map<string, number>([[key(from.x, from.y), 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[0, from.x, from.y]];
  while (open.length) {
    open.sort((a, b) => a[0] - b[0]);
    const [c, x, y] = open.shift()!;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const d of DIRS) {
      const sc = stepCost(level, { x, y }, d.x, d.y);
      const nc = c + sc;
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

export function apCost(moveCost: number): number {
  return moveCost <= 0 ? 0 : moveCost <= MOVE_PER_AP ? 1 : 2;
}

export function guardTiles(s: State): Set<string> {
  return new Set(s.guards.map((g) => key(g.x, g.y)));
}

/** Where Leo can go this turn: one action point's worth (blue) and a dash (yellow). */
export function leoReach(level: Level, s: State): Reach {
  return reachable(level, s.leo, Math.min(s.ap, AP_PER_TURN) * MOVE_PER_AP, guardTiles(s));
}

// ---------------------------------------------------------------------------------------------
// Sight

export function faceToward(from: Point, to: Point): number {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const i = DIRS.findIndex((d) => d.x === dx && d.y === dy);
  return i < 0 ? 0 : i;
}

function lineOfSight(level: Level, a: Point, b: Point): boolean {
  // Walk the line between tile centres; any wall or pillar on the way blocks it.
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 3;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
    if (blocksSight(tileAt(level, x, y))) return false;
  }
  return true;
}

export function guardSees(level: Level, g: Guard, x: number, y: number): boolean {
  const dx = x - g.x;
  const dy = y - g.y;
  if (dx === 0 && dy === 0) return true;
  const dist = Math.hypot(dx, dy);
  if (dist > SIGHT_RANGE + 0.01) return false;
  const f = DIRS[g.facing];
  const cos = (dx * f.x + dy * f.y) / (dist * Math.hypot(f.x, f.y));
  if (cos < Math.cos((SIGHT_HALF_ANGLE * Math.PI) / 180) - 1e-9) return false;
  return lineOfSight(level, { x: g.x, y: g.y }, { x, y });
}

/** Tiles inside a guard's vision cone, for drawing. */
export function visibleTiles(level: Level, g: Guard): Set<string> {
  const out = new Set<string>();
  for (let y = g.y - SIGHT_RANGE; y <= g.y + SIGHT_RANGE; y++)
    for (let x = g.x - SIGHT_RANGE; x <= g.x + SIGHT_RANGE; x++) {
      if (blocksSight(tileAt(level, x, y))) continue;
      if (guardSees(level, g, x, y)) out.add(key(x, y));
    }
  return out;
}

function spotter(level: Level, s: State, x: number, y: number): Guard | null {
  return s.guards.find((g) => guardSees(level, g, x, y)) ?? null;
}

// ---------------------------------------------------------------------------------------------
// Leo's actions

export interface MoveResult {
  ok: boolean;
  /** The tiles Leo actually walked, ending where he stopped (where he was caught, if he was). */
  path: Point[];
  reason?: string;
}

export function moveLeo(level: Level, s: State, to: Point): MoveResult {
  if (s.status !== 'playing') return { ok: false, path: [], reason: 'The heist is over.' };
  const reach = leoReach(level, s);
  const path = pathTo(reach, to);
  if (!path || path.length < 2) return { ok: false, path: [], reason: 'Leo can’t get there this turn.' };
  const cost = apCost(reach.cost.get(key(to.x, to.y))!);
  if (cost > s.ap) return { ok: false, path: [], reason: 'Not enough action points.' };
  const walked: Point[] = [path[0]];
  for (const p of path.slice(1)) {
    s.leo = { ...p };
    walked.push(p);
    const g = spotter(level, s, p.x, p.y);
    if (g) {
      s.status = 'caught';
      s.caughtBy = g.name;
      return { ok: true, path: walked };
    }
  }
  s.ap -= cost;
  if (s.hasLoot && s.leo.x === level.exit.x && s.leo.y === level.exit.y) s.status = 'escaped';
  return { ok: true, path: walked };
}

export function canSteal(level: Level, s: State): boolean {
  return s.status === 'playing' && !s.hasLoot && s.ap >= 1 && Math.max(Math.abs(s.leo.x - level.plinth.x), Math.abs(s.leo.y - level.plinth.y)) === 1;
}

export function steal(level: Level, s: State): boolean {
  if (!canSteal(level, s)) return false;
  s.hasLoot = true;
  s.ap -= 1;
  return true;
}

// ---------------------------------------------------------------------------------------------
// The guards' turn

/** Where a guard will walk on its next turn, step by step (facing included). */
export function planGuard(level: Level, g: Guard, blocked: Set<string> = new Set()): Guard[] {
  const steps: Guard[] = [];
  let cur: Guard = { ...g, route: g.route };
  for (let i = 0; i < GUARD_STEPS; i++) {
    let target = cur.route[cur.target];
    if (cur.x === target.x && cur.y === target.y) {
      cur = { ...cur, target: (cur.target + 1) % cur.route.length };
      target = cur.route[cur.target];
    }
    const path = pathTo(reachable(level, cur, 99, blocked), target);
    if (!path || path.length < 2) break;
    const next = path[1];
    cur = { ...cur, facing: faceToward(cur, next), x: next.x, y: next.y };
    if (cur.x === target.x && cur.y === target.y) {
      // At a waypoint the guard turns to look down the next leg.
      const t = (cur.target + 1) % cur.route.length;
      cur = { ...cur, target: t, facing: faceToward(cur, cur.route[t]) };
    }
    steps.push(cur);
  }
  return steps;
}

export interface GuardStep {
  guard: number;
  to: Guard;
}

/** Ends Leo's turn and runs the guards. Returns each step taken, for animating. */
export function endTurn(level: Level, s: State): GuardStep[] {
  if (s.status !== 'playing') return [];
  const out: GuardStep[] = [];
  s.guards.forEach((g, i) => {
    const plan = planGuard(level, g, new Set([key(s.leo.x, s.leo.y)]));
    for (const step of plan) {
      s.guards[i] = step;
      out.push({ guard: i, to: step });
      if (s.status === 'playing' && guardSees(level, step, s.leo.x, s.leo.y)) {
        s.status = 'caught';
        s.caughtBy = step.name;
        return;
      }
    }
  });
  if (s.status === 'playing') {
    s.turn++;
    s.ap = AP_PER_TURN;
  }
  return out;
}
