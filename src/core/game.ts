// The rules of a heist: Leo's action points, movement and actions; light, sight and noise; guards,
// cameras, lasers and alarms; and the turn order. Pure data in, data out, so it can be unit-tested.
import { blocksMove, blocksSight, isDuct, tileAt, type Level, type Point, type Tile } from './level';

export const AP_PER_TURN = 2;
/** Tiles of movement one action point buys (diagonals cost 1.5). */
export const MOVE_PER_AP = 5;
/** Crawling through a vent costs this much more per tile. */
export const CRAWL = 1.5;
export const GUARD_STEPS = 4;
export const SEARCH_STEPS = 5;
/** Half of the vision cone, in degrees. */
export const SIGHT_HALF_ANGLE = 45;
/** How far guards and cameras can make Leo out, by the light he's standing in. */
export const SIGHT_RANGE = { lit: 6, dim: 4, dark: 1.5 };
/** Turns a suspicious guard spends looking around before going back to his route. */
export const LOOK_TURNS = 2;
/** Turns from an alarm to lockdown. */
export const ALARM_TURNS = 5;
export const INVENTORY_SPACES = 6;
export const NOISE = { marble: 2, dash: 4, pick: 1, smash: 6 };
/** Picks needed to open a lock. */
export const LOCK_PICKS = 2;

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

export type Light = 0 | 1 | 2; // dark, dim, lit
export type Layer = 'floor' | 'vent';
export type GuardMode = 'patrol' | 'suspicious' | 'searching';

export interface Guard {
  name: string;
  x: number;
  y: number;
  facing: number; // index into DIRS
  route: Point[];
  target: number; // index of the waypoint being walked to
  mode: GuardMode;
  /** 0: hasn't seen Leo. 1: glimpsed something; any further sighting is a catch. */
  meter: number;
  point: Point | null; // where he's going to look
  look: number; // turns left looking around at the point
  noticed: string[]; // disturbances he has already reacted to
}

export interface Camera {
  at: Point;
  sweep: number[];
  idx: number;
  range: number;
}

export type Status = 'playing' | 'caught' | 'escaped';

export interface Noise {
  x: number;
  y: number;
  r: number;
}

export interface State {
  leo: Point;
  layer: Layer;
  ap: number;
  turn: number;
  guards: Guard[];
  cameras: Camera[];
  status: Status;
  caughtBy: string | null;
  caughtWhy: string | null;
  inventory: number[]; // indexes into level.def.loot
  smashed: string[]; // cases whose glass is broken
  openDoors: string[];
  picks: Record<string, number>; // lock progress per tile
  camerasOff: boolean;
  lasersOff: boolean;
  alarm: number | null; // turns to lockdown
  noises: Noise[]; // made this turn, for drawing
  log: string[]; // what just happened, for the HUD
}

export const key = (x: number, y: number) => `${x},${y}`;

export function newHeist(level: Level): State {
  return {
    leo: { ...level.start },
    layer: 'floor',
    ap: AP_PER_TURN,
    turn: 1,
    guards: level.def.guards.map((g) => ({
      name: g.name,
      x: g.start.x,
      y: g.start.y,
      facing: faceToward(g.start, g.route[0]),
      route: g.route.map((p) => ({ ...p })),
      target: 0,
      mode: 'patrol',
      meter: 0,
      point: null,
      look: 0,
      noticed: [],
    })),
    cameras: (level.def.cameras ?? []).map((c) => ({ at: { ...c.at }, sweep: [...c.sweep], idx: 0, range: c.range ?? 5 })),
    status: 'playing',
    caughtBy: null,
    caughtWhy: null,
    inventory: [],
    smashed: [],
    openDoors: [],
    picks: {},
    camerasOff: false,
    lasersOff: false,
    alarm: null,
    noises: [],
    log: [],
  };
}

// ---------------------------------------------------------------------------------------------
// The world as it is now (doors opened, loot taken)

