// The rival thief's turn, after the guards'.
import { blocksMove, type Level, type Point, the, tileAt } from './level';
import { DIRS, key, type Rival, RIVALS, type State } from './state';
import { camerasActive, lootAt, tileNow } from './world';
import { type GuardStep, runGuards } from './guards';
import { liftLockdown, makeNoise, triggerAlarm } from './noticed';
import { cameraSees, cameraView, faceToward, guardSees, guardView } from './sight';
import { lootGone } from './actions';
import { CAPTAIN_CALL } from './constants';

// The rival's turn, after the guards'

/** The next tile toward any of the goals for a rival. */
function rivalStep(
  level: Level,
  s: State,
  r: Rival,
  goals: Point[],
  watched: Set<string> | null = null,
): Point | null {
  // Rivals are pros: they get through any door, vault or wire.
  const goal = new Set(goals.map((g) => key(g.x, g.y)));
  if (goal.has(key(r.x, r.y))) return null;
  const ok = (x: number, y: number) => {
    const t = tileNow(level, s, x, y);
    if (watched?.has(key(x, y)) && !goal.has(key(x, y))) return false;
    return (
      (t === 'door' || t === 'keydoor' || t === 'vault' || t === 'wire' || !blocksMove(t)) &&
      !(s.layer === 'floor' && s.leo.x === x && s.leo.y === y)
    );
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
/** The rival's next steps if nothing changes (drawn as footprints). */
export function planRival(level: Level, s: State): Point[] {
  if (!s.rival || s.rival.phase === 'gone' || s.rival.phase === 'waiting') return [];
  const sim = structuredClone(s);
  sim.log = [];
  return runRival(level, sim).map((st) => ({ x: st.to.x, y: st.to.y }));
}
/** The rival's turn: arrive, head for the centrepiece, then leave. */
export function runRival(level: Level, s: State): GuardStep[] {
  const r = s.rival;
  const out: GuardStep[] = [];
  if (!r || r.phase === 'gone' || !level.plinth) return out;
  const centre = lootAt(level, level.plinth.x, level.plinth.y);
  // Arriving: appears at the entrance on their turn.
  if (r.phase === 'waiting') {
    if (s.turn < r.arrive) return out;
    r.phase = 'in';
    s.log.push(RIVALS[r.id].hello);
    out.push({ guard: -1, to: { x: r.x, y: r.y, facing: r.facing } });
    if (rivalSpotted(level, s, r)) return out;
  }
  // Mittens makes a noise far away to pull guards off her.
  if (r.id === 'mittens' && !r.alarmed && s.turn >= r.arrive + 1) {
    r.alarmed = true;
    const far = level.guards
      .flatMap((g) => g.route)
      .reduce((a, b) => (Math.hypot(b.x - r.x, b.y - r.y) > Math.hypot(a.x - r.x, a.y - r.y) ? b : a), {
        x: r.x,
        y: r.y,
      });
    s.log.push('CRASH! Something topples over on the far side of the building.');
    makeNoise(level, s, far, 7, false);
  }
  // Move up to `speed` steps: to the plinth, then back out the way they came.
  const around: Point[] = [];
  for (const d of DIRS) around.push({ x: level.plinth.x + d.x, y: level.plinth.y + d.y });
  const watched = rivalDanger(level, s);
  for (let i = 0; i < RIVALS[r.id].speed; i++) {
    if (r.phase === 'in' && around.some((a) => a.x === r.x && a.y === r.y)) {
      // At the plinth: grabbing the prize uses the rest of the turn.
      r.prize = true;
      s.rivalLoot.push(centre);
      r.phase = 'leaving';
      s.log.push(`${r.name} grabs ${the(level.def.loot[centre].name)}!`);
      break;
    }
    const goals = r.phase === 'in' ? around : [r.entrance];
    // Take a safe path if there is one; after waiting 4 turns, take any path.
    let next =
      rivalStep(level, s, r, goals, watched) ?? ((r.waited ?? 0) >= 4 ? rivalStep(level, s, r, goals) : null);
    let dodged = false;
    // No safe path and a guard is coming: dodge to the nearest safe spot.
    if (!next && watched.has(key(r.x, r.y))) {
      const hide: Point[] = [];
      for (let dy = -6; dy <= 6; dy++)
        for (let dx = -6; dx <= 6; dx++) {
          const x = r.x + dx;
          const y = r.y + dy;
          if (!watched.has(key(x, y)) && !blocksMove(tileNow(level, s, x, y))) hide.push({ x, y });
        }
      if (hide.length) next = rivalStep(level, s, r, hide, watched);
      dodged = !!next;
    }
    // Can't move: count a turn of waiting, or escape if at the exit with the prize.
    if (!next) {
      if (i === 0 && !(r.phase === 'leaving' && r.x === r.entrance.x && r.y === r.entrance.y))
        r.waited = (r.waited ?? 0) + 1;
      if (r.phase === 'leaving' && r.x === r.entrance.x && r.y === r.entrance.y) {
        r.phase = 'gone';
        s.log.push(RIVALS[r.id].won);
      }
      break;
    }
    // Dodging doesn't count as progress, so it still counts as waiting.
    r.waited = dodged ? (i === 0 ? (r.waited ?? 0) + 1 : r.waited) : 0;
    const was = { x: r.x, y: r.y };
    r.facing = faceToward(r, next);
    r.x = next.x;
    r.y = next.y;
    out.push({ guard: -1, to: { x: r.x, y: r.y, facing: r.facing } });
    // After each step: quirks, then has a guard or camera caught them?
    rivalHabits(level, s, r, was);
    if (rivalSpotted(level, s, r)) break;
    camerasSeeRival(level, s, r);
  }
  return out;
}
/** Rival quirks: Sammy grabs loot and keycards he passes; Paws blinds cameras and locks doors. */
function rivalHabits(level: Level, s: State, r: Rival, was: Point): void {
  if (
    r.id === 'sammy' &&
    !s.card &&
    [{ x: 0, y: 0 }, ...DIRS].some((d) => tileAt(level, r.x + d.x, r.y + d.y) === 'keycard')
  ) {
    s.card = 'rival';
    s.log.push('Sammy Swipes pockets the keycard. Typical.');
  }
  if (r.id === 'sammy')
    for (const d of DIRS) {
      const li = lootAt(level, r.x + d.x, r.y + d.y);
      if (li < 0 || lootGone(s, li) || tileAt(level, r.x + d.x, r.y + d.y) !== 'case') continue;
      s.rivalLoot.push(li);
      s.log.push(`Sammy Swipes pockets ${the(level.def.loot[li].name)}.`);
    }
  if (r.id === 'paws') {
    for (const c of s.cameras)
      if (Math.hypot(c.at.x - r.x, c.at.y - r.y) <= 3) c.offTurns = Math.max(c.offTurns, 1);
    if (['door', 'keydoor'].includes(tileAt(level, was.x, was.y)) && (was.x !== r.x || was.y !== r.y)) {
      const k = key(was.x, was.y);
      s.openDoors = s.openDoors.filter((d) => d !== k);
      delete s.picks[k];
    }
  }
}
/** Tiles a rival avoids: what guards see now or after their next move, and tiles next to guards. */
function rivalDanger(level: Level, s: State): Set<string> {
  const out = new Set<string>();
  const near = (p: Point) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.add(key(p.x + dx, p.y + dy));
  };
  // Simulate the guards' next turn to see where they'll be looking.
  const sim = structuredClone(s);
  sim.layer = 'vent';
  sim.log = [];
  runGuards(level, sim, true);
  // And the cameras: being filmed brings the alarm down on everyone.
  for (const c of s.cameras) if (camerasActive(s, c)) for (const k of cameraView(level, s, c)) out.add(k);
  for (const g of [...s.guards, ...sim.guards]) {
    if (g.asleep) continue;
    for (const k of guardView(level, g === sim.guards.find((o) => o === g) ? sim : s, g)) out.add(k);
    near(g);
  }
  return out;
}
/** After the guards move: any guard next to (or seeing) the rival catches them. */
export function guardsMeetRival(level: Level, s: State): void {
  const r = s.rival;
  if (r && (r.phase === 'in' || r.phase === 'leaving')) rivalSpotted(level, s, r);
}
/** A camera that sees the rival raises an alarm (not Leo's). */
function camerasSeeRival(level: Level, s: State, r: Rival): void {
  if (s.alarm !== null || s.lockdown) return;
  const c = s.cameras.find((c) => cameraSees(level, s, c, r.x, r.y));
  if (c)
    triggerAlarm(s, r, `A camera caught ${r.name} on film`, false, {
      who: 'A camera',
      from: c.at,
      label: `${r.name} on camera!`,
    });
}
/** A guard catches the rival: they leave, their loot goes back, guards start searching. Luna is only caught up close. */
function rivalSpotted(level: Level, s: State, r: Rival): boolean {
  // Next to the rival always counts; seeing needs a clear view (and for Luna, being close).
  const g = s.guards.find(
    (g) =>
      !g.asleep &&
      (Math.hypot(g.x - r.x, g.y - r.y) <= 1.5 ||
        (guardSees(level, s, g, r.x, r.y, true) &&
          (r.id !== 'luna' || Math.hypot(g.x - r.x, g.y - r.y) <= 2.5))),
  );
  if (!g) return false;
  const had = s.rivalLoot.length;
  s.log.push(
    `${g.name} collars ${r.name}! The guards haul them off${had ? `, and ${had === 1 ? 'the loot goes' : 'everything they took goes'} back on display` : ''}.`,
  );
  s.rivalLoot = [];
  r.prize = false;
  r.phase = 'gone';
  r.caught = true;
  r.caughtBy = g.name;
  if (s.lockdown) liftLockdown(s, 'With the intruder caught, the lockdown is lifted.');
  for (const o of s.guards) {
    if (o !== g && Math.hypot(o.x - g.x, o.y - g.y) > CAPTAIN_CALL) continue;
    o.asleep = false;
    o.mode = 'searching';
    o.point = { x: r.x, y: r.y };
    o.look = 3;
  }
  return true;
}
