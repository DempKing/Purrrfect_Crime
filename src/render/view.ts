// Draws a heist: floors and overlays first, then walls, furniture and characters sorted by depth.
// The HeistView class runs each frame; the drawing helpers live in render/draw/.
import { Container, Graphics } from 'pixi.js';
import type { Level, Point } from '../core/level';
import {
  beaconTiles,
  camerasActive,
  hiddenAt,
  key,
  KIND_SIGHT,
  lasersActive,
  lightMap,
  lootAt,
  lootGone,
  type Notice,
  PRINT_TURNS,
  ROBO_RANGE,
  roboOff,
  sensorsActive,
  SIGHT_RANGE,
  spotlightsNow,
  type State,
  tileNow,
} from '../core/game';
import { project, type Projector, TILE_H, TILE_W } from './iso';
import { CREAK, type Look, lookFor, PLATE, surface } from './surfaces';
import { DISTRICTS } from '../levels';
import { prop } from './props';
import { tileHash } from '../core/exhibits';
import { lootPicture } from './characters';
import {
  controlBox,
  door,
  floorTile,
  gap,
  glass,
  grate,
  keydoor,
  planks,
  plate,
  vault,
  wallDecor,
  wire,
} from './draw/walls';
import { decoyCard, drawAlert, keycard, pawPrint, region, riskMark, viewCone } from './draw/overlays';
import {
  belt,
  crate,
  crateStack,
  desk,
  displayCase,
  drawBeam,
  exhibitUnderLight,
  kennel,
  ladder,
  paint,
  plinth,
  safe,
} from './draw/furniture';
import { COL, hatchVision, LOOT_COLORS, RAFTER_Z, STUB_H, WALL_H } from './draw/style';
import { diamond, diamondOutline, nearOuterWall, prism, tintColor } from './draw/shapes';
import { drawGuard, drawLeo, drawNightClaw, drawRival, drawRobo, sprite, zzz } from './draw/characters';
import { beacon, camera, ceilingLight, drawLamp, exitSign, laser, lightSwitch } from './draw/lights';

export * from './draw/style';
export * from './draw/shapes';
export * from './draw/walls';
export * from './draw/lights';
export * from './draw/furniture';
export * from './draw/overlays';
export * from './draw/characters';

export interface Overlay {
  reach1: Set<string>;
  reach2: Set<string>;
  vision: Set<string>;
  cameraVision: Set<string>;
  footprints: Point[];
  /** Where the rival is heading next turn. */
  rivalPath: Point[];
  path: Point[];
  /** 1 noticed, 2 caught or alarm, per tile on the path. */
  pathDanger: Map<string, number>;
  hover: Point | null;
  /** Where the gadget or skill being aimed can go. */
  targets: Set<string>;
  /** Tiles where ending the turn goes wrong once the guards move: caught, alarm or seen. */
  risky: Map<string, { kind: 'caught' | 'alarm' | 'seen'; why: string } | null>;
  /** What just went wrong, for a few seconds: a ring on the spot and a line back to whoever noticed. */
  alerts: Notice[];
}
/** How a character is moving, which picks their animation. */
export type Gait = 'walk' | 'run' | 'sneak' | 'crawl' | 'leap' | 'climb';
export interface Actor {
  x: number; // continuous grid position (tile x + 0.5 is the centre)
  y: number;
  facing: number;
  bob: number;
  /** Set while moving. */
  gait?: Gait;
  /** Steps walked so far, for the stride. */
  phase?: number;
  /** 0..1 through a pounce. */
  leapT?: number;
  /** 1 just after Leo does something with his paws (picking, cracking, grabbing), easing to 0. */
  work?: number;
  /** Facing right on screen (the drawings face left). Kept while walking straight up or down the screen. */
  flip?: boolean;
}
export interface Ripple {
  x: number;
  y: number;
  r: number; // tiles
  t: number; // 0..1
}
export const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];
export interface Drawable {
  depth: number;
  draw: (g: Graphics) => void;
}
export class HeistView {
  root = new Container();
  /** The floor itself (tiles, textures, light and shadow): drawn again only when it can have changed. */
  floorBase = new Graphics();
  floorKey = '';
  floorRes = 0;
  /** Screen pixels per world pixel, so the cached floor stays sharp at any zoom. */
  detail = 1;
  /** What moves on the floor every frame: highlights, cones, belts, the path. */
  floor = new Graphics();
  objects = new Graphics();
  fx = new Graphics();
  proj: Projector = { angle: 0, cx: 0, cy: 0 };
  time = 0;
  district = '';
  look: Look = lookFor('old-town', '');
  districtOf = '';
  light: number[][] = [];
  lastTime = 0;
  coneCache = new Map<string, number[]>();
  lvl: Level | null = null;
  /** Leo's height off the floor, easing between the floor and the rafters as he climbs. */
  leoLift = 0;
  /** 0..1: how far Leo has ducked into a crate. */
  leoHide = 0;
  /** Loot on its way from its stand to Leo's bag. */
  pops: { li: number; t: number }[] = [];
  inventorySeen: number[] = [];

