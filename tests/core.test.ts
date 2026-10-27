import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel } from '../src/core/level';
import {
  AP_PER_TURN,
  ALARM_TURNS,
  actionsHere,
  apCost,
  inventoryUsed,
  canSteal,
  doAction,
  endTurn,
  guardSees,
  key,
  leoReach,
  lightAt,
  moveLeo,
  newHeist,
  planGuards,
  steal,
  danger,
  type State,
} from '../src/core/game';
import { solve } from '../src/core/solver';
import { GREY_GALLERY, NIGHT_GALLERY } from '../src/levels/prototype';

const grey = parseLevel(GREY_GALLERY);
const night = parseLevel(NIGHT_GALLERY);

/** A heist with every guard and camera out of the way, for testing one mechanic at a time. */
function quiet(level = night): State {
  const s = newHeist(level);
  s.guards = [];
  s.cameras = [];
  return s;
}

// --- the warm-up level ------------------------------------------------------------------------

test('levels parse: start, exit, plinth, vents line up with grates', () => {
  assert.deepEqual(grey.start, { x: 1, y: 1 });
  assert.equal(night.tiles[night.exit.y][night.exit.x], 'exit');
  assert.ok(night.ducts[3][2] && night.ducts[14][4] && night.ducts[8][22]);
});

test('one action point buys five tiles, two buy ten', () => {
  const s = newHeist(grey);
  const reach = leoReach(grey, s);
  assert.equal(apCost(reach.cost.get(key(6, 1))!), 1);
  assert.equal(apCost(reach.cost.get(key(1, 10))!), 2);
  assert.equal(reach.cost.has(key(7, 1)), false, 'walls block movement');
});

test('moving spends action points; a dash spends both', () => {
  const s = newHeist(grey);
  assert.ok(moveLeo(grey, s, { x: 4, y: 1 }).ok);
  assert.equal(s.ap, AP_PER_TURN - 1);
  const t = newHeist(grey);
  assert.ok(moveLeo(grey, t, { x: 1, y: 10 }).ok);
  assert.equal(t.ap, 0);
  assert.equal(moveLeo(grey, t, { x: 2, y: 10 }).ok, false, 'no points left');
});

test('guards see in a cone, and walls and pillars block their view', () => {
  const s = newHeist(grey);
  const g = { x: 9, y: 3, facing: 0 };
  assert.ok(guardSees(grey, s, g, 13, 3), 'straight ahead');
  assert.equal(guardSees(grey, s, g, 6, 3), false, 'behind');
  assert.equal(guardSees(grey, s, g, 9, 9), false, 'outside the cone');
  assert.equal(guardSees(grey, s, g, 16, 3), false, 'out of range');
  assert.equal(guardSees(grey, s, { x: 9, y: 4, facing: 0 }, 12, 4), false, 'the pillar at 11,4 blocks the view');
});

test('in a lit room, walking into a guard’s view is an instant catch', () => {
  const s = newHeist(grey);
  s.leo = { x: 9, y: 5 };
  Object.assign(s.guards[0], { x: 9, y: 1, facing: 2 });
  const r = moveLeo(grey, s, { x: 9, y: 4 });
  assert.equal(s.status, 'caught');
  assert.equal(r.path.at(-1)!.y, 4);
});

test('stealing needs Leo next to the plinth, and escaping needs loot', () => {
  const s = newHeist(grey);
  assert.equal(canSteal(grey, s), false);
  s.leo = { x: 11, y: 6 };
  assert.ok(steal(grey, s));
  assert.deepEqual(s.inventory, [0]);
  const t = quiet(grey);
  t.leo = { x: 17, y: 8 };
  moveLeo(grey, t, { x: 18, y: 8 });
  assert.equal(t.status, 'playing', 'no loot, no escape');
});

test('the warm-up level can be beaten, but not trivially', () => {
  const sol = solve(grey);
  assert.ok(sol, 'the solver found no way to win');
  assert.ok(sol.turns >= 4, `too easy: ${sol.turns} turns`);
});

// --- light and suspicion ----------------------------------------------------------------------

