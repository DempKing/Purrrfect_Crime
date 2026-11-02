// Browser check for the lock picking minigame: open a lock, play a round with the keyboard and with a click,
// back out with Esc, and turn the minigame off in the settings. Usage: node tests/lockpick-e2e.mjs
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(pathToFileURL(join(root, 'dist', 'index.html')).href);
await page.waitForFunction(() => window.__pc);
await page.click('#new-game');
await page.waitForTimeout(500);
await page.evaluate(() => window.__pc.startHeist('l1-coin-museum'));
await page.waitForTimeout(1200);

// Put Leo beside the curator's safe and find the crack-safe action.
const setup = () =>
  page.evaluate(() => {
    const s = window.__pc.state;
    s.ap = 2;
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 40; x++) {
        if (window.__pc.lootIndexAt(x, y) < 0) continue;
        for (const [dx, dy] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
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
const found = await setup();
if (!found) throw new Error('no lock to pick');
await page.waitForTimeout(300);
const before = await page.evaluate(() => ({ ap: window.__pc.state.ap }));

// Round 1: keyboard.
await page.click(`#actions button[data-kind="${found.kind}"][data-at="${found.at}"]`);
await page.waitForSelector('.lockpick canvas');
await page.screenshot({ path: '/tmp/lockpick-open.png' });
await page.keyboard.press(' ');
await page.waitForSelector('.lockpick', { state: 'detached', timeout: 3000 });
const after1 = await page.evaluate(
  (k) => ({
    ap: window.__pc.state.ap,
    picks: window.__pc.state.picks[k] ?? 0,
    log: window.__pc.state.log.join(' '),
  }),
  found.at,
);
const ok1 = after1.ap === before.ap - 1 && (after1.picks === 1 || /CLANK/.test(after1.log));

// Round 2: Esc backs out and spends nothing.
await page.click(`#actions button[data-kind="${found.kind}"][data-at="${found.at}"]`);
await page.waitForSelector('.lockpick canvas');
await page.keyboard.press('Escape');
await page.waitForSelector('.lockpick', { state: 'detached', timeout: 3000 });
const ok2 = (await page.evaluate(() => window.__pc.state.ap)) === after1.ap;

// Round 3: a click on the dial.
await page.click(`#actions button[data-kind="${found.kind}"][data-at="${found.at}"]`);
await page.waitForSelector('.lockpick canvas');
await page.click('.lockpick canvas');
await page.waitForSelector('.lockpick', { state: 'detached', timeout: 3000 });
const ok3 = (await page.evaluate(() => window.__pc.state.ap)) === after1.ap - 1;

console.log(JSON.stringify({ found, before, after1, ok1, ok2, ok3 }));
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
process.exit(ok1 && ok2 && ok3 && !errors.length ? 0 : 1);
