// The Old Town mechanics, each on a small sandbox level: sleepy, captain and sniffer guards,
// squeaky floorboards, safes, rafters and spotlights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type GuardDef, type LevelDef } from '../src/core/level';
import { BASE_PERKS, actionsHere, roboOff, beaconTiles, danger, doAction, endTurn, flooded, guardSees, guardView, key, leoReach, lightNow, makeNoise, motionTrip, moveLeo, newHeist, planRival, useAbility, type Perks, type RivalPlan, type State } from '../src/core/game';
import { ALL_LEVELS } from '../src/levels';
import { exhibitLoot } from '../src/core/exhibits';

const MAP = [
  '##################',
  '#@...............#',
  '#................#',
  '#.......~~.......#',
  '#................#',
  '#####.######.S...#',
  '#....H.......#...#',
  '#............#...E',
  '##################',
];

function sandbox(guards: GuardDef[], extra: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'sandbox',
    name: 'Sandbox',
    objective: '',
    ambient: 'dark',
    map: MAP,
    rafters: ['', '', '', '', '', '', '     H========='],
    guards,
    loot: [{ at: { x: 13, y: 5 }, name: 'Gold Coin', value: 100, space: 1, category: 'curiosity' }],
    ...extra,
  };
}

function heist(def: LevelDef, perks: Partial<Perks> = {}): { level: ReturnType<typeof parseLevel>; s: State } {
  const level = parseLevel(def);
  return { level, s: newHeist(level, { ...BASE_PERKS, ...perks }) };
}

// --- guards -----------------------------------------------------------------------------------------

test('a sleepy guard dozes at his post: he sees nothing and doesn’t move', () => {
  const { level, s } = heist(sandbox([{ name: 'Dozy', kind: 'sleepy', start: { x: 8, y: 2 }, route: [{ x: 9, y: 2 }] }]));
  const g = s.guards[0];
  assert.equal(g.asleep, true);
  assert.equal(guardSees(level, s, g, 9, 2), false);
  assert.equal(guardView(level, s, g).size, 0);
  s.leo = { x: 10, y: 2 };
  endTurn(level, s);
  assert.deepEqual({ x: g.x, y: g.y }, { x: 8, y: 2 });
  assert.equal(s.status, 'playing');
});

test('noise wakes a sleepy guard; he looks, then goes back to his chair and nods off', () => {
  const { level, s } = heist(sandbox([{ name: 'Dozy', kind: 'sleepy', start: { x: 8, y: 2 }, route: [{ x: 9, y: 2 }] }]));
  const g = s.guards[0];
  s.leo = { x: 7, y: 4 };
  moveLeo(level, s, { x: 8, y: 3 }); // onto the squeaky board, right under his chair (he faces east)
  assert.equal(s.status, 'playing');
  assert.equal(g.asleep, false);
  assert.equal(g.mode, 'suspicious');
  s.leo = { x: 1, y: 7 }; // out of the way
  for (let i = 0; i < 8; i++) endTurn(level, s);
  assert.equal(g.mode, 'patrol');
  assert.equal(g.asleep, true);
  assert.deepEqual({ x: g.x, y: g.y }, { x: 8, y: 2 });
});

test('a captain sees further, and calls nearby guards when he gets suspicious', () => {
  const guards: GuardDef[] = [
    { name: 'Cap', kind: 'captain', start: { x: 7, y: 2 }, route: [{ x: 7, y: 1 }] },
    { name: 'Joe', start: { x: 2, y: 4 }, route: [{ x: 2, y: 3 }] },
  ];
  const lit = heist(sandbox(guards, { ambient: 'lit' }));
  const cap = { ...lit.s.guards[0], facing: 0 };
  assert.ok(guardSees(lit.level, lit.s, cap, 14, 2), '7 tiles in the light');
  assert.ok(!guardSees(lit.level, lit.s, { ...cap, kind: 'watch' }, 14, 2));

  const { level, s } = heist(sandbox(guards));
  s.leo = { x: 10, y: 4 };
  moveLeo(level, s, { x: 9, y: 3 }); // the squeaky board, two tiles from the captain
  assert.equal(s.guards[0].mode, 'suspicious');
  assert.equal(s.guards[1].mode, 'suspicious', 'called over from 5 tiles away');
  assert.ok(s.log.some((l) => l.includes('whistles')));
});

