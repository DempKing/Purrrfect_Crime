import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, type Level } from '../src/core/level';
import {
  BASE_PERKS,
  abilities,
  abilityTargets,
  actionsHere,
  danger,
  doAction,
  endTurn,
  guardSees,
  key,
  leoReach,
  makeNoise,
  moveAp,
  moveLeo,
  newHeist,
  planGuards,
  useAbility,
  type Perks,
  type State,
} from '../src/core/game';
import { CORNER_GALLERY } from '../src/levels/tutorial';
import { NIGHT_GALLERY } from '../src/levels/prototype';
import { NIGHT_GALLERY_ROUTE, type RouteStep } from '../src/levels/routes';
import { collectorWants, completeHeist, newProfile, priceOf, type Profile } from '../src/meta/profile';
import {
  ATTRIBUTES,
  SKILLS,
  attributeCost,
  attributePoints,
  canLearn,
  canRaise,
  canUpgrade,
  learn,
  perksFor,
  raise,
  upgrade,
  xpForLevel,
} from '../src/meta/progression';

const night = parseLevel(NIGHT_GALLERY);
const corner = parseLevel(CORNER_GALLERY);

/** A heist with every guard and camera out of the way, and some perks. */
function quiet(level: Level, perks: Partial<Perks> = {}): State {
  const s = newHeist(level, { ...BASE_PERKS, ...perks });
  s.guards = [];
  s.cameras = [];
  return s;
}

function play(level: Level, route: RouteStep[][]): State {
  const s = newHeist(level);
  for (const turn of route) {
    for (const st of turn) {
      const ok = Array.isArray(st) ? moveLeo(level, s, { x: st[0], y: st[1] }).ok : doAction(level, s, st.a as never, { x: st.x, y: st.y });
      assert.ok(ok, `step ${JSON.stringify(st)} failed on turn ${s.turn}`);
      if (s.status !== 'playing') break;
    }
    if (s.status !== 'playing') break;
    endTurn(level, s);
  }
  return s;
}

test('the Night Gallery, with all its guards, can still be beaten', () => {
  const s = play(night, NIGHT_GALLERY_ROUTE);
  assert.equal(s.status, 'escaped', `${s.caughtBy} ${s.caughtWhy}`);
  assert.ok(s.inventory.includes(0), 'with the Night Opal');
});

test('levels reject guards walking through walls', () => {
  assert.throws(() => parseLevel({ ...CORNER_GALLERY, guards: [{ name: 'X', start: { x: 0, y: 0 }, route: [{ x: 1, y: 1 }] }] }), /in a wall/);
});

// --- attributes, as perks ---------------------------------------------------------------------------

test('Agility: more tiles per action point, and cheaper crawling', () => {
  const s = quiet(night, { movePerAp: 7 });
  assert.equal(moveAp(s, 7), 1);
  assert.equal(moveAp(newHeist(night), 7), 2);
  const vent = quiet(night, { crawl: 1.1 });
  vent.leo = { x: 5, y: 11 };
  vent.layer = 'vent';
  assert.ok(leoReach(night, vent).cost.has(key(14, 11)), 'nine duct tiles for 10 movement');
});

test('Stealth shortens how far guards make Leo out; Blend makes dim light count as dark', () => {
  const g = { x: 11, y: 12, facing: 0 }; // facing east along the moonlit bottom hall
  assert.equal(guardSees(night, quiet(night), g, 15, 12), true, '4 tiles in moonlight');
  assert.equal(guardSees(night, quiet(night, { sight: 0.7 }), g, 15, 12), false);
  assert.equal(guardSees(night, quiet(night, { blend: true }), g, 13, 12), false);
  assert.equal(guardSees(night, quiet(night, { blend: true }), g, 13, 12, true), true, 'an empty case is still an empty case');
});

test('Quiet Paws: Leo’s noises are smaller; a thrown bottle cap isn’t', () => {
  const s = quiet(night, { noise: 0.4 });
  makeNoise(night, s, { x: 10, y: 12 }, 6);
  makeNoise(night, s, { x: 10, y: 12 }, 4, false);
  assert.deepEqual(s.noises.map((n) => n.r), [2, 4]);
});

