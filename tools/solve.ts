// Finds a winning route through a level: best-first search over Leo's choices, simulating the guards
// exactly. Used while designing levels; with --write the route is saved to src/levels/solutions.ts, where the
// tests replay it. Usage: npm run solve -- <level id> [--clean] [--write] [--loot] [--max N] [--debug]
import { parseLevel, type Level, type Point } from '../src/core/level';
import { BASE_PERKS, actionsHere, doAction, endTurn, leoReach, moveAp, newHeist, pathTo, walkPath, type ActionKind, type Perks, type State } from '../src/core/game';
import type { RouteStep } from '../src/levels/routes';
import { ALL_LEVELS } from '../src/levels';
import { readFileSync, writeFileSync } from 'node:fs';

const SOLUTIONS_FILE = 'src/levels/solutions.ts';

/** Saves a route into the generated solutions file, keeping the others. */
function writeSolution(levelId: string, plan: RouteStep[][]): void {
  const text = readFileSync(SOLUTIONS_FILE, 'utf8');
  const a = text.indexOf('/* BEGIN */') + '/* BEGIN */'.length;
  const b = text.indexOf('/* END */');
  const all = JSON.parse(text.slice(a, b)) as Record<string, RouteStep[][]>;
  all[levelId] = plan;
  // One turn per line, so the routes read like the ones in routes.ts.
  const body = '{\n' + Object.entries(all).map(([id, plan]) => `  ${JSON.stringify(id)}: [\n` + plan.map((t) => `    ${JSON.stringify(t)}`).join(',\n') + '\n  ]').join(',\n') + '\n}';
  writeFileSync(SOLUTIONS_FILE, text.slice(0, a) + ' ' + body + ' ' + text.slice(b));
}

interface Node {
  s: State;
  parent: Node | null;
  step: RouteStep | null; // null: the turn ended
  f: number;
}

function planOf(n: Node): RouteStep[][] {
  const steps: (RouteStep | null)[] = [];
  for (let c: Node | null = n; c && c.parent; c = c.parent) steps.unshift(c.step);
  const plan: RouteStep[][] = [[]];
  for (const st of steps) {
    if (st === null) plan.push([]);
    else plan[plan.length - 1].push(st);
  }
  return plan;
}