test('a sniffer is short-sighted but smells Leo through a wall', () => {
  const { level, s } = heist(sandbox([{ name: 'Snuffles', kind: 'sniffer', start: { x: 7, y: 4 }, route: [{ x: 7, y: 3 }] }], { ambient: 'lit' }));
  const g = s.guards[0];
  g.facing = 0; // east
  assert.ok(guardSees(level, s, g, 10, 4), '3 tiles in the light');
  assert.ok(!guardSees(level, s, g, 12, 4), 'but not 5');
  assert.ok(guardView(level, s, g).has(key(7, 6)), 'his nose reaches through the wall');
  s.leo = { x: 3, y: 6 };
  moveLeo(level, s, { x: 7, y: 6 }); // behind the wall, 2 tiles south of him
  assert.equal(s.status, 'playing');
  assert.equal(g.mode, 'suspicious');
  assert.ok(s.seen);
  endTurn(level, s); // he follows his nose
  assert.equal(s.status, 'caught', 'a second sniff is a catch');
  assert.equal(s.caughtWhy, 'sniffed him out');
});

// --- the building ------------------------------------------------------------------------------------

test('squeaky floorboards are loud', () => {
  const { level, s } = heist(sandbox([]));
  s.leo = { x: 7, y: 3 };
  moveLeo(level, s, { x: 8, y: 3 });
  assert.equal(s.noises[0].r, 4);
});

test('a safe takes three quiet goes, two with Dexterity', () => {
  const { level, s } = heist(sandbox([]));
  s.leo = { x: 14, y: 4 };
  for (let i = 0; i < 2; i++) assert.ok(doAction(level, s, 'crack-safe', { x: 13, y: 5 }));
  assert.equal(s.inventory.length, 0);
  assert.ok(doAction(level, s, 'crack-safe', { x: 13, y: 5 }) === false, 'out of action points');
  endTurn(level, s);
  assert.ok(doAction(level, s, 'crack-safe', { x: 13, y: 5 }));
  assert.equal(s.inventory.length, 1);
  assert.equal(s.noises.length, 0);
  const deft = heist(sandbox([]), { safeCracks: 2 });
  deft.s.leo = { x: 14, y: 4 };
  doAction(deft.level, deft.s, 'crack-safe', { x: 13, y: 5 });
  doAction(deft.level, deft.s, 'crack-safe', { x: 13, y: 5 });
  assert.equal(deft.s.inventory.length, 1);
});

test('the rafters: anyone can climb a ladder, unseen up there, down by the ladder or with a thump', () => {
  const plain = heist(sandbox([]));
  plain.s.leo = { x: 5, y: 6 };
  assert.equal(actionsHere(plain.level, plain.s).find((a) => a.kind === 'climb-up')!.blocked, undefined, 'no skill needed');

  const { level, s } = heist(sandbox([{ name: 'Joe', start: { x: 10, y: 7 }, route: [{ x: 3, y: 7 }] }], { ambient: 'lit' }));
  s.leo = { x: 5, y: 6 };
  assert.ok(doAction(level, s, 'climb-up', { x: 5, y: 6 }));
  assert.equal(s.layer, 'rafter');
  assert.ok(moveLeo(level, s, { x: 10, y: 6 }).ok, 'along the beam');
  assert.equal(s.seen, false);
  endTurn(level, s);
  assert.equal(s.status, 'playing', 'the guard walks right under him');
  assert.ok(!moveLeo(level, s, { x: 10, y: 5 }).ok, 'only along the beams');
  s.guards = [];
  assert.ok(doAction(level, s, 'drop', s.leo));
  assert.equal(s.layer, 'floor');
  assert.equal(s.noises.at(-1)?.r, 3);
  // With Ceiling Climb the same drop is silent.
  const deft = heist(sandbox([]), { ceilingClimb: true });
  deft.s.leo = { x: 5, y: 6 };
  doAction(deft.level, deft.s, 'climb-up', deft.s.leo);
  moveLeo(deft.level, deft.s, { x: 8, y: 6 });
  deft.s.ap = 2;
  const before = deft.s.noises.length;
  assert.ok(doAction(deft.level, deft.s, 'drop', deft.s.leo));
  assert.equal(deft.s.noises.length, before, 'no thump');
});

