// Moving Leo along a path, step by step, with everything that can happen on the way.
import type { Level, Point } from './level';
import { key, type State } from './state';
import { leoReach, moveAp, pathTo } from './movement';
import { lasersActive, sensorsActive, tileNow } from './world';
import { breakLaser, checkExposure, dogsBark, makeNoise, pickUpCard, triggerAlarm } from './noticed';
import { NOISE, PAINT_STEPS, PRINT_TURNS } from './constants';

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
  const noisy =
    s.layer === 'floor' &&
    (cost === 2 || path.slice(1).some((p) => ['marble', 'squeaky'].includes(tileNow(level, s, p.x, p.y))));
  const ghost = noisy && s.perks.ghostStep && !s.used.ghostStep;
  if (ghost) {
    s.used.ghostStep = true;
    s.log.push('Ghost Step: not a sound.');
  }
  const walked: Point[] = [path[0]];
  const barked = new Set<string>();
  let inZone = 0; // steps taken inside motion-sensor zones this move
  for (const p of path.slice(1)) {
    s.leo = { ...p };
    walked.push(p);
    if (s.layer === 'floor') {
      const t = tileNow(level, s, p.x, p.y);
      if (t === 'laser' && lasersActive(level, s)) breakLaser(s, p, 'Leo broke a laser beam');
      if (t === 'plate')
        triggerAlarm(s, p, 'A pressure plate clicked under Leo’s paw', true, {
          who: 'A pressure plate',
          from: null,
          label: 'Pressure plate!',
        });
      if (level.motion[p.y][p.x] && sensorsActive(s) && ++inZone === 2)
        triggerAlarm(s, p, 'A motion sensor saw Leo move', true, {
          who: 'A motion sensor',
          from: null,
          label: 'Motion sensor!',
        });
      if (t === 'marble' && !ghost) makeNoise(level, s, p, NOISE.marble);
      if (t === 'squeaky' && !ghost) {
        makeNoise(level, s, p, NOISE.squeaky);
        s.log.push('Creeeak!');
      }
      pickUpCard(level, s, p);
      dogsBark(level, s, p, barked);
      if (t === 'paint') {
        if (!s.wetPaws) s.log.push('Squelch. Wet paint: Leo will leave paw prints for a few steps.');
        s.wetPaws = PAINT_STEPS;
      } else if (s.wetPaws > 0) {
        s.wetPaws--;
        s.prints.push({ x: p.x, y: p.y, turns: PRINT_TURNS });
      }
    }
    checkExposure(level, s, p);
    if (s.status !== 'playing') return { ok: true, path: walked };
  }
  if (cost === 2 && s.layer === 'floor' && !ghost) {
    makeNoise(level, s, s.leo, NOISE.dash);
    s.log.push('Dashing makes noise.');
  }
  if (s.layer === 'floor' && s.inventory.length && s.leo.x === level.exit.x && s.leo.y === level.exit.y) {
    if (s.lockdown)
      s.log.push('The exit is sealed: the building is in lockdown until the guards catch the other thief.');
    else s.status = 'escaped';
  }
  return { ok: true, path: walked };
}
