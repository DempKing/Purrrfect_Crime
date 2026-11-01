// Getting noticed: being seen, smelled or heard, alarms, and what guards do about it.
import { blocksMove, blocksSound, type Level, type Point, tileAt } from './level';
import { DIRS, type Guard, key, type Notice, type State } from './state';
import { lightNow } from './light';
import { ALARM_TURNS, BARK_RANGE, CAPTAIN_CALL, LOOK_TURNS, NOISE, SCENT_RANGE } from './constants';
import { cameraSees, faceToward, guardSees } from './sight';
import { hiddenAt, inRects, tileNow } from './world';
import { near8 } from './actions';

// ---------------------------------------------------------------------------------------------
// Getting noticed

/** Ends the heist. Returns true, so callers can say `return catchLeo(…)`. */
export function catchLeo(s: State, by: string, why: string, from: Point | null = null): boolean {
  s.status = 'caught';
  s.caughtBy = by;
  s.caughtWhy = why;
  note(s, { kind: 'caught', who: by, from, at: { ...s.leo }, label: `Caught by ${by}!` });
  return true;
}
function note(s: State, n: Notice): void {
  (s.notices ??= []).push({
    ...n,
    from: n.from && { x: n.from.x, y: n.from.y },
    at: { x: n.at.x, y: n.at.y },
  });
}
/** A guard sees Leo at p. Returns true if that ended the heist. */
export function spotted(level: Level, s: State, g: Guard, p: Point): boolean {
  if (s.perks.vanish && !s.used.vanish) {
    s.used.vanish = true;
    s.log.push(`Vanish! ${g.name} blinks, and Leo isn't there any more.`);
    return false;
  }
  s.seen = true;
  const close = Math.hypot(p.x - g.x, p.y - g.y) <= 2;
  if (g.kind === 'nightclaw') return catchLeo(s, g.name, '“Not tonight, Leo.” He tips his hat', g);
  if (g.kind === 'robo') {
    if (close) return catchLeo(s, g.name, 'heat signature confirmed', g);
    triggerAlarm(s, p, `${g.name} picked up Leo’s heat signature`, true, {
      who: g.name,
      from: g,
      label: `${g.name} saw Leo!`,
    });
    return false;
  }
  const lit = lightNow(level, s, p.x, p.y) === 2;
  if (g.mode === 'searching' || g.meter >= 1 || close || lit) {
    return catchLeo(s, g.name, close ? 'right in front of him' : lit ? 'in the light' : 'a second time', g);
  }
  note(s, { kind: 'spotted', who: g.name, from: g, at: p, label: `${g.name} glimpsed Leo` });
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
export function smelled(s: State, g: Guard, p: Point): boolean {
  if (s.perks.vanish && !s.used.vanish) {
    s.used.vanish = true;
    s.log.push(`Vanish! ${g.name} sniffs the air and shrugs.`);
    return false;
  }
  s.seen = true;
  if (g.mode === 'searching' || g.meter >= 1 || Math.hypot(p.x - g.x, p.y - g.y) <= 1.5)
    return catchLeo(s, g.name, 'sniffed him out', g);
  note(s, { kind: 'spotted', who: g.name, from: g, at: p, label: `${g.name} smelled Leo` });
  g.meter = 1;
  g.mode = 'suspicious';
  g.point = { ...p };
  g.look = LOOK_TURNS;
  s.log.push(`${g.name} sniffs… and smells cat.`);
  return false;
}
/** A sniffer smells Leo close by, unless Leo's in a vent, the rafters or a crate, or the fish market's stink covers him. */
export const canSmell = (level: Level, s: State, g: Guard, p: Point) =>
  g.kind === 'sniffer' &&
  !g.asleep &&
  s.layer === 'floor' &&
  s.napTurns <= 0 &&
  Math.hypot(p.x - g.x, p.y - g.y) <= SCENT_RANGE + 0.01 &&
  !hiddenAt(level, s, p) &&
  !inRects(level.def.fishy, p);
/** A suspicious captain whistles up the guards near him to look too. */
function captainCalls(s: State, g: Guard, p: Point): void {
  if (g.kind !== 'captain') return;
  for (const o of s.guards) {
    if (
      o === g ||
      o.mode === 'searching' ||
      o.kind === 'robo' ||
      o.kind === 'nightclaw' ||
      Math.hypot(o.x - g.x, o.y - g.y) > CAPTAIN_CALL
    )
      continue;
    if (o.mode === 'patrol') s.log.push(`${g.name} whistles: ${o.name} comes to help.`);
    o.asleep = false;
    o.mode = 'suspicious';
    o.point = { ...p };
    o.look = Math.max(o.look, LOOK_TURNS);
  }
}
/** Sets off the alarm. Only Leo's alarms count against a flawless heist, not a rival's. */
export function triggerAlarm(
  s: State,
  p: Point,
  why: string,
  byLeo = true,
  by?: { who: string; from: Point | null; label: string; kind?: Notice['kind'] },
): void {
  note(s, {
    kind: by?.kind ?? 'alarm',
    who: by?.who ?? 'Alarm',
    from: by?.from ?? null,
    at: p,
    label: by?.label ?? 'Alarm!',
  });
  if (byLeo) s.alarmRaised = true;
  if (s.alarm === null) s.alarmByLeo = byLeo;
  else if (byLeo) s.alarmByLeo = true;
  if (s.alarm === null && (!s.lockdown || byLeo)) {
    s.alarm = ALARM_TURNS;
    s.alarmBy = byLeo ? null : (s.rival?.name ?? 'another thief');
    s.log.push(
      byLeo
        ? `Alarm! ${why}. Lockdown in ${ALARM_TURNS} turns.`
        : `Alarm! ${why}. That's ${s.alarmBy}'s doing, not Leo's: lie low and keep out of sight until it blows over, and none of it will be pinned on him.`,
    );
  } else if (byLeo) s.alarmBy = null;
  for (const g of s.guards) {
    g.asleep = false;
    g.mode = 'searching';
    g.point = { ...p };
    g.look = 3;
  }
}
/** The exits open again. */
export function liftLockdown(s: State, why: string): void {
  s.lockdown = false;
  s.lockdownTurns = 0;
  s.log.push(why);
}
/** Is Leo seen at p right now? Handles guards (suspicion or a catch) and cameras (alarm). */
export function checkExposure(level: Level, s: State, p: Point): void {
  if (s.layer !== 'floor' || s.status !== 'playing' || s.napTurns > 0 || hiddenAt(level, s, p)) return;
  for (const g of s.guards) {
    if (guardSees(level, s, g, p.x, p.y) && spotted(level, s, g, p)) return;
    if (canSmell(level, s, g, p) && smelled(s, g, p)) return;
  }
  for (const c of s.cameras)
    if (cameraSees(level, s, c, p.x, p.y)) {
      s.seen = true;
      triggerAlarm(s, p, 'A camera caught Leo on film', true, {
        who: 'A camera',
        from: c.at,
        label: 'Caught on camera!',
      });
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
      if (blocksSound(t) || seen.has(key(nx, ny))) continue;
      seen.set(key(nx, ny), d + 1);
      queue.push({ x: nx, y: ny });
    }
  }
  return Infinity;
}
/** A sound at p heard r tiles away. Leo's own noises are scaled by Quiet Paws; `fromLeo` false is a thrown object. */
export function makeNoise(level: Level, s: State, p: Point, r: number, fromLeo = true): void {
  if (fromLeo) r = Math.round(r * s.perks.noise);
  // The slot machines drown out anything Leo does among them.
  if (fromLeo && inRects(level.def.loud, p)) r = 0;
  if (r <= 0) return;
  s.noises.push({ x: p.x, y: p.y, r });
  for (const g of s.guards) {
    if (g.kind === 'robo') continue; // robots aren't programmed to be curious
    if (hearingDistance(level, s, p, g, r) > r) continue;
    if (g.asleep) s.log.push(`${g.name} wakes with a snort.`);
    else if (g.mode === 'patrol') s.log.push(`${g.name} heard something.`);
    g.asleep = false;
    if (g.mode !== 'searching') g.mode = 'suspicious';
    g.point = standingSpot(level, s, p, g);
    g.look = Math.max(g.look, LOOK_TURNS);
    captainCalls(s, g, p);
  }
}
/** Where a guard stands to look at p: p itself, or the open tile beside it nearest him (for a kennel, a case, a crate). */
function standingSpot(level: Level, s: State, p: Point, g: Point): Point {
  if (!blocksMove(tileNow(level, s, p.x, p.y))) return { ...p };
  const open = DIRS.map((d) => ({ x: p.x + d.x, y: p.y + d.y })).filter(
    (q) => !blocksMove(tileNow(level, s, q.x, q.y)),
  );
  return (
    open.sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0] ?? { ...p }
  );
}
/** A laser beam broken at p: the alarm, unless the Laser Mirror bounces the first one. */
export function breakLaser(s: State, p: Point, why: string): void {
  if (s.perks.laserMirror && !s.used.laserMirror) {
    s.used.laserMirror = true;
    s.log.push('The laser mirror bounces the beam. Nobody noticed.');
    return;
  }
  triggerAlarm(s, p, why);
}
/** The guard dogs within earshot of p: each barks (once a move, `barked` keeps track), and guards come running. */
export function dogsBark(level: Level, s: State, p: Point, barked: Set<string>): void {
  if (s.layer !== 'floor') return;
  for (const k of kennelsNear(level, p)) {
    if (barked.has(key(k.x, k.y))) continue;
    barked.add(key(k.x, k.y));
    s.log.push('Woof! WOOF! The guard dog has smelled cat.');
    makeNoise(level, s, k, NOISE.bark, false);
  }
}
/** Kennels within barking range of p. */
export function kennelsNear(level: Level, p: Point): Point[] {
  const out: Point[] = [];
  for (let y = p.y - BARK_RANGE; y <= p.y + BARK_RANGE; y++)
    for (let x = p.x - BARK_RANGE; x <= p.x + BARK_RANGE; x++)
      if (tileAt(level, x, y) === 'kennel' && Math.hypot(x - p.x, y - p.y) <= BARK_RANGE + 0.01)
        out.push({ x, y });
  return out;
}
/** Leo walks over the keycard: it's his. */
export function pickUpCard(level: Level, s: State, p: Point): void {
  if (s.layer === 'floor' && !s.card && tileAt(level, p.x, p.y) === 'keycard') {
    s.card = 'leo';
    s.log.push('Leo pockets the keycard.');
  }
}
export const lightsOn = (s: State, lamps: number[]) => lamps.some((i) => !s.lampsOff.includes(i));
/** The lights went out: the nearest guard on his rounds comes over to the switch to put them back on. */
export function lightsNoticed(level: Level, s: State, at: Point): void {
  const front = DIRS.map((d) => ({ x: at.x + d.x, y: at.y + d.y })).filter(
    (p) => !blocksMove(tileAt(level, p.x, p.y)),
  );
  const g = s.guards
    .filter((g) => !g.asleep && g.mode === 'patrol' && g.kind !== 'robo')
    .sort((a, b) => Math.hypot(a.x - at.x, a.y - at.y) - Math.hypot(b.x - at.x, b.y - at.y))[0];
  if (!g || !front.length) return;
  g.mode = 'suspicious';
  g.point = front.sort((a, b) => Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y))[0];
  g.look = 1;
  s.log.push(`${g.name} grumbles about the lights and heads for the switch.`);
}
/** A guard who passes a switch with its lights off puts them back on. */
export function guardFixesLights(level: Level, s: State, g: Guard, dry: boolean): void {
  for (const sw of level.def.switches ?? []) {
    if (!sw.lamps.some((i) => s.lampsOff.includes(i)) || !near8(g, sw.at)) continue;
    s.lampsOff = s.lampsOff.filter((i) => !sw.lamps.includes(i));
    if (!dry) s.log.push(`${g.name} flicks the lights back on.`);
  }
}
