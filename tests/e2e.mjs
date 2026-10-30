// Plays the built game in headless Chromium, through the real UI: a new game, the tutorial with the
// narrator, the calling card, paper and report, the narrator paying up, buying the lair, the black market,
// the Coin Museum, spending at the lair, a gadget and undo, the checkpoint and a deliberate catch, and a
// reload to check the save. Screenshots every stage.
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
page.on('console', (m) => m.type() === 'error' && !(m.location()?.url ?? '').includes('/music/') && errors.push(m.text())); // music files are optional
await page.goto(pathToFileURL(join(root, 'dist', 'index.html')).href);
await page.waitForFunction(() => window.__pc);
await page.waitForTimeout(400);
const shot = (name) => page.screenshot({ path: join(out, name) });
await shot('01-title.png');

// --- Settings: open from the title, change them, and they apply at once and are remembered -----------------
await page.click('#title-settings');
await page.waitForSelector('.settings');
await page.click('[data-toggle="largeText"]');
await page.click('[data-choice="palette"][data-value="colourblind"]');
await shot('01b-settings.png');
const settingsApplied = await page.evaluate(() => ({ large: document.body.classList.contains('large-text'), saved: JSON.parse(localStorage.getItem('purrrfect-crime-settings')) }));
await page.click('[data-toggle="largeText"]');
await page.click('#settings-ok');
// Credits from the title roll, and Esc closes them (and the settings).
await page.click('#title-credits');
await page.waitForSelector('.credits');
await page.waitForTimeout(6000);
await shot('01c-credits.png');
await page.keyboard.press('Escape');
await page.waitForSelector('#new-game');
await page.click('#title-settings');
await page.waitForSelector('.settings');
await page.keyboard.press('Escape');
await page.waitForSelector('#new-game');
const menuBeforeSaves = await page.evaluate(() => ({ cont: !!document.querySelector('#continue'), loadDisabled: document.querySelector('#load').disabled }));
await page.click('#new-game');
await page.waitForTimeout(900);

const idle = () => page.waitForFunction(() => !window.__pc.busy, null, { timeout: 15000 }).then(() => page.waitForTimeout(200));
async function clickTile(x, y) {
  const p = await page.evaluate(([x, y]) => window.__pc.screenOf(x, y), [x, y]);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(120);
  await page.mouse.click(p.x, p.y);
  await idle();
}
/** The report plays out as a score screen: the first click skips to the end, the second moves on. */
async function closeReport() {
  await page.click('#report-ok');
  if ((await page.textContent('#report-ok').catch(() => null)) === 'Continue') await page.click('#report-ok');
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
/** The solver's flawless route for a level, from src/levels/solutions.ts. */
function solution(id) {
  const src = readFileSync(join(root, 'src', 'levels', 'solutions.ts'), 'utf8');
  return JSON.parse(src.slice(src.indexOf('/* BEGIN */') + 11, src.indexOf('/* END */')))[id];
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
await page.waitForTimeout(1400);
await shot('08a-report-counting.png');
await page.waitForTimeout(1900);
await shot('08b-report-filling.png');
await page.waitForTimeout(3500);
await shot('08-report.png');
await closeReport();

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

// --- The Coin Museum, the first heist on offer --------------------------------------------------------------
await page.click('[data-job="1"]');
await page.waitForSelector('.board');
await shot('11b-briefing-no-table.png');
await page.click('#go');
await page.waitForTimeout(900);
const COIN = solution('l1-coin-museum');
await playRoute(COIN, { 3: '12-coin-vault.png' });
const coinEnd = await page.evaluate(() => ({ status: window.__pc.state.status, turn: window.__pc.state.turn, seen: window.__pc.state.seen }));
await page.waitForSelector('.paper', { timeout: 6000 });
await page.waitForTimeout(1500);
await shot('13-coin-paper.png');
await page.click('#paper-ok');
await closeReport();
await page.click('[data-tab="market"]');
await shot('14-market.png');
await page.click('#sell-all');
await page.waitForTimeout(300);
await shot('14b-market-selling.png');
await page.waitForFunction(() => window.__pc.profile.stash.length === 0, null, { timeout: 8000 });
const sold = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, stash: window.__pc.profile.stash.length, sold: window.__pc.profile.soldTotal }));
await page.click('[data-tab="papers"]');
await shot('15-front-pages.png');

