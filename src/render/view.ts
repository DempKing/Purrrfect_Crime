// Draws a heist: floors and overlays first, then walls, furniture and characters sorted by depth.
// Placeholder art for now; generated sprites replace the character and prop drawing later.
import { Container, Graphics } from 'pixi.js';
import { DIRS, RIVALS, camerasActive, sensorsActive, key, lasersActive, lightMap, lootAt, spotlightsNow, tileNow, type Guard, type RivalId, type State } from '../core/game';
import type { Level, Point } from '../core/level';
import { project, screenDir, TILE_H, TILE_W, type Projector } from './iso';

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

/** Placeholder looks for the four rivals until their sprites arrive. */
const RIVAL_LOOKS: Record<RivalId, { fur: number; patch?: number; eyes: number; mask: number }> = {
  mittens: { fur: 0xf2f0ea, patch: 0xd9822b, eyes: 0x5fbf5f, mask: 0x1b1b22 },
  luna: { fur: 0x9aa3b5, eyes: 0x8ec5ff, mask: 0x3a2a5a },
  sammy: { fur: 0xd9822b, patch: 0xf5e6c8, eyes: 0xe9d36b, mask: 0x1b1b22 },
  paws: { fur: 0x7a5a3a, patch: 0xc8a882, eyes: 0x2a1a0c, mask: 0x4a2a1a },
};

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
}

export interface Actor {
  x: number; // continuous grid position (tile x + 0.5 is the centre)
  y: number;
  facing: number;
  bob: number;
}

export interface Ripple {
  x: number;
  y: number;
  r: number; // tiles
  t: number; // 0..1
}

interface Drawable {
  depth: number;
  draw: (g: Graphics) => void;
}

export class HeistView {
  root = new Container();
  private floor = new Graphics();
  private objects = new Graphics();
  private fx = new Graphics();
  proj: Projector = { angle: 0, cx: 0, cy: 0 };
  time = 0;
  private light: { level: Level; map: ReturnType<typeof lightMap> } | null = null;

  constructor() {
    this.root.addChild(this.floor, this.objects, this.fx);
  }