  constructor() {
    this.root.addChild(this.floorBase, this.floor, this.objects, this.fx);
  }

  /** The zoom (times the screen's pixel density). The floor's picture is redrawn sharper or softer when it settles. */
  setDetail(pixelsPerUnit: number): void {
    const want = Math.round(pixelsPerUnit * 4) / 4;
    if (Math.abs(want - this.detail) >= 0.25) {
      this.detail = want;
      this.floorKey = '';
    }
  }

  draw(
    level: Level,
    s: State,
    ov: Overlay,
    leo: Actor,
    guards: Actor[],
    ripples: Ripple[],
    rival?: Actor,
  ): void {
    const p = this.proj;
    const f = this.floor;
    const o = this.objects;
    f.clear();
    o.clear();
    this.fx.clear();
    const light = lightMap(level, s.lampsOff);
    this.light = light;
    this.lvl = level;
    const dt = Math.min(0.1, Math.max(0, this.time - this.lastTime));
    this.lastTime = this.time;
    if (this.districtOf !== level.def.id || s.inventory.length < this.inventorySeen.length) {
      this.inventorySeen = [...s.inventory];
      this.pops = [];
    }
    for (const li of s.inventory) if (!this.inventorySeen.includes(li)) this.pops.push({ li, t: 0 });
    this.inventorySeen = [...s.inventory];
    leo.work = Math.max(0, (leo.work ?? 0) - dt * 1.4);
    if (this.districtOf !== level.def.id) {
      this.districtOf = level.def.id;
      this.district = DISTRICTS.find((d) => d.levels.some((l) => l.id === level.def.id))?.id ?? 'old-town';
      this.look = lookFor(this.district, level.def.id);
    }
    const beam = beaconTiles(level, s);
    const inVent = s.layer === 'vent';
    const inRafters = s.layer === 'rafter';
    const spots = spotlightsNow(level, s);

    // Floors, shaded by light, with the overlays painted on top of them. The floor and its lighting only change
    // between turns, when a switch is flipped, the camera turns or the textures arrive; the rest is every frame.
    const baseKey = `${level.def.id}|${p.angle.toFixed(5)}|${s.turn}|${s.lampsOff.join(',')}|${s.layer}|${surface(this.look.floor.tex) ? 1 : 0}`;
    const fb = baseKey !== this.floorKey ? this.floorBase.clear() : null;
    this.floorKey = baseKey;
    if (fb) {
      // The floor is kept as one picture, drawn again only when it changes: far fewer shapes every frame.
      const b = this.floorBase.getLocalBounds();
      const res = Math.max(0.5, Math.min(this.detail, 4096 / Math.max(1, b.width, b.height)));
      if (Math.abs(res - this.floorRes) > 0.01) {
        this.floorRes = res;
        this.floorBase.cacheAsTexture({ resolution: res, antialias: true });
      } else this.floorBase.updateCacheTexture();
    }
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = tileNow(level, s, x, y);
        if (t === 'wall' || t === 'pillar' || t === 'stack' || t === 'panel' || t === 'fuse') continue;
        const k = key(x, y);
        if (t === 'gap' || t === 'wire') {
          gap(this, f, level, x, y);
          continue;
        }
        if (t === 'keycard') keycard(this, f, x, y);
        if (t === 'belt-e' || t === 'belt-w') belt(this, f, x, y, t === 'belt-e' ? 1 : -1);
        if (fb) {
          const sand = tileNow(level, s, x, y) === 'floor' && level.tiles[y][x] === 'tidal';
          const base = sand
            ? (x + y) % 2
              ? 0xa58a5e
              : 0x9a8056
            : t === 'exit'
              ? COL.exit
              : t === 'marble'
                ? (x + y) % 2
                  ? COL.marbleA
                  : COL.marbleB
                : t === 'squeaky'
                  ? (x + y) % 2
                    ? 0x7a5634
                    : 0x6e4c2d
                  : (x + y) % 2
                    ? COL.carpetA
                    : COL.carpetB;
          const skin =
            sand || t === 'exit'
              ? null
              : t === 'squeaky'
                ? CREAK
                : t === 'plate'
                  ? PLATE
                  : t === 'marble'
                    ? this.look.marble
                    : this.look.floor;
          const skinned = !!skin && floorTile(this, fb, x, y, skin);
          if (!skinned) diamond(this, fb, x, y, 0.5, base, 1, COL.floorLine);
          if (t === 'squeaky' && !skinned) planks(this, fb, x, y);
          if (t === 'plate' && !skinned) plate(this, fb, x, y);
          if (t === 'paint') paint(this, fb, x, y);
          const spotlit =
            spots.some((sp) => Math.hypot(x - sp.at.x, y - sp.at.y) <= sp.radius + 0.01) || beam.has(k);
          const l = spotlit ? 2 : light[y][x];
          if (l === 0) diamond(this, fb, x, y, 0.5, 0x05060c, 0.55);
          else if (l === 2)
            diamond(this, fb, x, y, 0.5, spotlit ? 0xfff6d8 : COL.lampGlow, spotlit ? 0.32 : 0.16);
          if (t === 'grate') grate(this, fb, x, y);
          if (inVent || inRafters) diamond(this, fb, x, y, 0.5, 0x02030a, 0.45);
        }
        if ((level.def.fishy ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h))
          diamond(this, f, x, y, 0.5, 0x6fd6a0, 0.07 + Math.sin(this.time * 1.5 + x * 0.7 + y) * 0.03);
        if (level.motion[y][x] && sensorsActive(s))
          diamondOutline(this, f, x, y, COL.motion, 1, 0.1, 0.35 + Math.sin(this.time * 3) * 0.1);
        if (ov.targets.has(k)) {
          diamond(this, f, x, y, 0.4, COL.target, 0.28 + Math.sin(this.time * 5) * 0.08);
          diamondOutline(this, f, x, y, COL.target, 1.5, 0.12, 0.8);
        }
        const r = ov.risky.get(k);
        if (r && (ov.reach1.has(k) || ov.reach2.has(k))) riskMark(this, f, x, y, r.kind);
      }
    // Each guard's and camera's view: a cone on the floor, cut off by walls.
    if (!inVent && !inRafters) {
      guards.forEach((a, i) => {
        const g = s.guards[i];
        if (!g || g.asleep || roboOff(s, g) || s.status !== 'playing') return;
        const range = g.kind === 'robo' ? ROBO_RANGE * s.perks.sight : SIGHT_RANGE.lit * KIND_SIGHT[g.kind];
        const alert = g.mode !== 'patrol';
        viewCone(this, f, level, s, a.x, a.y, a.facing, range, alert ? COL.danger : COL.vision, 0);
      });
      for (const c of s.cameras)
        if (camerasActive(s, c)) {
          viewCone(this, f, level, s, c.at.x + 0.5, c.at.y + 0.5, c.sweep[c.idx], c.range, COL.camera, 0);
          // Where it will look after the guards' turn: just an outline.
          const next = c.sweep[(c.idx + 1) % c.sweep.length];
          if (next !== c.sweep[c.idx])
            viewCone(this, f, level, s, c.at.x + 0.5, c.at.y + 0.5, next, c.range, COL.camera, 0);
        }
    }

