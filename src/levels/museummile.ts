// Museum Mile (district 2): pressure plates, motion sensors, and the first rival thieves.
import type { LevelDef } from '../core/level';

/**
 * Level 5: Natural history museum. The T-rex in the great hall blocks sight.
 * Prize: Golden Raptor Egg on a plinth ringed with pressure plates (Doc dozes nearby).
 * Guards: Rexford (captain), Bones, Moose. Vents: loading bay to the egg room.
 */
export const NATURAL_HISTORY: LevelDef = {
  id: 'l5-natural-history',
  name: 'The Natural History Museum',
  tip: 'Pressure plates (the raised squares) set off the alarm the moment you step on one. Step around them, or Pounce over them.',
  objective: 'Take the Golden Raptor Egg from among the pressure plates, then leave by the front steps.',
  ambient: 'dim',
  // Shadow areas.
  shadows: [
    { x: 11, y: 8, w: 7, h: 3 },
    { x: 1, y: 3, w: 1, h: 7 },
    { x: 1, y: 13, w: 5, h: 2 },
    { x: 28, y: 4, w: 1, h: 11 },
  ],
  xp: 260,
  par: 17,
  rivalEntrances: [
    { x: 28, y: 1 },
    { x: 1, y: 13 },
  ],
  map: [
    '##############################',
    '#.....###.L..^^^....V###.....#',
    '#.D.D.###.....G......###.....#',
    'E.....###....^.^...L.###.D.D.#',
    '#.....########..########.....#',
    '#.D.D.#..........L.....#.....#',
    '#.....#................#.....#',
    '#.....#..................D.D.#',
    '#.D.D.#......PPP.......#.....#',
    '#.....~~....P...P......#.....#',
    '#.....~~...P.P.P.P.....#.....#',
    '#.....#................#.D.D.#',
    '###.###................#.....#',
    '#.....#................+.....#',
    '#...V.#.L..............#.....#',
    '#.@...#................#..V..#',
    '#.....##################.....#',
    '##############################',
  ],
  vents: [
    '',
    '                    V',
    '                    =',
    '                    =',
    '                    ====',
    '                       =',
    '                       =',
    '                       =',
    '                       =',
    '                       =',
    '                       =',
    '                       =',
    '                       =',
    '                       =',
    '    V==                =',
    '      =                ===V',
    '      =====================',
  ],
  lamps: [
    { at: { x: 10, y: 1 }, radius: 2 },
    { at: { x: 19, y: 3 }, radius: 2 },
    { at: { x: 8, y: 14 }, radius: 2 },
    { at: { x: 17, y: 5 }, radius: 2 },
  ],
  moonlight: [
    { x: 11, y: 7, w: 7, h: 5 }, // a skylight over the T-rex
    { x: 24, y: 6, w: 5, h: 3 },
  ],
  guards: [
    {
      name: 'Rexford',
      kind: 'captain',
      start: { x: 9, y: 6 },
      route: [
        { x: 20, y: 6 },
        { x: 20, y: 13 },
        { x: 9, y: 13 },
        { x: 9, y: 6 },
      ],
    },
    {
      name: 'Bones',
      start: { x: 3, y: 1 },
      route: [
        { x: 3, y: 11 },
        { x: 3, y: 1 },
      ],
    },
    {
      name: 'Raptor',
      start: { x: 8, y: 5 },
      route: [
        { x: 22, y: 5 },
        { x: 8, y: 5 },
      ],
    },
    { name: 'Doc', kind: 'sleepy', start: { x: 11, y: 3 }, route: [{ x: 12, y: 2 }] },
    {
      name: 'Moose',
      start: { x: 24, y: 2 },
      route: [
        { x: 28, y: 2 },
        { x: 28, y: 15 },
        { x: 24, y: 15 },
        { x: 24, y: 2 },
      ],
    },
  ],
  loot: [
    { at: { x: 14, y: 2 }, name: 'Golden Raptor Egg', value: 11000, space: 2, category: 'artifact' },
    { at: { x: 2, y: 2 }, name: 'Ammonite', value: 900, space: 1, category: 'curiosity' },
    { at: { x: 4, y: 2 }, name: 'Sabre-Tooth Fang', value: 1400, space: 1, category: 'artifact' },
    { at: { x: 2, y: 5 }, name: 'Trilobite in Amber', value: 2100, space: 1, category: 'jewel' },
    { at: { x: 4, y: 5 }, name: 'Pterodactyl Wing Bone', value: 1800, space: 2, category: 'artifact' },
    { at: { x: 2, y: 8 }, name: 'Dodo Egg', value: 2600, space: 2, category: 'curiosity' },
    { at: { x: 4, y: 8 }, name: 'Mammoth Hair Comb', value: 700, space: 1, category: 'curiosity' },
    { at: { x: 25, y: 3 }, name: 'Stuffed Pine Marten', value: 600, space: 2, category: 'curiosity' },
    { at: { x: 27, y: 7 }, name: 'Golden Eagle Feather', value: 1200, space: 1, category: 'jewel' },
    { at: { x: 25, y: 11 }, name: 'Platypus Skull', value: 950, space: 1, category: 'artifact' },
  ],
};

