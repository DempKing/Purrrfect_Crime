// Settings: sound, speed, motion, text size, colors, hints and controls.
// Saved per browser (not per save slot), under their own key.

import { cleanKeys, cleanPad, defaultKeys, defaultPad, type KeyMap, type PadMap } from './controls';

export type Speed = 'normal' | 'fast' | 'instant';
export type Palette = 'standard' | 'colorblind';

export interface Settings {
  master: number; // 0..1
  music: number;
  sfx: number;
  speed: Speed;
  reduceMotion: boolean;
  largeText: boolean;
  palette: Palette;
  /** The narrator's tips in the tutorial. */
  hints: boolean;
  /** The player's own key and controller-button bindings. */
  keys: KeyMap;
  pad: PadMap;
}

export const SETTINGS_KEY = 'purrrfect-crime-settings';

/** Default settings. */
export function defaultSettings(reduceMotion = false): Settings {
  return {
    master: 0.8,
    music: 0.6,
    sfx: 0.8,
    speed: reduceMotion ? 'fast' : 'normal',
    reduceMotion,
    largeText: false,
    palette: 'standard',
    hints: true,
    keys: defaultKeys(),
    pad: defaultPad(),
  };
}

/** How long animations take, as a share of normal. */
export const SPEED_FACTOR: Record<Speed, number> = { normal: 1, fast: 0.5, instant: 0.02 };

/** A number limited to 0..1, or the default if it isn't one. */
const clamp01 = (n: unknown, d: number) =>
  typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d;

/** Reads the settings, filling in anything missing or broken with the defaults. */
export function loadSettings(
  storage: Pick<Storage, 'getItem'> | null,
  prefersReducedMotion = false,
): Settings {
  const d = defaultSettings(prefersReducedMotion);
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    if (!raw) return d;
    const s = JSON.parse(raw) as Partial<Settings>;
    return {
      master: clamp01(s.master, d.master),
      music: clamp01(s.music, d.music),
      sfx: clamp01(s.sfx, d.sfx),
      speed: s.speed === 'fast' || s.speed === 'instant' || s.speed === 'normal' ? s.speed : d.speed,
      reduceMotion: typeof s.reduceMotion === 'boolean' ? s.reduceMotion : d.reduceMotion,
      largeText: typeof s.largeText === 'boolean' ? s.largeText : d.largeText,
      // Older saves spelled it 'colourblind'.
      palette:
        s.palette === 'colorblind' || (s.palette as string) === 'colourblind' ? 'colorblind' : 'standard',
      hints: typeof s.hints === 'boolean' ? s.hints : d.hints,
      keys: cleanKeys(s.keys),
      pad: cleanPad(s.pad),
    };
  } catch {
    return d;
  }
}

/** Saves settings (quietly does nothing if storage is unavailable). */
export function saveSettings(storage: Pick<Storage, 'setItem'> | null, s: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Private windows: the settings last until the page closes.
  }
}