    // The vent layer, drawn like a blueprint while Leo is inside.
    if (inVent)
      for (let y = 0; y < level.h; y++)
        for (let x = 0; x < level.w; x++) {
          if (!level.ducts[y][x]) continue;
          diamond(this, f, x, y, 0.42, COL.duct, 0.18);
          diamondOutline(this, f, x, y, COL.duct, 1.5, 0.08, 0.6);
        }
    // Up in the rafters, the beams Leo can walk are drawn on the floor below like a plan.
    if (inRafters)
      for (let y = 0; y < level.h; y++)
        for (let x = 0; x < level.w; x++) {
          if (!level.rafters[y][x]) continue;
          diamond(this, f, x, y, 0.42, COL.beam, 0.2);
          diamondOutline(this, f, x, y, COL.beam, 1.5, 0.08, 0.6);
        }
    // The areas, outlined rather than filled: where the guards and cameras would see Leo, and how far he can go
    // this turn (blue for one action point, yellow round everything two can reach).
    region(this, f, ov.cameraVision, COL.camera, 2.5, 0.95);
    region(this, f, ov.vision, COL.vision, 2.5, 0.95, hatchVision);
    region(this, f, new Set([...ov.reach1, ...ov.reach2]), COL.reach2, 3, 0.95);
    region(this, f, ov.reach1, COL.reach1, 3, 0.95);
    for (const d of s.decoys) decoyCard(this, f, d);
    for (const pr of s.prints) pawPrint(this, f, pr, pr.turns / PRINT_TURNS);
    for (const fp of ov.footprints) {
      const sp = project(p, fp.x + 0.5, fp.y + 0.5);
      f.circle(sp.x, sp.y, 4).fill({ color: COL.step, alpha: 0.75 });
    }
    for (const fp of ov.rivalPath) {
      const sp = project(p, fp.x + 0.5, fp.y + 0.5);
      f.circle(sp.x - 3, sp.y, 3).fill({ color: COL.rival, alpha: 0.85 });
      f.circle(sp.x + 3, sp.y - 2, 3).fill({ color: COL.rival, alpha: 0.85 });
    }
    for (let i = 1; i < ov.path.length; i++) {
      const a = project(p, ov.path[i - 1].x + 0.5, ov.path[i - 1].y + 0.5);
      const b = project(p, ov.path[i].x + 0.5, ov.path[i].y + 0.5);
      const d = ov.pathDanger.get(key(ov.path[i].x, ov.path[i].y)) ?? 0;
      f.moveTo(a.x, a.y)
        .lineTo(b.x, b.y)
        .stroke({ width: 4, color: d === 2 ? COL.danger : d === 1 ? COL.warn : COL.path, alpha: 0.95 });
    }
    for (const a of ov.alerts) drawAlert(this, f, a);
    if (ov.hover) {
      // The tile under the pointer, outlined in the colour of what walking there would bring.
      const worst = Math.max(0, ...ov.pathDanger.values());
      diamondOutline(
        this,
        f,
        ov.hover.x,
        ov.hover.y,
        worst === 2 ? COL.danger : worst === 1 ? COL.warn : COL.path,
        3.5,
        0.02,
        1,
      );
    }

