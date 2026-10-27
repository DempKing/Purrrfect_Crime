// Prototype M0: one grey-box level, a rotating isometric camera, action points, one bulldog.
import { Application, Container } from 'pixi.js';
// Lets PixiJS run on pages with a strict security policy (no eval), such as claude.ai artifacts.
import 'pixi.js/unsafe-eval';
import { parseLevel, type Point } from './core/level';
import {
  apCost,
  canSteal,
  endTurn,
  faceToward,
  guardSees,
  key,
  leoReach,
  moveLeo,
  newHeist,
  pathTo,
  planGuard,
  steal,
  visibleTiles,
  MOVE_PER_AP,
  type GuardStep,
  type State,
} from './core/game';
import { PROTOTYPE } from './levels/prototype';
import { HeistView, type Actor, type Overlay } from './render/view';
import { project, unproject } from './render/iso';

const level = parseLevel(PROTOTYPE);
let state: State = newHeist(level);

const $ = (id: string) => document.getElementById(id)!;

// --- display state: where things are drawn, which lags the rules while animating -----------------

const leo: Actor = { x: level.start.x + 0.5, y: level.start.y + 0.5, facing: 0, bob: 0 };
let guards: Actor[] = [];
function syncActors(): void {
  leo.x = state.leo.x + 0.5;
  leo.y = state.leo.y + 0.5;
  guards = state.guards.map((g) => ({ x: g.x + 0.5, y: g.y + 0.5, facing: g.facing, bob: 0 }));
}
syncActors();

interface Segment {
  who: 'leo' | number;
  from: Point;
  to: Point;
  facing: number;
  t: number;
  dur: number;
}
let queue: Segment[] = [];
let busy = false;
let afterAnim: (() => void) | null = null;

function play(segments: Segment[], then: () => void): void {
  queue = segments;
  busy = segments.length > 0;
  afterAnim = then;
  if (!busy) then();
}

// --- camera -----------------------------------------------------------------------------------

let targetAngle = 0;
const view = new HeistView();
view.proj.cx = level.w / 2;
view.proj.cy = level.h / 2;

function turnCamera(dir: 1 | -1): void {
  targetAngle += (dir * Math.PI) / 2;
}

// --- input and preview ------------------------------------------------------------------------

let hover: Point | null = null;
let selected: Point | null = null; // touch: first tap previews, second tap confirms
let version = 0;
let cache: { v: number; reach: ReturnType<typeof leoReach>; vision: Set<string>; footprints: Point[] } | null = null;

function computed() {
  if (!cache || cache.v !== version) {
    const vision = new Set<string>();
    for (const g of state.guards) for (const k of visibleTiles(level, g)) vision.add(k);
    const footprints = state.guards.flatMap((g) => planGuard(level, g, new Set([key(state.leo.x, state.leo.y)])).map((s) => ({ x: s.x, y: s.y })));
    cache = { v: version, reach: leoReach(level, state), vision, footprints };
  }
  return cache;
}

function overlay(): Overlay {
  const c = computed();
  const reach1 = new Set<string>();
  const reach2 = new Set<string>();
  if (state.status === 'playing' && !busy)
    for (const [k, cost] of c.reach.cost) {
      if (cost === 0) continue;
      const ap = apCost(cost);
      if (ap > state.ap) continue;
      (ap === 1 ? reach1 : reach2).add(k);
    }
  const target = selected ?? hover;
  let path: Point[] = [];
  const pathDanger = new Set<string>();
  if (target && state.status === 'playing' && !busy) {
    path = pathTo(c.reach, target) ?? [];
    if (path.length && apCost(c.reach.cost.get(key(target.x, target.y)) ?? 99) > state.ap) path = [];
    for (const p of path.slice(1)) if (state.guards.some((g) => guardSees(level, g, p.x, p.y))) pathDanger.add(key(p.x, p.y));
  }
  return { reach1, reach2, vision: c.vision, footprints: state.status === 'playing' ? c.footprints : [], path, pathDanger, hover: target && (path.length || isPlinth(target)) ? target : null };
}

const isPlinth = (p: Point) => p.x === level.plinth.x && p.y === level.plinth.y;

