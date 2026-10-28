// Achievements: checked against the save after every heist and every visit to the lair. Each has a Steam API
// name, ready for when the Steam build is wired up; in the browser they live in the save.
import { RIVALS, type RivalId } from '../core/game';
import { DISTRICTS } from '../levels';
import { challengeDone, hasLetter } from './letters';
import { ROOMS, SKILLS } from './progression';
import type { HeistReport, Profile } from './profile';

export interface Achievement {
  id: string;
  steam: string;
  name: string;
  text: string;
  /** Hidden until earned (story spoilers). */
  secret?: boolean;
  earned: (p: Profile, r: HeistReport | null) => boolean;
}

const cleared = (p: Profile, ids: string[]) => ids.every((id) => p.records[id]);
const districtIds = (i: number) => DISTRICTS[i].levels.map((l) => l.id);
const centrepieces = (p: Profile) => Object.values(p.records).filter((r) => r.centrepiece).length;
const beat = (p: Profile, id: RivalId) => (p.rivalRecord[id]?.won ?? 0) > 0;

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-night', steam: 'ACH_FIRST_NIGHT', name: 'First Night', text: 'Finish the tutorial at the Corner Gallery.', earned: (p) => p.tutorialDone },
  { id: 'home', steam: 'ACH_HOME_SWEET_LAIR', name: 'Home Sweet Lair', text: 'Buy the abandoned building.', earned: (p) => p.lairOwned },
  { id: 'ghost', steam: 'ACH_GHOST', name: 'Ghost in a Tuxedo', text: 'Take a centrepiece in a flawless heist after the tutorial.', earned: (p) => Object.entries(p.records).some(([id, r]) => r.flawless && id !== 'l0-corner-gallery') },
  ...DISTRICTS.slice(0, 5).map((d, i) => ({
    id: `district-${d.id}`,
    steam: `ACH_DISTRICT_${i + 1}`,
    name: ['Old Town Cat', 'Museum Mile Marauder', 'High Society', 'Harbour Master', 'Downtown Legend'][i] ?? d.name,
    text: `Clear every heist in ${d.name}.`,
    earned: (p: Profile) => cleared(p, districtIds(i)),
  })),
  ...(Object.keys(RIVALS) as RivalId[]).map((id) => ({
    id: `beat-${id}`,
    steam: `ACH_BEAT_${id.toUpperCase()}`,
    name: `One Up on ${RIVALS[id].name.split(' ')[0]}`,
    text: `Beat ${RIVALS[id].name} to a centrepiece.`,
    earned: (p: Profile) => beat(p, id),
  })),
  { id: 'rivals', steam: 'ACH_ALL_RIVALS', name: 'No Competition', text: 'Beat all four rival thieves at least once.', earned: (p) => (Object.keys(RIVALS) as RivalId[]).every((id) => beat(p, id)) },
  { id: 'fence', steam: 'ACH_FENCES_FRIEND', name: 'The Fence’s Favourite', text: 'Sell 10,000 Catnip of loot on the black market.', earned: (p) => p.soldTotal >= 10000 },
  { id: 'tycoon', steam: 'ACH_CATNIP_TYCOON', name: 'Catnip Tycoon', text: 'Sell 50,000 Catnip of loot on the black market.', earned: (p) => p.soldTotal >= 50000 },
  { id: 'trophies', steam: 'ACH_TROPHY_HUNTER', name: 'Trophy Hunter', text: 'Steal ten centrepieces.', earned: (p) => centrepieces(p) >= 10 },
  { id: 'full-pockets', steam: 'ACH_FULL_POCKETS', name: 'Full Pockets', text: 'Escape with every inventory space filled.', earned: (_p, r) => !!r && r.spacesUsed >= r.spaces },
  { id: 'quick', steam: 'ACH_QUICK_PAWS', name: 'Quick Paws', text: 'Escape in no more than half a heist’s par turns.', earned: (_p, r) => !!r && !!r.par && r.turns <= r.par / 2 && r.items.length > 0 },
  { id: 'skills', steam: 'ACH_JACK_OF_ALL_TRADES', name: 'Jack of All Trades', text: 'Learn every skill.', earned: (p) => SKILLS.every((s) => p.skills.includes(s.id)) },
  { id: 'lair', steam: 'ACH_FULLY_FURNISHED', name: 'Fully Furnished', text: 'Upgrade every room of the lair to its top tier.', earned: (p) => ROOMS.every((r) => p.rooms[r.id] >= r.tiers.length) },
  { id: 'pen-pal', steam: 'ACH_PEN_PAL', name: 'Pen Pal', text: 'Receive NightClaw’s first letter.', earned: (p) => hasLetter(p, 1) },
  { id: 'music-box', steam: 'ACH_MIDNIGHT', name: 'Midnight', text: 'Steal the Midnight Music Box.', secret: true, earned: (p) => hasLetter(p, 3) },
  { id: 'challenge', steam: 'ACH_NIGHTCLAW_CHALLENGE', name: 'NightClaw’s Equal', text: 'Complete the NightClaw Challenge.', secret: true, earned: (p) => challengeDone(p) },
  { id: 'legendary', steam: 'ACH_LEGENDARY', name: 'Legendary', text: 'Creep up on NightClaw in his lair.', secret: true, earned: (p) => p.legendary },
];

/** Awards whatever has just been earned. Returns the new ones, for the toast. */
export function checkAchievements(p: Profile, r: HeistReport | null = null): Achievement[] {
  const fresh = ACHIEVEMENTS.filter((a) => !p.achievements.includes(a.id) && a.earned(p, r));
  p.achievements.push(...fresh.map((a) => a.id));
  return fresh;
}
