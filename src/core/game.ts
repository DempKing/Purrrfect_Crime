// The rules of a heist: Leo's action points, movement and actions; light, sight and noise; guards,
// cameras, lasers and alarms; and the turn order. Pure data in, data out, so it can be unit-tested.
import { blocksMove, blocksSight, isDuct, isRafter, tileAt, type GuardKind, type Level, type Point, type Tile } from './level';

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
export const NOISE = { marble: 2, dash: 4, pick: 1, smash: 6, squeaky: 4, drop: 3 };
/** Picks needed to open a lock. */
export const LOCK_PICKS = 2;
/** Goes needed to crack a safe (quiet, but slow). */
export const SAFE_CRACKS = 3;
/** How far guard types see, as a share of a night-watch guard. */
export const KIND_SIGHT: Record<GuardKind, number> = { watch: 1, sleepy: 1, captain: 1.25, sniffer: 0.6 };
/** A sniffer smells Leo this many tiles away, through walls (not through vents or from the rafters). */
export const SCENT_RANGE = 2;
/** A captain who gets suspicious calls guards within this many tiles. */
export const CAPTAIN_CALL = 7;

/** Gadgets and active skills: things Leo uses on purpose, most with a few charges per heist. */
export type Ability = 'bottle-cap' | 'decoy-card' | 'smoke' | 'camera-loop' | 'fuse-kit' | 'emp' | 'pounce' | 'cat-nap' | 'second-wind';

/**
 * What Leo's attributes, skills and lair bring to a heist. The defaults are a fresh Leo; the profile
 * works out the rest (see meta/progression.ts).
 */
export interface Perks {
  movePerAp: number; // Agility
  crawl: number; // vent cost per tile; Agility
  sight: number; // how far guards and cameras make Leo out, as a share of normal; Stealth
  blend: boolean; // dim light counts as dark (Shadow: Blend)
  noise: number; // share of the noise Leo makes; Quiet Paws
  casePicks: number; // goes needed to pick a case; Dexterity
  safeCracks: number; // goes needed to crack a safe; Dexterity
  doorPicks: number; // and a door; Dexterity, Tech: Keycard Clone
  silentPicks: boolean; // Dexterity 5
  spaces: number; // inventory; Pockets
  previewTurns: number; // guard footprints shown this many turns ahead; Perception, Planning Table
  ghostStep: boolean; // the first noisy move of a heist makes none (Shadow)
  vanish: boolean; // the first time a guard glimpses Leo, he's gone before it registers (Shadow)
  laserMirror: boolean; // the first laser Leo breaks bounces harmlessly (Tech)
  ceilingClimb: boolean; // the rafters, by the ladders (Acrobat)
  charges: Partial<Record<Ability, number>>; // per heist; pounce is unlimited when owned
}

export const BASE_PERKS: Perks = {
  movePerAp: MOVE_PER_AP,
  crawl: CRAWL,
  sight: 1,
  blend: false,
  noise: 1,
  casePicks: LOCK_PICKS,
  safeCracks: SAFE_CRACKS,
  doorPicks: LOCK_PICKS,
  silentPicks: false,
  spaces: INVENTORY_SPACES,
  previewTurns: 1,
  ghostStep: false,
  vanish: false,
  laserMirror: false,
  ceilingClimb: false,
  charges: {},
};

// ---------------------------------------------------------------------------------------------
// Rival thieves

export type RivalId = 'mittens' | 'luna' | 'sammy' | 'paws';

export const RIVALS: Record<RivalId, { name: string; speed: number; hello: string; beaten: string; won: string }> = {
  mittens: {
    name: 'Mischief Mittens',
    speed: 4,
    hello: 'Mischief Mittens tumbles in: “Ooh, a tuxedo! Let’s make some noise, shall we?”',
    beaten: 'Mischief Mittens hisses, knocks over a vase on principle, and is gone.',
    won: 'Mischief Mittens cackles off into the night with the prize.',
  },
  luna: {
    name: 'Luna Luck',
    speed: 6,
    hello: 'Luna Luck drops in without a sound: “Evening, Tuxedo. Try to keep up.”',
    beaten: 'Luna Luck tips an imaginary hat: “Lucky you. Next time.” She’s gone.',
    won: 'Luna Luck slips away with the prize. Of course she does.',
  },
  sammy: {
    name: 'Sammy Swipes',
    speed: 3,
    hello: 'Sammy Swipes squeezes in, pockets already clinking: “Don’t mind me, just browsing.”',
    beaten: 'Sammy Swipes grumbles and wriggles back out the way he came.',
    won: 'Sammy Swipes waddles off with the prize, and probably your spare change.',
  },
  paws: {
    name: 'Professor Paws',
    speed: 4,
    hello: 'Professor Paws lets himself in and adjusts his spectacles: “Ah. The amateur.”',
    beaten: 'Professor Paws makes a note in his little book and departs.',
    won: 'Professor Paws leaves with the prize, locking up neatly behind himself.',
  },
};

/** Which rival is coming tonight, when, and by which way in (an index into the level's rival entrances). */
export interface RivalPlan {
  id: RivalId;
  arrive: number;
  entrance: number;
}

export interface Rival {
  id: RivalId;
  name: string;
  x: number;
  y: number;
  facing: number;
  arrive: number;
  entrance: Point;
  phase: 'waiting' | 'in' | 'leaving' | 'gone';
  prize: boolean;
  alarmed: boolean; // Mittens has set off her alarm
}

/** Unlimited uses, while Leo has the skill. */
export const UNLIMITED = 99;

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
/** Where Leo is: on the floor, in a vent, or up in the rafters. Nobody sees him in the last two. */
export type Layer = 'floor' | 'vent' | 'rafter';
export type GuardMode = 'patrol' | 'suspicious' | 'searching';