test('Dexterity: cases in one go, doors in one go, silent picks', () => {
  const s = quiet(night, { casePicks: 1, doorPicks: 1, silentPicks: true });
  s.leo = { x: 20, y: 3 };
  assert.ok(doAction(night, s, 'pick-case', { x: 19, y: 2 }));
  assert.equal(s.inventory.length, 1);
  assert.equal(s.noises.length, 0);
  s.leo = { x: 18, y: 5 };
  assert.ok(doAction(night, s, 'pick-door', { x: 17, y: 5 }));
  assert.ok(s.openDoors.includes(key(17, 5)));
});

test('Pockets: more inventory space', () => {
  const room = (spaces: number) => {
    const s = quiet(night, { spaces });
    s.inventory = [0, 3]; // the Night Opal (3) and the Golden Yarn Ball (2): 5 spaces
    s.leo = { x: 19, y: 6 };
    return actionsHere(night, s).find((a) => a.kind === 'smash-case' && a.at.x === 20 && a.at.y === 6)!; // the Jade Fish (2)
  };
  assert.match(room(6).blocked!, /No room/);
  assert.equal(room(7).blocked, undefined);
});

test('Perception: footprints for more turns ahead', () => {
  const one = planGuards(night, newHeist(night));
  const three = planGuards(night, newHeist(night, { ...BASE_PERKS, previewTurns: 3 }));
  assert.ok(three[0].length > one[0].length * 2);
});

// --- skills and gadgets ---------------------------------------------------------------------------

test('Ghost Step silences the first noisy move only', () => {
  const s = quiet(night, { ghostStep: true });
  s.leo = { x: 8, y: 4 };
  moveLeo(night, s, { x: 10, y: 4 }); // marble
  assert.equal(s.noises.length, 0);
  moveLeo(night, s, { x: 12, y: 4 });
  assert.ok(s.noises.length > 0);
});

test('Laser Mirror bounces the first laser; the second one sets off the alarm', () => {
  const s = quiet(night, { laserMirror: true });
  s.leo = { x: 3, y: 7 }; // the west wing: one row of beams
  moveLeo(night, s, { x: 3, y: 9 });
  assert.equal(s.alarm, null);
  moveLeo(night, s, { x: 3, y: 7 });
  assert.notEqual(s.alarm, null);
});

test('Vanish: the first glimpse doesn’t count', () => {
  const s = newHeist(night, { ...BASE_PERKS, vanish: true });
  s.guards = [{ ...s.guards[0], x: 11, y: 12, facing: 0 }];
  s.cameras = [];
  s.leo = { x: 18, y: 12 };
  moveLeo(night, s, { x: 15, y: 12 }); // into moonlight in front of him
  assert.equal(s.status, 'playing');
  assert.equal(s.seen, false);
  assert.equal(s.guards[0].mode, 'patrol');
});

test('Second Wind: once a heist, one more action point after spending one', () => {
  const s = quiet(night, { charges: { 'second-wind': 1 } });
  s.leo = { x: 8, y: 12 };
  assert.match(abilities(night, s)[0].blocked!, /spent a point/);
  moveLeo(night, s, { x: 10, y: 12 });
  assert.equal(s.ap, 1);
  assert.ok(useAbility(night, s, 'second-wind'));
  assert.equal(s.ap, 2);
  assert.equal(s.charges['second-wind'], 0);
});

test('a bottle cap draws a guard to where it lands', () => {
  const s = newHeist(night, { ...BASE_PERKS, charges: { 'bottle-cap': 1 } });
  s.cameras = [];
  s.leo = { x: 20, y: 13 };
  const bruno = s.guards[1];
  bruno.x = 17;
  bruno.y = 13;
  assert.ok(abilityTargets(night, s, 'bottle-cap').has(key(16, 15)));
  assert.ok(useAbility(night, s, 'bottle-cap', { x: 16, y: 15 }));
  assert.equal(bruno.mode, 'suspicious');
  assert.deepEqual(bruno.point, { x: 16, y: 15 });
  assert.equal(s.charges['bottle-cap'], 0);
  assert.equal(abilities(night, s)[0].blocked, 'None left this heist.');
});

