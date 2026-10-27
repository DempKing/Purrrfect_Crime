import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel } from '../src/core/level';
import { AP_PER_TURN, endTurn, guardSees, leoReach, moveLeo, newHeist, planGuard, steal, canSteal, apCost, key } from '../src/core/game';
import { solve } from '../src/core/solver';
import { PROTOTYPE } from '../src/levels/prototype';

const level = parseLevel(PROTOTYPE);

test('the level parses with a start, an exit and a plinth', () => {
  assert.deepEqual(level.start, { x: 1, y: 1 });
  assert.equal(level.tiles[level.exit.y][level.exit.x], 'exit');
  assert.equal(level.tiles[level.plinth.y][level.plinth.x], 'plinth');
});

test('one action point buys five tiles, two buy ten', () => {
  const s = newHeist(level);
  const reach = leoReach(level, s);
  assert.equal(apCost(reach.cost.get(key(6, 1))!), 1);
  assert.equal(apCost(reach.cost.get(key(1, 10))!), 2);
  assert.equal(reach.cost.has(key(7, 1)), false, 'walls block movement');
});

test('moving spends action points; a dash spends both', () => {
  const s = newHeist(level);
  assert.ok(moveLeo(level, s, { x: 4, y: 1 }).ok);
  assert.equal(s.ap, AP_PER_TURN - 1);
  const t = newHeist(level);
  assert.ok(moveLeo(level, t, { x: 1, y: 10 }).ok);
  assert.equal(t.ap, 0);
  assert.equal(moveLeo(level, t, { x: 2, y: 10 }).ok, false, 'no points left');
});

test('guards see in a cone, and walls and pillars block their view', () => {
  const g = { name: 't', x: 9, y: 3, facing: 0, route: [{ x: 17, y: 3 }], target: 0 };
  assert.ok(guardSees(level, g, 13, 3), 'straight ahead');
  assert.equal(guardSees(level, g, 6, 3), false, 'behind');
  assert.equal(guardSees(level, g, 9, 9), false, 'outside the cone');
  assert.equal(guardSees(level, g, 16, 3), false, 'out of range');
  const h = { ...g, x: 9, y: 4 };
  assert.equal(guardSees(level, h, 12, 4), false, 'the pillar at 11,4 blocks the view');
});

test('walking into a guard’s view gets Leo caught mid-move', () => {
  const s = newHeist(level);
  s.leo = { x: 9, y: 5 };
  s.guards[0] = { ...s.guards[0], x: 9, y: 1, facing: 2 };
  const r = moveLeo(level, s, { x: 9, y: 4 });
  assert.equal(s.status, 'caught');
  assert.equal(r.path.at(-1)!.y, 4);
});

test('guards walk their route, four steps a turn', () => {
  const s = newHeist(level);
  const plan = planGuard(level, s.guards[0]);
  assert.equal(plan.length, 4);
  assert.deepEqual([plan[3].x, plan[3].y], [13, 3]);
  endTurn(level, s);
  assert.equal(s.turn, 2);
  assert.equal(s.ap, AP_PER_TURN);
});

test('stealing needs Leo next to the plinth, and escaping needs the loot', () => {
  const s = newHeist(level);
  assert.equal(canSteal(level, s), false);
  s.leo = { x: 11, y: 6 };
  assert.ok(steal(level, s));
  assert.ok(s.hasLoot);
  const t = newHeist(level);
  t.leo = { x: 17, y: 8 };
  t.guards = [];
  moveLeo(level, t, { x: 18, y: 8 });
  assert.equal(t.status, 'playing', 'no loot, no escape');
});

test('the prototype level can be beaten, but not trivially', () => {
  const sol = solve(level);
  assert.ok(sol, 'the solver found no way to win');
  console.log(`solved in ${sol.turns} turns:\n  ${sol.plan.join('\n  ')}`);
  assert.ok(sol.turns >= 4, `too easy: ${sol.turns} turns`);
});
