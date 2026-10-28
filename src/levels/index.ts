// Every level, grouped into the city's districts in the order they unlock.
import type { LevelDef } from '../core/level';
import { CORNER_GALLERY } from './tutorial';
import { CLOCKTOWER, COIN_MUSEUM, OPERA_HOUSE, PAWNBROKER } from './oldtown';
import { EGYPTIAN_WING, GEM_HALL, MODERN_ART, NATURAL_HISTORY, PLANETARIUM } from './museummile';
import { GLASS_TOWER, MANSION, OBSERVATORY, SKY_GARDEN, YACHT_CLUB } from './heights';
import { MIDNIGHT_MUSEUM, NIGHTCLAW_LAIR } from './midnight';
import { AQUARIUM, CUSTOMS_WAREHOUSE, FISH_BANK, LIGHTHOUSE, SHIPWRECK } from './harbour';
import { CASINO, GRAND_BANK, MINT, MISCHIEF, TREASURY } from './downtown';

export interface District {
  id: string;
  name: string;
  levels: LevelDef[];
}

export const DISTRICTS: District[] = [
  { id: 'old-town', name: 'Old Town', levels: [CORNER_GALLERY, COIN_MUSEUM, CLOCKTOWER, PAWNBROKER, OPERA_HOUSE] },
  { id: 'museum-mile', name: 'Museum Mile', levels: [NATURAL_HISTORY, EGYPTIAN_WING, MODERN_ART, GEM_HALL, PLANETARIUM] },
  { id: 'the-heights', name: 'The Heights', levels: [MANSION, SKY_GARDEN, GLASS_TOWER, YACHT_CLUB, OBSERVATORY] },
  { id: 'harbour', name: 'Harbour', levels: [CUSTOMS_WAREHOUSE, LIGHTHOUSE, SHIPWRECK, FISH_BANK, AQUARIUM] },
  { id: 'downtown', name: 'Downtown', levels: [GRAND_BANK, CASINO, MINT, MISCHIEF, TREASURY] },
  // NightClaw's challenge (opened by his second letter) and his lair (by his fourth), not by clearing the heist before.
  { id: 'nightclaw', name: 'NightClaw’s Challenge', levels: [MIDNIGHT_MUSEUM, NIGHTCLAW_LAIR] },
];

export const ALL_LEVELS: LevelDef[] = DISTRICTS.flatMap((d) => d.levels);
