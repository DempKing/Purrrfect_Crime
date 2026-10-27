// Plays the built game in headless Chromium, through the real UI: a new game, the tutorial with the
// narrator, the calling card, paper and report, the narrator paying up, buying the lair, the black market,
// the Night Gallery, a deliberate catch, and a reload to check the save. Screenshots every stage.
// Usage: node tests/e2e.mjs [outDir]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(root, '.test-build', 'shots');
mkdirSync(out, { recursive: true });
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await playwright.chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e.stack ?? e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(root, 'dist', 'index.html')).href);
await page.waitForFunction(() => window.__pc);
await page.waitForTimeout(400);
const shot = (name) => page.screenshot({ path: join(out, name) });
await shot('01-title.png');
await page.click('#new');
await page.waitForTimeout(900);

const idle = () => page.waitForFunction(() => !window.__pc.busy, null, { timeout: 15000 }).then(() => page.waitForTimeout(200));
async function clickTile(x, y) {
  const p = await page.evaluate(([x, y]) => window.__pc.screenOf(x, y), [x, y]);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(120);
  await page.mouse.click(p.x, p.y);
  await idle();
}
async function action(kind, x, y) {
  await page.click(`#actions button[data-kind="${kind}"][data-at="${x},${y}"]`, { timeout: 3000 });
  await idle();
}
async function endTurnIfStill(turn) {
  // Out of action points, the game ends the turn by itself; only press End turn when Leo has some left.
  const s = await page.evaluate(() => ({ turn: window.__pc.state.turn, status: window.__pc.state.status, ap: window.__pc.state.ap }));
  if (s.status === 'playing' && s.turn === turn && s.ap > 0) await page.click('#end');
  await page.waitForTimeout(300);
  await idle();
  await page.waitForFunction((t) => window.__pc.state.turn > t || window.__pc.state.status !== 'playing', turn, { timeout: 5000 });
}
/** Reads a route from src/levels/routes.ts, so the browser plays exactly what the rules test plays. */
function route(name) {
  const src = readFileSync(join(root, 'src', 'levels', 'routes.ts'), 'utf8');
  const from = src.indexOf('= [', src.indexOf(`${name}:`)) + 2;
  const to = src.indexOf('];', from) + 1;
  return JSON.parse(src.slice(from, to).replace(/\{ a: '([a-z-]+)', x: (\d+), y: (\d+) \}/g, '{"a":"$1","x":$2,"y":$3}').replace(/,\s*\]/g, ']'));
}
async function playRoute(steps, shots = {}, each = async () => {}) {
  for (const [i, turnSteps] of steps.entries()) {
    const turn = await page.evaluate(() => window.__pc.state.turn);
    for (const st of turnSteps) {
      if (Array.isArray(st)) await clickTile(st[0], st[1]);
      else await action(st.a, st.x, st.y);
      await each();
    }
    if (shots[i]) await shot(shots[i]);
    if ((await page.evaluate(() => window.__pc.state.status)) !== 'playing') break;
    await endTurnIfStill(turn);
    await each();
  }
}

// --- The tutorial ---------------------------------------------------------------------------------
await shot('02-tutorial-start.png');
const tips = new Set([await page.evaluate(() => window.__pc.tutorialStep)]);
const noteTip = async () => {
  const t = await page.evaluate(() => window.__pc.tutorialStep);
  if (t === 'dash') await page.click('#narrator-ok'); // the optional step: "Got it"
  tips.add(await page.evaluate(() => window.__pc.tutorialStep));
};
// Turn the view and back, as the narrator asks.
await page.keyboard.press('q');
await page.waitForTimeout(700);
await page.keyboard.press('e');
await page.waitForTimeout(900);
await playRoute(route('CORNER_GALLERY_ROUTE'), { 2: '03-tutorial-hall.png', 6: '04-tutorial-vent.png', 10: '05-tutorial-lock.png' }, noteTip);
const tutorialEnd = await page.evaluate(() => window.__pc.state.status);
await page.waitForSelector('.calling-card', { timeout: 5000 });
await page.waitForTimeout(500);
await shot('06-calling-card.png');
await page.waitForSelector('.paper', { timeout: 5000 }).catch((e) => { console.log('ERRS', errors); throw e; });
await page.waitForTimeout(1500);
await shot('07-paper.png');
await page.click('#paper-ok');
await shot('08-report.png');
await page.click('#report-ok');

