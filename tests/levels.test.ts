// Every level can be beaten flawlessly (never seen, no alarm) on every difficulty: the solver's routes
// in src/levels/solutions.ts are replayed here, so a change to the rules or a map can't quietly break one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, parseLevel } from '../src/core/level';
import { doAction, endTurn, moveLeo, newHeist } from '../src/core/game';
import { ALL_LEVELS, DISTRICTS } from '../src/levels';
import { SOLUTIONS } from '../src/levels/solutions';

for (const def of ALL_LEVELS) {
  test(`${def.name}: a flawless route on every difficulty`, () => {
    for (const d of DIFFICULTIES) {
      const route = SOLUTIONS[def.id]?.[d];
      assert.ok(route, `no route for ${d}: run npm run solve -- ${def.id} ${d} --clean --write`);
      const level = parseLevel(def, d);
      const s = newHeist(level);
      for (const turn of route) {
        for (const st of turn) {
          const ok = Array.isArray(st) ? moveLeo(level, s, { x: st[0], y: st[1] }).ok : doAction(level, s, st.a as never, { x: st.x, y: st.y });
          assert.ok(ok, `${d}: step ${JSON.stringify(st)} failed on turn ${s.turn}`);
          if (s.status !== 'playing') break;
        }
        if (s.status !== 'playing') break;
        endTurn(level, s);
      }
      assert.equal(s.status, 'escaped', `${d}: ended ${s.status} (${s.caughtBy}: ${s.caughtWhy})`);
      assert.equal(s.seen, false, `${d}: seen`);
      assert.equal(s.alarmRaised, false, `${d}: alarm`);
      assert.ok(s.inventory.some((i) => level.plinth && def.loot[i].at.x === level.plinth.x && def.loot[i].at.y === level.plinth.y), `${d}: without the centrepiece`);
    }
  });
}

test('every level has a centrepiece, a checkpoint and loot that fits a fresh inventory', () => {
  for (const def of ALL_LEVELS) {
    const level = parseLevel(def);
    assert.ok(level.plinth, `${def.id}: no plinth`);
    assert.ok(def.checkpoint || def.id.startsWith('l0'), `${def.id}: no checkpoint`);
    for (const l of def.loot) assert.ok(l.space <= 6, `${def.id}: ${l.name} is too big`);
  }
});

test('level ids are unique and every district has levels', () => {
  const ids = ALL_LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const d of DISTRICTS) assert.ok(d.levels.length > 0, d.id);
});
