// Leo's progression: levels, attributes, the three skill trees, and the lair's rooms.
// Everything here is data plus small pure functions; perksFor() turns a profile into what Leo brings
// into a heist.
import { BASE_PERKS, type Ability, type Perks } from '../core/game';
import type { Profile } from './profile';

// --- XP and levels ---------------------------------------------------------------------------

export const LEVEL_CAP = 30;

/** XP needed to go from level l to l + 1. */
export function xpToNext(l: number): number {
  return 150 + 100 * (l - 1);
}

/** Total XP needed to reach level l. */
export function xpForLevel(l: number): number {
  let total = 0;
  for (let k = 1; k < l; k++) total += xpToNext(k);
  return total;
}

export function playerLevel(xp: number): number {
  let l = 1;
  while (l < LEVEL_CAP && xp >= xpForLevel(l + 1)) l++;
  return l;
}

// --- Attributes ------------------------------------------------------------------------------

export type Attribute = 'agility' | 'stealth' | 'quietPaws' | 'dexterity' | 'pockets' | 'perception';

export interface AttributeInfo {
  id: Attribute;
  name: string;
  blurb: string;
  /** What each rank adds, in order; the attribute's top rank is the list's length. */
  ranks: string[];
}

export const ATTRIBUTES: AttributeInfo[] = [
  { id: 'agility', name: 'Agility', blurb: 'Further moves and quicker crawling.', ranks: ['+1 tile per action point', 'Crawl through vents faster', '+1 tile per action point', 'Crawl through vents faster', '+1 tile per action point'] },
  { id: 'stealth', name: 'Stealth', blurb: 'Harder to make out: guards and cameras see Leo from less far away.', ranks: ['Seen from 7% less far', 'Seen from 14% less far', 'Seen from 21% less far', 'Seen from 28% less far', 'Seen from 35% less far'] },
  { id: 'quietPaws', name: 'Quiet Paws', blurb: 'Less noise from everything Leo does.', ranks: ['12% quieter', '24% quieter', '36% quieter', '48% quieter', '60% quieter'] },
  { id: 'dexterity', name: 'Dexterity', blurb: 'Faster, quieter lockpicking.', ranks: ['Cases open in one go, safes in one go less', 'Doors open in one go', 'Picking a lock makes no sound'] },
  { id: 'pockets', name: 'Pockets', blurb: 'More inventory space.', ranks: ['+1 inventory space', '+1 inventory space', '+1 inventory space', '+1 inventory space'] },
  { id: 'perception', name: 'Perception', blurb: 'Read the guards further ahead: their footprints show more turns.', ranks: ['Footprints 1 more turn ahead', 'Footprints 1 more turn ahead'] },
];

export const attributeInfo = (id: Attribute) => ATTRIBUTES.find((a) => a.id === id)!;

/** Points to spend: one per level after the first. */
export function attributePoints(p: Profile): number {
  const spent = Object.values(p.attributes).reduce((n, r) => n + r, 0);
  return playerLevel(p.xp) - 1 - spent;
}

/** Catnip for the next rank of an attribute (the Gym takes 15% off per tier). */
export function attributeCost(p: Profile, id: Attribute): number {
  const rank = p.attributes[id];
  return Math.round(150 * (rank + 1) * (1 - 0.15 * p.rooms.gym));
}

export function canRaise(p: Profile, id: Attribute): string | null {
  if (p.attributes[id] >= attributeInfo(id).ranks.length) return 'Already at the top rank.';
  if (attributePoints(p) < 1) return 'Needs an attribute point: Leo gets one each level.';
  if (p.catnip < attributeCost(p, id)) return 'Not enough Catnip.';
  return null;
}

export function raise(p: Profile, id: Attribute): boolean {
  if (canRaise(p, id)) return false;
  p.catnip -= attributeCost(p, id);
  p.attributes[id]++;
  return true;
}

// --- Skills ----------------------------------------------------------------------------------

export type Tree = 'shadow' | 'tech' | 'acrobat';
export type SkillId =
  | 'blend'
  | 'ghost-step'
  | 'decoy-card'
  | 'smoke-pellet'
  | 'vanish'
  | 'camera-loop'
  | 'laser-mirror'
  | 'keycard-clone'
  | 'fuse-kit'
  | 'emp-collar'
  | 'pounce'
  | 'ceiling-climb'
  | 'tightrope'
  | 'cat-nap'
  | 'second-wind';

export interface SkillInfo {
  id: SkillId;
  tree: Tree;
  name: string;
  text: string;
  level: number;
  cost: number;
  requires?: SkillId;
  /** Not buyable yet: the levels it's for arrive later. */
  later?: string;
}

export const TREES: { id: Tree; name: string; blurb: string }[] = [
  { id: 'shadow', name: 'Shadow', blurb: 'Stay unseen.' },
  { id: 'tech', name: 'Tech', blurb: 'Beat the machines.' },
  { id: 'acrobat', name: 'Acrobat', blurb: 'Go where nobody else can.' },
];

