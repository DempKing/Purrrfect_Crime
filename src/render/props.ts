// Sprites baked from the 3D models in art/models/ (tools/bake.mjs): each a strip of eight frames, the model
// seen from the game's camera turned 0°, 45°, … 315°. The view draws them in place of the grey-box shapes,
// and falls back to those shapes until they've loaded.
import { Assets, Rectangle, Texture } from 'pixi.js';
import manifest from '../../art/sprites/manifest.json';
import ClassicConsole_01 from '../../art/sprites/ClassicConsole_01.webp';
import fancy_picture_frame_01 from '../../art/sprites/fancy_picture_frame_01.webp';
import fancy_picture_frame_02 from '../../art/sprites/fancy_picture_frame_02.webp';
import fire_alarm from '../../art/sprites/fire_alarm.webp';
import lifebuoy from '../../art/sprites/lifebuoy.webp';
import metal_office_desk from '../../art/sprites/metal_office_desk.webp';
import ornate_mirror_01 from '../../art/sprites/ornate_mirror_01.webp';
import power_box_01 from '../../art/sprites/power_box_01.webp';
import security_camera_01 from '../../art/sprites/security_camera_01.webp';
import wall_clock from '../../art/sprites/wall_clock.webp';
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
import wooden_crate_01 from '../../art/sprites/wooden_crate_01.webp';
import wooden_crate_02 from '../../art/sprites/wooden_crate_02.webp';
import wooden_military_crate from '../../art/sprites/wooden_military_crate.webp';

const FILES = {
  ClassicConsole_01,
  fancy_picture_frame_01,
  fancy_picture_frame_02,
  fire_alarm,
  lifebuoy,
  metal_office_desk,
  ornate_mirror_01,
  power_box_01,
  security_camera_01,
  wall_clock,
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

export function prop(name: PropName): Prop | undefined {
  return props.get(name);
}

/** Loads every sprite strip and cuts it into frames. Safe to call more than once. */
export async function loadProps(): Promise<void> {
  if (props.size) return;
  await Promise.all(
    (Object.keys(FILES) as PropName[]).map(async (name) => {
      const m = (manifest as Record<string, { w: number; h: number; ax: number; ay: number; scale: number; size: { h: number } }>)[name];
      const strip: Texture = await Assets.load({ src: FILES[name], loadParser: 'loadTextures' });
      const frames = Array.from({ length: 8 }, (_, i) => new Texture({ source: strip.source, frame: new Rectangle(i * m.w, 0, m.w, m.h) }));
      props.set(name, { frames, w: m.w / m.scale, h: m.h / m.scale, ax: m.ax / m.scale, ay: m.ay / m.scale, height: m.size.h });
    }),
  );
}

/** Which of the eight frames shows a prop turned `turn` radians on the grid, with the view turned `angle`. */
export function frameFor(turn: number, angle: number): number {
  return (((Math.round((turn + angle) / (Math.PI / 4)) % 8) + 8) % 8);
}

/** The props for each district: what hangs on its walls. */
export const WALL_DECOR: Record<string, PropName[]> = {
  'old-town': ['fancy_picture_frame_01', 'fancy_picture_frame_02', 'wall_clock', 'ornate_mirror_01', 'fancy_picture_frame_01', 'fire_alarm'],
  'museum-mile': ['fancy_picture_frame_01', 'fancy_picture_frame_02', 'fancy_picture_frame_02', 'fancy_picture_frame_01', 'fire_alarm'],
  'the-heights': ['ornate_mirror_01', 'fancy_picture_frame_02', 'wall_clock', 'fancy_picture_frame_01', 'fancy_picture_frame_02'],
  harbour: ['lifebuoy', 'fire_alarm', 'power_box_01', 'lifebuoy', 'wall_clock'],
  downtown: ['power_box_01', 'fire_alarm', 'wall_clock', 'fancy_picture_frame_01'],
  nightclaw: ['fancy_picture_frame_02', 'ornate_mirror_01', 'wall_clock', 'fancy_picture_frame_01', 'fancy_picture_frame_02'],
};

/** Wall pieces that get a little brass picture light above them. */
export const LIT_ON_WALL = new Set<PropName>(['fancy_picture_frame_01', 'fancy_picture_frame_02', 'ornate_mirror_01']);

/**
 * What stands under each ceiling light (a lamp on the map): something worth lighting, on a pedestal or not.
 * The lamp's tile still can't be walked through, so it's always something solid.
 */
export const EXHIBITS: Record<string, { model: PropName; pedestal: boolean }[]> = {
  'old-town': [{ model: 'marble_bust_01', pedestal: true }, { model: 'horse_statue_01', pedestal: true }, { model: 'mantel_clock_01', pedestal: true }, { model: 'gothic_statue', pedestal: false }],
  'museum-mile': [{ model: 'marble_bust_01', pedestal: true }, { model: 'gothic_statue', pedestal: false }, { model: 'concrete_cat_statue', pedestal: true }, { model: 'horse_statue_01', pedestal: true }],
  'the-heights': [{ model: 'potted_plant_01', pedestal: false }, { model: 'marble_bust_01', pedestal: true }, { model: 'potted_plant_02', pedestal: false }, { model: 'gothic_statue', pedestal: false }],
  harbour: [{ model: 'lambis_shell', pedestal: true }, { model: 'treasure_chest', pedestal: false }, { model: 'Lantern_01', pedestal: true }, { model: 'lambis_shell', pedestal: true }],
  downtown: [{ model: 'potted_plant_01', pedestal: false }, { model: 'horse_statue_01', pedestal: true }, { model: 'potted_plant_02', pedestal: false }, { model: 'marble_bust_01', pedestal: true }],
  nightclaw: [{ model: 'gothic_statue', pedestal: false }, { model: 'mantel_clock_01', pedestal: true }, { model: 'concrete_cat_statue', pedestal: true }, { model: 'marble_bust_01', pedestal: true }],
};
