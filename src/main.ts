// Prototype M5: the whole story, start to credits. One mode, the hardest: no checkpoints, no undo. Save slots; Leo's attributes, skills
// and gadgets in the heist; the lair's rooms; the briefing; rival thieves; NightClaw's letters. Built on the M2 slice
// (tutorial, narrator, paper, black market) and the M1 sandbox.
import { Application, Container } from 'pixi.js';
// Lets PixiJS run on pages with a strict security policy (no eval).
import 'pixi.js/unsafe-eval';
import { parseLevel, the, type Level, type LevelDef, type Point } from './core/level';
import {
  actionsHere,
  dropLoot,
  lootGone,
  aftermath,
  guardSees,
  type Aftermath,
  lootAt,
  tileNow,
  moveAp,
  inventoryUsed,
  inventoryValue,
  cameraView,
  danger,
  doAction,
  endTurn,
  faceToward,
  guardView,
  key,
  leoReach,
  lightNow,
  lightMap,
  moveLeo,
  newHeist,
  pathTo,
  planGuards,
  AP_PER_TURN,
  abilities,
  abilityTargets,
  useAbility,
  planRival,
  motionTrip,
  hiddenAt,
  flooded,
  tideTurnsLeft,
  type Ability,
  type RivalPlan,
  type Action,
  type GuardStep,
  type Notice,
  type State,
} from './core/game';
import { ALL_LEVELS, DISTRICTS } from './levels';
import { CORNER_GALLERY } from './levels/tutorial';
import {
  buyLair,
  rivalFor,
  completeHeist,
  deleteSlot,
  lastSlot,
  loadSlot,
  loadSlots,
  narratorBuysTutorialLoot,
  newProfile,
  saveSlot,
  sell,
  type Profile,
} from './meta/profile';
import { learn, perksFor, raise, upgrade } from './meta/progression';
import { deliverLetters } from './meta/letters';
import { TUTORIAL, advance, type TutorialEvents } from './meta/tutorial';
import * as screens from './ui/screens';
import { loadCharacters, loadLootIcons, lootPictureUrl } from './render/characters';
import { ABILITY_ICONS } from './ui/pictures';
import { startGamepad } from './ui/gamepad';
import { actionForKey, keyName, padName, type KeyAction } from './controls';
import { loadProps } from './render/props';
import { loadSurfaces } from './render/surfaces';
import { loadFlats } from './render/flats';
import { HeistView, setPalette, type Actor, type Gait, type Overlay, type Ripple } from './render/view';
import { project, screenDir, unproject } from './render/iso';
import { Sound, soundsInLog, type Sfx, type Tension } from './audio';
import { SPEED_FACTOR, loadSettings, saveSettings, type Settings } from './settings';
import { checkAchievements } from './meta/achievements';

/** Heists on offer at the lair, in order. The tutorial can be replayed like any other. */
const JOBS: LevelDef[] = ALL_LEVELS;

// --- the game's changing state ----------------------------------------------------------------

/** Camera zoom: where it starts and how far it goes. */
const ZOOM_START = 1.9;
const ZOOM_MAX = 3;

/** Everything about the running game that changes as it's played, in one place. */
export interface Game {
  // The heist being played and the save it belongs to.
  level: Level;
  state: State;
  inHeist: boolean;
  slot: number; // which save slot
  profile: Profile;
  tutorial: { step: number; ev: TutorialEvents; hidden: boolean } | null;
  rivalPlan: RivalPlan | null; // tonight's rival for this heist, if any
  rivalWasIn: boolean; // the rival has already arrived

  // Animation.
  slowMotion: number; // the browser tests slow animations down to catch them mid-step
  guards: Actor[]; // how each guard is drawn (smooth positions between tiles)
  queue: Segment[]; // moves waiting to be animated
  busy: boolean; // an animation is playing, so input waits
  afterAnim: (() => void) | null; // what to do once the queue is done
  ripples: Ripple[]; // noise rings on the floor
  noisesSeen: number;

  // Camera.
  targetAngle: number; // the angle the camera is turning to
  zoom: number;
  zoomNow: number; // eases towards zoom
  focus: { x: number; y: number } | null; // the point the camera looks at, easing after Leo

  // Input and the preview of a move.
  hover: Point | null; // tile under the mouse
  selected: Point | null; // keyboard/controller cursor (touch: first tap previews)
  version: number; // bumped whenever the state changes, so cached work is redone
  cache: {
    v: number;
    reach: ReturnType<typeof leoReach>;
    vision: Set<string>;
    cameraVision: Set<string>;
    footprints: Point[];
    rivalPath: Point[];
  } | null;
  riskVersion: number; // which version the danger marks were worked out for
  riskQueue: (Point & { ends: boolean })[]; // tiles still to check for danger
  targeting: Ability | null; // the gadget being aimed
  lootMenu: Point | null; // the loot tag that's open
  lootChoices: (() => void)[]; // its buttons, for the number keys
  leaveOk: boolean; // the player said yes to leaving the lair without tapping NightClaw
  lastHaul: number;
  alerts: { n: Notice; until: number }[]; // who-noticed-what markers on the map
  restartArmed: number; // time of the first Restart press (it takes two)
  bannerTimer: number;

  // Art loading in the background.
  artReady: Promise<void>;
  artLoaded: boolean;
}

const startLevel = parseLevel(CORNER_GALLERY);

export const game: Game = {
  level: startLevel,
  state: newHeist(startLevel),
  inHeist: false,
  slot: 0,
  profile: newProfile(),
  tutorial: null,
  rivalPlan: null,
  rivalWasIn: false,
  slowMotion: 1,
  guards: [],
  queue: [],
  busy: false,
  afterAnim: null,
  ripples: [],
  noisesSeen: 0,
  targetAngle: 0,
  zoom: ZOOM_START,
  zoomNow: ZOOM_START,
  focus: null,
  hover: null,
  selected: null,
  version: 0,
  cache: null,
  riskVersion: -1,
  riskQueue: [],
  targeting: null,
  lootMenu: null,
  lootChoices: [],
  leaveOk: false,
  lastHaul: 0,
  alerts: [],
  restartArmed: 0,
  bannerTimer: 0,
  artReady: Promise.resolve(),
  artLoaded: false,
};




// --- the save ---------------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}


const persist = () => saveSlot(storage(), game.slot, game.profile);

// --- settings and sound ------------------------------------------------------------------------

const sound = new Sound();
const prefersReducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings: Settings = loadSettings(storage(), prefersReducedMotion);

const anim = (seconds: number) => seconds * SPEED_FACTOR[settings.speed] * game.slowMotion;

function applySettings(): void {
  document.body.classList.toggle('large-text', settings.largeText);
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  sound.setLevels(settings.master, settings.music, settings.sfx);
  setPalette(settings.palette);
  game.version++;
}

function changeSettings(s: Settings): void {
  Object.assign(settings, s);
  saveSettings(storage(), settings);
  applySettings();
}

function sfx(...names: Sfx[]): void {
  names.forEach((n, i) => sound.play(n, i * 0.12));
}

/** Achievements just earned: saved, and announced. */
function award(r: Parameters<typeof checkAchievements>[1] = null): void {
  const fresh = checkAchievements(game.profile, r);
  if (!fresh.length) return;
  persist();
  fresh.forEach((a, i) =>
    setTimeout(() => {
      sfx('achievement');
      screens.toast(a);
    }, i * 900),
  );
}


function tutorialUpdate(): void {
  const box = $('narrator');
  if (!game.tutorial || !game.inHeist) return box.classList.add('hidden');
  game.tutorial.step = advance(game.state, game.tutorial.ev, game.tutorial.step);
  const step = TUTORIAL[game.tutorial.step];
  if (!step || game.state.status !== 'playing') return box.classList.add('hidden');
  box.classList.remove('hidden');
  box.classList.toggle('collapsed', game.tutorial.hidden);
  $('narrator-text').textContent = step.text;
  $('narrator-count').textContent = `Tip ${game.tutorial.step + 1} of ${TUTORIAL.length}`;
  $('narrator-ok').classList.toggle('hidden', !step.optional);
}

const $ = (id: string) => document.getElementById(id)!;
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// --- display state: where things are drawn, which lags the rules while animating -----------------

const leo: Actor = { x: 0, y: 0, facing: 0, bob: 0 };

const rival: Actor = { x: 0, y: 0, facing: 0, bob: 0 };
function syncActors(): void {
  leo.x = game.state.leo.x + 0.5;
  leo.y = game.state.leo.y + 0.5;
  game.guards = game.state.guards.map((g) => ({ x: g.x + 0.5, y: g.y + 0.5, facing: g.facing, bob: 0 }));
  if (game.state.rival) {
    rival.x = game.state.rival.x + 0.5;
    rival.y = game.state.rival.y + 0.5;
    rival.facing = game.state.rival.facing;
  }
}

interface Segment {
  who: 'leo' | number;
  sfx?: Sfx; // played as the step starts
  from: Point;
  to: Point;
  facing: number;
  t: number;
  dur: number;
  leap?: boolean; // a Pounce: a high arc instead of a walk
  gait?: Gait;
}




function play(segments: Segment[], then: () => void): void {
  game.queue = segments;
  game.busy = segments.length > 0;
  game.afterAnim = then;
  if (!game.busy) then();
}


function spawnRipples(): void {
  for (const n of game.state.noises.slice(game.noisesSeen)) game.ripples.push({ x: n.x, y: n.y, r: n.r, t: 0 });
  game.noisesSeen = game.state.noises.length;
}

/** 1 shows the whole map; more is closer in, following Leo. */



/** How far the player has panned the camera away from Leo (WASD), in the world's own pixels. */
const pan = { x: 0, y: 0 };
/** WASD keys held down right now. */
const panKeys = new Set<string>();
/** Back to following Leo. */
function recentre(): void {
  pan.x = 0;
  pan.y = 0;
}

function zoomBy(k: number): void {
  game.zoom = Math.max(1, Math.min(ZOOM_MAX, game.zoom * k));
}

