// Tuning numbers for a heist (action points, sight, noise...) and Leo's perks.
import type { GuardKind } from './level';

export const AP_PER_TURN = 2;
/** Tiles of movement one action point buys (diagonals cost 1.5). */
export const MOVE_PER_AP = 5;
/** Crawling through a vent costs this much more per tile. */
export const CRAWL = 1.5;
export const GUARD_STEPS = 4;
export const SEARCH_STEPS = 5;
/** Half of the vision cone, in degrees. */
export const SIGHT_HALF_ANGLE = 45;
/** How far guards and cameras can make Leo out, by the light he's standing in. */
export const SIGHT_RANGE = { lit: 6, dim: 4, dark: 1.5 };
/** Turns a suspicious guard spends looking around before going back to his route. */
export const LOOK_TURNS = 2;
/** Turns from an alarm to lockdown. */
export const ALARM_TURNS = 5;
export const INVENTORY_SPACES = 6;
export const NOISE = { marble: 2, dash: 4, pick: 1, smash: 6, squeaky: 4, drop: 3, bark: 5, splash: 4 };
/** Lock picking minigame: how far away a slipped pick is heard (tiles), by kind of lock. */
export const LOCK_SLIP_NOISE = { 'pick-door': 3, 'pick-case': 4, 'crack-safe': 4, 'turn-dials': 5 } as const;
export type LockAction = keyof typeof LOCK_SLIP_NOISE;
/** Picks needed to open a lock. */
export const LOCK_PICKS = 2;
/** Goes needed to crack a safe (quiet, but slow). */
export const SAFE_CRACKS = 3;
/** Goes at a vault door's dials, once Leo has the combination. */
export const VAULT_DIALS = 2;
/** A guard dog barks at Leo within this many tiles (not in vents or the rafters). */
export const BARK_RANGE = 2;
/** How far guard types see, as a share of a night-watch guard. */
export const KIND_SIGHT: Record<GuardKind, number> = {
  watch: 1,
  sleepy: 1,
  captain: 1.25,
  sniffer: 0.6,
  robo: 1,
  nightclaw: 1,
};
/** How far a Robo-Guard's heat scanner picks Leo up, in any light. */
export const ROBO_RANGE = 4;
/** Wet paint: steps of paw prints left, and turns a print takes to dry. */
export const PAINT_STEPS = 4;
export const PRINT_TURNS = 4;
/** How far a sniffer smells Leo, through walls (not in vents or rafters). */
export const SCENT_RANGE = 2;
/** A captain who gets suspicious calls guards within this many tiles. */
export const CAPTAIN_CALL = 7;
/** Gadgets and active skills. Most have a few charges per heist. */
export type Ability =
  | 'bottle-cap'
  | 'decoy-card'
  | 'smoke'
  | 'camera-loop'
  | 'fuse-kit'
  | 'emp'
  | 'pounce'
  | 'cat-nap'
  | 'second-wind';
/** What Leo's stats, skills and lair give him in a heist (worked out in meta/progression.ts). */
export interface Perks {
  movePerAp: number; // Agility
  crawl: number; // vent cost per tile; Agility
  sight: number; // how far guards and cameras make Leo out, as a share of normal; Stealth
  blend: boolean; // dim light counts as dark (Shadow: Blend)
  noise: number; // share of the noise Leo makes; Quiet Paws
  casePicks: number; // goes needed to pick a case; Dexterity
  safeCracks: number; // goes needed to crack a safe; Dexterity
  doorPicks: number; // and a door; Dexterity, Tech: Keycard Clone
  silentPicks: boolean; // Dexterity 5
  lockSpeed: number; // how fast the lock picking dial spins, as a share of normal; Dexterity
  spaces: number; // inventory; Pockets
  previewTurns: number; // guard footprints shown this many turns ahead; Perception, Planning Table
  ghostStep: boolean; // the first noisy move of a heist makes none (Shadow)
  vanish: boolean; // the first time a guard glimpses Leo, he's gone before it registers (Shadow)
  laserMirror: boolean; // the first laser Leo breaks bounces harmlessly (Tech)
  ceilingClimb: boolean; // drops from the rafters land silently (Acrobat)
  tightrope: boolean; // walk the wires over gaps (Acrobat)
  masterKey: boolean; // keycard doors open without the keycard (Tech: Keycard Clone)
  charges: Partial<Record<Ability, number>>; // per heist; pounce is unlimited when owned
}
/** A fresh Leo with no upgrades. */
export const BASE_PERKS: Perks = {
  movePerAp: MOVE_PER_AP,
  crawl: CRAWL,
  sight: 1,
  blend: false,
  noise: 1,
  casePicks: LOCK_PICKS,
  safeCracks: SAFE_CRACKS,
  doorPicks: LOCK_PICKS,
  silentPicks: false,
  lockSpeed: 1,
  spaces: INVENTORY_SPACES,
  previewTurns: 1,
  ghostStep: false,
  vanish: false,
  laserMirror: false,
  ceilingClimb: false,
  tightrope: false,
  masterKey: false,
  charges: {},
};
