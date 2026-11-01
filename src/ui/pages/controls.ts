// Settings -> Controls: the list of controls and remapping keys and controller buttons.
import type { Settings } from '../../settings';
import {
  actionForButton,
  actionForKey,
  defaultKeys,
  defaultPad,
  KEY_ACTIONS,
  type KeyAction,
  keyName,
  PAD_ACTIONS,
  type PadAction,
  padName,
  rebind,
  reservedButton,
  reservedKey,
} from '../../controls';
import { capturePadButton } from '../gamepad';
import { esc } from './common';

// --- Controls: what every key, click and button does, and the player's own bindings -------------------------

type ControlsTab = 'keys' | 'mouse' | 'pad';
const MOUSE_CONTROLS: [string, string][] = [
  ['Hover a tile', 'See the way there and what it would bring'],
  ['Click a tile', 'Move Leo there, or do what’s there'],
  ['Click loot', 'Open its tag: pick, take, swap…'],
  ['Mouse wheel', 'Zoom'],
  ['Tap (touch)', 'Pick a tile; tap it again to move there'],
  ['Buttons on screen', 'Camera, zoom, bag, end turn, restart'],
];
/** The controls, one tab each for the keyboard, the mouse (or touch) and a controller; keys and buttons can be changed. */
function controlsHtml(st: Settings, tab: ControlsTab, waiting: string | null, note: string): string {
  const tabs: [ControlsTab, string][] = [
    ['keys', 'Keyboard'],
    ['mouse', 'Mouse & touch'],
    ['pad', 'Controller'],
  ];
  const fixed = (k: string, v: string) =>
    `<tr class="fixed"><th><kbd>${esc(k)}</kbd></th><td>${esc(v)}</td></tr>`;
  const bind = (id: string, label: string, names: string[]) => {
    const wait = waiting === id;
    return `<tr><th><button class="bind${wait ? ' waiting' : ''}" data-bind="${id}" aria-label="Change: ${esc(label)}">${wait ? (tab === 'pad' ? 'Press a button…' : 'Press a key…') : names.map((n) => `<kbd>${esc(n)}</kbd>`).join(' ')}</button></th><td>${esc(label)}</td></tr>`;
  };
  let rows = '';
  if (tab === 'keys')
    rows =
      KEY_ACTIONS.map(([a, l]) => bind(`keys:${a}`, l, st.keys[a].map(keyName))).join('') +
      fixed('1–9', 'Pick an action from the bar') +
      fixed('Esc', 'Cancel, close');
  else if (tab === 'pad')
    rows =
      PAD_ACTIONS.map(([a, l]) => bind(`pad:${a}`, l, st.pad[a].map(padName))).join('') +
      fixed('D-pad / left stick', 'Move the cursor (in menus: between buttons)') +
      fixed('Right stick', 'Pan the camera');
  else rows = MOUSE_CONTROLS.map(([k, v]) => fixed(k, v)).join('');
  return `<div class="seg controls-tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" data-ctab="${id}" aria-selected="${id === tab}" class="${id === tab ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${tab !== 'mouse' ? `<p class="small controls-hint">${note ? esc(note) : `Click a ${tab === 'pad' ? 'button' : 'key'} on the left to change it${tab === 'pad' ? ', then press the new button on the controller' : ', then press the new key'}. Esc cancels.`}</p>` : ''}
    <table class="controls-list"><tbody>${rows}</tbody></table>
    ${tab !== 'mouse' ? `<div class="row-buttons"><button class="quiet" data-creset="${tab}">Reset ${tab === 'pad' ? 'controller' : 'keyboard'} to defaults</button></div>` : ''}`;
}
/** Wires up the Controls section: tabs, waiting for a key or button, swaps, and resets. */
export function controlsSection(
  box: HTMLElement,
  st: Settings,
  change: (p: Partial<Settings>) => void,
): void {
  const pad = [...(navigator.getGamepads?.() ?? [])].some((g) => g?.connected);
  let tab: ControlsTab = pad ? 'pad' : 'keys';
  let waiting: string | null = null;
  let note = '';
  const stop = () => {
    waiting = null;
    capturePadButton(null);
    window.removeEventListener('keydown', onKey, true);
  };
  const render = (focus?: string) => {
    box.innerHTML = controlsHtml(st, tab, waiting, note);
    if (focus) box.querySelector<HTMLElement>(`[data-bind="${focus}"]`)?.focus();
  };
  const done = (id: string, msg: string) => {
    note = msg;
    stop();
    render(id);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!waiting) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const id = waiting;
    const k = e.key.toLowerCase();
    if (k === 'escape') return done(id, 'No change.');
    const why = reservedKey(k);
    if (why) {
      note = why;
      return render();
    }
    const [, a] = id.split(':') as [string, KeyAction];
    const before = actionForKey(st.keys, k);
    change({ keys: rebind(st.keys, a, k) });
    done(
      id,
      before && before !== a
        ? `${keyName(k)} now does this; ${KEY_ACTIONS.find(([x]) => x === before)![1].toLowerCase()} took its old key.`
        : `Set to ${keyName(k)}.`,
    );
  };
  const onButton = (b: number) => {
    if (!waiting) return;
    const id = waiting;
    const why = reservedButton(b);
    if (why) {
      note = why;
      return render();
    }
    const [, a] = id.split(':') as [string, PadAction];
    const before = actionForButton(st.pad, b);
    change({ pad: rebind(st.pad, a, b) });
    done(
      id,
      before && before !== a
        ? `${padName(b)} now does this; ${PAD_ACTIONS.find(([x]) => x === before)![1].toLowerCase()} took its old button.`
        : `Set to ${padName(b)}.`,
    );
  };
  box.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if (t.dataset.ctab) {
      stop();
      tab = t.dataset.ctab as ControlsTab;
      note = '';
      return render();
    }
    if (t.dataset.creset) {
      stop();
      change(t.dataset.creset === 'pad' ? { pad: defaultPad() } : { keys: defaultKeys() });
      note = 'Back to the defaults.';
      return render();
    }
    if (t.dataset.bind) {
      stop();
      waiting = t.dataset.bind;
      note = '';
      render(waiting);
      if (waiting.startsWith('pad:')) {
        // The button that was pressed to get here mustn't count: wait for it to be let go of first.
        window.setTimeout(() => waiting && capturePadButton(onButton), 250);
        window.addEventListener('keydown', onKey, true); // Esc still cancels
      } else window.addEventListener('keydown', onKey, true);
    }
  });
  // Leaving the settings mid-wait: stop listening.
  const watch = window.setInterval(() => {
    if (!box.isConnected) {
      stop();
      window.clearInterval(watch);
    }
  }, 500);
  render();
}
