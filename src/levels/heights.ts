// The Heights: the third district. Money lives up here, and it buys better security: card-reader doors,
// glass walls, guard dogs and vaults. The rooftops between the buildings are for anyone with Tightrope.
import type { LevelDef } from '../core/level';

/**
 * Level 10. In over the garden wall, out through the ballroom. The Fabergé Fish is in the gallery,
 * behind a card-reader door off the marble hall, where Sterling (a captain) walks. The keycard was left
 * in the library by the reading chair, where Jeeves the butler dozes. Bruno walks the long corridor that
 * joins everything; Duchess, a sniffer, minds the ballroom by the way out. A vent runs from the garden to
 * the library.
 */
export const MANSION: LevelDef = {
  id: 'l10-mansion',
  name: 'The Millionaire’s Mansion',
  tip: 'The gallery door has a card reader: it can’t be picked. Find the keycard (it’s lying somewhere in the house) and walk over it to pick it up.',
  objective: 'Find the keycard, take the Fabergé Fish from the gallery, and leave through the ballroom.',
  ambient: 'dark',
  xp: 300,
  par: 24,
  rivalEntrances: [{ x: 26, y: 16 }, { x: 1, y: 8 }],
  map: [
    '############################',
    '#.......L#,L,,,,,,L,#.D...D#',
    '#..P..P..#,,,,,,,,,,#......#',
    '#........#,,,,,,,,,,K...G..#',
    '#.k......#,,,,,,,,,,#......#',
    '#..P..P..#,,,,,,,,,,#......#',
    '#......V.#,,,,,,,,,,#.D...D#',
    '####.#########..####C#######',
    '#..........................#',
    '#..........................#',
    '#..........................#',
    '###.####################.###',
    '#...........#..............#',
    '#.........V.#...P...P......#',
    '#...........#L.............E',
    '#.@.........#...P...P......#',
    '#...........#..............#',
    '############################',
  ],
  vents: [
    '',
    '',
    '',
    '',
    '',
    '',
    '       V',
    '       ===',
    '         =',
    '         =',
    '         =',
    '         ====',
    '            =',
    '          V==',
  ],
  lamps: [
    { at: { x: 8, y: 1 }, radius: 2 },
    { at: { x: 11, y: 1 }, radius: 2 },
    { at: { x: 18, y: 1 }, radius: 2 },
    { at: { x: 13, y: 14 }, radius: 2 },
  ],
  moonlight: [
    { x: 1, y: 12, w: 11, h: 5 }, // the garden
    { x: 1, y: 8, w: 26, h: 1 }, // the corridor's windows
  ],
  cameras: [{ at: { x: 21, y: 1 }, sweep: [1, 2], range: 6 }],
  guards: [
    { name: 'Jeeves', kind: 'sleepy', start: { x: 4, y: 3 }, route: [{ x: 4, y: 4 }] },
    { name: 'Sterling', kind: 'captain', start: { x: 11, y: 2 }, route: [{ x: 18, y: 2 }, { x: 18, y: 5 }, { x: 11, y: 5 }, { x: 11, y: 2 }] },
    { name: 'Bruno', start: { x: 2, y: 9 }, route: [{ x: 25, y: 9 }, { x: 2, y: 9 }] },
    { name: 'Duchess', kind: 'sniffer', start: { x: 15, y: 12 }, route: [{ x: 25, y: 12 }, { x: 25, y: 16 }, { x: 15, y: 16 }, { x: 15, y: 12 }] },
  ],
  loot: [
    { at: { x: 24, y: 3 }, name: 'Fabergé Fish', value: 15000, space: 1, category: 'jewel' },
    { at: { x: 22, y: 1 }, name: 'Diamond Cufflinks', value: 3200, space: 1, category: 'jewel' },
    { at: { x: 26, y: 1 }, name: 'Portrait of a Prize Pug', value: 4100, space: 3, category: 'painting' },
    { at: { x: 22, y: 6 }, name: 'Gold-Plated Ball of Yarn', value: 2200, space: 2, category: 'curiosity' },
    { at: { x: 26, y: 6 }, name: 'Silver Sardine Tin', value: 1500, space: 1, category: 'artefact' },
  ],
};

