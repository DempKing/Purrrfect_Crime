// Draws a heist: floors and overlays first, then walls, furniture and characters sorted by depth.
// Everything is grey-box shapes for now; generated sprites replace the character and prop drawing later.
import { Container, Graphics } from 'pixi.js';
import { DIRS, key } from '../core/game';
import type { Level, Point } from '../core/level';
import { project, screenDir, type Projector } from './iso';

const WALL_H = 84;
const STUB_H = 12;

const COL = {
  bg: 0x0d1020,
  floorA: 0x3a4157,
  floorB: 0x343a4f,
  floorLine: 0x4a5270,
  exit: 0x2f7d5b,
  wallTop: 0x8e95ad,
  wallA: 0x5b6280,
  wallB: 0x474d68,
  pillar: 0xb7b2a4,
  caseGlass: 0x9fd7ff,
  caseBase: 0x5a4a3a,
  plinth: 0xd8d2c0,
  gem: 0x9fe8ff,
  reach1: 0x4aa3ff,
  reach2: 0xffc54a,
  vision: 0xff5a4a,
  path: 0xffffff,
  danger: 0xff3b30,
  step: 0xffb199,
};

export interface Overlay {
  reach1: Set<string>;
  reach2: Set<string>;
  vision: Set<string>;
  footprints: Point[];
  path: Point[];
  pathDanger: Set<string>;
  hover: Point | null;
}

export interface Actor {
  x: number; // continuous grid position (tile x + 0.5 is the centre)
  y: number;
  facing: number;
  bob: number;
}

interface Drawable {
  depth: number;
  draw: (g: Graphics) => void;
}

export class HeistView {
  root = new Container();
  private floor = new Graphics();
  private objects = new Graphics();
  proj: Projector = { angle: 0, cx: 0, cy: 0 };

  constructor() {
    this.root.addChild(this.floor, this.objects);
  }