  draw(level: Level, s: State, ov: Overlay, leo: Actor, guards: Actor[], ripples: Ripple[], rival?: Actor): void {
    const p = this.proj;
    const f = this.floor;
    const o = this.objects;
    f.clear();
    o.clear();
    this.fx.clear();
    if (this.light?.level !== level) this.light = { level, map: lightMap(level) };
    const light = this.light.map;
    const inVent = s.layer === 'vent';
    const inRafters = s.layer === 'rafter';
    const spots = spotlightsNow(level, s);

    // Floors, shaded by light, with the overlays painted on top of them.
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = tileNow(level, s, x, y);
        if (t === 'wall' || t === 'pillar' || t === 'panel' || t === 'fuse') continue;
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
        const base = t === 'exit' ? COL.exit : t === 'marble' ? ((x + y) % 2 ? COL.marbleA : COL.marbleB) : t === 'squeaky' ? ((x + y) % 2 ? 0x7a5634 : 0x6e4c2d) : (x + y) % 2 ? COL.carpetA : COL.carpetB;
        this.diamond(f, x, y, 0.5, base, 1, COL.floorLine);
        if (t === 'squeaky') this.planks(f, x, y);
        if (t === 'plate') this.plate(f, x, y);
        if (t === 'keycard') this.keycard(f, x, y);
        const spotlit = spots.some((sp) => Math.hypot(x - sp.at.x, y - sp.at.y) <= sp.radius + 0.01);
        const l = spotlit ? 2 : light[y][x];
        if (l === 0) this.diamond(f, x, y, 0.5, 0x05060c, 0.55);
        else if (l === 2) this.diamond(f, x, y, 0.5, spotlit ? 0xfff6d8 : COL.lampGlow, spotlit ? 0.32 : 0.16);
        if (t === 'grate') this.grate(f, x, y);
        if (level.motion[y][x] && sensorsActive(s)) this.diamondOutline(f, x, y, COL.motion, 1, 0.1, 0.35 + Math.sin(this.time * 3) * 0.1);
        if (inVent || inRafters) this.diamond(f, x, y, 0.5, 0x02030a, 0.45);
        if (ov.cameraVision.has(k)) this.diamond(f, x, y, 0.46, COL.camera, 0.3);
        if (ov.targets.has(k)) {
          this.diamond(f, x, y, 0.4, COL.target, 0.28 + Math.sin(this.time * 5) * 0.08);
          this.diamondOutline(f, x, y, COL.target, 1.5, 0.12, 0.8);
        }
        if (ov.vision.has(k)) this.diamond(f, x, y, 0.47, COL.vision, 0.32);
        if (!inVent && !inRafters) {
          if (ov.reach1.has(k)) this.diamond(f, x, y, 0.38, COL.reach1, 0.3);
          else if (ov.reach2.has(k)) this.diamond(f, x, y, 0.38, COL.reach2, 0.26);
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
    const leoDepth = project(p, leo.x, leo.y).depth;
    const lasersOn = lasersActive(level, s);
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = tileNow(level, s, x, y);
        const d = project(p, x + 0.5, y + 0.5).depth;
        const k = key(x, y);
        if (t === 'wall' || t === 'pillar' || t === 'door' || t === 'keydoor' || t === 'vault' || t === 'panel' || t === 'fuse') {
          // Walls between the camera and Leo, the near outer walls, and every wall while Leo is in the vents drop to stubs.
          const near = inVent || inRafters || (Math.hypot(x + 0.5 - leo.x, y + 0.5 - leo.y) < 3.6 && d > leoDepth + 0.2) || this.nearOuterWall(level, x, y);
          const h = near ? STUB_H : t === 'pillar' ? WALL_H - 6 : WALL_H;
          const a = near ? 0.75 : 1;
          if (t === 'pillar') items.push({ depth: d, draw: (g) => this.prism(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, h, 0xe6e0d0, COL.pillar, 0x948f82, a) });
          else if (t === 'door') items.push({ depth: d, draw: (g) => this.door(g, x, y, near ? STUB_H : WALL_H - 10, a, s.picks[k] ?? 0) });
          else if (t === 'keydoor') items.push({ depth: d, draw: (g) => this.keydoor(g, x, y, near ? STUB_H : WALL_H - 10, a, s.card === 'leo' || s.perks.masterKey) });
          else if (t === 'vault') items.push({ depth: d, draw: (g) => this.vault(g, x, y, near ? STUB_H : WALL_H - 4, a, s.picks[k] ?? 0, s.combination) });
          else
            items.push({
              depth: d,
              draw: (g) => {
                this.prism(g, x, y, x + 1, y + 1, h, t === 'panel' ? 0x55d6c2 : t === 'fuse' ? 0xf2c94c : COL.wallTop, COL.wallA, COL.wallB, a);
                if (t === 'panel' || t === 'fuse') this.device(g, x, y, h, t, t === 'panel' ? s.camerasOff : s.lasersOff);
              },
            });
        } else if (t === 'case') {
          const li = lootAt(level, x, y);
          const taken = li >= 0 && (s.inventory.includes(li) || s.rivalLoot.includes(li));
          const broken = s.smashed.includes(k);
          items.push({ depth: d, draw: (g) => this.displayCase(g, x, y, li, taken, broken) });
        } else if (t === 'plinth') {
          const li = lootAt(level, x, y);
          items.push({ depth: d, draw: (g) => this.plinth(g, x, y, li >= 0 && !s.inventory.includes(li) && !s.rivalLoot.includes(li), s.rivalLoot.includes(li)) });
        } else if (t === 'lamp') {
          items.push({ depth: d, draw: (g) => this.lamp(g, x, y) });
        } else if (t === 'laser') {
          items.push({ depth: d + 0.3, draw: (g) => this.laser(g, x, y, lasersOn) });
        } else if (t === 'exit') {
          items.push({ depth: d - 0.4, draw: (g) => this.exitSign(g, x, y) });
        } else if (t === 'safe') {
          const li = lootAt(level, x, y);
          items.push({ depth: d, draw: (g) => this.safe(g, x, y, s.smashed.includes(k) || (li >= 0 && s.inventory.includes(li)), s.picks[k] ?? 0) });
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
        } else if (t === 'desk') {
          items.push({ depth: d, draw: (g) => this.desk(g, x, y, s.combination) });
        }
        // The rafters: beams high overhead, drawn faintly unless Leo is up there.
        if (level.rafters[y][x]) items.push({ depth: d + 0.6, draw: (g) => this.beam(g, x, y, inRafters ? 0.95 : 0.35) });
      }
    for (const sp of spots) {
      const c = project(p, sp.at.x + 0.5, sp.at.y + 0.5);
      this.fx.ellipse(c.x, c.y, ((sp.radius + 0.5) * TILE_W) / Math.SQRT2, ((sp.radius + 0.5) * TILE_H) / Math.SQRT2).fill({ color: 0xfff6d8, alpha: 0.1 });
    }
    for (const c of s.cameras) {
      const facing = c.sweep[c.idx];
      items.push({ depth: project(p, c.at.x + 0.5, c.at.y + 0.5).depth + 0.4, draw: (g) => this.camera(g, c.at, facing, !camerasActive(s, c)) });
    }
    items.push({
      depth: leoDepth + 0.05,
      draw: (g) => {
        this.drawLeo(g, leo, s.inventory.length > 0, inVent, inRafters ? RAFTER_Z - 6 : 0);
        if (s.napTurns > 0) this.zzz(g, leo);
      },
    });
    const r = s.rival;
    if (rival && r && (r.phase === 'in' || r.phase === 'leaving'))
      items.push({ depth: project(p, rival.x, rival.y).depth + 0.05, draw: (g) => this.drawRival(g, rival, r.id, r.prize) });
    guards.forEach((a, i) =>
      items.push({ depth: project(p, a.x, a.y).depth + 0.05, draw: (g) => this.drawGuard(g, a, s.guards[i], s.status === 'caught' && s.caughtBy === s.guards[i].name) }),
    );
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw(o);

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
  private prism(g: Graphics, x0: number, y0: number, x1: number, y1: number, h: number, top: number, sideA: number, sideB: number, alpha: number, z0 = 0): void {
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
      g.poly([b[f.i].x, b[f.i].y, b[f.j].x, b[f.j].y, t[f.j].x, t[f.j].y, t[f.i].x, t[f.i].y]).fill({ color: shade, alpha }).stroke({ width: 1, color: 0x1a1d2c, alpha: alpha * 0.5 });
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

  private device(g: Graphics, x: number, y: number, h: number, kind: 'panel' | 'fuse', off: boolean): void {
    const sp = project(this.proj, x + 0.5, y + 0.5, h + 10);
    const blink = Math.sin(this.time * 4 + x) > 0;
    g.roundRect(sp.x - 12, sp.y - 9, 24, 18, 4).fill({ color: 0x1c2233 }).stroke({ width: 2, color: kind === 'panel' ? 0x55d6c2 : 0xf2c94c });
    if (kind === 'panel') g.rect(sp.x - 8, sp.y - 5, 16, 9).fill({ color: off ? 0x333a4a : 0x2fb8a3 });
    else g.moveTo(sp.x + 2, sp.y - 6).lineTo(sp.x - 3, sp.y + 1).lineTo(sp.x + 2, sp.y + 1).lineTo(sp.x - 2, sp.y + 7).stroke({ width: 2, color: off ? 0x555a66 : 0xffe066 });
    g.circle(sp.x + 9, sp.y - 6, 2).fill({ color: off ? 0x555a66 : blink ? 0x4dff88 : 0x1d6b3a });
  }

  private displayCase(g: Graphics, x: number, y: number, li: number, taken: boolean, broken: boolean): void {
    this.prism(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 22, 0x6b5946, COL.caseBase, 0x47392b, 1);
    if (!taken && li >= 0) {
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
    if (hasGem) {
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

  private lamp(g: Graphics, x: number, y: number): void {
    const base = project(this.proj, x + 0.5, y + 0.5);
    const top = project(this.proj, x + 0.5, y + 0.5, 64);
    g.ellipse(base.x, base.y, 10, 5).fill({ color: 0x2a2116 });
    g.moveTo(base.x, base.y).lineTo(top.x, top.y).stroke({ width: 4, color: 0x3a2f20 });
    g.poly([top.x - 14, top.y + 6, top.x + 14, top.y + 6, top.x + 8, top.y - 12, top.x - 8, top.y - 12]).fill({ color: 0xf2d29b }).stroke({ width: 2, color: 0x6b5634 });
    g.circle(top.x, top.y + 4, 28 + Math.sin(this.time * 3 + x) * 1.5).fill({ color: COL.lampGlow, alpha: 0.12 });
  }

  private laser(g: Graphics, x: number, y: number, on: boolean): void {
    for (const z of [14, 30]) {
      const a = project(this.proj, x, y + 0.5, z);
      const b = project(this.proj, x + 1, y + 0.5, z);
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

  private safe(g: Graphics, x: number, y: number, open: boolean, cracks: number): void {
    this.prism(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 44, 0x5a6070, 0x3e4452, 0x2e333e, 1);
    const c = project(this.proj, x + 0.5, y + 0.5, 46);
    g.circle(c.x, c.y, 8).fill({ color: open ? 0x1a1a1a : 0xc0c6d4 }).stroke({ width: 2, color: 0x20242c });
    if (!open) {
      const a = this.time * 0.6 + cracks;
      g.moveTo(c.x, c.y).lineTo(c.x + Math.cos(a) * 6, c.y + Math.sin(a) * 6).stroke({ width: 2, color: 0x20242c });
      for (let i = 0; i < cracks; i++) g.circle(c.x - 8 + i * 8, c.y + 13, 2).fill({ color: 0x6ee7a8 });
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
    this.prism(g, x + 0.08, y + 0.2, x + 0.92, y + 0.8, 24, 0x7a5634, 0x5e4228, 0x4a341f, 1);
    const c = project(this.proj, x + 0.5, y + 0.5, 25);
    if (!found) g.poly([c.x - 8, c.y, c.x, c.y - 4, c.x + 8, c.y, c.x, c.y + 4]).fill({ color: 0xf7f4ec }).stroke({ width: 1, color: 0x8a8578 });
    g.circle(c.x + 10, c.y - 2, 3).fill({ color: 0xf2c46b, alpha: 0.9 });
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

  private zzz(g: Graphics, a: Actor): void {
    const s = project(this.proj, a.x, a.y);
    for (let i = 0; i < 3; i++) {
      const t = (this.time * 0.8 + i / 3) % 1;
      const x = s.x + 10 + t * 14;
      const y = s.y - 64 - t * 26;
      const z = 4 + i;
      g.moveTo(x - z, y - z).lineTo(x + z, y - z).lineTo(x - z, y + z).lineTo(x + z, y + z).stroke({ width: 2, color: 0xd8e4ff, alpha: 1 - t });
    }
  }

  private face(a: Actor): { x: number; y: number } {
    const d = DIRS[a.facing];
    return screenDir(this.proj, d.x, d.y);
  }

  /** Leo Tuxedo, placeholder edition: black cat, white shirt front, red bow tie. */
  private drawLeo(g: Graphics, a: Actor, hasLoot: boolean, inVent: boolean, lift = 0): void {
    const s = project(this.proj, a.x, a.y, lift);
    const f = this.face(a);
    const front = f.y > -0.2;
    const by = s.y - a.bob;
    const alpha = inVent ? 0.55 : 1;
    if (inVent) g.ellipse(s.x, s.y - 4, 26, 13).stroke({ width: 2, color: COL.duct, alpha: 0.9 });
    else g.ellipse(s.x, s.y, 18, 8).fill({ color: 0x000000, alpha: 0.35 });
    g.moveTo(s.x - f.x * 10, by - 14).bezierCurveTo(s.x - f.x * 30, by - 20, s.x - f.x * 26, by - 46, s.x - f.x * 16, by - 50).stroke({ width: 5, color: 0x16161c, cap: 'round', alpha });
    g.ellipse(s.x, by - 22, 14, 19).fill({ color: 0x1b1b22, alpha }).stroke({ width: 2, color: 0x000000, alpha });
    if (front) {
      g.poly([s.x + f.x * 6 - 6, by - 36, s.x + f.x * 6 + 6, by - 36, s.x + f.x * 6, by - 14]).fill({ color: 0xf5f5f5, alpha });
      g.poly([s.x + f.x * 6 - 7, by - 38, s.x + f.x * 6, by - 35, s.x + f.x * 6 - 7, by - 32]).fill({ color: 0xd8262f, alpha });
      g.poly([s.x + f.x * 6 + 7, by - 38, s.x + f.x * 6, by - 35, s.x + f.x * 6 + 7, by - 32]).fill({ color: 0xd8262f, alpha });
    }
    const hx = s.x + f.x * 3;
    const hy = by - 48;
    g.poly([hx - 11, hy - 6, hx - 8, hy - 20, hx - 2, hy - 9]).fill({ color: 0x1b1b22, alpha }).stroke({ width: 2, color: 0x000000, alpha });
    g.poly([hx + 11, hy - 6, hx + 8, hy - 20, hx + 2, hy - 9]).fill({ color: 0x1b1b22, alpha }).stroke({ width: 2, color: 0x000000, alpha });
    g.circle(hx, hy, 12).fill({ color: 0x1b1b22, alpha }).stroke({ width: 2, color: 0x000000, alpha });
    if (front) {
      g.ellipse(hx + f.x * 5, hy + 4, 6, 4).fill({ color: 0xf5f5f5, alpha });
      g.circle(hx + f.x * 6 - 5, hy - 2, 2.4).fill({ color: 0xc6f05a, alpha });
      g.circle(hx + f.x * 6 + 5, hy - 2, 2.4).fill({ color: 0xc6f05a, alpha });
    }
    if (hasLoot) {
      g.circle(s.x - f.x * 12, by - 24, 8).fill({ color: 0x6b4b2a, alpha }).stroke({ width: 2, color: 0x2a1a0c, alpha });
      g.poly([s.x - f.x * 12, by - 31, s.x - f.x * 12 + 4, by - 26, s.x - f.x * 12, by - 22, s.x - f.x * 12 - 4, by - 26]).fill({ color: 0x9fe8ff, alpha });
    }
  }

  /** A rival thief: a cat in their own colours, with a name tag, and the prize if they've got it. */
  private drawRival(g: Graphics, a: Actor, id: RivalId, prize: boolean): void {
    const look = RIVAL_LOOKS[id];
    const s = project(this.proj, a.x, a.y);
    const f = this.face(a);
    const front = f.y > -0.2;
    const by = s.y - a.bob;
    g.ellipse(s.x, s.y, 17, 8).fill({ color: 0x000000, alpha: 0.35 });
    g.moveTo(s.x - f.x * 10, by - 14).bezierCurveTo(s.x - f.x * 30, by - 20, s.x - f.x * 26, by - 46, s.x - f.x * 16, by - 50).stroke({ width: 5, color: look.fur, cap: 'round' });
    g.ellipse(s.x, by - 22, 13, 18).fill({ color: look.fur }).stroke({ width: 2, color: 0x000000 });
    if (look.patch) g.ellipse(s.x + 4, by - 26, 6, 8).fill({ color: look.patch });
    const hx = s.x + f.x * 3;
    const hy = by - 46;
    g.poly([hx - 11, hy - 6, hx - 8, hy - 19, hx - 2, hy - 9]).fill({ color: look.fur }).stroke({ width: 2, color: 0x000000 });
    g.poly([hx + 11, hy - 6, hx + 8, hy - 19, hx + 2, hy - 9]).fill({ color: look.fur }).stroke({ width: 2, color: 0x000000 });
    g.circle(hx, hy, 11).fill({ color: look.fur }).stroke({ width: 2, color: 0x000000 });
    if (front) {
      g.circle(hx + f.x * 6 - 5, hy - 2, 2.2).fill({ color: look.eyes });
      g.circle(hx + f.x * 6 + 5, hy - 2, 2.2).fill({ color: look.eyes });
      if (id === 'paws') g.circle(hx + f.x * 6 - 5, hy - 2, 4.5).stroke({ width: 1.5, color: 0xd9b36c }).circle(hx + f.x * 6 + 5, hy - 2, 4.5).stroke({ width: 1.5, color: 0xd9b36c });
      g.rect(hx - 9, hy + 4, 18, 4).fill({ color: look.mask });
    }
    if (prize) g.circle(s.x - f.x * 12, by - 24, 8).fill({ color: 0x3a2a4a }).stroke({ width: 2, color: COL.rival });
    // Name tag.
    const name = RIVALS[id].name;
    g.roundRect(hx - name.length * 2.6, hy - 36, name.length * 5.2, 12, 4).fill({ color: COL.rival, alpha: 0.85 });
  }

  /** A guard (drawn as a bulldog): stocky, tan, peaked cap, torch. Shows ? when suspicious, ! when searching. */
  private drawGuard(g: Graphics, a: Actor, guard: Guard, grinning: boolean): void {
    const s = project(this.proj, a.x, a.y);
    const f = this.face(a);
    const front = f.y > -0.2;
    const by = s.y - a.bob;
    g.ellipse(s.x, s.y, 22, 10).fill({ color: 0x000000, alpha: 0.35 });
    g.ellipse(s.x, by - 22, 19, 20).fill({ color: 0x2b3a67 }).stroke({ width: 2, color: 0x121a33 });
    g.moveTo(s.x + f.x * 14, by - 26).lineTo(s.x + f.x * 30, by - 26 + f.y * 14).stroke({ width: 5, color: 0x333333, cap: 'round' });
    g.circle(s.x + f.x * 31, by - 26 + f.y * 14, 4).fill({ color: 0xfff3b0 });
    const hx = s.x + f.x * 4;
    const hy = by - 46;
    g.ellipse(hx, hy, 17, 14).fill({ color: 0xc89b6a }).stroke({ width: 2, color: 0x6b4b2a });
    if (front) {
      g.ellipse(hx + f.x * 6, hy + 6, 11, 6).fill({ color: 0xe4c49b });
      g.circle(hx + f.x * 7 - 6, hy - 2, 2.5).fill({ color: 0x1a1a1a });
      g.circle(hx + f.x * 7 + 6, hy - 2, 2.5).fill({ color: 0x1a1a1a });
      g.ellipse(hx + f.x * 8, hy + 3, 4, 3).fill({ color: 0x2a1a12 });
      if (grinning) g.moveTo(hx + f.x * 6 - 7, hy + 8).quadraticCurveTo(hx + f.x * 6, hy + 14, hx + f.x * 6 + 7, hy + 8).stroke({ width: 2, color: 0x2a1a12 });
    }
    g.ellipse(hx - 15, hy + 1, 5, 7).fill({ color: 0x9c7046 });
    g.ellipse(hx + 15, hy + 1, 5, 7).fill({ color: 0x9c7046 });
    const captain = guard.kind === 'captain';
    g.ellipse(hx, hy - 12, 15, 5).fill({ color: captain ? 0x15203f : 0x1e2b52 });
    g.rect(hx - 10, hy - 22, 20, 10).fill({ color: captain ? 0x1a2650 : 0x24335f });
    g.circle(hx, hy - 17, 2.5).fill({ color: 0xf2c46b });
    if (captain) {
      // Gold braid on the cap and epaulettes.
      g.rect(hx - 10, hy - 14, 20, 3).fill({ color: 0xf2c46b });
      g.rect(s.x - 20, by - 36, 9, 4).fill({ color: 0xf2c46b });
      g.rect(s.x + 11, by - 36, 9, 4).fill({ color: 0xf2c46b });
    }
    if (guard.kind === 'sniffer' && front) {
      // A big wet nose, and the air it's sampling.
      g.ellipse(hx + f.x * 10, hy + 4, 6, 4.5).fill({ color: 0x111111 });
      const t = (this.time * 1.5) % 1;
      for (const side of [-1, 1]) g.moveTo(hx + f.x * 10 + side * (8 + t * 8), hy - 2).quadraticCurveTo(hx + f.x * 10 + side * (12 + t * 8), hy + 4, hx + f.x * 10 + side * (8 + t * 8), hy + 10).stroke({ width: 1.5, color: 0xd8e4ff, alpha: 1 - t });
    }
    if (guard.asleep) {
      // Eyes shut and snoring.
      if (front) for (const side of [-6, 6]) g.moveTo(hx + f.x * 7 + side - 3, hy - 2).lineTo(hx + f.x * 7 + side + 3, hy - 2).stroke({ width: 2, color: 0x1a1a1a });
      this.zzz(g, a);
      return;
    }
    const mark = grinning || guard.mode === 'searching' ? '!' : guard.mode === 'suspicious' ? '?' : '';
    if (!mark) return;
    const col = mark === '!' ? 0xff3b30 : 0xffd23f;
    const top = hy - 52 + Math.sin(this.time * 6) * 2;
    g.roundRect(hx - 10, top, 20, 26, 5).fill({ color: col }).stroke({ width: 2, color: 0xffffff });
    if (mark === '!') {
      g.rect(hx - 2, top + 4, 4, 12).fill({ color: 0xffffff });
      g.rect(hx - 2, top + 19, 4, 4).fill({ color: 0xffffff });
    } else {
      g.arc(hx, top + 9, 5, Math.PI, Math.PI * 2.25).stroke({ width: 3, color: 0x1a1205 });
      g.moveTo(hx + 1, top + 13).lineTo(hx, top + 17).stroke({ width: 3, color: 0x1a1205 });
      g.rect(hx - 1.5, top + 19, 3, 3).fill({ color: 0x1a1205 });
    }
  }
}