export interface Guard {
  name: string;
  kind: GuardKind;
  asleep: boolean; // a sleepy guard at his post
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
  offTurns: number; // looped or knocked out for this many more turns
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
  /** For the stealth bonuses and the newspaper: was Leo ever glimpsed or filmed, did an alarm ever go off. */
  seen: boolean;
  alarmRaised: boolean;
  perks: Perks;
  charges: Partial<Record<Ability, number>>; // left this heist
  used: { ghostStep: boolean; vanish: boolean; laserMirror: boolean };
  smoke: { x: number; y: number; turns: number }[]; // smoke pellets: 3x3 clouds that block sight
  decoys: Point[]; // calling cards left as decoys
  lasersOffTurns: number; // lasers cut for a while (Fuse Kit, EMP Collar)
  napTurns: number; // Cat Nap: guards can't see Leo for this many of their turns
  rival: Rival | null;
  rivalLoot: number[]; // loot a rival has taken (the centrepiece, or whatever Sammy pocketed)
  rivalBeaten: boolean; // Leo took the centrepiece while a rival was after it
  noises: Noise[]; // made this turn, for drawing
  log: string[]; // what just happened, for the HUD
}

export const key = (x: number, y: number) => `${x},${y}`;

export function newHeist(level: Level, perks: Perks = BASE_PERKS, rival: RivalPlan | null = null): State {
  const entrance = rival ? level.def.rivalEntrances?.[rival.entrance % (level.def.rivalEntrances?.length || 1)] : undefined;
  return {
    leo: { ...level.start },
    layer: 'floor',
    ap: AP_PER_TURN,
    turn: 1,
    guards: level.guards.map((g) => ({
      name: g.name,
      kind: g.kind ?? 'watch',
      asleep: g.kind === 'sleepy',
      x: g.start.x,
      y: g.start.y,
      facing: faceToward(g.start, g.route[0]),
      route: g.kind === 'sleepy' ? [{ ...g.start }] : g.route.map((p) => ({ ...p })),
      target: 0,
      mode: 'patrol',
      meter: 0,
      point: null,
      look: 0,
      noticed: [],
    })),
    cameras: level.cameras.map((c) => ({ at: { ...c.at }, sweep: [...c.sweep], idx: 0, range: c.range ?? 5, offTurns: 0 })),
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
    seen: false,
    alarmRaised: false,
    perks: structuredClone(perks),
    charges: { ...perks.charges },
    used: { ghostStep: false, vanish: false, laserMirror: false },
    smoke: [],
    decoys: [],
    lasersOffTurns: 0,
    napTurns: 0,
    rival:
      rival && entrance && level.plinth
        ? { id: rival.id, name: RIVALS[rival.id].name, x: entrance.x, y: entrance.y, facing: 0, arrive: rival.arrive, entrance: { ...entrance }, phase: 'waiting', prize: false, alarmed: false }
        : null,
    rivalLoot: [],
    rivalBeaten: false,
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

export function camerasActive(s: State, c: Camera): boolean {
  return !s.camerasOff && c.offTurns <= 0;
}

export function inSmoke(s: State, x: number, y: number): boolean {
  return s.smoke.some((c) => Math.abs(c.x - x) <= 1 && Math.abs(c.y - y) <= 1);
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
      let l: Light = level.def.ambient === 'dim' && !(level.def.shadows ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) ? 1 : 0;
      for (const m of level.moonlight) if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) l = 1;
      for (const lamp of level.lamps) {
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

/** Where each spotlight's circle is this turn. */
export function spotlightsNow(level: Level, s: State): { at: Point; radius: number }[] {
  return level.spotlights.map((sp) => ({ at: sp.path[(s.turn - 1) % sp.path.length], radius: sp.radius }));
}

/** The light on a tile right now: the level's lamps and moonlight, plus any spotlight passing over it. */
export function lightNow(level: Level, s: State, x: number, y: number): Light {
  for (const sp of spotlightsNow(level, s)) if (Math.hypot(x - sp.at.x, y - sp.at.y) <= sp.radius + 0.01) return 2;
  return lightAt(level, x, y);
}

// ---------------------------------------------------------------------------------------------
// Movement

function walkable(level: Level, s: State, layer: Layer, x: number, y: number): boolean {
  if (layer === 'vent') return isDuct(level, x, y);
  if (layer === 'rafter') return isRafter(level, x, y);
  return !blocksMove(tileNow(level, s, x, y));
}

function stepCost(level: Level, s: State, layer: Layer, from: Point, dx: number, dy: number): number {
  if (!walkable(level, s, layer, from.x + dx, from.y + dy)) return Infinity;
  const mult = layer === 'vent' ? s.perks.crawl : 1;
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
  return reachable(level, s, s.leo, Math.min(s.ap, AP_PER_TURN) * s.perks.movePerAp, s.layer, s.layer === 'floor' ? guardTiles(s) : new Set());
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
    if (s && inSmoke(s, x, y)) return false;
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

/**
 * How far away Leo can be made out on x,y. Stealth shortens it and Blend makes dim light count as dark;
 * neither helps an empty display case, which is what `thing` is for.
 */
function sightRange(level: Level, s: State, x: number, y: number, thing: boolean): number {
  const light = lightNow(level, s, x, y);
  if (thing) return rangeFor(light);
  return rangeFor(s.perks.blend && light === 1 ? 0 : light) * s.perks.sight;
}

/** Whether a guard can make out Leo (or, with `thing`, an object) at x,y, given the light there. */
export function guardSees(level: Level, s: State, g: { x: number; y: number; facing: number; kind?: GuardKind; asleep?: boolean }, x: number, y: number, thing = false): boolean {
  if (g.asleep || inSmoke(s, x, y)) return false;
  if (!inCone(g, g.facing, x, y, sightRange(level, s, x, y, thing) * KIND_SIGHT[g.kind ?? 'watch'])) return false;
  return clearLine(level, g, { x, y }, blocksSight, s);
}

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
      else if (g.kind === 'sniffer' && Math.hypot(x - g.x, y - g.y) <= SCENT_RANGE + 0.01 && !blocksMove(tileNow(level, s, x, y))) out.add(key(x, y));
    }
  return out;
}

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

// ---------------------------------------------------------------------------------------------
// Getting noticed

/** Ends the heist. Returns true, so callers can say `return catchLeo(…)`. */
function catchLeo(s: State, by: string, why: string): boolean {
  s.status = 'caught';
  s.caughtBy = by;
  s.caughtWhy = why;
  return true;
}

/** A guard sees Leo at p. Returns true if that ended the heist. */
function spotted(level: Level, s: State, g: Guard, p: Point): boolean {
  if (s.perks.vanish && !s.used.vanish) {
    s.used.vanish = true;
    s.log.push(`Vanish! ${g.name} blinks, and Leo isn't there any more.`);
    return false;
  }
  s.seen = true;
  const close = Math.hypot(p.x - g.x, p.y - g.y) <= 2;
  const lit = lightNow(level, s, p.x, p.y) === 2;
  if (g.mode === 'searching' || g.meter >= 1 || close || lit) {
    return catchLeo(s, g.name, close ? 'right in front of him' : lit ? 'in the light' : 'a second time');
  }
  g.meter = 1;
  g.mode = 'suspicious';
  g.point = { ...p };
  g.look = LOOK_TURNS;
  g.facing = faceToward(g, p);
  s.log.push(`${g.name} glimpsed something in the shadows.`);
  captainCalls(s, g, p);
  return false;
}

/** A sniffer within scent range of Leo: suspicious at first, and a catch if he's already sniffing or right there. */
function smelled(s: State, g: Guard, p: Point): boolean {
  if (s.perks.vanish && !s.used.vanish) {
    s.used.vanish = true;
    s.log.push(`Vanish! ${g.name} sniffs the air and shrugs.`);
    return false;
  }
  s.seen = true;
  if (g.mode === 'searching' || g.meter >= 1 || Math.hypot(p.x - g.x, p.y - g.y) <= 1.5) return catchLeo(s, g.name, 'sniffed him out');
  g.meter = 1;
  g.mode = 'suspicious';
  g.point = { ...p };
  g.look = LOOK_TURNS;
  s.log.push(`${g.name} sniffs… and smells cat.`);
  return false;
}

const canSmell = (s: State, g: Guard, p: Point) => g.kind === 'sniffer' && !g.asleep && s.layer === 'floor' && s.napTurns <= 0 && Math.hypot(p.x - g.x, p.y - g.y) <= SCENT_RANGE + 0.01;

/** A suspicious captain whistles up the guards near him to look too. */
function captainCalls(s: State, g: Guard, p: Point): void {
  if (g.kind !== 'captain') return;
  for (const o of s.guards) {
    if (o === g || o.mode === 'searching' || Math.hypot(o.x - g.x, o.y - g.y) > CAPTAIN_CALL) continue;
    if (o.mode === 'patrol') s.log.push(`${g.name} whistles: ${o.name} comes to help.`);
    o.asleep = false;
    o.mode = 'suspicious';
    o.point = { ...p };
    o.look = Math.max(o.look, LOOK_TURNS);
  }
}

/** Sets off the alarm. Only Leo's alarms count against a flawless heist, not a rival's. */
export function triggerAlarm(s: State, p: Point, why: string, byLeo = true): void {
  if (byLeo) s.alarmRaised = true;
  if (s.alarm === null) {
    s.alarm = ALARM_TURNS;
    s.log.push(`Alarm! ${why}. Lockdown in ${ALARM_TURNS} turns.`);
  }
  for (const g of s.guards) {
    g.asleep = false;
    g.mode = 'searching';
    g.point = { ...p };
    g.look = 3;
  }
}

/** Is Leo seen at p right now? Handles guards (suspicion or a catch) and cameras (alarm). */
function checkExposure(level: Level, s: State, p: Point): void {
  if (s.layer !== 'floor' || s.status !== 'playing' || s.napTurns > 0) return;
  for (const g of s.guards) {
    if (guardSees(level, s, g, p.x, p.y) && spotted(level, s, g, p)) return;
    if (canSmell(s, g, p) && smelled(s, g, p)) return;
  }
  for (const c of s.cameras)
    if (cameraSees(level, s, c, p.x, p.y)) {
      s.seen = true;
      triggerAlarm(s, p, 'A camera caught Leo on film');
    }
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

/** A sound at p heard r tiles away. Leo's own noises are scaled by Quiet Paws; `fromLeo` false is a thrown object. */
export function makeNoise(level: Level, s: State, p: Point, r: number, fromLeo = true): void {
  if (fromLeo) r = Math.round(r * s.perks.noise);
  if (r <= 0) return;
  s.noises.push({ x: p.x, y: p.y, r });
  for (const g of s.guards) {
    if (hearingDistance(level, s, p, g, r) > r) continue;
    if (g.asleep) s.log.push(`${g.name} wakes with a snort.`);
    else if (g.mode === 'patrol') s.log.push(`${g.name} heard something.`);
    g.asleep = false;
    if (g.mode !== 'searching') g.mode = 'suspicious';
    g.point = { ...p };
    g.look = Math.max(g.look, LOOK_TURNS);
    captainCalls(s, g, p);
  }
}

/** A laser beam broken at p: the alarm, unless the Laser Mirror bounces the first one. */
function breakLaser(s: State, p: Point, why: string): void {
  if (s.perks.laserMirror && !s.used.laserMirror) {
    s.used.laserMirror = true;
    s.log.push('The laser mirror bounces the beam. Nobody noticed.');
    return;
  }
  triggerAlarm(s, p, why);
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
  const cost = moveAp(s, reach.cost.get(key(to.x, to.y))!);
  if (cost > s.ap) return { ok: false, path: [], reason: 'Not enough action points.' };
  return walkPath(level, s, path, cost);
}

/** Walks a path already known to be reachable for `cost` action points (moveLeo works it out first). */
export function walkPath(level: Level, s: State, path: Point[], cost: number): MoveResult {
  s.ap -= cost;
  // Ghost Step: the first move of the heist that would make a sound makes none.
  const noisy = s.layer === 'floor' && (cost === 2 || path.slice(1).some((p) => ['marble', 'squeaky'].includes(tileNow(level, s, p.x, p.y))));
  const ghost = noisy && s.perks.ghostStep && !s.used.ghostStep;
  if (ghost) {
    s.used.ghostStep = true;
    s.log.push('Ghost Step: not a sound.');
  }
  const walked: Point[] = [path[0]];
  let inZone = 0; // steps taken inside motion-sensor zones this move
  for (const p of path.slice(1)) {
    s.leo = { ...p };
    walked.push(p);
    if (s.layer === 'floor') {
      const t = tileNow(level, s, p.x, p.y);
      if (t === 'laser' && lasersActive(level, s)) breakLaser(s, p, 'Leo broke a laser beam');
      if (t === 'plate') triggerAlarm(s, p, 'A pressure plate clicked under Leo’s paw');
      if (level.motion[p.y][p.x] && sensorsActive(s) && ++inZone === 2) triggerAlarm(s, p, 'A motion sensor saw Leo move');
      if (t === 'marble' && !ghost) makeNoise(level, s, p, NOISE.marble);
      if (t === 'squeaky' && !ghost) {
        makeNoise(level, s, p, NOISE.squeaky);
        s.log.push('Creeeak!');
      }
    }
    checkExposure(level, s, p);
    if (s.status !== 'playing') return { ok: true, path: walked };
  }
  if (cost === 2 && s.layer === 'floor' && !ghost) {
    makeNoise(level, s, s.leo, NOISE.dash);
    s.log.push('Dashing makes noise.');
  }
  if (s.layer === 'floor' && s.inventory.length && s.leo.x === level.exit.x && s.leo.y === level.exit.y) s.status = 'escaped';
  return { ok: true, path: walked };
}

// ---------------------------------------------------------------------------------------------
// Actions: picking locks, smashing glass, panels, vents

export type ActionKind = 'pick-case' | 'smash-case' | 'take' | 'crack-safe' | 'pick-door' | 'panel' | 'fuse' | 'enter-vent' | 'exit-vent' | 'climb-up' | 'climb-down' | 'drop';

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
  } else if (s.layer === 'rafter') {
    const below = tileNow(level, s, L.x, L.y);
    if (below === 'ladder') out.push({ kind: 'climb-down', at: L, label: 'Climb down the ladder', ap: 1, noise: 0 });
    else if (!blocksMove(below) && !guardTiles(s).has(key(L.x, L.y))) out.push({ kind: 'drop', at: L, label: 'Drop to the floor', ap: 1, noise: NOISE.drop });
  } else {
    if (tileAt(level, L.x, L.y) === 'grate') out.push({ kind: 'enter-vent', at: L, label: 'Climb into the vent', ap: 1, noise: 0 });
    if (tileAt(level, L.x, L.y) === 'ladder') out.push({ kind: 'climb-up', at: L, label: 'Climb up to the rafters', ap: 1, noise: 0, blocked: s.perks.ceilingClimb ? undefined : 'Needs the Ceiling Climb skill (Acrobat).' });
    for (let y = L.y - 1; y <= L.y + 1; y++)
      for (let x = L.x - 1; x <= L.x + 1; x++) {
        const p = { x, y };
        if (!near8(L, p)) continue;
        const t = tileNow(level, s, x, y);
        const li = lootAt(level, x, y);
        const loot = li >= 0 ? level.def.loot[li] : null;
        const k = key(x, y);
        const taken = li >= 0 && lootGone(s, li);
        const noRoom = loot && inventoryUsed(level, s) + loot.space > s.perks.spaces ? `No room: the inventory has ${s.perks.spaces} spaces.` : undefined;
        if (t === 'case' && loot && !taken) {
          if (s.smashed.includes(k)) out.push({ kind: 'take', at: p, label: `Take the ${loot.name}`, ap: 1, noise: 0, blocked: noRoom });
          else {
            const done = s.picks[k] ?? 0;
            out.push({ kind: 'pick-case', at: p, label: s.perks.casePicks > 1 ? `Pick the case lock (${done}/${s.perks.casePicks})` : `Pick the lock and take the ${loot.name}`, ap: 1, noise: s.perks.silentPicks ? 0 : NOISE.pick, blocked: noRoom });
            out.push({ kind: 'smash-case', at: p, label: `Smash the glass and grab the ${loot.name}`, ap: 1, noise: NOISE.smash, blocked: noRoom });
          }
        }
        if (t === 'safe' && loot && !taken) {
          const done = s.picks[k] ?? 0;
          out.push({ kind: 'crack-safe', at: p, label: s.perks.safeCracks > 1 ? `Crack the safe (${done}/${s.perks.safeCracks})` : `Crack the safe and take the ${loot.name}`, ap: 1, noise: 0, blocked: noRoom });
        }
        if (t === 'plinth' && loot && !taken) out.push({ kind: 'take', at: p, label: `Take ${loot.name}`, ap: 1, noise: 0, blocked: noRoom });
        if (t === 'door' && near4(L, p)) out.push({ kind: 'pick-door', at: p, label: s.perks.doorPicks > 1 ? `Pick the door lock (${s.picks[k] ?? 0}/${s.perks.doorPicks})` : 'Open the door', ap: 1, noise: s.perks.silentPicks ? 0 : NOISE.pick });
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
  // Beaten to it: a rival after the centrepiece gives up.
  const r = s.rival;
  if (r && r.phase !== 'gone' && level.plinth && at.x === level.plinth.x && at.y === level.plinth.y) {
    if (r.phase !== 'waiting') s.log.push(RIVALS[r.id].beaten);
    r.phase = 'gone';
    s.rivalBeaten = true;
  }
}

/** Loot that's gone: in Leo's inventory, or taken by a rival. */
function lootGone(s: State, li: number): boolean {
  return s.inventory.includes(li) || s.rivalLoot.includes(li);
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
      if (!s.perks.silentPicks) makeNoise(level, s, s.leo, NOISE.pick);
      if (s.picks[k] >= (kind === 'pick-door' ? s.perks.doorPicks : s.perks.casePicks)) {
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
    case 'crack-safe':
      s.picks[k] = (s.picks[k] ?? 0) + 1;
      if (s.picks[k] >= s.perks.safeCracks) {
        s.smashed.push(k); // open and empty: a disturbance like any other
        s.log.push('The last tumbler falls. The safe swings open.');
        take(level, s, at);
      } else s.log.push('Click… click… one tumbler down.');
      break;
    case 'climb-up':
      s.layer = 'rafter';
      s.log.push('Up into the rafters. Nobody looks up.');
      break;
    case 'climb-down':
      s.layer = 'floor';
      checkExposure(level, s, s.leo);
      break;
    case 'drop':
      s.layer = 'floor';
      s.log.push('Thump!');
      makeNoise(level, s, s.leo, NOISE.drop);
      checkExposure(level, s, s.leo);
      break;
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// Abilities: gadgets and active skills

export interface AbilityInfo {
  kind: Ability;
  name: string;
  /** What it needs pointing at: a tile, a camera (its tile), or nothing. */
  target: 'tile' | 'camera' | 'self';
  ap: number;
  left: number; // charges left (UNLIMITED for pounce)
  blocked?: string;
}

const ABILITY_NAMES: Record<Ability, string> = {
  'bottle-cap': 'Bottle cap',
  'decoy-card': 'Decoy card',
  smoke: 'Smoke pellet',
  'camera-loop': 'Camera loop',
  'fuse-kit': 'Fuse kit',
  emp: 'EMP collar',
  pounce: 'Pounce',
  'cat-nap': 'Cat nap',
  'second-wind': 'Second wind',
};
const ABILITY_TARGET: Record<Ability, AbilityInfo['target']> = {
  'bottle-cap': 'tile',
  'decoy-card': 'tile',
  smoke: 'tile',
  'camera-loop': 'camera',
  'fuse-kit': 'self',
  emp: 'self',
  pounce: 'tile',
  'cat-nap': 'self',
  'second-wind': 'self',
};
/** How far each can reach, in tiles. */
export const ABILITY_RANGE = { throw: 6, card: 5, smoke: 5, loop: 7, emp: 5 };
export const BOTTLE_CAP_NOISE = 4;

/** The abilities Leo has this heist, in a fixed order, with what's left of each. */
export function abilities(level: Level, s: State): AbilityInfo[] {
  const out: AbilityInfo[] = [];
  for (const kind of Object.keys(ABILITY_NAMES) as Ability[]) {
    if (!(kind in s.charges)) continue;
    const left = s.charges[kind] ?? 0;
    const a: AbilityInfo = { kind, name: ABILITY_NAMES[kind], target: ABILITY_TARGET[kind], ap: kind === 'second-wind' ? 0 : 1, left };
    if (s.status !== 'playing') a.blocked = 'The heist is over.';
    else if (left <= 0) a.blocked = 'None left this heist.';
    else if (s.ap < a.ap) a.blocked = 'Not enough action points.';
    else if (kind === 'second-wind' && s.ap > AP_PER_TURN - 1) a.blocked = 'Save it for when you’ve spent a point.';
    else if (s.layer !== 'floor' && kind !== 'cat-nap') a.blocked = s.layer === 'vent' ? 'Not from inside a vent.' : 'Not from up in the rafters.';
    else if (a.target !== 'self' && abilityTargets(level, s, kind).size === 0) a.blocked = 'Nothing in reach.';
    out.push(a);
  }
  return out;
}

const throwable = (level: Level, s: State, x: number, y: number) => {
  const t = tileNow(level, s, x, y);
  return !blocksMove(t) || t === 'case' || t === 'plinth';
};

/** Tiles an ability can be aimed at from where Leo is. */
export function abilityTargets(level: Level, s: State, kind: Ability): Set<string> {
  const out = new Set<string>();
  const L = s.leo;
  const within = (r: number, ok: (x: number, y: number) => boolean) => {
    for (let y = L.y - r; y <= L.y + r; y++)
      for (let x = L.x - r; x <= L.x + r; x++) {
        if ((x === L.x && y === L.y) || Math.hypot(x - L.x, y - L.y) > r + 0.01) continue;
        if (ok(x, y) && clearLine(level, L, { x, y }, blocksSight, s)) out.add(key(x, y));
      }
  };
  if (kind === 'bottle-cap') within(ABILITY_RANGE.throw, (x, y) => throwable(level, s, x, y));
  else if (kind === 'decoy-card') within(ABILITY_RANGE.card, (x, y) => !blocksMove(tileNow(level, s, x, y)));
  else if (kind === 'smoke') within(ABILITY_RANGE.smoke, (x, y) => !blocksSight(tileNow(level, s, x, y)));
  else if (kind === 'camera-loop') {
    for (const c of s.cameras)
      if (camerasActive(s, c) && Math.hypot(c.at.x - L.x, c.at.y - L.y) <= ABILITY_RANGE.loop) out.add(key(c.at.x, c.at.y));
  } else if (kind === 'pounce') {
    // Two tiles in a straight line, over anything low (a laser, a case, a lamp), onto open floor.
    const guards = guardTiles(s);
    for (const d of DIRS) {
      const mid = tileNow(level, s, L.x + d.x, L.y + d.y);
      const lx = L.x + 2 * d.x;
      const ly = L.y + 2 * d.y;
      if (blocksSight(mid) || blocksMove(tileNow(level, s, lx, ly)) || guards.has(key(lx, ly))) continue;
      if (d.x && d.y && (blocksSight(tileNow(level, s, L.x + d.x, L.y)) || blocksSight(tileNow(level, s, L.x, L.y + d.y)))) continue;
      out.add(key(lx, ly));
    }
  }
  return out;
}

/** Uses an ability; `at` is the target tile (or the camera's tile). Returns false if it can't be used. */
export function useAbility(level: Level, s: State, kind: Ability, at?: Point): boolean {
  const a = abilities(level, s).find((x) => x.kind === kind);
  if (!a || a.blocked) return false;
  if (a.target !== 'self' && (!at || !abilityTargets(level, s, kind).has(key(at.x, at.y)))) return false;
  s.ap -= a.ap;
  if (a.left < UNLIMITED) s.charges[kind] = a.left - 1;
  switch (kind) {
    case 'bottle-cap':
      s.log.push('Leo flicks a bottle cap. Clink!');
      makeNoise(level, s, at!, BOTTLE_CAP_NOISE, false);
      break;
    case 'decoy-card':
      s.decoys.push({ ...at! });
      s.log.push('Leo props a calling card where a guard will spot it.');
      break;
    case 'smoke':
      s.smoke.push({ x: at!.x, y: at!.y, turns: 2 });
      s.log.push('Pfff! A cloud of smoke. Nobody can see into it or through it for two turns.');
      break;
    case 'camera-loop': {
      const c = s.cameras.find((c) => c.at.x === at!.x && c.at.y === at!.y)!;
      c.offTurns = 3;
      s.log.push('The camera is showing yesterday’s footage for three turns.');
      break;
    }
    case 'fuse-kit':
      s.lasersOffTurns = Math.max(s.lasersOffTurns, 3);
      s.log.push('The fuse kit shorts the lasers for three turns.');
      break;
    case 'emp': {
      let hit = 0;
      for (const c of s.cameras)
        if (Math.hypot(c.at.x - s.leo.x, c.at.y - s.leo.y) <= ABILITY_RANGE.emp) {
          c.offTurns = Math.max(c.offTurns, 2);
          hit++;
        }
      s.lasersOffTurns = Math.max(s.lasersOffTurns, 2);
      s.log.push(`Bzzt! The EMP collar knocks out the lasers${hit ? ` and ${hit} camera${hit === 1 ? '' : 's'}` : ''} for two turns.`);
      break;
    }
    case 'pounce':
      s.leo = { ...at! };
      s.log.push('Pounce!');
      if (tileNow(level, s, at!.x, at!.y) === 'laser' && lasersActive(level, s)) breakLaser(s, at!, 'Leo landed on a laser beam');
      checkExposure(level, s, s.leo);
      if (s.status === 'playing' && s.inventory.length && s.leo.x === level.exit.x && s.leo.y === level.exit.y) s.status = 'escaped';
      break;
    case 'second-wind':
      s.ap += 1;
      s.log.push('Second wind: one more action point this turn.');
      break;
    case 'cat-nap':
      s.napTurns = 2;
      s.ap = 0;
      s.log.push('Leo curls up in the shadows. For two turns nobody will notice him, unless they trip over him.');
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
function disturbances(level: Level, s: State): (Point & { byLeo: boolean })[] {
  const leo = s.inventory.map((i) => ({ ...level.def.loot[i].at, byLeo: true }));
  const smashed = s.smashed.filter((k) => !s.inventory.some((i) => key(level.def.loot[i].at.x, level.def.loot[i].at.y) === k)).map((k) => {
    const [x, y] = k.split(',').map(Number);
    return { x, y, byLeo: true };
  });
  const rivals = s.rivalLoot.map((i) => ({ ...level.def.loot[i].at, byLeo: false }));
  return [...leo, ...smashed, ...rivals];
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

/** One step of the guards' (or, with guard -1, the rival's) turn, for the animation. */
export interface GuardStep {
  guard: number;
  to: { x: number; y: number; facing: number };
}

/** Where each guard will walk over the next turns if nothing changes, for drawing the footprints. */
export function planGuards(level: Level, s: State, turns = s.perks.previewTurns): Point[][] {
  const sim = structuredClone(s);
  sim.layer = 'vent'; // a dry run: nobody gets caught or alarmed
  sim.log = [];
  const steps: GuardStep[] = [];
  for (let t = 0; t < turns; t++) steps.push(...runGuards(level, sim, true));
  return s.guards.map((_, i) => steps.filter((st) => st.guard === i).map((st) => ({ x: st.to.x, y: st.to.y })));
}

function runGuards(level: Level, s: State, dry: boolean): GuardStep[] {
  const out: GuardStep[] = [];
  for (let gi = 0; gi < s.guards.length; gi++) {
    const g = s.guards[gi];
    if (g.asleep) continue;
    // A sleepy guard who has settled back at his post nods off again.
    if (g.kind === 'sleepy' && g.mode === 'patrol' && g.x === g.route[0].x && g.y === g.route[0].y) {
      g.asleep = true;
      if (!dry) s.log.push(`${g.name} settles back in his chair and nods off.`);
      continue;
    }
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
      out.push({ guard: gi, to: { x: g.x, y: g.y, facing: g.facing } });
      if (dry) continue;
      if (s.layer === 'floor' && g.x === s.leo.x && g.y === s.leo.y) {
        catchLeo(s, g.name, 'by walking straight into him');
        break;
      }
      if (s.layer === 'floor' && s.napTurns <= 0 && guardSees(level, s, g, s.leo.x, s.leo.y)) {
        sawLeo = true;
        spotted(level, s, g, s.leo);
        break; // either caught, or stops to stare
      }
      if (canSmell(s, g, s.leo)) {
        sawLeo = true;
        smelled(s, g, s.leo);
        break;
      }
      for (const d of disturbances(level, s)) {
        const k = key(d.x, d.y);
        if (!g.noticed.includes(k) && guardSees(level, s, g, d.x, d.y, true)) {
          g.noticed.push(k);
          triggerAlarm(s, d, `${g.name} found an empty display`, d.byLeo);
        }
      }
      // A decoy card catches a guard's eye: he goes over to look, and pockets it.
      for (const d of s.decoys)
        if (g.mode !== 'searching' && guardSees(level, s, g, d.x, d.y, true) && (g.point?.x !== d.x || g.point?.y !== d.y)) {
          if (g.mode === 'patrol') s.log.push(`${g.name} spotted a calling card and went to look.`);
          g.mode = 'suspicious';
          g.point = { ...d };
          g.look = LOOK_TURNS;
        }
      s.decoys = s.decoys.filter((d) => d.x !== g.x || d.y !== g.y);
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

// ---------------------------------------------------------------------------------------------
// The rival's turn, after the guards'

/** The next tile toward any of the goals for a rival: floors, and doors (rivals are pros). */
function rivalStep(level: Level, s: State, r: Rival, goals: Point[]): Point | null {
  const goal = new Set(goals.map((g) => key(g.x, g.y)));
  if (goal.has(key(r.x, r.y))) return null;
  const ok = (x: number, y: number) => {
    const t = tileNow(level, s, x, y);
    return (t === 'door' || !blocksMove(t)) && !(s.layer === 'floor' && s.leo.x === x && s.leo.y === y);
  };
  const prev = new Map<string, string>([[key(r.x, r.y), '']]);
  const q: Point[] = [{ x: r.x, y: r.y }];
  while (q.length) {
    const p = q.shift()!;
    if (goal.has(key(p.x, p.y))) {
      let k = key(p.x, p.y);
      while (prev.get(k) !== key(r.x, r.y)) k = prev.get(k)!;
      const [x, y] = k.split(',').map(Number);
      return { x, y };
    }
    for (const d of DIRS) {
      const x = p.x + d.x;
      const y = p.y + d.y;
      if (prev.has(key(x, y)) || !ok(x, y)) continue;
      if (d.x && d.y && (!ok(p.x + d.x, p.y) || !ok(p.x, p.y + d.y))) continue;
      prev.set(key(x, y), key(p.x, p.y));
      q.push({ x, y });
    }
  }
  return null;
}

/** Where the rival will go on their next turn, if nothing changes, for drawing their footprints. */
export function planRival(level: Level, s: State): Point[] {
  if (!s.rival || s.rival.phase === 'gone' || s.rival.phase === 'waiting') return [];
  const sim = structuredClone(s);
  sim.log = [];
  return runRival(level, sim).map((st) => ({ x: st.to.x, y: st.to.y }));
}

function runRival(level: Level, s: State): GuardStep[] {
  const r = s.rival;
  const out: GuardStep[] = [];
  if (!r || r.phase === 'gone' || !level.plinth) return out;
  const centre = lootAt(level, level.plinth.x, level.plinth.y);
  if (r.phase === 'waiting') {
    if (s.turn < r.arrive) return out;
    r.phase = 'in';
    s.log.push(RIVALS[r.id].hello);
    out.push({ guard: -1, to: { x: r.x, y: r.y, facing: r.facing } });
    if (rivalSpotted(level, s, r)) return out;
  }
  // Mittens sets off an alarm on the far side of the building, to pull the guards away from her.
  if (r.id === 'mittens' && !r.alarmed && s.turn >= r.arrive + 1) {
    r.alarmed = true;
    const far = level.guards.flatMap((g) => g.route).reduce((a, b) => (Math.hypot(b.x - r.x, b.y - r.y) > Math.hypot(a.x - r.x, a.y - r.y) ? b : a), { x: r.x, y: r.y });
    triggerAlarm(s, far, 'Somebody set off an alarm on the far side of the building', false);
  }
  const around: Point[] = [];
  for (const d of DIRS) around.push({ x: level.plinth.x + d.x, y: level.plinth.y + d.y });
  for (let i = 0; i < RIVALS[r.id].speed; i++) {
    if (r.phase === 'in' && around.some((a) => a.x === r.x && a.y === r.y)) {
      // Reached the prize: it takes the rest of the turn to lift it.
      r.prize = true;
      s.rivalLoot.push(centre);
      r.phase = 'leaving';
      s.log.push(`${r.name} grabs the ${level.def.loot[centre].name}!`);
      break;
    }
    const next = rivalStep(level, s, r, r.phase === 'in' ? around : [r.entrance]);
    if (!next) {
      if (r.phase === 'leaving' && r.x === r.entrance.x && r.y === r.entrance.y) {
        r.phase = 'gone';
        s.log.push(RIVALS[r.id].won);
      }
      break;
    }
    const was = { x: r.x, y: r.y };
    r.facing = faceToward(r, next);
    r.x = next.x;
    r.y = next.y;
    out.push({ guard: -1, to: { x: r.x, y: r.y, facing: r.facing } });
    rivalHabits(level, s, r, was);
    if (rivalSpotted(level, s, r)) break;
  }
  return out;
}

/** Sammy pockets loot as he passes; Professor Paws blinds cameras near him and locks doors behind himself. */
function rivalHabits(level: Level, s: State, r: Rival, was: Point): void {
  if (r.id === 'sammy')
    for (const d of DIRS) {
      const li = lootAt(level, r.x + d.x, r.y + d.y);
      if (li < 0 || lootGone(s, li) || tileAt(level, r.x + d.x, r.y + d.y) !== 'case') continue;
      s.rivalLoot.push(li);
      s.log.push(`Sammy Swipes pockets the ${level.def.loot[li].name}.`);
    }
  if (r.id === 'paws') {
    for (const c of s.cameras) if (Math.hypot(c.at.x - r.x, c.at.y - r.y) <= 3) c.offTurns = Math.max(c.offTurns, 1);
    if (tileAt(level, was.x, was.y) === 'door' && (was.x !== r.x || was.y !== r.y)) {
      const k = key(was.x, was.y);
      s.openDoors = s.openDoors.filter((d) => d !== k);
      delete s.picks[k];
    }
  }
}

/** A guard who spots a rival raises the hue and cry; the rival bolts (with the prize, if they have it). */
function rivalSpotted(level: Level, s: State, r: Rival): boolean {
  if (r.id === 'luna') return false; // a little too lucky
  const g = s.guards.find((g) => !g.asleep && guardSees(level, s, g, r.x, r.y, true));
  if (!g) return false;
  s.log.push(`${g.name} spots ${r.name}! ${r.name} bolts${r.prize ? ' with the prize' : ''}.`);
  r.phase = 'gone';
  for (const o of s.guards) {
    if (o !== g && Math.hypot(o.x - g.x, o.y - g.y) > CAPTAIN_CALL) continue;
    o.asleep = false;
    o.mode = 'searching';
    o.point = { x: r.x, y: r.y };
    o.look = 3;
  }
  return true;
}

/** Ends Leo's turn: cameras sweep, guards move, the alarm counts down. Returns the guards' steps. */
export function endTurn(level: Level, s: State): GuardStep[] {
  if (s.status !== 'playing') return [];
  s.log = [];
  s.noises = [];
  for (const c of s.cameras) c.idx = (c.idx + 1) % c.sweep.length;
  checkExposure(level, s, s.leo);
  const steps = s.status === 'playing' ? runGuards(level, s, false) : [];
  if (s.status === 'playing') steps.push(...runRival(level, s));
  // Gadgets wear off at the end of the guards' turn.
  for (const c of s.cameras) c.offTurns = Math.max(0, c.offTurns - 1);
  s.lasersOffTurns = Math.max(0, s.lasersOffTurns - 1);
  for (const c of s.smoke) c.turns--;
  s.smoke = s.smoke.filter((c) => c.turns > 0);
  s.napTurns = Math.max(0, s.napTurns - 1);
  if (s.status === 'playing' && s.alarm !== null) {
    s.alarm -= 1;
    if (s.alarm <= 0) catchLeo(s, 'The police', 'Lockdown: every door sealed');
  }
  if (s.status === 'playing') {
    s.turn++;
    s.ap = AP_PER_TURN;
    // The pulsing lasers may have come on under Leo's feet.
    if (s.layer === 'floor' && tileNow(level, s, s.leo.x, s.leo.y) === 'laser' && lasersActive(level, s)) breakLaser(s, s.leo, 'A laser came on right where Leo stood');
    // Still napping: no action points this turn either.
    if (s.napTurns > 0) s.ap = 0;
  }
  return steps;
}

/** What would happen if Leo stood on p (used to colour the planned path). 0 safe, 1 noticed, 2 caught or alarm. */
export function danger(level: Level, s: State, p: Point): 0 | 1 | 2 {
  if (s.layer !== 'floor') return 0;
  let worst: 0 | 1 | 2 = 0;
  if (tileNow(level, s, p.x, p.y) === 'laser' && lasersActive(level, s)) worst = 2;
  if (tileNow(level, s, p.x, p.y) === 'plate') worst = 2;
  for (const c of s.cameras) if (cameraSees(level, s, c, p.x, p.y)) worst = 2;
  for (const g of s.guards) {
    if (canSmell(s, g, p)) worst = g.mode === 'searching' || g.meter >= 1 || Math.hypot(p.x - g.x, p.y - g.y) <= 1.5 ? 2 : (Math.max(worst, 1) as 0 | 1 | 2);
    if (!guardSees(level, s, g, p.x, p.y)) continue;
    const caught = g.mode === 'searching' || g.meter >= 1 || Math.hypot(p.x - g.x, p.y - g.y) <= 2 || lightNow(level, s, p.x, p.y) === 2;
    worst = caught ? 2 : Math.max(worst, 1) as 0 | 1 | 2;
  }
  return worst;
}
