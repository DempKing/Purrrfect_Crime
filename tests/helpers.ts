// Shared test helpers: a small sandbox map and a way to start a heist on it.
import type { RivalPlan } from '../src/core/game';
import { BASE_PERKS, newHeist, type Perks, type State } from '../src/core/game';
import { type GuardDef, type LevelDef, parseLevel } from '../src/core/level';

const MAP = [
  '##################',
  '#@...............#',
  '#................#',
  '#.......~~.......#',
  '#................#',
  '#####.######.S...#',
  '#....H.......#...#',
  '#............#...E',
  '##################',
];
export function sandbox(guards: GuardDef[], extra: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'sandbox',
    name: 'Sandbox',
    objective: '',
    ambient: 'dark',
    map: MAP,
    rafters: ['', '', '', '', '', '', '     H========='],
    guards,
    loot: [{ at: { x: 13, y: 5 }, name: 'Gold Coin', value: 100, space: 1, category: 'curiosity' }],
    ...extra,
  };
}
export function heist(
  def: LevelDef,
  perks: Partial<Perks> = {},
): { level: ReturnType<typeof parseLevel>; s: State } {
  const level = parseLevel(def);
  return { level, s: newHeist(level, { ...BASE_PERKS, ...perks }) };
}

export const DOWNTOWN: LevelDef = {
  id: 'downtown',
  name: 'Downtown',
  objective: '',
  ambient: 'dark',
  map: [
    '###################',
    '#@......>>>>......#',
    '#..%..............#',
    '#........<<.......#',
    '#.......G.........#',
    '#F.........Q.N....E',
    '###################',
  ],
  guards: [],
  loot: [{ at: { x: 8, y: 4 }, name: 'Prize', value: 1000, space: 1, category: 'jewel' }],
};

export const HALL: LevelDef = {
  id: 'hall',
  name: 'Hall',
  objective: '',
  ambient: 'dark',
  map: [
    '##################',
    '#@...............#',
    '#....^...........#',
    '#.......G........#',
    '#................#',
    '#.D..............E',
    '##################',
  ],
  motion: [{ x: 10, y: 1, w: 4, h: 5 }],
  rivalEntrances: [{ x: 16, y: 1 }],
  guards: [],
  loot: [
    { at: { x: 8, y: 3 }, name: 'Prize', value: 1000, space: 1, category: 'jewel' },
    { at: { x: 2, y: 5 }, name: 'Trinket', value: 100, space: 1, category: 'curiosity' },
  ],
};

export const plan = (id: RivalPlan['id'], arrive = 1): RivalPlan => ({ id, arrive, entrance: 0 });
