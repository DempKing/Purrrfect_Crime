// Wires a game controller (ui/gamepad.ts) to the game: the map cursor, or the buttons of whatever is open.
import { padName } from '../controls';
import { startGamepad } from '../ui/gamepad';
import { pan, recentre, turnCamera, world, zoomBy } from './camera';
import { act } from './clicks';
import { $, settings } from './common';
import { game } from './game';
import { banner, moveCursor, openSettingsInHeist, say } from './hud';
import { bagOpen, toggleBag } from './loot';
import { doEndTurn } from './turn';

export function bindGamepad(): void {
  let hudPad = false;
  const blur = () => (document.activeElement as HTMLElement | null)?.blur?.();
  const visibleEl = (id: string) => !$(id).classList.contains('hidden');
  startGamepad({
    padMap: () => settings.pad,
    menuRoot: () => {
      if (visibleEl('screens')) return $('screens');
      if (!game.inHeist) return document.body;
      if (visibleEl('caught')) return $('caught');
      if (visibleEl('leave-confirm')) return $('leave-confirm');
      if (game.lootMenu) return $('loot-menu');
      if (bagOpen()) return $('bag');
      if (hudPad) return document.body;
      return null;
    },
    onMap: () =>
      game.inHeist &&
      !visibleEl('screens') &&
      !visibleEl('caught') &&
      !visibleEl('leave-confirm') &&
      !game.lootMenu &&
      !bagOpen(),
    moveCursor: (dx, dy) => moveCursor(dx, dy),
    confirm: () => {
      if (game.state.status !== 'playing') return;
      if (game.selected) act(game.selected);
      else {
        game.selected = { ...game.state.leo };
        say(
          `Move the cursor with the D-pad or the left stick, then press ${padName(settings.pad.confirm[0])}.`,
        );
      }
    },
    endTurn: () => game.state.status === 'playing' && doEndTurn(),
    bag: () => toggleBag(),
    turnCamera: (d) => turnCamera(d),
    zoomBy: (k) => zoomBy(k),
    pan: (dx, dy) => {
      pan.x += (dx * 900) / world.scale.x;
      pan.y += (dy * 900) / world.scale.y;
    },
    recentre: () => recentre(),
    settings: () => {
      if (game.inHeist && !visibleEl('screens')) openSettingsInHeist();
    },
    toggleHud: () => {
      hudPad = !hudPad;
      if (!hudPad) return blur();
      // Straight to the first action (or gadget) if there is one, otherwise End turn.
      const first = [
        ...document.querySelectorAll<HTMLButtonElement>(
          '#actions button:not(:disabled), #abilities button:not(:disabled)',
        ),
      ].find((b) => b.offsetParent);
      (first ?? $('end')).focus();
      say(
        `The buttons: D-pad to choose, ${padName(settings.pad.confirm[0])} to press, ${padName(settings.pad.cancel[0])} or ${padName(settings.pad.hud[0])} to go back to the map.`,
      );
    },
    cancel: () => {
      if (hudPad) {
        hudPad = false;
        return blur();
      }
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    },
    pressed: () => {
      // A heist button pressed: the map has the controller again (to aim a gadget, say).
      if (hudPad) {
        hudPad = false;
        blur();
      }
    },
    connected: (name) => {
      banner(`Controller connected${name ? `: ${name.replace(/\(.*\)/, '').trim()}` : ''}`);
    },
  });
}
