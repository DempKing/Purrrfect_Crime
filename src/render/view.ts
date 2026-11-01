// Draws a heist each frame, in stages: the floor, marks on the floor, everything standing (sorted by depth so
// nearer things cover farther ones), then effects on top. The stages and helpers live in render/draw/.
import { Container, Graphics } from 'pixi.js';
import type { Level } from '../core/level';
import { beaconTiles, lightMap, spotlightsNow, type State } from '../core/game';
import { DISTRICTS } from '../levels';
import { project, type Projector } from './iso';
import { type Look, lookFor, surface } from './surfaces';
import type { Actor, Frame, Overlay, Ripple } from './draw/types';
import { drawFloor, drawFloorMarks, drawLayerPlan, drawViewCones } from './draw/floor';
import { cameraItems, characterItems, droppedLoot, standingItems } from './draw/standing';
import { drawEffects, drawSpotlights } from './draw/effects';

export type { Actor, Gait, Overlay, Ripple } from './draw/types';
export { setPalette } from './draw/style';

export class HeistView {
  root = new Container();

  // Layers, bottom to top.
  floorBase = new Graphics(); // the floor picture, cached and only redrawn when it changes
  floor = new Graphics(); // per-frame floor marks: highlights, cones, the path
  objects = new Graphics(); // walls, furniture, characters
  fx = new Graphics(); // lights, smoke, ripples

  floorKey = ''; // what the cached floor was drawn for; a change means redraw
  floorRes = 0; // resolution of the cached floor picture
  detail = 1; // screen pixels per world pixel, so the cached floor stays sharp at any zoom

  proj: Projector = { angle: 0, cx: 0, cy: 0 };
  time = 0; // seconds, set by the game loop
  lastTime = 0;

  // The current level's look (textures and colours for its district).
  district = '';
  districtOf = '';
  look: Look = lookFor('old-town', '');

  light: number[][] = [];
  coneCache = new Map<string, number[]>();
  lvl: Level | null = null;

  leoLift = 0; // Leo's height off the floor, easing between floor and rafters
  leoHide = 0; // 0..1: how far Leo has ducked into a crate
  pops: { li: number; t: number }[] = []; // loot on its way into Leo's bag
  inventorySeen: number[] = [];

  constructor() {
    this.root.addChild(this.floorBase, this.floor, this.objects, this.fx);
  }

  /** Called when the zoom settles: the cached floor is redrawn sharper or softer to match. */
  setDetail(pixelsPerUnit: number): void {
    const want = Math.round(pixelsPerUnit * 4) / 4;
    if (Math.abs(want - this.detail) >= 0.25) {
      this.detail = want;
      this.floorKey = '';
    }
  }

  /** Draws one frame of the heist. */
  draw(
    level: Level,
    s: State,
    ov: Overlay,
    leo: Actor,
    guards: Actor[],
    ripples: Ripple[],
    rival?: Actor,
  ): void {
    const fr = this.beginFrame(level, s, leo);

    // 1. The floor and the marks on it.
    drawFloor(this, fr, level, s, ov);
    drawViewCones(this, fr, level, s, guards);
    drawLayerPlan(this, fr, level);
    drawFloorMarks(this, fr, s, ov);

    // 2. Everything standing, nearest last.
    const items = [...standingItems(this, fr, level, s, leo, rival), ...droppedLoot(this, fr, level, s)];
    drawSpotlights(this, fr, level, s);
    items.push(...cameraItems(this, fr, s), ...characterItems(this, fr, level, s, leo, guards, rival));
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw(fr.o);

    // 3. Effects on top.
    drawEffects(this, fr, level, s, leo, ripples);
  }

  /** Clears the layers and works out what every stage of this frame needs. */
  private beginFrame(level: Level, s: State, leo: Actor): Frame {
    this.floor.clear();
    this.objects.clear();
    this.fx.clear();
    const light = lightMap(level, s.lampsOff);
    this.light = light;
    this.lvl = level;
    const dt = Math.min(0.1, Math.max(0, this.time - this.lastTime));
    this.lastTime = this.time;

    // Start a loot hop for anything just picked up.
    if (this.districtOf !== level.def.id || s.inventory.length < this.inventorySeen.length) {
      this.inventorySeen = [...s.inventory];
      this.pops = [];
    }
    for (const li of s.inventory) if (!this.inventorySeen.includes(li)) this.pops.push({ li, t: 0 });
    this.inventorySeen = [...s.inventory];
    leo.work = Math.max(0, (leo.work ?? 0) - dt * 1.4);

    // A new level: pick up its district's look.
    if (this.districtOf !== level.def.id) {
      this.districtOf = level.def.id;
      this.district = DISTRICTS.find((d) => d.levels.some((l) => l.id === level.def.id))?.id ?? 'old-town';
      this.look = lookFor(this.district, level.def.id);
    }

    // The cached floor picture is only redrawn when something it shows has changed.
    const baseKey = `${level.def.id}|${this.proj.angle.toFixed(5)}|${s.turn}|${s.lampsOff.join(',')}|${s.layer}|${surface(this.look.floor.tex) ? 1 : 0}`;
    const fb = baseKey !== this.floorKey ? this.floorBase.clear() : null;
    this.floorKey = baseKey;
    if (fb) {
      const b = this.floorBase.getLocalBounds();
      const res = Math.max(0.5, Math.min(this.detail, 4096 / Math.max(1, b.width, b.height)));
      if (Math.abs(res - this.floorRes) > 0.01) {
        this.floorRes = res;
        this.floorBase.cacheAsTexture({ resolution: res, antialias: true });
      } else this.floorBase.updateCacheTexture();
    }

    return {
      p: this.proj,
      f: this.floor,
      o: this.objects,
      fx: this.fx,
      fb,
      light,
      dt,
      beam: beaconTiles(level, s),
      spots: spotlightsNow(level, s),
      inVent: s.layer === 'vent',
      inRafters: s.layer === 'rafter',
      leoDepth: project(this.proj, leo.x, leo.y).depth,
      ceiling: [],
    };
  }
}