export function tileNow(level: Level, s: State, x: number, y: number): Tile {
  const t = tileAt(level, x, y);
  if (t === 'door' && s.openDoors.includes(key(x, y))) return 'floor';
  return t;
}

export function lootAt(level: Level, x: number, y: number): number {
  return level.def.loot.findIndex((l) => l.at.x === x && l.at.y === y);
}

export function inventoryUsed(level: Level, s: State): number {
  return s.inventory.reduce((n, i) => n + level.def.loot[i].space, 0);
}

export function inventoryValue(level: Level, s: State): number {
  return s.inventory.reduce((v, i) => v + level.def.loot[i].value, 0);
}

export function lasersActive(level: Level, s: State): boolean {
  return !s.lasersOff && (!level.def.pulsingLasers || s.turn % 2 === 1);
}

// ---------------------------------------------------------------------------------------------
// Light

const lightCache = new WeakMap<Level, Light[][]>();

export function lightMap(level: Level): Light[][] {
  const hit = lightCache.get(level);
  if (hit) return hit;
  const out: Light[][] = [];
  for (let y = 0; y < level.h; y++) {
    const row: Light[] = [];
    for (let x = 0; x < level.w; x++) {
      if (level.def.ambient === 'lit') {
        row.push(2);
        continue;
      }
      let l: Light = 0;
      for (const m of level.def.moonlight ?? []) if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) l = 1;
      for (const lamp of level.def.lamps ?? []) {
        const d = Math.hypot(x - lamp.at.x, y - lamp.at.y);
        if (d > lamp.radius + 2 || !clearLine(level, lamp.at, { x, y }, (t) => t === 'wall' || t === 'door' || t === 'pillar')) continue;
        if (d <= lamp.radius) l = 2;
        else if (l < 1) l = 1;
      }
      row.push(l);
    }
    out.push(row);
  }
  lightCache.set(level, out);
  return out;
}

export function lightAt(level: Level, x: number, y: number): Light {
  return lightMap(level)[y]?.[x] ?? 0;
}

// ---------------------------------------------------------------------------------------------
// Movement

function walkable(level: Level, s: State, layer: Layer, x: number, y: number): boolean {
  if (layer === 'vent') return isDuct(level, x, y);
  return !blocksMove(tileNow(level, s, x, y));
}

function stepCost(level: Level, s: State, layer: Layer, from: Point, dx: number, dy: number): number {
  if (!walkable(level, s, layer, from.x + dx, from.y + dy)) return Infinity;
  const mult = layer === 'vent' ? CRAWL : 1;
  if (dx !== 0 && dy !== 0) {
    // No cutting corners past walls or furniture.
    if (!walkable(level, s, layer, from.x + dx, from.y) || !walkable(level, s, layer, from.x, from.y + dy)) return Infinity;
    return 1.5 * mult;
  }
  return mult;
}

export interface Reach {
  cost: Map<string, number>;
  prev: Map<string, string>;
}

export function reachable(level: Level, s: State, from: Point, budget: number, layer: Layer, occupied: Set<string> = new Set()): Reach {
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

export function apCost(moveCost: number): number {
  return moveCost <= 0 ? 0 : moveCost <= MOVE_PER_AP ? 1 : 2;
}

export function guardTiles(s: State): Set<string> {
  return new Set(s.guards.map((g) => key(g.x, g.y)));
}

/** Where Leo can go this turn: one action point's worth (blue) and a dash (yellow). */
export function leoReach(level: Level, s: State): Reach {
  return reachable(level, s, s.leo, Math.min(s.ap, AP_PER_TURN) * MOVE_PER_AP, s.layer, s.layer === 'floor' ? guardTiles(s) : new Set());
}

// ---------------------------------------------------------------------------------------------
// Sight

export function faceToward(from: Point, to: Point): number {
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  const i = DIRS.findIndex((d) => d.x === dx && d.y === dy);
  return i < 0 ? 0 : i;
}

function clearLine(level: Level, a: Point, b: Point, blocks: (t: Tile) => boolean, s?: State): boolean {
  const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y)) * 3;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(a.x + (b.x - a.x) * t);
    const y = Math.round(a.y + (b.y - a.y) * t);
    if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
    if (blocks(s ? tileNow(level, s, x, y) : tileAt(level, x, y))) return false;
  }
  return true;
}

