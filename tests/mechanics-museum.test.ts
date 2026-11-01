// Museum Mile mechanics: pressure plates, motion sensors and rival thieves.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actionsHere,
  BASE_PERKS,
  doAction,
  endTurn,
  motionTrip,
  moveLeo,
  newHeist,
  planRival,
  useAbility,
} from '../src/core/game';
import { type GuardDef, parseLevel } from '../src/core/level';
import { HALL, plan } from './helpers';

// Museum Mile: pressure plates, motion sensors, rivals

test('a pressure plate sets off the alarm; pouncing over it doesn’t', () => {
  const level = parseLevel(HALL);
  const s = newHeist(level);
  s.leo = { x: 4, y: 2 };
  moveLeo(level, s, { x: 6, y: 2 });
  assert.equal(s.alarmRaised, true);
  const hop = newHeist(level, { ...BASE_PERKS, charges: { pounce: 99 } });
  hop.leo = { x: 4, y: 2 };
  assert.ok(useAbility(level, hop, 'pounce', { x: 6, y: 2 }));
  assert.equal(hop.alarmRaised, false);
});
test('motion sensors: one tile at a time inside the zone, or the alarm; the fuse box turns them off', () => {
  const level = parseLevel(HALL);
  const s = newHeist(level);
  s.leo = { x: 9, y: 4 };
  moveLeo(level, s, { x: 10, y: 4 });
  assert.equal(s.alarm, null, 'one step in is fine');
  endTurn(level, s);
  moveLeo(level, s, { x: 11, y: 4 });
  assert.equal(s.alarm, null, 'and one more, next move');
  moveLeo(level, s, { x: 13, y: 4 });
  assert.notEqual(s.alarm, null, 'two in one move trips it');
  assert.equal(
    motionTrip(level, newHeist(level), [
      { x: 9, y: 4 },
      { x: 10, y: 4 },
      { x: 11, y: 4 },
    ]),
    2,
  );
  const off = newHeist(level);
  off.lasersOff = true;
  off.leo = { x: 9, y: 4 };
  moveLeo(level, off, { x: 13, y: 4 });
  assert.equal(off.alarm, null);
});
test('a rival arrives on their turn, runs for the centrepiece and gets away with it', () => {
  const level = parseLevel(HALL);
  const s = newHeist(level, BASE_PERKS, plan('luna', 2));
  endTurn(level, s);
  assert.equal(s.rival!.phase, 'waiting');
  endTurn(level, s);
  assert.equal(s.rival!.phase, 'in');
  assert.ok(planRival(level, s).length > 0, 'her footprints show');
  for (let i = 0; i < 6 && s.rival!.phase !== 'gone'; i++) endTurn(level, s);
  assert.equal(s.rival!.phase, 'gone');
  assert.deepEqual(s.rivalLoot, [0]);
  s.leo = { x: 7, y: 2 };
  assert.ok(!actionsHere(level, s).some((a) => a.kind === 'take'), 'nothing left to take');
});
test('if Leo takes the centrepiece first, the rival gives up; the race doesn’t spoil a flawless heist', () => {
  const level = parseLevel(HALL);
  const s = newHeist(level, BASE_PERKS, plan('paws', 1));
  endTurn(level, s);
  assert.equal(s.rival!.phase, 'in');
  s.leo = { x: 7, y: 3 };
  assert.ok(doAction(level, s, 'take', { x: 8, y: 3 }));
  assert.equal(s.rival!.phase, 'gone');
  assert.equal(s.rivalBeaten, true);
  assert.equal(s.alarmRaised, false);
});
test('a guard who spots a rival collars them and goes searching, but it isn’t Leo’s alarm; Luna is only caught up close', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 15, y: 3 }, route: [{ x: 15, y: 3 }] }]; // standing still
  const level = parseLevel({ ...HALL, ambient: 'lit', guards });
  const s = newHeist(level, BASE_PERKS, plan('paws', 1));
  s.guards[0].facing = 6; // looking north, at the way in
  endTurn(level, s);
  assert.equal(s.rival!.phase, 'gone');
  assert.equal(s.rival!.caught, true);
  assert.equal(s.rival!.caughtBy, 'Rex');
  assert.equal(s.guards[0].mode, 'searching');
  assert.equal(s.alarm, null);
  assert.equal(s.alarmRaised, false);
  const luna = newHeist(level, BASE_PERKS, plan('luna', 1));
  luna.guards[0].facing = 6;
  endTurn(level, luna);
  assert.equal(luna.rival!.caught, true, 'right under his nose');
  // Further off, the same guard looking straight at her doesn't make her out.
  const far = parseLevel({
    ...HALL,
    ambient: 'lit',
    guards: [{ name: 'Rex', start: { x: 15, y: 5 }, route: [{ x: 15, y: 5 }] }],
  });
  const lucky = newHeist(far, BASE_PERKS, plan('luna', 1));
  lucky.guards[0].facing = 6;
  endTurn(far, lucky);
  assert.equal(lucky.rival!.caught, false);
});
test('Mittens makes a racket far away, not an alarm; Sammy pockets loot he passes', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 2, y: 2 }, route: [{ x: 3, y: 2 }] }];
  const level = parseLevel({ ...HALL, guards });
  const s = newHeist(level, BASE_PERKS, plan('mittens', 1));
  endTurn(level, s);
  endTurn(level, s);
  assert.equal(s.alarm, null);
  assert.ok(s.noises.length > 0 || s.guards[0].mode !== 'patrol', 'the guards heard something');
  // Sammy comes in by the trinket's case.
  const sammyLevel = parseLevel({ ...HALL, rivalEntrances: [{ x: 1, y: 4 }] });
  const t = newHeist(sammyLevel, BASE_PERKS, plan('sammy', 1));
  endTurn(sammyLevel, t);
  endTurn(sammyLevel, t);
  assert.ok(t.rivalLoot.includes(1), 'the trinket');
});
