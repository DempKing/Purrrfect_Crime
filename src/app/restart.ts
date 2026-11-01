// Restarting a heist.
import { newHeist } from '../core/game';
import { perksFor } from '../meta/progression';
import { game } from './game';
import { $, tutorialUpdate } from './common';
import { banner, hide, say, updateHud } from './hud';
import { closeLootMenu } from './loot';
import { syncActors } from './actors';

/** Restart takes two presses mid-heist, so a stray key can't throw the heist away. */
export function askRestart(): void {
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
/** Starts the current heist again from the beginning. */
export function restart(): void {
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
  if (game.tutorial)
    game.tutorial.ev = { moved: false, dashed: false, rotated: game.tutorial.ev.rotated, onMarble: false };
  tutorialUpdate();
}