function tileUnder(clientX: number, clientY: number): Point | null {
  const local = world.toLocal({ x: clientX, y: clientY });
  const g = unproject(view.proj, local.x, local.y);
  const x = Math.floor(g.x);
  const y = Math.floor(g.y);
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return null;
  return { x, y };
}

function act(tile: Point): void {
  if (busy || state.status !== 'playing') return;
  if (isPlinth(tile)) {
    trySteal();
    return;
  }
  const res = moveLeo(level, state, tile);
  if (!res.ok) {
    say(res.reason ?? '');
    return;
  }
  selected = null;
  version++;
  const segs: Segment[] = [];
  for (let i = 1; i < res.path.length; i++) {
    const a = res.path[i - 1];
    const b = res.path[i];
    segs.push({ who: 'leo', from: a, to: b, facing: faceToward(a, b), t: 0, dur: a.x !== b.x && a.y !== b.y ? 0.17 : 0.12 });
  }
  play(segs, afterLeoMoves);
}

function trySteal(): void {
  if (busy || state.status !== 'playing') return;
  if (state.hasLoot) return say('The Moonstone is already in Leo’s bag.');
  if (!canSteal(level, state)) return say(state.ap < 1 ? 'Leo needs an action point to steal it.' : 'Get right next to the plinth first.');
  steal(level, state);
  leo.facing = faceToward(state.leo, level.plinth);
  version++;
  say('Got it! The Moonstone is in the bag. Now get to the exit.');
  afterLeoMoves();
}

function afterLeoMoves(): void {
  updateHud();
  if (state.status === 'caught') return caught();
  if (state.status === 'escaped') return escaped();
  if (state.ap <= 0) setTimeout(() => !busy && state.status === 'playing' && doEndTurn(), 350);
}

function doEndTurn(): void {
  if (busy || state.status !== 'playing') return;
  selected = null;
  banner('Bulldogs’ turn');
  const before = state.guards.map((g) => ({ x: g.x, y: g.y }));
  const steps: GuardStep[] = endTurn(level, state);
  version++;
  const last = before.map((p) => ({ ...p }));
  const segs: Segment[] = steps.map((s) => {
    const from = last[s.guard];
    last[s.guard] = { x: s.to.x, y: s.to.y };
    return { who: s.guard, from, to: { x: s.to.x, y: s.to.y }, facing: s.to.facing, t: 0, dur: 0.24 };
  });
  play(segs, () => {
    syncActors();
    updateHud();
    if (state.status === 'caught') return caught();
    banner('Your turn');
  });
}

function restart(): void {
  state = newHeist(level);
  queue = [];
  busy = false;
  selected = null;
  version++;
  syncActors();
  hide('caught');
  hide('escaped');
  updateHud();
  banner('Your turn');
  say('Find a way to the Moonstone without stepping into the red.');
}

// --- HUD --------------------------------------------------------------------------------------

function say(text: string): void {
  $('message').textContent = text;
}

let bannerTimer = 0;
function banner(text: string): void {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => b.classList.remove('show'), 1100);
}

function show(id: string): void {
  $(id).classList.remove('hidden');
}
function hide(id: string): void {
  $(id).classList.add('hidden');
}

function updateHud(): void {
  $('turn').textContent = String(state.turn);
  $('ap').innerHTML = [0, 1].map((i) => `<span class="pip ${i < state.ap ? 'on' : ''}"></span>`).join('');
  $('loot').textContent = state.hasLoot ? 'Moonstone: in the bag' : 'Moonstone: on its plinth';
  ($('steal') as HTMLButtonElement).disabled = !canSteal(level, state) || busy;
  ($('end') as HTMLButtonElement).disabled = busy || state.status !== 'playing';
}

function caught(): void {
  $('caught-who').textContent = state.caughtBy ?? 'A bulldog';
  setTimeout(() => show('caught'), 500);
}

function escaped(): void {
  $('escaped-turns').textContent = String(state.turn);
  setTimeout(() => show('escaped'), 300);
}

// --- boot -------------------------------------------------------------------------------------

const app = new Application();
const world = new Container();

