// Floor and wall textures (art/models/tex_*, w_*, wall_*, prepared by tools/prep-art.mjs), and which each heist uses.
// Floors repeat across the grid, so they turn with the camera; walls are papered one texture to a tile.
import { Assets, type Texture } from 'pixi.js';
import tex_marble from '../../art/sprites/tex/tex_marble.webp';
import tex_carpet from '../../art/sprites/tex/tex_carpet.webp';
import tex_parquet from '../../art/sprites/tex/tex_parquet.webp';
import tex_wood from '../../art/sprites/tex/tex_wood.webp';
import tex_planks from '../../art/sprites/tex/tex_planks.webp';
import tex_checker from '../../art/sprites/tex/tex_checker.webp';
import tex_cobble from '../../art/sprites/tex/tex_cobble.webp';
import tex_stone from '../../art/sprites/tex/tex_stone.webp';
import tex_concrete from '../../art/sprites/tex/tex_concrete.webp';
import tex_aqua from '../../art/sprites/tex/tex_aqua.webp';
import tex_brick from '../../art/sprites/tex/tex_brick.webp';
import ext_water from '../../art/sprites/tex/ext_water.webp';
import ext_roof from '../../art/sprites/tex/ext_roof.webp';
import ext_grass from '../../art/sprites/tex/ext_grass.webp';
import dec_creak from '../../art/sprites/tex/dec_creak.webp';
import dec_plate from '../../art/sprites/tex/dec_plate.webp';
import w_museum from '../../art/sprites/tex/w_museum.webp';
import w_manor from '../../art/sprites/tex/w_manor.webp';
import w_opera from '../../art/sprites/tex/w_opera.webp';
import w_aquarium from '../../art/sprites/tex/w_aquarium.webp';
import w_warehouse from '../../art/sprites/tex/w_warehouse.webp';
import w_fish from '../../art/sprites/tex/w_fish.webp';
import w_lair from '../../art/sprites/tex/w_lair.webp';
import wall_gothic from '../../art/sprites/tex/wall_gothic.webp';
import wall_marble from '../../art/sprites/tex/wall_marble.webp';
import wall_metal from '../../art/sprites/tex/wall_metal.webp';
import wall_wallpaper from '../../art/sprites/tex/wall_wallpaper.webp';
import wall_wood from '../../art/sprites/tex/wall_wood.webp';
import wall_white from '../../art/sprites/tex/wall_white.webp';
import wall_tile from '../../art/sprites/tex/wall_tile.webp';

const FILES = {
  tex_marble,
  tex_carpet,
  tex_parquet,
  tex_wood,
  tex_planks,
  tex_checker,
  tex_cobble,
  tex_stone,
  tex_concrete,
  tex_aqua,
  tex_brick,
  ext_water,
  ext_roof,
  ext_grass,
  dec_creak,
  dec_plate,
  w_museum,
  w_manor,
  w_opera,
  w_aquarium,
  w_warehouse,
  w_fish,
  w_lair,
  wall_gothic,
  wall_marble,
  wall_metal,
  wall_wallpaper,
  wall_wood,
  wall_white,
  wall_tile,
};
export type SurfaceName = keyof typeof FILES;

/** A floor: its texture and how many tiles one copy of it covers, across. */
export interface FloorSkin {
  tex: SurfaceName;
  tiles: number;
}

/** A wall: its paper, and the colour of its cut top. */
export interface WallSkin {
  tex: SurfaceName;
  top: number;
}

export interface Look {
  floor: FloorSkin;
  marble: FloorSkin;
  wall: WallSkin;
}

const CARPET: FloorSkin = { tex: 'tex_carpet', tiles: 2 };
const PARQUET: FloorSkin = { tex: 'tex_parquet', tiles: 2 };
const MARBLE: FloorSkin = { tex: 'tex_marble', tiles: 2 };
const CHECKER: FloorSkin = { tex: 'tex_checker', tiles: 2 };
const PLANKS: FloorSkin = { tex: 'tex_planks', tiles: 2 };
const STONE: FloorSkin = { tex: 'tex_stone', tiles: 2 };
const CONCRETE: FloorSkin = { tex: 'tex_concrete', tiles: 3 };
const WOOD: FloorSkin = { tex: 'tex_wood', tiles: 2 };
const COBBLE: FloorSkin = { tex: 'tex_cobble', tiles: 2 };
const AQUA: FloorSkin = { tex: 'tex_aqua', tiles: 2 };
const ROOF: FloorSkin = { tex: 'ext_roof', tiles: 2 };
const GRASS: FloorSkin = { tex: 'ext_grass', tiles: 2 };