export const SKILLS: SkillInfo[] = [
  { id: 'blend', tree: 'shadow', name: 'Blend', text: 'Dim light counts as dark: guards have to be almost on top of Leo to see him in moonlight.', level: 2, cost: 300 },
  { id: 'ghost-step', tree: 'shadow', name: 'Ghost Step', text: 'The first move of each heist that would make a sound (marble, a dash) makes none.', level: 4, cost: 500, requires: 'blend' },
  { id: 'decoy-card', tree: 'shadow', name: 'Decoy Card', text: 'Once a heist, prop a calling card up to 5 tiles away. The first guard to see it goes over to look.', level: 7, cost: 900, requires: 'ghost-step' },
  { id: 'smoke-pellet', tree: 'shadow', name: 'Smoke Pellet', text: 'Once a heist, a 3×3 cloud up to 5 tiles away. Nobody sees into it or through it for two turns.', level: 12, cost: 1600, requires: 'decoy-card' },
  { id: 'vanish', tree: 'shadow', name: 'Vanish', text: 'The first time a guard glimpses Leo each heist, he’s gone before it registers.', level: 20, cost: 3000, requires: 'smoke-pellet' },
  { id: 'camera-loop', tree: 'tech', name: 'Camera Loop', text: 'Once a heist, loop a camera within 7 tiles: it sees nothing for three turns.', level: 3, cost: 400 },
  { id: 'laser-mirror', tree: 'tech', name: 'Laser Mirror', text: 'The first laser beam Leo breaks each heist bounces off harmlessly.', level: 5, cost: 600, requires: 'camera-loop' },
  { id: 'keycard-clone', tree: 'tech', name: 'Keycard Clone', text: 'A copy of the master keycard: locked doors open in one go.', level: 8, cost: 1000, requires: 'laser-mirror' },
  { id: 'fuse-kit', tree: 'tech', name: 'Fuse Kit', text: 'Once a heist, short every laser in the building for three turns, from anywhere.', level: 11, cost: 1400, requires: 'keycard-clone' },
  { id: 'emp-collar', tree: 'tech', name: 'EMP Collar', text: 'Once a heist, knock out every camera within 5 tiles, and all the lasers, for two turns.', level: 18, cost: 2800, requires: 'fuse-kit' },
  { id: 'pounce', tree: 'acrobat', name: 'Pounce', text: 'Leap two tiles in a straight line, over a laser, a case or a lamp, without a sound. 1 action point, any number of times.', level: 3, cost: 400 },
  { id: 'ceiling-climb', tree: 'acrobat', name: 'Ceiling Climb', text: 'Climb the ladders into the rafters and walk the beams where nobody looks. Drop down anywhere (thump), or climb down a ladder quietly.', level: 6, cost: 800, requires: 'pounce' },
  { id: 'tightrope', tree: 'acrobat', name: 'Tightrope', text: 'Cross gaps on wires and beams.', level: 9, cost: 1100, requires: 'pounce', later: 'Arrives with the rooftop levels.' },
  { id: 'cat-nap', tree: 'acrobat', name: 'Cat Nap', text: 'Once a heist, curl up in a shadow: for two turns no guard notices Leo unless they trip over him.', level: 15, cost: 2200, requires: 'pounce' },
  { id: 'second-wind', tree: 'acrobat', name: 'Second Wind', text: 'Once a heist, after spending an action point, catch your breath: one more action point this turn.', level: 25, cost: 4000, requires: 'cat-nap' },
];

export const skillInfo = (id: SkillId) => SKILLS.find((s) => s.id === id)!;

export function canLearn(p: Profile, id: SkillId): string | null {
  const s = skillInfo(id);
  if (p.skills.includes(id)) return 'Already learned.';
  if (s.later) return s.later;
  if (s.requires && !p.skills.includes(s.requires)) return `Needs ${skillInfo(s.requires).name} first.`;
  if (playerLevel(p.xp) < s.level) return `Needs level ${s.level}.`;
  if (p.catnip < s.cost) return 'Not enough Catnip.';
  return null;
}

export function learn(p: Profile, id: SkillId): boolean {
  if (canLearn(p, id)) return false;
  p.catnip -= skillInfo(id).cost;
  p.skills.push(id);
  return true;
}

// --- The lair's rooms ------------------------------------------------------------------------

export type Room = 'planning' | 'workshop' | 'fence' | 'gym' | 'trophy' | 'mailbox';

export interface RoomInfo {
  id: Room;
  name: string;
  blurb: string;
  tiers: { cost: number; text: string }[];
}

