import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type Level } from '../src/core/level';
import { doAction, endTurn, moveLeo, newHeist, type State } from '../src/core/game';
import { CORNER_GALLERY } from '../src/levels/tutorial';
import { NIGHT_GALLERY } from '../src/levels/prototype';
import { CORNER_GALLERY_ROUTE, NIGHT_GALLERY_ROUTE, type RouteStep } from '../src/levels/routes';
import {
  LAIR_PRICE,
  STARTING_CATNIP,
  buyLair,
  completeHeist,
  demand,
  fenceRate,
  loadProfile,
  narratorBuysTutorialLoot,
  newProfile,
  playerLevel,
  priceOf,
  saveProfile,
  sell,
  xpForLevel,
  type StashItem,
} from '../src/meta/profile';
import { TUTORIAL, advance, type TutorialEvents } from '../src/meta/tutorial';

const corner = parseLevel(CORNER_GALLERY);
const night = parseLevel(NIGHT_GALLERY);

/** Plays a route, calling `each` after every step and every guard turn. */
function play(level: Level, route: RouteStep[][], each?: (s: State) => void): State {
  const s = newHeist(level);
  for (const turn of route) {
    for (const step of turn) {
      const ok = Array.isArray(step) ? moveLeo(level, s, { x: step[0], y: step[1] }).ok : doAction(level, s, step.a as never, { x: step.x, y: step.y });
      assert.ok(ok, `step ${JSON.stringify(step)} failed on turn ${s.turn}`);
      each?.(s);
      if (s.status !== 'playing') break;
    }
    if (s.status !== 'playing') break;
    endTurn(level, s);
    each?.(s);
  }
  return s;
}

// --- the tutorial level -------------------------------------------------------------------------

test('the Corner Gallery can be beaten without ever being seen', () => {
  const s = play(corner, CORNER_GALLERY_ROUTE);
  assert.equal(s.status, 'escaped', `ended ${s.status}: ${s.caughtBy} ${s.caughtWhy}`);
  assert.equal(s.inventory.length, 3);
  assert.equal(s.seen, false);
  assert.equal(s.alarmRaised, false);
});

test('the tutorial steps all complete along the known route', () => {
  const ev: TutorialEvents = { moved: true, dashed: false, rotated: true, onMarble: false };
  let step = 0;
  play(corner, CORNER_GALLERY_ROUTE, (s) => {
    if (s.leo.y <= 4 && s.leo.x >= 17 && s.leo.x <= 19) ev.onMarble = true;
    step = advance(s, ev, step);
    // The dash is optional: the player presses "Got it".
    if (TUTORIAL[step]?.id === 'dash') step++;
  });
  assert.equal(step, TUTORIAL.length);
});

test('crossing the laser hallway on foot sets off the alarm', () => {
  const s = newHeist(corner);
  s.guards = [];
  s.cameras = [];
  s.leo = { x: 13, y: 10 };
  moveLeo(corner, s, { x: 9, y: 10 });
  assert.notEqual(s.alarm, null);
  assert.equal(s.alarmRaised, true);
});

// --- XP and levels ------------------------------------------------------------------------------

test('levels: 150 XP to level 2, each level needs 100 more than the last, capped at 30', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 150);
  assert.equal(xpForLevel(3), 400);
  assert.equal(playerLevel(149), 1);
  assert.equal(playerLevel(150), 2);
  assert.equal(playerLevel(10_000_000), 30);
});

// --- the black market -----------------------------------------------------------------------------

const item = (over: Partial<StashItem> = {}): StashItem => ({
  id: 1,
  name: 'Test Ruby',
  category: 'jewel',
  value: 1000,
  levelId: 'x',
  levelName: 'X',
  centrepiece: false,
  hot: false,
  ...over,
});

test('fences pay more as Leo levels up, up to 95%', () => {
  assert.equal(fenceRate(1), 0.57);
  assert.equal(fenceRate(10), 0.75);
  assert.equal(fenceRate(30), 0.95);
});

test('the fences pay one Catnip per $10 of estimate, before their cut', () => {
  assert.equal(priceOf(newProfile(), item({ category: 'artefact', value: 10_000 })), 570);
});

test('demand rotates every three days, and the wanted category sells for 25% more', () => {
  assert.equal(demand(1), 'jewel');
  assert.equal(demand(3), 'jewel');
  assert.equal(demand(4), 'painting');
  const p = newProfile();
  assert.equal(priceOf(p, item()), Math.round(100 * 0.57 * 1.25));
  assert.equal(priceOf(p, item({ category: 'artefact' })), 57);
});

