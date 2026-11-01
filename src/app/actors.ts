// Where characters are drawn (lagging the rules while moves animate), and the animation queue.
import type { Actor, Gait } from '../render/view';
import type { Sfx } from '../audio';
import type { Point } from '../core/level';
import { game } from './game';

// Display state: where things are drawn, which lags the rules while animating

export const leo: Actor = { x: 0, y: 0, facing: 0, bob: 0 };
export const rival: Actor = { x: 0, y: 0, facing: 0, bob: 0 };
/** Snaps every drawn character to its real position (no animation). */
export function syncActors(): void {
  leo.x = game.state.leo.x + 0.5;
  leo.y = game.state.leo.y + 0.5;
  game.guards = game.state.guards.map((g) => ({ x: g.x + 0.5, y: g.y + 0.5, facing: g.facing, bob: 0 }));
  if (game.state.rival) {
    rival.x = game.state.rival.x + 0.5;
    rival.y = game.state.rival.y + 0.5;
    rival.facing = game.state.rival.facing;
  }
}
export interface Segment {
  who: 'leo' | number;
  sfx?: Sfx; // played as the step starts
  from: Point;
  to: Point;
  facing: number;
  t: number;
  dur: number;
  leap?: boolean; // a Pounce: a high arc instead of a walk
  gait?: Gait;
}
/** Queues moves to animate; `then` runs when they finish. */
export function play(segments: Segment[], then: () => void): void {
  game.queue = segments;
  game.busy = segments.length > 0;
  game.afterAnim = then;
  if (!game.busy) then();
}
/** Turns this step's noises into ripples on the floor. */
export function spawnRipples(): void {
  for (const n of game.state.noises.slice(game.noisesSeen))
    game.ripples.push({ x: n.x, y: n.y, r: n.r, t: 0 });
  game.noisesSeen = game.state.noises.length;
}