test('a decoy card: the first guard to see it walks over and pockets it', () => {
  const s = newHeist(night, { ...BASE_PERKS, charges: { 'decoy-card': 1 } });
  s.cameras = [];
  s.guards = [s.guards[1]]; // Bruno, walking east along the bottom hall from 8,13
  s.leo = { x: 14, y: 11 }; // in the dark, out of his sight
  assert.ok(useAbility(night, s, 'decoy-card', { x: 11, y: 13 }));
  endTurn(night, s);
  assert.equal(s.decoys.length, 0, 'picked up');
});

test('smoke blocks sight into and through it for two turns', () => {
  const s = newHeist(night, { ...BASE_PERKS, charges: { smoke: 1 } });
  s.cameras = [];
  const g = { x: 11, y: 12, facing: 0 };
  s.leo = { x: 17, y: 12 };
  assert.ok(guardSees(night, s, g, 14, 12));
  assert.ok(useAbility(night, s, 'smoke', { x: 13, y: 12 }));
  assert.ok(!guardSees(night, s, g, 14, 12), 'through');
  assert.ok(!guardSees(night, s, g, 13, 13), 'into');
  s.guards = [];
  endTurn(night, s);
  endTurn(night, s);
  assert.equal(s.smoke.length, 0);
});

test('camera loop, fuse kit and EMP collar switch things off for a while', () => {
  const s = newHeist(night, { ...BASE_PERKS, charges: { 'camera-loop': 1, 'fuse-kit': 1, emp: 1 } });
  s.guards = [];
  s.leo = { x: 18, y: 12 };
  assert.ok(useAbility(night, s, 'camera-loop', { x: 22, y: 12 }));
  assert.equal(danger(night, s, { x: 20, y: 13 }), 0);
  s.ap = 2;
  assert.ok(useAbility(night, s, 'fuse-kit'));
  assert.equal(s.lasersOffTurns, 3);
  for (let i = 0; i < 3; i++) endTurn(night, s);
  assert.equal(s.cameras[1].offTurns, 0);
  assert.equal(s.lasersOffTurns, 0);
  s.leo = { x: 13, y: 3 };
  assert.ok(useAbility(night, s, 'emp'));
  assert.equal(s.cameras[0].offTurns, 2, 'the camera at 14,1 is in range');
  assert.equal(s.cameras[1].offTurns, 0, 'the one at 22,12 is not');
});

test('Pounce leaps two tiles over a laser without setting it off, but not onto one', () => {
  const s = quiet(night, { charges: { pounce: 99 } });
  s.leo = { x: 3, y: 7 }; // north of the west wing's lasers
  const targets = abilityTargets(night, s, 'pounce');
  assert.ok(targets.has(key(3, 9)));
  assert.ok(!targets.has(key(3, 5)), 'not into a wall');
  assert.ok(useAbility(night, s, 'pounce', { x: 3, y: 9 }));
  assert.deepEqual(s.leo, { x: 3, y: 9 });
  assert.equal(s.alarm, null);
  assert.equal(s.ap, 1);
  assert.equal(s.charges.pounce, 99, 'unlimited');
  const c = quiet(corner, { charges: { pounce: 99 } });
  c.leo = { x: 13, y: 10 };
  assert.ok(useAbility(corner, c, 'pounce', { x: 11, y: 10 }));
  assert.notEqual(c.alarm, null, 'landed on the second beam');
});

test('Cat Nap: two guard turns where nobody notices Leo', () => {
  const s = newHeist(night, { ...BASE_PERKS, charges: { 'cat-nap': 1 } });
  s.cameras = [];
  s.guards = [{ ...s.guards[1], x: 9, y: 12, facing: 0, route: [{ x: 20, y: 12 }], target: 0 }];
  s.leo = { x: 14, y: 13 }; // moonlit, right beside Bruno's path
  assert.ok(useAbility(night, s, 'cat-nap'));
  assert.equal(s.ap, 0);
  endTurn(night, s);
  assert.equal(s.status, 'playing');
  assert.equal(s.ap, 0, 'still asleep');
  endTurn(night, s);
  assert.equal(s.ap, 2, 'awake');
});

// --- the profile side -------------------------------------------------------------------------------

function richProfile(level: number): Profile {
  const p = newProfile();
  p.xp = xpForLevel(level);
  p.catnip = 100_000;
  return p;
}

