// Plays the built prototype in headless Chromium: screenshots each stage, plays the known Night Gallery
// route through the real UI and checks it ends in a clean getaway, then plays the M0 warm-up and gets
// caught on purpose. Usage: node tests/e2e.mjs [outDir]
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
await page.click('#level-0');
await page.waitForTimeout(1200);
await page.screenshot({ path: join(out, '02-night-start.png') });

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

// Hover a tile in the lamplight in front of Brutus to show the red path warning.
const warn = await page.evaluate(() => window.__pc.screenOf(4, 12));
await page.mouse.move(warn.x, warn.y);
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, '03-hover.png') });

// The known route, read from the source so it can't drift from the rules test.
const src = (await import('node:fs')).readFileSync(join(root, 'src', 'levels', 'routes.ts'), 'utf8');
const route = JSON.parse(src.slice(src.indexOf('= [', src.indexOf('NIGHT_GALLERY_ROUTE')) + 2, src.lastIndexOf('];') + 1).replace(/\{ a: '([a-z-]+)', x: (\d+), y: (\d+) \}/g, '{"a":"$1","x":$2,"y":$3}').replace(/,\s*\]/g, ']'));
const shots = { 3: '04-vents.png', 4: '05-panel.png', 13: '06-smash.png', 20: '07-opal.png' };
for (const [i, steps] of route.entries()) {
  const turn = await page.evaluate(() => window.__pc.state.turn);
  for (const st of steps) {
    if (Array.isArray(st)) await clickTile(st[0], st[1]);
    else await action(st.a, st.x, st.y);
  }
  if (shots[i]) await page.screenshot({ path: join(out, shots[i]) });
  const status = await page.evaluate(() => window.__pc.state.status);
  if (status !== 'playing') break;
  await endTurnIfStill(turn);
}
await page.waitForTimeout(800);
const final = await page.evaluate(() => ({ status: window.__pc.state.status, why: window.__pc.state.caughtWhy, turn: window.__pc.state.turn }));
await page.screenshot({ path: join(out, '08-escaped.png') });

// The warm-up level: turn the camera and get caught on purpose.
await page.click('#levels3').catch(() => {});
await page.click('#level-1');
await page.waitForTimeout(300);
await page.keyboard.press('q');
await page.waitForTimeout(900);
await page.screenshot({ path: join(out, '09-grey-rotated.png') });
for (let i = 0; i < 12; i++) {
  const t = await page.evaluate(() => window.__pc.dangerTile());
  if (t) { await clickTile(t.x, t.y); break; }
  await page.click('#end'); await page.waitForTimeout(300); await idle();
}
await page.waitForTimeout(1200);
const caughtStatus = await page.evaluate(() => window.__pc.state.status);
await page.screenshot({ path: join(out, '10-caught.png') });

console.log('night route ends:', JSON.stringify(final), '| deliberate mistake ends:', caughtStatus);
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'no page errors');
await browser.close();
process.exit(errors.length || final.status !== 'escaped' || caughtStatus !== 'caught' ? 1 : 0);
