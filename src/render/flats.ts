// Flat pictures placed in the heists (art/models/wd_*, spr_*): wall pieces, laid flat on a wall face so they
// turn with it, and a few things drawn standing upright (the aquarium's tanks, the cat statue).
import { Assets, type Texture } from 'pixi.js';
import wd_manor from '../../art/sprites/pics/wd_manor.webp';
import wd_museum from '../../art/sprites/pics/wd_museum.webp';
import wd_opera from '../../art/sprites/pics/wd_opera.webp';
import wd_rail from '../../art/sprites/pics/wd_rail.webp';
import wd_toy from '../../art/sprites/pics/wd_toy.webp';
import wd_aquarium from '../../art/sprites/pics/wd_aquarium.webp';
import wd_fish from '../../art/sprites/pics/wd_fish.webp';
import wd_lair from '../../art/sprites/pics/wd_lair.webp';
import wd_warehouse from '../../art/sprites/pics/wd_warehouse.webp';
import wd_lab from '../../art/sprites/pics/wd_lab.webp';
import spr_window from '../../art/sprites/pics/spr_window.webp';
import spr_tank from '../../art/sprites/pics/spr_tank.webp';
import spr_tanktall from '../../art/sprites/pics/spr_tanktall.webp';
import spr_statue from '../../art/sprites/pics/spr_statue.webp';

const FILES = { wd_manor, wd_museum, wd_opera, wd_rail, wd_toy, wd_aquarium, wd_fish, wd_lair, wd_warehouse, wd_lab, spr_window, spr_tank, spr_tanktall, spr_statue };
export type FlatName = keyof typeof FILES;

/** A wall piece: how wide it is (in tiles) and where its middle sits (px up the wall); lit ones get a picture light. */
export const WALL_FLATS: Partial<Record<FlatName, { width: number; z: number; lit?: boolean }>> = {
  wd_manor: { width: 0.5, z: 50, lit: true },
  wd_museum: { width: 0.8, z: 48, lit: true },
  wd_opera: { width: 1, z: 70 },
  wd_rail: { width: 0.56, z: 54 },
  wd_toy: { width: 0.38, z: 52 },
  wd_aquarium: { width: 0.62, z: 46 },
  wd_fish: { width: 0.46, z: 46 },
  wd_lair: { width: 0.46, z: 50 },
  wd_warehouse: { width: 0.86, z: 46 },
  wd_lab: { width: 0.76, z: 50 },
  spr_window: { width: 0.56, z: 46 },
};

/** Upright pieces, by their height in game pixels. */
export const STANDING_FLATS: Partial<Record<FlatName, number>> = { spr_tank: 84, spr_tanktall: 116, spr_statue: 96 };

const textures = new Map<FlatName, Texture>();

export function flat(name: FlatName): Texture | undefined {
  return textures.get(name);
}

export async function loadFlats(): Promise<void> {
  if (textures.size) return;
  await Promise.all(
    (Object.keys(FILES) as FlatName[]).map(async (name) => {
      const tex: Texture = await Assets.load({ src: FILES[name], loadParser: 'loadTextures' });
      textures.set(name, tex);
    }),
  );
}
