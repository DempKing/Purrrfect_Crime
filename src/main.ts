// Prototype M5: the whole story, start to credits. One mode, the hardest: no checkpoints, no undo. Save slots; Leo's attributes, skills
// and gadgets in the heist; the lair's rooms; the briefing; rival thieves; NightClaw's letters. Built on the M2 slice
// (tutorial, narrator, paper, black market) and the M1 sandbox.
import { Application, Container } from 'pixi.js';
// Lets PixiJS run on pages with a strict security policy (no eval), such as claude.ai artifacts.
import 'pixi.js/unsafe-eval';
import { parseLevel, the, type Level, type LevelDef, type Point } from './core/level';
import {
  actionsHere,
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
  type State,
} from './core/game';
import { ALL_LEVELS, DISTRICTS } from './levels';
import { CORNER_GALLERY } from './levels/tutorial';
import { buyLair, rivalFor, completeHeist, deleteSlot, loadSlot, loadSlots, narratorBuysTutorialLoot, newProfile, saveSlot, sell, type Profile } from './meta/profile';
import { learn, perksFor, raise, upgrade } from './meta/progression';
import { deliverLetters } from './meta/letters';
import { TUTORIAL, advance, type TutorialEvents } from './meta/tutorial';
import * as screens from './ui/screens';
import { loadCharacters } from './render/characters';
import { ABILITY_ICONS } from './ui/pictures';
import { loadProps } from './render/props';
import { loadSurfaces } from './render/surfaces';
import { HeistView, setPalette, type Actor, type Gait, type Overlay, type Ripple } from './render/view';
import { project, screenDir, unproject } from './render/iso';
import { Sound, soundsInLog, type Sfx, type Tension } from './audio';
import { SPEED_FACTOR, loadSettings, saveSettings, type Settings } from './settings';
import { checkAchievements } from './meta/achievements';

/** Heists on offer at the lair, in order. The tutorial can be replayed like any other. */
const JOBS: LevelDef[] = ALL_LEVELS;

let level: Level = parseLevel(CORNER_GALLERY);
let state: State = newHeist(level);
let inHeist = false;

// --- the save ---------------------------------------------------------------------------------

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
let slot = 0;
let profile: Profile = newProfile();
const persist = () => saveSlot(storage(), slot, profile);

// --- settings and sound ------------------------------------------------------------------------

const sound = new Sound();
const prefersReducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings: Settings = loadSettings(storage(), prefersReducedMotion);
/** Animation time, scaled by the speed setting. */
let slowMotion = 1; // for the browser tests, to catch animations mid-step
const anim = (seconds: number) => seconds * SPEED_FACTOR[settings.speed] * slowMotion;

function applySettings(): void {
  document.body.classList.toggle('large-text', settings.largeText);
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  sound.setLevels(settings.master, settings.music, settings.sfx);
  setPalette(settings.palette);
  version++;
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
  const fresh = checkAchievements(profile, r);
  if (!fresh.length) return;
  persist();
  fresh.forEach((a, i) =>
    setTimeout(() => {
      sfx('achievement');
      screens.toast(a);
    }, i * 900),
  );
}

// --- the narrator's tutorial ------------------------------------------------------------------

let tutorial: { step: number; ev: TutorialEvents; hidden: boolean } | null = null;

function tutorialUpdate(): void {
  const box = $('narrator');
  if (!tutorial || !inHeist) return box.classList.add('hidden');
  tutorial.step = advance(state, tutorial.ev, tutorial.step);
  const step = TUTORIAL[tutorial.step];
  if (!step || state.status !== 'playing') return box.classList.add('hidden');
  box.classList.remove('hidden');
  box.classList.toggle('collapsed', tutorial.hidden);
  $('narrator-text').textContent = step.text;
  $('narrator-count').textContent = `Tip ${tutorial.step + 1} of ${TUTORIAL.length}`;
  $('narrator-ok').classList.toggle('hidden', !step.optional);
}

const $ = (id: string) => document.getElementById(id)!;
const money = (n: number) => `$${n.toLocaleString('en-US')}`;

// --- display state: where things are drawn, which lags the rules while animating -----------------