export const ROOMS: RoomInfo[] = [
  {
    id: 'planning',
    name: 'Planning Table',
    blurb: 'Intel before a heist.',
    tiers: [
      { cost: 400, text: 'The floor plan before each heist: walls, vents, exits, loot, and the rumour board.' },
      { cost: 1200, text: 'Adds every camera and lamp to the plan.' },
      { cost: 2500, text: 'Adds the guards’ routes to the plan, and their footprints show a turn further ahead.' },
    ],
  },
  {
    id: 'workshop',
    name: 'Workshop',
    blurb: 'Gadgets for every heist.',
    tiers: [
      { cost: 300, text: 'One bottle cap per heist: flick it up to 6 tiles and guards go to see what clinked.' },
      { cost: 900, text: 'Two bottle caps per heist.' },
      { cost: 2000, text: 'Three bottle caps, and a spare charge of each once-a-heist skill.' },
    ],
  },
  {
    id: 'fence',
    name: 'Fence’s Office',
    blurb: 'Better prices on the black market.',
    tiers: [
      { cost: 500, text: 'The fence pays 5% more.' },
      { cost: 1500, text: '10% more, and a collector pays ×1.5 for one item a day.' },
      { cost: 3000, text: '15% more.' },
    ],
  },
  {
    id: 'gym',
    name: 'Scratching Tower',
    blurb: 'Cheaper attribute training.',
    tiers: [
      { cost: 400, text: 'Attributes cost 15% less Catnip.' },
      { cost: 1200, text: '30% less.' },
      { cost: 2400, text: '45% less.' },
    ],
  },
  {
    id: 'trophy',
    name: 'Trophy Room',
    blurb: 'Show off every centrepiece Leo has stolen.',
    tiers: [
      { cost: 600, text: 'Displays the centrepieces. Fame: +5% XP from heists.' },
      { cost: 1500, text: '+10% XP.' },
      { cost: 3000, text: '+15% XP.' },
    ],
  },
  { id: 'mailbox', name: 'Mailbox', blurb: 'Somewhere for letters to arrive.', tiers: [{ cost: 200, text: 'A proper mailbox by the door. Who would write to a thief?' }] },
];

export const roomInfo = (id: Room) => ROOMS.find((r) => r.id === id)!;

export function upgradeCost(p: Profile, id: Room): number | null {
  const t = roomInfo(id).tiers[p.rooms[id]];
  return t ? t.cost : null;
}

export function canUpgrade(p: Profile, id: Room): string | null {
  const cost = upgradeCost(p, id);
  if (cost === null) return 'Fully upgraded.';
  if (p.catnip < cost) return 'Not enough Catnip.';
  return null;
}

export function upgrade(p: Profile, id: Room): boolean {
  if (canUpgrade(p, id)) return false;
  p.catnip -= upgradeCost(p, id)!;
  p.rooms[id]++;
  return true;
}

/** How done-up the lair looks, 0 to 1. */
export function lairCondition(p: Profile): number {
  const max = ROOMS.reduce((n, r) => n + r.tiers.length, 0);
  return Object.values(p.rooms).reduce((n, t) => n + t, 0) / max;
}

// --- Into a heist ------------------------------------------------------------------------------

/** What Leo's attributes, skills and lair bring to a heist. */
export function perksFor(p: Profile): Perks {
  const a = p.attributes;
  const has = (id: SkillId) => p.skills.includes(id);
  const agilityMoves = [0, 1, 1, 2, 2, 3][a.agility];
  const agilityCrawl = [0, 0, 1, 1, 2, 2][a.agility];
  const spare = p.rooms.workshop >= 3 ? 1 : 0;
  const charges: Partial<Record<Ability, number>> = {};
  if (p.rooms.workshop) charges['bottle-cap'] = p.rooms.workshop;
  if (has('decoy-card')) charges['decoy-card'] = 1 + spare;
  if (has('smoke-pellet')) charges.smoke = 1 + spare;
  if (has('camera-loop')) charges['camera-loop'] = 1 + spare;
  if (has('fuse-kit')) charges['fuse-kit'] = 1 + spare;
  if (has('emp-collar')) charges.emp = 1 + spare;
  if (has('pounce')) charges.pounce = 99;
  if (has('cat-nap')) charges['cat-nap'] = 1 + spare;
  if (has('second-wind')) charges['second-wind'] = 1 + spare;
  return {
    ...BASE_PERKS,
    movePerAp: BASE_PERKS.movePerAp + agilityMoves,
    crawl: BASE_PERKS.crawl - 0.2 * agilityCrawl,
    sight: Math.round((1 - 0.07 * a.stealth) * 100) / 100,
    blend: has('blend'),
    noise: Math.round((1 - 0.12 * a.quietPaws) * 100) / 100,
    casePicks: a.dexterity >= 1 ? 1 : BASE_PERKS.casePicks,
    safeCracks: BASE_PERKS.safeCracks - (a.dexterity >= 1 ? 1 : 0),
    doorPicks: a.dexterity >= 2 || has('keycard-clone') ? 1 : BASE_PERKS.doorPicks,
    silentPicks: a.dexterity >= 3,
    spaces: BASE_PERKS.spaces + a.pockets,
    previewTurns: 1 + a.perception + (p.rooms.planning >= 3 ? 1 : 0),
    ghostStep: has('ghost-step'),
    vanish: has('vanish'),
    laserMirror: has('laser-mirror'),
    ceilingClimb: has('ceiling-climb'),
    charges,
  };
}
