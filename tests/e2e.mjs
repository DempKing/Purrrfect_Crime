// Plays the built prototype in headless Chromium: screenshots each stage, then clicks through the
// solver's winning route and checks the heist ends in a clean getaway. Usage: node tests/e2e.mjs [outDir]
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
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
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(pathToFileURL(join(root, 'dist', 'index.html')).href);
await page.waitForFunction(() => window.__pc);
await page.waitForTimeout(500);
await page.screenshot({ path: join(out, '01-intro.png') });
await page.click('#start');
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '02-start.png') });

const idle = () => page.waitForFunction(() => !window.__pc.busy, null, { timeout: 15000 }).then(() => page.waitForTimeout(200));
async function clickTile(x, y) {
  const p = await page.evaluate(([x, y]) => window.__pc.screenOf(x, y), [x, y]);
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(120);
  await page.mouse.click(p.x, p.y);
  await idle();
}
async function endTurnIfStill(turn) {
  const s = await page.evaluate(() => ({ turn: window.__pc.state.turn, status: window.__pc.state.status }));
  if (s.status === 'playing' && s.turn === turn) await page.click('#end');
  await page.waitForTimeout(400);
  await idle();
}

// Hover a dangerous tile to show the red path warning.
const warn = await page.evaluate(() => window.__pc.screenOf(9, 4));
await page.mouse.move(warn.x, warn.y);
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, '03-hover.png') });

// The solver's route: wait a turn, slip into the hall, steal, escape.
const route = [[], [[2, 2]], [[10, 6]], ['steal', [13, 6]], [[18, 8]]];
for (const [i, actions] of route.entries()) {
  const turn = i + 1;
  for (const a of actions) {
    if (a === 'steal') { await page.click('#steal'); await idle(); }
    else await clickTile(a[0], a[1]);
  }
  if (i === 2) await page.screenshot({ path: join(out, '04-hall.png') });
  if (i < route.length - 1) await endTurnIfStill(turn);
}
await page.waitForTimeout(800);
const final = await page.evaluate(() => window.__pc.state.status);
await page.screenshot({ path: join(out, '05-end.png') });

// Turn the camera and get caught on purpose.
await page.click('#again2').catch(() => {});
await page.waitForTimeout(300);
await page.keyboard.press('q');
await page.waitForTimeout(900);
await page.screenshot({ path: join(out, '06-rotated.png') });
// Walk Leo into the bulldog's view: end turns until a seen tile is in reach, then step onto it.
for (let i = 0; i < 12; i++) {
  const t = await page.evaluate(() => window.__pc.dangerTile());
  if (t) { await clickTile(t.x, t.y); break; }
  await page.click('#end'); await page.waitForTimeout(300); await idle();
}
await page.waitForTimeout(1200);
const caughtStatus = await page.evaluate(() => window.__pc.state.status);
await page.screenshot({ path: join(out, '07-caught.png') });

console.log('winning route ends:', final, '| deliberate mistake ends:', caughtStatus);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
process.exit(errors.length || final !== 'escaped' || caughtStatus !== 'caught' ? 1 : 0);