test('replayed loot is hot and sells for half', () => {
  const p = newProfile();
  assert.equal(priceOf(p, item({ category: 'artefact', value: 2000, hot: true })), 57);
});

test('selling moves the price into Catnip and the lifetime total', () => {
  const p = newProfile();
  p.stash = [item({ id: 7, category: 'artefact' })];
  assert.equal(sell(p, 7), 57);
  assert.equal(p.catnip, 57);
  assert.equal(p.soldTotal, 57);
  assert.equal(p.stash.length, 0);
  assert.equal(sell(p, 7), 0);
});

// --- the opening -------------------------------------------------------------------------------------

test('the opening: tutorial loot goes to the stash, the narrator buys it, and that buys the lair exactly', () => {
  const p = newProfile();
  const s = play(corner, CORNER_GALLERY_ROUTE);
  const r = completeHeist(p, corner, s);
  assert.equal(r.items.length, 3);
  assert.ok(r.centrepiece);
  assert.ok(r.flawless);
  assert.equal(p.stash.length, 3);
  assert.equal(p.heists, 1);
  assert.equal(p.day, 2);
  assert.match(r.paper.headline, /NEW CAT IN TOWN/);
  assert.equal(r.paper.photos.length, 3);
  assert.equal(r.paper.total, 2400 + 650 + 450);
  assert.ok(r.xp.some((l) => l.label === 'Never seen'));
  assert.ok(r.xp.some((l) => l.label === 'The centrepiece'));

  assert.equal(buyLair(p), false, 'no Catnip yet');
  narratorBuysTutorialLoot(p, CORNER_GALLERY.id);
  assert.equal(p.stash.length, 0);
  assert.equal(p.catnip, STARTING_CATNIP);
  assert.equal(buyLair(p), true);
  assert.equal(p.catnip, STARTING_CATNIP - LAIR_PRICE);
  assert.equal(p.lairOwned, true);
  assert.equal(buyLair(p), false, 'only once');
});

test('a heist with an alarm gets no stealth bonus and an alarm headline; a replay brings hot loot', () => {
  const p = newProfile();
  p.heists = 3;
  const s = play(night, NIGHT_GALLERY_ROUTE);
  assert.equal(s.status, 'escaped');
  assert.ok(s.alarmRaised, 'the known route lets Brutus find an empty case');
  const r = completeHeist(p, night, s);
  assert.equal(r.flawless, false);
  assert.ok(!r.xp.some((l) => l.label === 'No alarms'));
  assert.match(r.paper.headline, /ALARM|SIRENS|LOCKDOWN/);
  assert.ok(r.items.every((i) => !i.hot));
  const again = completeHeist(p, night, play(night, NIGHT_GALLERY_ROUTE));
  assert.ok(again.replay);
  assert.ok(again.items.every((i) => i.hot));
  assert.equal(p.records[NIGHT_GALLERY.id].clears, 2);
  assert.equal(p.papers.length, 2);
  assert.equal(p.papers[0].day, again.paper.day, 'newest paper first');
});

test('the same day and heist always print the same paper', () => {
  const a = completeHeist(newProfile(), corner, play(corner, CORNER_GALLERY_ROUTE)).paper;
  const b = completeHeist(newProfile(), corner, play(corner, CORNER_GALLERY_ROUTE)).paper;
  assert.deepEqual(a, b);
});

// --- saving ------------------------------------------------------------------------------------------

test('profiles save and load as JSON, and a broken or missing save loads as nothing', () => {
  const store = new Map<string, string>();
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
  const p = newProfile();
  p.catnip = 1234;
  saveProfile(storage, p);
  assert.equal(loadProfile(storage)?.catnip, 1234);
  store.set('purrrfect-crime-save-v1', '{not json');
  assert.equal(loadProfile(storage), null);
  assert.equal(loadProfile(null), null);
  saveProfile({ setItem: () => { throw new Error('full'); } }, p);
});

test('every paper has text in every story, whatever the day', async () => {
  const { writePaper } = await import('../src/meta/newspaper');
  for (let day = 1; day <= 200; day++)
    for (const seen of [false, true])
      for (const alarm of [false, true]) {
        const paper = writePaper({ day, levelId: `l${day % 7}`, place: 'Somewhere', items: [{ name: 'Thing', value: 100, centrepiece: day % 2 === 0 }], centrepieceName: 'Thing', guards: ['Gus'], seen, alarm, turns: day % 30, first: day === 1, replay: day % 5 === 0 });
        for (const t of [paper.headline, paper.subhead, ...paper.stories.flatMap((s) => [s.title, s.body]), ...paper.photos.map((p) => p.caption)]) assert.equal(typeof t, 'string');
      }
});