    // Everything standing up, nearest last.
    const items: Drawable[] = [];
    const ceiling: { x: number; y: number; on: boolean; lamp: boolean }[] = [];
    const leoDepth = project(p, leo.x, leo.y).depth;
    // A rival in the building gets the same view: walls in front of them drop down so you can see them.
    const rivalIn = !!rival && !!s.rival && (s.rival.phase === 'in' || s.rival.phase === 'leaving');
    const rivalDepth = rival ? project(p, rival.x, rival.y).depth : 0;
    const lasersOn = lasersActive(level, s);
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = tileNow(level, s, x, y);
        const d = project(p, x + 0.5, y + 0.5).depth;
        const k = key(x, y);
        if (
          t === 'wall' ||
          t === 'pillar' ||
          t === 'stack' ||
          t === 'door' ||
          t === 'keydoor' ||
          t === 'vault' ||
          t === 'panel' ||
          t === 'fuse' ||
          t === 'switch'
        ) {
          // Walls between the camera and Leo, the near outer walls, and every wall while Leo is in the vents drop to stubs.
          // Control boxes stay full height, so the box on them is always where you'd reach for it.
          const box = t === 'panel' || t === 'fuse';
          const near =
            !box &&
            (inVent ||
              inRafters ||
              (Math.hypot(x + 0.5 - leo.x, y + 0.5 - leo.y) < 3.6 && d > leoDepth + 0.2) ||
              (rivalIn && Math.hypot(x + 0.5 - rival!.x, y + 0.5 - rival!.y) < 2.6 && d > rivalDepth + 0.2) ||
              nearOuterWall(this, level, x, y));
          const h = near ? STUB_H : t === 'pillar' ? WALL_H - 6 : WALL_H;
          const a = near ? 0.75 : 1;
          if (t === 'wall' && !near) wallDecor(this, level, s, x, y, d, items);
          if (t === 'stack')
            items.push({ depth: d, draw: (g) => crateStack(this, g, x, y, near ? STUB_H : WALL_H - 20, a) });
          else if (t === 'pillar' && level.def.id === 'l2-clocktower' && prop('vintage_grandfather_clock_01'))
            // In the Clocktower, the pillars are grandfather clocks, each facing its own way.
            items.push({
              depth: d,
              draw: (g) =>
                void sprite(
                  this,
                  g,
                  'vintage_grandfather_clock_01',
                  x + 0.5,
                  y + 0.5,
                  0,
                  Math.floor(tileHash(x, y, 5) * 4) * (Math.PI / 2),
                  near ? 0.35 : 1,
                  tintColor(this, x, y),
                ),
            });
          else if (t === 'pillar')
            items.push({
              depth: d,
              draw: (g) =>
                prism(this, g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, h, 0xe6e0d0, COL.pillar, 0x948f82, a),
            });
          else if (t === 'door')
            items.push({
              depth: d,
              draw: (g) => door(this, g, x, y, near ? STUB_H : WALL_H - 10, a, s.picks[k] ?? 0),
            });
          else if (t === 'keydoor')
            items.push({
              depth: d,
              draw: (g) =>
                keydoor(this, g, x, y, near ? STUB_H : WALL_H - 10, a, s.card === 'leo' || s.perks.masterKey),
            });
          else if (t === 'vault')
            items.push({
              depth: d,
              draw: (g) =>
                vault(this, g, x, y, near ? STUB_H : WALL_H - 4, a, s.picks[k] ?? 0, s.combination),
            });
          else
            items.push({
              depth: d,
              draw: (g) => {
                prism(
                  this,
                  g,
                  x,
                  y,
                  x + 1,
                  y + 1,
                  h,
                  t === 'switch' ? 0xe6e0d0 : surface(this.look.wall.tex) ? this.look.wall.top : COL.wallTop,
                  COL.wallA,
                  COL.wallB,
                  a,
                  0,
                  this.look.wall,
                );
                if (box) controlBox(this, g, level, s, x, y, t, t === 'panel' ? s.camerasOff : s.lasersOff);
                if (t === 'switch')
                  lightSwitch(
                    this,
                    g,
                    x,
                    y,
                    h,
                    (level.def.switches ?? []).some(
                      (w) => w.at.x === x && w.at.y === y && w.lamps.some((i) => s.lampsOff.includes(i)),
                    ),
                  );
              },
            });
        } else if (t === 'case' || t === 'plinth') {
          ceiling.push({ x, y, on: true, lamp: false });
        }
        if (t === 'case') {
          const li = lootAt(level, x, y);
          const taken = li >= 0 && lootGone(s, li);
          const broken = s.smashed.includes(k);
          items.push({ depth: d, draw: (g) => displayCase(this, g, x, y, li, taken, broken) });
        } else if (t === 'plinth') {
          const li = lootAt(level, x, y);
          items.push({
            depth: d,
            draw: (g) => plinth(this, g, x, y, li >= 0 && !lootGone(s, li), s.rivalLoot.includes(li)),
          });
        } else if (t === 'lamp') {
          const off = s.lampsOff.includes(level.lamps.findIndex((l) => l.at.x === x && l.at.y === y));
          const li = lootAt(level, x, y);
          const gone = li >= 0 && lootGone(s, li);
          if (!exhibitUnderLight(this, items, d, x, y, !off, gone))
            items.push({ depth: d, draw: (g) => drawLamp(this, g, x, y, !off) });
          ceiling.push({ x, y, on: !off, lamp: true });
        } else if (t === 'laser') {
          items.push({ depth: d + 0.3, draw: (g) => laser(this, g, level, x, y, lasersOn) });
        } else if (t === 'exit') {
          items.push({ depth: d - 0.4, draw: (g) => exitSign(this, g, x, y) });
        } else if (t === 'safe') {
          const li = lootAt(level, x, y);
          items.push({
            depth: d,
            draw: (g) =>
              safe(
                this,
                g,
                level,
                x,
                y,
                s.smashed.includes(k) || (li >= 0 && lootGone(s, li)),
                s.picks[k] ?? 0,
                s.perks.safeCracks,
              ),
          });
        } else if (t === 'seat') {
          items.push({
            depth: d,
            draw: (g) =>
              prism(this, g, x + 0.08, y + 0.2, x + 0.92, y + 0.8, 20, 0x9c2a3a, 0x7a1f2c, 0x5e1722, 1),
          });
        } else if (t === 'ladder') {
          items.push({ depth: d + 0.2, draw: (g) => ladder(this, g, x, y) });
        } else if (t === 'wire') {
          items.push({ depth: d, draw: (g) => wire(this, g, level, x, y) });
        } else if (t === 'glass') {
          items.push({ depth: d, draw: (g) => glass(this, g, level, x, y) });
        } else if (t === 'kennel') {
          items.push({ depth: d, draw: (g) => kennel(this, g, x, y) });
        } else if (t === 'crate') {
          const inside = hiddenAt(level, s, { x, y }) && s.leo.x === x && s.leo.y === y;
          items.push({ depth: d, draw: (g) => crate(this, g, x, y, inside) });
        } else if (t === 'desk') {
          items.push({ depth: d, draw: (g) => desk(this, g, x, y, s.combination) });
        }
        // The rafters: beams high overhead, drawn faintly unless Leo is up there.
        if (level.rafters[y][x])
          items.push({ depth: d + 0.6, draw: (g) => drawBeam(this, g, x, y, inRafters ? 0.95 : 0.35) });
      }
    // Loot Leo has put down, lying on the floor where he left it, with a little glint.
    s.dropped.forEach((dr, i) => {
      const pic = lootPicture(level.def.loot[dr.li].name);
      const d = project(p, dr.x + 0.5, dr.y + 0.5).depth;
      items.push({
        depth: d - 0.1,
        draw: (g) => {
          const off = (i % 3) * 0.12 - 0.12;
          const c = project(p, dr.x + 0.5 + off, dr.y + 0.5 - off, 0);
          g.ellipse(c.x, c.y, 14, 6).fill({
            color: 0xfff3c4,
            alpha: 0.18 + Math.sin(this.time * 3 + i) * 0.06,
          });
          if (pic) {
            const k = 22 / Math.max(pic.w, pic.h);
            g.setFillStyle({ color: 0xffffff, alpha: 1 });
            g.texture(pic.tex, pic.tint, c.x - (pic.w * k) / 2, c.y - pic.h * k + 4, pic.w * k, pic.h * k);
          } else
            g.poly([c.x, c.y - 9, c.x + 6, c.y - 2, c.x, c.y + 3, c.x - 6, c.y - 2])
              .fill({ color: LOOT_COLORS[dr.li % LOOT_COLORS.length] })
              .stroke({ width: 1, color: 0x1c1233 });
        },
      });
    });
    if (level.def.beacon) beacon(this, level, s);
    for (const sp of spots) {
      const c = project(p, sp.at.x + 0.5, sp.at.y + 0.5);
      this.fx
        .ellipse(
          c.x,
          c.y,
          ((sp.radius + 0.5) * TILE_W) / Math.SQRT2,
          ((sp.radius + 0.5) * TILE_H) / Math.SQRT2,
        )
        .fill({ color: 0xfff6d8, alpha: 0.1 });
    }
    for (const c of s.cameras) {
      const facing = c.sweep[c.idx];
      items.push({
        depth: project(p, c.at.x + 0.5, c.at.y + 0.5).depth + 0.4,
        draw: (g) => camera(this, g, c.at, facing, !camerasActive(s, c)),
      });
    }
    const liftTo = inRafters ? RAFTER_Z - 6 : 0;
    const climbing = Math.abs(liftTo - this.leoLift) > 1;
    this.leoLift += Math.max(-dt * 170, Math.min(dt * 170, liftTo - this.leoLift));
    const tucked =
      hiddenAt(level, s, s.leo) && s.leo.x === Math.floor(leo.x) && s.leo.y === Math.floor(leo.y);
    this.leoHide = Math.max(0, Math.min(1, this.leoHide + (tucked ? dt * 4 : -dt * 6)));
    if (this.leoHide < 0.98)
      items.push({
        depth: leoDepth + 0.05,
        draw: (g) => {
          const gait = leo.gait;
          if (climbing) leo.gait = 'climb';
          drawLeo(this, g, leo, inVent, this.leoLift);
          leo.gait = gait;
          if (s.napTurns > 0) zzz(this, g, leo);
        },
      });
    const r = s.rival;
    if (rival && r && (r.phase === 'in' || r.phase === 'leaving'))
      items.push({
        depth: project(p, rival.x, rival.y).depth + 0.05,
        draw: (g) => drawRival(this, g, rival, r.id, r.prize),
      });
    guards.forEach((a, i) =>
      items.push({
        depth: project(p, a.x, a.y).depth + 0.05,
        draw: (g) =>
          s.guards[i].kind === 'nightclaw'
            ? drawNightClaw(this, g, a, s.guards[i], s.status === 'caught' && s.caughtBy === s.guards[i].name)
            : s.guards[i].kind === 'robo'
              ? drawRobo(
                  this,
                  g,
                  a,
                  s.guards[i],
                  roboOff(s, s.guards[i]),
                  s.status === 'caught' && s.caughtBy === s.guards[i].name,
                )
              : drawGuard(this, g, a, s.guards[i], s.status === 'caught' && s.caughtBy === s.guards[i].name),
      }),
    );
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw(o);

    // The lights hang from the ceiling, above everything: a pendant over each lamp, a small spot over each
    // case and plinth, each with its beam.
    if (!inVent && !inRafters) for (const c of ceiling) ceilingLight(this, this.fx, c.x, c.y, c.on, c.lamp);

    // Smoke pellets: drifting grey puffs over each cloud's 3×3 tiles.
    for (const c of s.smoke)
      for (let i = 0; i < 9; i++) {
        const dx = (i % 3) - 1;
        const dy = Math.floor(i / 3) - 1;
        const sp = project(
          p,
          c.x + 0.5 + dx * 0.9,
          c.y + 0.5 + dy * 0.9,
          18 + Math.sin(this.time * 2 + i) * 6,
        );
        this.fx
          .circle(sp.x, sp.y, 30 + Math.sin(this.time * 1.5 + i * 2) * 4)
          .fill({ color: 0xb8bcc8, alpha: 0.55 });
      }

    // Noise ripples spreading from where the sound was made. A circle on the floor is an ellipse on screen.
    for (const r of ripples) {
      const sp = project(p, r.x + 0.5, r.y + 0.5);
      const R = Math.max(0.15, r.r * r.t);
      this.fx
        .ellipse(sp.x, sp.y, (R * TILE_W) / Math.SQRT2, (R * TILE_H) / Math.SQRT2)
        .stroke({ width: 3, color: 0xfff0b0, alpha: (1 - r.t) * 0.85 });
    }

    // Loot just taken: it hops from its stand into Leo's bag.
    for (const pop of this.pops) {
      pop.t += dt / 0.55;
      const from = level.def.loot[pop.li]?.at;
      if (!from) continue;
      const k = Math.min(1, pop.t);
      const e = 1 - (1 - k) * (1 - k);
      const x = from.x + 0.5 + (leo.x - from.x - 0.5) * e;
      const y = from.y + 0.5 + (leo.y - from.y - 0.5) * e;
      const sp = project(p, x, y, 40 + Math.sin(k * Math.PI) * 46 - k * 10);
      const size = 1.25 - k * 0.65;
      const pic = lootPicture(level.def.loot[pop.li].name);
      this.fx.circle(sp.x, sp.y, 20 * size).fill({ color: 0xfff3c4, alpha: 0.25 * (1 - k) });
      if (pic)
        this.fx
          .setFillStyle({ color: 0xffffff, alpha: 1 })
          .texture(
            pic.tex,
            pic.tint,
            sp.x - (pic.w * size) / 2,
            sp.y - (pic.h * size) / 2,
            pic.w * size,
            pic.h * size,
          );
      else
        this.fx
          .poly([sp.x, sp.y - 9 * size, sp.x + 7 * size, sp.y, sp.x, sp.y + 6 * size, sp.x - 7 * size, sp.y])
          .fill({ color: LOOT_COLORS[pop.li % LOOT_COLORS.length] });
    }
    this.pops = this.pops.filter((q) => q.t < 1);
  }
}
