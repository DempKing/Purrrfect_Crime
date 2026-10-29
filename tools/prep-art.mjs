// Prepares the drawn art in art/models/ for the game: trims each character frame, finds where its feet are,
// scales it to the character's height in the game, and writes art/sprites/chars/ (plus chars.json). Loot
// pictures go to art/sprites/loot/ the same way. Usage: node tools/prep-art.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'art/models');

/** Stored pixels per game pixel: enough for the zoomed-in view on a high-density screen. */
const SCALE = 3;
/** Each character's height in game pixels, standing. */
const CHARACTERS = { leo: 62, luna: 60, mittens: 60, sammy: 60, prof: 58, guard: 74, dog: 46, robot: 80, nightclaw: 84 };
const FRAMES = ['idle', 'a', 'b'];
/** A pale rim round each character, in stored pixels (0: none; it made them look like cut-outs). */
const RIM = 0;
/** Loot pictures: drawn ones, plus a few of the 3D models' sprites (frame 1, turned 45°). Longest side in game px. */
const LOOT = {
  bell: 'loot_bell.webp', bowl: 'loot_bowl.webp', clockwork: 'loot_clock.webp', cream: 'loot_cream.webp', cushion: 'loot_cushion.webp',
  jelly: 'loot_jelly.webp', map: 'loot_map.webp', mask: 'loot_mask.webp', mice: 'loot_mice.webp', moon: 'loot_moon.webp',
  perch: 'loot_perch.webp', pharaoh: 'loot_pharaoh.webp', spr_statue: 'spr_statue.webp',
};
const MODEL_LOOT = ['mantel_clock_01', 'treasure_chest', 'marble_bust_01', 'horse_statue_01', 'gothic_statue', 'concrete_cat_statue', 'lambis_shell', 'tea_set_01', 'Ukulele_01', 'Lantern_01', 'vintage_suitcase', 'garden_gnome', 'rubber_duck_toy', 'strawberry_chocolate_cake', 'retro_multimeter', 'wicker_basket_02'];
const LOOT_SIZE = 40;

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const browser = await playwright.chromium.launch({ executablePath: exe });
const page = await browser.newPage();
await page.setContent('<!doctype html><body></body>');
await page.evaluate(() => {
  /** Loads an image, returns its opaque bounds and the middle of its feet (the opaque pixels in its bottom rows). */
  window.measure = async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++)
      for (let x = 0; x < c.width; x++)
        if (d[(y * c.width + x) * 4 + 3] > 24) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    const band = Math.max(4, Math.round((y1 - y0) * 0.06));
    let sum = 0, n = 0;
    for (let y = y1 - band; y <= y1; y++)
      for (let x = x0; x <= x1; x++)
        if (d[(y * c.width + x) * 4 + 3] > 24) {
          sum += x;
          n++;
        }
    return { w: img.width, h: img.height, x0, y0, x1, y1, feet: n ? sum / n : (x0 + x1) / 2 };
  };
  /** Crops and scales an image, in halving steps so it stays smooth. Returns a webp data URL. */
  window.resize = async (url, sx, sy, sw, sh, w, h, rim = 0, rimColour = 'rgba(232,222,196,0.8)') => {
    const img = new Image();
    img.src = url;
    await img.decode();
    let c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    while (c.width / 2 > w) {
      const n = document.createElement('canvas');
      n.width = Math.round(c.width / 2);
      n.height = Math.round(c.height / 2);
      const x = n.getContext('2d');
      x.imageSmoothingQuality = 'high';
      x.drawImage(c, 0, 0, n.width, n.height);
      c = n;
    }
    const out = document.createElement('canvas');
    out.width = w + 2 * rim;
    out.height = h + 2 * rim;
    const x = out.getContext('2d');
    x.imageSmoothingQuality = 'high';
    if (rim) {
      // A pale rim of moonlight round the silhouette, so characters read on dark floors.
      const sil = document.createElement('canvas');
      sil.width = out.width;
      sil.height = out.height;
      const sx = sil.getContext('2d');
      sx.imageSmoothingQuality = 'high';
      sx.drawImage(c, rim, rim, w, h);
      sx.globalCompositeOperation = 'source-in';
      sx.fillStyle = rimColour;
      sx.fillRect(0, 0, sil.width, sil.height);
      for (let i = 0; i < 16; i++) x.drawImage(sil, Math.cos((i * Math.PI) / 8) * rim, Math.sin((i * Math.PI) / 8) * rim);
    }
    x.drawImage(c, rim, rim, w, h);
    return out.toDataURL('image/webp', 0.8);
  };
});
const dataUrl = (file) => `data:image/${file.endsWith('.png') ? 'png' : 'webp'};base64,${readFileSync(file).toString('base64')}`;
const save = (file, url) => writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));

