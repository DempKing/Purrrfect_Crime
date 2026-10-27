// Prototype M1: the stealth sandbox. Light and shadow, noise, cameras, lasers, locks, vents and an inventory that fills up.
import { Application, Container } from 'pixi.js';
// Lets PixiJS run on pages with a strict security policy (no eval), such as claude.ai artifacts.
import 'pixi.js/unsafe-eval';
import { parseLevel, type Level, type Point } from './core/level';
import {
  actionsHere,
  apCost,
  inventoryValue,
  inventoryUsed,
  cameraView,
  danger,
  doAction,
  endTurn,
  faceToward,
  guardView,
  key,
  leoReach,
  lightAt,
  moveLeo,
  newHeist,
  pathTo,
  planGuards,
  AP_PER_TURN,
  INVENTORY_SPACES,
  MOVE_PER_AP,
  type Action,
  type GuardStep,
  type State,
} from './core/game';
import { LEVELS } from './levels/prototype';
import { HeistView, type Actor, type Overlay, type Ripple } from './render/view';
import { project, unproject } from './render/iso';

let levelIndex = 0;
let level: Level = parseLevel(LEVELS[0]);
let state: State = newHeist(level);

const $ = (id: string) => document.getElementById(id)!;
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// --- display state: where things are drawn, which lags the rules while animating -----------------

const leo: Actor = { x: 0, y: 0, facing: 0, bob: 0 };
let guards: Actor[] = [];
function syncActors(): void {
  leo.x = state.leo.x + 0.5;
  leo.y = state.leo.y + 0.5;
  guards = state.guards.map((g) => ({ x: g.x + 0.5, y: g.y + 0.5, facing: g.facing, bob: 0 }));
}

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

let ripples: Ripple[] = [];
let noisesSeen = 0;
function spawnRipples(): void {
  for (const n of state.noises.slice(noisesSeen)) ripples.push({ x: n.x, y: n.y, r: n.r, t: 0 });
  noisesSeen = state.noises.length;
}

// --- camera -----------------------------------------------------------------------------------

let targetAngle = 0;
const view = new HeistView();

function turnCamera(dir: 1 | -1): void {
  targetAngle += (dir * Math.PI) / 2;
}

// --- input and preview ------------------------------------------------------------------------

let hover: Point | null = null;
let selected: Point | null = null; // touch: first tap previews, second tap confirms
let version = 0;
let cache: { v: number; reach: ReturnType<typeof leoReach>; vision: Set<string>; cameraVision: Set<string>; footprints: Point[] } | null = null;

function computed() {
  if (!cache || cache.v !== version) {
    const vision = new Set<string>();
    for (const g of state.guards) for (const k of guardView(level, state, g)) vision.add(k);
    const cameraVision = new Set<string>();
    if (!state.camerasOff) for (const c of state.cameras) for (const k of cameraView(level, state, c)) cameraVision.add(k);
    const footprints = planGuards(level, state).flat();
    cache = { v: version, reach: leoReach(level, state), vision, cameraVision, footprints };
  }
  return cache;
}

function overlay(): Overlay {
  const c = computed();
  const reach1 = new Set<string>();
  const reach2 = new Set<string>();
  const live = state.status === 'playing' && !busy;
  if (live)
    for (const [k, cost] of c.reach.cost) {
      if (cost === 0) continue;
      const ap = apCost(cost);
      if (ap > state.ap) continue;
      (ap === 1 ? reach1 : reach2).add(k);
    }
  const target = selected ?? hover;
  let path: Point[] = [];
  const pathDanger = new Map<string, number>();
  if (target && live) {
    path = pathTo(c.reach, target) ?? [];
    if (path.length && apCost(c.reach.cost.get(key(target.x, target.y)) ?? 99) > state.ap) path = [];
    for (const p of path.slice(1)) {
      const d = danger(level, state, p);
      if (d) pathDanger.set(key(p.x, p.y), d);
    }
  }
  const actionable = target && live && clickAction(target);
  return {
    reach1,
    reach2,
    vision: c.vision,
    cameraVision: c.cameraVision,
    footprints: state.status === 'playing' ? c.footprints : [],
    path,
    pathDanger,
    hover: target && (path.length > 1 || actionable) ? target : null,
  };
}

function tileUnder(clientX: number, clientY: number): Point | null {
  const local = world.toLocal({ x: clientX, y: clientY });
  const g = unproject(view.proj, local.x, local.y);
  const x = Math.floor(g.x);
  const y = Math.floor(g.y);
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return null;
  return { x, y };
}

/** What clicking a tile does when it's something to interact with: the quiet option first. */
function clickAction(tile: Point): Action | null {
  const here = actionsHere(level, state).filter((a) => a.at.x === tile.x && a.at.y === tile.y && a.kind !== 'smash-case');
  return here.find((a) => !a.blocked) ?? here[0] ?? null;
}

