// Settings: sound, speed, motion, text size, colours and hints. They belong to the browser, not to a save
// slot, so they're kept under their own key.

export type Speed = 'normal' | 'fast' | 'instant';
export type Palette = 'standard' | 'colourblind';

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
}

export const SETTINGS_KEY = 'purrrfect-crime-settings';

export function defaultSettings(reduceMotion = false): Settings {
  return { master: 0.8, music: 0.6, sfx: 0.8, speed: reduceMotion ? 'fast' : 'normal', reduceMotion, largeText: false, palette: 'standard', hints: true };
}

/** How long animations take, as a share of normal. */
export const SPEED_FACTOR: Record<Speed, number> = { normal: 1, fast: 0.5, instant: 0.02 };

const clamp01 = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d);

/** Reads the settings, filling in anything missing or broken with the defaults. */
export function loadSettings(storage: Pick<Storage, 'getItem'> | null, prefersReducedMotion = false): Settings {
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
      palette: s.palette === 'colourblind' ? 'colourblind' : 'standard',
      hints: typeof s.hints === 'boolean' ? s.hints : d.hints,
    };
  } catch {
    return d;
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'> | null, s: Settings): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // Private windows: the settings last until the page closes.
  }
}
