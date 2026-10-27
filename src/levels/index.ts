// Every level, grouped into the city's districts in the order they unlock.
import type { LevelDef } from '../core/level';
import { CORNER_GALLERY } from './tutorial';
import { NIGHT_GALLERY } from './prototype';
import { CLOCKTOWER, COIN_MUSEUM, OPERA_HOUSE, PAWNBROKER } from './oldtown';

export interface District {
  id: string;
  name: string;
  levels: LevelDef[];
}

export const DISTRICTS: District[] = [
  { id: 'old-town', name: 'Old Town', levels: [CORNER_GALLERY, COIN_MUSEUM, CLOCKTOWER, PAWNBROKER, OPERA_HOUSE] },
  { id: 'museum-mile', name: 'Museum Mile', levels: [NIGHT_GALLERY] },
];

export const ALL_LEVELS: LevelDef[] = DISTRICTS.flatMap((d) => d.levels);