/** Turns the camera so it looks over Leo's shoulder: he's nearest the camera, the level stretches away. */
function cameraBehindLeo(): void {
  let best = 0;
  let bestDepth = -Infinity;
  for (let k = 0; k < 4; k++) {
    const d = project(
      { angle: (k * Math.PI) / 2, cx: view.proj.cx, cy: view.proj.cy },
      game.state.leo.x + 0.5,
      game.state.leo.y + 0.5,
    ).depth;
    if (d > bestDepth + 0.01) {
      bestDepth = d;
      best = k;
    }
  }
  game.targetAngle = (best * Math.PI) / 2;
  view.proj.angle = game.targetAngle;
  game.zoom = game.zoomNow = ZOOM_START;
  game.focus = null;
  recentre();
}
const view = new HeistView();

function turnCamera(dir: 1 | -1): void {
  closeLootMenu();
  recentre();
  game.targetAngle += (dir * Math.PI) / 2;
  if (game.tutorial) {
    game.tutorial.ev.rotated = true;
    tutorialUpdate();
  }
}





function computed() {
  if (!game.cache || game.cache.v !== game.version) {
    const vision = new Set<string>();
    for (const g of game.state.guards) for (const k of guardView(game.level, game.state, g)) vision.add(k);
    const cameraVision = new Set<string>();
    if (!game.state.camerasOff)
      for (const c of game.state.cameras) for (const k of cameraView(game.level, game.state, c)) cameraVision.add(k);
    const footprints = planGuards(game.level, game.state).flat();
    game.cache = {
      v: game.version,
      reach: leoReach(game.level, game.state),
      vision,
      cameraVision,
      footprints,
      rivalPath: planRival(game.level, game.state),
    };
  }
  return game.cache;
}

// --- what happens when the guards move: worked out a few tiles a frame, for every tile Leo can reach -------

/** For each reachable tile: what walking there would bring, and, if it uses his last action point, the guards' turn after. */
const risk = new Map<string, Aftermath>();



/** Works through the reachable tiles for a few milliseconds a frame, so the game never stutters. */
function workOnRisk(): void {
  if (!game.inHeist || game.busy || game.state.status !== 'playing' || game.targeting) return;
  if (game.riskVersion !== game.version) {
    game.riskVersion = game.version;
    risk.clear();
    game.riskQueue = [{ x: game.state.leo.x, y: game.state.leo.y, ends: true }];
    for (const [k, cost] of computed().reach.cost) {
      if (!cost || moveAp(game.state, cost) > game.state.ap) continue;
      const [x, y] = k.split(',').map(Number);
      // Only a move that spends Leo's last action point ends his turn there, so only then do the guards' turn count.
      game.riskQueue.push({ x, y, ends: moveAp(game.state, cost) >= game.state.ap });
    }
  }
  const t0 = performance.now();
  while (game.riskQueue.length && performance.now() - t0 < 5) {
    const p = game.riskQueue.shift()!;
    risk.set(key(p.x, p.y), aftermath(game.level, game.state, p, p.ends));
  }
}

function overlay(): Overlay {
  const c = computed();
  const reach1 = new Set<string>();
  const reach2 = new Set<string>();
  const live = game.state.status === 'playing' && !game.busy;
  if (game.targeting && live) {
    const targets = abilityTargets(game.level, game.state, game.targeting);
    const target = game.selected ?? game.hover;
    return {
      reach1,
      reach2,
      vision: c.vision,
      cameraVision: c.cameraVision,
      footprints: c.footprints,
      path: [],
      pathDanger: new Map(),
      hover: target && targets.has(key(target.x, target.y)) ? target : null,
      targets,
      rivalPath: c.rivalPath,
      risky: new Map(),
      alerts: liveAlerts(),
    };
  }
  if (live)
    for (const [k, cost] of c.reach.cost) {
      if (cost === 0) continue;
      const ap = moveAp(game.state, cost);
      if (ap > game.state.ap) continue;
      (ap === 1 ? reach1 : reach2).add(k);
    }
  const target = game.selected ?? game.hover;
  let path: Point[] = [];
  const pathDanger = new Map<string, number>();
  if (target && live) {
    // Pointing at loot: show the way to where Leo would stand to get at it.
    const goal = lootHere(target) !== null || boxHere(target) ? (standFor(target)?.at ?? target) : target;
    path = pathTo(c.reach, goal) ?? [];
    if (path.length && moveAp(game.state, c.reach.cost.get(key(goal.x, goal.y)) ?? 99) > game.state.ap) path = [];
    for (const p of path.slice(1)) {
      const d = danger(game.level, game.state, p);
      if (d) pathDanger.set(key(p.x, p.y), d);
    }
    // Two steps inside a motion-sensor zone in one move trips it.
    const trip = motionTrip(game.level, game.state, path);
    if (trip > 0) for (const p of path.slice(trip)) pathDanger.set(key(p.x, p.y), 2);
    // And where the walk ends: what the guards' turn would bring.
    const end = path.length ? path[path.length - 1] : null;
    const r = end ? risk.get(key(end.x, end.y)) : undefined;
    if (end && r)
      pathDanger.set(
        key(end.x, end.y),
        Math.max(pathDanger.get(key(end.x, end.y)) ?? 0, r.kind === 'seen' ? 1 : 2),
      );
  }
  return {
    reach1,
    reach2,
    vision: c.vision,
    cameraVision: c.cameraVision,
    footprints: game.state.status === 'playing' ? c.footprints : [],
    path,
    pathDanger,
    // The tile under the pointer is always outlined (in the colour of the walk there, if there is one).
    hover: live ? target : null,
    targets: new Set(),
    rivalPath: game.state.status === 'playing' ? c.rivalPath : [],
    risky: live && game.riskVersion === game.version ? risk : new Map(),
    alerts: liveAlerts(),
  };
}

/** While a rival is in the building but off screen, an arrow at the screen's edge points to them. */
function placeRivalArrow(): void {
  const el = $('rival-arrow');
  const r = game.state?.rival;
  if (!game.inHeist || !r || (r.phase !== 'in' && r.phase !== 'leaving')) return el.classList.add('hidden');
  const p = world.toGlobal(project(view.proj, rival.x, rival.y, 30));
  const w = window.innerWidth;
  const h = window.innerHeight;
  const m = 60;
  if (p.x > m && p.x < w - m && p.y > m && p.y < h - m) return el.classList.add('hidden');
  const cx = w / 2;
  const cy = h / 2;
  const k = Math.min(
    (w / 2 - m) / Math.max(1, Math.abs(p.x - cx)),
    (h / 2 - m) / Math.max(1, Math.abs(p.y - cy)),
  );
  el.style.left = `${cx + (p.x - cx) * k}px`;
  el.style.top = `${cy + (p.y - cy) * k}px`;
  el.style.setProperty('--turn', `${Math.atan2(p.y - cy, p.x - cx)}rad`);
  el.querySelector('span')!.textContent = r.name;
  el.classList.remove('hidden');
}

/** A note by the pointer when the tile under it isn't safe to end the turn on. */
function placeRiskNote(): void {
  const box = $('risk-note');
  const target = game.selected ?? game.hover;
  const live = game.inHeist && game.state.status === 'playing' && !game.busy && !game.targeting && !game.lootMenu;
  const goal =
    target && live
      ? lootHere(target) !== null || boxHere(target)
        ? (standFor(target)?.at ?? null)
        : target
      : null;
  const r = goal && game.riskVersion === game.version ? risk.get(key(goal.x, goal.y)) : null;
  if (!r || !goal) {
    box.classList.add('hidden');
    return;
  }
  const p = world.toGlobal(project(view.proj, goal.x + 0.5, goal.y + 0.5));
  box.textContent = r.why;
  box.className = `risk-note ${r.kind === 'seen' ? 'warn' : 'bad'}`;
  box.style.left = `${p.x}px`;
  box.style.top = `${p.y + 18}px`;
}

function tileUnder(clientX: number, clientY: number): Point | null {
  const local = world.toLocal({ x: clientX, y: clientY });
  const g = unproject(view.proj, local.x, local.y);
  const x = Math.floor(g.x);
  const y = Math.floor(g.y);
  if (x < 0 || y < 0 || x >= game.level.w || y >= game.level.h) return null;
  return { x, y };
}

/** What clicking a tile does when it's something to interact with: the quiet option first. */
function clickAction(tile: Point): Action | null {
  const here = actionsHere(game.level, game.state).filter(
    (a) => a.at.x === tile.x && a.at.y === tile.y && a.kind !== 'smash-case',
  );
  return here.find((a) => !a.blocked) ?? here[0] ?? null;
}

function act(tile: Point): void {
  if (game.busy || game.state.status !== 'playing') return;
  if (game.targeting) {
    if (abilityTargets(game.level, game.state, game.targeting).has(key(tile.x, tile.y))) return runAbility(game.targeting, tile);
    return cancelTargeting();
  }
  if (lootHere(tile) !== null) return openLootMenu(tile);
  const a = clickAction(tile);
  if (a) return runAction(a);
  // The finale: click NightClaw from across the hall and Leo creeps up behind him, then taps him on the shoulder.
  const nc = game.level.def.finale
    ? game.state.guards.find((g) => g.kind === 'nightclaw' && g.x === tile.x && g.y === tile.y)
    : undefined;
  if (nc) {
    const reach = computed().reach;
    const spots = [-1, 0, 1]
      .flatMap((dy) => [-1, 0, 1].map((dx) => ({ x: nc.x + dx, y: nc.y + dy })))
      .filter((p) => (p.x !== nc.x || p.y !== nc.y) && !guardSees(game.level, game.state, nc, p.x, p.y))
      .map((p) => ({ p, cost: reach.cost.get(key(p.x, p.y)) }))
      .filter((o) => o.cost !== undefined && moveAp(game.state, o.cost) < game.state.ap)
      .sort((a, b) => a.cost! - b.cost!);
    if (!spots.length) return say('Leo can’t get behind NightClaw from here this turn.');
    return walkTo(spots[0].p, () => {
      const tap = clickAction(tile);
      if (tap) runAction(tap);
    });
  }
  // A control box out of reach: walk over to it, then throw the switch.
  const box = boxHere(tile);
  if (box) {
    const st = standFor(tile);
    if (!st) return say('Too far to reach and use this turn.');
    return walkTo(st.at, () => doThere(tile, box));
  }
  walkTo(tile);
}

// --- loot: click it for what Leo can do -------------------------------------------------------------

