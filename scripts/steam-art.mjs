// Renders every Steam store, library, community and event image from the game's painted key art and its
// logo, at Steam's sizes, into steam-images/ (store/, library/, community/, events/). Run with
// `npm run steam:art`; it uses Playwright's Chromium. Screenshots are made by scripts/steam-screenshots.mjs.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'steam-images');
const { chromium } = createRequire(import.meta.url)('playwright');

const dataUrl = (file, type) => `data:${type};base64,${readFileSync(join(root, file)).toString('base64')}`;
// The crew on the rooftop under the moon (1920x1280).
const KEYART = { url: dataUrl('art/models/keyart.webp', 'image/webp'), w: 1920, h: 1280 };
const fonts = `@font-face{font-family:'Luckiest Guy';src:url(${dataUrl('art/models/LuckiestGuy-400.woff2', 'font/woff2')}) format('woff2')}`;

const css = `${fonts}
html, body { margin: 0; background: transparent; overflow: hidden; }
.frame { position: relative; overflow: hidden; background: #1a1240; }
.art { position: absolute; display: block; max-width: none; }
.blur { filter: blur(28px) brightness(.7) saturate(1.2); }
.dim { filter: blur(40px) brightness(.4) saturate(1.1); }
/* A soft dark glow behind the logo, so it reads over the busy painting. */
.glow { position: absolute; transform: translate(-50%, -50%); border-radius: 50%;
  background: radial-gradient(closest-side, rgba(14, 8, 40, .72), rgba(14, 8, 40, .45) 55%, transparent); }
.shade { position: absolute; inset: 0; }
/* The logo, as on the title screen: yellow, a dark outline, a dark then a red drop shadow. */
.logo { position: absolute; margin: 0; transform: translate(-50%, -50%) rotate(-3deg); white-space: nowrap;
  font: 400 1em/.9 'Luckiest Guy', 'Arial Black', Impact, sans-serif; letter-spacing: .02em; color: #ffd23f;
  -webkit-text-stroke: .035em #1c1233; paint-order: stroke fill;
  text-shadow: .05em .05em 0 #1c1233, .09em .09em 0 #ff4d5e; }
.logo span { display: block; }
.logo span + span { margin-left: .6em; }
.logo.one span { display: inline; }
.logo.one span + span { margin-left: .25em; }
`;

/**
 * The key art, cropped to a w x h picture: `cx`, `cy` are the crop's center (fractions of the painting)
 * and `cw` its width (a fraction of the painting's width). The height follows from the picture's shape.
 */
function crop(w, h, { cx, cy, cw }, cls = '') {
  const scale = w / (cw * KEYART.w);
  const iw = KEYART.w * scale;
  const ih = KEYART.h * scale;
  const left = w / 2 - cx * iw;
  const top = h / 2 - cy * ih;
  return `<img class="art ${cls}" src="${KEYART.url}" style="width:${iw}px;height:${ih}px;left:${left}px;top:${top}px">`;
}

/** The logo at (x, y) (fractions of the picture), `size` = font size as a fraction of the height. */
function logo(w, h, { x, y, size, oneLine = false, glow = true }) {
  const fs = size * h;
  const g = glow
    ? `<div class="glow" style="left:${x * w}px;top:${y * h}px;width:${fs * (oneLine ? 9.5 : 6)}px;height:${fs * (oneLine ? 2.6 : 3.4)}px"></div>`
    : '';
  return `${g}<h1 class="logo ${oneLine ? 'one' : ''}" style="left:${x * w}px;top:${y * h}px;font-size:${fs}px"><span>Purrrfect</span><span>Crime</span></h1>`;
}

/** A gradient darkening one edge (for the logo to sit on). */
const shade = (dir, amount = 0.75, reach = 45) =>
  `<div class="shade" style="background:linear-gradient(${dir}, rgba(14,8,40,${amount}), transparent ${reach}%)"></div>`;

/**
 * The game icon: Leo's red bow tie (the one on his calling card) in front of a full moon, on the night sky.
 * Drawn as vector art, so it stays crisp from 16 to 256 pixels.
 */
const BOW_TIE = `<svg viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;inset:0">
  <defs>
    <radialGradient id="sky" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="#3a2a8a"/><stop offset="1" stop-color="#140d33"/></radialGradient>
    <radialGradient id="moon" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fffbe8"/><stop offset="1" stop-color="#e9dfb8"/></radialGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a5f"/><stop offset=".55" stop-color="#e0263a"/><stop offset="1" stop-color="#a8162a"/></linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#sky)"/>
  <circle cx="50" cy="50" r="37" fill="#ffd23f" opacity=".18"/>
  <circle cx="50" cy="50" r="32" fill="url(#moon)"/>
  <circle cx="38" cy="40" r="4.5" fill="#d9cfa6" opacity=".7"/><circle cx="60" cy="62" r="6" fill="#d9cfa6" opacity=".6"/><circle cx="63" cy="38" r="2.6" fill="#d9cfa6" opacity=".7"/>
  <g stroke="#1c1233" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round">
    <path d="M47 50 L15 31 Q9 28 9 35 L9 65 Q9 72 15 69 Z" fill="url(#wing)"/>
    <path d="M53 50 L85 31 Q91 28 91 35 L91 65 Q91 72 85 69 Z" fill="url(#wing)"/>
    <path d="M44 50 L22 41 M44 50 L22 59 M56 50 L78 41 M56 50 L78 59" fill="none" stroke="#8e1022" stroke-width="2.4"/>
    <rect x="40.5" y="39.5" width="19" height="21" rx="5.5" fill="#c41d31"/>
  </g>
  <path d="M15 36 L33 45" stroke="#ffb3b0" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>
  <path d="M44 44 q6 -2 12 0" stroke="#ff8a8f" stroke-width="2.2" stroke-linecap="round" fill="none"/>
</svg>`;