  draw(level: Level, ov: Overlay, leo: Actor, guards: Actor[], hasLoot: boolean, alert: boolean): void {
    const p = this.proj;
    const f = this.floor;
    const o = this.objects;
    f.clear();
    o.clear();

    // Floors, with the overlays painted on top of them.
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = level.tiles[y][x];
        if (t === 'wall' || t === 'pillar') continue;
        const k = key(x, y);
        const base = t === 'exit' ? COL.exit : (x + y) % 2 ? COL.floorA : COL.floorB;
        this.diamond(f, x, y, 0.5, base, 1, COL.floorLine);
        if (ov.vision.has(k)) this.diamond(f, x, y, 0.47, COL.vision, 0.32);
        if (ov.reach1.has(k)) this.diamond(f, x, y, 0.4, COL.reach1, 0.28);
        else if (ov.reach2.has(k)) this.diamond(f, x, y, 0.4, COL.reach2, 0.24);
      }
    for (const fp of ov.footprints) {
      const s = project(p, fp.x + 0.5, fp.y + 0.5);
      f.circle(s.x, s.y, 4).fill({ color: COL.step, alpha: 0.75 });
    }
    if (ov.path.length > 1) {
      for (let i = 1; i < ov.path.length; i++) {
        const a = project(p, ov.path[i - 1].x + 0.5, ov.path[i - 1].y + 0.5);
        const b = project(p, ov.path[i].x + 0.5, ov.path[i].y + 0.5);
        const danger = ov.pathDanger.has(key(ov.path[i].x, ov.path[i].y));
        f.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width: 4, color: danger ? COL.danger : COL.path, alpha: 0.9 });
      }
    }
    if (ov.hover) this.diamondOutline(f, ov.hover.x, ov.hover.y, ov.pathDanger.size ? COL.danger : COL.path);

    // Everything standing up, nearest last.
    const items: Drawable[] = [];
    const leoDepth = project(p, leo.x, leo.y).depth;
    for (let y = 0; y < level.h; y++)
      for (let x = 0; x < level.w; x++) {
        const t = level.tiles[y][x];
        const d = project(p, x + 0.5, y + 0.5).depth;
        if (t === 'wall' || t === 'pillar') {
          // Walls between the camera and Leo drop to stubs so he's never hidden.
          const near = (Math.hypot(x + 0.5 - leo.x, y + 0.5 - leo.y) < 3.6 && d > leoDepth + 0.2) || this.nearOuterWall(level, x, y);
          const h = near ? STUB_H : t === 'pillar' ? WALL_H - 6 : WALL_H;
          if (t === 'wall') items.push({ depth: d, draw: (g) => this.prism(g, x, y, x + 1, y + 1, h, COL.wallTop, COL.wallA, COL.wallB, near ? 0.75 : 1) });
          else items.push({ depth: d, draw: (g) => this.prism(g, x + 0.22, y + 0.22, x + 0.78, y + 0.78, h, 0xe6e0d0, COL.pillar, 0x948f82, near ? 0.75 : 1) });
        } else if (t === 'case') {
          items.push({
            depth: d,
            draw: (g) => {
              this.prism(g, x + 0.12, y + 0.12, x + 0.88, y + 0.88, 22, 0x6b5946, COL.caseBase, 0x47392b, 1);
              const s = project(p, x + 0.5, y + 0.5, 34);
              g.circle(s.x, s.y, 5).fill({ color: 0xf2c46b });
              this.prism(g, x + 0.16, y + 0.16, x + 0.84, y + 0.84, 52, COL.caseGlass, COL.caseGlass, COL.caseGlass, 0.22, 22);
            },
          });
        } else if (t === 'plinth') {
          items.push({
            depth: d,
            draw: (g) => {
              this.prism(g, x + 0.18, y + 0.18, x + 0.82, y + 0.82, 34, 0xf3eee0, COL.plinth, 0xa9a392, 1);
              if (!hasLoot) {
                const s = project(p, x + 0.5, y + 0.5, 48);
                g.circle(s.x, s.y, 18).fill({ color: COL.gem, alpha: 0.18 });
                g.poly([s.x, s.y - 12, s.x + 8, s.y, s.x, s.y + 8, s.x - 8, s.y]).fill({ color: COL.gem }).stroke({ width: 1.5, color: 0xffffff });
              }
            },
          });
        } else if (t === 'exit') {
          items.push({
            depth: d - 0.4,
            draw: (g) => {
              const s = project(p, x + 0.5, y + 0.5, 70);
              g.roundRect(s.x - 22, s.y - 10, 44, 20, 4).fill({ color: 0x1f6b49 }).stroke({ width: 2, color: 0x9ff0c8 });
              g.moveTo(s.x - 10, s.y).lineTo(s.x + 8, s.y).moveTo(s.x + 2, s.y - 6).lineTo(s.x + 9, s.y).lineTo(s.x + 2, s.y + 6).stroke({ width: 3, color: 0xffffff });
            },
          });
        }
      }
    items.push({ depth: leoDepth + 0.05, draw: (g) => this.drawLeo(g, leo, hasLoot) });
    guards.forEach((a) => items.push({ depth: project(p, a.x, a.y).depth + 0.05, draw: (g) => this.drawBulldog(g, a, alert) }));
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw(o);
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

  private diamondOutline(g: Graphics, x: number, y: number, color: number): void {
    const c = this.corners(x + 0.04, y + 0.04, x + 0.96, y + 0.96, 0);
    g.poly(c.flatMap((q) => [q.x, q.y])).stroke({ width: 3, color, alpha: 0.95 });
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

  private face(a: Actor): { x: number; y: number } {
    const d = DIRS[a.facing];
    return screenDir(this.proj, d.x, d.y);
  }

  /** Leo Tuxedo, grey-box edition: black cat, white shirt front, red bow tie. */
  private drawLeo(g: Graphics, a: Actor, hasLoot: boolean): void {
    const s = project(this.proj, a.x, a.y);
    const f = this.face(a);
    const front = f.y > -0.2; // facing toward the camera
    const by = s.y - a.bob;
    g.ellipse(s.x, s.y, 18, 8).fill({ color: 0x000000, alpha: 0.35 });
    // Tail curls out behind him.
    g.moveTo(s.x - f.x * 10, by - 14).bezierCurveTo(s.x - f.x * 30, by - 20, s.x - f.x * 26, by - 46, s.x - f.x * 16, by - 50).stroke({ width: 5, color: 0x16161c, cap: 'round' });
    g.ellipse(s.x, by - 22, 14, 19).fill({ color: 0x1b1b22 }).stroke({ width: 2, color: 0x000000 });
    if (front) {
      g.poly([s.x + f.x * 6 - 6, by - 36, s.x + f.x * 6 + 6, by - 36, s.x + f.x * 6, by - 14]).fill({ color: 0xf5f5f5 });
      g.poly([s.x + f.x * 6 - 7, by - 38, s.x + f.x * 6, by - 35, s.x + f.x * 6 - 7, by - 32]).fill({ color: 0xd8262f });
      g.poly([s.x + f.x * 6 + 7, by - 38, s.x + f.x * 6, by - 35, s.x + f.x * 6 + 7, by - 32]).fill({ color: 0xd8262f });
    }
    const hx = s.x + f.x * 3;
    const hy = by - 48;
    g.poly([hx - 11, hy - 6, hx - 8, hy - 20, hx - 2, hy - 9]).fill({ color: 0x1b1b22 }).stroke({ width: 2, color: 0x000000 });
    g.poly([hx + 11, hy - 6, hx + 8, hy - 20, hx + 2, hy - 9]).fill({ color: 0x1b1b22 }).stroke({ width: 2, color: 0x000000 });
    g.circle(hx, hy, 12).fill({ color: 0x1b1b22 }).stroke({ width: 2, color: 0x000000 });
    if (front) {
      g.ellipse(hx + f.x * 5, hy + 4, 6, 4).fill({ color: 0xf5f5f5 });
      g.circle(hx + f.x * 6 - 5, hy - 2, 2.4).fill({ color: 0xc6f05a });
      g.circle(hx + f.x * 6 + 5, hy - 2, 2.4).fill({ color: 0xc6f05a });
    }
    if (hasLoot) {
      g.circle(s.x - f.x * 12, by - 24, 8).fill({ color: 0x6b4b2a }).stroke({ width: 2, color: 0x2a1a0c });
      g.poly([s.x - f.x * 12, by - 31, s.x - f.x * 12 + 4, by - 26, s.x - f.x * 12, by - 22, s.x - f.x * 12 - 4, by - 26]).fill({ color: COL.gem });
    }
  }

  /** A night-watch bulldog: stocky, tan, peaked cap, torch. */
  private drawBulldog(g: Graphics, a: Actor, alert: boolean): void {
    const s = project(this.proj, a.x, a.y);
    const f = this.face(a);
    const front = f.y > -0.2;
    const by = s.y - a.bob;
    g.ellipse(s.x, s.y, 22, 10).fill({ color: 0x000000, alpha: 0.35 });
    g.ellipse(s.x, by - 22, 19, 20).fill({ color: 0x2b3a67 }).stroke({ width: 2, color: 0x121a33 });
    // Torch beam stub, pointing the way he looks.
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
    }
    g.ellipse(hx - 15, hy + 1, 5, 7).fill({ color: 0x9c7046 });
    g.ellipse(hx + 15, hy + 1, 5, 7).fill({ color: 0x9c7046 });
    g.ellipse(hx, hy - 12, 15, 5).fill({ color: 0x1e2b52 });
    g.rect(hx - 10, hy - 22, 20, 10).fill({ color: 0x24335f });
    g.circle(hx, hy - 17, 2.5).fill({ color: 0xf2c46b });
    if (alert) {
      g.roundRect(hx - 9, hy - 56, 18, 26, 4).fill({ color: 0xff3b30 }).stroke({ width: 2, color: 0xffffff });
      g.rect(hx - 2, hy - 52, 4, 13).fill({ color: 0xffffff });
      g.rect(hx - 2, hy - 36, 4, 4).fill({ color: 0xffffff });
    }
  }
}
