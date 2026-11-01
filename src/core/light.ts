// Light: lamps, moonlight, beacons and spotlights, worked out per tile.
import { blocksSight, type Level, type Point } from './level';
import { key, type Light, type State } from './state';
import { clearLine, inCone } from './sight';

// Light

const lightCache = new WeakMap<Level, Map<string, Light[][]>>();
/** The level's light, lamps and moonlight, with some lamps perhaps switched off. */
export function lightMap(level: Level, lampsOff: number[] = []): Light[][] {
  const k = [...lampsOff].sort().join(',');
  const cache = lightCache.get(level) ?? new Map<string, Light[][]>();
  lightCache.set(level, cache);
  const hit = cache.get(k);
  if (hit) return hit;
  const out: Light[][] = [];
  for (let y = 0; y < level.h; y++) {
    const row: Light[] = [];
    for (let x = 0; x < level.w; x++) {
      if (level.def.ambient === 'lit') {
        row.push(2);
        continue;
      }
      let l: Light =
        level.def.ambient === 'dim' &&
        !(level.def.shadows ?? []).some((m) => x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h)
          ? 1
          : 0;
      for (const m of level.moonlight) if (x >= m.x && x < m.x + m.w && y >= m.y && y < m.y + m.h) l = 1;
      for (const [i, lamp] of level.lamps.entries()) {
        if (lampsOff.includes(i)) continue;
        const d = Math.hypot(x - lamp.at.x, y - lamp.at.y);
        if (
          d > lamp.radius + 2 ||
          !clearLine(
            level,
            lamp.at,
            { x, y },
            (t) =>
              t === 'wall' ||
              t === 'door' ||
              t === 'pillar' ||
              t === 'stack' ||
              t === 'keydoor' ||
              t === 'vault',
          )
        )
          continue;
        if (d <= lamp.radius) l = 2;
        else if (l < 1) l = 1;
      }
      row.push(l);
    }
    out.push(row);
  }
  cache.set(k, out);
  return out;
}
/** The level's light at x,y with some lamps switched off. */
export function lightAt(level: Level, x: number, y: number, lampsOff: number[] = []): Light {
  return lightMap(level, lampsOff)[y]?.[x] ?? 0;
}
/** Which way the lighthouse beam points this turn. */
export function beaconFacing(level: Level, s: State): number {
  return ((level.def.beacon?.facing ?? 0) + s.turn - 1) % 8;
}
const beaconCache = new WeakMap<Level, Map<number, Set<string>>>();
/** The tiles the lighthouse beam lights this turn: a narrow wedge, stopped by walls. */
export function beaconTiles(level: Level, s: State): Set<string> {
  const b = level.def.beacon;
  if (!b) return new Set();
  const facing = beaconFacing(level, s);
  const cache = beaconCache.get(level) ?? new Map<number, Set<string>>();
  beaconCache.set(level, cache);
  const hit = cache.get(facing);
  if (hit) return hit;
  const out = new Set<string>();
  for (let y = b.at.y - b.range; y <= b.at.y + b.range; y++)
    for (let x = b.at.x - b.range; x <= b.at.x + b.range; x++)
      if (
        (x !== b.at.x || y !== b.at.y) &&
        inCone(b.at, facing, x, y, b.range, 22.5) &&
        clearLine(level, b.at, { x, y }, (t) => blocksSight(t) && t !== 'switch')
      )
        out.add(key(x, y));
  cache.set(facing, out);
  return out;
}
/** Where each spotlight's circle is this turn. */
export function spotlightsNow(level: Level, s: State): { at: Point; radius: number }[] {
  return level.spotlights.map((sp) => ({ at: sp.path[(s.turn - 1) % sp.path.length], radius: sp.radius }));
}
/** Light on a tile right now: lamps, moonlight and any spotlight. */
export function lightNow(level: Level, s: State, x: number, y: number): Light {
  for (const sp of spotlightsNow(level, s))
    if (Math.hypot(x - sp.at.x, y - sp.at.y) <= sp.radius + 0.01) return 2;
  if (level.def.beacon && beaconTiles(level, s).has(key(x, y))) return 2;
  return lightAt(level, x, y, s.lampsOff);
}
