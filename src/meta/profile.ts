// Everything that lasts between heists: Catnip, XP, the stash of unsold loot, the lair, the front pages.
// Pure functions over a plain object, so the save is just JSON and the rules can be unit-tested.
import type { Level, LootCategory } from '../core/level';
import { inventoryValue, type State } from '../core/game';
import { writePaper, type Paper } from './newspaper';

export const LEVEL_CAP = 30;
/** What the narrator pays for the tutorial loot, and exactly what the abandoned building costs. */
export const STARTING_CATNIP = 500;
export const LAIR_PRICE = STARTING_CATNIP;
export const DEMAND_BONUS = 0.25;
/** Newspaper estimates are in dollars; the fences pay one Catnip for every $10 of it, before their cut. */
export const DOLLARS_PER_CATNIP = 10;
export const CATEGORIES: LootCategory[] = ['jewel', 'painting', 'artefact', 'curiosity'];

export interface StashItem {
  id: number;
  name: string;
  category: LootCategory;
  value: number; // the newspaper's estimate
  levelId: string;
  levelName: string;
  centrepiece: boolean;
  /** Stolen on a replay: the fences say it's hot and pay half. */
  hot: boolean;
}

export interface LevelRecord {
  clears: number;
  bestTurns: number;
  centrepiece: boolean;
  flawless: boolean;
}

export interface Profile {
  version: 1;
  day: number; // one per heist; the market's demand changes every few days
  catnip: number;
  xp: number;
  tutorialDone: boolean;
  narratorPaid: boolean;
  lairOwned: boolean;
  stash: StashItem[];
  nextId: number;
  heists: number;
  soldTotal: number; // lifetime Catnip from the black market
  records: Record<string, LevelRecord>;
  papers: Paper[]; // newest first
}

export function newProfile(): Profile {
  return {
    version: 1,
    day: 1,
    catnip: 0,
    xp: 0,
    tutorialDone: false,
    narratorPaid: false,
    lairOwned: false,
    stash: [],
    nextId: 1,
    heists: 0,
    soldTotal: 0,
    records: {},
    papers: [],
  };
}

// --- XP and levels ---------------------------------------------------------------------------

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

// --- The black market ------------------------------------------------------------------------

/** The share of an item's value the fences pay at a given player level. */
export function fenceRate(level: number): number {
  return Math.min(95, 55 + 2 * level) / 100;
}

/** This week's buyers: one category sells for more, changing every three days. */
export function demand(day: number): LootCategory {
  return CATEGORIES[Math.floor((day - 1) / 3) % CATEGORIES.length];
}

export function priceOf(p: Profile, item: StashItem): number {
  const bonus = demand(p.day) === item.category ? 1 + DEMAND_BONUS : 1;
  return Math.round((item.value / DOLLARS_PER_CATNIP) * fenceRate(playerLevel(p.xp)) * bonus * (item.hot ? 0.5 : 1));
}

export function sell(p: Profile, id: number): number {
  const i = p.stash.findIndex((s) => s.id === id);
  if (i < 0) return 0;
  const price = priceOf(p, p.stash[i]);
  p.stash.splice(i, 1);
  p.catnip += price;
  p.soldTotal += price;
  return price;
}

// --- The opening -----------------------------------------------------------------------------

/** After the tutorial the narrator buys its loot himself, to give Leo his first Catnip. */
export function narratorBuysTutorialLoot(p: Profile, tutorialId: string): number {
  p.stash = p.stash.filter((s) => s.levelId !== tutorialId);
  p.catnip += STARTING_CATNIP;
  p.narratorPaid = true;
  return STARTING_CATNIP;
}

export function buyLair(p: Profile): boolean {
  if (p.lairOwned || p.catnip < LAIR_PRICE) return false;
  p.catnip -= LAIR_PRICE;
  p.lairOwned = true;
  return true;
}

// --- After a heist ---------------------------------------------------------------------------

export interface XpLine {
  label: string;
  amount: number;
}

export interface HeistReport {
  levelId: string;
  levelName: string;
  turns: number;
  items: StashItem[];
  total: number;
  centrepiece: boolean;
  flawless: boolean;
  replay: boolean;
  xp: XpLine[];
  xpTotal: number;
  levelBefore: number;
  levelAfter: number;
  paper: Paper;
}

/** Books a successful heist: loot into the stash, XP, the record, and the next morning's paper. */
export function completeHeist(p: Profile, level: Level, s: State): HeistReport {
  const def = level.def;
  const prev = p.records[def.id];
  const replay = !!prev;
  const items: StashItem[] = s.inventory.map((i) => {
    const l = def.loot[i];
    const centrepiece = !!level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y;
    return { id: p.nextId++, name: l.name, category: l.category, value: l.value, levelId: def.id, levelName: def.name, centrepiece, hot: replay };
  });
  const total = inventoryValue(level, s);
  const centrepiece = items.some((i) => i.centrepiece);
  const flawless = !s.seen && !s.alarmRaised;

  const xp: XpLine[] = [{ label: 'Heist complete', amount: def.xp ?? 100 }];
  if (!s.seen) xp.push({ label: 'Never seen', amount: 50 });
  if (!s.alarmRaised) xp.push({ label: 'No alarms', amount: 50 });
  if (centrepiece) xp.push({ label: 'The centrepiece', amount: 100 });
  if (total > 0) xp.push({ label: 'Loot value', amount: Math.floor(total / 200) });
  if (def.par && s.turn < def.par) xp.push({ label: 'Quick work', amount: (def.par - s.turn) * 5 });
  const xpTotal = xp.reduce((n, l) => n + l.amount, 0);

  const levelBefore = playerLevel(p.xp);
  p.xp += xpTotal;
  p.stash.push(...items);
  p.heists++;
  p.records[def.id] = {
    clears: (prev?.clears ?? 0) + 1,
    bestTurns: Math.min(prev?.bestTurns ?? Infinity, s.turn),
    centrepiece: (prev?.centrepiece ?? false) || centrepiece,
    flawless: (prev?.flawless ?? false) || (flawless && centrepiece),
  };
  const paper = writePaper({
    day: p.day,
    levelId: def.id,
    place: def.name,
    items: items.map((i) => ({ name: i.name, value: i.value, centrepiece: i.centrepiece })),
    centrepieceName: level.plinth ? (def.loot.find((l) => l.at.x === level.plinth!.x && l.at.y === level.plinth!.y)?.name ?? null) : null,
    guards: def.guards.map((g) => g.name),
    seen: s.seen,
    alarm: s.alarmRaised,
    turns: s.turn,
    first: p.heists === 1,
    replay,
  });
  p.papers.unshift(paper);
  p.day++;
  return { levelId: def.id, levelName: def.name, turns: s.turn, items, total, centrepiece, flawless, replay, xp, xpTotal, levelBefore, levelAfter: playerLevel(p.xp), paper };
}

// --- Saving ----------------------------------------------------------------------------------

export const SAVE_KEY = 'purrrfect-crime-save-v1';

export function loadProfile(storage: Pick<Storage, 'getItem'> | null): Profile | null {
  try {
    const raw = storage?.getItem(SAVE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Profile;
    return p && p.version === 1 ? { ...newProfile(), ...p } : null;
  } catch {
    return null;
  }
}

export function saveProfile(storage: Pick<Storage, 'setItem'> | null, p: Profile): void {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(p));
  } catch {
    // Private windows and full storage: the game still plays, it just won't remember.
  }
}