const ART = [
  {
    file: 'store/header_capsule.png',
    w: 920,
    h: 430,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.5, cw: 1 }) +
      shade('to top', 0.8, 50) +
      logo(w, h, { x: 0.5, y: 0.78, size: 0.2, oneLine: true }),
  },
  {
    file: 'store/small_capsule.png',
    w: 462,
    h: 174,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.42, cw: 0.62 }, 'blur') +
      shade('to top', 0.55, 100) +
      logo(w, h, { x: 0.5, y: 0.52, size: 0.33, glow: false }),
  },
  {
    file: 'store/main_capsule.png',
    w: 1232,
    h: 706,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.5, cw: 1 }) +
      shade('to top', 0.85, 45) +
      logo(w, h, { x: 0.5, y: 0.8, size: 0.15, oneLine: true }),
  },
  {
    file: 'store/vertical_capsule.png',
    w: 748,
    h: 896,
    body: (w, h) =>
      crop(w, h, { cx: 0.3, cy: 0.5, cw: 0.556 }) +
      shade('to top', 0.85, 45) +
      logo(w, h, { x: 0.5, y: 0.8, size: 0.12 }),
  },
  {
    // Ambient: the painting blurred and dimmed, no text (Steam darkens it further).
    file: 'store/page_background.png',
    w: 1438,
    h: 810,
    body: (w, h) => crop(w, h, { cx: 0.5, cy: 0.45, cw: 1 }, 'blur'),
  },
  {
    file: 'library/library_capsule.png',
    w: 600,
    h: 900,
    body: (w, h) =>
      crop(w, h, { cx: 0.25, cy: 0.5, cw: 0.444 }) +
      shade('to top', 0.85, 45) +
      logo(w, h, { x: 0.5, y: 0.82, size: 0.105 }),
  },
  {
    file: 'library/library_header.png',
    w: 920,
    h: 430,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.5, cw: 1 }) +
      shade('to top', 0.8, 50) +
      logo(w, h, { x: 0.5, y: 0.78, size: 0.2, oneLine: true }),
  },
  {
    // No text: Steam lays the library logo over it. The painting fills the middle; the edges are the same
    // painting blurred, so the picture is wide enough without stretching the crew.
    file: 'library/library_hero.png',
    w: 3840,
    h: 1240,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.45, cw: 1 }, 'dim') +
      `<div style="position:absolute;left:${(w - 2580) / 2}px;top:0;width:2580px;height:${h}px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 20%,#000 80%,transparent)">${crop(2580, h, { cx: 0.5, cy: 0.55, cw: 1 })}</div>`,
  },
  {
    file: 'library/library_logo.png',
    w: 1280,
    h: 720,
    transparent: true,
    body: (w, h) => logo(w, h, { x: 0.47, y: 0.47, size: 0.27, glow: false }),
  },
  {
    file: 'events/event_cover.png',
    w: 800,
    h: 450,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.5, cw: 1 }) +
      shade('to top', 0.85, 45) +
      logo(w, h, { x: 0.5, y: 0.8, size: 0.15, oneLine: true }),
  },
  {
    file: 'events/event_header.png',
    w: 1920,
    h: 622,
    body: (w, h) =>
      crop(w, h, { cx: 0.5, cy: 0.5, cw: 1 }) +
      shade('to top', 0.85, 50) +
      logo(w, h, { x: 0.5, y: 0.84, size: 0.15, oneLine: true }),
  },
  // Icons: Leo's bow tie.
  { file: 'community/community_icon.jpg', w: 184, h: 184, body: () => BOW_TIE },
  ...[16, 24, 32, 48, 64, 96, 128, 256].map((n) => ({
    file: `community/icons/icon_${n}.png`,
    w: n,
    h: n,
    round: true,
    body: () => BOW_TIE,
  })),
];

/** A Windows .ico holding PNG images (supported since Windows Vista). */
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, e); // 0 means 256
    header.writeUInt8(size >= 256 ? 0 : size, e + 1);
    header.writeUInt16LE(1, e + 4); // color planes
    header.writeUInt16LE(32, e + 6); // bits per pixel
    header.writeUInt32LE(data.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

// Start these folders afresh (the screenshots, made by the other script, are left alone).
for (const dir of ['store', 'library', 'community', 'events'])
  rmSync(join(out, dir), { recursive: true, force: true });
for (const a of ART) mkdirSync(dirname(join(out, a.file)), { recursive: true });
const browser = await chromium.launch();
for (const a of ART) {
  const page = await browser.newPage({ viewport: { width: a.w, height: a.h } });
  const style = `width:${a.w}px;height:${a.h}px;${a.transparent ? 'background:transparent;' : ''}${a.round ? 'border-radius:20%;' : ''}`;
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="frame" style="${style}">${a.body(a.w, a.h)}</div></body></html>`,
  );
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  const jpg = a.file.endsWith('.jpg');
  await page.screenshot({
    path: join(out, a.file),
    clip: { x: 0, y: 0, width: a.w, height: a.h },
    ...(jpg ? { type: 'jpeg', quality: 92 } : { omitBackground: !!a.transparent || !!a.round }),
  });
  await page.close();
  console.log(`  ${a.file}`, `${a.w}x${a.h}`);
}
await browser.close();
const sizes = [16, 24, 32, 48, 64, 128, 256];
writeFileSync(
  join(out, 'community/icons/client_icon.ico'),
  ico(sizes.map((size) => ({ size, data: readFileSync(join(out, `community/icons/icon_${size}.png`)) }))),
);
console.log('  community/icons/client_icon.ico', sizes.join(', '));
console.log(`Steam art in ${out}`);
