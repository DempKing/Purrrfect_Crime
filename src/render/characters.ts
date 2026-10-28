// The drawn characters and loot pictures (art/models/anim_*.webp, loot_*.webp), prepared by tools/prep-art.mjs:
// trimmed, scaled to the game, with each frame's feet marked. Three frames a character: standing, and the two
// halves of a stride. The view animates them (see HeistView.figure).
import { Assets, Texture } from 'pixi.js';
import type { LootCategory } from '../core/level';
import { lootIconUrl, lootSlug } from '../ui/lootIcons';
import { NAMED_LOOT_ART } from './lootArt.gen';
import data from '../../art/sprites/chars.json';
import leo_idle from '../../art/sprites/chars/leo_idle.webp';
import leo_a from '../../art/sprites/chars/leo_a.webp';
import leo_b from '../../art/sprites/chars/leo_b.webp';
import luna_idle from '../../art/sprites/chars/luna_idle.webp';
import luna_a from '../../art/sprites/chars/luna_a.webp';
import luna_b from '../../art/sprites/chars/luna_b.webp';
import mittens_idle from '../../art/sprites/chars/mittens_idle.webp';
import mittens_a from '../../art/sprites/chars/mittens_a.webp';
import mittens_b from '../../art/sprites/chars/mittens_b.webp';
import sammy_idle from '../../art/sprites/chars/sammy_idle.webp';
import sammy_a from '../../art/sprites/chars/sammy_a.webp';
import sammy_b from '../../art/sprites/chars/sammy_b.webp';
import prof_idle from '../../art/sprites/chars/prof_idle.webp';
import prof_a from '../../art/sprites/chars/prof_a.webp';
import prof_b from '../../art/sprites/chars/prof_b.webp';
import guard_idle from '../../art/sprites/chars/guard_idle.webp';
import guard_a from '../../art/sprites/chars/guard_a.webp';
import guard_b from '../../art/sprites/chars/guard_b.webp';
import dog_idle from '../../art/sprites/chars/dog_idle.webp';
import dog_a from '../../art/sprites/chars/dog_a.webp';
import dog_b from '../../art/sprites/chars/dog_b.webp';
import robot_idle from '../../art/sprites/chars/robot_idle.webp';
import robot_a from '../../art/sprites/chars/robot_a.webp';
import robot_b from '../../art/sprites/chars/robot_b.webp';
import nightclaw_idle from '../../art/sprites/chars/nightclaw_idle.webp';
import nightclaw_a from '../../art/sprites/chars/nightclaw_a.webp';
import nightclaw_b from '../../art/sprites/chars/nightclaw_b.webp';
import loot_Lantern_01 from '../../art/sprites/loot/Lantern_01.webp';
import loot_bell from '../../art/sprites/loot/bell.webp';
import loot_bowl from '../../art/sprites/loot/bowl.webp';
import loot_clockwork from '../../art/sprites/loot/clockwork.webp';
import loot_concrete_cat_statue from '../../art/sprites/loot/concrete_cat_statue.webp';
import loot_cream from '../../art/sprites/loot/cream.webp';
import loot_cushion from '../../art/sprites/loot/cushion.webp';
import loot_gothic_statue from '../../art/sprites/loot/gothic_statue.webp';
import loot_horse_statue_01 from '../../art/sprites/loot/horse_statue_01.webp';
import loot_jelly from '../../art/sprites/loot/jelly.webp';
import loot_lambis_shell from '../../art/sprites/loot/lambis_shell.webp';
import loot_mantel_clock_01 from '../../art/sprites/loot/mantel_clock_01.webp';
import loot_map from '../../art/sprites/loot/map.webp';
import loot_marble_bust_01 from '../../art/sprites/loot/marble_bust_01.webp';
import loot_mask from '../../art/sprites/loot/mask.webp';
import loot_moon from '../../art/sprites/loot/moon.webp';
import loot_perch from '../../art/sprites/loot/perch.webp';
import loot_pharaoh from '../../art/sprites/loot/pharaoh.webp';
import loot_treasure_chest from '../../art/sprites/loot/treasure_chest.webp';
import loot_vintage_suitcase from '../../art/sprites/loot/vintage_suitcase.webp';
import loot_wicker_basket_02 from '../../art/sprites/loot/wicker_basket_02.webp';

const CHAR_FILES = {
  leo: { idle: leo_idle, a: leo_a, b: leo_b },
  luna: { idle: luna_idle, a: luna_a, b: luna_b },
  mittens: { idle: mittens_idle, a: mittens_a, b: mittens_b },
  sammy: { idle: sammy_idle, a: sammy_a, b: sammy_b },
  prof: { idle: prof_idle, a: prof_a, b: prof_b },
  guard: { idle: guard_idle, a: guard_a, b: guard_b },
  dog: { idle: dog_idle, a: dog_a, b: dog_b },
  robot: { idle: robot_idle, a: robot_a, b: robot_b },
  nightclaw: { idle: nightclaw_idle, a: nightclaw_a, b: nightclaw_b },
};
const LOOT_FILES: Record<string, string> = {
  Lantern_01: loot_Lantern_01,
  bell: loot_bell,
  bowl: loot_bowl,
  clockwork: loot_clockwork,
  concrete_cat_statue: loot_concrete_cat_statue,
  cream: loot_cream,
  cushion: loot_cushion,
  gothic_statue: loot_gothic_statue,
  horse_statue_01: loot_horse_statue_01,
  jelly: loot_jelly,
  lambis_shell: loot_lambis_shell,
  mantel_clock_01: loot_mantel_clock_01,
  map: loot_map,
  marble_bust_01: loot_marble_bust_01,
  mask: loot_mask,
  moon: loot_moon,
  perch: loot_perch,
  pharaoh: loot_pharaoh,
  treasure_chest: loot_treasure_chest,
  vintage_suitcase: loot_vintage_suitcase,
  wicker_basket_02: loot_wicker_basket_02,
};