const W = (tex: SurfaceName, top: number): WallSkin => ({ tex, top });
const MUSEUM = W('w_museum', 0xd8cdb4);
const MANOR = W('w_manor', 0x6a2a2e);
const GOTHIC = W('wall_gothic', 0x4a4458);
const WHITE = W('wall_white', 0xe8ecf0);
const MARBLE_WALL = W('wall_marble', 0xe6dcc4);

/** Each district's look, and the heists that differ from it. */
const DISTRICT_LOOKS: Record<string, Look> = {
  'old-town': { floor: CARPET, marble: MARBLE, wall: MUSEUM },
  'museum-mile': { floor: PARQUET, marble: MARBLE, wall: MUSEUM },
  'the-heights': { floor: CARPET, marble: CHECKER, wall: MANOR },
  harbour: { floor: PLANKS, marble: STONE, wall: W('tex_brick', 0x4a3f44) },
  downtown: { floor: CARPET, marble: MARBLE, wall: MARBLE_WALL },
  nightclaw: { floor: CARPET, marble: CHECKER, wall: GOTHIC },
};
const LEVEL_LOOKS: Record<string, Partial<Look>> = {
  'l2-clocktower': { floor: WOOD, wall: GOTHIC },
  'l3-pawnbroker': { floor: WOOD, wall: W('wall_wallpaper', 0x6e1f22) },
  'l4-opera-house': { wall: W('w_opera', 0x5a1418) },
  'l7-modern-art': { floor: CONCRETE, wall: WHITE },
  'l9-planetarium': { floor: CONCRETE, wall: WHITE },
  'l11-sky-garden': { floor: GRASS, marble: ROOF, wall: W('wall_wood', 0x7a5130) },
  'l12-glass-tower': { floor: CONCRETE, wall: WHITE },
  'l13-yacht-club': { floor: WOOD, wall: W('wall_wood', 0x7a5130) },
  'l15-customs': { floor: CONCRETE, wall: W('w_warehouse', 0x55606e) },
  'l16-lighthouse': { floor: STONE, marble: COBBLE },
  'l17-shipwreck': { wall: W('wall_wood', 0x7a5130) },
  'l18-fish-bank': { floor: CARPET, marble: MARBLE, wall: W('w_fish', 0x3d6b6a) },
  'l19-aquarium': { floor: CARPET, marble: AQUA, wall: W('w_aquarium', 0x2f8fa6) },
  'l21-casino': { wall: W('wall_wallpaper', 0x6e1f22), marble: CHECKER },
  'l22-mint': { floor: CONCRETE, wall: W('wall_metal', 0x5c6470) },
  'l23-mischief': { floor: CONCRETE, wall: WHITE },
  'nc-lair': { floor: STONE, marble: CHECKER, wall: W('w_lair', 0x2e2838) },
};

export function lookFor(district: string, levelId: string): Look {
  return { ...(DISTRICT_LOOKS[district] ?? DISTRICT_LOOKS['old-town']), ...LEVEL_LOOKS[levelId] };
}

export const CREAK: FloorSkin = { tex: 'dec_creak', tiles: 1 };
export const PLATE: FloorSkin = { tex: 'dec_plate', tiles: 1 };
export const WATER: FloorSkin = { tex: 'ext_water', tiles: 3 };

const textures = new Map<SurfaceName, Texture>();

export function surface(name: SurfaceName): Texture | undefined {
  return textures.get(name);
}

export async function loadSurfaces(): Promise<void> {
  if (textures.size) return;
  await Promise.all(
    (Object.keys(FILES) as SurfaceName[]).map(async (name) => {
      const tex: Texture = await Assets.load({ src: FILES[name], loadParser: 'loadTextures' });
      // Repeating, and smoothed when drawn small, so floors don't shimmer as the camera turns.
      tex.source.style.addressMode = 'repeat';
      tex.source.style.mipmapFilter = 'linear';
      tex.source.autoGenerateMipmaps = true;
      tex.source.updateMipmaps();
      textures.set(name, tex);
    }),
  );
}
