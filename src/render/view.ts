// Draws a heist: floors and overlays first, then walls, furniture and characters sorted by depth.
// Placeholder art for now; generated sprites replace the character and prop drawing later.
import { Container, Graphics, Matrix, type Texture } from 'pixi.js';
import { DIRS, KIND_SIGHT, PRINT_TURNS, ROBO_RANGE, SIGHT_HALF_ANGLE, SIGHT_RANGE, RIVALS, beaconFacing, beaconTiles, camerasActive, hiddenAt, roboOff, sensorsActive, key, lasersActive, lightMap, lootAt, spotlightsNow, tileNow, type Guard, type RivalId, type State } from '../core/game';
import { blocksMove, blocksSight, laserAxis, type Level, type Point } from '../core/level';
import { DISTRICTS } from '../levels';
import { exhibitAt, tileHash } from '../core/exhibits';
import { project, screenDir, TILE_H, TILE_W, type Projector } from './iso';
import { charFrame, lootPicture, type CharFrameName, type CharName } from './characters';
import { flat, STANDING_FLATS, WALL_FLATS, type FlatName } from './flats';
import { DECOR_DENSITY, frameFor, LEVEL_WALL_DECOR, LIT_ON_WALL, prop, WALL_DECOR, type ClockFace, type PropName } from './props';
import { CREAK, lookFor, PLATE, surface, type FloorSkin, type Look, type WallSkin } from './surfaces';

const WALL_H = 84;
const STUB_H = 12;
/** How high the rafters are. */
const RAFTER_Z = 92;

const COL = {
  carpetA: 0x4a2a3c,
  carpetB: 0x44263a,
  marbleA: 0x7d8299,
  marbleB: 0x737891,
  floorLine: 0x2a2236,
  exit: 0x2f7d5b,
  wallTop: 0x8e95ad,
  wallA: 0x5b6280,
  wallB: 0x474d68,
  pillar: 0xb7b2a4,
  caseGlass: 0x9fd7ff,
  caseBase: 0x5a4a3a,
  plinth: 0xd8d2c0,
  reach1: 0x4aa3ff,
  reach2: 0xffc54a,
  vision: 0xff5a4a,
  camera: 0xc77dff,
  path: 0xffffff,
  warn: 0xffd23f,
  danger: 0xff3b30,
  step: 0xffb199,
  lampGlow: 0xffd27a,
  duct: 0x5ec8ff,
  laser: 0xff2a2a,
  target: 0x5ef0ff,
  rival: 0xb05cff,
  motion: 0xff6a6a,
  beam: 0xd9a066,
};

// The overlay colours, and the colour-blind friendly set (Okabe–Ito): blue and yellow for reach, vermilion
// for what guards see (hatched, so it doesn't rely on colour), reddish purple for cameras.
const STANDARD = { reach1: COL.reach1, reach2: COL.reach2, vision: COL.vision, camera: COL.camera, warn: COL.warn, danger: COL.danger, path: COL.path };
const COLOURBLIND = { reach1: 0x0072b2, reach2: 0xf0e442, vision: 0xd55e00, camera: 0xcc79a7, warn: 0xf0e442, danger: 0xd55e00, path: 0xffffff };
let hatchVision = false;

export function setPalette(palette: 'standard' | 'colourblind'): void {
  Object.assign(COL, palette === 'colourblind' ? COLOURBLIND : STANDARD);
  hatchVision = palette === 'colourblind';
}

/** Loot colours by index, so each piece reads differently on its stand. */
const LOOT_COLORS = [0x9fe8ff, 0xf2c46b, 0xf5f0ff, 0xffd84a, 0xe0314b, 0xd9b36c, 0x3fbf7f, 0xb6a4ff];

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

const NEIGHBOURS = [
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 0, y: -1 },
];

interface Drawable {
  depth: number;
  draw: (g: Graphics) => void;
}

export class HeistView {
  root = new Container();
  /** The floor itself (tiles, textures, light and shadow): drawn again only when it can have changed. */
  private floorBase = new Graphics();
  private floorKey = '';
  private floorRes = 0;
  /** Screen pixels per world pixel, so the cached floor stays sharp at any zoom. */
  private detail = 1;
  /** What moves on the floor every frame: highlights, cones, belts, the path. */
  private floor = new Graphics();
  private objects = new Graphics();
  private fx = new Graphics();
  proj: Projector = { angle: 0, cx: 0, cy: 0 };
  time = 0;
  private district = '';
  private look: Look = lookFor('old-town', '');
  private districtOf = '';
  private light: number[][] = [];
  private lastTime = 0;
  private coneCache = new Map<string, number[]>();
  private lvl: Level | null = null;
  /** Leo's height off the floor, easing between the floor and the rafters as he climbs. */
  private leoLift = 0;
  /** 0..1: how far Leo has ducked into a crate. */
  private leoHide = 0;
  /** Loot on its way from its stand to Leo's bag. */
  private pops: { li: number; t: number }[] = [];
  private inventorySeen: number[] = [];

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

