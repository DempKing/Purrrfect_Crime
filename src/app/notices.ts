// Who-noticed-what markers on the map, and what happens after each thing Leo does.
import type { Notice } from '../core/game';
import { project } from '../render/iso';
import { soundsInLog } from '../audio';
import { game } from './game';
import { floatText } from './moves';
import { pan, view, world } from './camera';
import { spawnRipples, syncActors } from './actors';
import { caught, escaped, say, updateHud } from './hud';
import { anim, sfx, tutorialUpdate } from './common';
import { doEndTurn } from './turn';

/** Notices still showing on the map. */
export function liveAlerts(): Notice[] {
  const now = performance.now();
  game.alerts = game.alerts.filter((a) => a.until > now);
  return game.alerts.map((a) => a.n);
}
/** Shows this step's notices: a label, a ring on the spot and a line back to whoever noticed. */
export function showNotices(): void {
  const list = game.state.notices ?? [];
  game.state.notices = [];
  if (!list.length) return;
  for (const n of list)
    game.alerts.push({ n, until: performance.now() + (n.kind === 'caught' ? 60000 : 6000) });
  // Add the labels after the camera moves (below), so they line up.
  window.setTimeout(
    () => list.forEach((n) => floatText(n.at, n.label, n.kind === 'spotted' ? 'warn' : 'red')),
    80,
  );
  // Off screen? Pan to it (the camera returns to Leo when he moves).
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
/** After each move or action: update the screen, then check for caught/escaped/end of turn. */
export function afterLeoActs(): void {
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
    setTimeout(
      () => !game.busy && game.state.status === 'playing' && game.state.ap <= 0 && doEndTurn(),
      anim(450) + 50,
    );
}