test('lamps light the floor; shadows stay dark', () => {
  assert.equal(lightAt(night, 9, 4), 2, 'next to a lamp');
  assert.equal(lightAt(night, 11, 2), 1, 'the plinth sits in dim light');
  assert.equal(lightAt(night, 2, 14), 0, 'the service room is dark');
  assert.equal(lightAt(night, 20, 2), 1, 'moonlight in the side gallery');
});

test('in the dark a guard only sees Leo up close', () => {
  const s = quiet();
  const g = { x: 1, y: 12, facing: 2 }; // facing south into the dark service room
  assert.equal(guardSees(night, s, g, 1, 15), false, 'three tiles away in the dark');
  assert.ok(guardSees(night, s, g, 1, 13), 'right next to him');
});

test('a glimpse in dim light makes a guard suspicious; a second look is a catch', () => {
  const s = quiet();
  s.guards = newHeist(night).guards.slice(0, 1);
  Object.assign(s.guards[0], { x: 18, y: 1, facing: 2 }); // in the moonlit side gallery, looking south
  s.leo = { x: 19, y: 7 };
  assert.equal(danger(night, s, { x: 18, y: 4 }), 1, 'noticed, not caught');
  moveLeo(night, s, { x: 18, y: 4 });
  assert.equal(s.status, 'playing');
  assert.equal(s.guards[0].mode, 'suspicious');
  assert.equal(s.guards[0].meter, 1);
  moveLeo(night, s, { x: 19, y: 4 });
  assert.equal(s.status, 'caught');
});

// --- noise ------------------------------------------------------------------------------------

test('marble is noisy and brings a guard over to look', () => {
  const s = quiet();
  s.guards = newHeist(night).guards.slice(0, 1);
  Object.assign(s.guards[0], { x: 7, y: 9, facing: 2 }); // two tiles off, looking away
  s.leo = { x: 6, y: 7 };
  moveLeo(night, s, { x: 8, y: 7 });
  assert.equal(s.guards[0].mode, 'suspicious');
  assert.deepEqual(s.guards[0].point, { x: 8, y: 7 });
  assert.ok(s.noises.length > 0);
});

test('a dash makes noise; walking on carpet does not', () => {
  const s = quiet();
  s.leo = { x: 8, y: 12 };
  moveLeo(night, s, { x: 10, y: 12 });
  assert.equal(s.noises.length, 0);
  const t = quiet();
  t.leo = { x: 8, y: 12 };
  moveLeo(night, t, { x: 16, y: 12 });
  assert.equal(t.ap, 0);
  assert.ok(t.noises.some((n) => n.r === 4));
});

// --- security ---------------------------------------------------------------------------------

test('lasers trip the alarm until the fuse box is cut', () => {
  const s = quiet();
  s.leo = { x: 3, y: 9 };
  assert.equal(danger(night, s, { x: 3, y: 8 }), 2);
  moveLeo(night, s, { x: 3, y: 7 });
  assert.equal(s.alarm, ALARM_TURNS);
  const t = quiet();
  t.leo = { x: 2, y: 9 };
  assert.ok(doAction(night, t, 'fuse', { x: 1, y: 9 }));
  moveLeo(night, t, { x: 3, y: 7 });
  assert.equal(t.alarm, null);
});

test('an alarm counts down to lockdown; the camera panel silences it', () => {
  const s = quiet();
  s.leo = { x: 2, y: 1 };
  s.alarm = 2;
  endTurn(night, s);
  assert.equal(s.alarm, 1);
  assert.ok(doAction(night, s, 'panel', { x: 2, y: 0 }));
  assert.equal(s.alarm, null);
  assert.ok(s.camerasOff);
  const t = quiet();
  t.alarm = 1;
  endTurn(night, t);
  assert.equal(t.status, 'caught');
});

test('cameras raise the alarm when they see Leo', () => {
  const s = newHeist(night);
  s.guards = [];
  s.leo = { x: 12, y: 1 };
  moveLeo(night, s, { x: 12, y: 2 }); // the plinth camera starts facing south-west
  assert.ok(s.alarm !== null);
});

// --- locks, glass, vents, inventory ----------------------------------------------------------

