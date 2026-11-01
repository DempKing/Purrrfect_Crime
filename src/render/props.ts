// Sprites baked from the 3D models (tools/bake.mjs): 8 frames each, one per 45 degrees of camera turn.
// Until they load, plain shapes are drawn instead.
import { Assets, Rectangle, Texture } from 'pixi.js';
import type { FlatName } from './flats';
import manifest from '../../art/sprites/manifest.json';
import ClassicConsole_01 from '../../art/sprites/ClassicConsole_01.webp';
import fancy_picture_frame_01 from '../../art/sprites/fancy_picture_frame_01.webp';
import fancy_picture_frame_02 from '../../art/sprites/fancy_picture_frame_02.webp';
import lifebuoy from '../../art/sprites/lifebuoy.webp';
import metal_office_desk from '../../art/sprites/metal_office_desk.webp';
import security_camera_01 from '../../art/sprites/security_camera_01.webp';
import marble_bust_01 from '../../art/sprites/marble_bust_01.webp';
import gothic_statue from '../../art/sprites/gothic_statue.webp';
import horse_statue_01 from '../../art/sprites/horse_statue_01.webp';
import concrete_cat_statue from '../../art/sprites/concrete_cat_statue.webp';
import mantel_clock_01 from '../../art/sprites/mantel_clock_01.webp';
import lambis_shell from '../../art/sprites/lambis_shell.webp';
import treasure_chest from '../../art/sprites/treasure_chest.webp';
import Lantern_01 from '../../art/sprites/Lantern_01.webp';
import potted_plant_01 from '../../art/sprites/potted_plant_01.webp';
import potted_plant_02 from '../../art/sprites/potted_plant_02.webp';
import wall_clock from '../../art/sprites/wall_clock.webp';
import vintage_grandfather_clock_01 from '../../art/sprites/vintage_grandfather_clock_01.webp';
import wooden_crate_01 from '../../art/sprites/wooden_crate_01.webp';
import wooden_crate_02 from '../../art/sprites/wooden_crate_02.webp';
import wooden_military_crate from '../../art/sprites/wooden_military_crate.webp';

/** Sprite files for each 3D prop. */
const FILES = {
  ClassicConsole_01,
  fancy_picture_frame_01,
  fancy_picture_frame_02,
  lifebuoy,
  metal_office_desk,
  security_camera_01,
  marble_bust_01,
  gothic_statue,
  horse_statue_01,
  concrete_cat_statue,
  mantel_clock_01,
  lambis_shell,
  treasure_chest,
  Lantern_01,
  potted_plant_01,
  potted_plant_02,
  wall_clock,
  vintage_grandfather_clock_01,
  wooden_crate_01,
  wooden_crate_02,
  wooden_military_crate,
};
export type PropName = keyof typeof FILES;

export interface Prop {
  frames: Texture[];
  /** Drawn size and anchor, in game pixels. */
  w: number;
  h: number;
  ax: number;
  ay: number;
  /** The model's height in game pixels. */
  height: number;
}

const props = new Map<PropName, Prop>();

/** A prop sprite (undefined until loaded). */
export function prop(name: PropName): Prop | undefined {
  return props.get(name);
}

/** Loads every sprite strip and cuts it into frames. Safe to call more than once. */
export async function loadProps(): Promise<void> {
  if (props.size) return;
  await Promise.all(
    (Object.keys(FILES) as PropName[]).map(async (name) => {
      const m = (
        manifest as Record<
          string,
          { w: number; h: number; ax: number; ay: number; scale: number; size: { h: number } }
        >
      )[name];
      const strip: Texture = await Assets.load({ src: FILES[name], parser: 'texture' });
      const frames = Array.from(
        { length: 8 },
        (_, i) => new Texture({ source: strip.source, frame: new Rectangle(i * m.w, 0, m.w, m.h) }),
      );
      props.set(name, {
        frames,
        w: m.w / m.scale,
        h: m.h / m.scale,
        ax: m.ax / m.scale,
        ay: m.ay / m.scale,
        height: m.size.h,
      });
    }),
  );
}

/** Which of the 8 frames to show for a prop, given its turn and the camera angle. */
export function frameFor(turn: number, angle: number): number {
  return ((Math.round((turn + angle) / (Math.PI / 4)) % 8) + 8) % 8;
}

/** What hangs on the walls in each district: 3D props, and flat pieces (FlatName). */
/** Clocks drawn rather than modeled, for the Clocktower: each a little odd. */
export type ClockFace = 'pclock_roman' | 'pclock_gears' | 'pclock_odd' | 'pclock_pendulum';
export type WallPiece = PropName | FlatName | ClockFace;

/** Wall decorations to pick from, by district. */
export const WALL_DECOR: Record<string, WallPiece[]> = {
  'old-town': [
    'fancy_picture_frame_01',
    'fancy_picture_frame_02',
    'spr_window',
    'wd_manor',
    'fancy_picture_frame_01',
  ],
  'museum-mile': [
    'fancy_picture_frame_01',
    'fancy_picture_frame_02',
    'wd_museum',
    'wd_manor',
    'fancy_picture_frame_02',
  ],
  'the-heights': ['fancy_picture_frame_02', 'wd_manor', 'spr_window', 'fancy_picture_frame_01'],
  harbor: ['lifebuoy', 'wd_fish', 'wd_aquarium', 'wd_warehouse'],
  downtown: ['wd_lab', 'spr_window', 'fancy_picture_frame_01'],
  nightclaw: ['fancy_picture_frame_02', 'wd_lair', 'wd_manor', 'wd_lair'],
};

/** Heists whose walls differ from their district's. */
export const LEVEL_WALL_DECOR: Record<string, WallPiece[]> = {
  'l2-clocktower': [
    'pclock_roman',
    'wall_clock',
    'pclock_gears',
    'wd_rail',
    'pclock_odd',
    'wd_toy',
    'pclock_pendulum',
    'pclock_roman',
    'pclock_gears',
    'spr_window',
  ],
  'l4-opera-house': ['wd_opera', 'wd_opera', 'wd_manor', 'fancy_picture_frame_02'],
  'l15-customs': ['wd_warehouse', 'wd_warehouse', 'lifebuoy'],
  'l17-shipwreck': ['wd_aquarium', 'wd_fish', 'lifebuoy', 'wd_aquarium'],
  'l19-aquarium': ['wd_aquarium', 'wd_aquarium', 'wd_fish', 'lifebuoy'],
  'l12-glass-tower': ['wd_lab', 'spr_window'],
  'l14-observatory': ['wd_lab', 'spr_window', 'wd_manor'],
};

/** Wall pieces that get a little brass picture light above them. */
export const LIT_ON_WALL = new Set<PropName>(['fancy_picture_frame_01', 'fancy_picture_frame_02']);

/** How often a wall face gets a decoration (1 in 5; more in the Clocktower). */
export const DECOR_DENSITY: Record<string, number> = { 'l2-clocktower': 0.5 };
