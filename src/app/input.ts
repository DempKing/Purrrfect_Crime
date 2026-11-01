// Mouse, touch, keyboard and the HUD's buttons: what each one does.
import { actionForKey, type KeyAction } from '../controls';
import * as screens from '../ui/screens';
import { cancelTargeting } from './actions';
import { quit } from './between';
import { app, panKeys, recentre, turnCamera, zoomBy } from './camera';
import { act, clickAction } from './clicks';
import { $, settings, sound, tutorialUpdate } from './common';
import { game } from './game';
import { moveCursor, nightClawUnder, openSettingsInHeist, say } from './hud';
import { bagOpen, boxHere, closeLootMenu, lootHere, toggleBag } from './loot';
import { tileUnder } from './preview';
import { askRestart, restart } from './restart';
import { doEndTurn } from './turn';

/** Mouse and touch on the map: hover shows the way, a click (or a second tap on touch) acts. */
export function bindPointer(): void {
  app.canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    game.hover = tileUnder(e.clientX, e.clientY);
    app.canvas.style.cursor =
      game.hover && game.inHeist && (lootHere(game.hover) !== null || boxHere(game.hover)) ? 'pointer' : '';
  });
  app.canvas.addEventListener('pointerleave', () => (game.hover = null));
  app.canvas.addEventListener('pointerdown', (e) => {
    const t = nightClawUnder(e.clientX, e.clientY) ?? tileUnder(e.clientX, e.clientY);
    closeLootMenu();
    if (!t) return;
    if (
      e.pointerType === 'touch' &&
      !clickAction(t) &&
      lootHere(t) === null &&
      !boxHere(t) &&
      (!game.selected || game.selected.x !== t.x || game.selected.y !== t.y)
    ) {
      game.selected = t;
      say('Tap the same tile again to move there.');
      return;
    }
    act(t);
  });
}

/** The HUD's buttons and the narrator's card. */
export function bindButtons(): void {
  $('rotate-left').addEventListener('click', () => turnCamera(1));
  $('zoom-in').addEventListener('click', () => zoomBy(1.25));
  $('zoom-out').addEventListener('click', () => zoomBy(0.8));
  app.canvas.addEventListener(
    'wheel',
    (e) => {
      if (!game.inHeist) return;
      e.preventDefault();
      zoomBy(Math.pow(0.9985, e.deltaY));
    },
    { passive: false },
  );
  $('rotate-right').addEventListener('click', () => turnCamera(-1));
  $('end').addEventListener('click', doEndTurn);
  $('restart').addEventListener('click', askRestart);
  $('bag-btn').addEventListener('click', () => toggleBag());
  $('inventory').addEventListener('click', () => toggleBag());
  // The heist's toolbar buttons let go of keyboard focus once clicked: Space and Enter belong to the heist
  // (end the turn, act), and must never press a button that was clicked earlier.
  document
    .querySelector('.hud .buttons')
    ?.addEventListener('click', (e) => (e.target as HTMLElement).closest('button')?.blur());
  $('again').addEventListener('click', restart);
  $('quit').addEventListener('click', quit);
  $('quit2').addEventListener('click', quit);
  $('narrator-face').innerHTML = screens.NARRATOR_SVG;
  $('narrator-ok').addEventListener('click', () => {
    if (!game.tutorial) return;
    game.tutorial.step++;
    tutorialUpdate();
  });
  $('narrator-hide').addEventListener('click', () => {
    if (!game.tutorial) return;
    game.tutorial.hidden = !game.tutorial.hidden;
    tutorialUpdate();
  });
  $('help-toggle').addEventListener('click', () => $('help').classList.toggle('hidden'));
  $('settings-btn').addEventListener('click', openSettingsInHeist);
  // Browsers only allow sound after the player has done something.
  for (const ev of ['pointerdown', 'keydown'] as const)
    window.addEventListener(ev, () => sound.unlock(), { passive: true });
  // Every button in the menus gives a soft click.
  document.addEventListener('pointerdown', (e) => {
    const b = (e.target as HTMLElement).closest?.('button');
    if (b && !b.disabled && !b.closest('#actions')) sound.play('ui');
  });
}

/** The keyboard, using the player's own key bindings (Settings -> Controls). */
export function bindKeyboard(): void {
  window.addEventListener('keyup', (e) => {
    const a = actionForKey(settings.keys, e.key.toLowerCase());
    if (a) panKeys.delete(a);
  });
  window.addEventListener('blur', () => panKeys.clear());
  window.addEventListener('keydown', (e) => {
    // Nothing reaches the heist while a screen (the settings, say) is open over it.
    if (!game.inHeist || !$('screens').classList.contains('hidden')) return;
    if (e.target instanceof HTMLInputElement) return;
    // The leave-the-lair question has the keys (its buttons, Esc to stay) while it's up.
    if (!$('leave-confirm').classList.contains('hidden')) return;
    if (game.lootMenu) {
      // The loot tag has the keys while it's open: its numbers, or Esc to put it away.
      if (/^[1-9]$/.test(e.key)) game.lootChoices[Number(e.key) - 1]?.();
      else if (e.key === 'Escape') closeLootMenu();
      if (/^[1-9]$/.test(e.key) || e.key === 'Escape') return;
    }
    // The keys are the player's own (Settings → Controls); Esc and 1–9 are fixed.
    const k = e.key.toLowerCase();
    const a = actionForKey(settings.keys, k);
    if (a === 'bag') return toggleBag();
    if (e.key === 'Escape' && bagOpen()) return toggleBag(false);
    if (a === 'panUp' || a === 'panLeft' || a === 'panDown' || a === 'panRight') {
      panKeys.add(a);
      return;
    }
    if (a === 'recentre') return recentre();
    const cursor: Partial<Record<KeyAction, [number, number]>> = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    if (a && cursor[a]) {
      e.preventDefault();
      moveCursor(...cursor[a]!);
    } else if (a === 'turnLeft') turnCamera(1);
    else if (a === 'zoomIn') zoomBy(1.25);
    else if (a === 'zoomOut') zoomBy(0.8);
    else if (a === 'turnRight') turnCamera(-1);
    else if (a === 'confirm' && game.selected && game.state.status === 'playing') {
      e.preventDefault();
      const t = game.selected;
      act(t);
    } else if (a === 'endTurn' || a === 'confirm') {
      e.preventDefault();
      if (game.state.status === 'playing') doEndTurn();
      else if (game.state.status === 'caught') restart();
    } else if (a === 'restart') {
      if (game.state.status === 'caught') restart();
      else askRestart();
    } else if (e.key === 'Escape') {
      game.selected = null;
      if (game.targeting) cancelTargeting();
    } else if (/^[1-9]$/.test(e.key))
      ($('actions').children[Number(e.key) - 1] as HTMLButtonElement | undefined)?.click();
  });
}