function act(tile: Point): void {
  if (busy || state.status !== 'playing') return;
  const a = clickAction(tile);
  if (a) return runAction(a);
  state.log = [];
  const res = moveLeo(level, state, tile);
  if (!res.ok) return say(res.reason ?? '');
  selected = null;
  version++;
  const segs: Segment[] = [];
  const crawl = state.layer === 'vent' ? 1.4 : 1;
  for (let i = 1; i < res.path.length; i++) {
    const p = res.path[i - 1];
    const q = res.path[i];
    segs.push({ who: 'leo', from: p, to: q, facing: faceToward(p, q), t: 0, dur: (p.x !== q.x && p.y !== q.y ? 0.17 : 0.12) * crawl });
  }
  play(segs, afterLeoActs);
}

function runAction(a: Action): void {
  if (busy || state.status !== 'playing') return;
  if (a.blocked) return say(a.blocked);
  state.log = [];
  if (!doAction(level, state, a.kind, a.at)) return say('Leo can’t do that right now.');
  selected = null;
  version++;
  afterLeoActs();
  if (a.at.x !== state.leo.x || a.at.y !== state.leo.y) leo.facing = faceToward(state.leo, a.at);
}

function afterLeoActs(): void {
  spawnRipples();
  syncActors();
  updateHud();
  if (state.log.length) say(state.log.join(' '));
  if (state.status === 'caught') return caught();
  if (state.status === 'escaped') return escaped();
  if (state.ap <= 0) setTimeout(() => !busy && state.status === 'playing' && state.ap <= 0 && doEndTurn(), 450);
}

function doEndTurn(): void {
  if (busy || state.status !== 'playing') return;
  selected = null;
  banner('Guards’ turn');
  const before = state.guards.map((g) => ({ x: g.x, y: g.y }));
  const steps: GuardStep[] = endTurn(level, state);
  noisesSeen = 0;
  version++;
  const last = before.map((p) => ({ ...p }));
  const segs: Segment[] = steps.map((s) => {
    const from = last[s.guard];
    last[s.guard] = { x: s.to.x, y: s.to.y };
    return { who: s.guard, from, to: { x: s.to.x, y: s.to.y }, facing: s.to.facing, t: 0, dur: 0.22 };
  });
  busy = segs.length > 0;
  updateHud();
  play(segs, () => {
    syncActors();
    updateHud();
    if (state.log.length) say(state.log.join(' '));
    if (state.status === 'caught') return caught();
    banner(state.alarm !== null ? `Alarm! ${state.alarm} turns` : 'Your turn');
  });
}

function loadLevel(i: number): void {
  levelIndex = i;
  level = parseLevel(LEVELS[i]);
  view.proj.cx = level.w / 2;
  view.proj.cy = level.h / 2;
  $('level-name').textContent = level.def.name;
  restart();
}

function restart(): void {
  state = newHeist(level);
  queue = [];
  busy = false;
  afterAnim = null;
  selected = null;
  ripples = [];
  noisesSeen = 0;
  version++;
  syncActors();
  hide('caught');
  hide('escaped');
  updateHud();
  banner('Your turn');
  say(level.def.objective);
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

const LIGHT_NAMES = ['In shadow', 'Dim light', 'In the light'];

function updateHud(): void {
  $('turn').textContent = String(state.turn);
  $('ap').innerHTML = Array.from({ length: AP_PER_TURN }, (_, i) => `<span class="pip ${i < state.ap ? 'on' : ''}"></span>`).join('');
  $('inventory').innerHTML = `Inventory <b>${inventoryUsed(level, state)}/${INVENTORY_SPACES}</b> · ${money(inventoryValue(level, state))}`;
  const l = state.layer === 'vent' ? -1 : lightAt(level, state.leo.x, state.leo.y);
  const li = $('light');
  li.textContent = l < 0 ? 'In the vents' : LIGHT_NAMES[l];
  li.className = `light l${l < 0 ? 'v' : l}`;
  const al = $('alarm');
  if (state.alarm !== null && state.status === 'playing') {
    al.textContent = `ALARM · lockdown in ${state.alarm} turn${state.alarm === 1 ? '' : 's'}${state.camerasOff ? '' : ' · shut it off at the camera panel'}`;
    show('alarm');
  } else hide('alarm');
  ($('end') as HTMLButtonElement).disabled = busy || state.status !== 'playing';

  const bar = $('actions');
  const acts = busy ? [] : actionsHere(level, state);
  bar.innerHTML = '';
  acts.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = `act${a.noise >= 4 ? ' loud' : ''}`;
    b.dataset.kind = a.kind;
    b.dataset.at = `${a.at.x},${a.at.y}`;
    b.disabled = !!a.blocked;
    b.title = a.blocked ?? `${a.ap} action point${a.ap === 1 ? '' : 's'}${a.noise ? `, noise ${a.noise}` : ', silent'}`;
    b.innerHTML = `<span class="k">${i + 1}</span>${a.label}${a.noise ? ` <span class="noise">${'◉'.repeat(Math.min(3, Math.ceil(a.noise / 2)))}</span>` : ''}`;
    b.addEventListener('click', () => runAction(a));
    bar.appendChild(b);
  });
  bar.classList.toggle('hidden', acts.length === 0);
}