/** A camera panel or power box that's still on, which Leo can walk over to and use. */
function boxHere(t: Point): 'panel' | 'fuse' | null {
  if (!game.level || !game.state || game.state.layer !== 'floor') return null;
  const tile = tileNow(game.level, game.state, t.x, t.y);
  if (tile === 'panel' && !game.state.camerasOff) return 'panel';
  if (tile === 'fuse' && !game.state.lasersOff) return 'fuse';
  return null;
}

/** The piece of loot on a tile, if it's still there to be had (in a case, on a plinth, in a safe, under a light). */
function lootHere(t: Point): number | null {
  if (!game.level || !game.state || game.state.layer !== 'floor') return null;
  const tile = tileNow(game.level, game.state, t.x, t.y);
  if (tile !== 'case' && tile !== 'plinth' && tile !== 'safe' && tile !== 'lamp') return null;
  const li = lootAt(game.level, t.x, t.y);
  return li >= 0 && !lootGone(game.state, li) ? li : null;
}

/** Where Leo would stand to work on a tile this turn: where he is if he can, else the cheapest, safest spot beside it. */
function standFor(target: Point): { at: Point; ap: number; danger: number } | null {
  const near = (p: Point) => Math.max(Math.abs(p.x - target.x), Math.abs(p.y - target.y)) === 1;
  if (near(game.state.leo)) return { at: { ...game.state.leo }, ap: 0, danger: 0 };
  const reach = computed().reach;
  let best: { at: Point; ap: number; d: number } | null = null;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const p = { x: target.x + dx, y: target.y + dy };
      const cost = reach.cost.get(key(p.x, p.y));
      if ((!dx && !dy) || cost === undefined) continue;
      const ap = moveAp(game.state, cost);
      if (ap >= game.state.ap) continue; // leave a point for the job itself
      const d = danger(game.level, game.state, p);
      // Never a spot where he'd be caught if there's another; then the cheapest; then the least noticed.
      if (
        !best ||
        (d < 2 && best.d === 2) ||
        ((d === 2) === (best.d === 2) && (ap < best.ap || (ap === best.ap && d < best.d)))
      )
        best = { at: p, ap, d };
    }
  return best && { at: best.at, ap: best.ap, danger: best.d };
}

/** The reachable tile nearest a target, for when it's too far to get to and work on this turn. */
function closerTo(target: Point): Point | null {
  let best: Point | null = null;
  let bd = Infinity;
  for (const [k, cost] of computed().reach.cost) {
    if (!cost || moveAp(game.state, cost) > game.state.ap) continue;
    const [x, y] = k.split(',').map(Number);
    if (danger(game.level, game.state, { x, y }) === 2) continue; // not into a guard's arms
    const d =
      Math.max(Math.abs(x - target.x), Math.abs(y - target.y)) * 10 +
      moveAp(game.state, cost) * 4 +
      danger(game.level, game.state, { x, y }) * 6;
    if (d < bd) {
      bd = d;
      best = { x, y };
    }
  }
  return best;
}

const VERBS: Partial<Record<Action['kind'], string>> = {
  take: 'Steal it',
  'pick-case': 'Pick the lock',
  'smash-case': 'Smash the glass',
  'crack-safe': 'Crack the safe',
};



/** A tag by the loot: what it is, and what Leo can do about it, with what each costs. */
function openLootMenu(target: Point): void {
  const li = lootHere(target);
  if (li === null) return;
  const loot = game.level.def.loot[li];
  const stand = standFor(target);
  const choices: { label: string; detail: string; run?: () => void; blocked?: string; loud?: boolean }[] = [];
  if (stand) {
    const there = { ...game.state, leo: stand.at, ap: game.state.ap - stand.ap } as State;
    const walk = stand.ap ? `walk over (${stand.ap} AP), then ` : '';
    const warn =
      stand.danger === 2
        ? ' · a guard would catch him there'
        : stand.danger === 1
          ? ' · a guard would notice'
          : '';
    for (const a of actionsHere(game.level, there).filter((x) => x.at.x === target.x && x.at.y === target.y)) {
      const noise = a.noise >= 6 ? 'loud: guards will come running' : a.noise > 0 ? 'quiet' : 'silent';
      const k = key(target.x, target.y);
      const goes =
        a.kind === 'pick-case' ? game.state.perks.casePicks : a.kind === 'crack-safe' ? game.state.perks.safeCracks : 1;
      const steps = goes > 1 ? ` (${game.state.picks[k] ?? 0}/${goes})` : '';
      choices.push({
        label: (VERBS[a.kind] ?? a.label) + steps,
        detail: `${walk}${a.ap} AP${goes > 1 ? ' a go' : ''} · ${noise}${warn}`,
        blocked: a.blocked,
        loud: a.noise >= 6,
        run: () =>
          walkTo(stand.at, () => {
            doThere(target, a.kind);
            // Not done yet (a lock that takes more than one go): the tag comes straight back for the next.
            if (lootHere(target) !== null && game.state.status === 'playing' && game.state.ap > 0 && !game.busy)
              openLootMenu(target);
          }),
      });
      // The bag's full: offer to put something down to make room for this.
      if (a.blocked?.startsWith('No room')) {
        const used = inventoryUsed(game.level, game.state);
        for (const old of game.state.inventory) {
          const o = game.level.def.loot[old];
          if (used - o.space + loot.space > game.state.perks.spaces) continue;
          choices.push({
            label: `Swap: leave ${o.name}`,
            detail: `${walk}put it down, then ${(VERBS[a.kind] ?? a.label).toLowerCase()} · $${o.value.toLocaleString('en-US')} → $${loot.value.toLocaleString('en-US')}`,
            run: () =>
              walkTo(stand.at, () => {
                putDown(old);
                doThere(target, a.kind);
              }),
          });
        }
      }
    }
  } else {
    const closer = closerTo(target);
    if (closer)
      choices.push({
        label: 'Walk closer',
        detail: `${moveAp(game.state, computed().reach.cost.get(key(closer.x, closer.y)) ?? 0)} AP`,
        run: () => walkTo(closer),
      });
  }
  const pic = lootPictureUrl(loot.name, loot.category);
  const box = $('loot-menu');
  box.innerHTML = `<div class="lm-head">${pic ? `<img src="${pic}" alt="">` : ''}<div><b>${loot.name}</b><span>est. $${loot.value.toLocaleString('en-US')} · ${loot.space} space${loot.space === 1 ? '' : 's'}</span></div></div>
    ${stand ? '' : '<p class="lm-note">Too far to reach and work on this turn. Leo needs to get beside it with an action point to spare.</p>'}
    ${choices.map((c, i) => `<button data-i="${i}" class="${c.loud ? 'loud' : ''}" ${c.blocked || !c.run ? 'disabled' : ''}><span class="k">${c.run ? i + 1 : '·'}</span><span class="lm-label">${c.label}</span><small>${c.blocked ?? c.detail}</small></button>`).join('')}
    <button class="quiet lm-close">Never mind (Esc)</button>`;
  game.lootChoices = choices.map((c) => () => {
    if (c.blocked || !c.run) return;
    closeLootMenu();
    c.run();
  });
  box
    .querySelectorAll<HTMLButtonElement>('button[data-i]')
    .forEach((b) => b.addEventListener('click', () => game.lootChoices[Number(b.dataset.i)]?.()));
  box.querySelector('.lm-close')!.addEventListener('click', closeLootMenu);
  game.lootMenu = target;
  box.classList.remove('hidden');
  placeLootMenu();
  sfx('click');
}

/** Keeps the tag beside its loot (the camera may be moving), and on screen. */
function placeLootMenu(): void {
  if (!game.lootMenu) return;
  const box = $('loot-menu');
  const p = world.toGlobal(project(view.proj, game.lootMenu.x + 0.5, game.lootMenu.y + 0.5, 50));
  const w = box.offsetWidth;
  const h = box.offsetHeight;
  const x = p.x + 34 + w > window.innerWidth - 8 ? p.x - 34 - w : p.x + 34;
  box.style.left = `${Math.max(8, x)}px`;
  box.style.top = `${Math.max(8, Math.min(window.innerHeight - h - 8, p.y - h / 2))}px`;
}

function closeLootMenu(): void {
  game.lootMenu = null;
  game.lootChoices = [];
  $('loot-menu').classList.add('hidden');
}

/** Puts a piece of loot down where Leo stands (free), and shows it. */
function putDown(li: number): void {
  game.state.log = [];
  if (!dropLoot(game.level, game.state, li)) return;
  sfx('take');
  game.version++;
  updateHud();
  say(game.state.log.join(' '));
  renderBag();
}

// --- the bag: what Leo's carrying ----------------------------------------------------------------------------

function bagOpen(): boolean {
  return !$('bag').classList.contains('hidden');
}

function toggleBag(open = !bagOpen()): void {
  $('bag').classList.toggle('hidden', !open);
  if (open) renderBag();
}

/** The bag's contents: each piece with its picture, worth and size, and a button to put it down. */
function renderBag(): void {
  if (!bagOpen() || !game.state) return;
  const used = inventoryUsed(game.level, game.state);
  const canDrop = game.state.status === 'playing' && game.state.layer === 'floor' && !game.busy;
  const box = $('bag');
  box.innerHTML = `<div class="bag-head"><b>Leo’s bag</b><span>${used} / ${game.state.perks.spaces} spaces · $${inventoryValue(game.level, game.state).toLocaleString('en-US')}</span></div>
    <div class="bag-slots" style="--n:${game.state.perks.spaces}">${Array.from({ length: game.state.perks.spaces }, (_, i) => `<i class="${i < used ? 'full' : ''}"></i>`).join('')}</div>
    ${
      game.state.inventory.length
        ? `<ul class="bag-items">${game.state.inventory
            .map((li) => {
              const l = game.level.def.loot[li];
              return `<li><img src="${lootPictureUrl(l.name, l.category)}" alt=""><div><b>${l.name}</b><span>$${l.value.toLocaleString('en-US')} · ${l.space} space${l.space === 1 ? '' : 's'}</span></div><button data-drop="${li}" ${canDrop ? '' : 'disabled'} title="${canDrop ? 'Put it down here, to make room' : 'Not from up here'}">Put down</button></li>`;
            })
            .join('')}</ul>`
        : '<p class="bag-empty">Empty. Go steal something.</p>'
    }
    ${game.state.dropped.length ? `<p class="bag-note">Left behind: ${game.state.dropped.map((d) => game.level.def.loot[d.li].name).join(', ')}. Walk back to pick it up (1 AP).</p>` : '<p class="bag-note">Putting something down is free. It stays where you leave it, to pick up later.</p>'}
    <button class="quiet bag-close">Close (I or Esc)</button>`;
  box
    .querySelectorAll<HTMLButtonElement>('[data-drop]')
    .forEach((b) => b.addEventListener('click', () => putDown(Number(b.dataset.drop))));
  box.querySelector('.bag-close')!.addEventListener('click', () => toggleBag(false));
}

