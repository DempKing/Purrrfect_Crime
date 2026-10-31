// Old Town: the first district after the tutorial. Each level brings in one or two new ideas:
// the Coin Museum a sleepy guard, squeaky floorboards and a safe; the Clocktower the rafters and a
// captain; the Pawnbroker a sniffer; the Opera House spotlights.
import type { LevelDef } from '../core/level';

/**
 * Level 1. Barnaby dozes at the ticket desk, ringed by loose floorboards; the quiet way past is the
 * lane along the west wall, or the vent from the foyer to the curator's office. Rex walks the coin hall.
 * The Double Doubloon sits under a lamp in the vault, behind a camera, or behind the office's locked door.
 */
export const COIN_MUSEUM: LevelDef = {
  id: 'l1-coin-museum',
  rivalEntrances: [{ x: 24, y: 1 }, { x: 15, y: 1 }], // the office skylight, a hall window
  tip: 'Barnaby is a sleepy guard: he sees nothing while he dozes, but noise wakes him. The brown floorboards creak loudly. The safe is slow to crack (three goes) but silent.',
  name: 'The Cobblestone Coin Museum',
  objective: 'Lift the Double Doubloon from the vault and get back out through the street door. The curator keeps something in his safe, too.',
  ambient: 'dark',
  xp: 120,
  par: 22,
  map: [
    '##########################',
    '#.........L.....#......S.#',
    '#...............#.V......#',
    '#...D...D...D...+........C',
    '#...............#........#',
    '#...D...D...D...#........#',
    '#.............L.####+#####',
    '#.................########',
    '#.#..############........#',
    '#.~~~~~.#########........#',
    '#.~~~...#########........#',
    '#.......#########....G...#',
    'E.......#########........#',
    '#.....@.#########........#',
    '#......V#########........#',
    '##########################',
  ],
  vents: [
    '',
    '',
    '                ==V',
    '                =',
    '                =',
    '                =',
    '                =',
    '                =',
    '        =========',
    '        =',
    '        =',
    '        =',
    '        =',
    '        =',
    '       V=',
  ],
  lamps: [
    { at: { x: 10, y: 1 }, radius: 2 },
    { at: { x: 14, y: 6 }, radius: 2 },
  ],
  moonlight: [
    { x: 6, y: 4, w: 5, h: 3 },
    { x: 17, y: 1, w: 8, h: 5 },
  ],
  // In the vault, looking up the passage on odd turns and across the plinth on even ones.
  cameras: [
    { at: { x: 18, y: 9 }, sweep: [6, 1], range: 5 },
    { at: { x: 8, y: 7 }, sweep: [6, 7, 6, 5], range: 5 },
    { at: { x: 22, y: 4 }, sweep: [4, 3], range: 5 },
  ],
  guards: [
    { name: 'Barnaby', kind: 'sleepy', start: { x: 4, y: 12 }, route: [{ x: 3, y: 12 }] },
    { name: 'Rex', start: { x: 2, y: 2 }, route: [{ x: 15, y: 2 }, { x: 15, y: 7 }, { x: 2, y: 7 }, { x: 2, y: 2 }] },
    { name: 'Duke', start: { x: 18, y: 13 }, route: [{ x: 23, y: 13 }, { x: 23, y: 9 }, { x: 18, y: 9 }, { x: 18, y: 13 }] },
    { name: 'Mack', start: { x: 2, y: 6 }, route: [{ x: 13, y: 6 }, { x: 2, y: 6 }] },
    { name: 'Spike', start: { x: 1, y: 11 }, route: [{ x: 6, y: 11 }, { x: 6, y: 14 }, { x: 1, y: 14 }, { x: 1, y: 11 }] },
  ],
  loot: [
    { at: { x: 21, y: 11 }, name: 'Double Doubloon', value: 5200, space: 2, category: 'curiosity' },
    { at: { x: 23, y: 1 }, name: 'The Mint Ledger', value: 2600, space: 1, category: 'artefact' },
    { at: { x: 4, y: 3 }, name: 'Cobblestone Penny', value: 300, space: 1, category: 'curiosity' },
    { at: { x: 8, y: 3 }, name: 'Silver Florin', value: 750, space: 1, category: 'curiosity' },
    { at: { x: 12, y: 3 }, name: 'Gold Sovereign', value: 1400, space: 1, category: 'jewel' },
    { at: { x: 4, y: 5 }, name: 'Pirate Piece of Eight', value: 950, space: 1, category: 'curiosity' },
    { at: { x: 8, y: 5 }, name: 'Bent Lucky Sixpence', value: 200, space: 1, category: 'curiosity' },
    { at: { x: 12, y: 5 }, name: 'Royal Mint Die', value: 1800, space: 2, category: 'artefact' },
  ],
};

