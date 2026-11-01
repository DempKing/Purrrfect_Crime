// Types shared by the heist drawing code.
import type { Graphics } from 'pixi.js';
import type { Point } from '../../core/level';
import type { Notice } from '../../core/game';
import type { Projector } from '../iso';

/** What the game wants highlighted on the map this frame. */
export interface Overlay {
  reach1: Set<string>; // tiles Leo can reach with 1 action point
  reach2: Set<string>; // tiles that need both action points
  vision: Set<string>; // tiles a guard can see
  cameraVision: Set<string>; // tiles a camera can see
  footprints: Point[]; // where the guards will walk next turn
  rivalPath: Point[]; // where the rival will walk next turn
  path: Point[]; // the walk to the tile under the pointer
  pathDanger: Map<string, number>; // per path tile: 1 = noticed, 2 = caught or alarm
  hover: Point | null; // the tile under the pointer
  targets: Set<string>; // where the gadget being aimed can go
  risky: Map<string, { kind: 'caught' | 'alarm' | 'seen'; why: string } | null>; // danger marks
  alerts: Notice[]; // who noticed what, shown for a few seconds
}

/** How a character is moving; picks their animation. */
export type Gait = 'walk' | 'run' | 'sneak' | 'crawl' | 'leap' | 'climb';

/** A character as drawn: a smooth position between tiles, plus animation state. */
export interface Actor {
  x: number; // grid position (tile x + 0.5 is the tile's centre)
  y: number;
  facing: number;
  bob: number;
  gait?: Gait; // set while moving
  phase?: number; // steps walked so far, for the stride
  leapT?: number; // 0..1 through a pounce
  work?: number; // 1 just after Leo uses his paws, easing back to 0
  flip?: boolean; // facing right on screen (the drawings face left)
}

/** A noise ripple spreading out on the floor. */
export interface Ripple {
  x: number;
  y: number;
  r: number; // radius in tiles
  t: number; // 0..1 through the animation
}

export const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

/** Something standing up, drawn in depth order (nearest last). */
export interface Drawable {
  depth: number;
  draw: (g: Graphics) => void;
}

/** Values worked out once per frame and shared by the drawing stages. */
export interface Frame {
  p: Projector;
  f: Graphics; // the floor layer (redrawn every frame)
  o: Graphics; // the standing-objects layer
  fx: Graphics; // effects on top: lights, smoke, ripples
  fb: Graphics | null; // the cached floor picture, when it needs redrawing this frame
  light: number[][];
  dt: number; // seconds since the last frame
  beam: Set<string>; // tiles in the lighthouse beam
  spots: { at: Point; radius: number }[]; // spotlights on right now
  inVent: boolean;
  inRafters: boolean;
  leoDepth: number;
  ceiling: { x: number; y: number; on: boolean; lamp: boolean }[]; // lights to hang from the ceiling
}
