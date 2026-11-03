// Takes the Steam store screenshots (1920x1080) from the real game: loads the built game (dist/index.html)
// in Playwright's Chromium and, through the test hook (window.__pc), visits heists in each district,
// the lock picking minigame, the lair, the black market and the planning board.
// Writes steam-images/screenshots/. Run with `npm run steam:screenshots` (it builds the game first).
import { createRequire } from 'node:module';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'steam-images/screenshots');
const { chromium } = createRequire(import.meta.url)('playwright');

// Heists to show, one per district, and a tile offset from Leo to point at (so the planned path shows).
const HEISTS = [
  ['02_old_town.png', 'l2-clocktower'],
  ['03_museum_mile.png', 'l8-gem-hall'],
  ['04_harbor.png', 'l16-lighthouse'],
  ['05_downtown.png', 'l21-casino'],
  ['06_nightclaw.png', 'nc-midnight-museum'],
];

// Loot in Leo's stash for the black market: [name, value, category, level id, level name], all from the game.
const STASH = [
  ['Scarab of Bastet', 12500, 'jewel', 'l6-egyptian-wing', 'The Egyptian Wing'],
  ['The Blue Period Cat', 14000, 'painting', 'l7-modern-art', 'The Modern Art Atrium'],
  ['Golden Death Mask of a Cat', 5200, 'artifact', 'l6-egyptian-wing', 'The Egyptian Wing'],
  ['Trilobite in Amber', 2100, 'jewel', 'l5-natural-history', 'The Natural History Museum'],
  ['Self-Portrait with Whiskers', 3100, 'painting', 'l7-modern-art', 'The Modern Art Atrium'],
  ['Dodo Egg', 2600, 'curiosity', 'l5-natural-history', 'The Natural History Museum'],
  ['Pawned Tiara', 7800, 'jewel', 'l3-pawnbroker', 'The Pawnbroker Penthouse'],
  ['Oil Portrait of a Pug', 1600, 'painting', 'l3-pawnbroker', 'The Pawnbroker Penthouse'],
];

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
// A 1280x720 window at 1.5x: 1920x1080 pictures, with the interface at a comfortable size.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
await page.goto(pathToFileURL(join(root, 'dist/index.html')).href);
await page.waitForSelector('#new-game');

const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, name) });
  console.log('  ' + name);
};
/** Points at a reachable tile a few steps from Leo, so the path and its dangers are drawn. */
const pointNearLeo = async () => {
  const tile = await page.evaluate(() => {
    const s = window.__pc.state;
    let best = null;
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.abs(dx) + Math.abs(dy);
        if (d < 3 || d > 5) continue;
        const x = s.leo.x + dx;
        const y = s.leo.y + dy;
        if (window.__pc.riskAt(x, y) !== undefined && (!best || d > best.d)) best = { x, y, d };
      }
    return best;
  });
  if (!tile) return;
  const p = await page.evaluate(([x, y]) => window.__pc.screenOf(x, y), [tile.x, tile.y]);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(500);
};

// 1. The opening cinematic: the evening news, and NightClaw's calling card.
await page.click('#new-game');
await page.waitForSelector('.intro');
await page.waitForTimeout(13000);
await shot('01_intro.png');
await page.keyboard.press('Escape');
await page.waitForSelector('.intro', { state: 'detached' });

// 2-6. A heist in each district.
for (const [name, id] of HEISTS) {
  await page.evaluate((id) => window.__pc.startHeist(id), id);
  await page.waitForTimeout(2200);
  await pointNearLeo();
  await shot(name);
}

// 7. Picking a lock: Leo beside a safe in the Coin Museum, the pick spinning.
await page.evaluate(() => window.__pc.startHeist('l1-coin-museum'));
await page.waitForTimeout(1500);
const lock = await page.evaluate(() => {
  const s = window.__pc.state;
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 40; x++) {
      if (window.__pc.lootIndexAt(x, y) < 0) continue;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        s.ap = 2;
        s.leo = { x: x + dx, y: y + dy };
        window.__pc.refresh();
        const b = document.querySelector(
          '#actions button[data-kind="crack-safe"], #actions button[data-kind="pick-case"]',
        );
        if (b && !b.disabled) return { kind: b.dataset.kind, at: b.dataset.at };
      }
    }
  return null;
});
if (lock) {
  await page.click(`#actions button[data-kind="${lock.kind}"][data-at="${lock.at}"]`);
  await page.waitForSelector('.lockpick canvas');
  await page.waitForTimeout(700);
  await shot('07_lockpick.png');
  await page.keyboard.press('Escape');
}

// 8-11. Between heists: the lair, the black market, Leo's skills and the planning board.
// Achievement telegrams pop up as the profile jumps ahead; hide them, they'd cover the screens.
await page.addStyleTag({ content: '#toasts { display: none !important; }' });
await page.evaluate((stash) => {
  // A mid-game save: Old Town and Museum Mile cleared, loot in the stash, a few skills and rooms built.
  const p = window.__pc.profile;
  Object.assign(p, {
    tutorialDone: true,
    narratorPaid: true,
    lairOwned: true,
    catnip: 18450,
    xp: 2600,
    day: 16,
    heists: 14,
    soldTotal: 7200,
  });
  for (const { id } of window.__pc.levels.slice(0, 10))
    p.records[id] = {
      clears: 1 + (id.length % 2),
      bestTurns: 14,
      centerpiece: true,
      flawless: id.length % 3 === 0,
    };
  p.stash = stash.map(([name, value, category, levelId, levelName], i) => ({
    id: 900 + i,
    name,
    value,
    category,
    levelId,
    levelName,
    centerpiece: value > 9000,
    hot: false,
  }));
  Object.assign(p.attributes, {
    agility: 2,
    stealth: 3,
    quietPaws: 2,
    dexterity: 2,
    pockets: 1,
    perception: 1,
  });
  p.skills = ['blend', 'ghost-step', 'decoy-card', 'pounce', 'camera-loop'];
  Object.assign(p.rooms, { planning: 2, workshop: 1, fence: 1, gym: 1 });
  p.letters = [{ id: 1, day: 11, read: true }]; // NightClaw's first letter, already read
  window.__pc.lair('heists');
}, STASH);
await page.waitForTimeout(800);
await shot('08_lair.png');
for (const [tab, name] of [
  ['market', '09_black_market.png'],
  ['leo', '10_skills.png'],
]) {
  await page.click(`[data-tab="${tab}"]`);
  await page.waitForTimeout(600);
  await shot(name);
}
await page.click('[data-tab="heists"]');
await page.waitForTimeout(400);
await page.locator('[data-job]:visible').last().click();
await page.waitForSelector('.board');
await page.waitForTimeout(800);
await shot('11_planning.png');

// 12. NightClaw's first letter arriving at the lair.
await page.evaluate(() => {
  window.__pc.profile.letters = [];
  window.__pc.lair('heists');
});
await page.waitForTimeout(900);
await shot('12_letter.png');

await browser.close();
console.log(`Screenshots in ${out}`);
