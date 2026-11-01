// Ending a turn, plus the look-ahead used for the danger marks on the map.
import { blocksMove, type Level, type Point } from './level';
import { key, type State } from './state';
import { flooded, hiddenAt, lasersActive, tideTurnsLeft, tileNow } from './world';
import { guardTiles, walkable } from './movement';
import { moveLeo, walkPath } from './walk';
import {
  breakLaser,
  canSmell,
  catchLeo,
  checkExposure,
  kennelsNear,
  liftLockdown,
  makeNoise,
} from './noticed';
import { AP_PER_TURN, NOISE } from './constants';
import { type GuardStep, runGuards } from './guards';
import { guardsMeetRival, runRival } from './rival';
import { cameraSees, guardSees } from './sight';
import { lightNow } from './light';

/** A conveyor belt moves Leo 1 tile at the end of his turn, if clear. */
function conveyor(level: Level, s: State): void {
  if (s.layer !== 'floor') return;
  const t = tileNow(level, s, s.leo.x, s.leo.y);
  if (t !== 'belt-e' && t !== 'belt-w') return;
  const to = { x: s.leo.x + (t === 'belt-e' ? 1 : -1), y: s.leo.y };
  if (!walkable(level, s, 'floor', to.x, to.y) || guardTiles(s).has(key(to.x, to.y))) return;
  walkPath(level, s, [s.leo, to], 0);
  s.log.push('The conveyor belt carries Leo along.');
}
/** The tide came in over Leo: it carries him, splashing, to the nearest dry ground. */
function washedUp(level: Level, s: State): void {
  const guards = guardTiles(s);
  let best: Point | null = null;
  for (let y = 0; y < level.h; y++)
    for (let x = 0; x < level.w; x++) {
      const t = tileNow(level, s, x, y);
      if (blocksMove(t) || t === 'exit' || guards.has(key(x, y))) continue;
      if (!best || Math.hypot(x - s.leo.x, y - s.leo.y) < Math.hypot(best.x - s.leo.x, best.y - s.leo.y))
        best = { x, y };
    }
  if (!best) return;
  s.leo = best;
  s.log.push('SPLASH! The tide sweeps Leo off his paws and dumps him on the nearest dry ground.');
  makeNoise(level, s, best, NOISE.splash);
  checkExposure(level, s, best);
}
/** Ends Leo's turn: cameras turn, guards and rival move, alarm counts down. Returns the moves to animate. */
export function endTurn(level: Level, s: State): GuardStep[] {
  if (s.status !== 'playing') return [];
  s.log = [];
  s.noises = [];
  conveyor(level, s);
  for (const c of s.cameras) c.idx = (c.idx + 1) % c.sweep.length;
  checkExposure(level, s, s.leo);
  const steps = s.status === 'playing' ? runGuards(level, s, false) : [];
  if (s.status === 'playing') guardsMeetRival(level, s);
  if (s.status === 'playing') steps.push(...runRival(level, s));
  // Gadgets wear off at the end of the guards' turn.
  for (const c of s.cameras) c.offTurns = Math.max(0, c.offTurns - 1);
  s.lasersOffTurns = Math.max(0, s.lasersOffTurns - 1);
  for (const c of s.smoke) c.turns--;
  s.smoke = s.smoke.filter((c) => c.turns > 0);
  s.napTurns = Math.max(0, s.napTurns - 1);
  for (const p of s.prints) p.turns--;
  s.prints = s.prints.filter((p) => p.turns > 0);
  if (s.status === 'playing' && s.alarm !== null) {
    s.alarm -= 1;
    if (s.alarm <= 0) {
      if (s.alarmByLeo) catchLeo(s, 'The police', 'Lockdown: every door sealed');
      else {
        // A rival's alarm: lockdown, guards hunt the rival, Leo can't leave until it lifts.
        s.alarm = null;
        s.lockdown = true;
        s.lockdownTurns = 4;
        s.log.push(
          `Lockdown! Every exit is sealed while the guards hunt for ${s.alarmBy ?? 'the intruder'}. Lie low: once they've caught them, the doors open and Leo is in the clear.`,
        );
      }
    }
  }
  if (s.status === 'playing' && s.lockdown) {
    const r = s.rival;
    const inside = !!r && (r.phase === 'in' || r.phase === 'leaving');
    // With nobody left to catch, the guards stand down after a few turns of searching.
    if (!inside && --s.lockdownTurns <= 0)
      liftLockdown(s, 'The guards find nobody and the lockdown is lifted.');
  }
  if (s.status === 'playing') {
    s.turn++;
    s.ap = AP_PER_TURN;
    if (level.def.tide && tideTurnsLeft(level, s) === level.def.tide.period) {
      s.log.push(flooded(level, s) ? 'The tide comes in.' : 'The tide goes out.');
      if (s.layer === 'floor' && tileNow(level, s, s.leo.x, s.leo.y) === 'gap') washedUp(level, s);
    }
    // The pulsing lasers may have come on under Leo's feet.
    if (s.layer === 'floor' && tileNow(level, s, s.leo.x, s.leo.y) === 'laser' && lasersActive(level, s))
      breakLaser(s, s.leo, 'A laser came on right where Leo stood');
    // Still napping: no action points this turn either.
    if (s.napTurns > 0) s.ap = 0;
  }
  return steps;
}
/** Danger of standing on p, for coloring the path: 0 safe, 1 noticed, 2 caught or alarm. */
export function danger(level: Level, s: State, p: Point): 0 | 1 | 2 {
  if (s.layer !== 'floor' || hiddenAt(level, s, p)) return 0;
  let worst: 0 | 1 | 2 = 0;
  if (tileNow(level, s, p.x, p.y) === 'laser' && lasersActive(level, s)) worst = 2;
  if (tileNow(level, s, p.x, p.y) === 'plate') worst = 2;
  if (kennelsNear(level, p).length) worst = Math.max(worst, 1) as 0 | 1 | 2;
  for (const c of s.cameras) if (cameraSees(level, s, c, p.x, p.y)) worst = 2;
  for (const g of s.guards) {
    if (canSmell(level, s, g, p))
      worst =
        g.mode === 'searching' || g.meter >= 1 || Math.hypot(p.x - g.x, p.y - g.y) <= 1.5
          ? 2
          : (Math.max(worst, 1) as 0 | 1 | 2);
    if (!guardSees(level, s, g, p.x, p.y)) continue;
    const caught =
      g.kind === 'robo' ||
      g.kind === 'nightclaw' ||
      g.mode === 'searching' ||
      g.meter >= 1 ||
      Math.hypot(p.x - g.x, p.y - g.y) <= 2 ||
      lightNow(level, s, p.x, p.y) === 2;
    worst = caught ? 2 : (Math.max(worst, 1) as 0 | 1 | 2);
  }
  return worst;
}
/** Result of the look-ahead for one tile: the worst thing that happens, and why. */
export type Aftermath = { kind: 'caught' | 'alarm' | 'seen'; why: string } | null;
/**
 * Look-ahead: on a copy of the state, moves Leo to `to` and (if that ends his turn) runs the guards' turn.
 * Only trouble Leo causes counts - a rival's alarm would ring anyway.
 */
export function aftermath(level: Level, s: State, to: Point, endsTurn = true): Aftermath {
  const sim = structuredClone(s);
  sim.log = [];
  if (!(to.x === s.leo.x && to.y === s.leo.y) && !moveLeo(level, sim, to).ok) return null;
  const judge = (): Aftermath => {
    if (sim.status === 'caught')
      return {
        kind: 'caught',
        why: sim.caughtWhy ? `Caught: ${sim.caughtWhy}` : 'Caught when the guards move',
      };
    if (sim.alarmRaised && !s.alarmRaised) {
      const line = sim.log.find((l) => l.startsWith('Alarm!'));
      return {
        kind: 'alarm',
        why: line ? line.replace(/^Alarm! /, 'Alarm: ').replace(/\. Lockdown.*$/, '') : 'Raises the alarm',
      };
    }
    if (sim.seen && !s.seen) return { kind: 'seen', why: 'Spotted when the guards move' };
    return null;
  };
  const now = judge();
  // Leo would still have AP left here, so only the walk counts.
  if (now || sim.status !== 'playing' || !endsTurn) return now;
  endTurn(level, sim);
  return judge();
}