/** Does an action on a tile Leo has just arrived beside. */
function doThere(target: Point, kind: Action['kind']): void {
  const a = actionsHere(game.level, game.state).find(
    (x) => x.kind === kind && x.at.x === target.x && x.at.y === target.y,
  );
  if (!a) return;
  if (a.blocked) return say(a.blocked);
  runAction(a);
}

/** The finale: leaving before tapping NightClaw skips the ending, so ask first. */
function leavingWithoutTap(tile: Point): boolean {
  if (game.leaveOk || !game.level.def.finale || game.state.tagged || game.state.layer !== 'floor' || !game.state.inventory.length)
    return false;
  if (tile.x !== game.level.exit.x || tile.y !== game.level.exit.y) return false;
  return true;
}

function confirmLeave(go: () => void): void {
  const box = $('leave-confirm');
  box.classList.remove('hidden');
  const close = () => {
    box.classList.add('hidden');
    $('leave-stay').onclick = $('leave-go').onclick = null;
    window.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      say('Find NightClaw, creep up behind him, and tap him on the shoulder.');
    }
  };
  window.addEventListener('keydown', onKey, true);
  $('leave-stay').onclick = () => {
    close();
    say('Find NightClaw, creep up behind him, and tap him on the shoulder.');
  };
  $('leave-go').onclick = () => {
    close();
    game.leaveOk = true;
    go();
    game.leaveOk = false;
  };
  ($('leave-stay') as HTMLButtonElement).focus();
}

/** Moves Leo to a tile, animating the walk; `then` runs once he's there, if he can still act. */
function walkTo(tile: Point, then?: () => void): void {
  if (tile.x === game.state.leo.x && tile.y === game.state.leo.y) return then?.();
  if (leavingWithoutTap(tile)) return confirmLeave(() => walkTo(tile, then));
  recentre(); // the camera catches up with Leo when he moves
  game.state.log = [];
  const apBefore = game.state.ap;
  const res = moveLeo(game.level, game.state, tile);
  if (!res.ok) return say(res.reason ?? '');
  if (game.tutorial) {
    game.tutorial.ev.moved = true;
    if (apBefore - game.state.ap === 2) game.tutorial.ev.dashed = true;
    if (game.state.layer === 'floor' && res.path.some((p) => game.level.tiles[p.y][p.x] === 'marble'))
      game.tutorial.ev.onMarble = true;
  }
  game.selected = null;
  game.version++;
  const segs: Segment[] = [];
  const crawl = game.state.layer === 'vent' ? 1.4 : 1; // beams are walked at the usual pace
  const layer = game.state.layer;
  // Leo crawls in the vents, runs when he dashes, and creeps when he's heading into the dark.
  const dark = lightMap(game.level, game.state.lampsOff);
  const dash = apBefore - game.state.ap >= 2;
  for (let i = 1; i < res.path.length; i++) {
    const p = res.path[i - 1];
    const q = res.path[i];
    const t = game.level.tiles[q.y][q.x];
    const step: Sfx = layer === 'vent' ? 'vent' : t === 'marble' ? 'step-marble' : 'step-carpet';
    const gait: Gait =
      layer === 'vent'
        ? 'crawl'
        : dash
          ? 'run'
          : layer === 'floor' && dark[q.y][q.x] === 0
            ? 'sneak'
            : 'walk';
    segs.push({
      who: 'leo',
      from: p,
      to: q,
      facing: faceToward(p, q),
      t: 0,
      dur: anim((p.x !== q.x && p.y !== q.y ? 0.17 : 0.12) * crawl * (gait === 'sneak' ? 1.25 : 1)),
      sfx: layer === 'vent' && i % 2 ? undefined : step,
      gait,
    });
  }
  play(segs, () => {
    afterLeoActs();
    if (then && game.state.status === 'playing' && game.state.ap > 0) then();
  });
}


/** Words that pop up off a tile and float away: a loot value, a crash, a lock giving. */
function floatText(at: Point, text: string, cls = ''): void {
  const p = world.toGlobal(project(view.proj, at.x + 0.5, at.y + 0.5, 60));
  // Several at once stack upwards rather than on top of each other.
  const stack = $('floaters').childElementCount;
  p.y -= stack * 34;
  const el = document.createElement('div');
  el.className = `floater ${cls}`;
  el.textContent = text;
  el.style.left = `${Math.max(140, Math.min(window.innerWidth - 140, p.x))}px`;
  el.style.top = `${Math.max(60, Math.min(window.innerHeight - 60, p.y))}px`;
  $('floaters').appendChild(el);
  window.setTimeout(() => el.remove(), 1900);
}

function shake(): void {
  const st = $('stage');
  st.classList.remove('shake');
  void st.offsetWidth;
  st.classList.add('shake');
}

function runAction(a: Action): void {
  if (game.busy || game.state.status !== 'playing') return;
  if (a.blocked) return say(a.blocked);
  game.state.log = [];
  const invBefore = [...game.state.inventory];
  if (!doAction(game.level, game.state, a.kind, a.at)) return say('Leo can’t do that right now.');
  // The payoff, right where it happened.
  for (const li of game.state.inventory.filter((i) => !invBefore.includes(i))) {
    const l = game.level.def.loot[li];
    const centre = !!game.level.plinth && l.at.x === game.level.plinth.x && l.at.y === game.level.plinth.y;
    floatText(l.at, `+$${l.value.toLocaleString('en-US')}`, centre ? 'big' : '');
    sfx('coin');
  }
  if (a.kind === 'smash-case') {
    floatText(a.at, 'CRASH!', 'red');
    shake();
  } else if (
    (a.kind === 'pick-case' || a.kind === 'pick-door' || a.kind === 'crack-safe') &&
    game.state.inventory.length === invBefore.length
  )
    floatText(a.at, a.kind === 'crack-safe' ? 'clunk…' : 'click…', 'small');
  const actionSound: Partial<Record<Action['kind'], Sfx>> = {
    'pick-case': 'pick',
    'pick-door': 'pick',
    take: 'take',
    'crack-safe': 'dials',
    'swipe-card': 'beep',
    'read-notes': 'click',
    'turn-dials': 'dials',
    lights: 'click',
    panel: 'click',
    fuse: 'click',
    'enter-vent': 'hatch',
    'exit-vent': 'hatch',
    'climb-up': 'door',
    'climb-down': 'door',
    drop: 'door',
    tap: 'tap',
  };
  let snd = actionSound[a.kind];
  // The lock giving way is its own sound: a door swinging open, a case opening, a safe door.
  const opened =
    game.state.inventory.length > invBefore.length ||
    (a.kind === 'pick-door' && tileNow(game.level, game.state, a.at.x, a.at.y) !== 'door');
  if (opened && (a.kind === 'pick-door' || a.kind === 'pick-case')) snd = 'unlock';
  if (opened && a.kind === 'crack-safe') snd = 'safe-open';
  if (snd) sfx(snd);
  if (
    a.kind !== 'enter-vent' &&
    a.kind !== 'exit-vent' &&
    a.kind !== 'climb-up' &&
    a.kind !== 'climb-down' &&
    a.kind !== 'drop'
  )
    leo.work = 1;
  if (game.state.inventory.length && a.kind !== 'take' && /^Got /.test(game.state.log.join(' '))) sfx('take');
  game.selected = null;
  game.version++;
  afterLeoActs();
  if (a.at.x !== game.state.leo.x || a.at.y !== game.state.leo.y) leo.facing = faceToward(game.state.leo, a.at);
}


function startAbility(kind: Ability): void {
  if (game.busy || game.state.status !== 'playing') return;
  if (game.targeting === kind) return cancelTargeting();
  const a = abilities(game.level, game.state).find((x) => x.kind === kind);
  if (!a) return;
  if (a.blocked) return say(a.blocked);
  if (a.target === 'self') return runAbility(kind);
  game.targeting = kind;
  game.selected = null;
  say(
    a.target === 'camera'
      ? `${a.name}: click a camera within reach. Esc to cancel.`
      : `${a.name}: click one of the highlighted tiles. Esc to cancel.`,
  );
  updateHud();
}

function cancelTargeting(): void {
  game.targeting = null;
  say('');
  updateHud();
}

function runAbility(kind: Ability, at?: Point): void {
  if (kind === 'pounce' && at && leavingWithoutTap(at)) return confirmLeave(() => runAbility(kind, at));
  const from = { ...game.state.leo };
  game.state.log = [];
  game.targeting = null;
  if (!useAbility(game.level, game.state, kind, at)) {
    updateHud();
    return say('Leo can’t do that right now.');
  }
  game.selected = null;
  game.version++;
  sfx(kind === 'bottle-cap' ? 'clink' : kind === 'pounce' ? 'pounce' : kind === 'smoke' ? 'whoosh' : 'beep');
  if (kind === 'pounce')
    return play(
      [
        {
          who: 'leo',
          from,
          to: { ...game.state.leo },
          facing: faceToward(from, game.state.leo),
          t: 0,
          dur: anim(0.35),
          leap: true,
        },
      ],
      afterLeoActs,
    );
  afterLeoActs();
  if (at) leo.facing = faceToward(game.state.leo, at);
}

function liveAlerts(): Notice[] {
  const now = performance.now();
  game.alerts = game.alerts.filter((a) => a.until > now);
  return game.alerts.map((a) => a.n);
}

