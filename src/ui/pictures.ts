// The illustrations used in the menus (art/models/, scaled by tools/prep-art.mjs).
import type { Ability, RivalId } from '../core/game';
import win_leo_clock from '../../art/sprites/pics/win_leo_clock.webp';
import win_leo_moon from '../../art/sprites/pics/win_leo_moon.webp';
import win_leo_pearl from '../../art/sprites/pics/win_leo_pearl.webp';
import win_leo_prism from '../../art/sprites/pics/win_leo_prism.webp';
import win_leo_seed from '../../art/sprites/pics/win_leo_seed.webp';
import win_luna_moon from '../../art/sprites/pics/win_luna_moon.webp';
import win_mittens_moon from '../../art/sprites/pics/win_mittens_moon.webp';
import win_sammy_moon from '../../art/sprites/pics/win_sammy_moon.webp';
import win_prof_moon from '../../art/sprites/pics/win_prof_moon.webp';
import cat_leo from '../../art/sprites/pics/cat_leo.webp';
import cat_luna from '../../art/sprites/pics/cat_luna.webp';
import cat_mittens from '../../art/sprites/pics/cat_mittens.webp';
import cat_sammy from '../../art/sprites/pics/cat_sammy.webp';
import cat_prof from '../../art/sprites/pics/cat_prof.webp';
import keyart from '../../art/sprites/pics/keyart.webp';
import legend_leo from '../../art/sprites/pics/legend_leo.webp';
import boss_nightclaw from '../../art/sprites/pics/boss_nightclaw.webp';
import g_decoy from '../../art/sprites/pics/g_decoy.webp';
import g_smoke from '../../art/sprites/pics/g_smoke.webp';
import g_emp from '../../art/sprites/pics/g_emp.webp';
import g_sardine from '../../art/sprites/pics/g_sardine.webp';
import g_treat from '../../art/sprites/pics/g_treat.webp';

/** Leo on the rooftop with the night's prize: which picture, by what the prize is. */
export function rooftopPicture(prize: string): string {
  const p = prize.toLowerCase();
  if (/clock|watch|astrolabe|music box|sextant|compass|telescope|automaton|clockwork/.test(p)) return win_leo_clock;
  if (/moon|meteorite|comet|star|night|planet/.test(p)) return win_leo_moon;
  if (/pearl|egg|bell/.test(p)) return win_leo_pearl;
  if (/diamond|sapphire|emerald|ruby|opal|topaz|quartz|jade|crown|tiara|gem|siam|crystal|fabergé|swan/.test(p)) return win_leo_prism;
  return win_leo_seed;
}

const RIVAL_ROOFTOP: Record<RivalId, string> = { luna: win_luna_moon, mittens: win_mittens_moon, sammy: win_sammy_moon, paws: win_prof_moon };
/** A rival on the rooftop with the prize Leo didn't get. */
export function rivalRooftop(id: RivalId): string {
  return RIVAL_ROOFTOP[id];
}

const PORTRAITS: Record<RivalId | 'leo', string> = { leo: cat_leo, luna: cat_luna, mittens: cat_mittens, sammy: cat_sammy, paws: cat_prof };
export function portrait(who: RivalId | 'leo'): string {
  return PORTRAITS[who];
}

export const LEGEND_PICTURE = legend_leo;
export const KEY_ART = keyart;
export const NIGHTCLAW_PICTURE = boss_nightclaw;

/** Icons for the gadgets and skills that have one. */
export const ABILITY_ICONS: Partial<Record<Ability, string>> = { 'decoy-card': g_decoy, smoke: g_smoke, emp: g_emp, 'cat-nap': g_sardine, 'second-wind': g_treat };
