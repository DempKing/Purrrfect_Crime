// Builds the game into dist/index.html (scripts and styles inlined).
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
  loader: { '.webp': 'dataurl' },
});
const js = result.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
// Fonts (SIL Open Font License, or Apache 2.0 for Luckiest Guy and Homemade Apple), inlined so they work offline.
const FONTS = [
  ['Luckiest Guy', 'luckiest-guy', [400]], // chunky cartoon headlines and buttons
  ['Nunito', 'nunito', [400, 600, 700, 800, 900]], // everything you read
  ['Patrick Hand', 'patrick-hand', [400]], // notes on the planning board
  ['UnifrakturMaguntia', 'unifrakturmaguntia', [400]], // the newspaper's masthead
  ['Homemade Apple', 'homemade-apple', [400]], // NightClaw's handwriting
];
const fontFaces = FONTS.flatMap(([family, pkg, weights]) =>
  weights.map((w) => {
    const file = join(root, 'node_modules/@fontsource', pkg, 'files', `${pkg}-latin-${w}-normal.woff2`);
    const data = readFileSync(file).toString('base64');
    return `@font-face { font-family: '${family}'; font-style: normal; font-weight: ${w}; font-display: swap; src: url(data:font/woff2;base64,${data}) format('woff2'); }`;
  }),
).join('\n');
const css = fontFaces + '\n' + readFileSync(join(root, 'src/styles.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<!-- STYLES -->', () => `<style>\n${css}\n</style>`)
  .replace('<!-- SCRIPT -->', () => `<script>${js}</script>`);
writeFileSync(join(out, 'index.html'), html);
console.log(`Built dist/index.html (${Math.round(html.length / 1024)} KB)`);