export function rangeFor(light: Light): number {
  return light === 2 ? SIGHT_RANGE.lit : light === 1 ? SIGHT_RANGE.dim : SIGHT_RANGE.dark;
}

function inCone(from: Point, facing: number, x: number, y: number, range: number): boolean {
  const dx = x - from.x;
  const dy = y - from.y;
  if (dx === 0 && dy === 0) return true;
  const dist = Math.hypot(dx, dy);
  if (dist > range + 0.01) return false;
  const f = DIRS[facing];
  const cos = (dx * f.x + dy * f.y) / (dist * Math.hypot(f.x, f.y));
  return cos >= Math.cos((SIGHT_HALF_ANGLE * Math.PI) / 180) - 1e-9;
}

/** Whether a guard can make out something at x,y, given the light there. */
export function guardSees(level: Level, s: State, g: { x: number; y: number; facing: number }, x: number, y: number): boolean {
  if (!inCone(g, g.facing, x, y, rangeFor(lightAt(level, x, y)))) return false;
  return clearLine(level, g, { x, y }, blocksSight, s);
}

export function cameraSees(level: Level, s: State, c: Camera, x: number, y: number): boolean {
  if (s.camerasOff) return false;
  const facing = c.sweep[c.idx];
  if (!inCone(c.at, facing, x, y, Math.min(c.range, rangeFor(lightAt(level, x, y))))) return false;
  return clearLine(level, c.at, { x, y }, blocksSight, s);
}

/** Tiles a guard would see Leo on (cone, walls and light all considered), for drawing. */
export function guardView(level: Level, s: State, g: Guard): Set<string> {
  const out = new Set<string>();
  const r = SIGHT_RANGE.lit;
  for (let y = g.y - r; y <= g.y + r; y++)
    for (let x = g.x - r; x <= g.x + r; x++) {
      if (blocksSight(tileNow(level, s, x, y))) continue;
      if (guardSees(level, s, g, x, y)) out.add(key(x, y));
    }
  return out;
}

