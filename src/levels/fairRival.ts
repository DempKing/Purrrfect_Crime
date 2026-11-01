// A rival should make a heist harder, never impossible. Tonight's rival is kept through every retry, so a rival
// who always beats Leo to the centrepiece (or always gets him caught) would rule out a flawless run for good.
// Before a heist, the level's known flawless route is played through with the rival in the building; if it no
// longer works, the rival comes in later (or by the other door) until it does.
import { parseLevel, type LevelDef } from '../core/level';
import { BASE_PERKS, doAction, endTurn, moveLeo, newHeist, type RivalPlan } from '../core/game';
import { SOLUTIONS } from './solutions';

/** Does the level's flawless route still come off with this rival? */
export function routeSurvives(def: LevelDef, plan: RivalPlan): boolean {
  const route = SOLUTIONS[def.id];
  if (!route) return true;
  const level = parseLevel(def);
  const s = newHeist(level, BASE_PERKS, plan);
  for (const turn of route) {
    for (const st of turn) {
      const ok = Array.isArray(st) ? moveLeo(level, s, { x: st[0], y: st[1] }).ok : doAction(level, s, st.a as never, { x: st.x, y: st.y });
      if (!ok) return false;
      if (s.status !== 'playing') break;
    }
    if (s.status !== 'playing') break;
    endTurn(level, s);
  }
  const centre = level.plinth && def.loot.findIndex((l) => l.at.x === level.plinth!.x && l.at.y === level.plinth!.y);
  return s.status === 'escaped' && !s.seen && !s.alarmRaised && s.inventory.includes(centre ?? -1);
}

/** The rival as rolled, or the nearest fair version of them: later, or through the other entrance. */
export function fairRival(def: LevelDef, plan: RivalPlan | null): RivalPlan | null {
  if (!plan) return null;
  const route = SOLUTIONS[def.id];
  if (!route || routeSurvives(def, plan)) return plan;
  const doors = Math.max(1, def.rivalEntrances?.length ?? 1);
  for (let arrive = plan.arrive; arrive <= route.length + 2; arrive++)
    for (let d = 0; d < doors; d++) {
      const p = { ...plan, arrive, entrance: (plan.entrance + d) % doors };
      if (routeSurvives(def, p)) return p;
    }
  return null;
}
