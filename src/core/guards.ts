// The guards' turn: patrols, searching, and noticing missing loot.
import { blocksMove, type Level, type Point, tileAt } from './level';
import { DIRS, type Guard, key, type State } from './state';
import { hiddenAt, lootAt, roboOff, tileNow } from './world';
import { GUARD_STEPS, LOOK_TURNS, SEARCH_STEPS } from './constants';
import { faceToward, guardSees } from './sight';
import { canSmell, catchLeo, guardFixesLights, smelled, spotted, triggerAlarm } from './noticed';

// ---------------------------------------------------------------------------------------------
// The guards' turn

/** Tiles that show a theft: broken or emptied cases and an empty plinth. */
function disturbances(level: Level, s: State): (Point & { byLeo: boolean })[] {
  // Whatever Leo took is missing from its case, whether it's in his bag or he's put it down somewhere.
  const leo = [...s.inventory, ...s.dropped.map((d) => d.li)].map((i) => ({
    ...level.def.loot[i].at,
    byLeo: true,
  }));
  const smashed = s.smashed
    .filter((k) => !s.inventory.some((i) => key(level.def.loot[i].at.x, level.def.loot[i].at.y) === k))
    .map((k) => {
      const [x, y] = k.split(',').map(Number);
      return { x, y, byLeo: true };
    });
  const rivals = s.rivalLoot.map((i) => ({ ...level.def.loot[i].at, byLeo: false }));
  return [...leo, ...smashed, ...rivals];
}
function guardWalkable(level: Level, s: State, x: number, y: number): boolean {
  return !blocksMove(tileNow(level, s, x, y));
}
export function nextStepToward(
  level: Level,
  s: State,
  g: Guard,
  target: Point,
  others: Set<string>,
): Point | null {
  if (g.x === target.x && g.y === target.y) return null;
  // Cheapest walk on the floor, with diagonals costing 1.5 so guards keep to sensible lines.
  // Guards walk through Leo's tile (and catch him there).
  const start = key(g.x, g.y);
  const goal = key(target.x, target.y);
  const cost = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string>();
  const open: [number, number, number][] = [[0, g.x, g.y]];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [c, x, y] = open.splice(bi, 1)[0];
    if (key(x, y) === goal) break;
    if (c > (cost.get(key(x, y)) ?? Infinity)) continue;
    for (const d of DIRS) {
      const nx = x + d.x;
      const ny = y + d.y;
      const nk = key(nx, ny);
      if (others.has(nk) || !guardWalkable(level, s, nx, ny)) continue;
      if (d.x && d.y && (!guardWalkable(level, s, x + d.x, y) || !guardWalkable(level, s, x, y + d.y)))
        continue;
      const nc = c + (d.x && d.y ? 1.5 : 1);
      if (nc < (cost.get(nk) ?? Infinity)) {
        cost.set(nk, nc);
        prev.set(nk, key(x, y));
        open.push([nc, nx, ny]);
      }
    }
  }
  if (!prev.has(goal)) return null;
  let k = goal;
  while (prev.get(k) !== start) k = prev.get(k)!;
  const [x, y] = k.split(',').map(Number);
  return { x, y };
}
/** One step of the guards' (or, with guard -1, the rival's) turn, for the animation. */
export interface GuardStep {
  guard: number;
  to: { x: number; y: number; facing: number };
}
/** Where each guard will walk over the next turns if nothing changes, for drawing the footprints. */
export function planGuards(level: Level, s: State, turns = s.perks.previewTurns): Point[][] {
  const sim = structuredClone(s);
  sim.layer = 'vent'; // a dry run: nobody gets caught or alarmed
  sim.log = [];
  const steps: GuardStep[] = [];
  for (let t = 0; t < turns; t++) steps.push(...runGuards(level, sim, true));
  return s.guards.map((_, i) =>
    steps.filter((st) => st.guard === i).map((st) => ({ x: st.to.x, y: st.to.y })),
  );
}
export function runGuards(level: Level, s: State, dry: boolean): GuardStep[] {
  const out: GuardStep[] = [];
  for (let gi = 0; gi < s.guards.length; gi++) {
    const g = s.guards[gi];
    if (g.asleep || roboOff(s, g)) continue;
    // A sleepy guard who has settled back at his post nods off again.
    if (g.kind === 'sleepy' && g.mode === 'patrol' && g.x === g.route[0].x && g.y === g.route[0].y) {
      g.asleep = true;
      if (!dry) s.log.push(`${g.name} settles back in his chair and nods off.`);
      continue;
    }
    let sawLeo = false;
    const steps = g.mode === 'searching' || g.kind === 'nightclaw' ? SEARCH_STEPS : GUARD_STEPS;
    for (let i = 0; i < steps && s.status === 'playing'; i++) {
      const others = new Set(s.guards.filter((o) => o !== g).map((o) => key(o.x, o.y)));
      if (g.mode === 'patrol') {
        let target = g.route[g.target];
        if (g.x === target.x && g.y === target.y) {
          g.target = (g.target + 1) % g.route.length;
          target = g.route[g.target];
        }
        const next = nextStepToward(level, s, g, target, others);
        if (!next) {
          // A guard at his post (or stuck) still looks around him.
          if (!dry && i === 0) noticeThings(level, s, g);
          break;
        }
        g.facing = faceToward(g, next);
        g.x = next.x;
        g.y = next.y;
        if (g.x === target.x && g.y === target.y) {
          g.target = (g.target + 1) % g.route.length;
          g.facing = faceToward(g, g.route[g.target]);
        }
      } else if (g.point) {
        const next = nextStepToward(level, s, g, g.point, others);
        if (next) {
          g.facing = faceToward(g, next);
          g.x = next.x;
          g.y = next.y;
        } else g.facing = (g.facing + 2) % 8; // at the spot: look around
      }
      out.push({ guard: gi, to: { x: g.x, y: g.y, facing: g.facing } });
      guardFixesLights(level, s, g, dry);
      if (dry) continue;
      if (s.layer === 'floor' && g.x === s.leo.x && g.y === s.leo.y) {
        catchLeo(s, g.name, 'by walking straight into him', g);
        break;
      }
      if (
        s.layer === 'floor' &&
        s.napTurns <= 0 &&
        !hiddenAt(level, s, s.leo) &&
        guardSees(level, s, g, s.leo.x, s.leo.y)
      ) {
        sawLeo = true;
        spotted(level, s, g, s.leo);
        break; // either caught, or stops to stare
      }
      if (canSmell(level, s, g, s.leo)) {
        sawLeo = true;
        smelled(s, g, s.leo);
        break;
      }
      noticeThings(level, s, g);
    }
    if (s.status !== 'playing') break;
    // After looking around for long enough, a suspicious guard goes back to his rounds.
    if (g.mode !== 'patrol' && g.point && g.x === g.point.x && g.y === g.point.y) {
      g.look -= 1;
      if (g.look <= 0 && s.alarm === null) {
        g.mode = 'patrol';
        g.point = null;
        if (!sawLeo) g.meter = 0;
        let best = 0;
        g.route.forEach((w, i) => {
          if (Math.hypot(w.x - g.x, w.y - g.y) < Math.hypot(g.route[best].x - g.x, g.route[best].y - g.y))
            best = i;
        });
        g.target = best;
      }
    }
  }
  return out;
}
/** What a guard notices where he stands: empty displays (the alarm), decoy cards and paw prints (he goes to look). */
function noticeThings(level: Level, s: State, g: Guard): void {
  for (const d of disturbances(level, s)) {
    const k = key(d.x, d.y);
    if (!g.noticed.includes(k) && guardSees(level, s, g, d.x, d.y, true)) {
      g.noticed.push(k);
      // Say what's gone: the guard knows his building.
      const li = lootAt(level, d.x, d.y);
      const what = li >= 0 ? level.def.loot[li].name : null;
      const safe = tileAt(level, d.x, d.y) === 'safe';
      const why = safe
        ? `${g.name} found the safe hanging open${what ? ` and the ${what} gone` : ''}`
        : what
          ? `${g.name} noticed the ${what} is missing`
          : `${g.name} found an empty display`;
      triggerAlarm(s, d, why, d.byLeo, {
        kind: 'missing',
        who: g.name,
        from: g,
        label: what ? `${what}: missing!` : 'Missing!',
      });
    }
  }
  for (const d of [...s.decoys, ...s.prints])
    if (
      g.mode !== 'searching' &&
      guardSees(level, s, g, d.x, d.y, true) &&
      (g.point?.x !== d.x || g.point?.y !== d.y)
    ) {
      if (g.mode === 'patrol')
        s.log.push(
          s.decoys.includes(d as Point)
            ? `${g.name} spotted a calling card and went to look.`
            : `${g.name} spotted paw prints and went to follow them.`,
        );
      g.mode = 'suspicious';
      g.point = { ...d };
      g.look = LOOK_TURNS;
    }
  // He pockets a card, or scuffs out a print, by standing on it.
  s.decoys = s.decoys.filter((d) => d.x !== g.x || d.y !== g.y);
  s.prints = s.prints.filter((d) => d.x !== g.x || d.y !== g.y);
}