/** Puts this step's notices on the map: a label over the spot, a ring and a line back to the guard or camera. */
function showNotices(): void {
  const list = game.state.notices ?? [];
  game.state.notices = [];
  if (!list.length) return;
  for (const n of list) game.alerts.push({ n, until: performance.now() + (n.kind === 'caught' ? 60000 : 6000) });
  // The labels go up once the camera has moved (below), so they sit over the spot, not where it used to be.
  window.setTimeout(
    () => list.forEach((n) => floatText(n.at, n.label, n.kind === 'spotted' ? 'warn' : 'red')),
    80,
  );
  // If it happened off screen, the camera goes to look (on Leo's next move it comes back to him).
  const worst = list.find((n) => n.kind === 'caught') ?? list.find((n) => n.kind !== 'spotted') ?? list[0];
  const spot =
    worst.from && worst.kind === 'caught'
      ? { x: (worst.from.x + worst.at.x) / 2, y: (worst.from.y + worst.at.y) / 2 }
      : worst.at;
  const sp = world.toGlobal(project(view.proj, spot.x + 0.5, spot.y + 0.5));
  const margin = 120;
  if (
    sp.x < margin ||
    sp.y < margin ||
    sp.x > window.innerWidth - margin ||
    sp.y > window.innerHeight - margin
  ) {
    const a = project(view.proj, spot.x + 0.5, spot.y + 0.5);
    const b = project(view.proj, game.state.leo.x + 0.5, game.state.leo.y + 0.5);
    pan.x = a.x - b.x;
    pan.y = a.y - b.y;
  }
}

function afterLeoActs(): void {
  spawnRipples();
  syncActors();
  updateHud();
  if (game.state.log.length) say(game.state.log.join(' '));
  showNotices();
  sfx(...soundsInLog(game.state.log));
  tutorialUpdate();
  if (game.state.status === 'caught') return caught();
  if (game.state.status === 'escaped') return escaped();
  if (game.state.ap <= 0)
    setTimeout(() => !game.busy && game.state.status === 'playing' && game.state.ap <= 0 && doEndTurn(), anim(450) + 50);
}

function doEndTurn(): void {
  closeLootMenu();
  if (game.busy || game.state.status !== 'playing') return;
  game.selected = null;
  banner('Guards’ turn');
  const before = game.state.guards.map((g) => ({ x: g.x, y: g.y }));
  const alarmBefore = game.state.alarm !== null;
  const steps: GuardStep[] = endTurn(game.level, game.state);
  game.noisesSeen = 0;
  game.version++;
  const last = before.map((p) => ({ ...p }));
  let rivalAt = { x: rival.x - 0.5, y: rival.y - 0.5 };
  const segs: Segment[] = steps.map((s) => {
    if (s.guard === -1) {
      // The rival's first step is their arrival: they appear there, rather than walking in from nowhere.
      const from = game.rivalWasIn ? rivalAt : { x: s.to.x, y: s.to.y };
      if (!game.rivalWasIn && game.state.rival)
        window.setTimeout(() => banner(`${game.state.rival?.name ?? 'A rival'} is in the building!`), 300);
      game.rivalWasIn = true;
      rivalAt = { x: s.to.x, y: s.to.y };
      return {
        who: -1,
        from,
        to: { x: s.to.x, y: s.to.y },
        facing: s.to.facing,
        t: 0,
        dur: anim(0.16),
        gait: 'run',
      };
    }
    const from = last[s.guard];
    last[s.guard] = { x: s.to.x, y: s.to.y };
    const hurry = game.state.guards[s.guard]?.mode === 'searching';
    return {
      who: s.guard,
      from,
      to: { x: s.to.x, y: s.to.y },
      facing: s.to.facing,
      t: 0,
      dur: anim(hurry ? 0.17 : 0.22),
      gait: hurry ? 'run' : 'walk',
    };
  });
  game.busy = segs.length > 0;
  updateHud();
  sfx(...soundsInLog(game.state.log));
  const rivalAlarm = game.state.alarm !== null && !game.state.alarmByLeo && !alarmBefore;
  if (rivalAlarm) window.setTimeout(() => banner(`${game.state.alarmBy ?? 'A rival'} set off the alarm!`), 500);
  play(segs, () => {
    syncActors();
    updateHud();
    if (game.state.log.length) say(game.state.log.join(' '));
    showNotices();
    tutorialUpdate();
    if (game.state.status === 'caught') return caught();
    updateHud();
    // Still asleep after a Cat Nap: the guards go again.
    if (game.state.ap <= 0) {
      banner('Zzz…');
      setTimeout(() => !game.busy && game.state.status === 'playing' && game.state.ap <= 0 && doEndTurn(), anim(700) + 50);
      return;
    }
    banner(game.state.alarm !== null ? `Alarm! ${game.state.alarm} turns` : 'Your turn');
  });
}

/** Tonight's rival for a heist: never in the tutorial; otherwise rolled once and kept until it's played. */
function rivalPlanFor(def: LevelDef): RivalPlan | null {
  if (def.id === CORNER_GALLERY.id) return null;
  const district = DISTRICTS.findIndex((d) => d.levels.includes(def));
  const plan = rivalFor(game.profile, def, Math.max(0, district));
  persist();
  return plan;
}



/** The heist report, with its own music. */
function showReport(r: ReturnType<typeof completeHeist>): void {
  sound.setScene('report');
  screens.heistReport(r, game.profile, goOn);
}



function startHeist(def: LevelDef): void {
  // The art loads while the title is up; on the off chance it hasn't finished, the heist waits for it.
  if (!game.artLoaded)
    return void game.artReady.then(() => {
      game.artLoaded = true;
      startHeist(def);
    });
  sound.setFinale(def.id.startsWith('nc-'));
  game.rivalPlan = rivalPlanFor(def);
  game.level = parseLevel(def);
  loadLootIcons(def.loot).catch((e) => console.error('Loot pictures failed', e));
  view.proj.cx = game.level.w / 2;
  view.proj.cy = game.level.h / 2;
  $('level-name').textContent = game.level.def.name;
  game.tutorial =
    def.id === CORNER_GALLERY.id && !game.profile.tutorialDone
      ? {
          step: 0,
          ev: { moved: false, dashed: false, rotated: false, onMarble: false },
          hidden: !settings.hints,
        }
      : null;
  screens.hideScreens();
  game.inHeist = true;
  document.body.classList.remove('meta');
  restart();
  cameraBehindLeo();
}

/** Leaves the heist for the screens between heists. */
function leaveHeist(): void {
  $('leave-confirm').classList.add('hidden');
  toggleBag(false);
  closeLootMenu();
  game.inHeist = false;
  game.queue = [];
  game.busy = false;
  hide('caught');
  hide('help');
  game.targeting = null;
  $('narrator').classList.add('hidden');
  document.body.classList.add('meta');
  sound.setScene('lair');
}

// --- between heists ---------------------------------------------------------------------------

function goOn(): void {
  leaveHeist();
  if (!game.profile.tutorialDone) return startHeist(CORNER_GALLERY);
  if (!game.profile.narratorPaid) return narratorPays();
  if (!game.profile.lairOwned) return cityMap();
  showLair();
}

/** The end of the story: NightClaw's farewell, the title, the credits, and the morning paper. */
function ending(r: ReturnType<typeof completeHeist>): void {
  const nc = { name: 'NightClaw', portrait: screens.NIGHTCLAW_SVG };
  screens.narratorScene(
    [
      '“Tap, tap.” He doesn’t jump. He turns round slowly, and for a long moment he just looks at you.',
      '“Do you know how long it has been since anyone crept up on me? Neither do I. Long enough to forget what it feels like.”',
      'He nods at what’s in your paw. “You found it. That collar is the only thing I never stole. I wore it when I was a kitten, before I was anybody. The tag says Midnight: that was my name, once.”',
      '“Keep it. You have earned it, and I have no more use for it. The city needs a thief who is better than its locks, and it has one now.”',
      'He lifts his hat. “Goodnight, Leo. Legendary suits you.” And he’s gone, out of the belfry window, into the dark.',
    ],
    'Legendary?',
    () =>
      screens.legendaryCard(() =>
        screens.credits(() => screens.newspaper(r.paper, true, () => showReport(r))),
      ),
    nc,
  );
}

function narratorPays(): void {
  leaveHeist();
  screens.narratorScene(
    [
      'Not bad for a first night, kid. Not bad at all.',
      "Now, nobody in this city will touch loot from a cat they've never heard of. So I'll buy the lot myself: the pearl, the brooch and the mouse. Call it an investment.",
      "Here: <b>500 Catnip</b>. Don't spend it on sardines.",
      'One more thing. A thief needs a headquarters, somewhere to plan, to stash the goods and to meet the right people. I know just the place.',
    ],
    'Show me',
    () => {
      narratorBuysTutorialLoot(game.profile, CORNER_GALLERY.id);
      persist();
      cityMap();
    },
  );
}

function cityMap(): void {
  leaveHeist();
  screens.cityMap(game.profile, () => {
    if (!buyLair(game.profile)) return;
    persist();
    screens.narratorScene(
      [
        "It's yours. Leaky roof, boarded windows, one light bulb. Home sweet home.",
        'The back room has a door onto the black market: sell your loot there for Catnip. The fences pay better as you make a name for yourself.',
        'Every heist makes the morning paper, and every paper keeps a tally of what you took. Start small: the Cobblestone Coin Museum, here in Old Town. Good luck, kid.',
      ],
      'Enter the lair',
      () => showLair(),
    );
  });
}

const photos = new Map<string, Promise<string>>();

/** A photo of a heist's building for the planning board: the game draws the level, from behind Leo, off screen. */
function levelPhoto(def: LevelDef): Promise<string> {
  const cached = photos.get(def.id);
  if (cached) return cached;
  const shot = (async () => {
    await Promise.all([loadProps(), loadCharacters(), loadSurfaces(), loadFlats(), loadLootIcons(def.loot)]);
    const lv = parseLevel(def);
    const st = newHeist(lv, perksFor(game.profile), null);
    const v = new HeistView();
    let best = 0;
    for (let k = 0; k < 4; k++)
      if (
        project({ angle: (k * Math.PI) / 2, cx: lv.w / 2, cy: lv.h / 2 }, st.leo.x + 0.5, st.leo.y + 0.5)
          .depth >
        project({ angle: (best * Math.PI) / 2, cx: lv.w / 2, cy: lv.h / 2 }, st.leo.x + 0.5, st.leo.y + 0.5)
          .depth
      )
        best = k;
    v.proj = { angle: (best * Math.PI) / 2, cx: lv.w / 2, cy: lv.h / 2 };
    v.time = 2;
    const actor = (x: number, y: number, facing: number) => ({ x: x + 0.5, y: y + 0.5, facing, bob: 0 });
    const none: Overlay = {
      reach1: new Set(),
      reach2: new Set(),
      vision: new Set(),
      cameraVision: new Set(),
      footprints: [],
      rivalPath: [],
      path: [],
      pathDanger: new Map(),
      hover: null,
      targets: new Set(),
      risky: new Map(),
      alerts: liveAlerts(),
    };
    v.draw(
      lv,
      st,
      none,
      actor(st.leo.x, st.leo.y, 2),
      st.guards.map((g) => actor(g.x, g.y, g.facing)),
      [],
      undefined,
    );
    const holder = new Container();
    holder.addChild(v.root);
    const b = holder.getLocalBounds();
    v.root.scale.set(Math.min(1, 900 / b.width));
    const url = await app.renderer.extract.base64({ target: holder, format: 'png' });
    holder.destroy({ children: true });
    return url;
  })();
  photos.set(def.id, shot);
  shot.catch(() => photos.delete(def.id));
  return shot;
}