test('attribute points: one per level, each rank costs Catnip, the Gym takes some off', () => {
  const p = richProfile(4);
  assert.equal(attributePoints(p), 3);
  assert.equal(attributeCost(p, 'agility'), 150);
  assert.ok(raise(p, 'agility'));
  assert.equal(attributeCost(p, 'agility'), 300);
  p.rooms.gym = 2;
  assert.equal(attributeCost(p, 'agility'), 210);
  assert.ok(raise(p, 'agility'));
  assert.ok(raise(p, 'pockets'));
  assert.equal(attributePoints(p), 0);
  assert.match(canRaise(p, 'stealth')!, /attribute point/);
  const perks = perksFor(p);
  assert.equal(perks.movePerAp, 6);
  assert.equal(perks.spaces, 7);
});

test('every attribute has a top rank', () => {
  const p = richProfile(30);
  for (const a of ATTRIBUTES) {
    for (let i = 0; i < a.ranks.length; i++) assert.ok(raise(p, a.id), `${a.id} rank ${i + 1}`);
    assert.match(canRaise(p, a.id)!, /top rank/);
  }
  const perks = perksFor(p);
  assert.equal(perks.movePerAp, 8);
  assert.equal(perks.casePicks, 1);
  assert.equal(perks.silentPicks, true);
  assert.equal(perks.previewTurns, 3);
});

test('skills need their level, the one before them in the tree, and Catnip', () => {
  const p = richProfile(2);
  assert.match(canLearn(p, 'ghost-step')!, /Blend first/);
  assert.ok(learn(p, 'blend'));
  assert.match(canLearn(p, 'ghost-step')!, /level 4/);
  assert.match(canLearn(p, 'tightrope')!, /Pounce first/);
  p.catnip = 0;
  p.xp = xpForLevel(4);
  assert.match(canLearn(p, 'ghost-step')!, /Catnip/);
  assert.ok(perksFor(p).blend);
});

test('skills and the Workshop become charges for the heist', () => {
  const p = richProfile(30);
  for (const s of SKILLS) if (!s.later) assert.ok(learn(p, s.id), s.id);
  upgrade(p, 'workshop');
  upgrade(p, 'workshop');
  upgrade(p, 'workshop');
  const c = perksFor(p).charges;
  assert.deepEqual(c, { 'bottle-cap': 3, 'decoy-card': 2, smoke: 2, 'camera-loop': 2, 'fuse-kit': 2, emp: 2, pounce: 99, 'cat-nap': 2, 'second-wind': 2 });
});

test('lair rooms: three tiers, each costs more; the Mailbox has one', () => {
  const p = richProfile(1);
  assert.ok(upgrade(p, 'mailbox'));
  assert.match(canUpgrade(p, 'mailbox')!, /Fully/);
  for (let i = 0; i < 3; i++) assert.ok(upgrade(p, 'planning'));
  assert.match(canUpgrade(p, 'planning')!, /Fully/);
  assert.equal(p.catnip, 100_000 - 200 - 400 - 1200 - 2500);
  assert.equal(perksFor(p).previewTurns, 2);
});

test('the Fence’s Office pays more, and a collector pays half again for one item', () => {
  const p = newProfile();
  p.stash = [1, 2, 3].map((id) => ({ id, name: `Thing ${id}`, category: 'artefact' as const, value: 1000, levelId: 'x', levelName: 'X', centrepiece: false, hot: false }));
  assert.equal(priceOf(p, p.stash[0]), 57);
  p.rooms.fence = 1;
  assert.equal(collectorWants(p), null);
  assert.equal(priceOf(p, p.stash[0]), 60);
  p.rooms.fence = 2;
  const wanted = collectorWants(p);
  assert.ok(wanted);
  const prices = p.stash.map((s) => priceOf(p, s));
  assert.deepEqual(prices.filter((n) => n === Math.round(100 * 0.57 * 1.1 * 1.5)).length, 1);
});

test('the Trophy Room adds fame to the XP', () => {
  const plain = completeHeist(newProfile(), night, play(night, NIGHT_GALLERY_ROUTE));
  const famous = newProfile();
  famous.rooms.trophy = 2;
  const r = completeHeist(famous, night, play(night, NIGHT_GALLERY_ROUTE));
  const fame = r.xp.find((l) => l.label.startsWith('Fame'));
  assert.ok(fame);
  assert.equal(r.xpTotal, plain.xpTotal + fame.amount);
  assert.equal(fame.amount, Math.round(plain.xpTotal * 0.1));
});