/**
 * Level 6: Egyptian wing. The tomb corridor has motion sensors (1 tile per move);
 * the fuse box is at the far end of the gallery, a vent from the entrance.
 * Prize: Scarab of Bastet between two safes, under a camera. Guards: Ramses, Anubis (sniffer), Khufu (dozing).
 */
export const EGYPTIAN_WING: LevelDef = {
  id: 'l6-egyptian-wing',
  name: 'The Egyptian Wing',
  tip: 'The tomb corridor has motion sensors: inside the marked zone, move one tile at a time or the alarm goes off. Cutting the fuse box turns them off.',
  objective: 'Steal the Scarab of Bastet from the burial chamber and get back out the way you came.',
  ambient: 'dim',
  shadows: [
    { x: 9, y: 10, w: 17, h: 1 }, // between the statues
    { x: 9, y: 13, w: 17, h: 1 },
    { x: 13, y: 5, w: 4, h: 3 }, // the corridor
    { x: 1, y: 13, w: 3, h: 2 },
  ],
  xp: 280,
  par: 19,
  rivalEntrances: [
    { x: 26, y: 14 },
    { x: 22, y: 3 },
  ],
  map: [
    '############################',
    '########....L.....L....#####',
    '########.S.....G.....S.#####',
    '########...............#####',
    '##############..############',
    '#############....###########',
    '#############....###########',
    '#############....###########',
    '############C#..############',
    '#.....V#..................V#',
    '#..D...#..P..P..P..P..P..P.#',
    '#..........................F',
    'E..........................#',
    '#.@..D.#..P..P..P..P..P..P.#',
    '#......#...................#',
    '############################',
  ],
  vents: ['', '', '', '', '', '', '', '', '      =====================', '      V                   V'],
  motion: [{ x: 13, y: 4, w: 4, h: 5 }],
  lamps: [
    { at: { x: 12, y: 1 }, radius: 2 },
    { at: { x: 18, y: 1 }, radius: 2 },
  ],
  cameras: [{ at: { x: 22, y: 1 }, sweep: [4, 3], range: 6 }],
  guards: [
    {
      name: 'Ramses',
      start: { x: 12, y: 11 },
      route: [
        { x: 26, y: 11 },
        { x: 26, y: 12 },
        { x: 12, y: 12 },
        { x: 12, y: 11 },
      ],
    },
    {
      name: 'Anubis',
      kind: 'sniffer',
      start: { x: 25, y: 9 },
      route: [
        { x: 9, y: 9 },
        { x: 25, y: 9 },
      ],
    },
    { name: 'Khufu', kind: 'sleepy', start: { x: 20, y: 3 }, route: [{ x: 19, y: 3 }] },
  ],
  loot: [
    { at: { x: 15, y: 2 }, name: 'Scarab of Bastet', value: 12500, space: 1, category: 'jewel' },
    { at: { x: 9, y: 2 }, name: 'Golden Death Mask of a Cat', value: 5200, space: 2, category: 'artifact' },
    { at: { x: 21, y: 2 }, name: 'Canopic Jar of Catnip', value: 2400, space: 2, category: 'curiosity' },
    { at: { x: 3, y: 10 }, name: 'Papyrus of the Nine Lives', value: 1800, space: 1, category: 'painting' },
    { at: { x: 5, y: 13 }, name: 'Faience Hippo', value: 1100, space: 1, category: 'artifact' },
  ],
};

/**
 * Level 7: Modern art. A spotlight circles the marble atrium; Curator (captain) walks its edge.
 * Prize: Blue Period Cat behind a camera and pressure plates. Catwalk overhead for Ceiling Climb.
 */