// --- The narrator pays, and Leo buys the lair -------------------------------------------------------
await shot('09-narrator.png');
for (let i = 0; i < 4; i++) await page.click('#next');
await page.waitForSelector('#lair-building');
await shot('10-city-map.png');
await page.click('#lair-building');
await page.click('#buy');
for (let i = 0; i < 3; i++) await page.click('#next');
await page.waitForSelector('.lair');
await shot('11-lair.png');
const afterLair = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, lair: window.__pc.profile.lairOwned, stash: window.__pc.profile.stash.length }));

// --- The Night Gallery --------------------------------------------------------------------------------
await page.click('[data-job="1"]');
await page.waitForTimeout(900);
await playRoute(route('NIGHT_GALLERY_ROUTE'), { 13: '12-night-smash.png' });
const nightEnd = await page.evaluate(() => ({ status: window.__pc.state.status, turn: window.__pc.state.turn }));
await page.waitForSelector('.paper', { timeout: 6000 });
await page.waitForTimeout(1500);
await shot('13-night-paper.png');
await page.click('#paper-ok');
await page.click('#report-ok');
await page.click('[data-tab="market"]');
await shot('14-market.png');
await page.click('#sell-all');
const sold = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, stash: window.__pc.profile.stash.length, sold: window.__pc.profile.soldTotal }));
await page.click('[data-tab="papers"]');
await shot('15-front-pages.png');

// --- Get caught on purpose, then quit back to the lair ---------------------------------------------------
await page.click('[data-tab="heists"]');
await page.click('[data-job="1"]');
await page.waitForTimeout(600);
// Step into danger (a guard's view, a camera or a laser) until Leo is caught, by a guard or the lockdown.
for (let i = 0; i < 20 && (await page.evaluate(() => window.__pc.state.status)) === 'playing'; i++) {
  const t = await page.evaluate(() => window.__pc.dangerTile());
  if (t) await clickTile(t.x, t.y);
  if ((await page.evaluate(() => window.__pc.state.status)) !== 'playing') break;
  if (await page.evaluate(() => window.__pc.state.ap > 0)) await page.click('#end');
  await page.waitForTimeout(300); await idle();
}
await page.waitForTimeout(1200);
const caughtStatus = await page.evaluate(() => window.__pc.state.status);
await shot('16-caught.png');
await page.click('#quit2');
await page.waitForSelector('.lair');

// --- The save survives a reload ------------------------------------------------------------------------
await page.reload();
await page.waitForFunction(() => window.__pc);
await page.click('#continue');
await page.waitForSelector('.lair');
const reloaded = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, heists: window.__pc.profile.heists, papers: window.__pc.profile.papers.length }));

// --- Phone layout ----------------------------------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await shot('17-phone-lair.png');
await page.click('[data-job="0"]');
await page.waitForTimeout(800);
await shot('18-phone-heist.png');

const results = { tutorialEnd, tips: [...tips], afterLair, nightEnd, sold, caughtStatus, reloaded };
console.log(JSON.stringify(results, null, 1));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
const ok =
  tutorialEnd === 'escaped' &&
  tips.has('done') &&
  afterLair.lair && afterLair.catnip === 0 && afterLair.stash === 0 &&
  nightEnd.status === 'escaped' && nightEnd.turn === 24 &&
  sold.stash === 0 && sold.catnip > 0 && sold.sold === sold.catnip &&
  caughtStatus === 'caught' &&
  reloaded.heists === 2 && reloaded.papers === 2 && reloaded.catnip === sold.catnip;
process.exit(errors.length || !ok ? 1 : 0);