// --- Spend it: an attribute, a skill, two rooms (with a little Catnip slipped in, so there's enough) ------
await page.evaluate(() => { window.__pc.profile.catnip = 2000; });
await page.click('[data-tab="leo"]');
await page.click('[data-raise="pockets"]');
await page.click('[data-learn="blend"]');
await shot('16-leo.png');
await page.click('[data-tab="lair"]');
await page.click('[data-upgrade="workshop"]');
await page.click('[data-upgrade="planning"]');
await shot('17-lair-rooms.png');
const spent = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, pockets: window.__pc.profile.attributes.pockets, skills: window.__pc.profile.skills, rooms: window.__pc.profile.rooms }));

// --- Replay with the new kit: a bottle cap, then get caught on purpose ---------------------------------------
await page.click('[data-tab="heists"]');
await page.click('[data-job="1"]');
await page.waitForSelector('.board .plan');
await shot('18-briefing-plan.png');
await page.click('#go');
await page.waitForTimeout(900);
const kit = await page.evaluate(() => ({ spaces: window.__pc.state.perks.spaces, blend: window.__pc.state.perks.blend, caps: window.__pc.state.charges['bottle-cap'] }));
await page.click('[data-ability="bottle-cap"]');
await page.waitForTimeout(300);
await shot('19-aiming.png');
await clickTile(3, 13);
const afterCap = await page.evaluate(() => ({ caps: window.__pc.state.charges['bottle-cap'], ap: window.__pc.state.ap }));
// Step into danger (a guard's view, a camera, a plate) until Leo is caught, by a guard or the lockdown.
for (let i = 0; i < 40 && (await page.evaluate(() => window.__pc.state.status)) === 'playing'; i++) {
  const t = await page.evaluate(() => window.__pc.dangerTile());
  if (t) await clickTile(t.x, t.y);
  if ((await page.evaluate(() => window.__pc.state.status)) !== 'playing') break;
  if (await page.evaluate(() => window.__pc.state.ap > 0)) await page.click('#end');
  await page.waitForTimeout(300); await idle();
}
await page.waitForTimeout(1200);
const caughtStatus = await page.evaluate(() => window.__pc.state.status);
await shot('20-caught.png');
await page.click('#quit2');
await page.waitForSelector('.lair');

// --- A rival: Luna Luck is after the Double Doubloon tonight -----------------------------------------------
await page.evaluate(() => { window.__pc.profile.rivals['l1-coin-museum'] = { id: 'luna', arrive: 2, entrance: 0 }; window.__pc.profile.rooms.planning = 2; });
await page.click('[data-job="1"]');
await page.waitForSelector('.board .rumour');
await shot('21-briefing-rival.png');
await page.click('#go');
await page.waitForTimeout(600);
await playRoute(COIN.slice(0, 4));
await page.waitForTimeout(400);
const race = await page.evaluate(() => ({ status: window.__pc.state.status, phase: window.__pc.state.rival?.phase, hud: document.getElementById('rival').textContent }));
await shot('22-rival.png');
await page.click(race.status === 'playing' ? '#quit' : '#quit2');
await page.waitForSelector('.lair');

// --- Save & quit, then continue from the title ----------------------------------------------------------
await page.click('#lair-quit');
await page.waitForSelector('#continue');
await shot('22-title-slots.png');
await page.click('#load');
await page.waitForSelector('#slot-panel [data-play="0"]');
await shot('22b-load.png');
await page.keyboard.press('Escape');
await page.reload();
await page.waitForFunction(() => window.__pc);
await page.click('#continue');
await page.waitForSelector('.lair');
const reloaded = await page.evaluate(() => ({ catnip: window.__pc.profile.catnip, heists: window.__pc.profile.heists, papers: window.__pc.profile.papers.length, skills: window.__pc.profile.skills.length }));

// --- NightClaw's letters: ten heists and 10,000 Catnip sold bring both, and open the challenge museum -----
await page.evaluate(() => { window.__pc.profile.heists = 10; window.__pc.profile.soldTotal = 10000; });
await page.click('[data-job="1"]');
await page.click('#back');
await page.waitForSelector('.letter');
await shot('23-letter-1.png');
const letterTitles = [await page.textContent('.letter .kicker')];
await page.click('#letter-ok');
await page.waitForSelector('.letter');
letterTitles.push(await page.textContent('.letter .kicker'));
await page.click('#letter-ok');
await page.waitForSelector('.lair');
const challenge = await page.evaluate(() => [...document.querySelectorAll('.district')].map((d) => d.textContent));
await shot('24-challenge-heist.png');