async function boot(): Promise<void> {
  await app.init({ resizeTo: window, background: 0x0d1020, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
  $('stage').appendChild(app.canvas);
  world.addChild(view.root);
  app.stage.addChild(world);

  app.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    hover = tileUnder(e.clientX, e.clientY);
  });
  app.canvas.addEventListener('pointerleave', () => (hover = null));
  app.canvas.addEventListener('pointerdown', (e) => {
    const t = tileUnder(e.clientX, e.clientY);
    if (!t) return;
    if (e.pointerType === 'touch' && !isPlinth(t) && (!selected || selected.x !== t.x || selected.y !== t.y)) {
      selected = t;
      say('Tap the same tile again to move there.');
      return;
    }
    act(t);
  });

  $('rotate-left').addEventListener('click', () => turnCamera(1));
  $('rotate-right').addEventListener('click', () => turnCamera(-1));
  $('end').addEventListener('click', doEndTurn);
  $('steal').addEventListener('click', trySteal);
  $('restart').addEventListener('click', restart);
  $('again').addEventListener('click', restart);
  $('again2').addEventListener('click', restart);
  $('start').addEventListener('click', () => {
    hide('intro');
    banner('Your turn');
  });
  $('help-toggle').addEventListener('click', () => $('help').classList.toggle('hidden'));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'q' || e.key === 'Q') turnCamera(1);
    else if (e.key === 'e' || e.key === 'E') turnCamera(-1);
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!$('intro').classList.contains('hidden')) $('start').click();
      else if (state.status === 'playing') doEndTurn();
      else restart();
    } else if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 'f' || e.key === 'F') trySteal();
    else if (e.key === 'Escape') selected = null;
  });

  // Test hook: lets the browser tests find tiles on screen and read the state.
  (window as unknown as { __pc: unknown }).__pc = {
    get state() {
      return state;
    },
    get busy() {
      return busy;
    },
    screenOf: (x: number, y: number) => world.toGlobal(project(view.proj, x + 0.5, y + 0.5)),
    /** A tile Leo can reach this turn that a guard can see: walking there gets him caught. */
    dangerTile: () => {
      for (const [k, cost] of leoReach(level, state).cost) {
        const [x, y] = k.split(',').map(Number);
        if (cost > 0 && apCost(cost) <= state.ap && state.guards.some((g) => guardSees(level, g, x, y))) return { x, y };
      }
      return null;
    },
  };

  updateHud();
  say(`Each action point moves Leo up to ${MOVE_PER_AP} tiles (blue). Spend both to dash further (yellow).`);

  let t = 0;
  app.ticker.add((tk) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    t += dt;
    // Camera turn.
    view.proj.angle += (targetAngle - view.proj.angle) * (1 - Math.exp(-dt * 10));
    // Animation queue.
    if (queue.length) {
      const seg = queue[0];
      seg.t += dt / seg.dur;
      const k = Math.min(1, seg.t);
      const a = seg.who === 'leo' ? leo : guards[seg.who];
      a.x = seg.from.x + 0.5 + (seg.to.x - seg.from.x) * k;
      a.y = seg.from.y + 0.5 + (seg.to.y - seg.from.y) * k;
      a.facing = seg.facing;
      a.bob = Math.abs(Math.sin(k * Math.PI)) * 4;
      if (seg.t >= 1) {
        a.bob = 0;
        queue.shift();
        if (!queue.length) {
          busy = false;
          const done = afterAnim;
          afterAnim = null;
          done?.();
        }
      }
    } else {
      leo.bob = Math.sin(t * 3) * 0.8 + 0.8;
    }
    fit();
    view.draw(level, overlay(), leo, guards, state.hasLoot, state.status === 'caught');
  });
}

/** Keeps the whole map on screen, between the HUD bars, whatever the camera angle. */
function fit(): void {
  const w = app.screen.width;
  const h = app.screen.height;
  const top = 96;
  const bottom = 70;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of [[0, 0], [level.w, 0], [level.w, level.h], [0, level.h]]) {
    for (const z of [0, 90]) {
      const s = project(view.proj, x, y, z);
      x0 = Math.min(x0, s.x);
      x1 = Math.max(x1, s.x);
      y0 = Math.min(y0, s.y);
      y1 = Math.max(y1, s.y);
    }
  }
  const scale = Math.min((w - 32) / (x1 - x0), (h - top - bottom) / (y1 - y0), 1.5);
  world.scale.set(scale);
  world.position.set(w / 2 - ((x0 + x1) / 2) * scale, top + (h - top - bottom) / 2 - ((y0 + y1) / 2) * scale);
}

void boot();
