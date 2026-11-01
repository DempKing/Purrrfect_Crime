// M6: settings, achievements and the sounds a turn's log calls for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS_KEY, defaultSettings, loadSettings, saveSettings } from '../src/settings';
import { soundsInLog } from '../src/audio';
import { ACHIEVEMENTS, checkAchievements } from '../src/meta/achievements';
import { newProfile, upgradeProfile, type HeistReport } from '../src/meta/profile';
import { CHALLENGE_LEVELS } from '../src/meta/letters';

function memory(): Storage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    length: 0,
  };
}

test('settings save, load, and fall back to the defaults when missing or broken', () => {
  const st = memory();
  assert.deepEqual(loadSettings(st), defaultSettings());
  assert.equal(
    loadSettings(st, true).reduceMotion,
    true,
    'follows the system’s reduced-motion setting at first',
  );
  const s = {
    ...defaultSettings(),
    music: 0.2,
    palette: 'colorblind' as const,
    largeText: true,
    speed: 'instant' as const,
  };
  saveSettings(st, s);
  assert.deepEqual(loadSettings(st), s);
  st.setItem(SETTINGS_KEY, '{"music": 7, "speed": "warp", "palette": 3}');
  const fixed = loadSettings(st);
  assert.equal(fixed.music, 1);
  assert.equal(fixed.speed, 'normal');
  assert.equal(fixed.palette, 'standard');
  st.setItem(SETTINGS_KEY, 'not json');
  assert.deepEqual(loadSettings(st), defaultSettings());
  assert.deepEqual(loadSettings(null), defaultSettings());
});

test('achievements: each awarded once, from the save or the heist just finished; ids and Steam names unique', () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.steam)).size, ACHIEVEMENTS.length);
  const p = newProfile();
  assert.deepEqual(checkAchievements(p), []);
  p.tutorialDone = true;
  p.lairOwned = true;
  assert.deepEqual(
    checkAchievements(p).map((a) => a.id),
    ['first-night', 'home'],
  );
  assert.deepEqual(checkAchievements(p), [], 'only once');
  const report = { spacesUsed: 6, spaces: 6, par: 30, turns: 14, items: [{}] } as unknown as HeistReport;
  assert.deepEqual(
    checkAchievements(p, report).map((a) => a.id),
    ['full-pockets', 'quick'],
  );
  for (const l of CHALLENGE_LEVELS)
    p.records[l.id] = { clears: 1, bestTurns: 9, centerpiece: true, flawless: true };
  p.legendary = true;
  const ids = checkAchievements(p).map((a) => a.id);
  for (const id of ['ghost', 'district-old-town', 'district-downtown', 'trophies', 'challenge', 'legendary'])
    assert.ok(ids.includes(id), id);
  assert.deepEqual(
    upgradeProfile({ ...newProfile(), achievements: undefined })!.achievements,
    [],
    'older saves start with none',
  );
});

test('the log’s events become sounds', () => {
  assert.deepEqual(
    soundsInLog([
      'Woof! WOOF! The guard dog has smelled cat.',
      'Alarm! A camera caught Leo on film. Lockdown in 5 turns.',
    ]),
    ['bark', 'alarm'],
  );
  assert.deepEqual(soundsInLog(['Creeeak!', 'CRASH! The glass breaks.']), ['creak', 'smash']);
  assert.deepEqual(soundsInLog(['Leo pockets the keycard.']), []);
});

test('controls can be remapped: a key taken from another action swaps, and saved bindings are checked', async () => {
  const { defaultKeys, defaultPad, rebind, actionForKey, actionForButton, cleanKeys, cleanPad } =
    await import('../src/controls');
  // End turn moves to E; turning the camera right (which had E) takes Space.
  const k = rebind(defaultKeys(), 'endTurn', 'e');
  assert.equal(actionForKey(k, 'e'), 'endTurn');
  assert.equal(actionForKey(k, ' '), 'turnRight');
  // A fresh key leaves everything else alone.
  const k2 = rebind(defaultKeys(), 'bag', 'b');
  assert.deepEqual(k2.bag, ['b']);
  assert.equal(actionForKey(k2, 'i'), null);
  // Controller: bag on A; A's old job (confirm) takes Y.
  const p = rebind(defaultPad(), 'bag', 0);
  assert.equal(actionForButton(p, 0), 'bag');
  assert.equal(actionForButton(p, 3), 'confirm');
  // Broken or reserved saved bindings fall back to the defaults.
  assert.deepEqual(cleanKeys({ bag: ['escape'], endTurn: 'x', up: ['k'] }).bag, ['i']);
  assert.deepEqual(cleanKeys({ up: ['k'] }).up, ['k']);
  assert.deepEqual(cleanPad({ confirm: [13] }).confirm, [0]);
  // And they're kept with the settings.
  const st = memory();
  saveSettings(st, { ...defaultSettings(), keys: k, pad: p });
  assert.deepEqual(loadSettings(st).keys.endTurn, ['e']);
  assert.deepEqual(loadSettings(st).pad.bag, [0]);
});

test('the colorblind palette setting from older saves (spelled colourblind) still loads', () => {
  const st = memory();
  st.setItem(SETTINGS_KEY, JSON.stringify({ palette: 'colourblind' }));
  assert.equal(loadSettings(st).palette, 'colorblind');
});
