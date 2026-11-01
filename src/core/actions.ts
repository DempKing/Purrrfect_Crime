// Leo's actions: picking locks, taking loot, panels, vents, ladders and the rest.
import { blocksMove, type Level, type Point, the, tileAt } from './level';
import { key, RIVALS, type State } from './state';
import { inventoryUsed, lootAt, tileNow } from './world';
import { guardTiles } from './movement';
import { NOISE, VAULT_DIALS } from './constants';
import { guardSees } from './sight';
import { checkExposure, dogsBark, lightsNoticed, lightsOn, makeNoise } from './noticed';

// Actions: picking locks, smashing glass, panels, vents

export type ActionKind =
  | 'pick-case'
  | 'smash-case'
  | 'take'
  | 'crack-safe'
  | 'pick-door'
  | 'swipe-card'
  | 'read-notes'
  | 'turn-dials'
  | 'lights'
  | 'tap'
  | 'panel'
  | 'fuse'
  | 'enter-vent'
  | 'exit-vent'
  | 'climb-up'
  | 'climb-down'
  | 'drop'
  | 'pick-up';
export interface Action {
  kind: ActionKind;
  at: Point;
  label: string;
  ap: number;
  noise: number;
  /** Why it can't be done right now, if it can't. */
  blocked?: string;
}
/** Next to each other, diagonals included. */
export const near8 = (a: Point, b: Point) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) === 1;
/** Next to each other, no diagonals. */
const near4 = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
/** Puts loot down on Leo's tile to free up space. Free; he can pick it up later. */
export function dropLoot(level: Level, s: State, li: number): boolean {
  if (s.status !== 'playing' || s.layer !== 'floor' || !s.inventory.includes(li)) return false;
  s.inventory = s.inventory.filter((i) => i !== li);
  s.dropped.push({ li, x: s.leo.x, y: s.leo.y });
  s.log.push(`Leo sets down ${the(level.def.loot[li].name)}.`);
  return true;
}
/** Everything Leo can do from where he stands. */
export function actionsHere(level: Level, s: State): Action[] {
  if (s.status !== 'playing') return [];
  const out: Action[] = [];
  const L = s.leo;
  // In a vent: only climbing out (at a grate).
  if (s.layer === 'vent') {
    if (tileAt(level, L.x, L.y) === 'grate')
      out.push({ kind: 'exit-vent', at: L, label: 'Climb out of the vent', ap: 1, noise: 0 });
  } else if (s.layer === 'rafter') {
    // In the rafters: down a ladder, or drop to the floor.
    const below = tileNow(level, s, L.x, L.y);
    if (below === 'ladder')
      out.push({ kind: 'climb-down', at: L, label: 'Climb down the ladder', ap: 1, noise: 0 });
    else if (!blocksMove(below) && !guardTiles(s).has(key(L.x, L.y)))
      out.push({
        kind: 'drop',
        at: L,
        label: s.perks.ceilingClimb ? 'Drop to the floor (silently)' : 'Drop to the floor',
        ap: 1,
        noise: s.perks.ceilingClimb ? 0 : NOISE.drop,
      });
  } else {
    // On the floor: vents and ladders on Leo's own tile...
    if (tileAt(level, L.x, L.y) === 'grate')
      out.push({ kind: 'enter-vent', at: L, label: 'Climb into the vent', ap: 1, noise: 0 });
    if (tileAt(level, L.x, L.y) === 'ladder')
      out.push({ kind: 'climb-up', at: L, label: 'Climb up to the rafters', ap: 1, noise: 0 });
    // ...tapping NightClaw (finale only)...
    const nc = level.def.finale ? s.guards.find((g) => g.kind === 'nightclaw' && near8(L, g)) : undefined;
    const prize = level.plinth ? lootAt(level, level.plinth.x, level.plinth.y) : -1;
    if (nc)
      out.push({
        kind: 'tap',
        at: { x: nc.x, y: nc.y },
        label: 'Tap NightClaw on the shoulder',
        ap: 1,
        noise: 0,
        // Blocked without the prize, or if he's hunting or can see Leo (a heard step is fine).
        blocked: !s.inventory.includes(prize)
          ? 'Not yet: take his prized possession first.'
          : nc.mode === 'searching' || nc.meter >= 1 || guardSees(level, s, nc, L.x, L.y)
            ? 'He’s on his guard. Wait until he isn’t.'
            : undefined,
      });
    // ...and everything on the 8 tiles around him.
    for (let y = L.y - 1; y <= L.y + 1; y++)
      for (let x = L.x - 1; x <= L.x + 1; x++) {
        const p = { x, y };
        if (!near8(L, p)) continue;
        const t = tileNow(level, s, x, y);
        const li = lootAt(level, x, y);
        const loot = li >= 0 ? level.def.loot[li] : null;
        const k = key(x, y);
        const taken = li >= 0 && lootGone(s, li);
        const noRoom =
          loot && inventoryUsed(level, s) + loot.space > s.perks.spaces
            ? `No room: the bag holds ${s.perks.spaces} space${s.perks.spaces === 1 ? '' : 's'}.`
            : undefined;
        // Display case: take (if already open), or pick the lock / smash the glass.
        if (t === 'case' && loot && !taken) {
          if (s.smashed.includes(k))
            out.push({
              kind: 'take',
              at: p,
              label: `Take ${the(loot.name)}`,
              ap: 1,
              noise: 0,
              blocked: noRoom,
            });
          else {
            const done = s.picks[k] ?? 0;
            out.push({
              kind: 'pick-case',
              at: p,
              label:
                s.perks.casePicks > 1
                  ? `Pick the case lock (${done}/${s.perks.casePicks})`
                  : `Pick the lock and take ${the(loot.name)}`,
              ap: 1,
              noise: s.perks.silentPicks ? 0 : NOISE.pick,
              blocked: noRoom,
            });
            out.push({
              kind: 'smash-case',
              at: p,
              label: `Smash the glass and grab ${the(loot.name)}`,
              ap: 1,
              noise: NOISE.smash,
              blocked: noRoom,
            });
          }
        }
        // Safe: crack it over a few goes.
        if (t === 'safe' && loot && !taken) {
          const done = s.picks[k] ?? 0;
          out.push({
            kind: 'crack-safe',
            at: p,
            label:
              s.perks.safeCracks > 1
                ? `Crack the safe (${done}/${s.perks.safeCracks})`
                : `Crack the safe and take ${the(loot.name)}`,
            ap: 1,
            noise: 0,
            blocked: noRoom,
          });
        }
        // Plinth (the centrepiece) and exhibits under lights: just take them.
        if (t === 'plinth' && loot && !taken)
          out.push({ kind: 'take', at: p, label: `Take ${loot.name}`, ap: 1, noise: 0, blocked: noRoom });
        if (t === 'lamp' && loot && !taken)
          out.push({
            kind: 'take',
            at: p,
            label: `Take ${the(loot.name)} from under the light`,
            ap: 1,
            noise: 0,
            blocked: noRoom,
          });
        // Doors (not diagonally): pick, swipe the keycard, or turn the vault dials.
        if (t === 'door' && near4(L, p))
          out.push({
            kind: 'pick-door',
            at: p,
            label:
              s.perks.doorPicks > 1
                ? `Pick the door lock (${s.picks[k] ?? 0}/${s.perks.doorPicks})`
                : 'Open the door',
            ap: 1,
            noise: s.perks.silentPicks ? 0 : NOISE.pick,
          });
        if (t === 'keydoor' && near4(L, p))
          out.push({
            kind: 'swipe-card',
            at: p,
            label: s.card === 'leo' ? 'Swipe the keycard' : 'Open it with the cloned card',
            ap: 1,
            noise: 0,
            blocked:
              s.card === 'leo' || s.perks.masterKey
                ? undefined
                : s.card === 'rival'
                  ? 'A rival swiped the keycard.'
                  : 'Needs the keycard: it’s somewhere in the building.',
          });
        if (t === 'desk' && !s.combination)
          out.push({
            kind: 'read-notes',
            at: p,
            label: 'Search the desk for the combination',
            ap: 1,
            noise: 0,
          });
        if (t === 'vault' && near4(L, p))
          out.push({
            kind: 'turn-dials',
            at: p,
            label: `Turn the vault dials (${s.picks[k] ?? 0}/${VAULT_DIALS})`,
            ap: 1,
            noise: 0,
            blocked: !s.combination
              ? 'Needs the combination: it’s written down somewhere in the building.'
              : level.def.timeLock && s.turn < level.def.timeLock
                ? `The time lock holds the dials until turn ${level.def.timeLock}.`
                : undefined,
          });
        // Light switches, the camera panel and the fuse box.
        const sw =
          t === 'switch' ? (level.def.switches ?? []).find((w) => w.at.x === x && w.at.y === y) : undefined;
        if (sw)
          out.push({
            kind: 'lights',
            at: p,
            label: lightsOn(s, sw.lamps) ? 'Switch off the lights' : 'Switch the lights back on',
            ap: 1,
            noise: 0,
          });
        if (t === 'panel' && !s.camerasOff)
          out.push({
            kind: 'panel',
            at: p,
            label: s.alarm !== null ? 'Shut off the cameras and the alarm' : 'Shut off the cameras',
            ap: 1,
            noise: 0,
          });
        if (t === 'fuse' && !s.lasersOff)
          out.push({
            kind: 'fuse',
            at: p,
            label: s.guards.some((g) => g.kind === 'robo')
              ? 'Cut the power: lasers, sensors and robots'
              : 'Cut the power to the lasers',
            ap: 1,
            noise: 0,
          });
      }
  }
  // Loot Leo put down, on his tile or next to it.
  if (s.layer === 'floor')
    for (const d of s.dropped) {
      if (Math.max(Math.abs(d.x - L.x), Math.abs(d.y - L.y)) > 1) continue;
      const l = level.def.loot[d.li];
      const full =
        inventoryUsed(level, s) + l.space > s.perks.spaces
          ? `No room: the bag holds ${s.perks.spaces} space${s.perks.spaces === 1 ? '' : 's'}.`
          : undefined;
      if (!out.some((a) => a.kind === 'pick-up' && a.at.x === d.x && a.at.y === d.y))
        out.push({
          kind: 'pick-up',
          at: { x: d.x, y: d.y },
          label: `Pick up ${the(l.name)}`,
          ap: 1,
          noise: 0,
          blocked: full,
        });
    }
  // Anything Leo can't afford is shown but blocked.
  for (const a of out) if (!a.blocked && s.ap < a.ap) a.blocked = 'Not enough action points.';
  return out;
}
/** Puts the loot at `at` in Leo's bag. */
function take(level: Level, s: State, at: Point): void {
  const li = lootAt(level, at.x, at.y);
  s.inventory.push(li);
  const l = level.def.loot[li];
  s.log.push(l.revealed ? `Got it. It isn’t treasure at all: it’s ${l.revealed}.` : `Got ${the(l.name)}.`);
  // Leo got the centrepiece first: the rival gives up.
  const r = s.rival;
  if (r && r.phase !== 'gone' && level.plinth && at.x === level.plinth.x && at.y === level.plinth.y) {
    if (r.phase !== 'waiting') s.log.push(RIVALS[r.id].beaten);
    r.phase = 'gone';
    s.rivalBeaten = true;
  }
}
/** Loot that's gone: in Leo's inventory, or taken by a rival. */
export function lootGone(s: State, li: number): boolean {
  return s.inventory.includes(li) || s.rivalLoot.includes(li) || s.dropped.some((d) => d.li === li);
}
/** Does one of Leo's actions at a tile. Returns false if it isn't possible. */
export function doAction(level: Level, s: State, kind: ActionKind, at: Point): boolean {
  const a = actionsHere(level, s).find((x) => x.kind === kind && x.at.x === at.x && x.at.y === at.y);
  if (!a || a.blocked) return false;
  s.ap -= a.ap;
  // Each action changes the state; locks and safes take several goes (counted in s.picks).
  const k = key(at.x, at.y);
  switch (kind) {
    // Locks and keys.
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
    case 'swipe-card':
      s.openDoors.push(k);
      s.log.push('Beep. The light turns green and the door slides open.');
      break;
    // Loot and NightClaw.
    case 'pick-up': {
      const i = s.dropped.findIndex((d) => d.x === at.x && d.y === at.y);
      if (i < 0) return false;
      const [d] = s.dropped.splice(i, 1);
      s.inventory.push(d.li);
      s.log.push(`Leo picks ${the(level.def.loot[d.li].name)} back up.`);
      break;
    }
    case 'tap':
      s.tagged = true;
      s.status = 'escaped';
      s.log.push('Tap, tap. NightClaw turns round, very slowly, and smiles.');
      break;
    // Switches, the desk and the vault.
    case 'lights': {
      const sw = (level.def.switches ?? []).find((w) => w.at.x === at.x && w.at.y === at.y)!;
      if (lightsOn(s, sw.lamps)) {
        s.lampsOff.push(...sw.lamps.filter((i) => !s.lampsOff.includes(i)));
        s.log.push('Click. The lights go out.');
        lightsNoticed(level, s, sw.at);
      } else {
        s.lampsOff = s.lampsOff.filter((i) => !sw.lamps.includes(i));
        s.log.push('Click. The lights come back on.');
      }
      break;
    }
    case 'read-notes':
      s.combination = true;
      s.log.push('Taped under the drawer: the vault combination. Of course it is.');
      break;
    case 'turn-dials':
      s.picks[k] = (s.picks[k] ?? 0) + 1;
      if (s.picks[k] >= VAULT_DIALS) {
        s.openDoors.push(k);
        s.log.push('Clunk. The vault door swings open.');
      } else s.log.push('The first dial clicks home.');
      break;
    // Taking loot.
    case 'smash-case':
      s.smashed.push(k);
      makeNoise(level, s, at, NOISE.smash);
      take(level, s, at);
      s.log.push('CRASH! The glass breaks.');
      break;
    case 'take':
      take(level, s, at);
      break;
    // Power: cameras (and the alarm), and lasers/sensors/robots.
    case 'panel':
      s.camerasOff = true;
      if (s.alarm !== null) s.log.push('Cameras off, alarm silenced.');
      else s.log.push('Cameras off.');
      s.alarm = null;
      break;
    case 'fuse':
      s.lasersOff = true;
      s.log.push(
        s.guards.some((g) => g.kind === 'robo')
          ? 'The lasers flicker and die, and the Robo-Guards power down with a sad little whine.'
          : 'The lasers flicker and die.',
      );
      break;
    // Changing layer: vents and rafters. Coming back to the floor checks if Leo is seen.
    case 'enter-vent':
      s.layer = 'vent';
      s.log.push('Into the vent. Nobody can see Leo in here.');
      break;
    case 'exit-vent':
      s.layer = 'floor';
      dogsBark(level, s, s.leo, new Set());
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
      dogsBark(level, s, s.leo, new Set());
      checkExposure(level, s, s.leo);
      break;
    case 'drop':
      s.layer = 'floor';
      // Ceiling Climb: Leo lands like a cat, without a sound.
      if (s.perks.ceilingClimb) s.log.push('Leo drops down without a sound.');
      else {
        s.log.push('Thump!');
        makeNoise(level, s, s.leo, NOISE.drop);
      }
      dogsBark(level, s, s.leo, new Set());
      checkExposure(level, s, s.leo);
      break;
  }
  return true;
}