mkdirSync(join(root, 'art/sprites/chars'), { recursive: true });
const chars = {};
for (const [name, height] of Object.entries(CHARACTERS)) {
  const urls = FRAMES.map((f) => dataUrl(join(src, `anim_${name}_${f}.webp`)));
  const m = await Promise.all(urls.map((u) => page.evaluate((u) => window.measure(u), u)));
  const k = (height * SCALE) / (m[0].y1 - m[0].y0 + 1); // sized by the standing frame
  chars[name] = {};
  for (let i = 0; i < FRAMES.length; i++) {
    const b = m[i];
    const pad = 2;
    const sx = Math.max(0, b.x0 - pad), sy = Math.max(0, b.y0 - pad);
    const sw = Math.min(b.w, b.x1 + pad + 1) - sx, sh = Math.min(b.h, b.y1 + pad + 1) - sy;
    const w = Math.round(sw * k), h = Math.round(sh * k);
    save(join(root, 'art/sprites/chars', `${name}_${FRAMES[i]}.webp`), await page.evaluate((a) => window.resize(...a), [urls[i], sx, sy, sw, sh, w, h, RIM]));
    chars[name][FRAMES[i]] = { w: w + 2 * RIM, h: h + 2 * RIM, ax: Math.round(((b.feet - sx) * k + RIM) * 10) / 10, ay: Math.round(((b.y1 - sy) * k + RIM) * 10) / 10 };
  }
  console.log(`${name}: ${FRAMES.map((f) => `${chars[name][f].w}×${chars[name][f].h}`).join(', ')}`);
}

mkdirSync(join(root, 'art/sprites/loot'), { recursive: true });
const loot = {};
const pictures = [
  ...Object.entries(LOOT).map(([key, file]) => ({ key, url: dataUrl(join(src, file)), frame: null })),
  ...MODEL_LOOT.map((key) => {
    const m = JSON.parse(readFileSync(join(root, 'art/sprites/manifest.json'), 'utf8'))[key];
    return { key, url: dataUrl(join(root, 'art/sprites', `${key}.webp`)), frame: m };
  }),
];
for (const p of pictures) {
  const b = await page.evaluate((u) => window.measure(u), p.url);
  // A model's strip: measure frame 1 alone.
  let { x0, y0, x1, y1 } = b;
  if (p.frame) {
    const f = p.frame;
    const fb = await page.evaluate(async ([u, f]) => {
      const cropped = await window.resize(u, f.w, 0, f.w, f.h, f.w, f.h);
      return { url: cropped, ...(await window.measure(cropped)) };
    }, [p.url, p.frame]);
    p.url = fb.url;
    ({ x0, y0, x1, y1 } = fb);
  }
  const sw = x1 - x0 + 1, sh = y1 - y0 + 1;
  const k = (LOOT_SIZE * SCALE) / Math.max(sw, sh);
  const w = Math.round(sw * k), h = Math.round(sh * k);
  save(join(root, 'art/sprites/loot', `${p.key}.webp`), await page.evaluate((a) => window.resize(...a), [p.url, x0, y0, sw, sh, w, h]));
  loot[p.key] = { w, h };
}
// Loot pictures uploaded by name (art/models/loot_<name>.webp, the names listed in art/LOOT_LIST.md): picked up
// automatically, and listed for the game in src/render/lootArt.gen.ts.
const known = new Set([...Object.values(LOOT), 'loot_litter.webp']); // the litter tray isn't loot here
const byName = readdirSync(src).filter((f) => /^loot_.+\.(webp|png)$/.test(f) && !known.has(f));
const named = {};
for (const file of byName) {
  const key = file.slice(5).replace(/\.(webp|png)$/, '');
  const url = dataUrl(join(src, file));
  const b = await page.evaluate((u) => window.measure(u), url);
  const sw = b.x1 - b.x0 + 1, sh = b.y1 - b.y0 + 1;
  const k = (LOOT_SIZE * SCALE) / Math.max(sw, sh);
  const w = Math.round(sw * k), h = Math.round(sh * k);
  save(join(root, 'art/sprites/loot', `${key}.webp`), await page.evaluate((a) => window.resize(...a), [url, b.x0, b.y0, sw, sh, w, h]));
  named[key] = { w, h };
}
const ident = (k) => `art_${k.replace(/[^a-z0-9]/gi, '_')}`;
writeFileSync(
  join(root, 'src/render/lootArt.gen.ts'),
  `// Made by tools/prep-art.mjs: loot pictures uploaded by name (art/models/loot_<name>.webp). Don't edit.\n` +
    Object.keys(named).map((k) => `import ${ident(k)} from '../../art/sprites/loot/${k}.webp';\n`).join('') +
    `\nexport const NAMED_LOOT_ART: Record<string, { url: string; w: number; h: number }> = {\n` +
    Object.entries(named).map(([k, v]) => `  '${k}': { url: ${ident(k)}, w: ${v.w}, h: ${v.h} },\n`).join('') +
    `};\n`,
);
console.log(`loot pictures by name: ${byName.length}`);
console.log(`loot: ${Object.keys(loot).length} pictures`);

