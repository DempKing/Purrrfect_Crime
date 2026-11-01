// NightClaw's levels: his challenge museum (opened by Letter 2) and his lair (opened by Letter 4).
import type { LevelDef } from '../core/level';

/**
 * NightClaw's challenge: The Midnight Museum. Keycard by dozing Snooze, laser corridor (fuse box in
 * the foyer), great hall with Captain Vigil, a dog, a camera and a searchlight. Combination in the curator's desk.
 * Prize: Midnight Music Box in the vault past motion sensors and Nosey (sniffer). Exit: the skylight.
 */
export const MIDNIGHT_MUSEUM: LevelDef = {
  id: 'nc-midnight-museum',
  name: 'The Midnight Museum',
  challenge: true,
  tip: 'NightClaw built this one himself, from every trick in the city: glass, plates, lasers, a keycard, a guard dog, motion sensors and a vault.',
  objective: 'Steal the Midnight Music Box from the vault in the Midnight Wing, and leave by the skylight.',
  ambient: 'dark',
  xp: 500,
  par: 42,
  map: [
    '##############################',
    '##############################',
    '##############E###############',
    '#..L......................L..#',
    '#............................#',
    '#.....P...P........P...P.....#',
    '#............................#',
    '#........B...................#',
    '####+#######C#..#########K####',
    '#......#######..#####L.......#',
    '#.N....#######..#####........#',
    '#......#######xx#####........#',
    '#....D.#######..#####........#',
    '#F############..#########Q####',
    '#......L.|.D.......k##.......#',
    '#........|..^..^....##.......#',
    '#.................^.##...G...#',
    '#.@......|...^..^...##D.....D#',
    '#........|.^.....D..##########',
    '##############################',
  ],
  moonlight: [
    { x: 11, y: 3, w: 8, h: 5 }, // under the skylight
    { x: 21, y: 9, w: 8, h: 4 },
  ],
  lamps: [
    { at: { x: 7, y: 14 }, radius: 2 },
    { at: { x: 3, y: 3 }, radius: 2 },
    { at: { x: 26, y: 3 }, radius: 2 },
    { at: { x: 21, y: 9 }, radius: 2 },
  ],
  motion: [{ x: 21, y: 9, w: 8, h: 4 }],
  spotlights: [
    {
      path: [
        { x: 4, y: 5 },
        { x: 9, y: 5 },
        { x: 14, y: 5 },
        { x: 19, y: 5 },
        { x: 24, y: 5 },
        { x: 19, y: 5 },
        { x: 14, y: 5 },
        { x: 9, y: 5 },
      ],
      radius: 1,
    },
  ],
  cameras: [
    { at: { x: 28, y: 3 }, sweep: [3, 4], range: 6 },
    { at: { x: 22, y: 14 }, sweep: [1, 0], range: 4 },
  ],
  guards: [
    {
      name: 'Ward',
      start: { x: 10, y: 16 },
      route: [
        { x: 19, y: 16 },
        { x: 10, y: 16 },
      ],
    },
    { name: 'Snooze', kind: 'sleepy', start: { x: 18, y: 15 }, route: [{ x: 18, y: 14 }] },
    {
      name: 'Vigil',
      kind: 'captain',
      start: { x: 2, y: 4 },
      route: [
        { x: 27, y: 4 },
        { x: 27, y: 6 },
        { x: 2, y: 6 },
        { x: 2, y: 4 },
      ],
    },
    {
      name: 'Nosey',
      kind: 'sniffer',
      start: { x: 22, y: 9 },
      route: [
        { x: 28, y: 9 },
        { x: 22, y: 9 },
      ],
    },
  ],
  loot: [
    { at: { x: 25, y: 16 }, name: 'Midnight Music Box', value: 25000, space: 2, category: 'curiosity' },
    {
      at: { x: 22, y: 17 },
      name: 'NightClaw’s First Calling Card',
      value: 6000,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 28, y: 17 }, name: 'The Black Pearl of Pawsburg', value: 9000, space: 1, category: 'jewel' },
    {
      at: { x: 11, y: 14 },
      name: 'Portrait of a Gentleman Cat',
      value: 5500,
      space: 3,
      category: 'painting',
    },
    { at: { x: 17, y: 18 }, name: 'Silver Mouse Automaton', value: 4000, space: 2, category: 'artifact' },
    { at: { x: 5, y: 12 }, name: 'The Curator’s Pocket Watch', value: 2500, space: 1, category: 'artifact' },
  ],
};