// --- The endgame: the challenge done, Letter 4, NightClaw's Lair, the ending ---------------------------------
await page.evaluate(() => {
  const p = window.__pc.profile;
  for (const l of window.__pc.levels) if (!l.challenge && !l.finale) p.records[l.id] = { clears: 1, bestTurns: 10, centrepiece: true, flawless: true };
  p.letters.push({ id: 3, day: p.day, read: true });
});
await page.click('[data-job="1"]');
await page.click('#back');
await page.waitForSelector('.letter');
const letter4 = await page.textContent('.letter .kicker');
await page.click('#letter-ok');
await page.waitForSelector('.lair');
const lairIndex = await page.evaluate(() => window.__pc.levels.findIndex((l) => l.finale));
await page.click(`[data-job="${lairIndex}"]`);
await page.click('#go');
await page.waitForTimeout(800);
await shot('25-nightclaw-lair.png');
await playRoute(solution('nc-lair'), { 14: '26-creeping-up.png' });
await page.waitForSelector('.scene', { timeout: 15000 });
await shot('27-nightclaw-speaks.png');
for (let i = 0; i < 5; i++) await page.click('#next');
await page.waitForSelector('.legendary');
await shot('28-legendary.png');
await page.click('#legend-ok');
await page.waitForSelector('.credits');
await page.waitForTimeout(3000);
await shot('28b-credits.png');
await page.click('#credits-ok');
await page.waitForSelector('.paper');
const finalHeadline = await page.textContent('.paper h2');
await page.waitForTimeout(1800);
await shot('29-successor.png');
await page.click('#paper-ok');
await closeReport();
await page.waitForSelector('.lair');
const legendary = await page.evaluate(() => ({ legendary: window.__pc.profile.legendary, badge: !!document.querySelector('.badge.legend') }));
await shot('30-legendary-lair.png');

// --- Phone layout ----------------------------------------------------------------------------------------
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await shot('31-phone-lair.png');
await page.click('[data-tab="leo"]');
await shot('32-phone-leo.png');
await page.click('[data-tab="heists"]');
await page.click('[data-job="1"]');
await page.click('#go');
await page.waitForTimeout(800);
await shot('33-phone-heist.png');
// The keyboard: an arrow key puts the cursor next to Leo, Enter moves him there.
const before = await page.evaluate(() => ({ ...window.__pc.state.leo }));
let keyboardMsg = '';
for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']) {
  await page.keyboard.press(k);
  keyboardMsg = await page.textContent('#message');
  if (/Enter: move/.test(keyboardMsg)) break;
}
await page.keyboard.press('Enter');
await page.waitForTimeout(600); await idle();
const after = await page.evaluate(() => ({ ...window.__pc.state.leo }));
const keyboard = { moved: before.x !== after.x || before.y !== after.y, msg: keyboardMsg };
const earned = await page.evaluate(() => window.__pc.profile.achievements);

const results = { tutorialEnd, tips: [...tips], afterLair, coinEnd, sold, spent, kit, afterCap, caughtStatus, race, reloaded, letterTitles, challenge, letter4, finalHeadline, legendary, settingsApplied, menuBeforeSaves, keyboard, earned };
console.log(JSON.stringify(results, null, 1));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
const ok =
  tutorialEnd === 'escaped' &&
  tips.has('done') &&
  afterLair.lair && afterLair.catnip === 0 && afterLair.stash === 0 &&
  coinEnd.status === 'escaped' && !coinEnd.seen &&
  sold.stash === 0 && sold.catnip > 0 && sold.sold === sold.catnip &&
  spent.pockets === 1 && spent.skills.includes('blend') && spent.rooms.workshop === 1 && spent.rooms.planning === 1 &&
  spent.catnip === 2000 - 150 - 300 - 300 - 400 &&
  kit.spaces === 7 && kit.blend && kit.caps === 1 &&
  afterCap.caps === 0 && afterCap.ap === 1 && caughtStatus === 'caught' &&
  race.status === 'playing' && (race.phase === 'in' || race.phase === 'leaving' || race.phase === 'gone') && /Luna Luck/.test(race.hud) &&
  reloaded.heists === 2 && reloaded.papers === 2 && reloaded.catnip === spent.catnip && reloaded.skills === 1 &&
  /Letter 1/.test(letterTitles[0]) && /Letter 2/.test(letterTitles[1]) && challenge.some((d) => /NightClaw/.test(d)) &&
  /Letter 4/.test(letter4) && /SUCCESSOR/.test(finalHeadline) && legendary.legendary && legendary.badge &&
  settingsApplied.large && !menuBeforeSaves.cont && menuBeforeSaves.loadDisabled && settingsApplied.saved.palette === 'colourblind' && keyboard.moved &&
  ['first-night', 'home', 'legendary'].every((a) => earned.includes(a));
process.exit(errors.length || !ok ? 1 : 0);
