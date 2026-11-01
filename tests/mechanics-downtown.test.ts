// Downtown mechanics: Robo-Guards, slot machines, conveyor belts, wet paint, the time lock.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  actionsHere,
  danger,
  doAction,
  endTurn,
  guardSees,
  makeNoise,
  moveLeo,
  newHeist,
  roboOff,
} from '../src/core/game';
import { type GuardDef, parseLevel } from '../src/core/level';
import { DOWNTOWN } from './helpers';

// --- Downtown: Robo-Guards, slot machines, conveyor belts, wet paint, the time lock ---------------------------

test('a Robo-Guard sees Leo’s heat 4 tiles off in the dark, hears nothing, and powers down at the fuse box', () => {
  const guards: GuardDef[] = [
    { name: 'RX-9', kind: 'robo', start: { x: 14, y: 2 }, route: [{ x: 14, y: 2 }] },
  ];
  const level = parseLevel({ ...DOWNTOWN, guards });
  const s = newHeist(level);
  s.guards[0].facing = 4;
  assert.ok(guardSees(level, s, s.guards[0], 11, 2), 'three tiles, in the dark');
  assert.ok(!guardSees(level, s, s.guards[0], 9, 2), 'five is too far');
  assert.ok(!guardSees(level, s, s.guards[0], 11, 2, true), 'an empty case has no heat');
  assert.equal(danger(level, s, { x: 11, y: 2 }), 2);
  makeNoise(level, s, { x: 12, y: 2 }, 6, false);
  assert.equal(s.guards[0].mode, 'patrol', 'robots aren’t curious');
  s.leo = { x: 1, y: 4 };
  assert.ok(doAction(level, s, 'fuse', { x: 1, y: 5 }));
  assert.ok(roboOff(s, s.guards[0]));
  assert.ok(!guardSees(level, s, s.guards[0], 13, 2));
  // Seen from further off, it's the alarm rather than a catch.
  const t = newHeist(level);
  t.guards[0].facing = 4;
  t.leo = { x: 9, y: 2 };
  moveLeo(level, t, { x: 11, y: 2 });
  assert.equal(t.status, 'playing');
  assert.ok(t.alarmRaised);
});
test('nobody hears what Leo does among the slot machines', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 6, y: 4 }, route: [{ x: 6, y: 4 }] }];
  const quiet = parseLevel({ ...DOWNTOWN, guards, loud: [{ x: 1, y: 1, w: 5, h: 3 }] });
  const s = newHeist(quiet);
  makeNoise(quiet, s, { x: 3, y: 1 }, 6);
  assert.equal(s.guards[0].mode, 'patrol');
  makeNoise(quiet, s, { x: 3, y: 1 }, 6, false);
  assert.equal(s.guards[0].mode, 'suspicious', 'a thrown bottle cap still carries');
});
test('conveyor belts carry Leo a tile at the end of each turn', () => {
  const level = parseLevel(DOWNTOWN);
  const s = newHeist(level);
  s.leo = { x: 8, y: 1 };
  endTurn(level, s);
  assert.deepEqual(s.leo, { x: 9, y: 1 });
  s.leo = { x: 10, y: 3 };
  endTurn(level, s);
  assert.deepEqual(s.leo, { x: 9, y: 3 });
  endTurn(level, s);
  assert.deepEqual(s.leo, { x: 8, y: 3 }, 'off the end of the belt');
  endTurn(level, s);
  assert.deepEqual(s.leo, { x: 8, y: 3 });
});
test('wet paint leaves paw prints for four steps; guards follow them; they dry in four turns', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 2, y: 4 }, route: [{ x: 2, y: 4 }] }];
  const level = parseLevel({ ...DOWNTOWN, ambient: 'lit', guards });
  const s = newHeist(level);
  s.guards[0].facing = 4; // looking away while Leo walks
  s.leo = { x: 2, y: 2 };
  moveLeo(level, s, { x: 7, y: 2 });
  assert.equal(s.prints.length, 4);
  s.leo = { x: 17, y: 1 };
  s.guards[0].facing = 0; // and back at the prints
  endTurn(level, s);
  assert.equal(s.guards[0].mode, 'suspicious');
  const dry = newHeist(level);
  dry.guards[0].facing = 4;
  dry.leo = { x: 2, y: 2 };
  moveLeo(level, dry, { x: 7, y: 2 });
  for (let i = 0; i < 4; i++) endTurn(level, dry);
  assert.equal(dry.prints.length, 0);
});
test('a time lock holds the vault dials until its turn', () => {
  const level = parseLevel({ ...DOWNTOWN, timeLock: 3 });
  const s = newHeist(level);
  s.leo = { x: 11, y: 4 };
  s.combination = true;
  assert.match(actionsHere(level, s).find((a) => a.kind === 'turn-dials')!.blocked!, /turn 3/);
  endTurn(level, s);
  endTurn(level, s);
  assert.ok(doAction(level, s, 'turn-dials', { x: 11, y: 5 }));
});
