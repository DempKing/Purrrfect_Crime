// Prototype M4: content. One mode, the hardest: no checkpoints, no undo. Save slots; Leo's attributes, skills
// and gadgets in the heist; the lair's rooms; the briefing; rival thieves; NightClaw's letters. Built on the M2 slice
// (tutorial, narrator, paper, black market) and the M1 sandbox.
import { Application, Container } from 'pixi.js';
// Lets PixiJS run on pages with a strict security policy (no eval), such as claude.ai artifacts.
import 'pixi.js/unsafe-eval';
import { parseLevel, type Level, type LevelDef, type Point } from './core/level';
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
import { HeistView, type Actor, type Overlay, type Ripple } from './render/view';
import { project, unproject } from './render/iso';

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
  from: Point;
  to: Point;
  facing: number;
  t: number;
  dur: number;
  leap?: boolean; // a Pounce: a high arc instead of a walk
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
  if (kind === 'pounce') return play([{ who: 'leo', from, to: { ...state.leo }, facing: faceToward(from, state.leo), t: 0, dur: 0.35, leap: true }], afterLeoActs);
  afterLeoActs();
  if (at) leo.facing = faceToward(state.leo, at);
}

function afterLeoActs(): void {
  spawnRipples();
  syncActors();
  updateHud();
  if (state.log.length) say(state.log.join(' '));
  tutorialUpdate();
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
  let rivalAt = { x: rival.x - 0.5, y: rival.y - 0.5 };
  const segs: Segment[] = steps.map((s) => {
    if (s.guard === -1) {
      // The rival's first step is their arrival: they appear there, rather than walking in from nowhere.
      const from = rivalWasIn ? rivalAt : { x: s.to.x, y: s.to.y };
      rivalWasIn = true;
      rivalAt = { x: s.to.x, y: s.to.y };
      return { who: -1, from, to: { x: s.to.x, y: s.to.y }, facing: s.to.facing, t: 0, dur: 0.16 };
    }
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
    tutorialUpdate();
    if (state.status === 'caught') return caught();
    updateHud();
    // Still asleep after a Cat Nap: the guards go again.
    if (state.ap <= 0) {
      banner('Zzz…');
      setTimeout(() => !busy && state.status === 'playing' && state.ap <= 0 && doEndTurn(), 700);
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
  tutorial = def.id === CORNER_GALLERY.id && !profile.tutorialDone ? { step: 0, ev: { moved: false, dashed: false, rotated: false, onMarble: false }, hidden: false } : null;
  screens.hideScreens();
  inHeist = true;
  document.body.classList.remove('meta');
  restart();
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
}

// --- between heists ---------------------------------------------------------------------------

function goOn(): void {
  leaveHeist();
  if (!profile.tutorialDone) return startHeist(CORNER_GALLERY);
  if (!profile.narratorPaid) return narratorPays();
  if (!profile.lairOwned) return cityMap();
  showLair();
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
  const unread = profile.letters.find((l) => !l.read);
  if (unread) {
    persist();
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
        ? `${r.name} is after the ${prize}!`
        : r.phase === 'leaving'
          ? `${r.name} has the ${prize} and is getting away`
          : state.rivalBeaten
            ? `You beat ${r.name} to it`
            : state.rivalLoot.length
              ? `${r.name} got away with the ${prize}`
              : `${r.name} has fled`;
  rl.textContent = rivalText;
  rl.classList.toggle('hidden', !rivalText);
  const l = state.layer !== 'floor' ? -1 : lightNow(level, state, state.leo.x, state.leo.y);
  const li = $('light');
  li.textContent = l < 0 ? (state.layer === 'vent' ? 'In the vents' : 'In the rafters') : LIGHT_NAMES[l];
  li.className = `light l${l < 0 ? 'v' : l}`;
  const al = $('alarm');
  if (state.alarm !== null && state.status === 'playing') {
    al.textContent = `ALARM · lockdown in ${state.alarm} turn${state.alarm === 1 ? '' : 's'}${state.camerasOff ? '' : ' · shut it off at the camera panel'}`;
    show('alarm');
  } else hide('alarm');
  ($('end') as HTMLButtonElement).disabled = busy || state.status !== 'playing';

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
    b.innerHTML = `${a.name}${a.left < 99 ? ` <span class="count">×${a.left}</span>` : ''}`;
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
  $('caught-who').textContent = state.caughtBy ?? 'A guard';
  $('caught-why').textContent = state.caughtWhy ? `${state.caughtWhy}.` : '';
  setTimeout(() => show('caught'), 600);
}

function escaped(): void {
  const done = state;
  setTimeout(() => {
    if (state !== done) return;
    leaveHeist();
    screens.callingCard(() => {
      const report = completeHeist(profile, level, done);
      if (tutorial) profile.tutorialDone = true;
      tutorial = null;
      persist();
      screens.newspaper(report.paper, true, () => screens.heistReport(report, profile, goOn));
    });
  }, 500);
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


  $('rotate-left').addEventListener('click', () => turnCamera(1));
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
  window.addEventListener('keydown', (e) => {
    if (!inHeist) return;
    if (e.key === 'q' || e.key === 'Q') turnCamera(1);
    else if (e.key === 'e' || e.key === 'E') turnCamera(-1);
    else if (e.key === ' ' || e.key === 'Enter') {
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
    get slot() {
      return slot;
    },
    get targeting() {
      return targeting;
    },
    screenOf: (x: number, y: number) => world.toGlobal(project(view.proj, x + 0.5, y + 0.5)),
    /** A tile Leo can reach this turn where he'd be caught or set off the alarm. */
    dangerTile: () => {
      for (const [k, cost] of leoReach(level, state).cost) {
        const [x, y] = k.split(',').map(Number);
        if (cost > 0 && moveAp(state, cost) <= state.ap && danger(level, state, { x, y }) === 2) return { x, y };
      }
      return null;
    },
  };

  showTitle();

  app.ticker.add((tk) => {
    const dt = Math.min(0.05, tk.deltaMS / 1000);
    view.time += dt;
    view.proj.angle += (targetAngle - view.proj.angle) * (1 - Math.exp(-dt * 10));
    if (queue.length) {
      const seg = queue[0];
      seg.t += dt / seg.dur;
      const k = Math.min(1, seg.t);
      const a = seg.who === 'leo' ? leo : seg.who === -1 ? rival : guards[seg.who];
      a.x = seg.from.x + 0.5 + (seg.to.x - seg.from.x) * k;
      a.y = seg.from.y + 0.5 + (seg.to.y - seg.from.y) * k;
      a.facing = seg.facing;
      a.bob = Math.abs(Math.sin(k * Math.PI)) * (seg.leap ? 34 : 4);
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
    if (!inHeist) return;
    fit();
    view.draw(level, state, overlay(), leo, guards, ripples, rival);
  });
}

/** Keeps the whole map on screen, between the HUD bars, whatever the camera angle. */
function fit(): void {
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
  const scale = Math.min((w - 24) / (x1 - x0), (h - top - bottom) / (y1 - y0), 1.5);
  world.scale.set(scale);
  world.position.set(w / 2 - ((x0 + x1) / 2) * scale, top + (h - top - bottom) / 2 - ((y0 + y1) / 2) * scale);
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
