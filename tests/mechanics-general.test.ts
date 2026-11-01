// General rules: exhibits, the look-ahead, rivals and alarms, dropping loot, notices.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { exhibitLoot } from '../src/core/exhibits';
import {
  actionsHere,
  aftermath,
  BASE_PERKS,
  doAction,
  dropLoot,
  endTurn,
  lootGone,
  moveLeo,
  newHeist,
  triggerAlarm,
} from '../src/core/game';
import { type GuardDef, parseLevel } from '../src/core/level';
import { ALL_LEVELS } from '../src/levels';
import { HALL, heist, plan, sandbox } from './helpers';

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
test('the look-ahead: a tile that looks safe now, but a guard walks into view of it on his turn', () => {
  // Joe walks towards Leo: safe now, caught after Joe's turn.
  const { level, s } = heist(
    sandbox([{ name: 'Joe', start: { x: 12, y: 7 }, route: [{ x: 3, y: 7 }] }], { ambient: 'lit' }),
  );
  s.leo = { x: 4, y: 7 };
  s.guards[0].facing = 4;
  assert.equal(aftermath(level, s, s.leo) !== null, true, 'he walks right up to Leo');
  // With an action point still to spend Leo needn't stay, so only the walk there counts.
  assert.equal(aftermath(level, s, s.leo, false), null, 'standing there for now is safe');
  // Behind the wall, out of his way, the guards' turn passes quietly.
  s.leo = { x: 1, y: 1 };
  assert.equal(aftermath(level, s, s.leo), null);
});
test('a guard who walks into a rival collars them, looking or not', () => {
  // Rex marches along row 1 towards the rival's way in, facing away from her as he passes.
  const guards: GuardDef[] = [{ name: 'Rex', start: { x: 12, y: 1 }, route: [{ x: 16, y: 1 }] }];
  const level = parseLevel({ ...HALL, guards });
  const s = newHeist(level, BASE_PERKS, plan('mittens', 1));
  s.rival!.phase = 'in';
  s.rival!.x = 15;
  s.rival!.y = 1;
  s.guards[0].facing = 4; // looking west, the wrong way
  endTurn(level, s);
  assert.equal(s.rival!.caught, true);
  assert.equal(s.rival!.caughtBy, 'Rex');
});
test('somebody else’s alarm: silenced in time, the run stays flawless; left to ring, the building locks down until the rival is caught', () => {
  const level = parseLevel({
    ...HALL,
    guards: [{ name: 'Rex', start: { x: 4, y: 5 }, route: [{ x: 4, y: 5 }] }],
  });
  const s = newHeist(level, BASE_PERKS, plan('paws', 99));
  triggerAlarm(s, { x: 9, y: 3 }, 'A camera caught Professor Paws on film', false);
  assert.equal(s.alarmByLeo, false);
  assert.equal(s.alarmRaised, false, "not Leo's, so a flawless run is still on");
  // Left to ring: a lockdown, but Leo plays on; the exit is sealed.
  s.rival!.phase = 'in';
  s.rival!.x = 16;
  s.rival!.y = 2;
  s.alarm = 1;
  endTurn(level, s);
  assert.equal(s.status, 'playing');
  assert.equal(s.lockdown, true);
  s.inventory = [1];
  s.leo = { x: 15, y: 5 };
  s.ap = 2;
  moveLeo(level, s, { x: 17, y: 5 });
  assert.equal(s.status, 'playing', 'the exit is sealed');
  // The guards catch the rival: the lockdown lifts and the exit opens.
  s.guards[0].x = 16;
  s.guards[0].y = 3;
  endTurn(level, s);
  assert.equal(s.rival!.caught, true);
  assert.equal(s.lockdown, false);
  s.leo = { x: 15, y: 5 };
  s.ap = 2;
  moveLeo(level, s, { x: 17, y: 5 });
  assert.equal(s.status, 'escaped');
  // Leo's own alarm still ends in the police at the door.
  const t = newHeist(level, BASE_PERKS);
  triggerAlarm(t, { x: 9, y: 3 }, 'test', true);
  t.alarm = 1;
  endTurn(level, t);
  assert.equal(t.status, 'caught');
});
test('putting loot down to make room, and picking it back up', () => {
  const { level, s } = heist(sandbox([]), { spaces: 1 });
  s.leo = { x: 12, y: 5 };
  s.inventory = [0];
  const ap = s.ap;
  assert.ok(dropLoot(level, s, 0), 'free to put down');
  assert.equal(s.ap, ap);
  assert.deepEqual(s.inventory, []);
  assert.deepEqual(s.dropped, [{ li: 0, x: 12, y: 5 }]);
  assert.ok(lootGone(s, 0), 'still not back in its case');
  // It can be picked up again from beside it, for an action point.
  s.leo = { x: 11, y: 5 };
  const pick = actionsHere(level, s).find((a) => a.kind === 'pick-up');
  assert.ok(pick && !pick.blocked);
  assert.ok(doAction(level, s, 'pick-up', pick!.at));
  assert.deepEqual(s.inventory, [0]);
  assert.deepEqual(s.dropped, []);
  // A full bag blocks picking up (bag shrunk to 1 space for the test).
  s.leo = { x: 12, y: 5 };
  s.dropped = [{ li: 0, x: 12, y: 5 }];
  assert.match(actionsHere(level, s).find((a) => a.kind === 'pick-up')!.blocked!, /No room/);
});
test('the player is told who noticed what, and where: missing loot by name, and who caught Leo', () => {
  const { level, s } = heist(
    sandbox([{ name: 'Rex', start: { x: 9, y: 4 }, route: [{ x: 12, y: 4 }] }], { ambient: 'lit' }),
  );
  s.inventory = [0];
  s.leo = { x: 1, y: 1 };
  for (let i = 0; i < 3 && !s.alarmRaised; i++) endTurn(level, s);
  assert.ok(s.alarmRaised, 'Rex sees the open safe');
  const n = s.notices.find((x) => x.kind === 'missing');
  assert.ok(n, 'a notice for the missing loot');
  assert.equal(n.who, 'Rex');
  assert.deepEqual(n.at, { x: 13, y: 5 });
  assert.ok(n.from);
  assert.match(n.label, /Gold Coin/);
  assert.ok(
    s.log.some((l) => l.includes('Gold Coin')),
    s.log.join(' | '),
  );
  // Caught: by whom, from where, and on which tile.
  const t = heist(
    sandbox([{ name: 'Rex', start: { x: 4, y: 2 }, route: [{ x: 4, y: 2 }] }], { ambient: 'lit' }),
  );
  t.s.guards[0].facing = 4;
  moveLeo(t.level, t.s, { x: 3, y: 2 });
  assert.equal(t.s.status, 'caught');
  const c = t.s.notices.find((x) => x.kind === 'caught')!;
  assert.equal(c.who, 'Rex');
  assert.deepEqual(c.from, { x: 4, y: 2 });
  assert.deepEqual(c.at, t.s.leo, 'where Leo was stopped');
});
test('the finale: Leo can walk up behind NightClaw on the marble and tap him, though he hears the last step', () => {
  const level = parseLevel(ALL_LEVELS.find((d) => d.id === 'nc-lair')!);
  const s = newHeist(level);
  s.inventory = [0];
  for (let i = 0; i < 2; i++) endTurn(level, s);
  const nc = s.guards[0];
  s.leo = { x: nc.x - 3, y: nc.y };
  assert.ok(moveLeo(level, s, { x: nc.x - 1, y: nc.y }).ok);
  assert.equal(nc.mode, 'suspicious', 'he heard the step on the marble');
  const tap = actionsHere(level, s).find((a) => a.kind === 'tap');
  assert.ok(tap && !tap.blocked, tap?.blocked);
  assert.ok(doAction(level, s, 'tap', tap.at));
  assert.equal(s.status, 'escaped');
  assert.ok(s.tagged);
  // Hunting for Leo (an alarm), he's on his guard.
  const t = newHeist(level);
  t.inventory = [0];
  for (let i = 0; i < 2; i++) endTurn(level, t);
  t.leo = { x: t.guards[0].x - 1, y: t.guards[0].y };
  t.guards[0].mode = 'searching';
  assert.ok(actionsHere(level, t).find((a) => a.kind === 'tap')?.blocked);
});
