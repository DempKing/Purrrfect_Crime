// Searches every way a heist can play out to prove a level can be beaten, and how quickly.
// The guards are deterministic, so a state is just Leo, the loot and where each guard is.
import { apCost, canSteal, endTurn, leoReach, moveLeo, newHeist, steal, type State } from './game';
import type { Level, Point } from './level';

function stateKey(s: State): string {
  return `${s.leo.x},${s.leo.y}|${s.inventory.join(",")}|${s.guards.map((g) => `${g.x},${g.y},${g.facing},${g.target}`).join(';')}`;
}

export interface Solution {
  turns: number;
  plan: string[]; // human-readable, one line per turn
}

/** Breadth-first over whole turns. Each turn Leo may move, steal and move, or move and steal. */
export function solve(level: Level, maxTurns = 60): Solution | null {
  const start = newHeist(level);
  const seen = new Set([stateKey(start)]);
  let frontier: { s: State; plan: string[] }[] = [{ s: start, plan: [] }];
  for (let turn = 1; turn <= maxTurns && frontier.length; turn++) {
    const next: typeof frontier = [];
    for (const { s, plan } of frontier) {
      for (const { after, what } of turnOptions(level, s)) {
        if (after.status === 'escaped') return { turns: turn, plan: [...plan, what] };
        if (after.status !== 'playing') continue;
        const end = structuredClone(after);
        endTurn(level, end);
        if (end.status !== 'playing') continue;
        const k = stateKey(end);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s: end, plan: [...plan, what] });
      }
    }
    frontier = next;
  }
  return null;
}

function moves(level: Level, s: State): { s: State; to: Point }[] {
  const out: { s: State; to: Point }[] = [{ s: structuredClone(s), to: s.leo }];
  const reach = leoReach(level, s);
  for (const [k, c] of reach.cost) {
    if (c === 0 || apCost(c) > s.ap) continue;
    const [x, y] = k.split(',').map(Number);
    const n = structuredClone(s);
    const r = moveLeo(level, n, { x, y });
    if (r.ok && n.status !== 'caught') out.push({ s: n, to: { x, y } });
  }
  return out;
}

function turnOptions(level: Level, s: State): { after: State; what: string }[] {
  const out: { after: State; what: string }[] = [];
  for (const m of moves(level, s)) {
    out.push({ after: m.s, what: `move to ${m.to.x},${m.to.y}` });
    if (canSteal(level, m.s)) {
      const n = structuredClone(m.s);
      steal(level, n);
      out.push({ after: n, what: `move to ${m.to.x},${m.to.y}, steal` });
    }
  }
  if (canSteal(level, s)) {
    const n = structuredClone(s);
    steal(level, n);
    for (const m of moves(level, n)) out.push({ after: m.s, what: `steal, move to ${m.to.x},${m.to.y}` });
  }
  return out;
}