/**
 * Level 2. A long archive hall full of bookshelves. Captain Big Ben walks its edge and whistles up Tick
 * from the middle aisle if he hears anything. The Brass Astrolabe is in the clock chamber, where Tock
 * dozes by the plinth, behind squeaky boards or a locked door. With Ceiling Climb, the rafters run from
 * the hall's corner straight over everyone's heads to a ladder in the chamber.
 */
export const CLOCKTOWER: LevelDef = {
  id: 'l2-clocktower',
  rivalEntrances: [{ x: 26, y: 15 }, { x: 7, y: 3 }], // the back corridor, the hall's high window
  tip: 'Big Ben is a captain: he sees further, and when he gets suspicious he whistles nearby guards over to help. With Ceiling Climb (Acrobat), the ladders lead up to the rafters.',
  name: 'The Clocktower Archive',
  objective: 'Take the Brass Astrolabe from the clock chamber and leave by the back door.',
  ambient: 'dark',
  xp: 150,
  par: 20,
  map: [
    '############################',
    '######################....L#',
    '######################.....#',
    '#######......L.......#.....#',
    '#######..............+..G..#',
    '#######..............#.....#',
    '#######..PPPP..PPPP..#.....#',
    '#######..............#~....#',
    '#######...............~~H..#',
    '#######..............#.....#',
    '#######..PPPP..PPPP..#######',
    '#.....#..............#.....#',
    '#.....#..............#.....#',
    '#..........................#',
    '#.@...#.H............#.....E',
    '#.....#......L.......#.....#',
    '############################',
  ],
  rafters: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                        H',
    '                        =',
    '                        =',
    '                        =',
    '        =================',
    '        =',
    '        H',
  ],
  lamps: [
    { at: { x: 13, y: 3 }, radius: 2 },
    { at: { x: 13, y: 15 }, radius: 2 },
    { at: { x: 26, y: 1 }, radius: 2 },
  ],
  moonlight: [
    { x: 22, y: 1, w: 3, h: 3 }, // the clock face, lit from behind
    { x: 7, y: 7, w: 14, h: 2 }, // tall windows down the hall
  ],
  cameras: [
    { at: { x: 26, y: 11 }, sweep: [3, 4], range: 5 },
    { at: { x: 7, y: 9 }, sweep: [0, 7, 0, 1], range: 6 },
  ],
  guards: [
    { name: 'Big Ben', kind: 'captain', start: { x: 8, y: 4 }, route: [{ x: 20, y: 4 }, { x: 20, y: 14 }, { x: 8, y: 14 }, { x: 8, y: 4 }] },
    { name: 'Tick', start: { x: 14, y: 5 }, route: [{ x: 14, y: 12 }, { x: 14, y: 5 }] },
    { name: 'Tock', kind: 'sleepy', start: { x: 25, y: 6 }, route: [{ x: 24, y: 6 }] },
    { name: 'Chime', start: { x: 23, y: 2 }, route: [{ x: 26, y: 2 }, { x: 26, y: 9 }, { x: 23, y: 9 }, { x: 23, y: 2 }] },
    { name: 'Gong', start: { x: 22, y: 15 }, route: [{ x: 26, y: 15 }, { x: 26, y: 12 }, { x: 22, y: 12 }, { x: 22, y: 15 }] },
  ],
  loot: [
    { at: { x: 24, y: 4 }, name: 'Brass Astrolabe', value: 6400, space: 2, category: 'artefact' },
  ],
};

