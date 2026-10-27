// Everything that lasts between heists: Catnip, XP, the stash of unsold loot, the lair, the front pages.
// Pure functions over a plain object, so the save is just JSON and the rules can be unit-tested.
import type { Difficulty, Level, LootCategory } from '../core/level';
import type { State } from '../core/game';
import { writePaper, type Paper } from './newspaper';
import { DIFFICULTY, playerLevel, type Attribute, type Room, type SkillId } from './progression';

export { LEVEL_CAP, playerLevel, xpForLevel, xpToNext } from './progression';
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
  version: 2;
  difficulty: Difficulty;
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
  attributes: Record<Attribute, number>;
  skills: SkillId[];
  rooms: Record<Room, number>; // tier of each lair room, 0 = not built
}

export function newProfile(difficulty: Difficulty = 'casual'): Profile {
  return {
    version: 2,
    difficulty,
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
    attributes: { agility: 0, stealth: 0, quietPaws: 0, dexterity: 0, pockets: 0, perception: 0 },
    skills: [],
    rooms: { planning: 0, workshop: 0, fence: 0, gym: 0, trophy: 0, mailbox: 0 },
  };
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

/** The Fence's Office tier 2+: a collector pays half as much again for one stash item a day. */
export function collectorWants(p: Profile): number | null {
  if (p.rooms.fence < 2 || !p.stash.length) return null;
  const score = (id: number) => (Math.imul(id + 7, 2654435761) ^ Math.imul(p.day, 40503)) >>> 0;
  return p.stash.reduce((best, s) => (score(s.id) > score(best.id) ? s : best)).id;
}

export function priceOf(p: Profile, item: StashItem): number {
  const bonus = demand(p.day) === item.category ? 1 + DEMAND_BONUS : 1;
  const office = 1 + 0.05 * p.rooms.fence;
  const collector = collectorWants(p) === item.id ? 1.5 : 1;
  return Math.round((item.value / DOLLARS_PER_CATNIP) * fenceRate(playerLevel(p.xp)) * bonus * office * collector * (item.hot ? 0.5 : 1));
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
  // Harder difficulties guard better things: loot is worth more, and so is the XP.
  const mult = DIFFICULTY[p.difficulty].mult;
  const items: StashItem[] = s.inventory.map((i) => {
    const l = def.loot[i];
    const centrepiece = !!level.plinth && l.at.x === level.plinth.x && l.at.y === level.plinth.y;
    return { id: p.nextId++, name: l.name, category: l.category, value: Math.round(l.value * mult), levelId: def.id, levelName: def.name, centrepiece, hot: replay };
  });
  const total = items.reduce((n, i) => n + i.value, 0);
  const centrepiece = items.some((i) => i.centrepiece);
  const flawless = !s.seen && !s.alarmRaised;

  const xp: XpLine[] = [{ label: 'Heist complete', amount: def.xp ?? 100 }];
  if (!s.seen) xp.push({ label: 'Never seen', amount: 50 });
  if (!s.alarmRaised) xp.push({ label: 'No alarms', amount: 50 });
  if (centrepiece) xp.push({ label: 'The centrepiece', amount: 100 });
  if (total > 0) xp.push({ label: 'Loot value', amount: Math.floor(total / 200) });
  if (def.par && s.turn < def.par) xp.push({ label: 'Quick work', amount: (def.par - s.turn) * 5 });
  const base = xp.reduce((n, l) => n + l.amount, 0);
  if (mult > 1) xp.push({ label: `${DIFFICULTY[p.difficulty].name} ×${mult}`, amount: Math.round(base * (mult - 1)) });
  if (p.rooms.trophy) xp.push({ label: 'Fame (Trophy Room)', amount: Math.round(base * mult * 0.05 * p.rooms.trophy) });
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
    guards: level.guards.map((g) => g.name),
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

// --- Saving: three slots ---------------------------------------------------------------------

export const SLOTS = 3;
export const slotKey = (slot: number) => `purrrfect-crime-slot-${slot + 1}`;
/** Where M2 kept its one save; it moves into the first empty slot. */
export const OLD_SAVE_KEY = 'purrrfect-crime-save-v1';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** Brings an older save up to date. Returns null for anything unreadable. */
export function upgradeProfile(raw: unknown): Profile | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Omit<Partial<Profile>, 'version'> & { version?: number };
  if (p.version !== 1 && p.version !== 2) return null;
  const fresh = newProfile(p.difficulty ?? 'casual');
  return { ...fresh, ...p, version: 2, attributes: { ...fresh.attributes, ...p.attributes }, rooms: { ...fresh.rooms, ...p.rooms }, skills: p.skills ?? [] };
}

export function loadSlot(storage: Pick<Storage, 'getItem'> | null, slot: number): Profile | null {
  try {
    const raw = storage?.getItem(slotKey(slot));
    return raw ? upgradeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveSlot(storage: Pick<Storage, 'setItem'> | null, slot: number, p: Profile): void {
  try {
    storage?.setItem(slotKey(slot), JSON.stringify(p));
  } catch {
    // Private windows and full storage: the game still plays, it just won't remember.
  }
}

export function deleteSlot(storage: Pick<Storage, 'removeItem'> | null, slot: number): void {
  try {
    storage?.removeItem(slotKey(slot));
  } catch {
    // Nothing to do.
  }
}

/** All three slots, after moving an M2 save into the first empty one. */
export function loadSlots(storage: Store | null): (Profile | null)[] {
  try {
    const old = storage?.getItem(OLD_SAVE_KEY);
    if (old && storage) {
      const p = upgradeProfile(JSON.parse(old));
      const free = [0, 1, 2].find((i) => !storage.getItem(slotKey(i)));
      if (p && free !== undefined) saveSlot(storage, free, p);
      if (!p || free !== undefined) storage.removeItem(OLD_SAVE_KEY);
    }
  } catch {
    // An unreadable old save is left alone.
  }
  return [0, 1, 2].map((i) => loadSlot(storage, i));
}
