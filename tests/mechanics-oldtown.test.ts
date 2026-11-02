// Old Town mechanics: sleepy, captain and sniffer guards, squeaky floors, safes, rafters, spotlights.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  actionsHere,
  doAction,
  endTurn,
  guardSees,
  guardView,
  key,
  lightNow,
  moveLeo,
} from '../src/core/game';
import { type GuardDef, parseLevel } from '../src/core/level';
import { heist, sandbox } from './helpers';

// Guards

test('a sleepy guard dozes at his post: he sees nothing and doesn’t move', () => {
  const { level, s } = heist(
    sandbox([{ name: 'Dozy', kind: 'sleepy', start: { x: 8, y: 2 }, route: [{ x: 9, y: 2 }] }]),
  );
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
  const { level, s } = heist(
    sandbox([{ name: 'Dozy', kind: 'sleepy', start: { x: 8, y: 2 }, route: [{ x: 9, y: 2 }] }]),
  );
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
  const { level, s } = heist(
    sandbox([{ name: 'Snuffles', kind: 'sniffer', start: { x: 7, y: 4 }, route: [{ x: 7, y: 3 }] }], {
      ambient: 'lit',
    }),
  );
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
// The building

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
  assert.equal(
    actionsHere(plain.level, plain.s).find((a) => a.kind === 'climb-up')!.blocked,
    undefined,
    'no skill needed',
  );

  const { level, s } = heist(
    sandbox([{ name: 'Joe', start: { x: 10, y: 7 }, route: [{ x: 3, y: 7 }] }], { ambient: 'lit' }),
  );
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
  const { level, s } = heist(
    sandbox([], {
      spotlights: [
        {
          path: [
            { x: 3, y: 2 },
            { x: 10, y: 2 },
          ],
          radius: 1,
        },
      ],
    }),
  );
  assert.equal(lightNow(level, s, 3, 2), 2);
  assert.equal(lightNow(level, s, 4, 3), 0, 'just outside the circle');
  assert.equal(lightNow(level, s, 10, 2), 0);
  endTurn(level, s);
  assert.equal(lightNow(level, s, 3, 2), 0);
  assert.equal(lightNow(level, s, 10, 2), 2);
});
test('maps reject a ladder without rafters above it, and loot outside cases, safes and plinths', () => {
  assert.throws(() => parseLevel(sandbox([], { rafters: [] })), /ladder/);
  assert.throws(
    () =>
      parseLevel(
        sandbox([], { loot: [{ at: { x: 2, y: 2 }, name: 'X', value: 1, space: 1, category: 'jewel' }] }),
      ),
    /loot/,
  );
});

test('lock picking minigame: a slipped pick spends the go and makes noise, but sets no pin', () => {
  const { level, s } = heist(sandbox([{ name: 'Rex', start: { x: 8, y: 2 }, route: [{ x: 9, y: 2 }] }]));
  s.leo = { x: 13, y: 4 }; // beside the safe at 13,5
  const ap = s.ap;
  assert.ok(doAction(level, s, 'crack-safe', { x: 13, y: 5 }, { slipped: true }));
  assert.equal(s.ap, ap - 1, 'the go is spent');
  assert.equal(s.picks['13,5'] ?? 0, 0, 'no pin set');
  assert.ok(s.noises.length > 0, 'the lock rattled');
  assert.ok(s.log.some((l) => /CLANK/.test(l)));
  // A clean go still counts.
  assert.ok(doAction(level, s, 'crack-safe', { x: 13, y: 5 }));
  assert.equal(s.picks['13,5'], 1);
});
