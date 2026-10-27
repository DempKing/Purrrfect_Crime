// Levels are drawn as text maps (one character per tile) plus a few lists: lamps, cameras, guards, loot.

export type Tile =
  | 'floor'
  | 'marble' // noisy underfoot
  | 'wall'
  | 'pillar'
  | 'case' // display case with loot inside
  | 'plinth' // the centrepiece
  | 'lamp' // a standing lamp: furniture you can't walk through
  | 'door' // locked door: pick it to open
  | 'grate' // vent grate in the floor
  | 'laser' // floor crossed by a laser tripwire
  | 'panel' // camera control panel, on a wall
  | 'fuse' // fuse box for the lasers, on a wall
  | 'exit';

export interface Point {
  x: number;
  y: number;
}

export interface GuardDef {
  name: string;
  start: Point;
  /** Waypoints walked in a loop. */
  route: Point[];
}

export interface CameraDef {
  at: Point; // the floor tile the camera's cone starts from (it's mounted on the wall beside it)
  /** Directions it sweeps between, one per turn (indexes into DIRS, clockwise from east). */
  sweep: number[];
  range?: number;
}

export interface LampDef {
  at: Point;
  radius: number;
}

/** What kind of buyer wants it: the black market's demand rotates between these. */
export type LootCategory = 'painting' | 'jewel' | 'artefact' | 'curiosity';

export interface LootDef {
  at: Point; // a case or the plinth
  name: string;
  value: number; // the newspaper's estimate, in dollars
  space: number; // inventory spaces it takes up
  category: LootCategory;
}

export interface LevelDef {
  id: string;
  name: string;
  objective: string;
  /**
   * `#` wall · `.` floor · `,` marble (noisy) · `P` pillar · `D` display case · `G` centrepiece plinth ·
   * `L` lamp · `+` locked door · `V` vent grate · `x` laser · `C` camera panel · `F` fuse box ·
   * `@` Leo's start · `E` exit
   */
  map: string[];
  /** The duct layer, same size as the map: `=` duct, `V` grate (must match a `V` on the map). */
  vents?: string[];
  /** 'lit' means the whole level is lit (no shadows); otherwise only lamps light it. */
  ambient: 'lit' | 'dark';
  lamps?: LampDef[];
  /** Moonlit rectangles: dim light from skylights and windows. */
  moonlight?: { x: number; y: number; w: number; h: number }[];
  cameras?: CameraDef[];
  /** Lasers on odd turns only, when true. */
  pulsingLasers?: boolean;
  guards: GuardDef[];
  loot: LootDef[];
  /** Base XP for a successful heist, and the turn count that earns a speed bonus. */
  xp?: number;
  par?: number;
}

export interface Level {
  def: LevelDef;
  w: number;
  h: number;
  tiles: Tile[][]; // tiles[y][x]
  ducts: boolean[][];
  start: Point;
  exit: Point;
  plinth: Point | null;
}

const LEGEND: Record<string, Tile> = {
  '#': 'wall',
  '.': 'floor',
  ',': 'marble',
  P: 'pillar',
  D: 'case',
  G: 'plinth',
  L: 'lamp',
  '+': 'door',
  V: 'grate',
  x: 'laser',
  C: 'panel',
  F: 'fuse',
  '@': 'floor',
  E: 'exit',
};

export function parseLevel(def: LevelDef): Level {
  const h = def.map.length;
  const w = Math.max(...def.map.map((r) => r.length));
  let start: Point | null = null;
  let exit: Point | null = null;
  let plinth: Point | null = null;
  const tiles: Tile[][] = [];
  const ducts: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    const drow: boolean[] = [];
    for (let x = 0; x < w; x++) {
      const ch = def.map[y][x] ?? '#';
      const t = LEGEND[ch];
      if (!t) throw new Error(`${def.id}: unknown map character '${ch}' at ${x},${y}`);
      if (ch === '@') start = { x, y };
      if (ch === 'E') exit = { x, y };
      if (ch === 'G') plinth = { x, y };
      row.push(t);
      const v = def.vents?.[y]?.[x] ?? ' ';
      drow.push(v === '=' || v === 'V');
      if (v === 'V' && t !== 'grate') throw new Error(`${def.id}: vent grate at ${x},${y} has no V on the map`);
      if (t === 'grate' && v !== 'V') throw new Error(`${def.id}: grate at ${x},${y} is not on the duct map`);
    }
    tiles.push(row);
    ducts.push(drow);
  }
  if (!start || !exit) throw new Error(`${def.id}: map needs @ and E`);
  for (const l of def.loot) {
    const t = tiles[l.at.y]?.[l.at.x];
    if (t !== 'case' && t !== 'plinth') throw new Error(`${def.id}: loot "${l.name}" is not in a case or on the plinth`);
  }
  return { def, w, h, tiles, ducts, start, exit, plinth };
}

export function tileAt(level: Level, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return 'wall';
  return level.tiles[y][x];
}

export function isDuct(level: Level, x: number, y: number): boolean {
  return !!level.ducts[y]?.[x];
}

/** Whether a tile blocks walking, given which doors are open and which cases are emptied. */
export function blocksMove(t: Tile): boolean {
  return t === 'wall' || t === 'pillar' || t === 'case' || t === 'plinth' || t === 'lamp' || t === 'door' || t === 'panel' || t === 'fuse';
}

/** Display cases, the plinth and lamps are low: guards see over them. Closed doors block sight. */
export function blocksSight(t: Tile): boolean {
  return t === 'wall' || t === 'pillar' || t === 'door' || t === 'panel' || t === 'fuse';
}