/**
 * Level 11. Three rooftops above the city. Leo comes up the service stairs onto the west roof, where Basil
 * walks between the two little bridges to the roof garden. Ivy the gardener (a sniffer) walks a ring round
 * the penthouse suite (and Rosa the other way) in the middle of the garden: glass on its north side, a locked door on the south, a
 * camera inside, and the Sapphire Swan on its plinth. Captain Monty guards the one bridge to the east roof
 * and its fire escape. Wires strung across the gaps are for anyone with Tightrope.
 */
export const SKY_GARDEN: LevelDef = {
  id: 'l11-sky-garden',
  name: 'The Sky Garden Hotel',
  tip: 'Rooftops: nobody can cross the gaps, but everyone can see across them. Wires join some of the roofs: with the Tightrope skill (Acrobat), Leo can walk them where no guard can follow. The hotel’s searchlight circles the garden.',
  objective: 'Cross to the roof garden, take the Sapphire Swan from the penthouse, and get down the fire escape on the east roof.',
  ambient: 'dim',
  gaps: 'sky',
  shadows: [
    { x: 1, y: 14, w: 2, h: 2 },
    { x: 9, y: 14, w: 2, h: 3 },
    { x: 17, y: 1, w: 2, h: 3 },
    { x: 12, y: 9, w: 4, h: 2 },
    { x: 25, y: 12, w: 2, h: 3 },
  ],
  xp: 320,
  par: 19,
  rivalEntrances: [{ x: 26, y: 4 }, { x: 9, y: 1 }],
  map: [
    '############################',
    '#________..........________#',
    '#......__.P......P.________#',
    '#...L..__....P.....--......#',
    '#..................__...L..#',
    '#......__..#||||#..__......#',
    '#......__..#L...#..__......#',
    '#......__..#....#..__......#',
    '#......--..#..G.#..__......#',
    '#......__..#....#..........#',
    '#......__..#....#..__......#',
    '#......__..#D..DC..__......#',
    '#......__..##+###..__......#',
    '#..................__.....E#',
    '#.@....__.....P....--......#',
    '#......__.P......P.________#',
    '#________..........________#',
    '############################',
  ],
  lamps: [
    { at: { x: 4, y: 3 }, radius: 2 },
    { at: { x: 24, y: 4 }, radius: 2 },
    { at: { x: 12, y: 6 }, radius: 2 },
  ],
  cameras: [{ at: { x: 15, y: 6 }, sweep: [3, 2], range: 5 }],
  // The hotel's searchlight circles the roof garden.
  spotlights: [{ path: [{ x: 10, y: 3 }, { x: 13, y: 2 }, { x: 17, y: 3 }, { x: 18, y: 8 }, { x: 17, y: 13 }, { x: 13, y: 15 }, { x: 10, y: 13 }, { x: 9, y: 8 }], radius: 2 }],
  guards: [
    { name: 'Basil', start: { x: 5, y: 4 }, route: [{ x: 5, y: 13 }, { x: 5, y: 4 }] },
    { name: 'Ivy', kind: 'sniffer', start: { x: 10, y: 4 }, route: [{ x: 17, y: 4 }, { x: 17, y: 13 }, { x: 10, y: 13 }, { x: 10, y: 4 }] },
    // Rosa walks the garden the other way round from Ivy.
    { name: 'Rosa', start: { x: 17, y: 13 }, route: [{ x: 17, y: 4 }, { x: 10, y: 4 }, { x: 10, y: 13 }, { x: 17, y: 13 }] },
    { name: 'Monty', kind: 'captain', start: { x: 22, y: 9 }, route: [{ x: 22, y: 4 }, { x: 22, y: 13 }, { x: 22, y: 9 }] },
  ],
  loot: [
    { at: { x: 14, y: 8 }, name: 'Sapphire Swan', value: 16000, space: 2, category: 'jewel' },
    { at: { x: 12, y: 11 }, name: 'Penthouse Pearls', value: 3800, space: 1, category: 'jewel' },
    { at: { x: 15, y: 11 }, name: 'Rooftop Sunset in Oils', value: 4400, space: 3, category: 'painting' },
  ],
};

