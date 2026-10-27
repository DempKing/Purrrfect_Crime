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
await page.click('[data-new="0"]');
await shot('01b-difficulty.png');
await page.click('[data-difficulty="casual"]');
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
await page.waitForSelector('.briefing');
await shot('11b-briefing-no-table.png');
await page.click('#go');
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

// --- Spend it: an attribute, a skill, two rooms -------------------------------------------------------
await page.click('[data-tab="leo"]');
await page.click('[data-raise="pockets"]');
await page.click('[data-learn="blend"]');
await shot('16-leo.png');
await page.click('[data-tab="lair"]');
await page.click('[data-upgrade="workshop"]');
await page.click('[data-upgrade="planning"]');
await shot('17-lair-rooms.png');
const spent = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, pockets: window.__pc.profile.attributes.pockets, skills: window.__pc.profile.skills, rooms: window.__pc.profile.rooms }));

// --- Replay with the new kit: a bottle cap and undo, the checkpoint, caught, back to the checkpoint -------
await page.click('[data-tab="heists"]');
await page.click('[data-job="1"]');
await page.waitForSelector('.briefing .plan');
await shot('18-briefing-plan.png');
await page.click('#go');
await page.waitForTimeout(900);
const kit = await page.evaluate(() => ({ spaces: window.__pc.state.perks.spaces, blend: window.__pc.state.perks.blend, caps: window.__pc.state.charges['bottle-cap'] }));
await page.click('[data-ability="bottle-cap"]');
await page.waitForTimeout(300);
await shot('19-aiming.png');
await clickTile(4, 12);
const afterCap = await page.evaluate(() => ({ caps: window.__pc.state.charges['bottle-cap'], ap: window.__pc.state.ap }));
await page.click('#undo');
await page.waitForTimeout(200);
const afterUndo = await page.evaluate(() => ({ caps: window.__pc.state.charges['bottle-cap'], ap: window.__pc.state.ap }));
// The known route as far as the side gallery, where the checkpoint is.
await playRoute(route('NIGHT_GALLERY_ROUTE').slice(0, 15));
await action('pick-door', 17, 5); // open the side gallery's door, so the guards can get in
const atCheckpoint = await page.evaluate(() => ({ checkpoint: window.__pc.checkpoint, turn: window.__pc.state.turn, inventory: window.__pc.state.inventory.length }));
await shot('20-checkpoint.png');
// Step into danger (a guard's view, a camera or a laser) until Leo is caught, by a guard or the lockdown.
for (let i = 0; i < 40 && (await page.evaluate(() => window.__pc.state.status)) === 'playing'; i++) {
  const t = await page.evaluate(() => window.__pc.dangerTile());
  if (t) await clickTile(t.x, t.y);
  if ((await page.evaluate(() => window.__pc.state.status)) !== 'playing') break;
  if (await page.evaluate(() => window.__pc.state.ap > 0)) await page.click('#end');
  await page.waitForTimeout(300); await idle();
}
await page.waitForTimeout(1200);
const caughtStatus = await page.evaluate(() => window.__pc.state.status);
await shot('21-caught.png');
await page.click('#from-checkpoint');
await page.waitForTimeout(400);
const restored = await page.evaluate(() => ({ status: window.__pc.state.status, turn: window.__pc.state.turn, inventory: window.__pc.state.inventory.length }));
await page.click('#quit');
await page.waitForSelector('.lair');

// --- Save & quit, then continue from the title ----------------------------------------------------------
await page.click('#lair-quit');
await page.waitForSelector('[data-play="0"]');
await shot('22-title-slots.png');
await page.reload();
await page.waitForFunction(() => window.__pc);
await page.click('[data-play="0"]');
await page.waitForSelector('.lair');
const reloaded = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, heists: window.__pc.profile.heists, papers: window.__pc.profile.papers.length, skills: window.__pc.profile.skills.length }));

// --- Phone layout ----------------------------------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await shot('23-phone-lair.png');
await page.click('[data-tab="leo"]');
await shot('24-phone-leo.png');
await page.click('[data-tab="heists"]');
await page.click('[data-job="1"]');
await page.click('#go');
await page.waitForTimeout(800);
await shot('25-phone-heist.png');

const results = { tutorialEnd, tips: [...tips], afterLair, nightEnd, sold, spent, kit, afterCap, afterUndo, atCheckpoint, caughtStatus, restored, reloaded };
console.log(JSON.stringify(results, null, 1));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
const ok =
  tutorialEnd === 'escaped' &&
  tips.has('done') &&
  afterLair.lair && afterLair.catnip === 0 && afterLair.stash === 0 &&
  nightEnd.status === 'escaped' && nightEnd.turn === 24 &&
  sold.stash === 0 && sold.catnip > 0 && sold.sold === sold.catnip &&
  spent.pockets === 1 && spent.skills.includes('blend') && spent.rooms.workshop === 1 && spent.rooms.planning === 1 &&
  spent.catnip === sold.catnip - 150 - 300 - 300 - 400 &&
  kit.spaces === 7 && kit.blend && kit.caps === 1 &&
  afterCap.caps === 0 && afterCap.ap === 1 && afterUndo.caps === 1 && afterUndo.ap === 2 &&
  atCheckpoint.checkpoint && caughtStatus === 'caught' &&
  restored.status === 'playing' && restored.turn === 13 && restored.inventory === 0 && // Leo reached the paw print on turn 13, before stealing anything
  reloaded.heists === 2 && reloaded.papers === 2 && reloaded.catnip === spent.catnip && reloaded.skills === 1;
process.exit(errors.length || !ok ? 1 : 0);
