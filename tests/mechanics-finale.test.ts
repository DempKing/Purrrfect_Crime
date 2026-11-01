// The finale: NightClaw.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { actionsHere, doAction, guardSees, moveLeo, newHeist } from '../src/core/game';
import { type GuardDef, parseLevel } from '../src/core/level';
import { DOWNTOWN } from './helpers';

// The finale: NightClaw

test('NightClaw sees through the dark, catches Leo on sight, and can be tapped on the shoulder from behind', () => {
  const guards: GuardDef[] = [
    { name: 'NightClaw', kind: 'nightclaw', start: { x: 10, y: 3 }, route: [{ x: 10, y: 3 }] },
  ];
  const level = parseLevel({ ...DOWNTOWN, finale: true, guards });
  const s = newHeist(level);
  s.guards[0].facing = 4;
  assert.ok(guardSees(level, s, s.guards[0], 7, 3), 'three tiles off, in the dark');
  assert.ok(
    !guardSees(
      level,
      { ...s, guards: [{ ...s.guards[0], kind: 'watch' }] },
      { ...s.guards[0], kind: 'watch' },
      7,
      3,
    ),
    'a guard wouldn’t',
  );
  s.leo = { x: 11, y: 3 }; // right behind him
  const tap = () => actionsHere(level, s).find((a) => a.kind === 'tap')!;
  assert.match(tap().blocked!, /prized possession/);
  s.inventory = [0];
  assert.ok(doAction(level, s, 'tap', { x: 10, y: 3 }));
  assert.equal(s.status, 'escaped');
  assert.ok(s.tagged);
  const seen = newHeist(level);
  seen.guards[0].facing = 4;
  seen.leo = { x: 5, y: 3 };
  moveLeo(level, seen, { x: 7, y: 3 });
  assert.equal(seen.status, 'caught');
  assert.equal(seen.caughtBy, 'NightClaw');
});