export const MODERN_ART: LevelDef = {
  id: 'l7-modern-art',
  name: 'The Modern Art Atrium',
  tip: 'The atrium floor is marble: every step is heard. The spotlight circles the room one stop a turn.',
  objective: 'Lift the Blue Period Cat from the masterpiece room and leave through the east gallery.',
  ambient: 'dim',
  shadows: [
    { x: 2, y: 9, w: 2, h: 7 },
    { x: 24, y: 1, w: 2, h: 5 },
    { x: 18, y: 8, w: 3, h: 4 },
  ],
  xp: 300,
  par: 17,
  rivalEntrances: [
    { x: 19, y: 1 },
    { x: 26, y: 16 },
  ],
  map: [
    '############################',
    '#....###.L..^^^...L.###....#',
    '#D...###....^G^.....###...D#',
    '#...H###............###H...#',
    '#....########..########....#',
    '#D...#,,,,,,,,,,,,,,,,#...D#',
    '#....#,,,,,,,,,,,,,,,,#....#',
    '#....#,,,P,,,,,,,P,,,,.....#',
    '#D....,,,,,,,,,,,,,,,,#...D#',
    '#....#,,,,,,,P,,,,,,,,#....#',
    '#....#,,,,,,,,P,,,,,,,#....#',
    '#D...#,,,,,,,,,,,,,,,,....D#',
    '#.....,,,P,,,,,,,P,,,,#....E',
    '#....#,,,,,,,,,,,,,,,,#....#',
    '#D...#,,,,,,,,,,,,,,,,#...D#',
    '#.@..###########C######....#',
    '#....##################....#',
    '############################',
  ],
  rafters: [
    '',
    '',
    '',
    '    H                  H',
    '    =                  =',
    '    =                  =',
    '    ====================',
  ],
  spotlights: [
    {
      path: [
        { x: 8, y: 9 },
        { x: 11, y: 6 },
        { x: 16, y: 6 },
        { x: 19, y: 9 },
        { x: 16, y: 13 },
        { x: 11, y: 13 },
      ],
      radius: 2,
    },
  ],
  lamps: [
    { at: { x: 9, y: 1 }, radius: 2 },
    { at: { x: 18, y: 1 }, radius: 2 },
  ],
  cameras: [{ at: { x: 19, y: 3 }, sweep: [4, 5], range: 6 }],
  guards: [
    {
      name: 'Curator',
      kind: 'captain',
      start: { x: 7, y: 6 },
      route: [
        { x: 20, y: 6 },
        { x: 20, y: 13 },
        { x: 7, y: 13 },
        { x: 7, y: 6 },
      ],
    },
    {
      name: 'Monet',
      start: { x: 3, y: 1 },
      route: [
        { x: 3, y: 10 },
        { x: 3, y: 1 },
      ],
    },
    {
      name: 'Dali',
      start: { x: 24, y: 16 },
      route: [
        { x: 24, y: 7 },
        { x: 25, y: 7 },
        { x: 25, y: 16 },
        { x: 24, y: 16 },
      ],
    },
  ],
  loot: [
    { at: { x: 13, y: 2 }, name: 'The Blue Period Cat', value: 14000, space: 2, category: 'painting' },
    { at: { x: 1, y: 2 }, name: 'Still Life with Fish', value: 2200, space: 2, category: 'painting' },
    { at: { x: 1, y: 5 }, name: 'Ball of Yarn, No. 7', value: 1800, space: 1, category: 'painting' },
    { at: { x: 1, y: 8 }, name: 'Self-Portrait with Whiskers', value: 3100, space: 2, category: 'painting' },
    { at: { x: 1, y: 11 }, name: 'Composition in Tuna', value: 1500, space: 1, category: 'painting' },
    { at: { x: 1, y: 14 }, name: 'The Scream (of a Kitten)', value: 2600, space: 2, category: 'painting' },
    { at: { x: 26, y: 2 }, name: 'Cubist Mouse', value: 1900, space: 1, category: 'painting' },
    { at: { x: 26, y: 5 }, name: 'Water Lilies and Goldfish', value: 3400, space: 2, category: 'painting' },
    { at: { x: 26, y: 8 }, name: 'Dog Playing Poker (Ironic)', value: 900, space: 1, category: 'painting' },
    { at: { x: 26, y: 11 }, name: 'Untitled (Box)', value: 1200, space: 1, category: 'curiosity' },
    { at: { x: 26, y: 14 }, name: 'Pop Art Sardine Can', value: 1700, space: 1, category: 'painting' },
  ],
};