function showLair(tab: screens.LairTab = 'heists'): void {
  sound.setScene(tab === 'market' ? 'market' : 'lair');
  leaveHeist();
  // NightClaw's letters wait at the door until they've been read.
  deliverLetters(game.profile);
  award();
  const unread = game.profile.letters.find((l) => !l.read);
  if (unread) {
    persist();
    sfx('chime');
    return screens.letter(unread, game.profile, () => {
      unread.read = true;
      persist();
      showLair(tab);
    });
  }
  screens.lair(
    game.profile,
    {
      jobs: JOBS,
      districts: DISTRICTS,
      onHeist: (def) => (
        sound.setScene('planning'),
        screens.briefing(
          def,
          game.profile,
          rivalPlanFor(def),
          () => startHeist(def),
          () => showLair(),
          levelPhoto(def),
        )
      ),
      onSell: (id) => {
        sell(game.profile, id);
        persist();
        showLair('market');
      },
      onSellAll: () => {
        for (const s of [...game.profile.stash]) sell(game.profile, s.id);
        persist();
        showLair('market');
      },
      onPaper: (i) =>
        screens.newspaper(game.profile.papers[i], false, () => showLair('papers'), 'Back to the lair'),
      onRaise: (id) => {
        raise(game.profile, id);
        persist();
        showLair('leo');
      },
      onLearn: (id) => {
        learn(game.profile, id);
        persist();
        showLair('leo');
      },
      onUpgrade: (id) => {
        upgrade(game.profile, id);
        persist();
        showLair('lair');
      },
      onLetter: (i) =>
        screens.letter(game.profile.letters[i], game.profile, () => showLair('lair'), 'Back to the lair'),
      onSettings: () => screens.settingsScreen(settings, changeSettings, () => showLair(tab)),
      onQuit: showTitle,
    },
    tab,
  );
}

function quit(): void {
  if (!game.profile.lairOwned) return showTitle();
  showLair();
}

function showTitle(): void {
  leaveHeist();
  sound.setScene('title');
  screens.titleScreen(loadSlots(storage()), {
    lastSlot: lastSlot(storage()),
    onPlay: (i) => {
      const p = loadSlot(storage(), i);
      if (!p) return showTitle();
      game.slot = i;
      game.profile = p;
      goOn();
    },
    onNew: (i) => {
      game.slot = i;
      game.profile = newProfile();
      persist();
      startHeist(CORNER_GALLERY);
    },
    onDelete: (i) => {
      deleteSlot(storage(), i);
      showTitle();
    },
    onSettings: () => screens.settingsScreen(settings, changeSettings, showTitle),
    onCredits: () => screens.credits(showTitle, true),
  });
}

/** Restart takes two presses mid-heist, so a stray key can't throw the heist away. */
function askRestart(): void {
  if (game.state.status !== 'playing' || performance.now() < game.restartArmed) return restart();
  game.restartArmed = performance.now() + 3000;
  const b = $('restart');
  b.textContent = 'Really restart?';
  b.classList.add('armed');
  say('Press R (or Restart) again to start the heist over.');
  window.setTimeout(() => {
    if (performance.now() >= game.restartArmed) {
      b.textContent = 'Restart';
      b.classList.remove('armed');
    }
  }, 3050);
}

function restart(): void {
  game.restartArmed = 0;
  $('restart').textContent = 'Restart';
  $('restart').classList.remove('armed');
  game.lastHaul = 0;
  closeLootMenu();
  game.state = newHeist(game.level, perksFor(game.profile), game.rivalPlan);
  game.alerts = [];
  $('leave-confirm').classList.add('hidden');
  game.rivalWasIn = false;
  game.targeting = null;
  game.queue = [];
  game.busy = false;
  game.afterAnim = null;
  game.selected = null;
  game.ripples = [];
  game.noisesSeen = 0;
  game.version++;
  syncActors();
  hide('caught');
  updateHud();
  banner('Your turn');
  say(game.level.def.objective);
  if (game.tutorial) game.tutorial.ev = { moved: false, dashed: false, rotated: game.tutorial.ev.rotated, onMarble: false };
  tutorialUpdate();
}

// --- HUD --------------------------------------------------------------------------------------

function say(text: string): void {
  $('message').textContent = text;
}

function banner(text: string): void {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(game.bannerTimer);
  game.bannerTimer = window.setTimeout(() => b.classList.remove('show'), 1100);
}

function show(id: string): void {
  $(id).classList.remove('hidden');
}
function hide(id: string): void {
  $(id).classList.add('hidden');
}

const LIGHT_NAMES = ['In shadow', 'Dim light', 'In the light'];

function updateHud(): void {
  $('turn').textContent = String(game.state.turn);
  $('ap').innerHTML = Array.from(
    { length: AP_PER_TURN },
    (_, i) => `<span class="pip ${i < game.state.ap ? 'on' : ''}"></span>`,
  ).join('');
  const extras = [game.state.card === 'leo' ? 'keycard' : '', game.state.combination ? 'the combination' : '']
    .filter(Boolean)
    .join(', ');
  const haulNow = inventoryValue(game.level, game.state);
  $('inventory').innerHTML =
    `Inventory <b>${inventoryUsed(game.level, game.state)}/${game.state.perks.spaces}</b> · <span class="haul-now${haulNow > game.lastHaul ? ' bump' : ''}">${money(haulNow)}</span>${extras ? ` · ${extras}` : ''}`;
  game.lastHaul = haulNow;
  renderBag();
  // The race, if there is one. Before they arrive, only a good Planning Table says when.
  const r = game.state.rival;
  const rl = $('rival');
  const prize =
    game.level.def.loot.find((l) => game.level.plinth && l.at.x === game.level.plinth.x && l.at.y === game.level.plinth.y)
      ?.name ?? 'prize';
  const rivalText = !r
    ? ''
    : r.phase === 'waiting'
      ? game.profile.rooms.planning >= 2
        ? `${r.name} arrives on turn ${r.arrive}`
        : game.profile.rooms.planning >= 1
          ? `${r.name} is coming tonight`
          : ''
      : r.phase === 'in'
        ? `${r.name} is after ${the(prize)}!`
        : r.phase === 'leaving'
          ? `${r.name} has ${the(prize)} and is getting away`
          : game.state.rivalBeaten
            ? `You beat ${r.name} to it`
            : game.state.rivalLoot.length
              ? `${r.name} got away with ${the(prize)}`
              : `${r.name} has fled`;
  const lock =
    game.level.def.timeLock && game.state.turn < game.level.def.timeLock
      ? `Time lock opens on turn ${game.level.def.timeLock}`
      : '';
  const tide = game.level.def.tide
    ? `${flooded(game.level, game.state) ? 'High' : 'Low'} tide · it turns in ${tideTurnsLeft(game.level, game.state)} turn${tideTurnsLeft(game.level, game.state) === 1 ? '' : 's'}`
    : '';
  rl.textContent = [rivalText, tide, lock].filter(Boolean).join(' · ');
  rl.classList.toggle('hidden', !rivalText && !tide && !lock);
  const hidden = hiddenAt(game.level, game.state, game.state.leo);
  const l = game.state.layer !== 'floor' || hidden ? -1 : lightNow(game.level, game.state, game.state.leo.x, game.state.leo.y);
  const li = $('light');
  li.textContent = hidden
    ? 'In a crate'
    : l < 0
      ? game.state.layer === 'vent'
        ? 'In the vents'
        : 'In the rafters'
      : LIGHT_NAMES[l];
  li.className = `light l${l < 0 ? 'v' : l}`;
  const al = $('alarm');
  if (game.state.lockdown && game.state.status === 'playing') {
    al.textContent = `LOCKDOWN · lie low: the exits open once the guards catch ${game.state.rival && (game.state.rival.phase === 'in' || game.state.rival.phase === 'leaving') ? game.state.rival.name : 'the intruder'}`;
    show('alarm');
  } else if (game.state.alarm !== null && game.state.status === 'playing') {
    al.textContent = game.state.alarmByLeo
      ? `ALARM · lockdown in ${game.state.alarm} turn${game.state.alarm === 1 ? '' : 's'}${game.state.camerasOff ? '' : ' · shut it off at the camera panel'}`
      : `ALARM · ${game.state.alarmBy ?? 'a rival'} set it off, not you · lie low and stay out of sight, and it won't be pinned on you · lockdown in ${game.state.alarm}`;
    show('alarm');
  } else hide('alarm');
  ($('end') as HTMLButtonElement).disabled = game.busy || game.state.status !== 'playing';
  const tension: Tension =
    game.state.status !== 'playing'
      ? 1
      : game.state.alarm !== null
        ? 3
        : game.state.guards.some((g) => !g.asleep && g.mode !== 'patrol')
          ? 2
          : 1;
  if (game.inHeist) sound.setTension(tension);

  // Gadgets and active skills, with what's left of each.
  const ab = $('abilities');
  const list = game.state.status === 'playing' ? abilities(game.level, game.state) : [];
  ab.innerHTML = '';
  for (const a of list) {
    const b = document.createElement('button');
    b.className = `ability${game.targeting === a.kind ? ' on' : ''}`;
    b.dataset.ability = a.kind;
    b.disabled = game.busy || (!!a.blocked && game.targeting !== a.kind);
    b.title = a.blocked ?? `${a.ap} action point`;
    const icon = ABILITY_ICONS[a.kind];
    b.innerHTML = `${icon ? `<img class="ab-icon" src="${icon}" alt="">` : ''}${a.name}${a.left < 99 ? ` <span class="count">×${a.left}</span>` : ''}`;
    b.addEventListener('click', () => startAbility(a.kind));
    ab.appendChild(b);
  }
  ab.classList.toggle('hidden', list.length === 0);

  const bar = $('actions');
  const acts = game.busy ? [] : actionsHere(game.level, game.state);
  bar.innerHTML = '';
  acts.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = `act${a.noise >= 4 ? ' loud' : ''}`;
    b.dataset.kind = a.kind;
    b.dataset.at = `${a.at.x},${a.at.y}`;
    b.disabled = !!a.blocked;
    b.title =
      a.blocked ??
      `${a.ap} action point${a.ap === 1 ? '' : 's'}${a.noise ? `, noise ${a.noise}` : ', silent'}`;
    b.innerHTML = `<span class="k">${i + 1}</span>${a.label}${a.noise ? ` <span class="noise">${'◉'.repeat(Math.min(3, Math.ceil(a.noise / 2)))}</span>` : ''}`;
    b.addEventListener('click', () => runAction(a));
    bar.appendChild(b);
  });
  bar.classList.toggle('hidden', acts.length === 0);
}

