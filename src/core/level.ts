// Levels are drawn as text maps (one character per tile) plus a few lists: lamps, cameras, guards, loot.
import { allLoot } from './exhibits';

export type Tile =
  | 'floor'
  | 'marble' // noisy underfoot
  | 'wall'
  | 'pillar'
  | 'stack' // a tall stack of crates: works like a pillar
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
  | 'ladder' // up to the rafters
  | 'seat' // a row of theatre seats: low, so guards see over them, but in Leo's way
  | 'plate' // a pressure plate: step on it and the alarm goes off
  | 'keydoor' // a door with a card reader: it opens for the keycard, and can't be picked
  | 'keycard' // floor with a keycard lying on it: walk over it to pick it up
  | 'gap' // a drop between rooftops, or water: nobody walks it, but everyone sees across it
  | 'wire' // a wire across a gap: only Leo, with Tightrope, can walk it
  | 'glass' // a glass wall: guards see straight through it, but sound doesn't carry
  | 'kennel' // a guard dog's kennel: the dog barks at anything that comes within 2 tiles
  | 'vault' // a vault door: turn the dials, with the combination
  | 'desk' // a desk with the vault's combination in it
  | 'crate' // open crate: Leo can hide inside; guards walk around it
  | 'tidal' // sand at low tide, sea at high tide (see LevelDef.tide)
  | 'switch' // a light switch, on a wall
  | 'belt-e' // a conveyor belt running east: it carries Leo a tile at the end of each turn
  | 'belt-w' // and west
  | 'paint' // wet paint: Leo leaves paw prints for the next few steps
  | 'exit';

export interface Point {
  x: number;
  y: number;
}

/**
 * Guard types:
 * - watch: walks a route
 * - sleepy: dozes at his post, wakes to noise
 * - captain: sees further, calls nearby guards when suspicious
 * - sniffer: short-sighted, smells Leo through walls within 2 tiles
 * - robo: sees heat in any light, hears nothing, ignores decoys; the fuse box turns it off
 * - nightclaw: fast, sees in the dark, one sighting ends the heist
 */
export type GuardKind = 'watch' | 'sleepy' | 'captain' | 'sniffer' | 'robo' | 'nightclaw';

export interface GuardDef {
  name: string;
  kind?: GuardKind;
  start: Point;
  /** Waypoints walked in a loop (a sleepy guard just stays at his start). */
  route: Point[];
}

/** A spotlight's lit circle moves one step along its path each turn, then loops. */
export interface SpotlightDef {
  path: Point[];
  radius: number;
}

export interface CameraDef {
  at: Point; // the floor tile the camera's cone starts from (it's mounted on the wall beside it)
  /** Directions it sweeps through, one per turn (indexes into DIRS). */
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
  /** What it turns out to be once it's in Leo's paws, if that's a surprise. */
  revealed?: string;
}