/**
 * Level 12. Forty floors up, on auction night. Leo comes up in the service lift; Bonham (a sniffer) minds
 * the lobby. The auction floor is echoing marble, with rows of bidders' seats, and in the middle stands the
 * vitrine: a glass room with a camera inside and the Crown of the Cat King on its plinth. Sotheby (a
 * captain) circles it; Phillips walks the west aisles, Christie the east one by the service stairs. Three
 * glass-fronted viewing rooms along the north wall hold tomorrow's lots. Glass shows everything and
 * carries no sound: inside a glass room, picking a lock is heard by nobody outside.
 */
export const GLASS_TOWER: LevelDef = {
  id: 'l12-glass-tower',
  name: 'The Glass Tower Auction',
  tip: 'Glass walls: guards see straight through them, but sound doesn’t carry through glass. A noise inside a glass room stays inside it.',
  objective: 'Take the Crown of the Cat King from the vitrine in the middle of the auction floor, and leave by the service stairs.',
  ambient: 'dim',
  shadows: [
    { x: 2, y: 8, w: 7, h: 1 },
    { x: 19, y: 8, w: 7, h: 1 },
    { x: 1, y: 3, w: 2, h: 1 },
    { x: 25, y: 3, w: 2, h: 1 },
    { x: 16, y: 15, w: 3, h: 2 },
    { x: 12, y: 7, w: 2, h: 3 }, // the crown's spotlight is off for the night: the west half of the vitrine is dark
    { x: 26, y: 5, w: 1, h: 7 }, // curtains by the service stairs
  ],
  xp: 340,
  par: 19,
  rivalEntrances: [{ x: 26, y: 1 }, { x: 1, y: 1 }],
  map: [
    '############################',
    '#.D....D.#.D....D.#.D....D.#',
    '#...L....#........#....L...#',
    '#........#........#........#',
    '#||||+|||C||||+|||#|||+||||#',
    '#.........,,,,,,,,.........#',
    '#.........,||+|||,.........#',
    '#.hhhhhhh.,|....|,.hhhhhhh.#',
    '#.........,|.G..|,.........E',
    '#.hhhhhhh.,|....|,.hhhhhhh.#',
    '#.........,||||||,.........#',
    '#.........,,,,,,,,........V#',
    '#############..#############',
    '#########.........L#########',
    '#########..........#########',
    '#########....@.....#########',
    '#########LV........#########',
    '############################',
  ],
  vents: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                          V',
    '        ===================',
    '        =',
    '        =',
    '        =',
    '        ==V',
  ],
  lamps: [
    { at: { x: 4, y: 2 }, radius: 2 },
    { at: { x: 23, y: 2 }, radius: 2 },
    { at: { x: 9, y: 16 }, radius: 2 },
    { at: { x: 18, y: 13 }, radius: 2 },
  ],
  cameras: [
    { at: { x: 1, y: 5 }, sweep: [0, 1], range: 6 },
    { at: { x: 26, y: 5 }, sweep: [4, 3], range: 6 },
    { at: { x: 15, y: 7 }, sweep: [2, 3], range: 4 },
  ],
  guards: [
    { name: 'Sotheby', kind: 'captain', start: { x: 10, y: 5 }, route: [{ x: 17, y: 5 }, { x: 17, y: 11 }, { x: 10, y: 11 }, { x: 10, y: 5 }] },
    { name: 'Phillips', start: { x: 1, y: 6 }, route: [{ x: 9, y: 6 }, { x: 9, y: 10 }, { x: 1, y: 10 }, { x: 1, y: 6 }] },
    { name: 'Christie', start: { x: 18, y: 8 }, route: [{ x: 24, y: 8 }, { x: 18, y: 8 }] },
    { name: 'Bonham', kind: 'sniffer', start: { x: 10, y: 14 }, route: [{ x: 17, y: 14 }, { x: 10, y: 14 }] },
  ],
  loot: [
    { at: { x: 13, y: 8 }, name: 'Crown of the Cat King', value: 19000, space: 2, category: 'jewel' },
    { at: { x: 2, y: 1 }, name: 'Lot 7: A Very Old Mouse', value: 1600, space: 1, category: 'curiosity' },
    { at: { x: 7, y: 1 }, name: 'Lot 12: Pearl Collar', value: 3500, space: 1, category: 'jewel' },
    { at: { x: 11, y: 1 }, name: 'Lot 19: Cat with a Pearl Earring', value: 6200, space: 3, category: 'painting' },
    { at: { x: 16, y: 1 }, name: 'Lot 23: Jade Fishbone', value: 2700, space: 1, category: 'artefact' },
    { at: { x: 20, y: 1 }, name: 'Lot 31: Ruby Bell', value: 2900, space: 1, category: 'jewel' },
    { at: { x: 25, y: 1 }, name: 'Lot 40: Gilded Scratching Post', value: 1900, space: 3, category: 'curiosity' },
  ],
};