function caught(): void {
  $('caught-who').textContent = state.caughtBy ?? 'A guard';
  $('caught-why').textContent = state.caughtWhy ? `${state.caughtWhy}.` : '';
  setTimeout(() => show('caught'), 600);
}

function escaped(): void {
  $('escaped-turns').textContent = String(state.turn);
  $('escaped-kicker').textContent = state.alarm !== null ? 'Out with the sirens behind him' : 'Clean getaway';
  const items = state.inventory.map((i) => level.def.loot[i]);
  $('haul').innerHTML = items.map((l) => `<li>${l.name} <span>${money(l.value)}</span></li>`).join('') + `<li class="total">Total <span>${money(inventoryValue(level, state))}</span></li>`;
  const left = level.def.loot.filter((_, i) => !state.inventory.includes(i));
  $('left-behind').textContent = left.length ? `Left behind: ${left.map((l) => l.name).join(', ')}.` : 'Leo cleaned the place out.';
  setTimeout(() => show('escaped'), 300);
}

// --- boot -------------------------------------------------------------------------------------

const app = new Application();
const world = new Container();

async function boot(): Promise<void> {
  await app.init({ resizeTo: window, background: 0x0a0c18, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
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
    if (e.pointerType === 'touch' && !clickAction(t) && (!selected || selected.x !== t.x || selected.y !== t.y)) {
      selected = t;
      say('Tap the same tile again to move there.');
      return;
    }
    act(t);
  });

  const levelList = $('level-list');
  LEVELS.forEach((def, i) => {
    const b = document.createElement('button');
    b.className = `level${i === 0 ? ' primary' : ''}`;
    b.id = `level-${i}`;
    b.innerHTML = `<b>${def.name}</b><span>${i === 0 ? 'M1 stealth sandbox: night, cameras, lasers, vents' : 'M0 warm-up: one guard, lights on'}</span>`;
    b.addEventListener('click', () => {
      loadLevel(i);
      hide('intro');
    });
    levelList.appendChild(b);
  });

  $('rotate-left').addEventListener('click', () => turnCamera(1));
  $('rotate-right').addEventListener('click', () => turnCamera(-1));
  $('end').addEventListener('click', doEndTurn);
  $('restart').addEventListener('click', restart);
  $('again').addEventListener('click', restart);
  $('again2').addEventListener('click', restart);
  for (const id of ['levels', 'levels2', 'levels3'])
    $(id).addEventListener('click', () => {
      hide('caught');
      hide('escaped');
      show('intro');
    });
  $('help-toggle').addEventListener('click', () => $('help').classList.toggle('hidden'));
  window.addEventListener('keydown', (e) => {
    if (!$('intro').classList.contains('hidden')) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        ($('level-0') as HTMLButtonElement).click();
      }
      return;
    }
    if (e.key === 'q' || e.key === 'Q') turnCamera(1);
    else if (e.key === 'e' || e.key === 'E') turnCamera(-1);
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state.status === 'playing') doEndTurn();
      else restart();
    } else if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 'Escape') selected = null;
    else if (/^[1-9]$/.test(e.key)) ($('actions').children[Number(e.key) - 1] as HTMLButtonElement | undefined)?.click();
  });

  // Test hook: lets the browser tests find tiles on screen, read the state and pick a level.
  (window as unknown as { __pc: unknown }).__pc = {
    get state() {
      return state;
    },
    get busy() {
      return busy;
    },
    get level() {
      return levelIndex;
    },
    loadLevel,
    screenOf: (x: number, y: number) => world.toGlobal(project(view.proj, x + 0.5, y + 0.5)),
    /** A tile Leo can reach this turn where he'd be caught or set off the alarm. */
    dangerTile: () => {
      for (const [k, cost] of leoReach(level, state).cost) {
        const [x, y] = k.split(',').map(Number);
        if (cost > 0 && apCost(cost) <= state.ap && danger(level, state, { x, y }) === 2) return { x, y };
      }
      return null;
    },
  };

  loadLevel(0);
  say(`Each action point moves Leo up to ${MOVE_PER_AP} tiles (blue). Spend both to dash further (yellow), but dashing is loud.`);

  app.ticker.add((tk) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    view.time += dt;
    view.proj.angle += (targetAngle - view.proj.angle) * (1 - Math.exp(-dt * 10));
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
    } else leo.bob = Math.sin(view.time * 3) * 0.8 + 0.8;
    for (const r of ripples) r.t += dt / 0.9;
    ripples = ripples.filter((r) => r.t < 1);
    fit();
    view.draw(level, state, overlay(), leo, guards, ripples);
  });
}

/** Keeps the whole map on screen, between the HUD bars, whatever the camera angle. */
function fit(): void {
  const w = app.screen.width;
  const h = app.screen.height;
  const top = 104;
  const bottom = 96;
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
  const scale = Math.min((w - 24) / (x1 - x0), (h - top - bottom) / (y1 - y0), 1.5);
  world.scale.set(scale);
  world.position.set(w / 2 - ((x0 + x1) / 2) * scale, top + (h - top - bottom) / 2 - ((y0 + y1) / 2) * scale);
}

void boot();
