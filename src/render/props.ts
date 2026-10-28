// Sprites baked from the 3D models in art/models/ (tools/bake.mjs): each a strip of eight frames, the model
// seen from the game's camera turned 0°, 45°, … 315°. The view draws them in place of the grey-box shapes,
// and falls back to those shapes until they've loaded.
import { Assets, Rectangle, Texture } from 'pixi.js';
import manifest from '../../art/sprites/manifest.json';
import ClassicConsole_01 from '../../art/sprites/ClassicConsole_01.webp';
import fancy_picture_frame_01 from '../../art/sprites/fancy_picture_frame_01.webp';
import fancy_picture_frame_02 from '../../art/sprites/fancy_picture_frame_02.webp';
import fire_alarm from '../../art/sprites/fire_alarm.webp';
import hanging_picture_frame_01 from '../../art/sprites/hanging_picture_frame_01.webp';
import lifebuoy from '../../art/sprites/lifebuoy.webp';
import metal_office_desk from '../../art/sprites/metal_office_desk.webp';
import ornate_mirror_01 from '../../art/sprites/ornate_mirror_01.webp';
import power_box_01 from '../../art/sprites/power_box_01.webp';
import security_camera_01 from '../../art/sprites/security_camera_01.webp';
import street_lamp_02 from '../../art/sprites/street_lamp_02.webp';
import wall_clock from '../../art/sprites/wall_clock.webp';
import wooden_crate_01 from '../../art/sprites/wooden_crate_01.webp';
import wooden_crate_02 from '../../art/sprites/wooden_crate_02.webp';
import wooden_military_crate from '../../art/sprites/wooden_military_crate.webp';

const FILES = {
  ClassicConsole_01,
  fancy_picture_frame_01,
  fancy_picture_frame_02,
  fire_alarm,
  hanging_picture_frame_01,
  lifebuoy,
  metal_office_desk,
  ornate_mirror_01,
  power_box_01,
  security_camera_01,
  street_lamp_02,
  wall_clock,
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
  'old-town': ['fancy_picture_frame_01', 'fancy_picture_frame_02', 'wall_clock', 'street_lamp_02', 'ornate_mirror_01', 'fire_alarm'],
  'museum-mile': ['fancy_picture_frame_01', 'fancy_picture_frame_02', 'hanging_picture_frame_01', 'fancy_picture_frame_01', 'fire_alarm'],
  'the-heights': ['ornate_mirror_01', 'fancy_picture_frame_02', 'wall_clock', 'fancy_picture_frame_01', 'hanging_picture_frame_01'],
  harbour: ['lifebuoy', 'street_lamp_02', 'fire_alarm', 'power_box_01', 'lifebuoy'],
  downtown: ['power_box_01', 'fire_alarm', 'wall_clock', 'hanging_picture_frame_01'],
  nightclaw: ['fancy_picture_frame_02', 'ornate_mirror_01', 'wall_clock', 'fancy_picture_frame_01', 'hanging_picture_frame_01'],
};