function caught(): void {
  sfx('caught');
  $('caught-who').textContent = game.state.caughtBy ?? 'A guard';
  say(`Caught by ${game.state.caughtBy ?? 'a guard'}${game.state.caughtWhy ? `: ${game.state.caughtWhy}` : ''}.`);
  $('caught-why').textContent = game.state.caughtWhy
    ? `${game.state.caughtWhy[0].toUpperCase()}${game.state.caughtWhy.slice(1)}.`
    : '';
  // A moment to see where it happened (the guard, Leo and the line between them) before the card comes up.
  const done = game.state;
  setTimeout(() => game.state === done && show('caught'), 1700);
}

function escaped(): void {
  const done = game.state;
  setTimeout(() => {
    if (game.state !== done) return;
    leaveHeist();
    const report = () => {
      const r = completeHeist(game.profile, game.level, done);
      if (game.tutorial) game.profile.tutorialDone = true;
      game.tutorial = null;
      persist();
      award(r);
      sfx('whoosh');
      return r;
    };
    sfx('escape');
    if (game.level.def.finale && done.tagged && !game.profile.legendary) return ending(report());
    screens.callingCard(() => {
      const r = report();
      screens.newspaper(r.paper, true, () => showReport(r));
    });
  }, 500);
}
/**
 * The keyboard cursor: the arrow keys move it across the screen, whichever way the camera faces (each key
 * picks the grid direction that looks most like it on screen). It starts on Leo, or on the target when aiming.
 */
function moveCursor(sx: number, sy: number): void {
  if (game.busy || game.state.status !== 'playing') return;
  const from = game.selected ?? { ...game.state.leo };
  let best = { x: 0, y: 0 };
  let score = -Infinity;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [1, -1],
    [-1, 1],
  ]) {
    const d = screenDir(view.proj, dx, dy);
    const len = Math.hypot(d.x, d.y) || 1;
    const sc = (d.x * sx + d.y * sy) / len;
    if (sc > score) {
      score = sc;
      best = { x: dx, y: dy };
    }
  }
  game.selected = {
    x: Math.min(game.level.w - 1, Math.max(0, from.x + best.x)),
    y: Math.min(game.level.h - 1, Math.max(0, from.y + best.y)),
  };
  const a = clickAction(game.selected);
  const cost = computed().reach.cost.get(key(game.selected.x, game.selected.y));
  const ok = document.body.classList.contains('pad')
    ? padName(settings.pad.confirm[0])
    : keyName(settings.keys.confirm[0]);
  say(
    a
      ? `${a.label}: press ${ok}.`
      : cost !== undefined && cost > 0
        ? `${ok}: move here (${moveAp(game.state, cost)} action point${moveAp(game.state, cost) === 1 ? '' : 's'}).`
        : 'Leo can’t get there this turn.',
  );
}

/** The settings, opened mid-heist: the heist waits underneath. */
function openSettingsInHeist(): void {
  screens.settingsScreen(settings, changeSettings, () => screens.hideScreens());
}

/** The finale: a click on NightClaw himself (his body stands above his tile) counts as a click on his tile. */
function nightClawUnder(cx: number, cy: number): Point | null {
  if (!game.inHeist || !game.level?.def.finale) return null;
  const nc = game.state.guards.find((g) => g.kind === 'nightclaw');
  if (!nc) return null;
  const feet = world.toGlobal(project(view.proj, nc.x + 0.5, nc.y + 0.5));
  const head = world.toGlobal(project(view.proj, nc.x + 0.5, nc.y + 0.5, 110));
  const half = Math.max(14, (feet.y - head.y) * 0.3);
  return Math.abs(cx - feet.x) < half && cy < feet.y + half * 0.6 && cy > head.y
    ? { x: nc.x, y: nc.y }
    : null;
}

// --- boot -------------------------------------------------------------------------------------

const app = new Application();
const world = new Container();