/**
 * Level 13. Leo rows in to the end of the east pier. The Commodore's Golden Compass is in the cabin of his
 * yacht, moored by the middle pier, with Skipper (a captain) pacing
 * its bow; the cabin door is round the far side. Bosun walks the boardwalk,
 * past two guard dogs dozing in their kennels; Barnacle (a sniffer) prowls the little yacht's
 * deck, and Old Salt naps at the head of the west pier, where the dinghy home is tied up. The clubhouse has a few
 * trophies for the greedy. A mooring line runs from the big yacht to the east pier, for Tightrope; the
 * one-tile gaps beside the yachts can be crossed with a Pounce.
 */
export const YACHT_CLUB: LevelDef = {
  id: 'l13-yacht-club',
  name: 'The Yacht Club',
  tip: 'Guard dogs sleep in their kennels, but they bark at anything that comes within 2 tiles (the path turns yellow), and guards come running. Water works like a rooftop gap.',
  objective: 'Steal the Golden Compass from the commodore’s cabin and row away from the west pier.',
  ambient: 'dark',
  gaps: 'water',
  xp: 360,
  par: 36,
  rivalEntrances: [{ x: 26, y: 7 }, { x: 12, y: 16 }],
  map: [
    '############################',
    '#........#.D..D..D#.S......#',
    '#........#........#........#',
    '#........#........#........#',
    '#........#........#........#',
    '#........#........#........#',
    '####.########+########.#####',
    '#.......L.........L..B.....#',
    '#..........B...............#',
    '#_..________.._________..__#',
    '#_..________.._......__..__#',
    '#_.._.....__.._.####.--..__#',
    '#_.....D..__....#..+.__..__#',
    '#_.._....D__.._.#G.#.__..__#',
    '#_.._.....__.._.####.__..__#',
    '#_..________.._......__..__#',
    '#_E.________.._________.@__#',
    '############################',
  ],
  lamps: [
    { at: { x: 8, y: 7 }, radius: 2 },
    { at: { x: 18, y: 7 }, radius: 2 },
  ],
  // Moonlight on the water lights the decks and piers dimly.
  moonlight: [{ x: 1, y: 9, w: 26, h: 8 }],
  guards: [
    { name: 'Bosun', start: { x: 1, y: 8 }, route: [{ x: 26, y: 8 }, { x: 1, y: 8 }] },
    { name: 'Skipper', kind: 'captain', start: { x: 15, y: 10 }, route: [{ x: 20, y: 10 }, { x: 15, y: 10 }] },
    { name: 'Barnacle', kind: 'sniffer', start: { x: 5, y: 11 }, route: [{ x: 9, y: 11 }, { x: 9, y: 14 }, { x: 5, y: 14 }, { x: 5, y: 11 }] },
    { name: 'Old Salt', kind: 'sleepy', start: { x: 3, y: 10 }, route: [{ x: 3, y: 11 }] },
  ],
  loot: [
    { at: { x: 17, y: 13 }, name: 'Golden Compass', value: 20000, space: 1, category: 'artefact' },
    { at: { x: 11, y: 1 }, name: 'Regatta Cup', value: 3600, space: 2, category: 'artefact' },
    { at: { x: 14, y: 1 }, name: 'Ship in a Bottle (with a Cat)', value: 2100, space: 2, category: 'curiosity' },
    { at: { x: 17, y: 1 }, name: 'Admiral’s Medal', value: 2800, space: 1, category: 'jewel' },
    { at: { x: 20, y: 1 }, name: 'The Club’s Cash Box', value: 4500, space: 2, category: 'curiosity' },
    { at: { x: 7, y: 12 }, name: 'Brass Telescope', value: 1700, space: 2, category: 'artefact' },
    { at: { x: 9, y: 13 }, name: 'Captain’s Pipe', value: 900, space: 1, category: 'curiosity' },
  ],
};

