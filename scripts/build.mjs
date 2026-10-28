// Builds the game into dist/: one self-contained index.html (script and styles inlined), so the
// same file works on GitHub Pages, opened from disk, or wrapped by Electron later.
import * as esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
  logLevel: 'warning', loader: { '.webp': 'dataurl' },
});
const js = result.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
// The fonts (all SIL Open Font License), inlined so the game looks the same offline and in Electron.
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
// Music is too big to inline: the tracks in art/music/ ship beside the page, in dist/music/, with their credits.
const music = join(root, 'art/music');
const musicCredits = existsSync(join(music, 'credits.json')) ? JSON.parse(readFileSync(join(music, 'credits.json'), 'utf8')) : [];
if (existsSync(music)) {
  const tracks = readdirSync(music).filter((f) => /\.(mp3|ogg)$/.test(f));
  if (tracks.length) mkdirSync(join(out, 'music'), { recursive: true });
  for (const f of tracks) copyFileSync(join(music, f), join(out, 'music', f));
}
const html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace('<!-- STYLES -->', () => `<style>\n${css}\n</style>`)
  .replace('<!-- SCRIPT -->', () => `<script>window.MUSIC_CREDITS=${JSON.stringify(musicCredits)};</script><script>${js}</script>`);
writeFileSync(join(out, 'index.html'), html);
console.log(`Built dist/index.html (${Math.round(html.length / 1024)} KB)`);