/**
 * NightClaw's Lair: the final heist. NightClaw patrols the belfry hall (fast, sees in the dark).
 * Prize: his prized possession in the sanctum (keycard door, lasers, motion sensors, plates);
 * keycard in the study (Alfred dozes). Cog (Robo-Guard) by the fuse box, Rook (sniffer) in the gallery.
 * To win: take the prize, then tap NightClaw from behind.
 */
export const NIGHTCLAW_LAIR: LevelDef = {
  id: 'nc-lair',
  name: 'NightClaw’s Lair',
  finale: true,
  tip: 'NightClaw stalks the belfry hall himself: he moves quickly, the dark is only dim to him, and if he sees Leo even once, that’s the end of the night. Take his prized possession, then sneak up and tap him on the shoulder while he’s unaware.',
  objective: 'Steal NightClaw’s prized possession, then creep up on him and tap him on the shoulder.',
  ambient: 'dark',
  xp: 800,
  par: 34,
  map: [
    '##############################',
    '#...L...D.#..^.^...#......D..#',
    '#.k.......#...G....#.........#',
    '#.........#..^.^...#.........F',
    '#.........Cxxxxxxxx#.......L.#',
    '#.........#........#.........#',
    '#####+########K#########.#####',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,P,,,,,P,,,,,,P,,,,,,,#',
    '#,,,,,,,P,,,,,,P,,,,,P,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '####.#####||||||||||#####.####',
    '#L.......#..........#........#',
    '#.....B..#.D..D..D..#..O.....#',
    '#...................+........#',
    'E.@......#..........#.....O..#',
    '#........#.D..D..D..#.......L#',
    '##############################',
  ],
  moonlight: [
    { x: 1, y: 7, w: 28, h: 2 },
    { x: 1, y: 14, w: 8, h: 5 },
  ],
  motion: [{ x: 11, y: 1, w: 8, h: 3 }],
  lamps: [
    { at: { x: 4, y: 1 }, radius: 2 },
    { at: { x: 27, y: 4 }, radius: 2 },
    { at: { x: 1, y: 14 }, radius: 2 },
    { at: { x: 28, y: 18 }, radius: 2 },
  ],
  cameras: [{ at: { x: 18, y: 1 }, sweep: [3, 4], range: 5 }],
  guards: [
    {
      name: 'NightClaw',
      kind: 'nightclaw',
      start: { x: 3, y: 8 },
      route: [
        { x: 26, y: 8 },
        { x: 26, y: 11 },
        { x: 3, y: 11 },
        { x: 3, y: 8 },
      ],
    },
    { name: 'Alfred', kind: 'sleepy', start: { x: 6, y: 3 }, route: [{ x: 6, y: 4 }] },
    {
      name: 'Cog',
      kind: 'robo',
      start: { x: 21, y: 2 },
      route: [
        { x: 25, y: 2 },
        { x: 25, y: 5 },
        { x: 21, y: 5 },
        { x: 21, y: 2 },
      ],
    },
    {
      name: 'Rook',
      kind: 'sniffer',
      start: { x: 11, y: 16 },
      route: [
        { x: 18, y: 16 },
        { x: 11, y: 16 },
      ],
    },
  ],
  loot: [
    {
      at: { x: 14, y: 2 },
      name: 'NightClaw’s Prized Possession',
      revealed: 'an old red leather collar, with a little brass bell and a tag that says MIDNIGHT',
      value: 0,
      space: 1,
      category: 'curiosity',
    },
    {
      at: { x: 11, y: 15 },
      name: 'The Sultan’s Sapphire (Stolen 1961)',
      value: 18000,
      space: 1,
      category: 'jewel',
    },
    {
      at: { x: 14, y: 15 },
      name: 'The Missing Mona Lisa Sketch',
      value: 15000,
      space: 2,
      category: 'painting',
    },
    {
      at: { x: 17, y: 15 },
      name: 'The Tsar’s Clockwork Mouse',
      value: 12000,
      space: 2,
      category: 'artifact',
    },
    { at: { x: 11, y: 18 }, name: 'A Very Famous Fish Fork', value: 4000, space: 1, category: 'curiosity' },
    {
      at: { x: 14, y: 18 },
      name: 'The First Calling Card Ever Left',
      value: 9000,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 17, y: 18 }, name: 'Crown of the Cat Pharaoh', value: 16000, space: 2, category: 'jewel' },
    {
      at: { x: 8, y: 1 },
      name: 'NightClaw’s Memoirs (Unfinished)',
      value: 3000,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 26, y: 1 }, name: 'A Box of Spare Monocles', value: 1500, space: 1, category: 'curiosity' },
  ],
};
