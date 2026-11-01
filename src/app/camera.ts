// The camera: panning, zooming and turning, and the Pixi app and world it moves.
import { Application, Container } from 'pixi.js';
import { project } from '../render/iso';
import { HeistView } from '../render/view';
import { game, ZOOM_MAX, ZOOM_START } from './game';
import { closeLootMenu } from './loot';
import { tutorialUpdate } from './common';
import { leo } from './actors';

/** 1 shows the whole map; more is closer in, following Leo. */

/** How far the player has panned the camera away from Leo (WASD), in the world's own pixels. */
export const pan = { x: 0, y: 0 };
/** WASD keys held down right now. */
export const panKeys = new Set<string>();
/** Back to following Leo. */
export function recentre(): void {
  pan.x = 0;
  pan.y = 0;
}
export function zoomBy(k: number): void {
  game.zoom = Math.max(1, Math.min(ZOOM_MAX, game.zoom * k));
}
/** Turns the camera so it looks over Leo's shoulder: he's nearest the camera, the level stretches away. */
export function cameraBehindLeo(): void {
  let best = 0;
  let bestDepth = -Infinity;
  for (let k = 0; k < 4; k++) {
    const d = project(
      { angle: (k * Math.PI) / 2, cx: view.proj.cx, cy: view.proj.cy },
      game.state.leo.x + 0.5,
      game.state.leo.y + 0.5,
    ).depth;
    if (d > bestDepth + 0.01) {
      bestDepth = d;
      best = k;
    }
  }
  game.targetAngle = (best * Math.PI) / 2;
  view.proj.angle = game.targetAngle;
  game.zoom = game.zoomNow = ZOOM_START;
  game.focus = null;
  recentre();
}
/** The Pixi app, the world container that pans and zooms, and the heist drawing inside it. */
export const app = new Application();
export const world = new Container();
export const view = new HeistView();
export function turnCamera(dir: 1 | -1): void {
  closeLootMenu();
  recentre();
  game.targetAngle += (dir * Math.PI) / 2;
  if (game.tutorial) {
    game.tutorial.ev.rotated = true;
    tutorialUpdate();
  }
}

/**
 * Frames the heist between the HUD bars. At zoom 1 the whole map fits, whatever the camera angle; zoomed in,
 * the camera follows Leo, but never wanders off the map.
 */
export function fit(dt = 0): void {
  const w = app.screen.width;
  const h = app.screen.height;
  // Leave room for the HUD on top and the narrator, actions and message underneath.
  const top = Math.max(
    80,
    (document.querySelector('.hud') as HTMLElement).getBoundingClientRect().bottom + 8,
  );
  const foot = (document.querySelector('.bottom') as HTMLElement).getBoundingClientRect();
  const bottom = Math.max(60, h - foot.top + 8);
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of [
    [0, 0],
    [game.level.w, 0],
    [game.level.w, game.level.h],
    [0, game.level.h],
  ]) {
    for (const z of [0, 90]) {
      const s = project(view.proj, x, y, z);
      x0 = Math.min(x0, s.x);
      x1 = Math.max(x1, s.x);
      y0 = Math.min(y0, s.y);
      y1 = Math.max(y1, s.y);
    }
  }
  const whole = Math.min((w - 24) / (x1 - x0), (h - top - bottom) / (y1 - y0), 1.5);
  game.zoomNow += (game.zoom - game.zoomNow) * (dt ? 1 - Math.exp(-dt * 8) : 1);
  const scale = Math.min(whole * game.zoomNow, 2.2);
  // Follow Leo, easing; the more zoomed in, the more the view centres on him rather than the map.
  const leoAt = project(view.proj, leo.x, leo.y, 30);
  const want = { x: Math.max(x0, Math.min(x1, leoAt.x)), y: Math.max(y0, Math.min(y1, leoAt.y)) };
  if (!game.focus || !dt) game.focus = { ...want };
  else {
    const k = 1 - Math.exp(-dt * 5);
    game.focus.x += (want.x - game.focus.x) * k;
    game.focus.y += (want.y - game.focus.y) * k;
  }
  const t = Math.min(1, (scale / whole - 1) / 0.5);
  // WASD pans the view across the screen at a steady speed, however far zoomed in.
  if (panKeys.size && dt) {
    const speed = (700 / scale) * dt;
    if (panKeys.has('panLeft')) pan.x -= speed;
    if (panKeys.has('panRight')) pan.x += speed;
    if (panKeys.has('panUp')) pan.y -= speed;
    if (panKeys.has('panDown')) pan.y += speed;
  }
  let cx = (x0 + x1) / 2 + (game.focus.x - (x0 + x1) / 2) * t + pan.x;
  let cy = (y0 + y1) / 2 + (game.focus.y - (y0 + y1) / 2) * t + pan.y;
  // Don't show more empty space past the map's edge than the view needs.
  const halfW = (w - 24) / 2 / scale;
  const halfH = (h - top - bottom) / 2 / scale;
  cx = (x1 - x0) / 2 > halfW ? Math.max(x0 + halfW, Math.min(x1 - halfW, cx)) : (x0 + x1) / 2;
  cy = (y1 - y0) / 2 > halfH ? Math.max(y0 + halfH, Math.min(y1 - halfH, cy)) : (y0 + y1) / 2;
  // Keep the pan to what the edges allowed, so holding a key against the edge doesn't wind up.
  pan.x = cx - ((x0 + x1) / 2 + (game.focus.x - (x0 + x1) / 2) * t);
  pan.y = cy - ((y0 + y1) / 2 + (game.focus.y - (y0 + y1) / 2) * t);
  world.scale.set(scale);
  view.setDetail(scale * app.renderer.resolution);
  world.position.set(w / 2 - cx * scale, top + (h - top - bottom) / 2 - cy * scale);
}