  draw(level: Level, s: State, ov: Overlay, leo: Actor, guards: Actor[], ripples: Ripple[], rival?: Actor): void {
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
    }    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = tileNow(level, s, x, y);
        if (t === 'wall' || t === 'pillar' || t === 'stack' || t === 'panel' || t === 'fuse') continue;
        const k = key(x, y);
        if (t === 'gap' || t === 'wire') {
          this.gap(f, level, x, y);
          if (ov.vision.has(k)) this.diamond(f, x, y, 0.47, COL.vision, 0.2);
          if (ov.cameraVision.has(k)) this.diamond(f, x, y, 0.46, COL.camera, 0.2);
          if (t === 'wire' && !inVent && !inRafters) {
            if (ov.reach1.has(k)) this.diamond(f, x, y, 0.38, COL.reach1, 0.3);
            else if (ov.reach2.has(k)) this.diamond(f, x, y, 0.38, COL.reach2, 0.26);
          }
          continue;
        }
        if (t === 'keycard') this.keycard(f, x, y);
        if (t === 'belt-e' || t === 'belt-w') this.belt(f, x, y, t === 'belt-e' ? 1 : -1);
        if (fb) {
        const sand = tileNow(level, s, x, y) === 'floor' && level.tiles[y][x] === 'tidal';
        const base = sand ? ((x + y) % 2 ? 0xa58a5e : 0x9a8056) : t === 'exit' ? COL.exit : t === 'marble' ? ((x + y) % 2 ? COL.marbleA : COL.marbleB) : t === 'squeaky' ? ((x + y) % 2 ? 0x7a5634 : 0x6e4c2d) : (x + y) % 2 ? COL.carpetA : COL.carpetB;
        const skin = sand || t === 'exit' ? null : t === 'squeaky' ? CREAK : t === 'plate' ? PLATE : t === 'marble' ? this.look.marble : this.look.floor;
        const skinned = !!skin && this.floorTile(fb, x, y, skin);
        if (!skinned) this.diamond(fb, x, y, 0.5, base, 1, COL.floorLine);
        if (t === 'squeaky' && !skinned) this.planks(fb, x, y);
        if (t === 'plate' && !skinned) this.plate(fb, x, y);
        if (t === 'paint') this.paint(fb, x, y);
        const spotlit = spots.some((sp) => Math.hypot(x - sp.at.x, y - sp.at.y) <= sp.radius + 0.01) || beam.has(k);
        const l = spotlit ? 2 : light[y][x];
        if (l === 0) this.diamond(fb, x, y, 0.5, 0x05060c, 0.55);
        else if (l === 2) this.diamond(fb, x, y, 0.5, spotlit ? 0xfff6d8 : COL.lampGlow, spotlit ? 0.32 : 0.16);
        if (t === 'grate') this.grate(fb, x, y);
        if (inVent || inRafters) this.diamond(fb, x, y, 0.5, 0x02030a, 0.45);
        }
        if ((level.def.fishy ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h)) this.diamond(f, x, y, 0.5, 0x6fd6a0, 0.07 + Math.sin(this.time * 1.5 + x * 0.7 + y) * 0.03);
        if (level.motion[y][x] && sensorsActive(s)) this.diamondOutline(f, x, y, COL.motion, 1, 0.1, 0.35 + Math.sin(this.time * 3) * 0.1);
        if (ov.cameraVision.has(k)) this.diamond(f, x, y, 0.46, COL.camera, 0.3);
        if (ov.targets.has(k)) {
          this.diamond(f, x, y, 0.4, COL.target, 0.28 + Math.sin(this.time * 5) * 0.08);
          this.diamondOutline(f, x, y, COL.target, 1.5, 0.12, 0.8);
        }
        if (ov.vision.has(k)) {
          this.diamond(f, x, y, 0.42, COL.vision, 0.3);
          if (hatchVision) this.hatch(f, x, y, COL.vision);
        }
        if (!inVent && !inRafters) {
          if (ov.reach1.has(k)) this.diamond(f, x, y, 0.38, COL.reach1, 0.3);
          else if (ov.reach2.has(k)) this.diamond(f, x, y, 0.38, COL.reach2, 0.26);
        }
        const r = ov.risky.get(k);
        if (r && (ov.reach1.has(k) || ov.reach2.has(k))) this.riskMark(f, x, y, r.kind);
      }
    // Each guard's and camera's view: a cone on the floor, cut off by walls.
    if (!inVent && !inRafters) {
      guards.forEach((a, i) => {
        const g = s.guards[i];
        if (!g || g.asleep || roboOff(s, g) || s.status !== 'playing') return;
        const range = g.kind === 'robo' ? ROBO_RANGE * s.perks.sight : SIGHT_RANGE.lit * KIND_SIGHT[g.kind];
        const alert = g.mode !== 'patrol';
        this.viewCone(f, level, s, a.x, a.y, a.facing, range, alert ? COL.danger : COL.vision, alert ? 0.22 : 0.16);
      });
      for (const c of s.cameras)
        if (camerasActive(s, c)) {
          this.viewCone(f, level, s, c.at.x + 0.5, c.at.y + 0.5, c.sweep[c.idx], c.range, COL.camera, 0.11);
          // Where it will look after the guards' turn: just an outline.
          const next = c.sweep[(c.idx + 1) % c.sweep.length];
          if (next !== c.sweep[c.idx]) this.viewCone(f, level, s, c.at.x + 0.5, c.at.y + 0.5, next, c.range, COL.camera, 0);
        }
    }

    // The vent layer, drawn like a blueprint while Leo is inside.
    if (inVent)
      for (let y = 0; y < level.h; y++)
        for (let x = 0; x < level.w; x++) {
          if (!level.ducts[y][x]) continue;
          const k = key(x, y);
          this.diamond(f, x, y, 0.42, COL.duct, 0.18);
          this.diamondOutline(f, x, y, COL.duct, 1.5, 0.08, 0.6);
          if (ov.reach1.has(k)) this.diamond(f, x, y, 0.3, COL.reach1, 0.45);
          else if (ov.reach2.has(k)) this.diamond(f, x, y, 0.3, COL.reach2, 0.4);
        }
    // Up in the rafters, the beams Leo can walk are drawn on the floor below like a plan.
    if (inRafters)
      for (let y = 0; y < level.h; y++)
        for (let x = 0; x < level.w; x++) {
          if (!level.rafters[y][x]) continue;
          const k = key(x, y);
          this.diamond(f, x, y, 0.42, COL.beam, 0.2);
          this.diamondOutline(f, x, y, COL.beam, 1.5, 0.08, 0.6);
          if (ov.reach1.has(k)) this.diamond(f, x, y, 0.3, COL.reach1, 0.45);
          else if (ov.reach2.has(k)) this.diamond(f, x, y, 0.3, COL.reach2, 0.4);
        }
    for (const d of s.decoys) this.decoyCard(f, d);
    for (const pr of s.prints) this.pawPrint(f, pr, pr.turns / PRINT_TURNS);
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
      f.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 4, color: d === 2 ? COL.danger : d === 1 ? COL.warn : COL.path, alpha: 0.95 });
    }
    if (ov.hover) {
      const worst = Math.max(0, ...ov.pathDanger.values());
      this.diamondOutline(f, ov.hover.x, ov.hover.y, worst === 2 ? COL.danger : worst === 1 ? COL.warn : COL.path, 3);
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
        if (t === 'wall' || t === 'pillar' || t === 'stack' || t === 'door' || t === 'keydoor' || t === 'vault' || t === 'panel' || t === 'fuse' || t === 'switch') {
          // Walls between the camera and Leo, the near outer walls, and every wall while Leo is in the vents drop to stubs.
          // Control boxes stay full height, so the box on them is always where you'd reach for it.
          const box = t === 'panel' || t === 'fuse';
          const near = !box && (inVent || inRafters || (Math.hypot(x + 0.5 - leo.x, y + 0.5 - leo.y) < 3.6 && d > leoDepth + 0.2) || (rivalIn && Math.hypot(x + 0.5 - rival!.x, y + 0.5 - rival!.y) < 2.6 && d > rivalDepth + 0.2) || this.nearOuterWall(level, x, y));
          const h = near ? STUB_H : t === 'pillar' ? WALL_H - 6 : WALL_H;
          const a = near ? 0.75 : 1;
          if (t === 'wall' && !near) this.wallDecor(level, s, x, y, d, items);
          if (t === 'stack') items.push({ depth: d, draw: (g) => this.crateStack(g, x, y, near ? STUB_H : WALL_H - 20, a) });
          else if (t === 'pillar' && level.def.id === 'l2-clocktower' && prop('vintage_grandfather_clock_01'))
            // In the Clocktower, the pillars are grandfather clocks, each facing its own way.
            items.push({ depth: d, draw: (g) => void this.sprite(g, 'vintage_grandfather_clock_01', x + 0.5, y + 0.5, 0, Math.floor(tileHash(x, y, 5) * 4) * (Math.PI / 2), near ? 0.35 : 1, this.tint(x, y)) });
          else if (t === 'pillar') items.push({ depth: d, draw: (g) => this.prism(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, h, 0xe6e0d0, COL.pillar, 0x948f82, a) });
          else if (t === 'door') items.push({ depth: d, draw: (g) => this.door(g, x, y, near ? STUB_H : WALL_H - 10, a, s.picks[k] ?? 0) });
          else if (t === 'keydoor') items.push({ depth: d, draw: (g) => this.keydoor(g, x, y, near ? STUB_H : WALL_H - 10, a, s.card === 'leo' || s.perks.masterKey) });
          else if (t === 'vault') items.push({ depth: d, draw: (g) => this.vault(g, x, y, near ? STUB_H : WALL_H - 4, a, s.picks[k] ?? 0, s.combination) });
          else
            items.push({
              depth: d,
              draw: (g) => {
                this.prism(g, x, y, x + 1, y + 1, h, t === 'switch' ? 0xe6e0d0 : surface(this.look.wall.tex) ? this.look.wall.top : COL.wallTop, COL.wallA, COL.wallB, a, 0, this.look.wall);
                if (box) this.controlBox(g, level, s, x, y, t, t === 'panel' ? s.camerasOff : s.lasersOff);
                if (t === 'switch') this.lightSwitch(g, x, y, h, (level.def.switches ?? []).some((w) => w.at.x === x && w.at.y === y && w.lamps.some((i) => s.lampsOff.includes(i))));
              },
            });
        } else if (t === 'case' || t === 'plinth') {
          ceiling.push({ x, y, on: true, lamp: false });
        }
        if (t === 'case') {
          const li = lootAt(level, x, y);
          const taken = li >= 0 && (s.inventory.includes(li) || s.rivalLoot.includes(li));
          const broken = s.smashed.includes(k);
          items.push({ depth: d, draw: (g) => this.displayCase(g, x, y, li, taken, broken) });
        } else if (t === 'plinth') {
          const li = lootAt(level, x, y);
          items.push({ depth: d, draw: (g) => this.plinth(g, x, y, li >= 0 && !s.inventory.includes(li) && !s.rivalLoot.includes(li), s.rivalLoot.includes(li)) });
        } else if (t === 'lamp') {
          const off = s.lampsOff.includes(level.lamps.findIndex((l) => l.at.x === x && l.at.y === y));
          const li = lootAt(level, x, y);
          const gone = li >= 0 && (s.inventory.includes(li) || s.rivalLoot.includes(li));
          if (!this.exhibitUnderLight(items, d, x, y, !off, gone)) items.push({ depth: d, draw: (g) => this.lamp(g, x, y, !off) });
          ceiling.push({ x, y, on: !off, lamp: true });
        } else if (t === 'laser') {
          items.push({ depth: d + 0.3, draw: (g) => this.laser(g, level, x, y, lasersOn) });
        } else if (t === 'exit') {
          items.push({ depth: d - 0.4, draw: (g) => this.exitSign(g, x, y) });
        } else if (t === 'safe') {
          const li = lootAt(level, x, y);
          items.push({ depth: d, draw: (g) => this.safe(g, level, x, y, s.smashed.includes(k) || (li >= 0 && (s.inventory.includes(li) || s.rivalLoot.includes(li))), s.picks[k] ?? 0, s.perks.safeCracks) });
        } else if (t === 'seat') {
          items.push({ depth: d, draw: (g) => this.prism(g, x + 0.08, y + 0.2, x + 0.92, y + 0.8, 20, 0x9c2a3a, 0x7a1f2c, 0x5e1722, 1) });
        } else if (t === 'ladder') {
          items.push({ depth: d + 0.2, draw: (g) => this.ladder(g, x, y) });
        } else if (t === 'wire') {
          items.push({ depth: d, draw: (g) => this.wire(g, level, x, y) });
        } else if (t === 'glass') {
          items.push({ depth: d, draw: (g) => this.glass(g, level, x, y) });
        } else if (t === 'kennel') {
          items.push({ depth: d, draw: (g) => this.kennel(g, x, y) });
        } else if (t === 'crate') {
          const inside = hiddenAt(level, s, { x, y }) && s.leo.x === x && s.leo.y === y;
          items.push({ depth: d, draw: (g) => this.crate(g, x, y, inside) });
        } else if (t === 'desk') {
          items.push({ depth: d, draw: (g) => this.desk(g, x, y, s.combination) });
        }
        // The rafters: beams high overhead, drawn faintly unless Leo is up there.
        if (level.rafters[y][x]) items.push({ depth: d + 0.6, draw: (g) => this.beam(g, x, y, inRafters ? 0.95 : 0.35) });
      }
    if (level.def.beacon) this.beacon(level, s);
    for (const sp of spots) {
      const c = project(p, sp.at.x + 0.5, sp.at.y + 0.5);
      this.fx.ellipse(c.x, c.y, ((sp.radius + 0.5) * TILE_W) / Math.SQRT2, ((sp.radius + 0.5) * TILE_H) / Math.SQRT2).fill({ color: 0xfff6d8, alpha: 0.1 });
    }
    for (const c of s.cameras) {
      const facing = c.sweep[c.idx];
      items.push({ depth: project(p, c.at.x + 0.5, c.at.y + 0.5).depth + 0.4, draw: (g) => this.camera(g, c.at, facing, !camerasActive(s, c)) });
    }
    const liftTo = inRafters ? RAFTER_Z - 6 : 0;
    const climbing = Math.abs(liftTo - this.leoLift) > 1;
    this.leoLift += Math.max(-dt * 170, Math.min(dt * 170, liftTo - this.leoLift));
    const tucked = hiddenAt(level, s, s.leo) && s.leo.x === Math.floor(leo.x) && s.leo.y === Math.floor(leo.y);
    this.leoHide = Math.max(0, Math.min(1, this.leoHide + (tucked ? dt * 4 : -dt * 6)));
    if (this.leoHide < 0.98) items.push({
      depth: leoDepth + 0.05,
      draw: (g) => {
        const gait = leo.gait;
        if (climbing) leo.gait = 'climb';
        this.drawLeo(g, leo, inVent, this.leoLift);
        leo.gait = gait;
        if (s.napTurns > 0) this.zzz(g, leo);
      },
    });
    const r = s.rival;
    if (rival && r && (r.phase === 'in' || r.phase === 'leaving'))
      items.push({ depth: project(p, rival.x, rival.y).depth + 0.05, draw: (g) => this.drawRival(g, rival, r.id, r.prize) });
    guards.forEach((a, i) =>
      items.push({
        depth: project(p, a.x, a.y).depth + 0.05,
        draw: (g) =>
          s.guards[i].kind === 'nightclaw'
            ? this.drawNightClaw(g, a, s.guards[i], s.status === 'caught' && s.caughtBy === s.guards[i].name)
            : s.guards[i].kind === 'robo'
            ? this.drawRobo(g, a, s.guards[i], roboOff(s, s.guards[i]), s.status === 'caught' && s.caughtBy === s.guards[i].name)
            : this.drawGuard(g, a, s.guards[i], s.status === 'caught' && s.caughtBy === s.guards[i].name),
      }),
    );
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw(o);

    // The lights hang from the ceiling, above everything: a pendant over each lamp, a small spot over each
    // case and plinth, each with its beam.
    if (!inVent && !inRafters) for (const c of ceiling) this.ceilingLight(this.fx, c.x, c.y, c.on, c.lamp);

    // Smoke pellets: drifting grey puffs over each cloud's 3×3 tiles.
    for (const c of s.smoke)
      for (let i = 0; i < 9; i++) {
        const dx = (i % 3) - 1;
        const dy = Math.floor(i / 3) - 1;
        const sp = project(p, c.x + 0.5 + dx * 0.9, c.y + 0.5 + dy * 0.9, 18 + Math.sin(this.time * 2 + i) * 6);
        this.fx.circle(sp.x, sp.y, 30 + Math.sin(this.time * 1.5 + i * 2) * 4).fill({ color: 0xb8bcc8, alpha: 0.55 });
      }

    // Noise ripples spreading from where the sound was made. A circle on the floor is an ellipse on screen.
    for (const r of ripples) {
      const sp = project(p, r.x + 0.5, r.y + 0.5);
      const R = Math.max(0.15, r.r * r.t);
      this.fx.ellipse(sp.x, sp.y, (R * TILE_W) / Math.SQRT2, (R * TILE_H) / Math.SQRT2).stroke({ width: 3, color: 0xfff0b0, alpha: (1 - r.t) * 0.85 });
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
      if (pic) this.fx.setFillStyle({ color: 0xffffff, alpha: 1 }).texture(pic.tex, pic.tint, sp.x - (pic.w * size) / 2, sp.y - (pic.h * size) / 2, pic.w * size, pic.h * size);
      else this.fx.poly([sp.x, sp.y - 9 * size, sp.x + 7 * size, sp.y, sp.x, sp.y + 6 * size, sp.x - 7 * size, sp.y]).fill({ color: LOOT_COLORS[pop.li % LOOT_COLORS.length] });
    }
    this.pops = this.pops.filter((q) => q.t < 1);
  }

  /**
   * A drawn character, animated from its three frames: breathing while it stands; striding (frames a and b in
   * turn, with a bob) to walk; leaning in and bounding to run; crouched low to sneak through the dark; flat out
   * to crawl through a vent; stretched along the arc of a pounce; swaying side to side to climb; and fidgeting
   * fast, head down, while Leo works at a lock or a case. Returns where its head is, or null until the art loads.
   */
  private figure(
    g: Graphics,
    name: CharName,
    a: Actor,
    o: { lift?: number; alpha?: number; tint?: number; crawl?: boolean; hide?: number; asleep?: boolean; off?: boolean; scale?: number; torch?: boolean } = {},
  ): { x: number; top: number } | null {
    const still = charFrame(name, 'idle');
    if (!still) return null;
    const s = project(this.proj, a.x, a.y, o.lift ?? 0);
    const f = this.face(a);
    if (Math.abs(f.x) > 0.05) a.flip = f.x > 0;
    const t = this.time;
    const gait = a.gait ?? (o.crawl ? 'crawl' : undefined);
    const cycle = (a.phase ?? 0) * 2;
    const half = cycle % 1;
    const hop = Math.abs(Math.sin(half * Math.PI));
    // Standing: the front view only when facing more or less towards the camera; otherwise side on, turned
    // the way they face, so nobody seems to look one way while watching the other.
    let frame: CharFrameName = a.gait ? (Math.floor(cycle) % 2 ? 'b' : 'a') : f.y > 0.3 ? 'idle' : 'b';
    let sx = 1;
    let sy = 1;
    let lean = 0;
    let dx = 0;
    let dy = 0;
    let alpha = o.alpha ?? 1;
    switch (gait) {
      case undefined: {
        const breath = Math.sin(t * 2.2 + a.x * 1.7 + a.y);
        sy = 1 + breath * 0.012;
        sx = 1 - breath * 0.008;
        break;
      }
      case 'walk':
        dy = -hop * 3;
        lean = 0.04;
        break;
      case 'run':
        dy = -hop * 7;
        lean = 0.14;
        sx = 1.05;
        sy = 0.96;
        break;
      case 'sneak':
        dy = -hop * 1.5;
        lean = 0.1;
        sx = 1.07;
        sy = 0.82;
        break;
      case 'crawl':
        if (!a.gait) frame = 'b';
        lean = 0.05 + (a.gait ? Math.sin(cycle * Math.PI) * 0.04 : 0);
        sx = 1.18;
        sy = 0.5;
        break;
      case 'leap': {
        const k = a.leapT ?? 0.5;
        frame = 'a';
        lean = 0.45 * (1 - 2 * k);
        sx = 1.08;
        sy = 0.94;
        break;
      }
      case 'climb':
        frame = Math.floor(t * 7) % 2 ? 'a' : 'b';
        lean = Math.sin(t * 7 * Math.PI) * 0.07;
        sx = 0.94;
        break;
    }
    if (a.work && a.work > 0 && !a.gait) {
      frame = Math.floor(t * 11) % 2 ? 'a' : 'b';
      dx = Math.sin(t * 38) * 1.5 * a.work;
      lean += 0.16 * a.work;
      sy *= 1 - 0.07 * a.work;
    }
    if (o.asleep) {
      frame = 'idle';
      lean = -0.14;
      sy = 0.93 + Math.sin(t * 1.4) * 0.015;
    }
    if (o.off) {
      frame = 'idle';
      lean = -0.2;
      sy = 0.95;
    }
    if (o.hide) {
      sy *= 1 - o.hide * 0.85;
      alpha *= 1 - o.hide * 0.5;
    }
    const fr = charFrame(name, frame) ?? still;
    const scale = o.scale ?? 1;
    const dir = a.flip ? 1 : -1; // which way they face on screen
    const by = s.y - a.bob + dy;
    // A shadow on the floor (or the duct, in the vents), smaller as the character leaves the ground.
    if (o.crawl) g.ellipse(s.x, s.y - 4, 26, 13).stroke({ width: 2, color: COL.duct, alpha: 0.9 });
    else g.ellipse(s.x, s.y, 18 * scale * (gait === 'crawl' ? 1.3 : 1), 8 * scale).fill({ color: 0x000000, alpha: 0.35 * (1 - Math.min(0.7, a.bob / 50)) });
    // The drawings face left: mirror them to face right, and lean into the way they're going.
    if (o.torch) {
      // The torch's beam on the floor, out the way the guard is looking.
      const d = DIRS[a.facing];
      const len = Math.hypot(d.x, d.y);
      const ux = d.x / len;
      const uy = d.y / len;
      const at = (along: number, side: number) => project(this.proj, a.x + ux * along - uy * side, a.y + uy * along + ux * side);
      const p0 = at(0.25, -0.08);
      const p1 = at(0.25, 0.08);
      const p2 = at(2.1, 0.75);
      const p3 = at(2.1, -0.75);
      g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill({ color: 0xfff1b8, alpha: 0.13 });
      const c = at(1.6, 0);
      g.ellipse(c.x, c.y, 26, 13).fill({ color: 0xfff1b8, alpha: 0.07 });
    }
    const m = new Matrix().scale(-dir * sx * scale, sy * scale).rotate(lean * dir).translate(s.x + dx, by);
    g.save();
    g.setTransform(m);
    g.setFillStyle({ color: 0xffffff, alpha });
    g.texture(fr.tex, o.tint ?? 0xffffff, -fr.ax, -fr.ay, fr.w, fr.h);
    g.restore();
    g.beginPath();
    g.setFillStyle({ color: 0xffffff, alpha: 1 });
    if (gait === 'run' && hop < 0.3) {
      // Dust kicked up behind.
      for (const i of [0, 1]) g.circle(s.x - dir * (14 + i * 8), s.y - 3 - i * 2, 3.5 - i).fill({ color: 0xc8c0b0, alpha: 0.35 });
    }
    return { x: s.x + dx, top: by - fr.h * sy * scale };
  }

  /** Characters are a little darker in the dark, so you can see who's in shadow. */
  private actorTint(a: Actor, leo = false): number {
    const l = this.light[Math.floor(a.y)]?.[Math.floor(a.x)] ?? 1;
    return l === 0 ? (leo ? 0x8c93b8 : 0x8a90aa) : l === 1 ? 0xeeeef4 : 0xffffff;
  }

  /** A baked sprite standing at (x, y) on the grid, `z` px up, turned `turn` radians (0: its front faces grid +y).
   * Returns false, drawing nothing, until the sprites have loaded. */
  private sprite(g: Graphics, name: PropName, x: number, y: number, z: number, turn: number, alpha = 1, tint = 0xffffff): boolean {
    const pr = prop(name);
    if (!pr) return false;
    const sp = project(this.proj, x, y, z);
    g.setFillStyle({ color: 0xffffff, alpha });
    g.texture(pr.frames[frameFor(turn, this.proj.angle)], tint, sp.x - pr.ax, sp.y - pr.ay, pr.w, pr.h);
    g.setFillStyle({ color: 0xffffff, alpha: 1 });
    return true;
  }

  /** A floor tile, textured. The texture is laid on the grid, so it turns with the camera. False until loaded. */
  private floorTile(g: Graphics, x: number, y: number, skin: FloorSkin): boolean {
    const tex = surface(skin.tex);
    if (!tex) return false;
    const k = skin.tiles / tex.width; // tiles per texel
    const o = project(this.proj, 0, 0);
    const ex = project(this.proj, 1, 0);
    const ey = project(this.proj, 0, 1);
    const m = new Matrix((ex.x - o.x) * k, (ex.y - o.y) * k, (ey.x - o.x) * k, (ey.y - o.y) * k, o.x, o.y);
    const c = this.corners(x, y, x + 1, y + 1, 0);
    g.poly(c.flatMap((q) => [q.x, q.y])).fill({ texture: tex, matrix: m, textureSpace: 'global', color: 0xc4c4d2 }).stroke({ width: 1, color: 0x000000, alpha: 0.22 });
    return true;
  }

  /** Props are lit like the floor they stand on: dim in the dark, brightest under a lamp. */
  private tint(x: number, y: number): number {
    const l = this.light[y]?.[x] ?? 1;
    return l === 0 ? 0x7d84a0 : l === 1 ? 0xdcdbe6 : 0xffffff;
  }

  /** Now and then, something hangs on a wall face the camera can see: pictures, clocks, lifebuoys, fuse boxes. */
  private wallDecor(level: Level, s: State, x: number, y: number, d: number, items: Drawable[]): void {
    const choices = LEVEL_WALL_DECOR[level.def.id] ?? WALL_DECOR[this.district] ?? WALL_DECOR['old-town'];
    const c = Math.cos(this.proj.angle);
    const sn = Math.sin(this.proj.angle);
    NEIGHBOURS.forEach((n, i) => {
      const fx = x + n.x;
      const fy = y + n.y;
      if (fx < 0 || fy < 0 || fx >= level.w || fy >= level.h) return;
      const t = tileNow(level, s, fx, fy);
      if (t !== 'floor' && t !== 'marble' && t !== 'squeaky' && t !== 'grate' && t !== 'plate') return;
      if (c * n.x - sn * n.y + (sn * n.x + c * n.y) <= 0.3) return; // the face turned away from the camera
      const density = DECOR_DENSITY[level.def.id] ?? 0.2;
      const h = tileHash(x, y, i);
      if (h > density) return;
      let pick = Math.floor((h / density) * choices.length);
      // Windows only in outside walls, where there's a night outside them; outside walls get them half the time.
      const outside = x === 0 || y === 0 || x === level.w - 1 || y === level.h - 1;
      if (outside && choices.includes('spr_window') && tileHash(x, y, i + 20) < 0.5) pick = choices.indexOf('spr_window');
      while (choices[pick % choices.length] === 'spr_window' && !outside && choices.some((c) => c !== 'spr_window')) pick++;
      const name = choices[pick % choices.length];
      if (name.startsWith('pclock_')) {
        const size = 0.95 + tileHash(x, y, i + 30) * 1.05;
        const tint = this.tint(fx, fy);
        items.push({ depth: d + 0.35, draw: (g) => this.clockFace(g, name as ClockFace, x + 0.5 + n.x * 0.52, y + 0.5 + n.y * 0.52, n, size, tint, tileHash(x, y, i + 40)) });
        return;
      }
      const tint = this.tint(fx, fy);
      const bx = x + 0.5 + n.x * 0.5;
      const by = y + 0.5 + n.y * 0.5;
      items.push({
        depth: d + 0.35,
        draw: (g) => {
          const flatSpec = WALL_FLATS[name as FlatName];
          const pic = flatSpec && flat(name as FlatName);
          const model = flatSpec ? undefined : prop(name as PropName);
          if (!pic && !model) return;
          // How tall it is on the wall: a flat piece's picture keeps its proportions (58.8 px of height a tile).
          const tall = pic && flatSpec ? (flatSpec.width * 58.8 * pic.height) / pic.width : (model?.height ?? 0);
          const middle = flatSpec ? flatSpec.z : 50;
          const lit = flatSpec ? !!flatSpec.lit : LIT_ON_WALL.has(name as PropName);
          const top = middle + tall / 2 + 6;
          if (lit) {
            // A wash of warm light down the wall from the picture light.
            const a = project(this.proj, bx - n.y * 0.22, by + n.x * 0.22, top);
            const b = project(this.proj, bx + n.y * 0.22, by - n.x * 0.22, top);
            const c2 = project(this.proj, bx + n.y * 0.4, by - n.x * 0.4, top - 62);
            const d2 = project(this.proj, bx - n.y * 0.4, by + n.x * 0.4, top - 62);
            g.poly([a.x, a.y, b.x, b.y, c2.x, c2.y, d2.x, d2.y]).fill({ color: 0xffe2a0, alpha: 0.16 });
          }
          if (pic && flatSpec) this.onWall(g, pic, bx + n.x * 0.02, by + n.y * 0.02, n, flatSpec.width, middle, tall, tint);
          else this.sprite(g, name as PropName, bx, by, 0, Math.atan2(n.y, n.x) - Math.PI / 2, 1, tint);
          if (lit) {
            // The brass picture light itself, on a short arm out from the wall.
            const ox = bx + n.x * 0.07;
            const oy = by + n.y * 0.07;
            const l = project(this.proj, ox - n.y * 0.16, oy + n.x * 0.16, top + 4);
            const r = project(this.proj, ox + n.y * 0.16, oy - n.x * 0.16, top + 4);
            const w = project(this.proj, bx, by, top + 9);
            const m = project(this.proj, ox, oy, top + 4);
            g.moveTo(w.x, w.y).lineTo(m.x, m.y).stroke({ width: 1.5, color: 0x6b4f1e });
            g.moveTo(l.x, l.y).lineTo(r.x, r.y).stroke({ width: 3.5, color: 0xc9a24a, cap: 'round' });
            g.moveTo(l.x, l.y + 1.5).lineTo(r.x, r.y + 1.5).stroke({ width: 1.5, color: 0xfff1c0, alpha: 0.9, cap: 'round' });
          }
        },
      });
    });
  }

  /**
   * A clock drawn on a wall face, in the wall's own plane (so the face is foreshortened like the wall): a Roman
   * face, a skeleton of turning gears, an odd one with thirteen hours and hands going their own ways, or a
   * pendulum clock. `size` scales it; `seed` sets its hands and speed, so no two agree on the time.
   */
  private clockFace(g: Graphics, kind: ClockFace, bx: number, by: number, n: { x: number; y: number }, size: number, tint: number, seed: number): void {
    let tx = -n.y;
    let ty = n.x;
    const b = project(this.proj, bx, by, 52);
    if (project(this.proj, bx + tx, by + ty).x < project(this.proj, bx, by).x) {
      tx = -tx;
      ty = -ty;
    }
    // Local units are game pixels on the wall: x along it, y down it.
    const along = project(this.proj, bx + tx, by + ty, 52);
    const m = new Matrix(((along.x - b.x) / 58.8) * size, ((along.y - b.y) / 58.8) * size, 0, size, b.x, b.y);
    const shade = (c: number) => {
      const k = (tint & 0xff) / 255;
      return (((((c >> 16) & 0xff) * k) | 0) << 16) | (((((c >> 8) & 0xff) * k) | 0) << 8) | (((c & 0xff) * k) | 0);
    };
    const t = this.time * (0.4 + seed * 0.8) + seed * 40;
    const hand = (len: number, a: number, w: number, col: number) => g.moveTo(0, 0).lineTo(Math.sin(a) * len, -Math.cos(a) * len).stroke({ width: w, color: col, cap: 'round' });
    const gear = (cx: number, cy: number, r: number, teeth: number, a: number, col: number) => {
      const pts: number[] = [];
      for (let i = 0; i < teeth * 2; i++) {
        const rr = i % 2 ? r : r * 0.8;
        const aa = a + (i * Math.PI) / teeth;
        pts.push(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
      }
      g.poly(pts).fill({ color: col }).stroke({ width: 0.8, color: shade(0x4a3410) });
      g.circle(cx, cy, r * 0.28).fill({ color: shade(0x2a1d08) });
    };
    g.save();
    g.setTransform(m);
    if (kind === 'pclock_roman') {
      g.circle(0, 0, 11).fill({ color: shade(0x8a6a2a) });
      g.circle(0, 0, 9.5).fill({ color: shade(0xf1e8d0) }).stroke({ width: 0.8, color: shade(0x3a2a10) });
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        g.moveTo(Math.sin(a) * 7.2, -Math.cos(a) * 7.2).lineTo(Math.sin(a) * 8.6, -Math.cos(a) * 8.6).stroke({ width: i % 3 ? 0.6 : 1.4, color: shade(0x1a1a1a) });
      }
      hand(5, t * 0.08, 1.4, shade(0x1a1a1a));
      hand(7.5, t, 0.9, shade(0x1a1a1a));
      g.circle(0, 0, 1).fill({ color: shade(0xb08a3a) });
    } else if (kind === 'pclock_gears') {
      gear(-4, 2, 7, 10, t * 0.6, shade(0xc9a24a));
      gear(6, -4, 5, 8, -t * 0.84 + 0.3, shade(0xb08a3a));
      gear(5, 7, 3.6, 6, t * 1.2, shade(0xd9b45a));
      g.circle(-4, 2, 4.4).fill({ color: shade(0xf1e8d0), alpha: 0.85 });
      hand(3.2, t * 0.1, 0.9, shade(0x1a1a1a));
      hand(4.2, t * 1.1, 0.6, shade(0x1a1a1a));
    } else if (kind === 'pclock_odd') {
      // Thirteen hours, three hands, one of them going backwards, and an eye where the pin should be.
      g.poly([0, -11, 9, -5, 10, 5, 0, 11, -10, 5, -9, -5]).fill({ color: shade(0x3a2a4a) }).stroke({ width: 1, color: shade(0xc9a24a) });
      g.circle(0, 0, 7.6).fill({ color: shade(0xd8d0f0) });
      for (let i = 0; i < 13; i++) {
        const a = (i * Math.PI * 2) / 13;
        g.circle(Math.sin(a) * 6.3, -Math.cos(a) * 6.3, 0.55).fill({ color: shade(0x2a1a3a) });
      }
      hand(5.5, t * 0.7, 0.9, shade(0x2a1a3a));
      hand(4, -t * 1.3, 0.9, shade(0x8a1a2a));
      hand(6.5, t * 3.1, 0.4, shade(0x2a1a3a));
      g.ellipse(0, 0, 1.8, 1.1).fill({ color: shade(0xffffff) });
      g.circle(Math.sin(t) * 0.5, 0, 0.6).fill({ color: shade(0x1a1a1a) });
    } else {
      // A pendulum clock: a wooden case, a small face, and the bob swinging below.
      g.roundRect(-6, -10, 12, 30, 2).fill({ color: shade(0x5a3a1e) }).stroke({ width: 0.8, color: shade(0x2a1a0a) });
      g.circle(0, -4, 4.6).fill({ color: shade(0xf1e8d0) });
      hand(3, t * 0.1, 0.8, shade(0x1a1a1a));
      hand(4, t, 0.5, shade(0x1a1a1a));
      g.rect(-4, 3, 8, 15).fill({ color: shade(0x2a1a0a) });
      const swing = Math.sin(this.time * 3 + seed * 6) * 0.35;
      g.moveTo(0, 3).lineTo(Math.sin(swing) * 11, 3 + Math.cos(swing) * 11).stroke({ width: 0.6, color: shade(0xc9a24a) });
      g.circle(Math.sin(swing) * 11, 3 + Math.cos(swing) * 11, 1.9).fill({ color: shade(0xd9b45a) });
    }
    g.restore();
  }

  /** A flat picture laid on a wall face (facing n), `width` tiles across, its middle `middle` px up. */
  private onWall(g: Graphics, tex: Texture, bx: number, by: number, n: { x: number; y: number }, width: number, middle: number, tall: number, tint: number): void {
    // Along the wall, left to right as the camera sees it, so the picture is never mirrored.
    let tx = -n.y;
    let ty = n.x;
    const b = project(this.proj, bx, by);
    if (project(this.proj, bx + tx, by + ty).x < b.x) {
      tx = -tx;
      ty = -ty;
    }
    const l = project(this.proj, bx - (tx * width) / 2, by - (ty * width) / 2, middle + tall / 2);
    const r = project(this.proj, bx + (tx * width) / 2, by + (ty * width) / 2, middle + tall / 2);
    const m = new Matrix((r.x - l.x) / tex.width, (r.y - l.y) / tex.width, 0, tall / tex.height, l.x, l.y);
    g.save();
    g.setTransform(m);
    g.setFillStyle({ color: 0xffffff, alpha: 1 });
    g.texture(tex, tint, 0, 0, tex.width, tex.height);
    g.restore();
  }

  /**
   * A view cone on the floor: a fan of rays from the watcher, each stopping at the first thing that blocks
   * sight, so the cone hugs corners and doorways the way the guard's eyes do. A brighter edge outlines it.
   */
  private viewCone(g: Graphics, level: Level, s: State, x: number, y: number, facing: number, range: number, color: number, alpha: number): void {
    const d = DIRS[facing];
    const base = Math.atan2(d.y, d.x);
    const half = (SIGHT_HALF_ANGLE * Math.PI) / 180;
    const rays = 28;
    // The rays only change when the watcher moves or turns, or the building changes (a door opens): cache them.
    const id = `${x.toFixed(2)},${y.toFixed(2)},${facing},${range},${s.turn},${s.ap},${s.smashed.length}`;
    let ends = this.coneCache.get(id);
    if (!ends) {
      ends = [];
      for (let i = 0; i <= rays; i++) {
        const a = base - half + (2 * half * i) / rays;
        const ux = Math.cos(a);
        const uy = Math.sin(a);
        let len = range + 0.5;
        for (let t = 0.3; t <= range + 0.5; t += 0.1) {
          const tx = Math.floor(x + ux * t);
          const ty = Math.floor(y + uy * t);
          if (tx < 0 || ty < 0 || tx >= level.w || ty >= level.h || blocksSight(tileNow(level, s, tx, ty))) {
            len = t;
            break;
          }
        }
        ends.push(x + ux * len, y + uy * len);
      }
      if (this.coneCache.size > 400) this.coneCache.clear();
      this.coneCache.set(id, ends);
    }
    const pts: number[] = [];
    const start = project(this.proj, x, y);
    pts.push(start.x, start.y);
    for (let i = 0; i < ends.length; i += 2) {
      const p = project(this.proj, ends[i], ends[i + 1]);
      pts.push(p.x, p.y);
    }
    const pulse = 1 + Math.sin(this.time * 2.5) * 0.12;
    if (alpha > 0) g.poly(pts).fill({ color, alpha: alpha * pulse }).stroke({ width: 2, color, alpha: 0.55, join: 'round' });
    else g.poly(pts).stroke({ width: 1.5, color, alpha: 0.35 + Math.sin(this.time * 4) * 0.1, join: 'round' });
  }

  /** A mark on a tile Leo shouldn't end his turn on: a red cross (caught or alarm) or an orange ring (spotted). */
  private riskMark(g: Graphics, x: number, y: number, r: 'caught' | 'alarm' | 'seen'): void {
    const c = project(this.proj, x + 0.5, y + 0.5);
    if (r === 'seen') {
      g.ellipse(c.x, c.y, 11, 5.5).stroke({ width: 2.5, color: COL.warn, alpha: 0.9 });
      return;
    }
    const a = project(this.proj, x + 0.3, y + 0.3);
    const b = project(this.proj, x + 0.7, y + 0.7);
    const d = project(this.proj, x + 0.7, y + 0.3);
    const e = project(this.proj, x + 0.3, y + 0.7);
    g.moveTo(a.x, a.y).lineTo(b.x, b.y).moveTo(d.x, d.y).lineTo(e.x, e.y).stroke({ width: 3, color: COL.danger, alpha: 0.9, cap: 'round' });
  }

  /** Outer walls on the two sides facing the camera are always cut down, so the room is never hidden. */
  private nearOuterWall(level: Level, x: number, y: number): boolean {
    const c = Math.cos(this.proj.angle);
    const s = Math.sin(this.proj.angle);
    const faces = (nx: number, ny: number) => c * nx - s * ny + (s * nx + c * ny) > 0.3;
    return (x === 0 && faces(-1, 0)) || (x === level.w - 1 && faces(1, 0)) || (y === 0 && faces(0, -1)) || (y === level.h - 1 && faces(0, 1));
  }

  private corners(x0: number, y0: number, x1: number, y1: number, z: number) {
    const p = this.proj;
    return [project(p, x0, y0, z), project(p, x1, y0, z), project(p, x1, y1, z), project(p, x0, y1, z)];
  }

  private diamond(g: Graphics, x: number, y: number, r: number, color: number, alpha: number, line?: number): void {
    const c = this.corners(x + 0.5 - r, y + 0.5 - r, x + 0.5 + r, y + 0.5 + r, 0);
    g.poly(c.flatMap((q) => [q.x, q.y])).fill({ color, alpha });
    if (line !== undefined) g.stroke({ width: 1, color: line, alpha: 0.6 });
  }

  private diamondOutline(g: Graphics, x: number, y: number, color: number, width: number, inset = 0.04, alpha = 0.95): void {
    const c = this.corners(x + inset, y + inset, x + 1 - inset, y + 1 - inset, 0);
    g.poly(c.flatMap((q) => [q.x, q.y])).stroke({ width, color, alpha });
  }

  /** A box. Only the faces turned toward the camera are drawn, shaded by which way they face. */
  private prism(g: Graphics, x0: number, y0: number, x1: number, y1: number, h: number, top: number, sideA: number, sideB: number, alpha: number, z0 = 0, skin?: WallSkin): void {
    const paper = skin && surface(skin.tex);
    const b = this.corners(x0, y0, x1, y1, z0);
    const t = this.corners(x0, y0, x1, y1, z0 + h);
    const normals = [
      { n: { x: 0, y: -1 }, i: 0, j: 1 },
      { n: { x: 1, y: 0 }, i: 1, j: 2 },
      { n: { x: 0, y: 1 }, i: 2, j: 3 },
      { n: { x: -1, y: 0 }, i: 3, j: 0 },
    ];
    const c = Math.cos(this.proj.angle);
    const s = Math.sin(this.proj.angle);
    for (const f of normals) {
      const rx = c * f.n.x - s * f.n.y;
      const ry = s * f.n.x + c * f.n.y;
      if (rx + ry <= 0.001) continue;
      const shade = rx > ry ? sideA : sideB;
      const face = [b[f.i].x, b[f.i].y, b[f.j].x, b[f.j].y, t[f.j].x, t[f.j].y, t[f.i].x, t[f.i].y];
      if (paper) {
        // Papered: one copy of the texture across the face, its foot on the floor, full height at WALL_H.
        let l = b[f.i];
        let r = b[f.j];
        if (r.x < l.x) [l, r] = [r, l];
        const m = new Matrix((r.x - l.x) / paper.width, (r.y - l.y) / paper.width, 0, WALL_H / paper.height, l.x, l.y - WALL_H);
        g.poly(face).fill({ texture: paper, matrix: m, textureSpace: 'global', color: rx > ry ? 0xd6d6de : 0x9c9cac, alpha }).stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
      } else g.poly(face).fill({ color: shade, alpha }).stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
    }
    g.poly(t.flatMap((q) => [q.x, q.y])).fill({ color: top, alpha }).stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
  }

  private grate(g: Graphics, x: number, y: number): void {
    this.diamond(g, x, y, 0.32, 0x14161f, 1);
    for (let i = -2; i <= 2; i++) {
      const a = project(this.proj, x + 0.5 + i * 0.1, y + 0.22);
      const b = project(this.proj, x + 0.5 + i * 0.1, y + 0.78);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.5, color: 0x8a90a8, alpha: 0.9 });
    }
  }

  private door(g: Graphics, x: number, y: number, h: number, alpha: number, picks: number): void {
    this.prism(g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, h, 0x8a6a45, 0x6b4a2a, 0x553a20, alpha);
    const sp = project(this.proj, x + 0.5, y + 0.5, h * 0.45);
    g.circle(sp.x, sp.y, 4).fill({ color: picks > 0 ? 0x9ff0c8 : 0xf2c46b });
  }

  /**
   * A control box mounted on every face of the wall that looks into the room: the CCTV box (a little screen of
   * camera feeds) or the power box (a breaker lever under a lightning sign). Both pulse a little until they're
   * used; then the screen goes dark, or the lever drops and the light goes red.
   */
  private controlBox(g: Graphics, level: Level, s: State, x: number, y: number, kind: 'panel' | 'fuse', off: boolean): void {
    const c = Math.cos(this.proj.angle);
    const sn = Math.sin(this.proj.angle);
    for (const n of NEIGHBOURS) {
      const t = tileNow(level, s, x + n.x, y + n.y);
      if (blocksSight(t) || t === 'gap' || t === 'wire') continue;
      if (c * n.x - sn * n.y + (sn * n.x + c * n.y) <= 0.3) continue; // the face turned away from the camera
      let tx = -n.y;
      let ty = n.x;
      const bx = x + 0.5 + n.x * 0.52;
      const by = y + 0.5 + n.y * 0.52;
      const o = project(this.proj, bx, by, 46);
      if (project(this.proj, bx + tx, by + ty).x < project(this.proj, bx, by).x) {
        tx = -tx;
        ty = -ty;
      }
      const along = project(this.proj, bx + tx, by + ty, 46);
      // Local units: game pixels on the wall, x along it, y down it; the box's middle 46 px up the wall.
      const m = new Matrix((along.x - o.x) / 58.8, (along.y - o.y) / 58.8, 0, 1, o.x, o.y);
      const glow = off ? 0 : 0.35 + Math.sin(this.time * 3 + x + y) * 0.2;
      g.save();
      g.setTransform(m);
      if (glow) g.roundRect(-20, -24, 40, 46, 8).fill({ color: kind === 'panel' ? 0x5ef0ff : 0xffd23f, alpha: glow * 0.35 });
      g.roundRect(-16, -20, 32, 38, 4).fill({ color: 0x5b6472 }).stroke({ width: 2, color: 0x1c1233 });
      g.rect(-13, -17, 26, 32).fill({ color: 0x6e7888 });
      if (kind === 'panel') {
        // Four little camera feeds, live or dead.
        for (const [sx, sy] of [[-11, -14], [1, -14], [-11, -4], [1, -4]]) g.rect(sx, sy, 10, 8).fill({ color: off ? 0x1a1d24 : 0x2fb8a3 }).stroke({ width: 1, color: 0x1c1233 });
        if (!off) for (const [sx, sy] of [[-11, -14], [1, -14], [-11, -4], [1, -4]]) g.rect(sx + 1, sy + 3 + ((this.time * 6 + sx) % 4), 8, 1).fill({ color: 0xbaf7ec, alpha: 0.6 });
        g.circle(-8, 9, 2.2).fill({ color: off ? 0x7a1d16 : Math.sin(this.time * 5) > 0 ? 0xff3b30 : 0x8a1a14 });
        g.rect(-2, 7, 11, 4).fill({ color: 0x1c1233 });
      } else {
        // A lightning sign, and the breaker lever: up while the power's on, down once Leo has thrown it.
        g.poly([-1, -16, -7, -6, -2, -6, -5, 2, 5, -9, 0, -9, 3, -16]).fill({ color: 0xffd23f }).stroke({ width: 1, color: 0x1c1233 });
        g.rect(-4, 3, 8, 12).fill({ color: 0x2a2f3a });
        g.rect(-2.5, off ? 9 : 2, 5, 6).fill({ color: off ? 0xff3b30 : 0x4dff88 }).stroke({ width: 1, color: 0x1c1233 });
        g.circle(9, 12, 2).fill({ color: off ? 0xff3b30 : 0x4dff88 });
      }
      g.restore();
      g.beginPath();
    }
  }


  private displayCase(g: Graphics, x: number, y: number, li: number, taken: boolean, broken: boolean): void {
    this.prism(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 22, 0x6b5946, COL.caseBase, 0x47392b, 1);
    const pic = li >= 0 ? lootPicture(this.lootName(li)) : undefined;
    if (!taken && pic) {
      const sp = project(this.proj, x + 0.5, y + 0.5, 34 + Math.sin(this.time * 1.6 + x) * 1.5);
      const k = 30 / Math.max(pic.w, pic.h);
      g.setFillStyle({ color: 0xffffff, alpha: 1 });
      g.texture(pic.tex, pic.tint, sp.x - (pic.w * k) / 2, sp.y - (pic.h * k) / 2, pic.w * k, pic.h * k);
    } else if (!taken && li >= 0) {
      const sp = project(this.proj, x + 0.5, y + 0.5, 32);
      const col = LOOT_COLORS[li % LOOT_COLORS.length];
      g.circle(sp.x, sp.y, 10).fill({ color: col, alpha: 0.18 });
      g.poly([sp.x, sp.y - 8, sp.x + 6, sp.y, sp.x, sp.y + 5, sp.x - 6, sp.y]).fill({ color: col }).stroke({ width: 1, color: 0xffffff, alpha: 0.8 });
    }
    if (broken) {
      // Shards on the floor around the case.
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + x;
        const sp = project(this.proj, x + 0.5 + Math.cos(a) * 0.45, y + 0.5 + Math.sin(a) * 0.45, 1);
        g.poly([sp.x, sp.y - 3, sp.x + 3, sp.y, sp.x - 1, sp.y + 2]).fill({ color: COL.caseGlass, alpha: 0.8 });
      }
    } else this.prism(g, x + 0.16, y + 0.16, x + 0.84, y + 0.84, 30, COL.caseGlass, COL.caseGlass, COL.caseGlass, 0.2, 22);
  }

  private plinth(g: Graphics, x: number, y: number, hasGem: boolean, rivalTook = false): void {
    this.prism(g, x + 0.18, y + 0.18, x + 0.82, y + 0.82, 34, 0xf3eee0, COL.plinth, 0xa9a392, 1);
    const sp = project(this.proj, x + 0.5, y + 0.5, 50);
    const pic = hasGem ? lootPicture(this.lootName(lootAt(this.lvl!, x, y))) : undefined;
    if (pic) {
      const k = 40 / Math.max(pic.w, pic.h);
      const y0 = sp.y - (pic.h * k) / 2 - 6 + Math.sin(this.time * 1.4) * 2;
      g.circle(sp.x, y0 + (pic.h * k) / 2, 26).fill({ color: 0xfff3c4, alpha: 0.14 + Math.sin(this.time * 2) * 0.04 });
      g.setFillStyle({ color: 0xffffff, alpha: 1 });
      g.texture(pic.tex, pic.tint, sp.x - (pic.w * k) / 2, y0, pic.w * k, pic.h * k);
    } else if (hasGem) {
      const hue = [0x9fe8ff, 0xff9ff3, 0xb6ffb0, 0xffe39f][Math.floor(this.time * 2) % 4];
      g.circle(sp.x, sp.y, 20).fill({ color: hue, alpha: 0.2 });
      g.poly([sp.x, sp.y - 13, sp.x + 9, sp.y, sp.x, sp.y + 9, sp.x - 9, sp.y]).fill({ color: hue }).stroke({ width: 1.5, color: 0xffffff });
    } else if (rivalTook) {
      // Nothing but dust where the prize was.
      g.ellipse(sp.x, sp.y + 3, 9, 4).fill({ color: 0x8a8578, alpha: 0.6 });
    } else {
      // Leo's calling card on the empty plinth.
      g.roundRect(sp.x - 9, sp.y - 2, 18, 11, 2).fill({ color: 0xf5f5f5 }).stroke({ width: 1, color: 0x222222 });
      g.circle(sp.x, sp.y + 3.5, 2.5).fill({ color: 0xd8262f });
    }
  }

  /**
   * What stands under a ceiling light: a statue, a bust, a plant, on a pedestal or not, picked for the district
   * and the tile. Returns false (so the old standing lamp is drawn) until the sprites load.
   */
  private exhibitUnderLight(items: Drawable[], d: number, x: number, y: number, on: boolean, gone: boolean): boolean {
    const e = exhibitAt(this.districtOf, x, y);
    const tint = on ? 0xfff6e6 : 0x8a8ea8;
    if (gone) {
      // Taken: nothing left but the pedestal (or a dusty patch where the chest stood).
      items.push({
        depth: d,
        draw: (g) => {
          if (e.pedestal || e.flat) this.prism(g, x + 0.24, y + 0.24, x + 0.76, y + 0.76, 28, 0xe9e3d3, 0xc9c2b0, 0xa49d8b, 1);
          else this.diamond(g, x, y, 0.3, 0x8a8578, 0.35);
        },
      });
      return true;
    }
    if (e.flat) {
      // Drawn standing up, facing the camera: the aquarium's tanks, a statue.
      const tex = flat(e.flat as FlatName);
      if (!tex) return false;
      const h = STANDING_FLATS[e.flat as FlatName] ?? 60;
      const w = (h * tex.width) / tex.height;
      items.push({
        depth: d,
        draw: (g) => {
          const sp = project(this.proj, x + 0.5, y + 0.5);
          g.ellipse(sp.x, sp.y, w * 0.45, w * 0.2).fill({ color: 0x000000, alpha: 0.3 });
          g.setFillStyle({ color: 0xffffff, alpha: 1 });
          g.texture(tex, tint, sp.x - w / 2, sp.y - h + w * 0.12, w, h);
        },
      });
      return true;
    }
    const model = e.model as PropName;
    if (!prop(model)) return false;
    const turn = Math.floor(tileHash(x, y, 12) * 4) * (Math.PI / 2);
    items.push({
      depth: d,
      draw: (g) => {
        if (e.pedestal) this.prism(g, x + 0.24, y + 0.24, x + 0.76, y + 0.76, 28, 0xe9e3d3, 0xc9c2b0, 0xa49d8b, 1);
        this.sprite(g, model, x + 0.5, y + 0.5, e.pedestal ? 28 : 0, turn, 1, tint);
      },
    });
    return true;
  }

  /** A light hanging from the ceiling: a pendant over a lamp's tile, or a small spot over a case or plinth. */
  private ceilingLight(g: Graphics, x: number, y: number, on: boolean, pendant: boolean): void {
    const z = pendant ? 150 : 165;
    const shade = project(this.proj, x + 0.5, y + 0.5, z);
    const cord = project(this.proj, x + 0.5, y + 0.5, z + 70);
    g.moveTo(cord.x, cord.y).lineTo(shade.x, shade.y - 6).stroke({ width: 1.5, color: 0x1a1a22, alpha: 0.8 });
    if (on) {
      // The beam: a soft cone down to the floor, or onto the case.
      const foot = project(this.proj, x + 0.5, y + 0.5, pendant ? 0 : 34);
      const r = pendant ? 42 : 22;
      g.poly([shade.x - 5, shade.y + 3, shade.x + 5, shade.y + 3, foot.x + r, foot.y, foot.x - r, foot.y]).fill({ color: 0xffe9b8, alpha: pendant ? 0.07 : 0.06 });
      g.ellipse(foot.x, foot.y, r, r / 2).fill({ color: 0xffe9b8, alpha: pendant ? 0.08 : 0.1 });
    }
    if (pendant) {
      g.poly([shade.x - 4, shade.y - 7, shade.x + 4, shade.y - 7, shade.x + 12, shade.y + 3, shade.x - 12, shade.y + 3]).fill({ color: 0x2a2a30 }).stroke({ width: 1, color: 0xc9a24a, alpha: 0.8 });
      g.ellipse(shade.x, shade.y + 3, 10, 3).fill({ color: on ? 0xfff1c0 : 0x4a4a50 });
      if (on) g.circle(shade.x, shade.y + 4, 16).fill({ color: COL.lampGlow, alpha: 0.14 + Math.sin(this.time * 3 + x) * 0.02 });
    } else {
      g.roundRect(shade.x - 4, shade.y - 6, 8, 9, 2).fill({ color: 0x1c1c22 }).stroke({ width: 1, color: 0x55555e });
      g.ellipse(shade.x, shade.y + 3, 3.5, 1.5).fill({ color: 0xfff1c0 });
    }
  }

  private lamp(g: Graphics, x: number, y: number, on = true): void {
    const base = project(this.proj, x + 0.5, y + 0.5);
    const top = project(this.proj, x + 0.5, y + 0.5, 64);
    g.ellipse(base.x, base.y, 10, 5).fill({ color: 0x2a2116 });
    g.moveTo(base.x, base.y).lineTo(top.x, top.y).stroke({ width: 4, color: 0x3a2f20 });
    g.poly([top.x - 14, top.y + 6, top.x + 14, top.y + 6, top.x + 8, top.y - 12, top.x - 8, top.y - 12]).fill({ color: on ? 0xf2d29b : 0x6a6250 }).stroke({ width: 2, color: 0x6b5634 });
    if (on) g.circle(top.x, top.y + 4, 28 + Math.sin(this.time * 3 + x) * 1.5).fill({ color: COL.lampGlow, alpha: 0.12 });
  }

  /** A laser: two beams across the gap, wall to wall (see laserAxis), dotted when they're switched off. */
  private laser(g: Graphics, level: Level, x: number, y: number, on: boolean): void {
    const across = laserAxis(level, x, y) === 'x';
    for (const z of [14, 30]) {
      const a = across ? project(this.proj, x, y + 0.5, z) : project(this.proj, x + 0.5, y, z);
      const b = across ? project(this.proj, x + 1, y + 0.5, z) : project(this.proj, x + 0.5, y + 1, z);
      if (on) {
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 5, color: COL.laser, alpha: 0.25 });
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.8, color: 0xff8080, alpha: 0.95 });
      } else
        for (let i = 0; i < 4; i++) {
          const t0 = i / 4;
          const t1 = t0 + 0.12;
          g.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0).lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1).stroke({ width: 1, color: 0x884444, alpha: 0.5 });
        }
    }
  }

  private exitSign(g: Graphics, x: number, y: number): void {
    const sp = project(this.proj, x + 0.5, y + 0.5, 70);
    g.roundRect(sp.x - 22, sp.y - 10, 44, 20, 4).fill({ color: 0x1f6b49 }).stroke({ width: 2, color: 0x9ff0c8 });
    g.moveTo(sp.x - 10, sp.y).lineTo(sp.x + 8, sp.y).moveTo(sp.x + 2, sp.y - 6).lineTo(sp.x + 9, sp.y).lineTo(sp.x + 2, sp.y + 6).stroke({ width: 3, color: 0xffffff });
  }

  private camera(g: Graphics, at: Point, facing: number, off: boolean): void {
    const d = screenDir(this.proj, DIRS[facing].x, DIRS[facing].y);
    const sp = project(this.proj, at.x + 0.5, at.y + 0.5, 74);
    if (this.sprite(g, 'security_camera_01', at.x + 0.5, at.y + 0.5, 62, Math.atan2(DIRS[facing].y, DIRS[facing].x) - Math.PI / 2, 1, off ? 0x6a6e7a : 0xffffff)) {
      if (!off && Math.sin(this.time * 5) > 0) g.circle(sp.x, sp.y - 2, 2.5).fill({ color: 0xff3b30 });
      return;
    }
    g.roundRect(sp.x - 9, sp.y - 6, 18, 12, 3).fill({ color: 0x2b2f3d }).stroke({ width: 1.5, color: 0x0d0f16 });
    g.moveTo(sp.x, sp.y).lineTo(sp.x + d.x * 14, sp.y + d.y * 14).stroke({ width: 7, color: 0x3b4052 });
    g.circle(sp.x + d.x * 15, sp.y + d.y * 15, 3.5).fill({ color: off ? 0x444444 : 0x9fd7ff });
    if (!off && Math.sin(this.time * 5) > 0) g.circle(sp.x - 5, sp.y - 2, 2).fill({ color: 0xff3b30 });
  }

  /** A pressure plate: a raised metal square with a seam round it. */
  private plate(g: Graphics, x: number, y: number): void {
    this.diamond(g, x, y, 0.36, 0x6a7080, 1);
    this.diamondOutline(g, x, y, 0x2a2e38, 1.5, 0.16, 0.9);
    this.diamond(g, x, y, 0.22, 0x8a90a0, 1);
  }

  private planks(g: Graphics, x: number, y: number): void {
    for (const t of [0.33, 0.66]) {
      const a = project(this.proj, x + t, y + 0.05);
      const b = project(this.proj, x + t, y + 0.95);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x3a2614, alpha: 0.8 });
    }
    const n = project(this.proj, x + 0.5, y + 0.5);
    g.circle(n.x, n.y, 1.5).fill({ color: 0x2a1a0c });
  }

  /**
   * A safe: a heavy steel box facing the room, with a door on its front (a big combination dial, a three-spoke
   * handle, hinges, rivets and a brass plate), green tumbler lights for each go of cracking it, and, once it's
   * open, the door swung wide on its hinge and the empty inside showing: the same thing the guards see.
   */
  private safe(g: Graphics, level: Level, x: number, y: number, open: boolean, cracks: number, goes: number): void {
    const c = Math.cos(this.proj.angle);
    const sn = Math.sin(this.proj.angle);
    // It faces into the room: the side with the most open floor in front of it.
    const run = (d: { x: number; y: number }) => {
      let k = 0;
      while (k < 5 && !blocksMove(level.tiles[y + d.y * (k + 1)]?.[x + d.x * (k + 1)] ?? 'wall')) k++;
      return k;
    };
    const n = NEIGHBOURS.reduce((best, d) => (run(d) > run(best) ? d : best), NEIGHBOURS[1]);
    const H = 46;
    this.prism(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, H, 0x6b7584, 0x4a5262, 0x363c4a, 1);
    // A dark plinth band at the foot and a lighter lip on the top, so it reads as heavy.
    const foot = this.corners(x + 0.1, y + 0.1, x + 0.9, y + 0.9, 0);
    g.poly(foot.flatMap((q) => [q.x, q.y])).fill({ color: 0x000000, alpha: 0.35 });
    const lid = this.corners(x + 0.18, y + 0.18, x + 0.82, y + 0.82, H);
    g.poly(lid.flatMap((q) => [q.x, q.y])).stroke({ width: 1.5, color: 0x3a404c, alpha: 0.8 });
    let tx = -n.y;
    let ty = n.x;
    const fx = x + 0.5 + n.x * 0.385;
    const fy = y + 0.5 + n.y * 0.385;
    if (project(this.proj, fx + tx, fy + ty).x < project(this.proj, fx, fy).x) {
      tx = -tx;
      ty = -ty;
    }
    const faceVisible = c * n.x - sn * n.y + (sn * n.x + c * n.y) > 0.3;
    // The front face's own coordinates: game pixels, x along the face (left to right on screen), y down it.
    const o = project(this.proj, fx, fy, H / 2);
    const along = project(this.proj, fx + tx, fy + ty, H / 2);
    const m = new Matrix((along.x - o.x) / 58.8, (along.y - o.y) / 58.8, 0, 1, o.x, o.y);
    const W = 20; // half the face's width
    if (faceVisible) {
      g.save();
      g.setTransform(m);
      if (open) {
        // The empty inside: dark, a shelf, a few loose papers left behind.
        g.rect(-W + 3, -H / 2 + 4, W * 2 - 6, H - 8).fill({ color: 0x14161c }).stroke({ width: 2, color: 0x1c1233 });
        g.rect(-W + 4, -1, W * 2 - 8, 2).fill({ color: 0x3a404c });
        g.poly([-10, 15, -2, 13, 0, 17, -8, 19]).fill({ color: 0xe8e2d0, alpha: 0.8 });
        g.poly([4, -6, 11, -7, 12, -3, 5, -2]).fill({ color: 0xe8e2d0, alpha: 0.6 });
      } else {
        // The door: an inset steel panel with rivets, hinges on the left, a brass plate at the top.
        g.rect(-W + 3, -H / 2 + 4, W * 2 - 6, H - 8).fill({ color: 0x7c8696 }).stroke({ width: 2, color: 0x1c1233 });
        for (const [rx, ry] of [[-W + 6, -H / 2 + 7], [W - 6, -H / 2 + 7], [-W + 6, H / 2 - 7], [W - 6, H / 2 - 7]]) g.circle(rx, ry, 1.3).fill({ color: 0xc9d0dc });
        for (const hy of [-H / 2 + 10, H / 2 - 12]) g.rect(-W + 1, hy, 3, 6).fill({ color: 0x2a2f3a });
        g.rect(-7, -H / 2 + 6, 14, 4).fill({ color: 0xd9b14a }).stroke({ width: 1, color: 0x6b4f1e });
        // The dial: ticks round a black face, its knob turning while it's locked.
        g.circle(-4, 0, 8.5).fill({ color: 0xe4e8ef }).stroke({ width: 2, color: 0x1c1233 });
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          g.moveTo(-4 + Math.cos(a) * 6.5, Math.sin(a) * 6.5).lineTo(-4 + Math.cos(a) * 8, Math.sin(a) * 8).stroke({ width: 1, color: 0x1c1233 });
        }
        g.circle(-4, 0, 4).fill({ color: 0x2a2f3a });
        const turn = this.time * 0.7 + cracks;
        g.moveTo(-4, 0).lineTo(-4 + Math.cos(turn) * 3.5, Math.sin(turn) * 3.5).stroke({ width: 1.5, color: 0xe4e8ef });
        // The handle: three spokes round a hub.
        for (let i = 0; i < 3; i++) {
          const a = (i * Math.PI * 2) / 3 + 0.4;
          g.moveTo(11, 4).lineTo(11 + Math.cos(a) * 6, 4 + Math.sin(a) * 6).stroke({ width: 2, color: 0x2a2f3a, cap: 'round' });
        }
        g.circle(11, 4, 2.2).fill({ color: 0xc9d0dc }).stroke({ width: 1, color: 0x1c1233 });
        // A tumbler light for each go it takes: green once cracked, dim until then.
        for (let i = 0; i < goes; i++) g.circle(-4 - (goes - 1) * 3 + i * 6, 13, 1.8).fill({ color: i < cracks ? 0x4dff88 : 0x2a3a30 }).stroke({ width: 0.8, color: 0x1c1233 });
      }
      g.restore();
      g.beginPath();
    }
    if (open) {
      // The door, swung out wide on its hinge into the room: anyone walking past sees it at once.
      const hinge = { x: fx - tx * 0.34, y: fy - ty * 0.34 };
      const swing = (105 * Math.PI) / 180;
      const dx = tx * Math.cos(swing) + n.x * Math.sin(swing);
      const dy = ty * Math.cos(swing) + n.y * Math.sin(swing);
      const len = 0.66;
      const p0 = project(this.proj, hinge.x, hinge.y, 4);
      const p1 = project(this.proj, hinge.x + dx * len, hinge.y + dy * len, 4);
      const p2 = project(this.proj, hinge.x + dx * len, hinge.y + dy * len, H - 4);
      const p3 = project(this.proj, hinge.x, hinge.y, H - 4);
      g.poly([p0.x, p0.y, p1.x, p1.y, p2.x, p2.y, p3.x, p3.y]).fill({ color: 0x8a94a4 }).stroke({ width: 2, color: 0x1c1233 });
      // The door's thickness, and the dial still on its outside.
      const q = project(this.proj, hinge.x + dx * len * 0.55, hinge.y + dy * len * 0.55, H / 2);
      g.circle(q.x, q.y, 5).fill({ color: 0xe4e8ef }).stroke({ width: 1.5, color: 0x1c1233 });
      g.circle(q.x, q.y, 2).fill({ color: 0x2a2f3a });
    }
  }


  /** A card-reader door: steel, with a red light, green once Leo has the card. */
  private keydoor(g: Graphics, x: number, y: number, h: number, alpha: number, canOpen: boolean): void {
    this.prism(g, x + 0.06, y + 0.06, x + 0.94, y + 0.94, h, 0x8a93a8, 0x646c80, 0x4e5566, alpha);
    const sp = project(this.proj, x + 0.5, y + 0.5, h * 0.5);
    g.roundRect(sp.x - 5, sp.y - 7, 10, 14, 2).fill({ color: 0x1c2233 });
    g.circle(sp.x, sp.y - 3, 2.5).fill({ color: canOpen ? 0x4dff88 : 0xff3b30 });
  }

  /** A round vault door in a steel frame, with its dials. */
  private vault(g: Graphics, x: number, y: number, h: number, alpha: number, dials: number, known: boolean): void {
    this.prism(g, x, y, x + 1, y + 1, h, 0x9aa1b2, 0x6e7586, 0x575d6c, alpha);
    const c = project(this.proj, x + 0.5, y + 0.5, h + 2);
    g.circle(c.x, c.y, 12).fill({ color: 0xc0c6d4, alpha }).stroke({ width: 2, color: 0x2e333e });
    for (let i = 0; i < 2; i++) g.circle(c.x - 5 + i * 10, c.y, 3).fill({ color: i < dials ? 0x6ee7a8 : known ? 0xf2c46b : 0x2e333e });
  }

  /** A gap between rooftops (a long way down) or the water at the docks. */
  private gap(g: Graphics, level: Level, x: number, y: number): void {
    const water = level.def.gaps === 'water';
    this.diamond(g, x, y, 0.5, water ? 0x0f2a44 : 0x05060c, 1);
    if (water) {
      const a = project(this.proj, x + 0.25, y + 0.5);
      const w = Math.sin(this.time * 2 + x + y) * 2;
      g.moveTo(a.x, a.y + w).quadraticCurveTo(a.x + 8, a.y - 4 + w, a.x + 16, a.y + w).stroke({ width: 1.5, color: 0x5aa0d0, alpha: 0.6 });
    } else if ((x * 7 + y * 13) % 5 === 0) {
      // Streetlights far below.
      const c = project(this.proj, x + 0.5, y + 0.5);
      g.circle(c.x, c.y, 1.5).fill({ color: 0xf2c46b, alpha: 0.7 });
    }
  }

  /** A wire strung across a gap, from each neighbour that isn't open air. */
  private wire(g: Graphics, level: Level, x: number, y: number): void {
    const c = project(this.proj, x + 0.5, y + 0.5, 4);
    for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
      if (level.tiles[y + d.y]?.[x + d.x] === 'gap' || level.tiles[y + d.y]?.[x + d.x] === undefined) continue;
      const e = project(this.proj, x + 0.5 + d.x * 0.5, y + 0.5 + d.y * 0.5, 4);
      g.moveTo(c.x, c.y).lineTo(e.x, e.y).stroke({ width: 2, color: 0xc8ccd8 });
    }
  }

  /** A glass wall: see-through panes that join up with their neighbours. */
  private glass(g: Graphics, level: Level, x: number, y: number): void {
    const t = (dx: number, dy: number) => ['glass', 'wall', 'pillar'].includes(level.tiles[y + dy]?.[x + dx] ?? '');
    const horizontal = t(-1, 0) || t(1, 0);
    const [x0, y0, x1, y1] = horizontal ? [x, y + 0.42, x + 1, y + 0.58] : [x + 0.42, y, x + 0.58, y + 1];
    this.prism(g, x0, y0, x1, y1, WALL_H - 14, 0xbfe9ff, 0x9fd7ff, 0x86c4ef, 0.28);
    const top0 = project(this.proj, horizontal ? x : x + 0.5, horizontal ? y + 0.5 : y, WALL_H - 14);
    const top1 = project(this.proj, horizontal ? x + 1 : x + 0.5, horizontal ? y + 0.5 : y + 1, WALL_H - 14);
    g.moveTo(top0.x, top0.y).lineTo(top1.x, top1.y).stroke({ width: 2, color: 0xe6f6ff, alpha: 0.7 });
  }

  /** A kennel with a sleeping guard dog's nose poking out. */
  private kennel(g: Graphics, x: number, y: number): void {
    this.prism(g, x + 0.15, y + 0.15, x + 0.85, y + 0.85, 26, 0x9c4a2a, 0x7a3a20, 0x5e2c18, 1);
    const roof = project(this.proj, x + 0.5, y + 0.5, 40);
    const l = project(this.proj, x + 0.12, y + 0.5, 26);
    const r = project(this.proj, x + 0.88, y + 0.5, 26);
    g.poly([l.x, l.y, roof.x, roof.y, r.x, r.y]).fill({ color: 0x5a2a1a }).stroke({ width: 1, color: 0x1a1d2c });
    const nose = project(this.proj, x + 0.5, y + 0.9, 6);
    g.circle(nose.x, nose.y, 3.5).fill({ color: 0xc8a06a });
    g.circle(nose.x, nose.y - 1, 1.5).fill({ color: 0x1b1b22 });
    const z = project(this.proj, x + 0.7, y + 0.3, 48 + Math.sin(this.time * 2 + x) * 3);
    g.moveTo(z.x - 3, z.y - 3).lineTo(z.x + 3, z.y - 3).lineTo(z.x - 3, z.y + 3).lineTo(z.x + 3, z.y + 3).stroke({ width: 1.5, color: 0xe6e6f0, alpha: 0.8 });
  }

  /** A desk, with the combination somewhere in it (papers on top until Leo finds it). */
  private desk(g: Graphics, x: number, y: number, found: boolean): void {
    const model: PropName = this.district === 'downtown' || this.district === 'harbour' ? 'metal_office_desk' : 'ClassicConsole_01';
    const drawn = this.sprite(g, model, x + 0.5, y + 0.5, 0, 0, 1, this.tint(x, y));
    if (!drawn) this.prism(g, x + 0.08, y + 0.2, x + 0.92, y + 0.8, 24, 0x7a5634, 0x5e4228, 0x4a341f, 1);
    const c = project(this.proj, x + 0.5, y + 0.5, drawn ? (prop(model)?.height ?? 24) + 1 : 25);
    if (!found) g.poly([c.x - 8, c.y, c.x, c.y - 4, c.x + 8, c.y, c.x, c.y + 4]).fill({ color: 0xf7f4ec }).stroke({ width: 1, color: 0x8a8578 });
    g.circle(c.x + 10, c.y - 2, 3).fill({ color: 0xf2c46b, alpha: 0.9 });
  }

  /** A wooden crate with its lid off. With Leo inside, two eyes peek over the edge. */
  private crate(g: Graphics, x: number, y: number, leoInside: boolean): void {
    const drawn = this.sprite(g, 'wooden_crate_01', x + 0.5, y + 0.5, 0, Math.floor(tileHash(x, y) * 4) * (Math.PI / 2), 1, this.tint(x, y));
    if (!drawn) {
      this.prism(g, x + 0.1, y + 0.1, x + 0.9, y + 0.9, 30, 0x3a2a18, 0xa07a48, 0x86643a, 1);
      for (const t of [0.35, 0.65]) {
        const a = project(this.proj, x + 0.1, y + t, 30);
        const b = project(this.proj, x + 0.9, y + t, 30);
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1, color: 0x5e4428, alpha: 0.8 });
      }
    }
    if (leoInside) {
      const c = project(this.proj, x + 0.5, y + 0.5, drawn ? (prop('wooden_crate_01')?.height ?? 30) + 2 : 32);
      const blink = Math.sin(this.time * 2) > 0.95;
      for (const dx of [-4, 4]) g.ellipse(c.x + dx, c.y, 2.5, blink ? 0.5 : 2.5).fill({ color: 0xe9d36b });
      g.poly([c.x - 9, c.y - 2, c.x - 6, c.y - 9, c.x - 3, c.y - 3]).fill({ color: 0x1b1b22 });
      g.poly([c.x + 9, c.y - 2, c.x + 6, c.y - 9, c.x + 3, c.y - 3]).fill({ color: 0x1b1b22 });
    }
  }

  /** Crates stacked high, each a little askew. */
  private crateStack(g: Graphics, x: number, y: number, h: number, alpha: number): void {
    const a = prop('wooden_crate_02');
    const b = prop('wooden_military_crate');
    if (a && b) {
      let z = 0;
      for (let i = 0; z < h - 6; i++) {
        const name: PropName = tileHash(x, y, i) < 0.5 ? 'wooden_crate_02' : 'wooden_military_crate';
        this.sprite(g, name, x + 0.5, y + 0.5, z, Math.floor(tileHash(x, y, i + 3) * 4) * (Math.PI / 2), alpha, this.tint(x, y));
        z += Math.max(10, (name === 'wooden_crate_02' ? a : b).height);
      }
      return;
    }
    const n = Math.max(1, Math.round(h / 22));
    for (let i = 0; i < n; i++) {
      const o = ((x * 3 + y * 5 + i * 7) % 3) * 0.03;
      this.prism(g, x + 0.06 + o, y + 0.06 + o, x + 0.94 - o, y + 0.94 - o, h / n - 1, 0xb88a52, 0xa07a48, 0x86643a, alpha, (i * h) / n);
    }
  }

  /** A light switch on the wall: lever up (on) or down (off). */
  private lightSwitch(g: Graphics, x: number, y: number, h: number, off: boolean): void {
    const sp = project(this.proj, x + 0.5, y + 0.5, h + 10);
    g.roundRect(sp.x - 7, sp.y - 10, 14, 20, 3).fill({ color: 0xf2eee2 }).stroke({ width: 1.5, color: 0x6b5634 });
    g.roundRect(sp.x - 2, off ? sp.y : sp.y - 7, 4, 7, 1).fill({ color: off ? 0x555a66 : 0xf2c46b });
  }

  /** The lighthouse: a lantern on its tower and the wedge of its beam across the ground. */
  private beacon(level: Level, s: State): void {
    const b = level.def.beacon!;
    const f = beaconFacing(level, s);
    const c = project(this.proj, b.at.x + 0.5, b.at.y + 0.5, 10);
    const pts = [c.x, c.y];
    for (const a of [-22.5, -11, 0, 11, 22.5]) {
      const ang = Math.atan2(DIRS[f].y, DIRS[f].x) + (a * Math.PI) / 180;
      const e = project(this.proj, b.at.x + 0.5 + Math.cos(ang) * (b.range + 0.5), b.at.y + 0.5 + Math.sin(ang) * (b.range + 0.5), 10);
      pts.push(e.x, e.y);
    }
    this.fx.poly(pts).fill({ color: 0xfff3c0, alpha: 0.08 });
    const top = project(this.proj, b.at.x + 0.5, b.at.y + 0.5, WALL_H + 20);
    this.fx.circle(top.x, top.y, 16 + Math.sin(this.time * 4) * 2).fill({ color: 0xfff3c0, alpha: 0.35 });
    this.fx.circle(top.x, top.y, 7).fill({ color: 0xfffbe6 });
  }

  /** A conveyor belt: dark rubber with chevrons creeping along it. */
  private belt(g: Graphics, x: number, y: number, dir: number): void {
    this.diamond(g, x, y, 0.42, 0x2a2c34, 1);
    const shift = ((this.time * 0.6) % 1) * dir;
    for (const i of [-0.25, 0.25]) {
      const cx = x + 0.5 + i + shift * 0.25;
      const a = project(this.proj, cx - 0.08 * dir, y + 0.3);
      const m = project(this.proj, cx + 0.08 * dir, y + 0.5);
      const b = project(this.proj, cx - 0.08 * dir, y + 0.7);
      g.moveTo(a.x, a.y).lineTo(m.x, m.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0xf2c46b, alpha: 0.8 });
    }
  }

  /** A puddle of wet paint, in a different colour on every tile. */
  private paint(g: Graphics, x: number, y: number): void {
    const col = [0xe0314b, 0x3fbf7f, 0x5ec8ff, 0xf2c46b][(x * 7 + y * 3) % 4];
    const c = project(this.proj, x + 0.5, y + 0.5);
    g.ellipse(c.x, c.y, 22, 10).fill({ color: col, alpha: 0.85 });
    g.ellipse(c.x - 8, c.y + 2, 6, 3).fill({ color: 0xffffff, alpha: 0.25 });
  }

  /** A wet paw print, fading as it dries. */
  private pawPrint(g: Graphics, at: Point, fresh: number): void {
    const c = project(this.proj, at.x + 0.5, at.y + 0.5);
    const a = 0.25 + 0.6 * fresh;
    g.ellipse(c.x, c.y + 2, 5, 3.5).fill({ color: 0xe0314b, alpha: a });
    for (const [dx, dy] of [[-5, -3], [-2, -6], [2, -6], [5, -3]]) g.circle(c.x + dx, c.y + dy, 1.6).fill({ color: 0xe0314b, alpha: a });
  }

  /** A Robo-Guard: a bulldog-shaped tin can on a wheel, with a red heat-scanner visor (dark when unpowered). */
  private drawRobo(g: Graphics, a: Actor, guard: Guard, off: boolean, grinning: boolean): void {
    const r = this.figure(g, 'robot', a, { off, tint: off ? 0x7a7e8c : this.actorTint(a) });
    if (!r) return;
    if (off) {
      const z = project(this.proj, a.x + 0.3, a.y - 0.3, 80);
      g.moveTo(z.x - 5, z.y).lineTo(z.x + 5, z.y).stroke({ width: 2, color: 0x9aa3b5 });
    } else this.mark(g, r.x, r.top, guard.mode === 'searching' || grinning ? '!' : '', 0xff3b30, 0xffd23f);
  }

  private lootName(li: number): string {
    return this.lvl?.def.loot[li]?.name ?? '';
  }

  /** A ? or ! over a character's head, bobbing. */
  private mark(g: Graphics, x: number, head: number, mark: '' | '?' | '!', bang: number, query: number): void {
    if (!mark) return;
    const top = head - 32 + Math.sin(this.time * 6) * 2;
    g.roundRect(x - 10, top, 20, 26, 5).fill({ color: mark === '!' ? bang : query }).stroke({ width: 2, color: 0xffffff });
    if (mark === '!') {
      g.rect(x - 2, top + 4, 4, 12).fill({ color: 0xffffff });
      g.rect(x - 2, top + 19, 4, 4).fill({ color: 0xffffff });
    } else {
      // A fresh path each time, so the curve doesn't join up with whatever was drawn before it.
      g.beginPath().arc(x, top + 9, 5, Math.PI, Math.PI * 2.25).stroke({ width: 3, color: 0x1a1205 });
      g.beginPath().moveTo(x + 1, top + 13).lineTo(x, top + 17).stroke({ width: 3, color: 0x1a1205 });
      g.rect(x - 1.5, top + 19, 3, 3).fill({ color: 0x1a1205 });
    }
  }

  /** Diagonal stripes across a tile, so a seen tile reads without colour. */
  private hatch(g: Graphics, x: number, y: number, color: number): void {
    for (const t of [0.25, 0.5, 0.75]) {
      const a = project(this.proj, x + t, y + 0.05);
      const b = project(this.proj, x + 0.05, y + t);
      const c = project(this.proj, x + 0.95, y + t);
      const d = project(this.proj, x + t, y + 0.95);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 1.5, color, alpha: 0.8 });
      g.moveTo(c.x, c.y).lineTo(d.x, d.y).stroke({ width: 1.5, color, alpha: 0.8 });
    }
  }

  /** A keycard lying on the floor. */
  private keycard(g: Graphics, x: number, y: number): void {
    const c = project(this.proj, x + 0.5, y + 0.5, 1);
    const glow = 0.25 + Math.sin(this.time * 4) * 0.1;
    g.circle(c.x, c.y, 12).fill({ color: 0x5ef0ff, alpha: glow });
    g.poly([c.x - 9, c.y, c.x, c.y - 5, c.x + 9, c.y, c.x, c.y + 5]).fill({ color: 0xffffff }).stroke({ width: 1, color: 0x1b1b22 });
    g.circle(c.x - 2, c.y, 1.8).fill({ color: 0x2fb8a3 });
  }

  private ladder(g: Graphics, x: number, y: number): void {
    for (const side of [0.3, 0.7]) {
      const a = project(this.proj, x + side, y + 0.5, 0);
      const b = project(this.proj, x + side, y + 0.5, RAFTER_Z);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 3, color: 0x8a6a45 });
    }
    for (let z = 10; z < RAFTER_Z; z += 14) {
      const a = project(this.proj, x + 0.3, y + 0.5, z);
      const b = project(this.proj, x + 0.7, y + 0.5, z);
      g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 2, color: 0xa88458 });
    }
  }

  private beam(g: Graphics, x: number, y: number, alpha: number): void {
    this.prism(g, x + 0.3, y + 0.3, x + 0.7, y + 0.7, 6, 0x8a6a45, 0x6b4a2a, 0x553a20, alpha, RAFTER_Z - 8);
  }

  private decoyCard(g: Graphics, at: Point): void {
    const c = project(this.proj, at.x + 0.5, at.y + 0.5, 2);
    g.poly([c.x - 10, c.y, c.x, c.y - 6, c.x + 10, c.y, c.x, c.y + 6]).fill({ color: 0xf7f4ec }).stroke({ width: 1, color: 0x1b1b22 });
    g.circle(c.x, c.y, 2).fill({ color: 0xd8262f });
  }

  private zzz(g: Graphics, a: Actor, top?: number): void {
    const s = project(this.proj, a.x, a.y);
    for (let i = 0; i < 3; i++) {
      const t = (this.time * 0.8 + i / 3) % 1;
      const x = s.x + 10 + t * 14;
      const y = (top ?? s.y - 50) - 14 - t * 26;
      const z = 4 + i;
      g.moveTo(x - z, y - z).lineTo(x + z, y - z).lineTo(x - z, y + z).lineTo(x + z, y + z).stroke({ width: 2, color: 0xd8e4ff, alpha: 1 - t });
    }
  }

  private face(a: Actor): { x: number; y: number } {
    const d = DIRS[a.facing];
    return screenDir(this.proj, d.x, d.y);
  }

  /** Leo Tuxedo, from his drawings. */
  private drawLeo(g: Graphics, a: Actor, inVent: boolean, lift = 0): void {
    this.figure(g, 'leo', a, { lift, alpha: inVent ? 0.55 : 1, crawl: inVent, tint: this.actorTint(a, true), hide: this.leoHide });
  }

  /** A rival thief: a cat in their own colours, with a name tag, and the prize if they've got it. */
  private drawRival(g: Graphics, a: Actor, id: RivalId, prize: boolean): void {
    const r = this.figure(g, id === 'paws' ? 'prof' : id, a, { tint: this.actorTint(a), scale: 0.97 });
    if (!r) return;
    if (prize) g.circle(r.x, r.top - 10, 7).fill({ color: 0x3a2a4a }).stroke({ width: 2, color: COL.rival });
    const name = RIVALS[id].name;
    g.roundRect(r.x - name.length * 2.6, r.top - (prize ? 30 : 16), name.length * 5.2, 12, 4).fill({ color: COL.rival, alpha: 0.85 });
  }

  /** NightClaw: a tall, lean old black cat in a long coat and top hat, grey at the muzzle, with gold eyes. */
  private drawNightClaw(g: Graphics, a: Actor, guard: Guard, grinning: boolean): void {
    const r = this.figure(g, 'nightclaw', a, { tint: this.actorTint(a) });
    if (!r) return;
    this.mark(g, r.x, r.top, grinning || guard.mode === 'searching' ? '!' : guard.mode === 'suspicious' ? '?' : '', 0xb05cff, 0xd9b8ff);
  }

  /** A guard: a bulldog (a guard dog for sniffers), the captain with a gold star. Shows ? when suspicious, ! when searching. */
  private drawGuard(g: Graphics, a: Actor, guard: Guard, grinning: boolean): void {
    const sniffer = guard.kind === 'sniffer';
    const r = this.figure(g, sniffer ? 'dog' : 'guard', a, { asleep: guard.asleep, tint: this.actorTint(a), scale: guard.kind === 'captain' ? 1.12 : 1, torch: false });
    if (!r) return;
    if (guard.kind === 'captain') {
      // The captain's gold star, worn on the cap.
      const y = r.top + 6;
      g.star(r.x, y, 5, 4.5, 2).fill({ color: 0xf2c46b }).stroke({ width: 1, color: 0x6b4b12 });
    }
    if (sniffer && !guard.asleep) {
      // Sniffing the air in front of its nose.
      const dir = a.flip ? 1 : -1;
      const nx = r.x + dir * 24;
      const ny = r.top + 14;
      const t = (this.time * 1.5) % 1;
      for (const side of [-1, 1]) g.moveTo(nx + dir * t * 10, ny + side * (4 + t * 6)).quadraticCurveTo(nx + dir * (6 + t * 10), ny, nx + dir * t * 10, ny - side * (4 + t * 6)).stroke({ width: 1.5, color: 0xd8e4ff, alpha: 1 - t });
    }
    if (guard.asleep) return this.zzz(g, a, r.top);
    this.mark(g, r.x, r.top, grinning || guard.mode === 'searching' ? '!' : guard.mode === 'suspicious' ? '?' : '', 0xff3b30, 0xffd23f);
  }
}