export interface LevelDef {
  id: string;
  name: string;
  objective: string;
  /**
   * `#` wall · `.` floor · `,` marble (noisy) · `P` pillar · `D` display case · `G` centrepiece plinth ·
   * `L` lamp · `+` locked door · `V` vent grate · `x` laser · `C` camera panel · `F` fuse box ·
   * `~` squeaky floorboard · `S` safe · `H` ladder to the rafters · `h` theatre seats · `^` pressure plate ·
   * `K` keycard door · `k` keycard · `_` gap (a drop, or water) · `-` wire · `|` glass wall · `B` kennel ·
   * `Y` stack of crates · `>` `<` conveyor belts · `%` wet paint · `Q` vault door · `N` desk with the combination · `O` crate to hide in · `t` tidal sand · `W` light switch ·
   * `@` Leo's start · `E` exit
   */
  map: string[];
  /** The rafters, same size as the map: `=` beam, `H` the top of a ladder (must match an `H` on the map). */
  rafters?: string[];
  spotlights?: SpotlightDef[];
  /** The duct layer, same size as the map: `=` duct, `V` grate (must match a `V` on the map). */
  vents?: string[];
  /** 'lit': lit everywhere. 'dim': dim light except shadows. 'dark': only lamps and moonlight. */
  ambient: 'lit' | 'dim' | 'dark';
  /** What the gaps are: a drop between rooftops (the default) or water. */
  gaps?: 'sky' | 'water';
  /** Tidal tiles: dry for `period` turns, then flooded for `period` turns. `high` starts flooded. */
  tide?: { period: number; high?: boolean };
  /** Lighthouse: a beam `range` tiles long that turns 1/8 clockwise each turn. */
  beacon?: { at: Point; range: number; facing: number };
  /** Where the fish market's smell is so strong that sniffers can't smell a cat. */
  fishy?: { x: number; y: number; w: number; h: number }[];
  /** Light switches (W on the map) and which lamps each controls (indexes into `lamps`). */
  switches?: { at: Point; lamps: number[] }[];
  /** Where slot machines jingle so loud that nobody hears the noises Leo makes there. */
  loud?: { x: number; y: number; w: number; h: number }[];
  /** The vault's time lock: its dials won't turn before this turn. */
  timeLock?: number;
  /** Dark corners in a dim building. */
  shadows?: { x: number; y: number; w: number; h: number }[];
  lamps?: LampDef[];
  /** Moonlit rectangles: dim light from skylights and windows. */
  moonlight?: { x: number; y: number; w: number; h: number }[];
  cameras?: CameraDef[];
  /** Lasers on odd turns only, when true. */
  pulsingLasers?: boolean;
  /** Motion sensor zones: only 1 tile per move inside. Powered by the fuse box. */
  motion?: { x: number; y: number; w: number; h: number }[];
  /** Where a rival thief can come in (and leave). */
  rivalEntrances?: Point[];
  guards: GuardDef[];
  loot: LootDef[];
  /** What's new in this level, for the briefing. */
  tip?: string;
  /** NightClaw's challenge museum: opened by Letter 2, and its centrepiece holds Letter 3. */
  challenge?: boolean;
  /** NightClaw's Lair (opened by Letter 4): ends when Leo, holding the prize, taps NightClaw. */
  finale?: boolean;
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

/** Map characters and the tiles they stand for. */
const LEGEND: Record<string, Tile> = {
  '#': 'wall',
  '.': 'floor',
  ',': 'marble',
  P: 'pillar',
  Y: 'stack',
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
  K: 'keydoor',
  k: 'keycard',
  _: 'gap',
  '-': 'wire',
  '|': 'glass',
  B: 'kennel',
  Q: 'vault',
  N: 'desk',
  O: 'crate',
  t: 'tidal',
  W: 'switch',
  '>': 'belt-e',
  '<': 'belt-w',
  '%': 'paint',
  '@': 'floor',
  E: 'exit',
};

/** Turns a LevelDef (text maps and lists) into a Level, checking it for mistakes. */
export function parseLevel(def: LevelDef): Level {
  const h = def.map.length;
  const w = Math.max(...def.map.map((r) => r.length));
  let start: Point | null = null;
  let exit: Point | null = null;
  let plinth: Point | null = null;
  const tiles: Tile[][] = [];
  const ducts: boolean[][] = [];
  const rafters: boolean[][] = [];
  // Read the map, vent and rafter grids tile by tile.
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
      if (v === 'V' && t !== 'grate')
        throw new Error(`${def.id}: vent grate at ${x},${y} has no V on the map`);
      if (t === 'grate' && v !== 'V') throw new Error(`${def.id}: grate at ${x},${y} is not on the duct map`);
      const r = def.rafters?.[y]?.[x] ?? ' ';
      rrow.push(r === '=' || r === 'H');
      if (r === 'H' && t !== 'ladder')
        throw new Error(`${def.id}: ladder top at ${x},${y} has no H on the map`);
      if (t === 'ladder' && r !== 'H')
        throw new Error(`${def.id}: ladder at ${x},${y} doesn't reach the rafters`);
    }
    tiles.push(row);
    ducts.push(drow);
    rafters.push(rrow);
  }
  // Sanity checks: catch map mistakes early.
  if (!start || !exit) throw new Error(`${def.id}: map needs @ and E`);
  if (def.map.join('').split('k').length > 2) throw new Error(`${def.id}: one keycard per level`);
  if (def.map.join('').includes('Q') && !def.map.join('').includes('N'))
    throw new Error(`${def.id}: a vault door needs a desk with the combination`);
  if (def.map.join('').includes('t') && !def.tide) throw new Error(`${def.id}: tidal sand needs a tide`);
  for (const sw of def.switches ?? []) {
    if (def.map[sw.at.y]?.[sw.at.x] !== 'W')
      throw new Error(`${def.id}: switch at ${sw.at.x},${sw.at.y} has no W on the map`);
    for (const i of sw.lamps)
      if (!def.lamps?.[i])
        throw new Error(`${def.id}: switch at ${sw.at.x},${sw.at.y} works a lamp that isn't there`);
  }
  for (const l of def.loot) {
    const t = tiles[l.at.y]?.[l.at.x];
    if (t !== 'case' && t !== 'plinth' && t !== 'safe')
      throw new Error(`${def.id}: loot "${l.name}" is not in a case, a safe or on the plinth`);
  }
  const level: Level = {
    // The exhibits under the lights join the loot (see exhibits.ts).
    def: { ...def, loot: allLoot(def) },
    w,
    h,
    tiles,
    ducts,
    rafters,
    motion: tiles.map((row, y) =>
      row.map((_, x) =>
        (def.motion ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h),
      ),
    ),
    spotlights: def.spotlights ?? [],
    start,
    exit,
    plinth,
    guards: def.guards,
    cameras: def.cameras ?? [],
    lamps: def.lamps ?? [],
    moonlight: def.moonlight ?? [],
  };
  // Rival entrances and guard routes must be on open floor.
  for (const e of def.rivalEntrances ?? [])
    if (blocksMove(tiles[e.y]?.[e.x] ?? 'wall'))
      throw new Error(`${def.id}: rival entrance ${e.x},${e.y} is in a wall`);
  for (const g of level.guards)
    for (const p of [g.start, ...g.route])
      if (blocksMove(tiles[p.y]?.[p.x] ?? 'wall'))
        throw new Error(`${def.id}: guard ${g.name} stands in a wall at ${p.x},${p.y}`);
  return level;
}

