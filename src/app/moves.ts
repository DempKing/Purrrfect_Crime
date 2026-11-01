// Walking Leo somewhere, the leave-the-lair prompt, and small effects (floating text, screen shake).
import type { Point } from '../core/level';
import { type Action, actionsHere, faceToward, lightMap, moveLeo } from '../core/game';
import type { Sfx } from '../audio';
import type { Gait } from '../render/view';
import { project } from '../render/iso';
import { game } from './game';
import { say } from './hud';
import { runAction } from './actions';
import { $, anim } from './common';
import { recentre, view, world } from './camera';
import { play, type Segment } from './actors';
import { afterLeoActs } from './notices';

/** Does an action on a tile Leo has just arrived beside. */
export function doThere(target: Point, kind: Action['kind']): void {
  const a = actionsHere(game.level, game.state).find(
    (x) => x.kind === kind && x.at.x === target.x && x.at.y === target.y,
  );
  if (!a) return;
  if (a.blocked) return say(a.blocked);
  runAction(a);
}
/** The finale: leaving before tapping NightClaw skips the ending, so ask first. */
export function leavingWithoutTap(tile: Point): boolean {
  if (
    game.leaveOk ||
    !game.level.def.finale ||
    game.state.tagged ||
    game.state.layer !== 'floor' ||
    !game.state.inventory.length
  )
    return false;
  if (tile.x !== game.level.exit.x || tile.y !== game.level.exit.y) return false;
  return true;
}
export function confirmLeave(go: () => void): void {
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
export function walkTo(tile: Point, then?: () => void): void {
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
export function floatText(at: Point, text: string, cls = ''): void {
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
export function shake(): void {
  const st = $('stage');
  st.classList.remove('shake');
  void st.offsetWidth;
  st.classList.add('shake');
}
