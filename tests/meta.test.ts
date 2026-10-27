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
  loadSlot,
  loadSlots,
  narratorBuysTutorialLoot,
  newProfile,
  playerLevel,
  priceOf,
  saveSlot,
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

function memoryStore() {
  const store = new Map<string, string>();
  return { store, getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
}

test('three save slots: save, load, and a broken or missing slot loads as nothing', () => {
  const m = memoryStore();
  const p = newProfile();
  p.catnip = 1234;
  saveSlot(m, 1, p);
  assert.equal(loadSlot(m, 1)?.catnip, 1234);
  assert.equal(loadSlot(m, 0), null);
  m.store.set('purrrfect-crime-slot-3', '{not json');
  assert.equal(loadSlot(m, 2), null);
  assert.equal(loadSlot(null, 0), null);
  saveSlot({ setItem: () => { throw new Error('full'); } }, 0, p);
});

test('an M2 save moves into the first empty slot, with no attributes, skills or rooms', () => {
  const m = memoryStore();
  const first = newProfile();
  first.catnip = 5;
  saveSlot(m, 0, first);
  m.store.set('purrrfect-crime-save-v1', JSON.stringify({ version: 1, day: 5, catnip: 777, xp: 900, tutorialDone: true, narratorPaid: true, lairOwned: true, stash: [], nextId: 9, heists: 4, soldTotal: 300, records: {}, papers: [] }));
  const slots = loadSlots(m);
  assert.equal(slots[0]?.catnip, 5);
  assert.equal(slots[1]?.catnip, 777);
  assert.equal(slots[1]?.version, 2);
  assert.deepEqual(slots[1]?.skills, []);
  assert.equal(slots[1]?.rooms.planning, 0);
  assert.equal(m.store.has('purrrfect-crime-save-v1'), false);
});

test('an M3 save loses its difficulty, and Nine Lives becomes Second Wind', async () => {
  const { upgradeProfile } = await import('../src/meta/profile');
  const p = upgradeProfile({ ...newProfile(), difficulty: 'casual', skills: ['pounce', 'cat-nap', 'nine-lives'] });
  assert.ok(p);
  assert.equal('difficulty' in p, false);
  assert.deepEqual(p.skills, ['pounce', 'cat-nap', 'second-wind']);
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

// --- rivals --------------------------------------------------------------------------------------------

test('rivals: none for the first three heists, then a roll that sticks until the heist is played', async () => {
  const { rivalChance, rivalFor } = await import('../src/meta/profile');
  const { NATURAL_HISTORY } = await import('../src/levels/museummile');
  const p = newProfile();
  p.tutorialDone = true;
  p.heists = 3; // the tutorial and two more
  assert.equal(rivalChance(p, 0), 0);
  assert.equal(rivalFor(p, NATURAL_HISTORY, 1), null);
  p.heists = 4;
  delete p.rivals[NATURAL_HISTORY.id];
  assert.equal(rivalChance(p, 0), 0.2);
  assert.equal(rivalChance(p, 4), 0.35);
  // Over many days, about a quarter of rolls bring a rival, never the last one met, arriving on turns 3-7.
  let found = 0;
  for (let day = 1; day <= 400; day++) {
    p.day = day;
    p.lastRival = 'luna';
    delete p.rivals[NATURAL_HISTORY.id];
    const r = rivalFor(p, NATURAL_HISTORY, 1);
    assert.deepEqual(rivalFor(p, NATURAL_HISTORY, 1), r, 'asking again gives the same answer');
    if (!r) continue;
    found++;
    assert.notEqual(r.id, 'luna');
    assert.ok(r.arrive >= 3 && r.arrive <= 7);
    assert.ok(r.entrance < NATURAL_HISTORY.rivalEntrances!.length);
  }
  assert.ok(found > 60 && found < 140, `${found} rivals in 400 rolls`);
  assert.equal(rivalFor({ ...newProfile(), heists: 10, tutorialDone: true }, CORNER_GALLERY, 0), null, 'not in the tutorial (no way in)');
});

test('a rival who wins: the level remembers, the record counts it, the paper says so', () => {
  const p = newProfile();
  const s = play(corner, CORNER_GALLERY_ROUTE);
  // Pretend Luna was in tonight and got the pearl first, leaving Leo the small pieces.
  s.rival = { id: 'luna', name: 'Luna Luck', x: 0, y: 0, facing: 0, arrive: 3, entrance: { x: 0, y: 0 }, phase: 'gone', prize: true, alarmed: false };
  s.inventory = s.inventory.filter((i) => i !== 0);
  s.rivalLoot = [0];
  p.rivals[CORNER_GALLERY.id] = { id: 'luna', arrive: 3, entrance: 0 };
  const r = completeHeist(p, corner, s);
  assert.deepEqual(r.rival, { id: 'luna', won: false });
  assert.equal(p.records[CORNER_GALLERY.id].lostTo, 'luna');
  assert.deepEqual(p.rivalRecord.luna, { won: 0, lost: 1 });
  assert.equal(p.lastRival, 'luna');
  assert.equal(CORNER_GALLERY.id in p.rivals, false, 'a fresh roll next time');
  assert.match(r.paper.headline, /LUNA LUCK BEATS TUXEDO CAT/);
});

test('beating a rival to it pays a bonus and makes the headline', () => {
  const p = newProfile();
  const s = play(corner, CORNER_GALLERY_ROUTE);
  s.rival = { id: 'paws', name: 'Professor Paws', x: 0, y: 0, facing: 0, arrive: 3, entrance: { x: 0, y: 0 }, phase: 'gone', prize: false, alarmed: false };
  s.rivalBeaten = true;
  const r = completeHeist(p, corner, s);
  assert.ok(r.xp.some((l) => l.label === 'Beat Professor Paws to it'));
  assert.match(r.paper.headline, /TUXEDO CAT BEATS PROFESSOR PAWS/);
  assert.deepEqual(p.rivalRecord.paws, { won: 1, lost: 0 });
});