// Floor and wall textures: square, scaled to 256 so they stay crisp without shimmering.
const TEXTURES = ['tex_marble', 'tex_carpet', 'tex_parquet', 'tex_wood', 'tex_planks', 'tex_checker', 'tex_cobble', 'tex_stone', 'tex_concrete', 'tex_aqua', 'tex_brick', 'ext_water', 'ext_roof', 'ext_grass', 'dec_creak', 'dec_plate',
  'w_museum', 'w_manor', 'w_opera', 'w_aquarium', 'w_warehouse', 'w_fish', 'w_lair', 'wall_gothic', 'wall_marble', 'wall_metal', 'wall_wallpaper', 'wall_wood', 'wall_white', 'wall_tile'];
mkdirSync(join(root, 'art/sprites/tex'), { recursive: true });
for (const name of TEXTURES) {
  const url = dataUrl(join(src, `${name}.webp`));
  const b = await page.evaluate((u) => window.measure(u), url);
  save(join(root, 'art/sprites/tex', `${name}.webp`), await page.evaluate((a) => window.resize(...a), [url, 0, 0, b.w, b.h, 256, 256]));
}
console.log(`textures: ${TEXTURES.length}`);

// Illustrations for the menus, scaled to fit their spot: [file, longest side in pixels].
const PICTURES = [
  ...['clock', 'moon', 'pearl', 'prism', 'seed'].map((v) => [`win_leo_${v}`, 520]),
  ...['luna', 'mittens', 'sammy', 'prof'].map((r) => [`win_${r}_moon`, 520]),
  ...['leo', 'luna', 'mittens', 'sammy', 'prof'].map((c) => [`cat_${c}`, 300]),
  ['legend_leo', 560], ['keyart', 1280], ['boss_nightclaw', 420],
  ...['decoy', 'smoke', 'emp', 'sardine', 'treat'].map((g) => [`g_${g}`, 64]),
  // Flat pieces for the heists: things that hang on walls, and the aquarium's tanks.
  ...['manor', 'museum', 'opera', 'rail', 'toy', 'aquarium', 'fish', 'lair', 'warehouse', 'lab'].map((w) => [`wd_${w}`, 210]),
  ['spr_window', 210], ['spr_tank', 260], ['spr_tanktall', 260], ['spr_statue', 240],
];
mkdirSync(join(root, 'art/sprites/pics'), { recursive: true });
for (const [name, size] of PICTURES) {
  const url = dataUrl(join(src, `${name}.webp`));
  const b = await page.evaluate((u) => window.measure(u), url);
  const k = size / Math.max(b.w, b.h);
  save(join(root, 'art/sprites/pics', `${name}.webp`), await page.evaluate((a) => window.resize(...a), [url, 0, 0, b.w, b.h, Math.round(b.w * k), Math.round(b.h * k)]));
}
console.log(`pictures: ${PICTURES.length}`);
writeFileSync(join(root, 'art/sprites/chars.json'), JSON.stringify({ scale: SCALE, chars, loot }, null, 1) + '\n');
await browser.close();