/**
 * Level 3. In over the roof. The top hall is crossed by pulsing lasers (on every other turn; the fuse
 * box is on Leo's side), the shop floor below is full of glass cases and walked by Lou, and the back
 * office, with two safes, is Biscuit's beat: a sniffer who smells Leo through the walls. The Pawned
 * Tiara is in the owner's vault, behind a locked door and a camera. Out by the shop's fire escape.
 */
export const PAWNBROKER: LevelDef = {
  id: 'l3-pawnbroker',
  rivalEntrances: [{ x: 24, y: 3 }, { x: 1, y: 14 }], // the far end of the top hall, a shop window
  tip: 'Biscuit is a sniffer: short-sighted, but he smells Leo through walls from two tiles away. The lasers in the top hall pulse: off every other turn.',
  name: 'The Pawnbroker Penthouse',
  objective: 'Get the Pawned Tiara out of the owner’s vault, and out by the fire escape. The safes are worth a look.',
  ambient: 'dark',
  pulsingLasers: true,
  xp: 180,
  par: 26,
  map: [
    '#######F##################',
    '#.........xx.............#',
    '#.@.......xx.............#',
    '#.........xx.............#',
    '###..###############.#####',
    '#..............#......L..#',
    '#..............#........S#',
    '#...D..D..D..............C',
    '#..............#.........#',
    '#..............#S........#',
    '#...D..D..D....#####+#####',
    '#..............#.........#',
    '#............D.#.........#',
    'E......L.......#.....G...#',
    '#..............#.........#',
    '##########################',
  ],
  lamps: [
    { at: { x: 7, y: 13 }, radius: 2 },
    { at: { x: 22, y: 5 }, radius: 2 },
  ],
  moonlight: [
    { x: 1, y: 5, w: 14, h: 2 }, // the shop windows
    { x: 16, y: 11, w: 9, h: 4 }, // a skylight in the vault
  ],
  cameras: [
    { at: { x: 24, y: 11 }, sweep: [3, 4, 5, 4], range: 5 },
    { at: { x: 1, y: 5 }, sweep: [1, 0, 1, 2], range: 6 },
  ],
  guards: [
    { name: 'Lou', start: { x: 2, y: 8 }, route: [{ x: 13, y: 8 }, { x: 13, y: 13 }, { x: 2, y: 13 }, { x: 2, y: 8 }] },
    { name: 'Biscuit', kind: 'sniffer', start: { x: 17, y: 6 }, route: [{ x: 23, y: 6 }, { x: 17, y: 6 }] },
    { name: 'Mo', start: { x: 14, y: 1 }, route: [{ x: 23, y: 1 }, { x: 23, y: 3 }, { x: 14, y: 3 }, { x: 14, y: 1 }] },
    { name: 'Rufus', kind: 'sniffer', start: { x: 5, y: 12 }, route: [{ x: 11, y: 12 }, { x: 5, y: 12 }] },
  ],
  loot: [
    { at: { x: 21, y: 13 }, name: 'Pawned Tiara', value: 7800, space: 2, category: 'jewel' },
    { at: { x: 24, y: 6 }, name: 'Stack of IOUs', value: 1900, space: 1, category: 'curiosity' },
    { at: { x: 16, y: 9 }, name: 'Grandfather’s Medals', value: 2300, space: 1, category: 'artefact' },
    { at: { x: 4, y: 7 }, name: 'Pearl Cufflinks', value: 900, space: 1, category: 'jewel' },
    { at: { x: 7, y: 7 }, name: 'Pocket Telescope', value: 650, space: 1, category: 'artefact' },
    { at: { x: 10, y: 7 }, name: 'Silver Snuffbox', value: 700, space: 1, category: 'curiosity' },
    { at: { x: 4, y: 10 }, name: 'Cameo Brooch', value: 1100, space: 1, category: 'jewel' },
    { at: { x: 7, y: 10 }, name: 'Oil Portrait of a Pug', value: 1600, space: 2, category: 'painting' },
    { at: { x: 10, y: 10 }, name: 'Ivory Chess Set', value: 1300, space: 2, category: 'artefact' },
    { at: { x: 13, y: 12 }, name: 'Gramophone Record', value: 400, space: 1, category: 'curiosity' },
  ],
};

