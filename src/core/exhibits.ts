// What stands under each ceiling light (a lamp on the map): something picked for the district and the tile.
// Anything small enough to carry (on a pedestal, or a chest) is loot too: it's in the light, so it's a risk.
// Life-size statues, plants, grandfather clocks and fish tanks are just the furniture.
import type { LevelDef, LootCategory, LootDef, Point } from './level';

export interface Exhibit {
  /** A baked 3D model (art/sprites/<model>.webp), or a flat picture standing upright. */
  model?: string;
  flat?: string;
  pedestal: boolean;
  /** If Leo can take it: its names (one picked per tile), what kind of thing it is, its worth and its size. */
  loot?: { names: string[]; category: LootCategory; value: number; space: number };
}

const BUST: Exhibit = { model: 'marble_bust_01', pedestal: true, loot: { names: ['Marble Bust of a Distinguished Cat', 'Marble Bust of the Founder', 'Bust of a Forgotten Poet'], category: 'artefact', value: 1400, space: 2 } };
const HORSE: Exhibit = { model: 'horse_statue_01', pedestal: true, loot: { names: ['Bronze Racehorse', 'Little Bronze Stallion'], category: 'artefact', value: 1800, space: 2 } };
const MANTEL: Exhibit = { model: 'mantel_clock_01', pedestal: true, loot: { names: ['Gilt Mantel Clock', 'Carriage Clock'], category: 'artefact', value: 1200, space: 2 } };
const CAT_IDOL: Exhibit = { model: 'concrete_cat_statue', pedestal: true, loot: { names: ['Stone Cat Idol', 'Temple Cat Figure'], category: 'artefact', value: 1600, space: 2 } };
const CONCH: Exhibit = { model: 'lambis_shell', pedestal: true, loot: { names: ['Spider Conch Shell', 'Giant Pink Conch'], category: 'curiosity', value: 700, space: 1 } };
const LANTERN: Exhibit = { model: 'Lantern_01', pedestal: true, loot: { names: ['Old Ship’s Lantern', 'Lighthouse Keeper’s Lantern'], category: 'curiosity', value: 600, space: 1 } };
const CHEST: Exhibit = { model: 'treasure_chest', pedestal: false, loot: { names: ['Sea Chest of Trinkets', 'Pirate’s Strongbox'], category: 'curiosity', value: 1500, space: 3 } };
const CAT_STATUE: Exhibit = { flat: 'spr_statue', pedestal: false, loot: { names: ['Alabaster Cat on a Plinth'], category: 'artefact', value: 2000, space: 2 } };
const STATUE: Exhibit = { model: 'gothic_statue', pedestal: false };
const PLANT: Exhibit = { model: 'potted_plant_01', pedestal: false };
const PLANT2: Exhibit = { model: 'potted_plant_02', pedestal: false };
const GRANDFATHER: Exhibit = { model: 'vintage_grandfather_clock_01', pedestal: false };
const TANK: Exhibit = { flat: 'spr_tank', pedestal: false };
const TALL_TANK: Exhibit = { flat: 'spr_tanktall', pedestal: false };

const BY_DISTRICT: Record<string, Exhibit[]> = {
  'old-town': [BUST, HORSE, MANTEL, STATUE],
  'museum-mile': [BUST, STATUE, CAT_STATUE, HORSE],
  'the-heights': [PLANT, BUST, PLANT2, STATUE],
  harbour: [CONCH, CHEST, LANTERN, CONCH],
  downtown: [PLANT, HORSE, PLANT2, BUST],
  nightclaw: [STATUE, MANTEL, CAT_IDOL, BUST],
};
const BY_LEVEL: Record<string, Exhibit[]> = {
  'l2-clocktower': [GRANDFATHER, MANTEL],
  'l17-shipwreck': [CHEST, TANK, CONCH],
  'l18-fish-bank': [TANK, CONCH, TALL_TANK],
  'l19-aquarium': [TANK, TALL_TANK, TALL_TANK, TANK],
};

/** A heist's district, from its id (l0–l4 Old Town, l5–l9 Museum Mile, and so on). */
export function districtOfLevel(id: string): string {
  if (id.startsWith('nc-')) return 'nightclaw';
  const n = Number(/^l(\d+)-/.exec(id)?.[1] ?? 0);
  return ['old-town', 'museum-mile', 'the-heights', 'harbour', 'downtown'][Math.min(4, Math.floor(n / 5))];
}

/** A tile's own number, for picking things: the same tile always gets the same one. */
export function tileHash(x: number, y: number, salt = 0): number {
  let h = (x * 73856093) ^ (y * 19349663) ^ (salt * 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

export function exhibitAt(levelId: string, x: number, y: number): Exhibit {
  const list = BY_LEVEL[levelId] ?? BY_DISTRICT[districtOfLevel(levelId)] ?? BY_DISTRICT['old-town'];
  return list[Math.floor(tileHash(x, y, 11) * list.length)];
}

/** The loot standing under a heist's lights, in map order, each with its own name. */
export function exhibitLoot(def: LevelDef): LootDef[] {
  const out: LootDef[] = [];
  const lamps: Point[] = [];
  def.map.forEach((row, y) => [...row].forEach((c, x) => c === 'L' && lamps.push({ x, y })));
  for (const at of lamps) {
    const e = exhibitAt(def.id, at.x, at.y);
    if (!e.loot) continue;
    const names = e.loot.names;
    let name = names[Math.floor(tileHash(at.x, at.y, 13) * names.length)];
    // Two of the same in one building: the second gets another of its names, or a number.
    const taken = (n: string) => out.some((l) => l.name === n) || def.loot.some((l) => l.name === n);
    if (taken(name)) name = names.find((n) => !taken(n)) ?? `${name} (No. ${out.filter((l) => l.name.startsWith(name)).length + 1})`;
    out.push({ at, name, category: e.loot.category, value: e.loot.value, space: e.loot.space });
  }
  return out;
}

/** All of a heist's loot: what's in its cases, safes and on its plinth, and what stands under its lights. */
export function allLoot(def: LevelDef): LootDef[] {
  return [...def.loot, ...exhibitLoot(def)];
}

/** Which picture each exhibit's loot uses: the model's (or flat picture's) own name. */
export const EXHIBIT_PICTURES: Record<string, string> = Object.fromEntries(
  [BUST, HORSE, MANTEL, CAT_IDOL, CONCH, LANTERN, CHEST, CAT_STATUE].flatMap((e) => e.loot!.names.map((n) => [n, e.model ?? e.flat!])),
);
