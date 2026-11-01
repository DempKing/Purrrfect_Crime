// Drawing stage 3: effects on the top layer (spotlights, ceiling lights, smoke, noise ripples, loot hops).
import type { Level } from '../../core/level';
import type { State } from '../../core/game';
import { project, TILE_H, TILE_W } from '../iso';
import { lootPicture } from '../characters';
import type { HeistView } from '../view';
import type { Actor, Frame, Ripple } from './types';
import { LOOT_COLORS } from './style';
import { beacon, ceilingLight } from './lights';

/** The lighthouse beam and spotlight pools. Drawn before the standing objects. */
export function drawSpotlights(view: HeistView, fr: Frame, level: Level, s: State): void {
  if (level.def.beacon) beacon(view, level, s);
  for (const sp of fr.spots) {
    const c = project(fr.p, sp.at.x + 0.5, sp.at.y + 0.5);
    const rx = ((sp.radius + 0.5) * TILE_W) / Math.SQRT2;
    const ry = ((sp.radius + 0.5) * TILE_H) / Math.SQRT2;
    fr.fx.ellipse(c.x, c.y, rx, ry).fill({ color: 0xfff6d8, alpha: 0.1 });
  }
}

/** Everything drawn above the standing objects. */
export function drawEffects(
  view: HeistView,
  fr: Frame,
  level: Level,
  s: State,
  leo: Actor,
  ripples: Ripple[],
): void {
  const { p, fx } = fr;

  // Ceiling lights over lamps, cases and plinths (hidden from the vents and rafters).
  if (!fr.inVent && !fr.inRafters) for (const c of fr.ceiling) ceilingLight(view, fx, c.x, c.y, c.on, c.lamp);

  // Smoke pellets: grey puffs drifting over each cloud's 3x3 tiles.
  for (const c of s.smoke)
    for (let i = 0; i < 9; i++) {
      const dx = (i % 3) - 1;
      const dy = Math.floor(i / 3) - 1;
      const sp = project(p, c.x + 0.5 + dx * 0.9, c.y + 0.5 + dy * 0.9, 18 + Math.sin(view.time * 2 + i) * 6);
      fx.circle(sp.x, sp.y, 30 + Math.sin(view.time * 1.5 + i * 2) * 4).fill({
        color: 0xb8bcc8,
        alpha: 0.55,
      });
    }

  // Noise ripples spreading out from a sound.
  for (const r of ripples) {
    const sp = project(p, r.x + 0.5, r.y + 0.5);
    const R = Math.max(0.15, r.r * r.t);
    fx.ellipse(sp.x, sp.y, (R * TILE_W) / Math.SQRT2, (R * TILE_H) / Math.SQRT2).stroke({
      width: 3,
      color: 0xfff0b0,
      alpha: (1 - r.t) * 0.85,
    });
  }

  drawLootHops(view, fr, level, leo);
}

/** Loot just taken hops in an arc from its stand into Leo's bag. */
function drawLootHops(view: HeistView, fr: Frame, level: Level, leo: Actor): void {
  const { p, fx } = fr;
  for (const pop of view.pops) {
    pop.t += fr.dt / 0.55;
    const from = level.def.loot[pop.li]?.at;
    if (!from) continue;
    const k = Math.min(1, pop.t);
    const e = 1 - (1 - k) * (1 - k); // ease out
    const x = from.x + 0.5 + (leo.x - from.x - 0.5) * e;
    const y = from.y + 0.5 + (leo.y - from.y - 0.5) * e;
    const sp = project(p, x, y, 40 + Math.sin(k * Math.PI) * 46 - k * 10);
    const size = 1.25 - k * 0.65;
    const pic = lootPicture(level.def.loot[pop.li].name);
    fx.circle(sp.x, sp.y, 20 * size).fill({ color: 0xfff3c4, alpha: 0.25 * (1 - k) });
    if (pic)
      fx.setFillStyle({ color: 0xffffff, alpha: 1 }).texture(
        pic.tex,
        pic.tint,
        sp.x - (pic.w * size) / 2,
        sp.y - (pic.h * size) / 2,
        pic.w * size,
        pic.h * size,
      );
    else
      fx.poly([
        sp.x,
        sp.y - 9 * size,
        sp.x + 7 * size,
        sp.y,
        sp.x,
        sp.y + 6 * size,
        sp.x - 7 * size,
        sp.y,
      ]).fill({
        color: LOOT_COLORS[pop.li % LOOT_COLORS.length],
      });
  }
  view.pops = view.pops.filter((q) => q.t < 1);
}
