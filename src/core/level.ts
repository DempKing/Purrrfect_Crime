// Levels are drawn as text maps. Each character is one tile.

export type Tile = 'floor' | 'wall' | 'pillar' | 'case' | 'plinth' | 'exit';

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

export interface LevelDef {
  id: string;
  name: string;
  objective: string;
  /** `#` wall, `.` floor, `P` pillar, `D` display case, `G` the centrepiece's plinth, `L` Leo, `E` exit. */
  map: string[];
  guards: GuardDef[];
  centrepiece: string;
}

export interface Level {
  def: LevelDef;
  w: number;
  h: number;
  tiles: Tile[][]; // tiles[y][x]
  start: Point;
  exit: Point;
  plinth: Point;
}

const LEGEND: Record<string, Tile> = { '#': 'wall', '.': 'floor', P: 'pillar', D: 'case', G: 'plinth', L: 'floor', E: 'exit' };

export function parseLevel(def: LevelDef): Level {
  const h = def.map.length;
  const w = Math.max(...def.map.map((r) => r.length));
  let start: Point | null = null;
  let exit: Point | null = null;
  let plinth: Point | null = null;
  const tiles: Tile[][] = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      const ch = def.map[y][x] ?? '#';
      const t = LEGEND[ch];
      if (!t) throw new Error(`${def.id}: unknown map character '${ch}' at ${x},${y}`);
      if (ch === 'L') start = { x, y };
      if (ch === 'E') exit = { x, y };
      if (ch === 'G') plinth = { x, y };
      row.push(t);
    }
    tiles.push(row);
  }
  if (!start || !exit || !plinth) throw new Error(`${def.id}: map needs L, E and G`);
  return { def, w, h, tiles, start, exit, plinth };
}

export function tileAt(level: Level, x: number, y: number): Tile {
  if (x < 0 || y < 0 || x >= level.w || y >= level.h) return 'wall';
  return level.tiles[y][x];
}

export function blocksMove(t: Tile): boolean {
  return t === 'wall' || t === 'pillar' || t === 'case' || t === 'plinth';
}

/** Display cases and the plinth are low glass: guards see right over them. */
export function blocksSight(t: Tile): boolean {
  return t === 'wall' || t === 'pillar';
}