/**
 * Level 8: Gem hall. Prize: Star of Siam in the vault behind lasers and motion sensors;
 * the fuse box is in the security office (Night Owl dozes). Guards: Topaz (captain), Quartz (sniffer), Flint.
 */
export const GEM_HALL: LevelDef = {
  id: 'l8-gem-hall',
  name: 'The Gem & Mineral Hall',
  tip: 'The vault has lasers and motion sensors, both on the fuse box in the security office. Night Owl is asleep in there: don’t wake him.',
  objective: 'Take the Star of Siam from the vault and get out through the loading door.',
  ambient: 'dim',
  shadows: [
    { x: 1, y: 9, w: 2, h: 2 },
    { x: 16, y: 7, w: 4, h: 1 },
    { x: 22, y: 9, w: 3, h: 2 },
    { x: 6, y: 13, w: 3, h: 3 },
  ],
  xp: 320,
  par: 36,
  rivalEntrances: [
    { x: 26, y: 7 },
    { x: 1, y: 7 },
  ],
  map: [
    '################F###C#######',
    '########S......#.....#.....#',
    '########...G...#........@..#',
    '########.......#.....#.....#',
    '########.......#.....#.....#',
    '########xxxxxxx#.....###..##',
    '###########.######.#####..##',
    '#.L..........L.............#',
    '#..D.....D...........D.....#',
    '#..........................#',
    '#.....D.....D..D...D.......#',
    '#........................L.#',
    '####..######################',
    '#........###################',
    'E........###################',
    '#........###################',
    '############################',
  ],
  motion: [{ x: 8, y: 1, w: 7, h: 4 }],
  lamps: [
    { at: { x: 2, y: 7 }, radius: 2 },
    { at: { x: 13, y: 7 }, radius: 2 },
    { at: { x: 25, y: 11 }, radius: 2 },
  ],
  cameras: [{ at: { x: 26, y: 8 }, sweep: [4, 3, 4, 5], range: 6 }],
  guards: [
    {
      name: 'Topaz',
      kind: 'captain',
      start: { x: 2, y: 9 },
      route: [
        { x: 25, y: 9 },
        { x: 2, y: 9 },
      ],
    },
    {
      name: 'Quartz',
      kind: 'sniffer',
      start: { x: 8, y: 7 },
      route: [
        { x: 15, y: 7 },
        { x: 8, y: 7 },
      ],
    },
    { name: 'Night Owl', kind: 'sleepy', start: { x: 19, y: 1 }, route: [{ x: 19, y: 2 }] },
    {
      name: 'Flint',
      start: { x: 2, y: 13 },
      route: [
        { x: 8, y: 13 },
        { x: 8, y: 15 },
        { x: 2, y: 15 },
        { x: 2, y: 13 },
      ],
    },
  ],
  loot: [
    { at: { x: 11, y: 2 }, name: 'Star of Siam', value: 16000, space: 1, category: 'jewel' },
    { at: { x: 8, y: 1 }, name: 'Uncut Emerald', value: 6000, space: 1, category: 'jewel' },
    { at: { x: 3, y: 8 }, name: 'Geode Half', value: 900, space: 2, category: 'curiosity' },
    { at: { x: 9, y: 8 }, name: 'Opal Fish', value: 2400, space: 1, category: 'jewel' },
    { at: { x: 21, y: 8 }, name: 'Meteorite Fragment', value: 3100, space: 2, category: 'curiosity' },
    { at: { x: 6, y: 10 }, name: 'Rose Quartz Kitten', value: 1700, space: 1, category: 'artifact' },
    { at: { x: 12, y: 10 }, name: 'Sapphire Bell', value: 3600, space: 1, category: 'jewel' },
    { at: { x: 15, y: 10 }, name: 'Fool’s Gold Nugget', value: 300, space: 1, category: 'curiosity' },
    { at: { x: 19, y: 10 }, name: 'Amber with a Flea', value: 1300, space: 1, category: 'artifact' },
  ],
};