/** A min-heap on f. */
class Heap {
  private a: Node[] = [];
  get size() {
    return this.a.length;
  }
  push(n: Node): void {
    const a = this.a;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Node {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/** Steps from every tile to the nearest goal tile, through anything Leo could ever walk, crawl or open. */
function distanceMap(level: Level, goals: Point[]): number[][] {
  const d = level.tiles.map((r) => r.map(() => Infinity));
  const q: Point[] = [];
  for (const g of goals) {
    d[g.y][g.x] = 0;
    q.push(g);
  }
  const passable = (x: number, y: number) => {
    const t = level.tiles[y]?.[x];
    return t !== undefined && (!['wall', 'pillar', 'case', 'plinth', 'lamp', 'panel', 'fuse', 'safe', 'seat'].includes(t) || level.ducts[y][x] || level.rafters[y][x]);
  };
  while (q.length) {
    const p = q.shift()!;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = p.x + dx;
        const y = p.y + dy;
        if (!passable(x, y) || d[y][x] <= d[p.y][p.x] + 1) continue;
        d[y][x] = d[p.y][p.x] + 1;
        q.push({ x, y });
      }
  }
  return d;
}

/** How often the level itself repeats, apart from the guards: spotlights and pulsing lasers. */
function levelPeriod(level: Level): number {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  let p = level.def.pulsingLasers ? 2 : 1;
  for (const sp of level.spotlights) p = (p * sp.path.length) / gcd(p, sp.path.length);
  return p;
}

let period = 1;

function stateKey(s: State): string {
  return JSON.stringify([
    s.leo.x, s.leo.y, s.layer, s.ap, s.turn % period, [...s.inventory].sort(), s.picks, s.openDoors, s.camerasOff, s.lasersOff, s.alarm,
    s.guards.map((g) => [g.x, g.y, g.facing, g.mode, g.target, g.point?.x, g.point?.y, g.look, g.meter, g.asleep]),
    s.cameras.map((c) => c.idx),
  ]);
}

const USEFUL: ActionKind[] = ['pick-door', 'panel', 'fuse', 'enter-vent', 'exit-vent', 'climb-up', 'climb-down', 'drop'];

export function solve(level: Level, opts: { perks?: Perks; loot?: boolean; max?: number; clean?: boolean; weight?: number; turns?: number } = {}): { plan: RouteStep[][]; s: State; expanded: number } | null {
  const centre = level.def.loot.findIndex((l) => level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y);
  if (centre < 0) throw new Error('no centrepiece');
  const c = level.def.loot[centre].at;
  const around = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) around.push({ x: c.x + dx, y: c.y + dy });
  const toCentre = distanceMap(level, around);
  const toExit = distanceMap(level, [level.exit]);
  const centreToExit = Math.min(...around.map((p) => toExit[p.y]?.[p.x] ?? Infinity));
  const h = (s: State) => {
    const has = s.inventory.includes(centre);
    const here = has ? toExit[s.leo.y][s.leo.x] : toCentre[s.leo.y][s.leo.x] + centreToExit;
    return here / 5 + (has ? 0 : 1);
  };
  period = levelPeriod(level);
  const start = newHeist(level, opts.perks ?? BASE_PERKS);
  const open = new Heap();
  const seen = new Set<string>();
  open.push({ s: start, parent: null, step: null, f: h(start) });
  seen.add(stateKey(start));
  let expanded = 0;
  const max = opts.max ?? 60000;
  let best: Node | null = null;
  while (open.size && expanded < max) {
    const n = open.pop();
    expanded++;
    if (!best || h(n.s) < h(best.s)) best = n;
    const push = (s: State, step: RouteStep | null) => {
      if (s.status === 'caught') return;
      if (opts.clean && (s.seen || s.alarmRaised)) return;
      if (s.turn > (opts.turns ?? 60)) return; // no endless waiting
      s.log = [];
      s.noises = [];
      const k = stateKey(s);
      if (seen.has(k)) return;
      seen.add(k);
      const gg = (s.turn - 1) * 2 + (2 - s.ap);
      // Alarms and sightings cost a little, so cleaner routes come first.
      const penalty = (s.alarmRaised ? 3 : 0) + (s.seen ? 2 : 0);
      open.push({ s, parent: n, step, f: gg + (opts.weight ?? 1.6) * h(s) + penalty });
    };
    if (n.s.status === 'escaped') {
      const plan = planOf(n);
      return { plan: plan.filter((t, i) => t.length || i < plan.length - 1), s: n.s, expanded };
    }
    if (n.s.ap > 0) {
      for (const a of actionsHere(level, n.s)) {
        if (a.blocked) continue;
        const loot = level.def.loot.findIndex((l) => l.at.x === a.at.x && l.at.y === a.at.y);
        const isCentre = loot === centre;
        if (!USEFUL.includes(a.kind) && !(isCentre || (opts.loot && loot >= 0))) continue;
        if (a.kind === 'smash-case' && !opts.loot && !isCentre) continue;
        const s = structuredClone(n.s);
        s.log = [];
        if (!doAction(level, s, a.kind, a.at)) continue;
        push(s, { a: a.kind, x: a.at.x, y: a.at.y });
      }
      const reach = leoReach(level, n.s);
      // Every one-point move, but only the dashes that make the most progress.
      const dist = (x: number, y: number) => (n.s.inventory.includes(centre) ? toExit : toCentre)[y][x];
      const ends = [...reach.cost].filter(([, cost]) => cost > 0 && moveAp(n.s, cost) <= n.s.ap).map(([kk, cost]) => {
        const [x, y] = kk.split(',').map(Number);
        return { kk, cost, x, y, ap: moveAp(n.s, cost) };
      });
      const dashes = ends.filter((e) => e.ap === 2).sort((a, b) => dist(a.x, a.y) - dist(b.x, b.y)).slice(0, 12);
      for (const { cost, x, y } of [...ends.filter((e) => e.ap === 1), ...dashes]) {
        const ap = moveAp(n.s, cost);
        const path = pathTo(reach, { x, y })!;
        const s = structuredClone(n.s);
        s.log = [];
        walkPath(level, s, path, ap);
        push(s, [x, y]);
      }
    }
    const s = structuredClone(n.s);
    endTurn(level, s);
    push(s, null);
  }
  if (best && process.argv.includes('--debug')) {
    console.log(`closest: turn ${best.s.turn}, leo ${best.s.leo.x},${best.s.leo.y} ${best.s.layer}, inventory ${best.s.inventory}, h ${h(best.s).toFixed(1)}, open ${open.size}`);
    console.log(formatRoute(planOf(best)));
  }
  return null;
}

export function formatRoute(plan: RouteStep[][]): string {
  return plan.map((t) => `  [${t.map((st) => (Array.isArray(st) ? `[${st[0]}, ${st[1]}]` : `{ a: '${st.a}', x: ${st.x}, y: ${st.y} }`)).join(', ')}],`).join('\n');
}

// --- command line -------------------------------------------------------------------------------------
const args = process.argv.slice(2);
if (args.length) {
  const id = args[0];
  const def = ALL_LEVELS.find((l) => l.id === id || l.id.includes(id));
  if (!def) throw new Error(`no level ${id}: ${ALL_LEVELS.map((l) => l.id).join(', ')}`);
  const max = args.includes('--max') ? Number(args[args.indexOf('--max') + 1]) : undefined;
  const t0 = Date.now();
  const num = (flag: string) => (args.includes(flag) ? Number(args[args.indexOf(flag) + 1]) : undefined);
  const r = solve(parseLevel(def), { loot: args.includes('--loot'), max, clean: args.includes('--clean'), weight: num('--weight'), turns: num('--turns') });
  if (!r) console.log(`${def.id}: NO ROUTE FOUND (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  else {
    console.log(`${def.id}: escaped on turn ${r.s.turn}, seen ${r.s.seen}, alarm ${r.s.alarmRaised}, ${r.expanded} states, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    console.log(formatRoute(r.plan));
    if (args.includes('--write')) writeSolution(def.id, r.plan);
  }
}
