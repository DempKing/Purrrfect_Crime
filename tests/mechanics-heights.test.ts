// The Heights mechanics: keycards, wires over gaps, glass walls, guard dogs, vaults.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type LevelDef, parseLevel } from '../src/core/level';
import {
  actionsHere,
  BASE_PERKS,
  danger,
  doAction,
  endTurn,
  guardSees,
  key,
  leoReach,
  makeNoise,
  moveLeo,
  newHeist,
} from '../src/core/game';

// The Heights: keycards, wires over gaps, glass walls, guard dogs, vaults

const ROOFTOPS: LevelDef = {
  id: 'rooftops',
  name: 'Rooftops',
  objective: '',
  ambient: 'lit',
  map: [
    '###################',
    '#@.k#.......|.....#',
    '#...K.......|...B.#',
    '#...#.......|.....#',
    '#####___-___|.....#',
    '#...Q.N.....|..G..E',
    '###################',
  ],
  guards: [],
  loot: [{ at: { x: 15, y: 5 }, name: 'Prize', value: 1000, space: 1, category: 'jewel' }],
};
test('a keycard door opens only with the keycard (walk over it to pick it up), or with Keycard Clone', () => {
  const level = parseLevel(ROOFTOPS);
  const s = newHeist(level);
  s.leo = { x: 3, y: 2 };
  assert.ok(!doAction(level, s, 'swipe-card', { x: 4, y: 2 }), 'no card yet');
  assert.match(actionsHere(level, s).find((a) => a.kind === 'swipe-card')!.blocked!, /keycard/);
  assert.ok(!actionsHere(level, s).some((a) => a.kind === 'pick-door'), 'card doors can’t be picked');
  moveLeo(level, s, { x: 3, y: 1 });
  assert.equal(s.card, 'leo');
  moveLeo(level, s, { x: 3, y: 2 });
  endTurn(level, s);
  assert.ok(doAction(level, s, 'swipe-card', { x: 4, y: 2 }));
  assert.ok(moveLeo(level, s, { x: 6, y: 2 }).ok);
  const clone = newHeist(level, { ...BASE_PERKS, masterKey: true });
  clone.leo = { x: 3, y: 2 };
  assert.ok(doAction(level, clone, 'swipe-card', { x: 4, y: 2 }));
});
test('wires cross a gap only with Tightrope; guards see across gaps and through glass, but glass stops sound', () => {
  const level = parseLevel(ROOFTOPS);
  const s = newHeist(level);
  s.leo = { x: 8, y: 3 };
  assert.ok(!leoReach(level, s).cost.has(key(8, 5)), 'no way across without Tightrope');
  const t = newHeist(level, { ...BASE_PERKS, tightrope: true });
  t.leo = { x: 8, y: 3 };
  assert.ok(moveLeo(level, t, { x: 8, y: 5 }).ok);
  const across = { x: 8, y: 5, facing: 6 };
  assert.ok(guardSees(level, s, across, 8, 3), 'across the gap');
  const behindGlass = { x: 14, y: 2, facing: 4 };
  assert.ok(guardSees(level, s, behindGlass, 10, 2), 'through the glass');
  const g = newHeist(
    parseLevel({ ...ROOFTOPS, guards: [{ name: 'Rex', start: { x: 14, y: 2 }, route: [{ x: 14, y: 3 }] }] }),
  );
  makeNoise(parseLevel(ROOFTOPS), g, { x: 11, y: 2 }, 6, false);
  assert.equal(g.guards[0].mode, 'patrol', 'he didn’t hear it through the glass');
});
test('a guard dog barks at Leo within 2 tiles, and the guards come to look', () => {
  const def: LevelDef = {
    ...ROOFTOPS,
    ambient: 'dark',
    guards: [{ name: 'Rex', start: { x: 13, y: 5 }, route: [{ x: 13, y: 4 }] }],
  };
  const level = parseLevel(def);
  const s = newHeist(level);
  s.leo = { x: 14, y: 1 };
  assert.equal(danger(level, s, { x: 15, y: 1 }), 1);
  moveLeo(level, s, { x: 15, y: 1 });
  assert.ok(s.log.some((l) => /Woof/.test(l)));
  assert.equal(s.guards[0].mode, 'suspicious');
  // He goes to look beside the kennel (he can't stand in it).
  assert.ok(Math.max(Math.abs(s.guards[0].point!.x - 16), Math.abs(s.guards[0].point!.y - 2)) === 1);
});
test('a vault door needs the combination from the desk, then two turns of the dials', () => {
  const level = parseLevel(ROOFTOPS);
  const s = newHeist(level);
  s.leo = { x: 5, y: 5 };
  assert.match(actionsHere(level, s).find((a) => a.kind === 'turn-dials')!.blocked!, /combination/);
  assert.ok(doAction(level, s, 'read-notes', { x: 6, y: 5 }));
  assert.ok(s.combination);
  assert.ok(doAction(level, s, 'turn-dials', { x: 4, y: 5 }));
  endTurn(level, s);
  assert.ok(doAction(level, s, 'turn-dials', { x: 4, y: 5 }));
  assert.ok(moveLeo(level, s, { x: 2, y: 5 }).ok);
  assert.throws(
    () => parseLevel({ ...ROOFTOPS, map: ROOFTOPS.map.map((r) => r.replace('N', '.')) }),
    /combination/,
  );
});
test('Sammy pockets a keycard lying near his path', () => {
  // A gap in the glass, so he can get to the prize.
  const lv = parseLevel({
    ...ROOFTOPS,
    rivalEntrances: [{ x: 2, y: 3 }],
    map: ROOFTOPS.map.map((r, y) => (y === 2 ? r.slice(0, 12) + '.' + r.slice(13) : r)),
  });
  const s = newHeist(lv, BASE_PERKS, { id: 'sammy', arrive: 1, entrance: 0 });
  endTurn(lv, s);
  endTurn(lv, s);
  assert.equal(s.card, 'rival');
});