/**
 * Level 9: Planetarium (end of Museum Mile). Two projector beams sweep in opposite circles.
 * Prize: Midnight Meteorite in the observatory (Hubble dozes, camera). Guards: Galileo (captain),
 * Halley, Comet (sniffer), Kepler. Catwalk to the observatory for Ceiling Climb.
 */
export const PLANETARIUM: LevelDef = {
  id: 'l9-planetarium',
  name: 'The Planetarium',
  tip: 'The stars light the dome dimly, and two spotlights sweep it in opposite directions. The darkest spots are just inside the rings of seats.',
  objective: 'Take the Midnight Meteorite from the observatory and slip out through the east lobby.',
  // Dim starlight everywhere, darkest inside the rings of seats.
  ambient: 'dim',
  shadows: [
    { x: 9, y: 8, w: 3, h: 1 },
    { x: 16, y: 8, w: 3, h: 1 },
    { x: 9, y: 12, w: 3, h: 1 },
    { x: 16, y: 12, w: 3, h: 1 },
    { x: 1, y: 12, w: 4, h: 2 },
    { x: 23, y: 6, w: 1, h: 4 },
  ],
  xp: 340,
  par: 17,
  rivalEntrances: [
    { x: 26, y: 13 },
    { x: 8, y: 3 },
  ],
  map: [
    '############################',
    '########.L...G...H..########',
    '########............########',
    '########..........L.########',
    '#############+.#############',
    '######................######',
    '#.L..#................#....#',
    '#..H.#..hhhh....hhhh..#....E',
    '#....#................#....#',
    '#.......h..........h.......#',
    '#.......h....PP....h.......#',
    '#....#..h..........h..#....#',
    '#.@..#................#....#',
    '#....#..hhhh....hhhh..#..L.#',
    '######................######',
    '######................######',
    '###########C################',
    '############################',
  ],
  rafters: [
    '',
    '                 H',
    '                 =',
    '                 =',
    '   ===============',
    '   =',
    '   =',
    '   H',
  ],
  spotlights: [
    {
      path: [
        { x: 9, y: 6 },
        { x: 13, y: 6 },
        { x: 18, y: 6 },
        { x: 20, y: 10 },
        { x: 18, y: 14 },
        { x: 13, y: 14 },
        { x: 9, y: 14 },
        { x: 7, y: 10 },
      ],
      radius: 2,
    },
    {
      path: [
        { x: 18, y: 14 },
        { x: 13, y: 14 },
        { x: 9, y: 14 },
        { x: 7, y: 10 },
        { x: 9, y: 6 },
        { x: 13, y: 6 },
        { x: 18, y: 6 },
        { x: 20, y: 10 },
      ].reverse(),
      radius: 2,
    },
  ],
  lamps: [
    { at: { x: 9, y: 1 }, radius: 2 },
    { at: { x: 18, y: 3 }, radius: 2 },
    { at: { x: 2, y: 6 }, radius: 2 },
    { at: { x: 25, y: 13 }, radius: 2 },
  ],
  guards: [
    {
      name: 'Galileo',
      kind: 'captain',
      start: { x: 7, y: 6 },
      route: [
        { x: 20, y: 6 },
        { x: 20, y: 14 },
        { x: 7, y: 14 },
        { x: 7, y: 6 },
      ],
    },
    {
      name: 'Comet',
      kind: 'sniffer',
      start: { x: 1, y: 7 },
      route: [
        { x: 4, y: 7 },
        { x: 4, y: 8 },
        { x: 1, y: 8 },
        { x: 1, y: 7 },
      ],
    },
    { name: 'Hubble', kind: 'sleepy', start: { x: 11, y: 2 }, route: [{ x: 12, y: 2 }] },
    {
      name: 'Kepler',
      start: { x: 23, y: 7 },
      route: [
        { x: 26, y: 7 },
        { x: 26, y: 12 },
        { x: 23, y: 12 },
        { x: 23, y: 7 },
      ],
    },
    // Halley circles the dome the other way around from Galileo.
    {
      name: 'Halley',
      start: { x: 20, y: 14 },
      route: [
        { x: 20, y: 6 },
        { x: 7, y: 6 },
        { x: 7, y: 14 },
        { x: 20, y: 14 },
      ],
    },
  ],
  cameras: [{ at: { x: 19, y: 2 }, sweep: [4, 3], range: 6 }],
  loot: [{ at: { x: 13, y: 1 }, name: 'Midnight Meteorite', value: 18000, space: 2, category: 'curiosity' }],
};