test('a case takes two quiet picks, or one loud smash', () => {
  const s = quiet();
  s.leo = { x: 10, y: 7 };
  assert.ok(doAction(night, s, 'pick-case', { x: 10, y: 6 }));
  assert.equal(s.inventory.length, 0);
  assert.ok(doAction(night, s, 'pick-case', { x: 10, y: 6 }));
  assert.equal(s.inventory.length, 1);
  const t = quiet();
  t.leo = { x: 13, y: 7 };
  assert.ok(doAction(night, t, 'smash-case', { x: 13, y: 6 }));
  assert.equal(t.inventory.length, 1);
  assert.ok(t.noises.some((n) => n.r === 6));
});

test('the inventory has six spaces: big loot has to be left behind', () => {
  const s = quiet();
  s.inventory = [0, 3]; // Night Opal (3) + Golden Yarn Ball (2)
  s.leo = { x: 19, y: 6 };
  assert.equal(inventoryUsed(night, s), 5);
  const smash = actionsHere(night, s).find((a) => a.kind === 'smash-case');
  assert.ok(smash?.blocked, 'the Jade Fish (2) would not fit');
});

test('vents: in through a grate, along the ducts under the walls, out somewhere else, unseen', () => {
  const s = quiet();
  s.leo = { x: 4, y: 14 };
  assert.ok(doAction(night, s, 'enter-vent', { x: 4, y: 14 }));
  assert.equal(s.layer, 'vent');
  for (let i = 0; i < 12 && !(s.leo.x === 22 && s.leo.y === 8); i++) {
    const reach = leoReach(night, s);
    let best = s.leo;
    let bestCost = -1;
    // Crawl as far along the ducts toward the side gallery grate as this turn allows.
    for (const [k, c] of reach.cost) {
      const [x, y] = k.split(',').map(Number);
      if (x === 22 && y === 8) {
        best = { x, y };
        break;
      }
      if (apCost(c) <= s.ap && (x > 5 || y < 11 ? x * 10 - Math.abs(y - 11) : -99) > bestCost) {
        bestCost = x * 10 - Math.abs(y - 11);
        best = { x, y };
      }
    }
    moveLeo(night, s, best);
    endTurn(night, s);
  }
  assert.deepEqual(s.leo, { x: 22, y: 8 });
  assert.ok(doAction(night, s, 'exit-vent', s.leo));
  assert.equal(s.layer, 'floor');
});

test('a locked door takes two picks', () => {
  const s = quiet();
  s.leo = { x: 18, y: 5 };
  doAction(night, s, 'pick-door', { x: 17, y: 5 });
  assert.equal(s.openDoors.length, 0);
  doAction(night, s, 'pick-door', { x: 17, y: 5 });
  assert.deepEqual(s.openDoors, ['17,5']);
});

test('a guard who finds an empty display raises the alarm', () => {
  const s = newHeist(night);
  s.cameras = [];
  s.guards = s.guards.slice(0, 1);
  s.inventory = [1];
  s.smashed = ['10,6'];
  s.leo = { x: 2, y: 14 };
  for (let i = 0; i < 6 && s.alarm === null; i++) endTurn(night, s);
  assert.ok(s.alarm !== null);
});

test('guard footprints preview the next turn without changing anything', () => {
  const s = newHeist(night);
  const before = JSON.stringify(s);
  const plan = planGuards(night, s);
  assert.equal(plan.length, 2);
  assert.ok(plan[0].length >= 1);
  assert.equal(JSON.stringify(s), before);
});

test('the Night Gallery can be beaten: the known route escapes with the Night Opal', async () => {
  const { NIGHT_GALLERY_ROUTE } = await import('../src/levels/routes');
  const s = newHeist(night);
  for (const turn of NIGHT_GALLERY_ROUTE) {
    for (const step of turn) {
      const ok = Array.isArray(step) ? moveLeo(night, s, { x: step[0], y: step[1] }).ok : doAction(night, s, step.a as never, { x: step.x, y: step.y });
      assert.ok(ok, `step ${JSON.stringify(step)} failed on turn ${s.turn}`);
      if (s.status !== 'playing') break;
    }
    if (s.status !== 'playing') break;
    endTurn(night, s);
  }
  assert.equal(s.status, 'escaped', `ended ${s.status}: ${s.caughtBy} ${s.caughtWhy}`);
  assert.ok(s.inventory.includes(0), 'with the Night Opal');
});
