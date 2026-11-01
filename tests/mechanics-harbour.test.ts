// Harbour mechanics: crates, the lighthouse, the tide, the fish market, light switches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { type GuardDef, type LevelDef, parseLevel } from '../src/core/level';
import {
  beaconTiles,
  danger,
  doAction,
  endTurn,
  flooded,
  key,
  leoReach,
  lightNow,
  moveLeo,
  newHeist,
} from '../src/core/game';

// Harbour: crates, the lighthouse, the tide, the fish market, light switches

const DOCKS: LevelDef = {
  id: 'docks',
  name: 'Docks',
  objective: '',
  ambient: 'dark',
  map: [
    '###################',
    '#@..O.......W.L...#',
    '#.......ttt.......#',
    '#.................#',
    '#.......G.........E',
    '###################',
  ],
  tide: { period: 2 },
  lamps: [{ at: { x: 14, y: 1 }, radius: 2 }],
  switches: [{ at: { x: 12, y: 1 }, lamps: [0] }],
  guards: [],
  loot: [{ at: { x: 8, y: 4 }, name: 'Prize', value: 1000, space: 1, category: 'jewel' }],
};
test('in a crate nobody sees or smells Leo, and guards walk round it', () => {
  // Rex stands still, looking west at the crate; Sniff is right beside it.
  const guards: GuardDef[] = [
    { name: 'Rex', start: { x: 6, y: 1 }, route: [{ x: 6, y: 1 }] },
    { name: 'Sniff', kind: 'sniffer', start: { x: 5, y: 2 }, route: [{ x: 5, y: 2 }] },
  ];
  const level = parseLevel({ ...DOCKS, ambient: 'lit', guards });
  const s = newHeist(level);
  s.guards[0].facing = 4;
  s.guards[1].facing = 2;
  assert.equal(danger(level, s, { x: 4, y: 1 }), 0);
  assert.equal(danger(level, s, { x: 3, y: 1 }), 2);
  s.leo = { x: 4, y: 1 };
  endTurn(level, s);
  assert.equal(s.status, 'playing');
  assert.equal(s.seen, false);
  // Out of the crate, he's in plain view.
  moveLeo(level, s, { x: 3, y: 1 });
  assert.equal(s.status, 'caught');
});
test('the lighthouse beam lights a wedge that turns an eighth each turn', () => {
  const level = parseLevel({ ...DOCKS, beacon: { at: { x: 4, y: 3 }, range: 6, facing: 0 } });
  const s = newHeist(level);
  assert.ok(beaconTiles(level, s).has(key(9, 3)));
  assert.equal(lightNow(level, s, 9, 3), 2);
  assert.equal(lightNow(level, s, 4, 1), 0, 'not behind it');
  endTurn(level, s);
  assert.ok(!beaconTiles(level, s).has(key(9, 3)));
  assert.ok(beaconTiles(level, s).has(key(5, 4)), 'now pointing south-east');
});
test('tidal sand is dry, then under water, every few turns', () => {
  const level = parseLevel(DOCKS);
  const s = newHeist(level);
  s.leo = { x: 7, y: 3 };
  assert.ok(!flooded(level, s));
  assert.ok(leoReach(level, s).cost.has(key(9, 2)));
  endTurn(level, s);
  endTurn(level, s);
  assert.ok(flooded(level, s));
  assert.ok(!leoReach(level, s).cost.has(key(9, 2)));
  endTurn(level, s);
  endTurn(level, s);
  assert.ok(!flooded(level, s));
  assert.throws(() => parseLevel({ ...DOCKS, tide: undefined }), /tide/);
  // Caught on the sand when the tide comes in: washed up on the nearest dry tile, with a splash.
  s.leo = { x: 8, y: 2 };
  endTurn(level, s);
  endTurn(level, s);
  assert.notEqual(level.tiles[s.leo.y][s.leo.x], 'tidal');
  assert.ok(Math.hypot(s.leo.x - 8, s.leo.y - 2) <= 1.01);
  assert.ok(s.log.some((l) => /SPLASH/.test(l)));
});
test('sniffers can’t smell Leo on the fish market floor', () => {
  const guards: GuardDef[] = [
    { name: 'Rex', kind: 'sniffer', start: { x: 10, y: 3 }, route: [{ x: 10, y: 4 }] },
  ];
  const plain = parseLevel({ ...DOCKS, guards });
  const fishy = parseLevel({ ...DOCKS, guards, fishy: [{ x: 9, y: 1, w: 3, h: 4 }] });
  const leo = { x: 10, y: 1 };
  assert.equal(danger(plain, { ...newHeist(plain), leo }, leo), 1);
  assert.equal(danger(fishy, { ...newHeist(fishy), leo }, leo), 0);
});
test('a light switch puts the lamps out; the nearest guard comes and puts them back on', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 16, y: 3 }, route: [{ x: 17, y: 3 }] }];
  const level = parseLevel({ ...DOCKS, guards });
  const s = newHeist(level);
  s.leo = { x: 11, y: 2 };
  assert.equal(lightNow(level, s, 14, 2), 2);
  assert.ok(doAction(level, s, 'lights', { x: 12, y: 1 }));
  assert.equal(lightNow(level, s, 14, 2), 0);
  assert.equal(s.guards[0].mode, 'suspicious');
  s.leo = { x: 1, y: 3 };
  for (let i = 0; i < 3; i++) endTurn(level, s);
  assert.deepEqual(s.lampsOff, []);
  assert.throws(() => parseLevel({ ...DOCKS, switches: [{ at: { x: 12, y: 1 }, lamps: [3] }] }), /lamp/);
});