export function cameraView(level: Level, s: State, c: Camera, idx = c.idx): Set<string> {
  const out = new Set<string>();
  if (s.camerasOff) return out;
  const cam = { ...c, idx };
  for (let y = c.at.y - c.range; y <= c.at.y + c.range; y++)
    for (let x = c.at.x - c.range; x <= c.at.x + c.range; x++) {
      if (blocksSight(tileNow(level, s, x, y))) continue;
      if (cameraSees(level, s, cam, x, y)) out.add(key(x, y));
    }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Getting noticed

function catchLeo(s: State, by: string, why: string): void {
  s.status = 'caught';
  s.caughtBy = by;
  s.caughtWhy = why;
}

/** A guard sees Leo at p. Returns true if that ended the heist. */
function spotted(level: Level, s: State, g: Guard, p: Point): boolean {
  const close = Math.hypot(p.x - g.x, p.y - g.y) <= 2;
  if (g.mode === 'searching' || g.meter >= 1 || close || lightAt(level, p.x, p.y) === 2) {
    catchLeo(s, g.name, close ? 'right in front of him' : lightAt(level, p.x, p.y) === 2 ? 'in the light' : 'a second time');
    return true;
  }
  g.meter = 1;
  g.mode = 'suspicious';
  g.point = { ...p };
  g.look = LOOK_TURNS;
  g.facing = faceToward(g, p);
  s.log.push(`${g.name} glimpsed something in the shadows.`);
  return false;
}

export function triggerAlarm(s: State, p: Point, why: string): void {
  if (s.alarm === null) {
    s.alarm = ALARM_TURNS;
    s.log.push(`Alarm! ${why}. Lockdown in ${ALARM_TURNS} turns.`);
  }
  for (const g of s.guards) {
    g.mode = 'searching';
    g.point = { ...p };
    g.look = 3;
  }
}

/** Is Leo seen at p right now? Handles guards (suspicion or a catch) and cameras (alarm). */
function checkExposure(level: Level, s: State, p: Point): void {
  if (s.layer !== 'floor' || s.status !== 'playing') return;
  for (const g of s.guards) {
    if (guardSees(level, s, g, p.x, p.y) && spotted(level, s, g, p)) return;
  }
  for (const c of s.cameras) if (cameraSees(level, s, c, p.x, p.y)) triggerAlarm(s, p, 'A camera caught Leo on film');
}

/** Sound carries this many tiles through open floor (walls and closed doors stop it). */
function hearingDistance(level: Level, s: State, from: Point, to: Point, max: number): number {
  const seen = new Map<string, number>([[key(from.x, from.y), 0]]);
  const queue: Point[] = [from];
  while (queue.length) {
    const p = queue.shift()!;
    const d = seen.get(key(p.x, p.y))!;
    if (p.x === to.x && p.y === to.y) return d;
    if (d >= max) continue;
    for (const dir of DIRS) {
      const nx = p.x + dir.x;
      const ny = p.y + dir.y;
      const t = tileNow(level, s, nx, ny);
      if (t === 'wall' || t === 'door' || t === 'panel' || t === 'fuse' || seen.has(key(nx, ny))) continue;
      seen.set(key(nx, ny), d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return Infinity;
}

export function makeNoise(level: Level, s: State, p: Point, r: number): void {
  s.noises.push({ x: p.x, y: p.y, r });
  for (const g of s.guards) {
    if (hearingDistance(level, s, p, g, r) > r) continue;
    if (g.mode === 'patrol') s.log.push(`${g.name} heard something.`);
    if (g.mode !== 'searching') g.mode = 'suspicious';
    g.point = { ...p };
    g.look = Math.max(g.look, LOOK_TURNS);
  }
}

// ---------------------------------------------------------------------------------------------
// Moving

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
  s.ap -= cost;
  const walked: Point[] = [path[0]];
  for (const p of path.slice(1)) {
    s.leo = { ...p };
    walked.push(p);
    if (s.layer === 'floor') {
      const t = tileNow(level, s, p.x, p.y);
      if (t === 'laser' && lasersActive(level, s)) triggerAlarm(s, p, 'Leo broke a laser beam');
      if (t === 'marble') makeNoise(level, s, p, NOISE.marble);
    }
    checkExposure(level, s, p);
    if (s.status !== 'playing') return { ok: true, path: walked };
  }
  if (cost === 2 && s.layer === 'floor') {
    makeNoise(level, s, s.leo, NOISE.dash);
    s.log.push('Dashing makes noise.');
  }
  if (s.layer === 'floor' && s.inventory.length && s.leo.x === level.exit.x && s.leo.y === level.exit.y) s.status = 'escaped';
  return { ok: true, path: walked };
}

// ---------------------------------------------------------------------------------------------
// Actions: picking locks, smashing glass, panels, vents

export type ActionKind = 'pick-case' | 'smash-case' | 'take' | 'pick-door' | 'panel' | 'fuse' | 'enter-vent' | 'exit-vent';

export interface Action {
  kind: ActionKind;
  at: Point;
  label: string;
  ap: number;
  noise: number;
  /** Why it can't be done right now, if it can't. */
  blocked?: string;
}

const near8 = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
const near4 = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;

/** Everything Leo can do from where he stands. */
export function actionsHere(level: Level, s: State): Action[] {
  if (s.status !== 'playing') return [];
  const out: Action[] = [];
  const L = s.leo;
  if (s.layer === 'vent') {
    if (tileAt(level, L.x, L.y) === 'grate') out.push({ kind: 'exit-vent', at: L, label: 'Climb out of the vent', ap: 1, noise: 0 });
  } else {
    if (tileAt(level, L.x, L.y) === 'grate') out.push({ kind: 'enter-vent', at: L, label: 'Climb into the vent', ap: 1, noise: 0 });
    for (let y = L.y - 1; y <= L.y + 1; y++)
      for (let x = L.x - 1; x <= L.x + 1; x++) {
        const p = { x, y };
        if (!near8(L, p)) continue;
        const t = tileNow(level, s, x, y);
        const li = lootAt(level, x, y);
        const loot = li >= 0 ? level.def.loot[li] : null;
        const k = key(x, y);
        const taken = li >= 0 && s.inventory.includes(li);
        const noRoom = loot && inventoryUsed(level, s) + loot.space > INVENTORY_SPACES ? `No room: the inventory has ${INVENTORY_SPACES} spaces.` : undefined;
        if (t === 'case' && loot && !taken) {
          if (s.smashed.includes(k)) out.push({ kind: 'take', at: p, label: `Take the ${loot.name}`, ap: 1, noise: 0, blocked: noRoom });
          else {
            const done = s.picks[k] ?? 0;
            out.push({ kind: 'pick-case', at: p, label: `Pick the case lock (${done}/${LOCK_PICKS})`, ap: 1, noise: NOISE.pick, blocked: noRoom });
            out.push({ kind: 'smash-case', at: p, label: `Smash the glass and grab the ${loot.name}`, ap: 1, noise: NOISE.smash, blocked: noRoom });
          }
        }
        if (t === 'plinth' && loot && !taken) out.push({ kind: 'take', at: p, label: `Take ${loot.name}`, ap: 1, noise: 0, blocked: noRoom });
        if (t === 'door' && near4(L, p)) out.push({ kind: 'pick-door', at: p, label: `Pick the door lock (${s.picks[k] ?? 0}/${LOCK_PICKS})`, ap: 1, noise: NOISE.pick });
        if (t === 'panel' && !s.camerasOff) out.push({ kind: 'panel', at: p, label: s.alarm !== null ? 'Shut off the cameras and the alarm' : 'Shut off the cameras', ap: 1, noise: 0 });
        if (t === 'fuse' && !s.lasersOff) out.push({ kind: 'fuse', at: p, label: 'Cut the power to the lasers', ap: 1, noise: 0 });
      }
  }
  for (const a of out) if (!a.blocked && s.ap < a.ap) a.blocked = 'Not enough action points.';
  return out;
}

function take(level: Level, s: State, at: Point): void {
  const li = lootAt(level, at.x, at.y);
  s.inventory.push(li);
  s.log.push(`Got the ${level.def.loot[li].name}.`);
}

export function doAction(level: Level, s: State, kind: ActionKind, at: Point): boolean {
  const a = actionsHere(level, s).find((x) => x.kind === kind && x.at.x === at.x && x.at.y === at.y);
  if (!a || a.blocked) return false;
  s.ap -= a.ap;
  const k = key(at.x, at.y);
  switch (kind) {
    case 'pick-case':
    case 'pick-door':
      s.picks[k] = (s.picks[k] ?? 0) + 1;
      makeNoise(level, s, s.leo, NOISE.pick);
      if (s.picks[k] >= LOCK_PICKS) {
        if (kind === 'pick-door') {
          s.openDoors.push(k);
          s.log.push('The door clicks open.');
        } else {
          s.smashed.push(k); // opened quietly; the case is empty either way
          take(level, s, at);
        }
      } else s.log.push('Click… one more go.');
      break;
    case 'smash-case':
      s.smashed.push(k);
      makeNoise(level, s, at, NOISE.smash);
      take(level, s, at);
      s.log.push('CRASH! The glass breaks.');
      break;
    case 'take':
      take(level, s, at);
      break;
    case 'panel':
      s.camerasOff = true;
      if (s.alarm !== null) s.log.push('Cameras off, alarm silenced.');
      else s.log.push('Cameras off.');
      s.alarm = null;
      break;
    case 'fuse':
      s.lasersOff = true;
      s.log.push('The lasers flicker and die.');
      break;
    case 'enter-vent':
      s.layer = 'vent';
      s.log.push('Into the vent. Nobody can see Leo in here.');
      break;
    case 'exit-vent':
      s.layer = 'floor';
      checkExposure(level, s, s.leo);
      break;
  }
  return true;
}

// Kept for the warm-up level and the solver: take the centrepiece from next to its plinth.
export function canSteal(level: Level, s: State): boolean {
  return !!level.plinth && actionsHere(level, s).some((a) => a.kind === 'take' && !a.blocked && a.at.x === level.plinth!.x && a.at.y === level.plinth!.y);
}

export function steal(level: Level, s: State): boolean {
  return !!level.plinth && doAction(level, s, 'take', level.plinth);
}

// ---------------------------------------------------------------------------------------------
// The guards' turn

/** Tiles that show a theft: broken or emptied cases and an empty plinth. */
function disturbances(level: Level, s: State): Point[] {
  return s.inventory.map((i) => level.def.loot[i].at).concat(s.smashed.filter((k) => !s.inventory.some((i) => key(level.def.loot[i].at.x, level.def.loot[i].at.y) === k)).map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y };
  }));
}