async function boot(): Promise<void> {
  await app.init({
    resizeTo: window,
    background: 0x0a0c18,
    antialias: true,
    resolution: Math.min(2, window.devicePixelRatio || 1),
    autoDensity: true,
  });
  screens.setScreenSound((n) => sound.play(n));
  game.artReady = Promise.all([loadProps(), loadCharacters(), loadSurfaces(), loadFlats()]).then(
    () => void (game.artLoaded = true),
    (e) => console.error('Sprites failed to load', e),
  );
  $('stage').appendChild(app.canvas);
  world.addChild(view.root);
  app.stage.addChild(world);

  app.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    game.hover = tileUnder(e.clientX, e.clientY);
    app.canvas.style.cursor =
      game.hover && game.inHeist && (lootHere(game.hover) !== null || boxHere(game.hover)) ? 'pointer' : '';
  });
  app.canvas.addEventListener('pointerleave', () => (game.hover = null));
  app.canvas.addEventListener('pointerdown', (e) => {
    const t = nightClawUnder(e.clientX, e.clientY) ?? tileUnder(e.clientX, e.clientY);
    closeLootMenu();
    if (!t) return;
    if (
      e.pointerType === 'touch' &&
      !clickAction(t) &&
      lootHere(t) === null &&
      !boxHere(t) &&
      (!game.selected || game.selected.x !== t.x || game.selected.y !== t.y)
    ) {
      game.selected = t;
      say('Tap the same tile again to move there.');
      return;
    }
    act(t);
  });

  $('rotate-left').addEventListener('click', () => turnCamera(1));
  $('zoom-in').addEventListener('click', () => zoomBy(1.25));
  $('zoom-out').addEventListener('click', () => zoomBy(0.8));
  app.canvas.addEventListener(
    'wheel',
    (e) => {
      if (!game.inHeist) return;
      e.preventDefault();
      zoomBy(Math.pow(0.9985, e.deltaY));
    },
    { passive: false },
  );
  $('rotate-right').addEventListener('click', () => turnCamera(-1));
  $('end').addEventListener('click', doEndTurn);
  $('restart').addEventListener('click', askRestart);
  $('bag-btn').addEventListener('click', () => toggleBag());
  $('inventory').addEventListener('click', () => toggleBag());
  // The heist's toolbar buttons let go of keyboard focus once clicked: Space and Enter belong to the heist
  // (end the turn, act), and must never press a button that was clicked earlier.
  document
    .querySelector('.hud .buttons')
    ?.addEventListener('click', (e) => (e.target as HTMLElement).closest('button')?.blur());
  $('again').addEventListener('click', restart);
  $('quit').addEventListener('click', quit);
  $('quit2').addEventListener('click', quit);
  $('narrator-face').innerHTML = screens.NARRATOR_SVG;
  $('narrator-ok').addEventListener('click', () => {
    if (!game.tutorial) return;
    game.tutorial.step++;
    tutorialUpdate();
  });
  $('narrator-hide').addEventListener('click', () => {
    if (!game.tutorial) return;
    game.tutorial.hidden = !game.tutorial.hidden;
    tutorialUpdate();
  });
  $('help-toggle').addEventListener('click', () => $('help').classList.toggle('hidden'));
  $('settings-btn').addEventListener('click', openSettingsInHeist);
  // Browsers only allow sound after the player has done something.
  for (const ev of ['pointerdown', 'keydown'] as const)
    window.addEventListener(ev, () => sound.unlock(), { passive: true });
  // Every button in the menus gives a soft click.
  document.addEventListener('pointerdown', (e) => {
    const b = (e.target as HTMLElement).closest?.('button');
    if (b && !b.disabled && !b.closest('#actions')) sound.play('ui');
  });
  window.addEventListener('keyup', (e) => {
    const a = actionForKey(settings.keys, e.key.toLowerCase());
    if (a) panKeys.delete(a);
  });
  window.addEventListener('blur', () => panKeys.clear());
  window.addEventListener('keydown', (e) => {
    // Nothing reaches the heist while a screen (the settings, say) is open over it.
    if (!game.inHeist || !$('screens').classList.contains('hidden')) return;
    if (e.target instanceof HTMLInputElement) return;
    // The leave-the-lair question has the keys (its buttons, Esc to stay) while it's up.
    if (!$('leave-confirm').classList.contains('hidden')) return;
    if (game.lootMenu) {
      // The loot tag has the keys while it's open: its numbers, or Esc to put it away.
      if (/^[1-9]$/.test(e.key)) game.lootChoices[Number(e.key) - 1]?.();
      else if (e.key === 'Escape') closeLootMenu();
      if (/^[1-9]$/.test(e.key) || e.key === 'Escape') return;
    }
    // The keys are the player's own (Settings → Controls); Esc and 1–9 are fixed.
    const k = e.key.toLowerCase();
    const a = actionForKey(settings.keys, k);
    if (a === 'bag') return toggleBag();
    if (e.key === 'Escape' && bagOpen()) return toggleBag(false);
    if (a === 'panUp' || a === 'panLeft' || a === 'panDown' || a === 'panRight') {
      panKeys.add(a);
      return;
    }
    if (a === 'recentre') return recentre();
    const cursor: Partial<Record<KeyAction, [number, number]>> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    if (a && cursor[a]) {
      e.preventDefault();
      moveCursor(...cursor[a]!);
    } else if (a === 'turnLeft') turnCamera(1);
    else if (a === 'zoomIn') zoomBy(1.25);
    else if (a === 'zoomOut') zoomBy(0.8);
    else if (a === 'turnRight') turnCamera(-1);
    else if (a === 'confirm' && game.selected && game.state.status === 'playing') {
      e.preventDefault();
      const t = game.selected;
      act(t);
    } else if (a === 'endTurn' || a === 'confirm') {
      e.preventDefault();
      if (game.state.status === 'playing') doEndTurn();
      else if (game.state.status === 'caught') restart();
    } else if (a === 'restart') {
      if (game.state.status === 'caught') restart();
      else askRestart();
    } else if (e.key === 'Escape') {
      game.selected = null;
      if (game.targeting) cancelTargeting();
    } else if (/^[1-9]$/.test(e.key))
      ($('actions').children[Number(e.key) - 1] as HTMLButtonElement | undefined)?.click();
  });

  // A controller: the map cursor, or the buttons of whatever is open.
  let hudPad = false;
  const blur = () => (document.activeElement as HTMLElement | null)?.blur?.();
  const visibleEl = (id: string) => !$(id).classList.contains('hidden');
  startGamepad({
    padMap: () => settings.pad,
    menuRoot: () => {
      if (visibleEl('screens')) return $('screens');
      if (!game.inHeist) return document.body;
      if (visibleEl('caught')) return $('caught');
      if (visibleEl('leave-confirm')) return $('leave-confirm');
      if (game.lootMenu) return $('loot-menu');
      if (bagOpen()) return $('bag');
      if (hudPad) return document.body;
      return null;
    },
    onMap: () =>
      game.inHeist &&
      !visibleEl('screens') &&
      !visibleEl('caught') &&
      !visibleEl('leave-confirm') &&
      !game.lootMenu &&
      !bagOpen(),
    moveCursor: (dx, dy) => moveCursor(dx, dy),
    confirm: () => {
      if (game.state.status !== 'playing') return;
      if (game.selected) act(game.selected);
      else {
        game.selected = { ...game.state.leo };
        say(
          `Move the cursor with the D-pad or the left stick, then press ${padName(settings.pad.confirm[0])}.`,
        );
      }
    },
    endTurn: () => game.state.status === 'playing' && doEndTurn(),
    bag: () => toggleBag(),
    turnCamera: (d) => turnCamera(d),
    zoomBy: (k) => zoomBy(k),
    pan: (dx, dy) => {
      pan.x += (dx * 900) / world.scale.x;
      pan.y += (dy * 900) / world.scale.y;
    },
    recentre: () => recentre(),
    settings: () => {
      if (game.inHeist && !visibleEl('screens')) openSettingsInHeist();
    },
    toggleHud: () => {
      hudPad = !hudPad;
      if (!hudPad) return blur();
      // Straight to the first action (or gadget) if there is one, otherwise End turn.
      const first = [
        ...document.querySelectorAll<HTMLButtonElement>(
          '#actions button:not(:disabled), #abilities button:not(:disabled)',
        ),
      ].find((b) => b.offsetParent);
      (first ?? $('end')).focus();
      say(
        `The buttons: D-pad to choose, ${padName(settings.pad.confirm[0])} to press, ${padName(settings.pad.cancel[0])} or ${padName(settings.pad.hud[0])} to go back to the map.`,
      );
    },
    cancel: () => {
      if (hudPad) {
        hudPad = false;
        return blur();
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    },
    pressed: () => {
      // A heist button pressed: the map has the controller again (to aim a gadget, say).
      if (hudPad) {
        hudPad = false;
        blur();
      }
    },
    connected: (name) => {
      banner(`Controller connected${name ? `: ${name.replace(/\(.*\)/, '').trim()}` : ''}`);
    },
  });

  // Test hook: lets the browser tests find tiles on screen, read the state and pick a level.
  (window as unknown as { __pc: unknown }).__pc = {
    get state() {
      return game.state;
    },
    get busy() {
      return game.busy;
    },
    get profile() {
      return game.profile;
    },
    get inHeist() {
      return game.inHeist;
    },
    get tutorialStep() {
      return game.tutorial ? (TUTORIAL[game.tutorial.step]?.id ?? 'done') : null;
    },
    startHeist: (id: string) => startHeist(JOBS.find((j) => j.id === id)!),
    levels: JOBS.map((j) => ({ id: j.id, challenge: !!j.challenge, finale: !!j.finale })),
    /** What ending the turn on a tile would bring (once worked out), for the tests. */
    riskAt: (x: number, y: number) => risk.get(key(x, y)),
    /** After a test changes the state directly: work out reach and the rest again. */
    refresh: () => {
      game.version++;
      syncActors();
    },
    lootIndexAt: (x: number, y: number) => lootAt(game.level, x, y),
    /** Clicks a tile, as the mouse would (without having to find it on screen). */
    act: (x: number, y: number) => act({ x, y }),
    get music() {
      return sound.nowPlaying;
    },
    get slot() {
      return game.slot;
    },
    get targeting() {
      return game.targeting;
    },
    screenOf: (x: number, y: number) => world.toGlobal(project(view.proj, x + 0.5, y + 0.5)),
    set slowMotion(k: number) {
      game.slowMotion = k;
    },
    /** Where Leo is drawn right now, mid-step included. */
    leoOnScreen: () => world.toGlobal(project(view.proj, leo.x, leo.y)),
    /** A tile Leo can reach this turn where he'd be caught or set off the alarm. */
    dangerTile: () => {
      for (const [k, cost] of leoReach(game.level, game.state).cost) {
        const [x, y] = k.split(',').map(Number);
        if (cost > 0 && moveAp(game.state, cost) <= game.state.ap && danger(game.level, game.state, { x, y }) === 2)
          return { x, y };
      }
      return null;
    },
  };

  applySettings();
  showTitle();

  app.ticker.add((tk) => {
    // Keep animations in real time on slow machines too (but not a leap after the tab was hidden).
    const dt = Math.min(0.2, tk.deltaMS / 1000);
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
        // Between two steps of the same walk, keep the gait, so there's no flash of standing still.
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
  });
}

/**
 * Frames the heist between the HUD bars. At zoom 1 the whole map fits, whatever the camera angle; zoomed in,
 * the camera follows Leo, but never wanders off the map.
 */
function fit(dt = 0): void {
  const w = app.screen.width;
  const h = app.screen.height;
  // Leave room for the HUD on top and the narrator, actions and message underneath.
  const top = Math.max(
    80,
    (document.querySelector('.hud') as HTMLElement).getBoundingClientRect().bottom + 8,
  );
  const foot = (document.querySelector('.bottom') as HTMLElement).getBoundingClientRect();
  const bottom = Math.max(60, h - foot.top + 8);
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const [x, y] of [
    [0, 0],
    [game.level.w, 0],
    [game.level.w, game.level.h],
    [0, game.level.h],
  ]) {
    for (const z of [0, 90]) {
      const s = project(view.proj, x, y, z);
      x0 = Math.min(x0, s.x);
      x1 = Math.max(x1, s.x);
      y0 = Math.min(y0, s.y);
      y1 = Math.max(y1, s.y);
    }
  }
  const whole = Math.min((w - 24) / (x1 - x0), (h - top - bottom) / (y1 - y0), 1.5);
  game.zoomNow += (game.zoom - game.zoomNow) * (dt ? 1 - Math.exp(-dt * 8) : 1);
  const scale = Math.min(whole * game.zoomNow, 2.2);
  // Follow Leo, easing; the more zoomed in, the more the view centres on him rather than the map.
  const leoAt = project(view.proj, leo.x, leo.y, 30);
  const want = { x: Math.max(x0, Math.min(x1, leoAt.x)), y: Math.max(y0, Math.min(y1, leoAt.y)) };
  if (!game.focus || !dt) game.focus = { ...want };
  else {
    const k = 1 - Math.exp(-dt * 5);
    game.focus.x += (want.x - game.focus.x) * k;
    game.focus.y += (want.y - game.focus.y) * k;
  }
  const t = Math.min(1, (scale / whole - 1) / 0.5);
  // WASD pans the view across the screen at a steady speed, however far zoomed in.
  if (panKeys.size && dt) {
    const speed = (700 / scale) * dt;
    if (panKeys.has('panLeft')) pan.x -= speed;
    if (panKeys.has('panRight')) pan.x += speed;
    if (panKeys.has('panUp')) pan.y -= speed;
    if (panKeys.has('panDown')) pan.y += speed;
  }
  let cx = (x0 + x1) / 2 + (game.focus.x - (x0 + x1) / 2) * t + pan.x;
  let cy = (y0 + y1) / 2 + (game.focus.y - (y0 + y1) / 2) * t + pan.y;
  // Don't show more empty space past the map's edge than the view needs.
  const halfW = (w - 24) / 2 / scale;
  const halfH = (h - top - bottom) / 2 / scale;
  cx = (x1 - x0) / 2 > halfW ? Math.max(x0 + halfW, Math.min(x1 - halfW, cx)) : (x0 + x1) / 2;
  cy = (y1 - y0) / 2 > halfH ? Math.max(y0 + halfH, Math.min(y1 - halfH, cy)) : (y0 + y1) / 2;
  // Keep the pan to what the edges allowed, so holding a key against the edge doesn't wind up.
  pan.x = cx - ((x0 + x1) / 2 + (game.focus.x - (x0 + x1) / 2) * t);
  pan.y = cy - ((y0 + y1) / 2 + (game.focus.y - (y0 + y1) / 2) * t);
  world.scale.set(scale);
  view.setDetail(scale * app.renderer.resolution);
  world.position.set(w / 2 - cx * scale, top + (h - top - bottom) / 2 - cy * scale);
}

boot().catch((e: unknown) => {
  // Without this, a device that can't start the graphics would just show a blank page.
  console.error(e);
  const box = document.getElementById('screens')!;
  box.classList.remove('hidden');
  box.innerHTML = `<div class="screen overlay"><div class="card big"><div class="kicker">Something went wrong</div>
    <h1>The game couldn't start.</h1><p>Your browser couldn't start the graphics. Try another browser, or turn on hardware acceleration.</p>
    <p class="small">${String((e as Error)?.message ?? e).replace(/[<>&]/g, '')}</p></div></div>`;
});
