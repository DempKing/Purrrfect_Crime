// Clicking (or pressing A/Enter on) a tile: what it does.
import type { Point } from '../core/level';
import { abilityTargets, type Action, actionsHere, guardSees, key, moveAp } from '../core/game';
import { game } from './game';
import { cancelTargeting, runAbility, runAction } from './actions';
import { boxHere, lootHere, openLootMenu, standFor } from './loot';
import { computed } from './preview';
import { say } from './hud';
import { doThere, walkTo } from './moves';

/** The action a click on this tile would do (quiet options first), if any. */
export function clickAction(tile: Point): Action | null {
  const here = actionsHere(game.level, game.state).filter(
    (a) => a.at.x === tile.x && a.at.y === tile.y && a.kind !== 'smash-case',
  );
  return here.find((a) => !a.blocked) ?? here[0] ?? null;
}
/** Clicking a tile: aim a gadget, open a loot tag, do an action, or walk there. */
export function act(tile: Point): void {
  if (game.busy || game.state.status !== 'playing') return;
  if (game.targeting) {
    if (abilityTargets(game.level, game.state, game.targeting).has(key(tile.x, tile.y)))
      return runAbility(game.targeting, tile);
    return cancelTargeting();
  }
  if (lootHere(tile) !== null) return openLootMenu(tile);
  const a = clickAction(tile);
  if (a) return runAction(a);
  // Finale: clicking NightClaw walks Leo behind him and taps.
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