/** Adds "the" to a name unless it already starts with "The". */
export function the(name: string): string {
  return /^the /i.test(name) ? `the ${name.slice(4)}` : `the ${name}`;
}

/** The tile at x,y (wall outside the map). */
export function tileAt(level: Level, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return 'wall';
  return level.tiles[y][x];
}

/** Is there a vent duct at x,y? */
export function isDuct(level: Level, x: number, y: number): boolean {
  return !!level.ducts[y]?.[x];
}

/** Is there a rafter beam at x,y? */
export function isRafter(level: Level, x: number, y: number): boolean {
  return !!level.rafters[y]?.[x];
}

/** Which way a laser beam runs: along the line of laser tiles that has a wall at both ends. */
export function laserAxis(level: Level, x: number, y: number): 'x' | 'y' {
  const walled = (dx: number, dy: number) => {
    const end = (sign: number) => {
      let cx = x;
      let cy = y;
      while (tileAt(level, cx, cy) === 'laser') {
        cx += dx * sign;
        cy += dy * sign;
      }
      return blocksSight(tileAt(level, cx, cy));
    };
    return end(1) && end(-1);
  };
  return !walled(1, 0) && walled(0, 1) ? 'y' : 'x';
}

/** Whether a tile blocks walking, given which doors are open and which cases are emptied. */
export function blocksMove(t: Tile): boolean {
  return (
    t === 'wall' ||
    t === 'pillar' ||
    t === 'stack' ||
    t === 'case' ||
    t === 'plinth' ||
    t === 'lamp' ||
    t === 'door' ||
    t === 'panel' ||
    t === 'fuse' ||
    t === 'safe' ||
    t === 'seat' ||
    t === 'keydoor' ||
    t === 'gap' ||
    t === 'wire' ||
    t === 'glass' ||
    t === 'kennel' ||
    t === 'vault' ||
    t === 'desk' ||
    t === 'crate' ||
    t === 'switch'
  );
}

/** Whether a tile blocks sight. Low things (cases, plinths, lamps) and glass don't; closed doors do. */
export function blocksSight(t: Tile): boolean {
  return (
    t === 'wall' ||
    t === 'pillar' ||
    t === 'stack' ||
    t === 'door' ||
    t === 'panel' ||
    t === 'fuse' ||
    t === 'keydoor' ||
    t === 'vault' ||
    t === 'switch'
  );
}

/** Walls, closed doors and glass stop sound (it carries round pillars). */
export function blocksSound(t: Tile): boolean {
  return (
    t === 'wall' ||
    t === 'door' ||
    t === 'panel' ||
    t === 'fuse' ||
    t === 'keydoor' ||
    t === 'vault' ||
    t === 'glass' ||
    t === 'switch'
  );
}