test('a spotlight lights its circle, and moves one step a turn', () => {
  const { level, s } = heist(sandbox([], { spotlights: [{ path: [{ x: 3, y: 2 }, { x: 10, y: 2 }], radius: 1 }] }));
  assert.equal(lightNow(level, s, 3, 2), 2);
  assert.equal(lightNow(level, s, 4, 3), 0, 'just outside the circle');
  assert.equal(lightNow(level, s, 10, 2), 0);
  endTurn(level, s);
  assert.equal(lightNow(level, s, 3, 2), 0);
  assert.equal(lightNow(level, s, 10, 2), 2);
});

test('maps reject a ladder without rafters above it, and loot outside cases, safes and plinths', () => {
  assert.throws(() => parseLevel(sandbox([], { rafters: [] })), /ladder/);
  assert.throws(() => parseLevel(sandbox([], { loot: [{ at: { x: 2, y: 2 }, name: 'X', value: 1, space: 1, category: 'jewel' }] })), /loot/);
});

// --- Museum Mile: pressure plates, motion sensors, rivals ------------------------------------------------

const HALL: LevelDef = {
  id: 'hall',
  name: 'Hall',
  objective: '',
  ambient: 'dark',
  map: [
    '##################',
    '#@...............#',
    '#....^...........#',
    '#.......G........#',
    '#................#',
    '#.D..............E',
    '##################',
  ],
  motion: [{ x: 10, y: 1, w: 4, h: 5 }],
  rivalEntrances: [{ x: 16, y: 1 }],
  guards: [],
  loot: [
    { at: { x: 8, y: 3 }, name: 'Prize', value: 1000, space: 1, category: 'jewel' },
    { at: { x: 2, y: 5 }, name: 'Trinket', value: 100, space: 1, category: 'curiosity' },
  ],
};

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
  assert.equal(motionTrip(level, newHeist(level), [{ x: 9, y: 4 }, { x: 10, y: 4 }, { x: 11, y: 4 }]), 2);
  const off = newHeist(level);
  off.lasersOff = true;
  off.leo = { x: 9, y: 4 };
  moveLeo(level, off, { x: 13, y: 4 });
  assert.equal(off.alarm, null);
});

const plan = (id: RivalPlan['id'], arrive = 1): RivalPlan => ({ id, arrive, entrance: 0 });

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

test('a guard who spots a rival sends the guards searching, but it isn’t Leo’s alarm; Luna is never spotted', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 15, y: 3 }, route: [{ x: 15, y: 3 }] }]; // standing still
  const level = parseLevel({ ...HALL, ambient: 'lit', guards });
  const s = newHeist(level, BASE_PERKS, plan('paws', 1));
  s.guards[0].facing = 6; // looking north, at the way in
  endTurn(level, s);
  assert.equal(s.rival!.phase, 'gone');
  assert.equal(s.guards[0].mode, 'searching');
  assert.equal(s.alarm, null);
  assert.equal(s.alarmRaised, false);
  const luna = newHeist(level, BASE_PERKS, plan('luna', 1));
  luna.guards[0].facing = 6;
  endTurn(level, luna);
  assert.equal(luna.rival!.phase, 'in');
});

test('Mittens sets off an alarm (not Leo’s); Sammy pockets loot he passes', () => {
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 2, y: 2 }, route: [{ x: 3, y: 2 }] }];
  const level = parseLevel({ ...HALL, guards });
  const s = newHeist(level, BASE_PERKS, plan('mittens', 1));
  endTurn(level, s);
  endTurn(level, s);
  assert.notEqual(s.alarm, null);
  assert.equal(s.alarmRaised, false);
  // Sammy comes in by the trinket's case.
  const sammyLevel = parseLevel({ ...HALL, rivalEntrances: [{ x: 1, y: 4 }] });
  const t = newHeist(sammyLevel, BASE_PERKS, plan('sammy', 1));
  endTurn(sammyLevel, t);
  endTurn(sammyLevel, t);
  assert.ok(t.rivalLoot.includes(1), 'the trinket');
});

// --- The Heights: keycards, wires over gaps, glass walls, guard dogs, vaults --------------------------------

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
  const g = newHeist(parseLevel({ ...ROOFTOPS, guards: [{ name: 'Rex', start: { x: 14, y: 2 }, route: [{ x: 14, y: 3 }] }] }));
  makeNoise(parseLevel(ROOFTOPS), g, { x: 11, y: 2 }, 6, false);
  assert.equal(g.guards[0].mode, 'patrol', 'he didn’t hear it through the glass');
});