/**
 * Level 14, the end of the Heights. A star-gazer's estate on the hill. Leo comes over the wall into the
 * grounds, where Rufus walks and a guard dog sleeps by the path. The Comet Diamond is in the vault, off the
 * long marble gallery that Captain Hubert walks end to end; its combination is taped inside the study desk
 * next door. In through the glass-fronted conservatory, or by the vent to the terrace room. Astra, the
 * astronomer, dozes at her telescope in the dome upstairs, among the star charts.
 */
export const OBSERVATORY: LevelDef = {
  id: 'l14-observatory',
  name: 'The Observatory Estate',
  tip: 'The vault door can’t be picked: find the combination (it’s in a desk somewhere in the house), then turn the dials twice, quietly.',
  objective: 'Find the combination, open the vault and take the Comet Diamond, then get out over the east wall.',
  ambient: 'dark',
  xp: 380,
  par: 32,
  rivalEntrances: [{ x: 26, y: 13 }, { x: 26, y: 1 }],
  map: [
    '############################',
    '#.D...D.#..........#.D...D.#',
    '#.......#.D..PP..D.#.......#',
    '#.......#..........#.......#',
    '####.########.#########+####',
    '#,,,,,,,,L,,,,,,,,,,L,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '####.######+##C###Q#####.###',
    '#.......#.....L#S....S#....#',
    '#.P...P.#..N...#......#....#',
    '#..P.P..#......#..G...#..V.#',
    '#.......#......#......#....#',
    '#|||.|||################.###',
    '#..........................#',
    '#............B.............E',
    '#.@........................#',
    '#.......L.................V#',
    '############################',
  ],
  vents: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '                         V',
    '                         =',
    '                         ==',
    '                          =',
    '                          =',
    '                          =',
    '                          V',
  ],
  lamps: [
    { at: { x: 9, y: 5 }, radius: 2 },
    { at: { x: 20, y: 5 }, radius: 2 },
    { at: { x: 14, y: 8 }, radius: 2 },
    { at: { x: 8, y: 16 }, radius: 2 },
  ],
  moonlight: [
    { x: 1, y: 13, w: 26, h: 4 }, // the grounds
    { x: 9, y: 1, w: 10, h: 3 }, // the dome is open to the stars
    { x: 1, y: 8, w: 7, h: 4 }, // the conservatory's glass
  ],
  cameras: [{ at: { x: 21, y: 11 }, sweep: [5, 4], range: 4 }],
  guards: [
    { name: 'Hubert', kind: 'captain', start: { x: 1, y: 6 }, route: [{ x: 26, y: 6 }, { x: 1, y: 6 }] },
    { name: 'Rufus', start: { x: 14, y: 13 }, route: [{ x: 26, y: 13 }, { x: 26, y: 16 }, { x: 14, y: 16 }, { x: 14, y: 13 }] },
    { name: 'Astra', kind: 'sleepy', start: { x: 12, y: 1 }, route: [{ x: 12, y: 2 }] },
  ],
  loot: [
    { at: { x: 18, y: 10 }, name: 'Comet Diamond', value: 22000, space: 1, category: 'jewel' },
    { at: { x: 16, y: 8 }, name: 'Deeds to the Moon (Signed)', value: 5000, space: 1, category: 'curiosity' },
    { at: { x: 21, y: 8 }, name: 'Platinum Sextant', value: 4200, space: 2, category: 'artefact' },
    { at: { x: 2, y: 1 }, name: 'Polo Trophy', value: 1800, space: 2, category: 'artefact' },
    { at: { x: 6, y: 1 }, name: 'Silver Fish Knife', value: 900, space: 1, category: 'curiosity' },
    { at: { x: 10, y: 2 }, name: 'Star Chart of the Great Cat', value: 3300, space: 2, category: 'painting' },
    { at: { x: 17, y: 2 }, name: 'Meteorite Paperweight', value: 1400, space: 1, category: 'curiosity' },
    { at: { x: 21, y: 1 }, name: 'First Edition Moby Dick', value: 2600, space: 2, category: 'curiosity' },
    { at: { x: 25, y: 1 }, name: 'Gold Pen', value: 1100, space: 1, category: 'artefact' },
  ],
};
