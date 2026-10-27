// The Old Town mechanics, each on a small sandbox level: sleepy, captain and sniffer guards,
// squeaky floorboards, safes, rafters and spotlights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type GuardDef, type LevelDef } from '../src/core/level';
import { BASE_PERKS, actionsHere, danger, doAction, endTurn, guardSees, guardView, key, leoReach, lightNow, makeNoise, motionTrip, moveLeo, newHeist, planRival, useAbility, type Perks, type RivalPlan, type State } from '../src/core/game';

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

test('the rafters: only with Ceiling Climb, unseen up there, down by the ladder or with a thump', () => {
  const plain = heist(sandbox([]));
  plain.s.leo = { x: 5, y: 6 };
  assert.match(actionsHere(plain.level, plain.s).find((a) => a.kind === 'climb-up')!.blocked!, /Ceiling Climb/);

  const { level, s } = heist(sandbox([{ name: 'Joe', start: { x: 10, y: 7 }, route: [{ x: 3, y: 7 }] }], { ambient: 'lit' }), { ceilingClimb: true });
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
  assert.deepEqual(s.guards[0].point, { x: 16, y: 2 });
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