test('a guard dog barks at Leo within 2 tiles, and the guards come to look', () => {
  const def: LevelDef = { ...ROOFTOPS, ambient: 'dark', guards: [{ name: 'Rex', start: { x: 13, y: 5 }, route: [{ x: 13, y: 4 }] }] };
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
  assert.throws(() => parseLevel({ ...ROOFTOPS, map: ROOFTOPS.map.map((r) => r.replace('N', '.')) }), /combination/);
});

test('Sammy pockets a keycard lying near his path', () => {
  // A gap in the glass, so he can get to the prize.
  const lv = parseLevel({ ...ROOFTOPS, rivalEntrances: [{ x: 2, y: 3 }], map: ROOFTOPS.map.map((r, y) => (y === 2 ? r.slice(0, 12) + '.' + r.slice(13) : r)) });
  const s = newHeist(lv, BASE_PERKS, { id: 'sammy', arrive: 1, entrance: 0 });
  endTurn(lv, s);
  endTurn(lv, s);
  assert.equal(s.card, 'rival');
});

// --- Harbour: crates, the lighthouse, the tide, the fish market, light switches -----------------------------

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
  const guards: GuardDef[] = [{ name: 'Rex', kind: 'sniffer', start: { x: 10, y: 3 }, route: [{ x: 10, y: 4 }] }];
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

// --- Downtown: Robo-Guards, slot machines, conveyor belts, wet paint, the time lock ---------------------------

const DOWNTOWN: LevelDef = {
  id: 'downtown',
  name: 'Downtown',
  objective: '',
  ambient: 'dark',
  map: [
    '###################',
    '#@......>>>>......#',
    '#..%..............#',
    '#........<<.......#',
    '#.......G.........#',
    '#F.........Q.N....E',
    '###################',
  ],
  guards: [],
  loot: [{ at: { x: 8, y: 4 }, name: 'Prize', value: 1000, space: 1, category: 'jewel' }],
};

test('a Robo-Guard sees Leo’s heat 4 tiles off in the dark, hears nothing, and powers down at the fuse box', () => {
  const guards: GuardDef[] = [{ name: 'RX-9', kind: 'robo', start: { x: 14, y: 2 }, route: [{ x: 14, y: 2 }] }];
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

// --- The finale: NightClaw ---------------------------------------------------------------------------------

test('NightClaw sees through the dark, catches Leo on sight, and can be tapped on the shoulder from behind', () => {
  const guards: GuardDef[] = [{ name: 'NightClaw', kind: 'nightclaw', start: { x: 10, y: 3 }, route: [{ x: 10, y: 3 }] }];
  const level = parseLevel({ ...DOWNTOWN, finale: true, guards });
  const s = newHeist(level);
  s.guards[0].facing = 4;
  assert.ok(guardSees(level, s, s.guards[0], 7, 3), 'three tiles off, in the dark');
  assert.ok(!guardSees(level, { ...s, guards: [{ ...s.guards[0], kind: 'watch' }] }, { ...s.guards[0], kind: 'watch' }, 7, 3), 'a guard wouldn’t');
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

test('what stands on a pedestal under a light can be stolen', () => {
  const def = ALL_LEVELS.find((l) => l.id === 'l1-coin-museum')!;
  const level = parseLevel(def);
  const extra = exhibitLoot(def);
  assert.ok(extra.length > 0, 'the coin museum has an exhibit under a light');
  assert.equal(level.def.loot.length, def.loot.length + extra.length);
  const at = extra[0].at;
  const li = level.def.loot.findIndex((l) => l.at.x === at.x && l.at.y === at.y);
  const s = newHeist(level);
  s.leo = { x: at.x, y: at.y + 1 };
  const take = actionsHere(level, s).find((a) => a.kind === 'take' && a.at.x === at.x && a.at.y === at.y);
  assert.ok(take, 'Leo can take it from beside it');
  assert.ok(doAction(level, s, 'take', at));
  assert.ok(s.inventory.includes(li));
  // Life-size statues, plants, grandfather clocks and tanks stay put.
  assert.ok(exhibitLoot(ALL_LEVELS.find((l) => l.id === 'l19-aquarium')!).length === 0);
});