const leo: Actor = { x: 0, y: 0, facing: 0, bob: 0 };
let guards: Actor[] = [];
const rival: Actor = { x: 0, y: 0, facing: 0, bob: 0 };
function syncActors(): void {
  leo.x = state.leo.x + 0.5;
  leo.y = state.leo.y + 0.5;
  guards = state.guards.map((g) => ({ x: g.x + 0.5, y: g.y + 0.5, facing: g.facing, bob: 0 }));
  if (state.rival) {
    rival.x = state.rival.x + 0.5;
    rival.y = state.rival.y + 0.5;
    rival.facing = state.rival.facing;
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
/** 1 shows the whole map; more is closer in, following Leo. */
const ZOOM_START = 1.9;
const ZOOM_MAX = 3;
let zoom = ZOOM_START;
let zoomNow = ZOOM_START;
/** The point the camera looks at (in the world's own coordinates), easing after Leo. */
let focus: { x: number; y: number } | null = null;

function zoomBy(k: number): void {
  zoom = Math.max(1, Math.min(ZOOM_MAX, zoom * k));
}

/** Turns the camera so it looks over Leo's shoulder: he's nearest the camera, the level stretches away. */
function cameraBehindLeo(): void {
  let best = 0;
  let bestDepth = -Infinity;
  for (let k = 0; k < 4; k++) {
    const d = project({ angle: (k * Math.PI) / 2, cx: view.proj.cx, cy: view.proj.cy }, state.leo.x + 0.5, state.leo.y + 0.5).depth;
    if (d > bestDepth + 0.01) {
      bestDepth = d;
      best = k;
    }
  }
  targetAngle = (best * Math.PI) / 2;
  view.proj.angle = targetAngle;
  zoom = zoomNow = ZOOM_START;
  focus = null;
}
const view = new HeistView();

function turnCamera(dir: 1 | -1): void {
  targetAngle += (dir * Math.PI) / 2;
  if (tutorial) {
    tutorial.ev.rotated = true;
    tutorialUpdate();
  }
}

// --- input and preview ------------------------------------------------------------------------

let hover: Point | null = null;
let selected: Point | null = null; // touch: first tap previews, second tap confirms
let version = 0;
let cache: { v: number; reach: ReturnType<typeof leoReach>; vision: Set<string>; cameraVision: Set<string>; footprints: Point[]; rivalPath: Point[] } | null = null;

function computed() {
  if (!cache || cache.v !== version) {
    const vision = new Set<string>();
    for (const g of state.guards) for (const k of guardView(level, state, g)) vision.add(k);
    const cameraVision = new Set<string>();
    if (!state.camerasOff) for (const c of state.cameras) for (const k of cameraView(level, state, c)) cameraVision.add(k);
    const footprints = planGuards(level, state).flat();
    cache = { v: version, reach: leoReach(level, state), vision, cameraVision, footprints, rivalPath: planRival(level, state) };
  }
  return cache;
}

function overlay(): Overlay {
  const c = computed();
  const reach1 = new Set<string>();
  const reach2 = new Set<string>();
  const live = state.status === 'playing' && !busy;
  if (targeting && live) {
    const targets = abilityTargets(level, state, targeting);
    const target = selected ?? hover;
    return { reach1, reach2, vision: c.vision, cameraVision: c.cameraVision, footprints: c.footprints, path: [], pathDanger: new Map(), hover: target && targets.has(key(target.x, target.y)) ? target : null, targets, rivalPath: c.rivalPath };
  }
  if (live)
    for (const [k, cost] of c.reach.cost) {
      if (cost === 0) continue;
      const ap = moveAp(state, cost);
      if (ap > state.ap) continue;
      (ap === 1 ? reach1 : reach2).add(k);
    }
  const target = selected ?? hover;
  let path: Point[] = [];
  const pathDanger = new Map<string, number>();
  if (target && live) {
    path = pathTo(c.reach, target) ?? [];
    if (path.length && moveAp(state, c.reach.cost.get(key(target.x, target.y)) ?? 99) > state.ap) path = [];
    for (const p of path.slice(1)) {
      const d = danger(level, state, p);
      if (d) pathDanger.set(key(p.x, p.y), d);
    }
    // Two steps inside a motion-sensor zone in one move trips it.
    const trip = motionTrip(level, state, path);
    if (trip > 0) for (const p of path.slice(trip)) pathDanger.set(key(p.x, p.y), 2);
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
    targets: new Set(),
    rivalPath: state.status === 'playing' ? c.rivalPath : [],
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
  if (targeting) {
    if (abilityTargets(level, state, targeting).has(key(tile.x, tile.y))) return runAbility(targeting, tile);
    return cancelTargeting();
  }
  const a = clickAction(tile);
  if (a) return runAction(a);
  state.log = [];
  const apBefore = state.ap;
  const res = moveLeo(level, state, tile);
  if (!res.ok) return say(res.reason ?? '');
  if (tutorial) {
    tutorial.ev.moved = true;
    if (apBefore - state.ap === 2) tutorial.ev.dashed = true;
    if (state.layer === 'floor' && res.path.some((p) => level.tiles[p.y][p.x] === 'marble')) tutorial.ev.onMarble = true;
  }
  selected = null;
  version++;
  const segs: Segment[] = [];
  const crawl = state.layer === 'vent' ? 1.4 : 1; // beams are walked at the usual pace
  const layer = state.layer;
  // Leo crawls in the vents, runs when he dashes, and creeps when he's heading into the dark.
  const dark = lightMap(level, state.lampsOff);
  const dash = apBefore - state.ap >= 2;
  for (let i = 1; i < res.path.length; i++) {
    const p = res.path[i - 1];
    const q = res.path[i];
    const t = level.tiles[q.y][q.x];
    const step: Sfx = layer === 'vent' ? 'vent' : t === 'marble' ? 'step-marble' : 'step-carpet';
    const gait: Gait = layer === 'vent' ? 'crawl' : dash ? 'run' : layer === 'floor' && dark[q.y][q.x] === 0 ? 'sneak' : 'walk';
    segs.push({ who: 'leo', from: p, to: q, facing: faceToward(p, q), t: 0, dur: anim((p.x !== q.x && p.y !== q.y ? 0.17 : 0.12) * crawl * (gait === 'sneak' ? 1.25 : 1)), sfx: layer === 'vent' && i % 2 ? undefined : step, gait });
  }
  play(segs, afterLeoActs);
}

function runAction(a: Action): void {
  if (busy || state.status !== 'playing') return;
  if (a.blocked) return say(a.blocked);
  state.log = [];
  if (!doAction(level, state, a.kind, a.at)) return say('Leo can’t do that right now.');
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
    'enter-vent': 'vent',
    'exit-vent': 'vent',
    'climb-up': 'door',
    'climb-down': 'door',
    drop: 'door',
    tap: 'tap',
  };
  const snd = actionSound[a.kind];
  if (snd) sfx(snd);
  if (a.kind !== 'enter-vent' && a.kind !== 'exit-vent' && a.kind !== 'climb-up' && a.kind !== 'climb-down' && a.kind !== 'drop') leo.work = 1;
  if (state.inventory.length && a.kind !== 'take' && /^Got /.test(state.log.join(' '))) sfx('take');
  selected = null;
  version++;
  afterLeoActs();
  if (a.at.x !== state.leo.x || a.at.y !== state.leo.y) leo.facing = faceToward(state.leo, a.at);
}

// --- gadgets and skills ---------------------------------------------------------------------------

let targeting: Ability | null = null;

function startAbility(kind: Ability): void {
  if (busy || state.status !== 'playing') return;
  if (targeting === kind) return cancelTargeting();
  const a = abilities(level, state).find((x) => x.kind === kind);
  if (!a) return;
  if (a.blocked) return say(a.blocked);
  if (a.target === 'self') return runAbility(kind);
  targeting = kind;
  selected = null;
  say(a.target === 'camera' ? `${a.name}: click a camera within reach. Esc to cancel.` : `${a.name}: click one of the highlighted tiles. Esc to cancel.`);
  updateHud();
}

function cancelTargeting(): void {
  targeting = null;
  say('');
  updateHud();
}

function runAbility(kind: Ability, at?: Point): void {
  const from = { ...state.leo };
  state.log = [];
  targeting = null;
  if (!useAbility(level, state, kind, at)) {
    updateHud();
    return say('Leo can’t do that right now.');
  }
  selected = null;
  version++;
  sfx(kind === 'bottle-cap' ? 'clink' : kind === 'pounce' ? 'pounce' : kind === 'smoke' ? 'whoosh' : 'beep');
  if (kind === 'pounce') return play([{ who: 'leo', from, to: { ...state.leo }, facing: faceToward(from, state.leo), t: 0, dur: anim(0.35), leap: true }], afterLeoActs);
  afterLeoActs();
  if (at) leo.facing = faceToward(state.leo, at);
}

function afterLeoActs(): void {
  spawnRipples();
  syncActors();
  updateHud();
  if (state.log.length) say(state.log.join(' '));
  sfx(...soundsInLog(state.log));
  tutorialUpdate();
  if (state.status === 'caught') return caught();
  if (state.status === 'escaped') return escaped();
  if (state.ap <= 0) setTimeout(() => !busy && state.status === 'playing' && state.ap <= 0 && doEndTurn(), anim(450) + 50);
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
  let rivalAt = { x: rival.x - 0.5, y: rival.y - 0.5 };
  const segs: Segment[] = steps.map((s) => {
    if (s.guard === -1) {
      // The rival's first step is their arrival: they appear there, rather than walking in from nowhere.
      const from = rivalWasIn ? rivalAt : { x: s.to.x, y: s.to.y };
      rivalWasIn = true;
      rivalAt = { x: s.to.x, y: s.to.y };
      return { who: -1, from, to: { x: s.to.x, y: s.to.y }, facing: s.to.facing, t: 0, dur: anim(0.16), gait: 'run' };
    }
    const from = last[s.guard];
    last[s.guard] = { x: s.to.x, y: s.to.y };
    const hurry = state.guards[s.guard]?.mode === 'searching';
    return { who: s.guard, from, to: { x: s.to.x, y: s.to.y }, facing: s.to.facing, t: 0, dur: anim(hurry ? 0.17 : 0.22), gait: hurry ? 'run' : 'walk' };
  });
  busy = segs.length > 0;
  updateHud();
  sfx(...soundsInLog(state.log));
  play(segs, () => {
    syncActors();
    updateHud();
    if (state.log.length) say(state.log.join(' '));
    tutorialUpdate();
    if (state.status === 'caught') return caught();
    updateHud();
    // Still asleep after a Cat Nap: the guards go again.
    if (state.ap <= 0) {
      banner('Zzz…');
      setTimeout(() => !busy && state.status === 'playing' && state.ap <= 0 && doEndTurn(), anim(700) + 50);
      return;
    }
    banner(state.alarm !== null ? `Alarm! ${state.alarm} turns` : 'Your turn');
  });
}

/** Tonight's rival for a heist: never in the tutorial; otherwise rolled once and kept until it's played. */
function rivalPlanFor(def: LevelDef): RivalPlan | null {
  if (def.id === CORNER_GALLERY.id) return null;
  const district = DISTRICTS.findIndex((d) => d.levels.includes(def));
  const plan = rivalFor(profile, def, Math.max(0, district));
  persist();
  return plan;
}

let rivalPlan: RivalPlan | null = null;
let rivalWasIn = false;

function startHeist(def: LevelDef): void {
  rivalPlan = rivalPlanFor(def);
  level = parseLevel(def);
  view.proj.cx = level.w / 2;
  view.proj.cy = level.h / 2;
  $('level-name').textContent = level.def.name;
  tutorial = def.id === CORNER_GALLERY.id && !profile.tutorialDone ? { step: 0, ev: { moved: false, dashed: false, rotated: false, onMarble: false }, hidden: !settings.hints } : null;
  screens.hideScreens();
  inHeist = true;
  document.body.classList.remove('meta');
  restart();
  cameraBehindLeo();
}

/** Leaves the heist for the screens between heists. */
function leaveHeist(): void {
  inHeist = false;
  queue = [];
  busy = false;
  hide('caught');
  hide('help');
  targeting = null;
  $('narrator').classList.add('hidden');
  document.body.classList.add('meta');
  sound.setTension(1);
}

// --- between heists ---------------------------------------------------------------------------

function goOn(): void {
  leaveHeist();
  if (!profile.tutorialDone) return startHeist(CORNER_GALLERY);
  if (!profile.narratorPaid) return narratorPays();
  if (!profile.lairOwned) return cityMap();
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
    () => screens.legendaryCard(() => screens.credits(() => screens.newspaper(r.paper, true, () => screens.heistReport(r, profile, goOn)))),
    nc,
  );
}

function narratorPays(): void {
  leaveHeist();
  screens.narratorScene(
    [
      'Not bad for a first night, kid. Not bad at all.',
      'Now, nobody in this city will touch loot from a cat they\'ve never heard of. So I\'ll buy the lot myself: the pearl, the brooch and the mouse. Call it an investment.',
      'Here: <b>500 Catnip</b>. Don\'t spend it on sardines.',
      'One more thing. A thief needs a headquarters, somewhere to plan, to stash the goods and to meet the right people. I know just the place.',
    ],
    'Show me',
    () => {
      narratorBuysTutorialLoot(profile, CORNER_GALLERY.id);
      persist();
      cityMap();
    },
  );
}

function cityMap(): void {
  leaveHeist();
  screens.cityMap(profile, () => {
    if (!buyLair(profile)) return;
    persist();
    screens.narratorScene(
      [
        'It\'s yours. Leaky roof, boarded windows, one light bulb. Home sweet home.',
        'The back room has a door onto the black market: sell your loot there for Catnip. The fences pay better as you make a name for yourself.',
        'Every heist makes the morning paper, and every paper keeps a tally of what you took. Start small: the Cobblestone Coin Museum, here in Old Town. Good luck, kid.',
      ],
      'Enter the lair',
      () => showLair(),
    );
  });
}

function showLair(tab: screens.LairTab = 'heists'): void {
  leaveHeist();
  // NightClaw's letters wait at the door until they've been read.
  deliverLetters(profile);
  award();
  const unread = profile.letters.find((l) => !l.read);
  if (unread) {
    persist();
    sfx('chime');
    return screens.letter(unread, profile, () => {
      unread.read = true;
      persist();
      showLair(tab);
    });
  }
  screens.lair(
    profile,
    {
      jobs: JOBS,
      districts: DISTRICTS,
      onHeist: (def) => screens.briefing(def, profile, rivalPlanFor(def), () => startHeist(def), () => showLair()),
      onSell: (id) => {
        sell(profile, id);
        persist();
        showLair('market');
      },
      onSellAll: () => {
        for (const s of [...profile.stash]) sell(profile, s.id);
        persist();
        showLair('market');
      },
      onPaper: (i) => screens.newspaper(profile.papers[i], false, () => showLair('papers'), 'Back to the lair'),
      onRaise: (id) => {
        raise(profile, id);
        persist();
        showLair('leo');
      },
      onLearn: (id) => {
        learn(profile, id);
        persist();
        showLair('leo');
      },
      onUpgrade: (id) => {
        upgrade(profile, id);
        persist();
        showLair('lair');
      },
      onLetter: (i) => screens.letter(profile.letters[i], profile, () => showLair('lair'), 'Back to the lair'),
      onSettings: () => screens.settingsScreen(settings, changeSettings, () => showLair(tab)),
      onQuit: showTitle,
    },
    tab,
  );
}

function quit(): void {
  if (!profile.lairOwned) return showTitle();
  showLair();
}

function showTitle(): void {
  leaveHeist();
  screens.titleScreen(loadSlots(storage()), {
    onPlay: (i) => {
      const p = loadSlot(storage(), i);
      if (!p) return showTitle();
      slot = i;
      profile = p;
      goOn();
    },
    onNew: (i) => {
      slot = i;
      profile = newProfile();
      persist();
      startHeist(CORNER_GALLERY);
    },
    onDelete: (i) => {
      deleteSlot(storage(), i);
      showTitle();
    },
    onSettings: () => screens.settingsScreen(settings, changeSettings, showTitle),
  });
}

function restart(): void {
  state = newHeist(level, perksFor(profile), rivalPlan);
  rivalWasIn = false;
  targeting = null;
  queue = [];
  busy = false;
  afterAnim = null;
  selected = null;
  ripples = [];
  noisesSeen = 0;
  version++;
  syncActors();
  hide('caught');
  updateHud();
  banner('Your turn');
  say(level.def.objective);
  if (tutorial) tutorial.ev = { moved: false, dashed: false, rotated: tutorial.ev.rotated, onMarble: false };
  tutorialUpdate();
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
  const extras = [state.card === 'leo' ? 'keycard' : '', state.combination ? 'the combination' : ''].filter(Boolean).join(', ');
  $('inventory').innerHTML = `Inventory <b>${inventoryUsed(level, state)}/${state.perks.spaces}</b> · ${money(inventoryValue(level, state))}${extras ? ` · ${extras}` : ''}`;
  // The race, if there is one. Before they arrive, only a good Planning Table says when.
  const r = state.rival;
  const rl = $('rival');
  const prize = level.def.loot.find((l) => level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y)?.name ?? 'prize';
  const rivalText = !r
    ? ''
    : r.phase === 'waiting'
      ? profile.rooms.planning >= 2
        ? `${r.name} arrives on turn ${r.arrive}`
        : profile.rooms.planning >= 1
          ? `${r.name} is coming tonight`
          : ''
      : r.phase === 'in'
        ? `${r.name} is after ${the(prize)}!`
        : r.phase === 'leaving'
          ? `${r.name} has ${the(prize)} and is getting away`
          : state.rivalBeaten
            ? `You beat ${r.name} to it`
            : state.rivalLoot.length
              ? `${r.name} got away with ${the(prize)}`
              : `${r.name} has fled`;
  const lock = level.def.timeLock && state.turn < level.def.timeLock ? `Time lock opens on turn ${level.def.timeLock}` : '';
  const tide = level.def.tide ? `${flooded(level, state) ? 'High' : 'Low'} tide · it turns in ${tideTurnsLeft(level, state)} turn${tideTurnsLeft(level, state) === 1 ? '' : 's'}` : '';
  rl.textContent = [rivalText, tide, lock].filter(Boolean).join(' · ');
  rl.classList.toggle('hidden', !rivalText && !tide && !lock);
  const hidden = hiddenAt(level, state, state.leo);
  const l = state.layer !== 'floor' || hidden ? -1 : lightNow(level, state, state.leo.x, state.leo.y);
  const li = $('light');
  li.textContent = hidden ? 'In a crate' : l < 0 ? (state.layer === 'vent' ? 'In the vents' : 'In the rafters') : LIGHT_NAMES[l];
  li.className = `light l${l < 0 ? 'v' : l}`;
  const al = $('alarm');
  if (state.alarm !== null && state.status === 'playing') {
    al.textContent = `ALARM · lockdown in ${state.alarm} turn${state.alarm === 1 ? '' : 's'}${state.camerasOff ? '' : ' · shut it off at the camera panel'}`;
    show('alarm');
  } else hide('alarm');
  ($('end') as HTMLButtonElement).disabled = busy || state.status !== 'playing';
  const tension: Tension = state.status !== 'playing' ? 1 : state.alarm !== null ? 3 : state.guards.some((g) => !g.asleep && g.mode !== 'patrol') ? 2 : 1;
  sound.setTension(tension);

  // Gadgets and active skills, with what's left of each.
  const ab = $('abilities');
  const list = state.status === 'playing' ? abilities(level, state) : [];
  ab.innerHTML = '';
  for (const a of list) {
    const b = document.createElement('button');
    b.className = `ability${targeting === a.kind ? ' on' : ''}`;
    b.dataset.ability = a.kind;
    b.disabled = busy || (!!a.blocked && targeting !== a.kind);
    b.title = a.blocked ?? `${a.ap} action point`;
    const icon = ABILITY_ICONS[a.kind];
    b.innerHTML = `${icon ? `<img class="ab-icon" src="${icon}" alt="">` : ''}${a.name}${a.left < 99 ? ` <span class="count">×${a.left}</span>` : ''}`;
    b.addEventListener('click', () => startAbility(a.kind));
    ab.appendChild(b);
  }
  ab.classList.toggle('hidden', list.length === 0);

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
  sfx('caught');
  $('caught-who').textContent = state.caughtBy ?? 'A guard';
  $('caught-why').textContent = state.caughtWhy ? `${state.caughtWhy}.` : '';
  setTimeout(() => show('caught'), 600);
}

function escaped(): void {
  const done = state;
  setTimeout(() => {
    if (state !== done) return;
    leaveHeist();
    const report = () => {
      const r = completeHeist(profile, level, done);
      if (tutorial) profile.tutorialDone = true;
      tutorial = null;
      persist();
      award(r);
      sfx('whoosh');
      return r;
    };
    sfx('escape');
    if (level.def.finale && done.tagged && !profile.legendary) return ending(report());
    screens.callingCard(() => {
      const r = report();
      screens.newspaper(r.paper, true, () => screens.heistReport(r, profile, goOn));
    });
  }, 500);
}
/**
 * The keyboard cursor: the arrow keys move it across the screen, whichever way the camera faces (each key
 * picks the grid direction that looks most like it on screen). It starts on Leo, or on the target when aiming.
 */
function moveCursor(sx: number, sy: number): void {
  if (busy || state.status !== 'playing') return;
  const from = selected ?? { ...state.leo };
  let best = { x: 0, y: 0 };
  let score = -Infinity;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
    const d = screenDir(view.proj, dx, dy);
    const len = Math.hypot(d.x, d.y) || 1;
    const sc = (d.x * sx + d.y * sy) / len;
    if (sc > score) {
      score = sc;
      best = { x: dx, y: dy };
    }
  }
  selected = { x: Math.min(level.w - 1, Math.max(0, from.x + best.x)), y: Math.min(level.h - 1, Math.max(0, from.y + best.y)) };
  const a = clickAction(selected);
  const cost = computed().reach.cost.get(key(selected.x, selected.y));
  say(a ? `${a.label}: press Enter.` : cost !== undefined && cost > 0 ? `Enter: move here (${moveAp(state, cost)} action point${moveAp(state, cost) === 1 ? '' : 's'}).` : 'Leo can’t get there this turn.');
}