function guardWalkable(level: Level, s: State, x: number, y: number): boolean {
  return !blocksMove(tileNow(level, s, x, y));
}

export function nextStepToward(level: Level, s: State, g: Guard, target: Point, others: Set<string>): Point | null {
  if (g.x === target.x && g.y === target.y) return null;
  // Cheapest walk on the floor, with diagonals costing 1.5 so guards keep to sensible lines.
  // Guards walk through Leo's tile (and catch him there).
  const start = key(g.x, g.y);
  const goal = key(target.x, target.y);
  const cost = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[0, g.x, g.y]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [c, x, y] = open.splice(bi, 1)[0];
    if (key(x, y) === goal) break;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const d of DIRS) {
      const nx = x + d.x;
      const ny = y + d.y;
      const nk = key(nx, ny);
      if (others.has(nk) || !guardWalkable(level, s, nx, ny)) continue;
      if (d.x && d.y && (!guardWalkable(level, s, x + d.x, y) || !guardWalkable(level, s, x, y + d.y))) continue;
      const nc = c + (d.x && d.y ? 1.5 : 1);
      if (nc < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, nc);
        prev.set(nk, key(x, y));
        open.push([nc, nx, ny]);
      }
    }
  }
  if (!prev.has(goal)) return null;
  let k = goal;
  while (prev.get(k) !== start) k = prev.get(k)!;
  const [x, y] = k.split(',').map(Number);
  return { x, y };
}

