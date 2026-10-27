// Builds the game into dist/: one self-contained index.html (script and styles inlined), so the
// same file works on GitHub Pages, opened from disk, or wrapped by Electron later.
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dev = process.argv.includes('--dev');
const out = join(root, 'dist');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const result = await esbuild.build({
  entryPoints: [join(root, 'src/main.ts')],
  bundle: true,
  write: false,
  format: 'iife',
  target: ['chrome110', 'safari16', 'firefox110'],
  minify: !dev,
  sourcemap: dev ? 'inline' : false,
  logLevel: 'warning',
});
const js = result.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const css = readFileSync(join(root, 'src/styles.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<!-- STYLES -->', () => `<style>\n${css}\n</style>`)
  .replace('<!-- SCRIPT -->', () => `<script>${js}</script>`);
writeFileSync(join(out, 'index.html'), html);
console.log(`Built dist/index.html (${Math.round(html.length / 1024)} KB)`);
