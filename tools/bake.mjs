// Bakes the 3D models in art/models/ into isometric sprite strips in art/sprites/: each model rendered from
// the game's camera at eight turns, outlined in ink. Settings per model are in tools/bake/catalog.json.
// Usage: node tools/bake.mjs [name ...]   (no names: every model)
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const models = join(root, 'art/models');
const out = join(root, 'art/sprites');
mkdirSync(out, { recursive: true });
const catalog = JSON.parse(readFileSync(join(root, 'tools/bake/catalog.json'), 'utf8'));
const DEFAULTS = { scale: 2, tilesPerMetre: 0.8, fit: 1.6, mount: 'floor', height: 0, yaw: 0, outline: 1.25 };

const page$ = await esbuild.build({ entryPoints: [join(root, 'tools/bake/page.ts')], bundle: true, write: false, format: 'iife', logLevel: 'warning' });
const html = `<!doctype html><meta charset="utf-8"><body><script>${page$.outputFiles[0].text}</script>`;

const names = process.argv.slice(2).length ? process.argv.slice(2) : readdirSync(models).filter((f) => f.endsWith('.glb')).map((f) => f.slice(0, -4));
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await playwright.chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('page:', e.message));
await page.route('http://bake.local/**', (route) => {
  const path = decodeURIComponent(new URL(route.request().url()).pathname);
  if (path === '/') return route.fulfill({ contentType: 'text/html', body: html });
  const file = join(models, path.slice(1));
  return existsSync(file) ? route.fulfill({ contentType: 'model/gltf-binary', body: readFileSync(file) }) : route.fulfill({ status: 404 });
});
await page.goto('http://bake.local/');

const manifestFile = join(out, 'manifest.json');
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {};
for (const name of names) {
  const opts = { ...DEFAULTS, ...(catalog[name] ?? {}) };
  const t = Date.now();
  const r = await page.evaluate(([url, o]) => window.bake(url, o), [`http://bake.local/${name}.glb`, opts]);
  writeFileSync(join(out, `${name}.webp`), Buffer.from(r.strip.split(',')[1], 'base64'));
  manifest[name] = { w: r.w, h: r.h, ax: Math.round(r.ax * 10) / 10, ay: Math.round(r.ay * 10) / 10, scale: opts.scale, mount: opts.mount, size: { w: +r.tiles.w.toFixed(2), d: +r.tiles.d.toFixed(2), h: Math.round(r.tiles.h) } };
  console.log(`${name}: ${r.w}×${r.h} ×8, ${Date.now() - t} ms`);
}
writeFileSync(manifestFile, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()), null, 1) + '\n');
await browser.close();