/**
 * Level 4. In by the stage door, out by the front doors, the whole opera house in between. Two
 * spotlights were left running: one sweeps the stage, the other the stalls, where Maestro (a captain)
 * walks the marble aisles. The Phantom's Mask is in the costume vault among the racks, reached from
 * the lobby under a camera, or through the locked door off the stage, or by the fly loft's rafters.
 */
export const OPERA_HOUSE: LevelDef = {
  id: 'l4-opera-house',
  rivalEntrances: [{ x: 18, y: 1 }, { x: 26, y: 16 }], // the stage's fly door, the lobby's side door
  tip: 'Two spotlights are sweeping: anything in their circle is in bright light. Watch where they’ll be next turn.',
  name: 'The Opera House Costume Vault',
  objective: 'Steal the Phantom’s Mask from the costume vault and walk out the front doors.',
  ambient: 'dark',
  xp: 220,
  par: 18,
  map: [
    '############################',
    '#.....#............#......L#',
    '#.H...#............#.......#',
    '#..................#.PP..P.#',
    '#.....#............+...G...#',
    '#.....#............#.......#',
    '#..................#.PP..P.#',
    '#.....#............#.......#',
    '#.....#............#....H..#',
    '#.....#...,....,...#.......#',
    '#.....#hhh,hhhh,hhh####..###',
    '#.....#...,....,...####..###',
    '###.###hhh,hhhh,hhh#.......#',
    '#.....#...,....,...#.......#',
    '#.....#hhh,hhhh,hhh........E',
    '#.@...#...,....,...#.......#',
    '#.....#...,....,...#...L...#',
    '############################',
  ],
  rafters: [
    '',
    '  =======================',
    '  H                     =',
    '                        =',
    '                        =',
    '                        =',
    '                        =',
    '                        =',
    '                        H',
  ],
  spotlights: [
    { path: [{ x: 8, y: 4 }, { x: 11, y: 4 }, { x: 14, y: 4 }, { x: 17, y: 4 }, { x: 14, y: 4 }, { x: 11, y: 4 }], radius: 2 },
    { path: [{ x: 12, y: 15 }, { x: 12, y: 11 }, { x: 16, y: 9 }, { x: 16, y: 13 }], radius: 2 },
  ],
  lamps: [
    { at: { x: 26, y: 1 }, radius: 2 },
    { at: { x: 23, y: 16 }, radius: 2 },
  ],
  moonlight: [
    { x: 20, y: 12, w: 7, h: 3 },
    { x: 1, y: 1, w: 5, h: 11 },
  ], // the lobby's glass doors
  // Hanging from the lobby's ceiling, swinging between the front doors and the door to the stalls.
  cameras: [
    { at: { x: 23, y: 13 }, sweep: [0, 4], range: 5 },
    { at: { x: 5, y: 12 }, sweep: [5, 6, 7, 6], range: 6 },
  ],
  guards: [
    { name: 'Maestro', kind: 'captain', start: { x: 7, y: 9 }, route: [{ x: 18, y: 9 }, { x: 18, y: 16 }, { x: 15, y: 16 }, { x: 15, y: 9 }, { x: 10, y: 9 }, { x: 10, y: 16 }, { x: 7, y: 16 }, { x: 7, y: 9 }] },
    { name: 'Usher', start: { x: 26, y: 15 }, route: [{ x: 20, y: 15 }, { x: 19, y: 14 }, { x: 16, y: 15 }, { x: 19, y: 14 }, { x: 20, y: 13 }, { x: 26, y: 13 }, { x: 26, y: 15 }] },
    { name: 'Diva', kind: 'sleepy', start: { x: 26, y: 5 }, route: [{ x: 25, y: 5 }] },
    { name: 'Stagehand', start: { x: 8, y: 2 }, route: [{ x: 17, y: 2 }, { x: 17, y: 6 }, { x: 8, y: 6 }, { x: 8, y: 2 }] },
    // The guard dog sniffs up and down the far end of the vault, by the way out to the lobby, not the stage door.
    { name: 'Tenor', kind: 'sniffer', start: { x: 20, y: 8 }, route: [{ x: 22, y: 8 }, { x: 20, y: 8 }] },
  ],
  loot: [
    { at: { x: 23, y: 4 }, name: 'Phantom’s Mask', value: 9500, space: 1, category: 'artefact' },
  ],
};