export interface GuardStep {
  guard: number;
  to: Guard;
}

/** Where each guard will walk next turn if nothing changes, for drawing the footprints. */
export function planGuards(level: Level, s: State): Point[][] {
  const sim = structuredClone(s);
  sim.layer = 'vent'; // a dry run: nobody gets caught or alarmed
  sim.log = [];
  const steps = runGuards(level, sim, true);
  return s.guards.map((_, i) => steps.filter((st) => st.guard === i).map((st) => ({ x: st.to.x, y: st.to.y })));
}

function runGuards(level: Level, s: State, dry: boolean): GuardStep[] {
  const out: GuardStep[] = [];
  for (let gi = 0; gi < s.guards.length; gi++) {
    const g = s.guards[gi];
    let sawLeo = false;
    const steps = g.mode === 'searching' ? SEARCH_STEPS : GUARD_STEPS;
    for (let i = 0; i < steps && s.status === 'playing'; i++) {
      const others = new Set(s.guards.filter((o) => o !== g).map((o) => key(o.x, o.y)));
      if (g.mode === 'patrol') {
        let target = g.route[g.target];
        if (g.x === target.x && g.y === target.y) {
          g.target = (g.target + 1) % g.route.length;
          target = g.route[g.target];
        }
        const next = nextStepToward(level, s, g, target, others);
        if (!next) break;
        g.facing = faceToward(g, next);
        g.x = next.x;
        g.y = next.y;
        if (g.x === target.x && g.y === target.y) {
          g.target = (g.target + 1) % g.route.length;
          g.facing = faceToward(g, g.route[g.target]);
        }
      } else if (g.point) {
        const next = nextStepToward(level, s, g, g.point, others);
        if (next) {
          g.facing = faceToward(g, next);
          g.x = next.x;
          g.y = next.y;
        } else g.facing = (g.facing + 2) % 8; // at the spot: look around
      }
      out.push({ guard: gi, to: { ...g, route: g.route } });
      if (dry) continue;
      if (s.layer === 'floor' && g.x === s.leo.x && g.y === s.leo.y) {
        catchLeo(s, g.name, 'by walking straight into him');
        break;
      }
      if (s.layer === 'floor' && guardSees(level, s, g, s.leo.x, s.leo.y)) {
        sawLeo = true;
        spotted(level, s, g, s.leo);
        break; // either caught, or stops to stare
      }
      for (const d of disturbances(level, s)) {
        const k = key(d.x, d.y);
        if (!g.noticed.includes(k) && guardSees(level, s, g, d.x, d.y)) {
          g.noticed.push(k);
          triggerAlarm(s, d, `${g.name} found an empty display`);
        }
      }
    }
    if (s.status !== 'playing') break;
    // After looking around for long enough, a suspicious guard goes back to his rounds.
    if (g.mode !== 'patrol' && g.point && g.x === g.point.x && g.y === g.point.y) {
      g.look -= 1;
      if (g.look <= 0 && s.alarm === null) {
        g.mode = 'patrol';
        g.point = null;
        if (!sawLeo) g.meter = 0;
        let best = 0;
        g.route.forEach((w, i) => {
          if (Math.hypot(w.x - g.x, w.y - g.y) < Math.hypot(g.route[best].x - g.x, g.route[best].y - g.y)) best = i;
        });
        g.target = best;
      }
    }
  }
  return out;
}