/** The settings, opened mid-heist: the heist waits underneath. */
function openSettingsInHeist(): void {
  screens.settingsScreen(settings, changeSettings, () => screens.hideScreens());
}

// --- boot -------------------------------------------------------------------------------------

const app = new Application();
const world = new Container();

async function boot(): Promise<void> {
  await app.init({ resizeTo: window, background: 0x0a0c18, antialias: true, resolution: Math.min(2, window.devicePixelRatio || 1), autoDensity: true });
  Promise.all([loadProps(), loadCharacters(), loadSurfaces()]).catch((e) => console.error('Sprites failed to load', e));
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


  $('rotate-left').addEventListener('click', () => turnCamera(1));
  $('zoom-in').addEventListener('click', () => zoomBy(1.25));
  $('zoom-out').addEventListener('click', () => zoomBy(0.8));
  app.canvas.addEventListener(
    'wheel',
    (e) => {
      if (!inHeist) return;
      e.preventDefault();
      zoomBy(Math.pow(0.9985, e.deltaY));
    },
    { passive: false },
  );
  $('rotate-right').addEventListener('click', () => turnCamera(-1));
  $('end').addEventListener('click', doEndTurn);
  $('restart').addEventListener('click', restart);
  $('again').addEventListener('click', restart);
  $('quit').addEventListener('click', quit);
  $('quit2').addEventListener('click', quit);
  $('narrator-face').innerHTML = screens.NARRATOR_SVG;
  $('narrator-ok').addEventListener('click', () => {
    if (!tutorial) return;
    tutorial.step++;
    tutorialUpdate();
  });
  $('narrator-hide').addEventListener('click', () => {
    if (!tutorial) return;
    tutorial.hidden = !tutorial.hidden;
    tutorialUpdate();
  });
  $('help-toggle').addEventListener('click', () => $('help').classList.toggle('hidden'));
  $('settings-btn').addEventListener('click', openSettingsInHeist);
  // Browsers only allow sound after the player has done something.
  for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, () => sound.unlock(), { passive: true });
  window.addEventListener('keydown', (e) => {
    // Nothing reaches the heist while a screen (the settings, say) is open over it.
    if (!inHeist || !$('screens').classList.contains('hidden')) return;
    if (e.target instanceof HTMLInputElement) return;
    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (e.key in arrows) {
      e.preventDefault();
      moveCursor(...arrows[e.key]);
    } else if (e.key === 'q' || e.key === 'Q') turnCamera(1);
    else if (e.key === '+' || e.key === '=') zoomBy(1.25);
    else if (e.key === '-' || e.key === '_') zoomBy(0.8);
    else if (e.key === 'e' || e.key === 'E') turnCamera(-1);
    else if (e.key === 'Enter' && selected && state.status === 'playing') {
      e.preventDefault();
      const t = selected;
      act(t);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state.status === 'playing') doEndTurn();
      else restart();
    } else if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 'Escape') {
      selected = null;
      if (targeting) cancelTargeting();
    }
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
    get profile() {
      return profile;
    },
    get inHeist() {
      return inHeist;
    },
    get tutorialStep() {
      return tutorial ? TUTORIAL[tutorial.step]?.id ?? 'done' : null;
    },
    startHeist: (id: string) => startHeist(JOBS.find((j) => j.id === id)!),
    levels: JOBS.map((j) => ({ id: j.id, challenge: !!j.challenge, finale: !!j.finale })),
    get slot() {
      return slot;
    },
    get targeting() {
      return targeting;
    },
    screenOf: (x: number, y: number) => world.toGlobal(project(view.proj, x + 0.5, y + 0.5)),
    set slowMotion(k: number) {
      slowMotion = k;
    },
    /** Where Leo is drawn right now, mid-step included. */
    leoOnScreen: () => world.toGlobal(project(view.proj, leo.x, leo.y)),
    /** A tile Leo can reach this turn where he'd be caught or set off the alarm. */
    dangerTile: () => {
      for (const [k, cost] of leoReach(level, state).cost) {
        const [x, y] = k.split(',').map(Number);
        if (cost > 0 && moveAp(state, cost) <= state.ap && danger(level, state, { x, y }) === 2) return { x, y };
      }
      return null;
    },
  };

  applySettings();
  showTitle();

  app.ticker.add((tk) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    view.time += dt;
    view.proj.angle += (targetAngle - view.proj.angle) * (1 - Math.exp(-dt * 10));
    if (queue.length) {
      const seg = queue[0];
      if (seg.t === 0 && seg.sfx) sound.play(seg.sfx);
      seg.t += dt / seg.dur;
      const k = Math.min(1, seg.t);
      const a = seg.who === 'leo' ? leo : seg.who === -1 ? rival : guards[seg.who];
      const x = seg.from.x + 0.5 + (seg.to.x - seg.from.x) * k;
      const y = seg.from.y + 0.5 + (seg.to.y - seg.from.y) * k;
      // The stride follows the distance covered (two frames a tile), so feet don't slide.
      if (seg.t > dt / seg.dur) a.phase = (a.phase ?? 0) + Math.hypot(x - a.x, y - a.y);
      a.x = x;
      a.y = y;
      a.facing = seg.facing;
      a.gait = seg.leap ? 'leap' : seg.gait ?? 'walk';
      a.leapT = k;
      a.bob = seg.leap ? Math.sin(k * Math.PI) * 34 : 0;
      if (seg.t >= 1) {
        a.bob = 0;
        queue.shift();
        // Between two steps of the same walk, keep the gait, so there's no flash of standing still.
        if (queue[0]?.who !== seg.who) a.gait = undefined;
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
    if (!inHeist) return;
    fit(dt);
    view.draw(level, state, overlay(), leo, guards, ripples, rival);
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
  const top = Math.max(80, (document.querySelector('.hud') as HTMLElement).getBoundingClientRect().bottom + 8);
  const foot = (document.querySelector('.bottom') as HTMLElement).getBoundingClientRect();
  const bottom = Math.max(60, h - foot.top + 8);
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
  const whole = Math.min((w - 24) / (x1 - x0), (h - top - bottom) / (y1 - y0), 1.5);
  zoomNow += (zoom - zoomNow) * (dt ? 1 - Math.exp(-dt * 8) : 1);
  const scale = Math.min(whole * zoomNow, 2.2);
  // Follow Leo, easing; the more zoomed in, the more the view centres on him rather than the map.
  const leoAt = project(view.proj, leo.x, leo.y, 30);
  const want = { x: Math.max(x0, Math.min(x1, leoAt.x)), y: Math.max(y0, Math.min(y1, leoAt.y)) };
  if (!focus || !dt) focus = { ...want };
  else {
    const k = 1 - Math.exp(-dt * 5);
    focus.x += (want.x - focus.x) * k;
    focus.y += (want.y - focus.y) * k;
  }
  const t = Math.min(1, (scale / whole - 1) / 0.5);
  let cx = (x0 + x1) / 2 + (focus.x - (x0 + x1) / 2) * t;
  let cy = (y0 + y1) / 2 + (focus.y - (y0 + y1) / 2) * t;
  // Don't show more empty space past the map's edge than the view needs.
  const halfW = (w - 24) / 2 / scale;
  const halfH = (h - top - bottom) / 2 / scale;
  cx = (x1 - x0) / 2 > halfW ? Math.max(x0 + halfW, Math.min(x1 - halfW, cx)) : (x0 + x1) / 2;
  cy = (y1 - y0) / 2 > halfH ? Math.max(y0 + halfH, Math.min(y1 - halfH, cy)) : (y0 + y1) / 2;
  world.scale.set(scale);
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
