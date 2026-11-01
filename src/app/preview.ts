// What the map shows before Leo moves: reach, danger marks, the path, and the tile under the pointer.
import {
  abilityTargets,
  aftermath,
  type Aftermath,
  cameraView,
  danger,
  guardView,
  key,
  leoReach,
  motionTrip,
  moveAp,
  pathTo,
  planGuards,
  planRival,
} from '../core/game';
import type { Overlay } from '../render/view';
import type { Point } from '../core/level';
import { project, unproject } from '../render/iso';
import { game } from './game';
import { liveAlerts } from './notices';
import { boxHere, lootHere, standFor } from './loot';
import { $ } from './common';
import { view, world } from './camera';
import { rival } from './actors';

export function computed() {
  if (!game.cache || game.cache.v !== game.version) {
    const vision = new Set<string>();
    for (const g of game.state.guards) for (const k of guardView(game.level, game.state, g)) vision.add(k);
    const cameraVision = new Set<string>();
    if (!game.state.camerasOff)
      for (const c of game.state.cameras)
        for (const k of cameraView(game.level, game.state, c)) cameraVision.add(k);
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
export const risk = new Map<string, Aftermath>();
/** Works through the reachable tiles for a few milliseconds a frame, so the game never stutters. */
export function workOnRisk(): void {
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
export function overlay(): Overlay {
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
    if (path.length && moveAp(game.state, c.reach.cost.get(key(goal.x, goal.y)) ?? 99) > game.state.ap)
      path = [];
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
export function placeRivalArrow(): void {
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
export function placeRiskNote(): void {
  const box = $('risk-note');
  const target = game.selected ?? game.hover;
  const live =
    game.inHeist && game.state.status === 'playing' && !game.busy && !game.targeting && !game.lootMenu;
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
export function tileUnder(clientX: number, clientY: number): Point | null {
  const local = world.toLocal({ x: clientX, y: clientY });
  const g = unproject(view.proj, local.x, local.y);
  const x = Math.floor(g.x);
  const y = Math.floor(g.y);
  if (x < 0 || y < 0 || x >= game.level.w || y >= game.level.h) return null;
  return { x, y };
}
