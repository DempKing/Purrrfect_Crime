// Gadgets and active skills: what each one does and where it can be aimed.
import { blocksMove, blocksSight, type Level, type Point, type Tile } from './level';
import { type Ability, AP_PER_TURN } from './constants';
import { DIRS, key, type State, UNLIMITED } from './state';
import { camerasActive, lasersActive, tileNow } from './world';
import { clearLine } from './sight';
import { guardTiles } from './movement';
import { breakLaser, checkExposure, dogsBark, makeNoise, pickUpCard, triggerAlarm } from './noticed';
import { actionsHere, doAction } from './actions';

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
    const a: AbilityInfo = {
      kind,
      name: ABILITY_NAMES[kind],
      target: ABILITY_TARGET[kind],
      ap: kind === 'second-wind' ? 0 : 1,
      left,
    };
    if (s.status !== 'playing') a.blocked = 'The heist is over.';
    else if (left <= 0) a.blocked = 'None left this heist.';
    else if (s.ap < a.ap) a.blocked = 'Not enough action points.';
    else if (kind === 'second-wind' && s.ap > AP_PER_TURN - 1)
      a.blocked = 'Save it for when you’ve spent a point.';
    else if (s.layer !== 'floor' && kind !== 'cat-nap')
      a.blocked = s.layer === 'vent' ? 'Not from inside a vent.' : 'Not from up in the rafters.';
    else if (a.target !== 'self' && abilityTargets(level, s, kind).size === 0)
      a.blocked = 'Nothing in reach.';
    out.push(a);
  }
  return out;
}
const throwable = (level: Level, s: State, x: number, y: number) => {
  const t = tileNow(level, s, x, y);
  return !blocksMove(t) || t === 'case' || t === 'plinth';
};
/** Thrown things and leaps stop at anything that blocks sight, and at glass. */
const blocksThrow = (t: Tile) => blocksSight(t) || t === 'glass';
/** Tiles an ability can be aimed at from where Leo is. */
export function abilityTargets(level: Level, s: State, kind: Ability): Set<string> {
  const out = new Set<string>();
  const L = s.leo;
  const within = (r: number, ok: (x: number, y: number) => boolean) => {
    for (let y = L.y - r; y <= L.y + r; y++)
      for (let x = L.x - r; x <= L.x + r; x++) {
        if ((x === L.x && y === L.y) || Math.hypot(x - L.x, y - L.y) > r + 0.01) continue;
        if (ok(x, y) && clearLine(level, L, { x, y }, blocksThrow, s)) out.add(key(x, y));
      }
  };
  if (kind === 'bottle-cap') within(ABILITY_RANGE.throw, (x, y) => throwable(level, s, x, y));
  else if (kind === 'decoy-card') within(ABILITY_RANGE.card, (x, y) => !blocksMove(tileNow(level, s, x, y)));
  else if (kind === 'smoke') within(ABILITY_RANGE.smoke, (x, y) => !blocksSight(tileNow(level, s, x, y)));
  else if (kind === 'camera-loop') {
    for (const c of s.cameras)
      if (camerasActive(s, c) && Math.hypot(c.at.x - L.x, c.at.y - L.y) <= ABILITY_RANGE.loop)
        out.add(key(c.at.x, c.at.y));
  } else if (kind === 'pounce') {
    // Two tiles in a straight line, over anything low (a laser, a case, a lamp), onto open floor.
    const guards = guardTiles(s);
    for (const d of DIRS) {
      const mid = tileNow(level, s, L.x + d.x, L.y + d.y);
      const lx = L.x + 2 * d.x;
      const ly = L.y + 2 * d.y;
      if (blocksThrow(mid) || blocksMove(tileNow(level, s, lx, ly)) || guards.has(key(lx, ly))) continue;
      if (
        d.x &&
        d.y &&
        (blocksThrow(tileNow(level, s, L.x + d.x, L.y)) || blocksThrow(tileNow(level, s, L.x, L.y + d.y)))
      )
        continue;
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
      s.log.push(
        `Bzzt! The EMP collar knocks out the lasers${hit ? ` and ${hit} camera${hit === 1 ? '' : 's'}` : ''} for two turns.`,
      );
      break;
    }
    case 'pounce':
      s.leo = { ...at! };
      s.log.push('Pounce!');
      if (tileNow(level, s, at!.x, at!.y) === 'laser' && lasersActive(level, s))
        breakLaser(s, at!, 'Leo landed on a laser beam');
      if (tileNow(level, s, at!.x, at!.y) === 'plate')
        triggerAlarm(s, at!, 'A pressure plate clicked under Leo’s paw', true, {
          who: 'A pressure plate',
          from: null,
          label: 'Pressure plate!',
        });
      pickUpCard(level, s, at!);
      dogsBark(level, s, s.leo, new Set());
      checkExposure(level, s, s.leo);
      if (
        s.status === 'playing' &&
        !s.lockdown &&
        s.inventory.length &&
        s.leo.x === level.exit.x &&
        s.leo.y === level.exit.y
      )
        s.status = 'escaped';
      break;
    case 'second-wind':
      s.ap += 1;
      s.log.push('Second wind: one more action point this turn.');
      break;
    case 'cat-nap':
      s.napTurns = 2;
      s.ap = 0;
      s.log.push(
        'Leo curls up in the shadows. For two turns nobody will notice him, unless they trip over him.',
      );
      break;
  }
  return true;
}
// Kept for the warm-up level and the solver: take the centrepiece from next to its plinth.
export function canSteal(level: Level, s: State): boolean {
  return (
    !!level.plinth &&
    actionsHere(level, s).some(
      (a) => a.kind === 'take' && !a.blocked && a.at.x === level.plinth!.x && a.at.y === level.plinth!.y,
    )
  );
}
export function steal(level: Level, s: State): boolean {
  return !!level.plinth && doAction(level, s, 'take', level.plinth);
}