/** Ends Leo's turn: cameras sweep, guards move, the alarm counts down. Returns the guards' steps. */
export function endTurn(level: Level, s: State): GuardStep[] {
  if (s.status !== 'playing') return [];
  s.log = [];
  s.noises = [];
  for (const c of s.cameras) c.idx = (c.idx + 1) % c.sweep.length;
  checkExposure(level, s, s.leo);
  const steps = s.status === 'playing' ? runGuards(level, s, false) : [];
  if (s.status === 'playing' && s.alarm !== null) {
    s.alarm -= 1;
    if (s.alarm <= 0) catchLeo(s, 'The police', 'Lockdown: every door sealed');
  }
  if (s.status === 'playing') {
    s.turn++;
    s.ap = AP_PER_TURN;
    // The pulsing lasers may have come on under Leo's feet.
    if (s.layer === 'floor' && tileNow(level, s, s.leo.x, s.leo.y) === 'laser' && lasersActive(level, s)) triggerAlarm(s, s.leo, 'A laser came on right where Leo stood');
  }
  return steps;
}

/** What would happen if Leo stood on p (used to colour the planned path). 0 safe, 1 noticed, 2 caught or alarm. */
export function danger(level: Level, s: State, p: Point): 0 | 1 | 2 {
  if (s.layer !== 'floor') return 0;
  let worst: 0 | 1 | 2 = 0;
  if (tileNow(level, s, p.x, p.y) === 'laser' && lasersActive(level, s)) worst = 2;
  for (const c of s.cameras) if (cameraSees(level, s, c, p.x, p.y)) worst = 2;
  for (const g of s.guards) {
    if (!guardSees(level, s, g, p.x, p.y)) continue;
    const caught = g.mode === 'searching' || g.meter >= 1 || Math.hypot(p.x - g.x, p.y - g.y) <= 2 || lightAt(level, p.x, p.y) === 2;
    worst = caught ? 2 : Math.max(worst, 1) as 0 | 1 | 2;
  }
  return worst;
}
