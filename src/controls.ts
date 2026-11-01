// The controls the player can remap in the settings: which keys and which controller buttons do what.
// Keys are kept as `KeyboardEvent.key` lower-cased (' ' for Space); controller buttons by their standard-mapping index.
// A few stay fixed so the game can always be got out of: Esc cancels and closes, 1-9 pick from the action bar,
// and the controller's D-pad and sticks move.

export type KeyAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'confirm'
  | 'endTurn'
  | 'bag'
  | 'turnLeft'
  | 'turnRight'
  | 'panUp'
  | 'panLeft'
  | 'panDown'
  | 'panRight'
  | 'recentre'
  | 'zoomIn'
  | 'zoomOut'
  | 'restart';

export type PadAction =
  | 'confirm'
  | 'cancel'
  | 'endTurn'
  | 'bag'
  | 'turnLeft'
  | 'turnRight'
  | 'zoomOut'
  | 'zoomIn'
  | 'recentre'
  | 'hud'
  | 'settings';

export type KeyMap = Record<KeyAction, string[]>;
export type PadMap = Record<PadAction, number[]>;

export const KEY_ACTIONS: [KeyAction, string][] = [
  ['up', 'Cursor up'],
  ['down', 'Cursor down'],
  ['left', 'Cursor left'],
  ['right', 'Cursor right'],
  ['confirm', 'Move Leo there, or do what’s there'],
  ['endTurn', 'End the turn'],
  ['bag', 'Open the bag'],
  ['turnLeft', 'Turn the camera left'],
  ['turnRight', 'Turn the camera right'],
  ['panUp', 'Pan the camera up'],
  ['panLeft', 'Pan the camera left'],
  ['panDown', 'Pan the camera down'],
  ['panRight', 'Pan the camera right'],
  ['recentre', 'Bring the camera back to Leo'],
  ['zoomIn', 'Zoom in'],
  ['zoomOut', 'Zoom out'],
  ['restart', 'Restart the heist (press twice)'],
];

export const PAD_ACTIONS: [PadAction, string][] = [
  ['confirm', 'Move Leo there, or do what’s there (and press buttons)'],
  ['cancel', 'Cancel, close, back'],
  ['endTurn', 'End the turn'],
  ['bag', 'Open the bag'],
  ['turnLeft', 'Turn the camera left'],
  ['turnRight', 'Turn the camera right'],
  ['zoomOut', 'Zoom out'],
  ['zoomIn', 'Zoom in'],
  ['recentre', 'Bring the camera back to Leo'],
  ['hud', 'The buttons on screen: actions, gadgets, Restart…'],
  ['settings', 'Settings'],
];

export function defaultKeys(): KeyMap {
  return {
    up: ['arrowup'],
    down: ['arrowdown'],
    left: ['arrowleft'],
    right: ['arrowright'],
    confirm: ['enter'],
    endTurn: [' '],
    bag: ['i'],
    turnLeft: ['q'],
    turnRight: ['e'],
    panUp: ['w'],
    panLeft: ['a'],
    panDown: ['s'],
    panRight: ['d'],
    recentre: ['c', 'f'],
    zoomIn: ['+', '='],
    zoomOut: ['-', '_'],
    restart: ['r'],
  };
}

export function defaultPad(): PadMap {
  return {
    confirm: [0],
    cancel: [1],
    endTurn: [2],
    bag: [3],
    turnLeft: [4],
    turnRight: [5],
    zoomOut: [6],
    zoomIn: [7],
    hud: [8],
    settings: [9],
    recentre: [10, 11],
  };
}

/** Keys and buttons that can't be given to anything else. */
export function reservedKey(k: string): string | null {
  if (k === 'escape') return 'Esc always cancels and closes.';
  if (/^[1-9]$/.test(k)) return '1–9 always pick from the action bar.';
  if (['shift', 'control', 'alt', 'meta', 'capslock', 'tab', 'dead', 'unidentified', 'process'].includes(k))
    return 'Pick another key.';
  return null;
}
export function reservedButton(b: number): string | null {
  return b >= 12 && b <= 15 ? 'The D-pad always moves.' : b > 17 ? 'Pick another button.' : null;
}

export const PAD_NAMES = [
  'A',
  'B',
  'X',
  'Y',
  'LB',
  'RB',
  'LT',
  'RT',
  'View',
  'Menu',
  'Left stick',
  'Right stick',
  'D-pad up',
  'D-pad down',
  'D-pad left',
  'D-pad right',
  'Home',
  'Share',
];

const KEY_NAMES: Record<string, string> = {
  ' ': 'Space',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  enter: 'Enter',
  backspace: 'Backspace',
  delete: 'Delete',
  home: 'Home',
  end: 'End',
  pageup: 'Page Up',
  pagedown: 'Page Down',
  insert: 'Insert',
};
export function keyName(k: string): string {
  return KEY_NAMES[k] ?? (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1));
}
export function padName(b: number): string {
  return PAD_NAMES[b] ?? `Button ${b}`;
}

export function actionForKey(map: KeyMap, k: string): KeyAction | null {
  for (const [a] of KEY_ACTIONS) if (map[a].includes(k)) return a;
  return null;
}
export function actionForButton(map: PadMap, b: number): PadAction | null {
  for (const [a] of PAD_ACTIONS) if (map[a].includes(b)) return a;
  return null;
}

/**
 * Gives `input` to `action` in place of what it had. If another action had it, that one takes the replaced input
 * instead (a swap), so nothing is ever left without a key.
 */
export function rebind<M extends Record<string, unknown[]>>(
  map: M,
  action: keyof M & string,
  input: M[keyof M][number],
): M {
  type I = M[keyof M][number];
  const out = Object.fromEntries(Object.entries(map).map(([a, v]) => [a, [...v]])) as Record<string, I[]>;
  const old = out[action];
  for (const a of Object.keys(out)) {
    if (a === action || !out[a].includes(input)) continue;
    out[a] = out[a].filter((x) => x !== input);
    if (!out[a].length && old.length) out[a] = [old[0]];
  }
  out[action] = [input];
  return out as M;
}

/** Saved bindings, checked: anything missing or broken comes from the defaults. */
export function cleanKeys(raw: unknown): KeyMap {
  const d = defaultKeys();
  if (!raw || typeof raw !== 'object') return d;
  for (const [a] of KEY_ACTIONS) {
    const v = (raw as Record<string, unknown>)[a];
    if (Array.isArray(v) && v.length && v.every((x) => typeof x === 'string' && x && !reservedKey(x)))
      d[a] = v as string[];
  }
  return d;
}
export function cleanPad(raw: unknown): PadMap {
  const d = defaultPad();
  if (!raw || typeof raw !== 'object') return d;
  for (const [a] of PAD_ACTIONS) {
    const v = (raw as Record<string, unknown>)[a];
    if (
      Array.isArray(v) &&
      v.length &&
      v.every((x) => Number.isInteger(x) && x >= 0 && !reservedButton(x as number))
    )
      d[a] = v as number[];
  }
  return d;
}
