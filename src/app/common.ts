// Saving, settings, sound and small helpers used all over the UI.
import { saveSlot } from '../meta/profile';
import { type Sfx, Sound } from '../audio';
import { loadSettings, saveSettings, type Settings, SPEED_FACTOR } from '../settings';
import { setPalette } from '../render/view';
import { checkAchievements } from '../meta/achievements';
import * as screens from '../ui/screens';
import { advance, TUTORIAL } from '../meta/tutorial';
import { game } from './game';

// The save

export function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
/** Saves the profile to its slot. */
export const persist = () => saveSlot(storage(), game.slot, game.profile);
// Settings and sound

export const sound = new Sound();
const prefersReducedMotion =
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export const settings: Settings = loadSettings(storage(), prefersReducedMotion);
/** An animation length adjusted for the speed setting. */
export const anim = (seconds: number) => seconds * SPEED_FACTOR[settings.speed] * game.slowMotion;
/** Applies the current settings (text size, motion, sound, colours). */
export function applySettings(): void {
  document.body.classList.toggle('large-text', settings.largeText);
  document.body.classList.toggle('reduce-motion', settings.reduceMotion);
  sound.setLevels(settings.master, settings.music, settings.sfx);
  setPalette(settings.palette);
  game.version++;
}
/** Saves and applies new settings. */
export function changeSettings(s: Settings): void {
  Object.assign(settings, s);
  saveSettings(storage(), settings);
  applySettings();
}
/** Plays sounds, one after another. */
export function sfx(...names: Sfx[]): void {
  names.forEach((n, i) => sound.play(n, i * 0.12));
}
/** Achievements just earned: saved, and announced. */
export function award(r: Parameters<typeof checkAchievements>[1] = null): void {
  const fresh = checkAchievements(game.profile, r);
  if (!fresh.length) return;
  persist();
  fresh.forEach((a, i) =>
    setTimeout(() => {
      sfx('achievement');
      screens.toast(a);
    }, i * 900),
  );
}
/** Moves the tutorial on and shows its current tip. */
export function tutorialUpdate(): void {
  const box = $('narrator');
  if (!game.tutorial || !game.inHeist) return box.classList.add('hidden');
  game.tutorial.step = advance(game.state, game.tutorial.ev, game.tutorial.step);
  const step = TUTORIAL[game.tutorial.step];
  if (!step || game.state.status !== 'playing') return box.classList.add('hidden');
  box.classList.remove('hidden');
  box.classList.toggle('collapsed', game.tutorial.hidden);
  $('narrator-text').textContent = step.text;
  $('narrator-count').textContent = `Tip ${game.tutorial.step + 1} of ${TUTORIAL.length}`;
  $('narrator-ok').classList.toggle('hidden', !step.optional);
}
/** Shorthand for getElementById. */
export const $ = (id: string) => document.getElementById(id)!;
/** Formats a number as dollars. */
export const money = (n: number) => `$${n.toLocaleString('en-US')}`;
