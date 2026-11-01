// The frame loop: advances animations, then draws the heist.
import { leo, rival } from './actors';
import { fit, view } from './camera';
import { sound } from './common';
import { game } from './game';
import { placeLootMenu } from './loot';
import { overlay, placeRiskNote, placeRivalArrow, workOnRisk } from './preview';

/** One frame. `dt` is the seconds since the last one. */
export function tick(dt: number): void {
  view.time += dt;
  view.proj.angle += (game.targetAngle - view.proj.angle) * (1 - Math.exp(-dt * 10));
  if (game.queue.length) {
    const seg = game.queue[0];
    if (seg.t === 0 && seg.sfx) sound.play(seg.sfx);
    seg.t += dt / seg.dur;
    const k = Math.min(1, seg.t);
    const a = seg.who === 'leo' ? leo : seg.who === -1 ? rival : game.guards[seg.who];
    const x = seg.from.x + 0.5 + (seg.to.x - seg.from.x) * k;
    const y = seg.from.y + 0.5 + (seg.to.y - seg.from.y) * k;
    // The stride follows the distance covered (two frames a tile), so feet don't slide.
    if (seg.t > dt / seg.dur) a.phase = (a.phase ?? 0) + Math.hypot(x - a.x, y - a.y);
    a.x = x;
    a.y = y;
    a.facing = seg.facing;
    a.gait = seg.leap ? 'leap' : (seg.gait ?? 'walk');
    a.leapT = k;
    a.bob = seg.leap ? Math.sin(k * Math.PI) * 34 : 0;
    if (seg.t >= 1) {
      a.bob = 0;
      game.queue.shift();
      // Keep the gait between steps of one walk (no flicker of standing).
      if (game.queue[0]?.who !== seg.who) a.gait = undefined;
      if (!game.queue.length) {
        game.busy = false;
        const done = game.afterAnim;
        game.afterAnim = null;
        done?.();
      }
    }
  } else leo.bob = Math.sin(view.time * 3) * 0.8 + 0.8;
  for (const r of game.ripples) r.t += dt / 0.9;
  game.ripples = game.ripples.filter((r) => r.t < 1);
  if (!game.inHeist) return;
  fit(dt);
  placeRivalArrow();
  workOnRisk();
  placeLootMenu();
  placeRiskNote();
  view.draw(game.level, game.state, overlay(), leo, game.guards, game.ripples, rival);
}
