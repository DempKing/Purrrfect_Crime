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
  | 'squeaky' // a loose floorboard: loud underfoot
  | 'safe' // a safe with loot inside: slow to crack, but silent
  | 'ladder' // up to the rafters (Ceiling Climb)
  | 'seat' // a row of theatre seats: low, so guards see over them, but in Leo's way
  | 'plate' // a pressure plate: step on it and the alarm goes off
  | 'exit';

export interface Point {
  x: number;
  y: number;
}

/**
 * watch: walks a route. sleepy: dozes at his post, wakes to noise. captain: sees further and calls nearby
 * guards when he's suspicious. sniffer: short-sighted, but smells Leo through walls within 2 tiles.
 */
export type GuardKind = 'watch' | 'sleepy' | 'captain' | 'sniffer';

export interface GuardDef {
  name: string;
  kind?: GuardKind;
  start: Point;
  /** Waypoints walked in a loop. A sleepy guard's post is his start; his route is ignored. */
  route: Point[];
}

/** A spotlight's lit circle moves one step along its path each turn, then loops. */
export interface SpotlightDef {
  path: Point[];
  radius: number;
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
   * `~` squeaky floorboard · `S` safe · `H` ladder to the rafters · `h` theatre seats · `^` pressure plate ·
   * `@` Leo's start · `E` exit
   */
  map: string[];
  /** The rafters, same size as the map: `=` beam, `H` the top of a ladder (must match an `H` on the map). */
  rafters?: string[];
  spotlights?: SpotlightDef[];
  /** The duct layer, same size as the map: `=` duct, `V` grate (must match a `V` on the map). */
  vents?: string[];
  /**
   * 'lit': lit everywhere, no shadows. 'dim': the whole building is in dim light (night lighting, big
   * windows) apart from its shadows. 'dark': only lamps and moonlight light it.
   */
  ambient: 'lit' | 'dim' | 'dark';
  /** Dark corners in a dim building. */
  shadows?: { x: number; y: number; w: number; h: number }[];
  lamps?: LampDef[];
  /** Moonlit rectangles: dim light from skylights and windows. */
  moonlight?: { x: number; y: number; w: number; h: number }[];
  cameras?: CameraDef[];
  /** Lasers on odd turns only, when true. */
  pulsingLasers?: boolean;
  /** Motion sensor zones: Leo may move only one tile per move inside them. Powered from the fuse box. */
  motion?: { x: number; y: number; w: number; h: number }[];
  /** Where a rival thief can get in (a window, a skylight, a coal chute), and leaves again. */
  rivalEntrances?: Point[];
  guards: GuardDef[];
  loot: LootDef[];
  /** What's new in this level, for the briefing. */
  tip?: string;
  /** Base XP for a successful heist, and the turn count that earns a speed bonus. */
  xp?: number;
  par?: number;
}

export interface Level {
  def: LevelDef;
  guards: GuardDef[];
  cameras: CameraDef[];
  lamps: LampDef[];
  moonlight: { x: number; y: number; w: number; h: number }[];
  w: number;
  h: number;
  tiles: Tile[][]; // tiles[y][x]
  ducts: boolean[][];
  rafters: boolean[][];
  motion: boolean[][];
  spotlights: SpotlightDef[];
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
  '~': 'squeaky',
  S: 'safe',
  H: 'ladder',
  h: 'seat',
  '^': 'plate',
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
  const rafters: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    const drow: boolean[] = [];
    const rrow: boolean[] = [];
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
      const r = def.rafters?.[y]?.[x] ?? ' ';
      rrow.push(r === '=' || r === 'H');
      if (r === 'H' && t !== 'ladder') throw new Error(`${def.id}: ladder top at ${x},${y} has no H on the map`);
      if (t === 'ladder' && r !== 'H') throw new Error(`${def.id}: ladder at ${x},${y} doesn't reach the rafters`);
    }
    tiles.push(row);
    ducts.push(drow);
    rafters.push(rrow);
  }
  if (!start || !exit) throw new Error(`${def.id}: map needs @ and E`);
  for (const l of def.loot) {
    const t = tiles[l.at.y]?.[l.at.x];
    if (t !== 'case' && t !== 'plinth' && t !== 'safe') throw new Error(`${def.id}: loot "${l.name}" is not in a case, a safe or on the plinth`);
  }
  const level: Level = {
    def,
    w,
    h,
    tiles,
    ducts,
    rafters,
    motion: tiles.map((row, y) => row.map((_, x) => (def.motion ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h))),
    spotlights: def.spotlights ?? [],
    start,
    exit,
    plinth,
    guards: def.guards,
    cameras: def.cameras ?? [],
    lamps: def.lamps ?? [],
    moonlight: def.moonlight ?? [],
  };
  for (const e of def.rivalEntrances ?? []) if (blocksMove(tiles[e.y]?.[e.x] ?? 'wall')) throw new Error(`${def.id}: rival entrance ${e.x},${e.y} is in a wall`);
  for (const g of level.guards) for (const p of [g.start, ...g.route]) if (blocksMove(tiles[p.y]?.[p.x] ?? 'wall')) throw new Error(`${def.id}: guard ${g.name} stands in a wall at ${p.x},${p.y}`);
  return level;
}

export function tileAt(level: Level, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return 'wall';
  return level.tiles[y][x];
}

export function isDuct(level: Level, x: number, y: number): boolean {
  return !!level.ducts[y]?.[x];
}

export function isRafter(level: Level, x: number, y: number): boolean {
  return !!level.rafters[y]?.[x];
}

/** Whether a tile blocks walking, given which doors are open and which cases are emptied. */
export function blocksMove(t: Tile): boolean {
  return t === 'wall' || t === 'pillar' || t === 'case' || t === 'plinth' || t === 'lamp' || t === 'door' || t === 'panel' || t === 'fuse' || t === 'safe' || t === 'seat';
}

/** Display cases, the plinth and lamps are low: guards see over them. Closed doors block sight. */
export function blocksSight(t: Tile): boolean {
  return t === 'wall' || t === 'pillar' || t === 'door' || t === 'panel' || t === 'fuse';
}