export type CharName = keyof typeof CHAR_FILES;
export type CharFrameName = 'idle' | 'a' | 'b';

export interface CharFrame {
  tex: Texture;
  /** Size and the point between the feet, in game pixels. */
  w: number;
  h: number;
  ax: number;
  ay: number;
}

/** Which picture each piece of loot has, where there is one; the rest keep their coloured gem. */
const LOOT_PICTURES: Record<string, string> = {
  'The Tsar’s Clockwork Mouse': 'clockwork',
  'Silver Mouse Automaton': 'clockwork',
  'Lot 7: A Very Old Mouse': 'clockwork',
  'Phantom’s Mask': 'mask',
  'Sapphire Bell': 'bell',
  'Lot 31: Ruby Bell': 'bell',
  'Gala Raffle Prize: a Golden Goldfish': 'bowl',
  'Lot 12: Pearl Collar': 'moon',
  'Sea Chart of the Fishbone Isles': 'map',
  'Star Chart of the Great Cat': 'map',
  'Papyrus of the Nine Lives': 'map',
  'The Founding Charter': 'map',
  'Unmade Cat Bed': 'perch',
  'Glass Whoopee Cushion': 'cushion',
  'Golden Death Mask of a Cat': 'pharaoh',
  'Crown of the Cat Pharaoh': 'pharaoh',
  'Canopic Jar of Catnip': 'cream',
  'Snow Globe of the Lighthouse': 'jelly',
  'Barnacled Doubloons': 'treasure_chest',
  'Shipwreck Silver': 'treasure_chest',
  'Golden Lantern': 'Lantern_01',
  'Mermaid Figurehead (Small)': 'gothic_statue',
  'Polo Trophy': 'horse_statue_01',
  'Smuggler’s Jade Cat': 'concrete_cat_statue',
  'Ammonite': 'lambis_shell',
  'The Club’s Cash Box': 'vintage_suitcase',
  'Crate of Contraband Caviar': 'wicker_basket_02',
  'The Curator’s Pocket Watch': 'mantel_clock_01',
  'Portrait of a Gentleman Cat': 'marble_bust_01',
};
/** A few pictures are recoloured to fit their loot. */
const LOOT_TINTS: Record<string, number> = {
  'Smuggler’s Jade Cat': 0x8fe8b0,
  'Golden Lantern': 0xffd98a,
};

const frames = new Map<string, CharFrame>();
const loot = new Map<string, { tex: Texture; w: number; h: number }>();

export function charFrame(name: CharName, frame: CharFrameName): CharFrame | undefined {
  return frames.get(`${name}_${frame}`);
}

/** The picture for a piece of loot, by its name: texture, size in game pixels, and tint. */
export function lootPicture(name: string): { tex: Texture; w: number; h: number; tint: number } | undefined {
  const own = loot.get(`named:${lootSlug(name)}`);
  if (own) return { ...own, tint: 0xffffff };
  const key = LOOT_PICTURES[name];
  const p = key ? loot.get(key) : undefined;
  if (p) return { ...p, tint: LOOT_TINTS[name] ?? 0xffffff };
  const icon = icons.get(name);
  return icon && { tex: icon, w: 40, h: 40, tint: 0xffffff };
}

/** The picture's address, for the menus: the painted one, or the drawn one. */
export function lootPictureUrl(name: string, category?: LootCategory): string {
  const own = NAMED_LOOT_ART[lootSlug(name)];
  if (own) return own.url;
  const key = LOOT_PICTURES[name];
  return key ? LOOT_FILES[key] : lootIconUrl(name, category);
}

const icons = new Map<string, Texture>();

/** Turns the drawn pictures for a heist's loot into textures, for the cases and plinths. */
export async function loadLootIcons(list: { name: string; category: LootCategory }[]): Promise<void> {
  await Promise.all(
    list
      .filter((l) => !LOOT_PICTURES[l.name] && !NAMED_LOOT_ART[lootSlug(l.name)] && !icons.has(l.name))
      .map(async (l) => {
        const img = new Image();
        img.src = lootIconUrl(l.name, l.category);
        await img.decode();
        icons.set(l.name, Texture.from(img));
      }),
  );
}

export async function loadCharacters(): Promise<void> {
  if (frames.size) return;
  const s = data.scale;
  const jobs: Promise<void>[] = [];
  for (const [name, files] of Object.entries(CHAR_FILES))
    for (const [frame, src] of Object.entries(files))
      jobs.push(
        Assets.load({ src, parser: 'texture' }).then((tex: Texture) => {
          const m = (data.chars as Record<string, Record<string, { w: number; h: number; ax: number; ay: number }>>)[name][frame];
          frames.set(`${name}_${frame}`, { tex, w: m.w / s, h: m.h / s, ax: m.ax / s, ay: m.ay / s });
        }),
      );
  for (const [key, src] of Object.entries(LOOT_FILES))
    jobs.push(
      Assets.load({ src, parser: 'texture' }).then((tex: Texture) => {
        const m = (data.loot as Record<string, { w: number; h: number }>)[key];
        loot.set(key, { tex, w: m.w / s, h: m.h / s });
      }),
    );
  // Pictures uploaded by the loot's own name come first.
  for (const [key, art] of Object.entries(NAMED_LOOT_ART))
    jobs.push(
      Assets.load({ src: art.url, parser: 'texture' }).then((tex: Texture) => {
        loot.set(`named:${key}`, { tex, w: art.w / s, h: art.h / s });
      }),
    );
  await Promise.all(jobs);
}
