// Harbor (district 4): crates to hide in, a lighthouse, the tide, the fish market, light switches.
import type { LevelDef } from '../core/level';

/**
 * Level 15: Customs warehouse. Crate stacks and open crates to hide in.
 * Prize: Smuggler's Jade Cat in the seized-goods cage (locked door, camera).
 * Guards: Snout (sniffer), Captain Haddock, Tally, Stamp; the clerk dozes.
 */
export const CUSTOMS_WAREHOUSE: LevelDef = {
  id: 'l15-customs',
  name: 'The Customs Warehouse',
  tip: 'Open crates: climb into one and nobody can see or smell Leo, not even a guard standing next to it. Climbing back out is another matter.',
  objective:
    'Get into the seized-goods cage, take the Smuggler’s Jade Cat, and slip out at the far end of the loading dock.',
  // Night lights all over the floor; only behind the stacks is it properly dark.
  ambient: 'dim',
  shadows: [
    { x: 3, y: 8, w: 4, h: 1 },
    { x: 19, y: 11, w: 5, h: 1 },
    { x: 10, y: 5, w: 2, h: 1 }, // under the cage's overhang
    { x: 1, y: 16, w: 3, h: 1 },
  ],
  xp: 400,
  par: 30,
  rivalEntrances: [
    { x: 26, y: 15 },
    { x: 22, y: 1 },
  ],
  map: [
    '############################',
    '########.D...D.#.....S.#####',
    '########...G...#.......#####',
    '########.D...D.#.......#####',
    '###########+#######.#####C##',
    '#L........................L#',
    '#...........O..............#',
    '#..YYY.YYYY..YYYYY.YYYYY...#',
    '#.O.....................O..#',
    '#...........L..............#',
    '#..YYYYYY.Y..YYYYYYY.YYY...#',
    '#......O...................#',
    '#...............O........O.#',
    '#..........................#',
    '####.#######.########.######',
    'E....O.....................#',
    '#..............O...L.....@.#',
    '############################',
  ],
  lamps: [
    { at: { x: 1, y: 5 }, radius: 2 },
    { at: { x: 26, y: 5 }, radius: 2 },
    { at: { x: 12, y: 9 }, radius: 2 },
    { at: { x: 19, y: 16 }, radius: 2 },
  ],
  moonlight: [
    { x: 5, y: 8, w: 4, h: 2 },
    { x: 17, y: 11, w: 4, h: 2 },
    { x: 8, y: 1, w: 7, h: 3 },
  ],
  cameras: [{ at: { x: 14, y: 5 }, sweep: [4, 3], range: 5 }],
  guards: [
    {
      name: 'Haddock',
      kind: 'captain',
      start: { x: 3, y: 8 },
      route: [
        { x: 25, y: 8 },
        { x: 3, y: 8 },
      ],
    },
    {
      name: 'Tally',
      start: { x: 1, y: 13 },
      route: [
        { x: 26, y: 13 },
        { x: 26, y: 11 },
        { x: 1, y: 11 },
        { x: 1, y: 13 },
      ],
    },
    {
      name: 'Stamp',
      start: { x: 2, y: 5 },
      route: [
        { x: 25, y: 5 },
        { x: 2, y: 5 },
      ],
    },
    {
      name: 'Snout',
      kind: 'sniffer',
      start: { x: 1, y: 15 },
      route: [
        { x: 26, y: 15 },
        { x: 1, y: 15 },
      ],
    },
    { name: 'The Clerk', kind: 'sleepy', start: { x: 18, y: 2 }, route: [{ x: 18, y: 3 }] },
  ],
  loot: [
    { at: { x: 11, y: 2 }, name: 'Smuggler’s Jade Cat', value: 21000, space: 2, category: 'artifact' },
    { at: { x: 9, y: 1 }, name: 'Crate of Contraband Caviar', value: 2400, space: 2, category: 'curiosity' },
    { at: { x: 13, y: 1 }, name: 'Undeclared Diamonds', value: 5600, space: 1, category: 'jewel' },
    { at: { x: 9, y: 3 }, name: 'Forged Old Master', value: 3100, space: 3, category: 'painting' },
    { at: { x: 13, y: 3 }, name: 'Ivory-Free Netsuke', value: 1900, space: 1, category: 'artifact' },
    { at: { x: 21, y: 1 }, name: 'The Customs Petty Cash', value: 1500, space: 1, category: 'curiosity' },
  ],
};

/**
 * Level 16: The lighthouse. Its beam sweeps the courtyard 1/8 turn per turn.
 * Prize: Golden Lantern in the lens gallery (locked door, camera). Guards: Gull, Kipper (sniffer),
 * Captain Mariner; Pearl and the keeper doze. A tunnel runs from the boathouse to the cottage.
 */
export const LIGHTHOUSE: LevelDef = {
  id: 'l16-lighthouse',
  name: 'The Lighthouse Collection',
  tip: 'The lighthouse beam sweeps the courtyard, a wedge of bright light that turns an eighth of the way around each turn. Cross behind it.',
  objective:
    'Cross the headland to the lens gallery, take the Golden Lantern, and leave through the gift shop.',
  // A moonlit headland: dark only in the lee of the boulders, and indoors.
  ambient: 'dark',
  moonlight: [
    { x: 1, y: 5, w: 26, h: 1 },
    { x: 1, y: 8, w: 26, h: 2 },
    { x: 1, y: 12, w: 26, h: 1 },
    { x: 1, y: 6, w: 7, h: 2 },
    { x: 11, y: 6, w: 6, h: 2 },
    { x: 22, y: 6, w: 5, h: 2 },
    { x: 1, y: 10, w: 4, h: 2 },
    { x: 12, y: 10, w: 4, h: 2 },
    { x: 23, y: 10, w: 4, h: 2 },
  ],
  xp: 420,
  par: 19,
  beacon: { at: { x: 13, y: 8 }, range: 11, facing: 0 },
  rivalEntrances: [
    { x: 26, y: 5 },
    { x: 1, y: 12 },
  ],
  map: [
    '############################',
    '#.D....D.########.D.......D#',
    '#........########L....G....#',
    '#V......L########.D.......D#',
    '#####.####C##########+######',
    '#......................L...#',
    '#........P........P........#',
    '#....P..............P......#',
    '#............P.............#',
    '#..........................#',
    '#.....P..............P.....#',
    '#.........P......P.........#',
    '#..........................#',
    '####.#################.#####',
    '#.........L######.......D..#',
    '#..........######..........E',
    '#.@.....V..######..D......L#',
    '############################',
  ],
  vents: [
    '',
    '',
    '',
    ' V',
    ' ===========',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '           =',
    '        V===',
  ],
  lamps: [
    { at: { x: 8, y: 3 }, radius: 2 },
    { at: { x: 17, y: 2 }, radius: 2 },
    { at: { x: 10, y: 14 }, radius: 2 },
    { at: { x: 26, y: 16 }, radius: 2 },
    { at: { x: 23, y: 5 }, radius: 2 }, // a lantern by the gallery door
  ],
  cameras: [{ at: { x: 25, y: 3 }, sweep: [5, 4], range: 5 }],
  guards: [
    // Gull and Kipper circle the courtyard in opposite directions; Mariner crosses it.
    {
      name: 'Gull',
      start: { x: 1, y: 12 },
      route: [
        { x: 26, y: 12 },
        { x: 26, y: 5 },
        { x: 1, y: 5 },
        { x: 1, y: 12 },
      ],
    },
    {
      name: 'Kipper',
      kind: 'sniffer',
      start: { x: 26, y: 5 },
      route: [
        { x: 26, y: 12 },
        { x: 1, y: 12 },
        { x: 1, y: 5 },
        { x: 26, y: 5 },
      ],
    },
    {
      name: 'Mariner',
      kind: 'captain',
      start: { x: 4, y: 9 },
      route: [
        { x: 23, y: 9 },
        { x: 4, y: 9 },
      ],
    },
    { name: 'Pearl', kind: 'sleepy', start: { x: 24, y: 2 }, route: [{ x: 24, y: 1 }] },
    { name: 'The Keeper', kind: 'sleepy', start: { x: 4, y: 2 }, route: [{ x: 4, y: 3 }] },
  ],
  loot: [
    { at: { x: 22, y: 2 }, name: 'Golden Lantern', value: 23000, space: 2, category: 'artifact' },
    { at: { x: 18, y: 1 }, name: 'Brass Fresnel Lens', value: 3800, space: 2, category: 'artifact' },
    { at: { x: 26, y: 1 }, name: 'Shipwreck Silver', value: 4200, space: 1, category: 'jewel' },
    { at: { x: 18, y: 3 }, name: 'Storm at Sea, in Oils', value: 5100, space: 3, category: 'painting' },
    { at: { x: 26, y: 3 }, name: 'Mermaid Figurehead (Small)', value: 2600, space: 2, category: 'curiosity' },
    { at: { x: 2, y: 1 }, name: 'The Keeper’s Logbook', value: 900, space: 1, category: 'curiosity' },
    { at: { x: 7, y: 1 }, name: 'Pewter Fish Tankard', value: 700, space: 1, category: 'curiosity' },
    {
      at: { x: 19, y: 16 },
      name: 'Snow Globe of the Lighthouse',
      value: 150,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 24, y: 14 }, name: 'Gift Shop Takings', value: 1200, space: 1, category: 'curiosity' },
  ],
};

/**
 * Level 17: The Shipwreck Museum. Tidal sand around the wreck: 3 turns flooded, 3 dry.
 * Prize: Captain's Pearl on the wreck, beside dozing Davy Jones.
 * Guards: Captain Nemo (ledge), Shelly (sniffer), Ahab and Marlin upstairs.
 */
export const SHIPWRECK: LevelDef = {
  id: 'l17-shipwreck',
  name: 'The Shipwreck Museum',
  tip: 'The tide: the sand around the wreck is under water for three turns, then dry for three (the HUD counts down). Don’t get stranded on the wreck.',
  objective:
    'Cross the sand at low tide to the wreck, take the Captain’s Pearl, then get up through the museum to the front door.',
  ambient: 'dark',
  gaps: 'water',
  tide: { period: 3, high: true },
  xp: 440,
  par: 22,
  rivalEntrances: [
    { x: 2, y: 16 },
    { x: 26, y: 1 },
  ],
  map: [
    '############################',
    '#.D...D...D..#..D...D...D..#',
    'E............#.............#',
    '#............+.............#',
    '#............#.............#',
    '#.......L....#.....L.......#',
    '###.####################.###',
    '##.......L........L.......##',
    '##...tttttttttttttttttt...##',
    '##...tttttttttttttttttt...##',
    '##...tttttP......Pttttt...##',
    '##...ttttt...G....ttttt...##',
    '##...ttttt.D....D.ttttt...##',
    '##...tttttP......Pttttt...##',
    '##...tttttttttttttttttt...##',
    '##...tttttttttttttttttt...##',
    '##...tttttttttttttttttt..@##',
    '############################',
  ],
  // Moonlight pours in at the cave mouth, over the sand and the wreck.
  moonlight: [{ x: 5, y: 8, w: 18, h: 9 }],
  lamps: [
    { at: { x: 8, y: 5 }, radius: 2 },
    { at: { x: 19, y: 5 }, radius: 2 },
    { at: { x: 9, y: 7 }, radius: 2 },
    { at: { x: 18, y: 7 }, radius: 2 },
  ],
  guards: [
    {
      name: 'Nemo',
      kind: 'captain',
      start: { x: 2, y: 7 },
      route: [
        { x: 25, y: 7 },
        { x: 2, y: 7 },
      ],
    },
    {
      name: 'Shelly',
      kind: 'sniffer',
      start: { x: 24, y: 8 },
      route: [
        { x: 24, y: 12 },
        { x: 24, y: 8 },
      ],
    },
    { name: 'Davy Jones', kind: 'sleepy', start: { x: 15, y: 11 }, route: [{ x: 15, y: 12 }] },
    {
      name: 'Ahab',
      start: { x: 1, y: 2 },
      route: [
        { x: 12, y: 2 },
        { x: 12, y: 4 },
        { x: 1, y: 4 },
        { x: 1, y: 2 },
      ],
    },
    {
      name: 'Marlin',
      start: { x: 15, y: 2 },
      route: [
        { x: 25, y: 2 },
        { x: 25, y: 4 },
        { x: 15, y: 4 },
        { x: 15, y: 2 },
      ],
    },
  ],
  loot: [
    { at: { x: 13, y: 11 }, name: 'Captain’s Pearl', value: 24000, space: 1, category: 'jewel' },
    { at: { x: 11, y: 12 }, name: 'Barnacled Doubloons', value: 3400, space: 2, category: 'curiosity' },
    { at: { x: 16, y: 12 }, name: 'The Ship’s Bell', value: 2900, space: 3, category: 'artifact' },
    { at: { x: 2, y: 1 }, name: 'Message in a Bottle', value: 800, space: 1, category: 'curiosity' },
    { at: { x: 6, y: 1 }, name: 'Pirate Cat’s Eyepatch', value: 1500, space: 1, category: 'curiosity' },
    {
      at: { x: 10, y: 1 },
      name: 'Sea Chart of the Fishbone Isles',
      value: 3600,
      space: 2,
      category: 'painting',
    },
    { at: { x: 16, y: 1 }, name: 'Coral Crown', value: 4400, space: 2, category: 'jewel' },
    { at: { x: 20, y: 1 }, name: 'Sextant of Admiral Whiskers', value: 2700, space: 1, category: 'artifact' },
    { at: { x: 24, y: 1 }, name: 'Kraken Ink Drawing', value: 3900, space: 2, category: 'painting' },
  ],
};

/**
 * Level 18: First Fishermen's Bank. The fish market floor hides Leo's scent from sniffers.
 * Prize: Golden Sardine in the vault (combination in the manager's desk, behind a locked door).
 * Guards: Trout, Pike and Perch (sniffers), a camera on the vault; the teller dozes.
 */
export const FISH_BANK: LevelDef = {
  id: 'l18-fish-bank',
  name: 'The Fish Market Bank',
  tip: 'The fish market floor (it shimmers green) smells so strongly of fish that sniffers can’t smell Leo there. Upstairs in the bank, they can.',
  objective:
    'Find the vault combination in the manager’s office, take the Golden Sardine from the vault, and leave through the fish market.',
  ambient: 'dark',
  fishy: [{ x: 1, y: 11, w: 26, h: 6 }],
  xp: 460,
  par: 26,
  rivalEntrances: [
    { x: 26, y: 11 },
    { x: 26, y: 3 },
  ],
  map: [
    '############################',
    '#.......##.S....S.#.D..D..D#',
    '#.N.....##...G....#........#',
    '#.......##........#........#',
    '####+####C###Q########.#####',
    '#L,,,,,,,,,,,,,,,,,,,,,,,,L#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,P,,,,P,,,,,,P,,,,P,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '######.##############.######',
    '#..........................#',
    '#...hhhhh...hhhh...hhhhh...#',
    '#.........L................#',
    '#................L.........E',
    '#...hhhhh...hhhh...hhhhh...#',
    '#.@........................#',
    '############################',
  ],
  // Moonlight through the banking hall's tall windows, except in the vault's archway.
  moonlight: [
    { x: 1, y: 6, w: 26, h: 4 },
    { x: 1, y: 5, w: 11, h: 1 },
    { x: 15, y: 5, w: 12, h: 1 },
  ],
  lamps: [
    { at: { x: 1, y: 5 }, radius: 2 },
    { at: { x: 26, y: 5 }, radius: 2 },
    { at: { x: 10, y: 13 }, radius: 2 },
    { at: { x: 17, y: 14 }, radius: 2 },
  ],
  cameras: [{ at: { x: 17, y: 5 }, sweep: [4, 2], range: 5 }],
  guards: [
    {
      name: 'Trout',
      kind: 'sniffer',
      start: { x: 2, y: 13 },
      route: [
        { x: 25, y: 13 },
        { x: 25, y: 14 },
        { x: 2, y: 14 },
        { x: 2, y: 13 },
      ],
    },
    {
      name: 'Pike',
      kind: 'sniffer',
      start: { x: 1, y: 8 },
      route: [
        { x: 12, y: 8 },
        { x: 12, y: 6 },
        { x: 1, y: 6 },
        { x: 1, y: 8 },
      ],
    },
    {
      name: 'Perch',
      kind: 'sniffer',
      start: { x: 26, y: 8 },
      route: [
        { x: 15, y: 8 },
        { x: 15, y: 6 },
        { x: 26, y: 6 },
        { x: 26, y: 8 },
      ],
    },
    { name: 'The Night Teller', kind: 'sleepy', start: { x: 22, y: 2 }, route: [{ x: 22, y: 3 }] },
  ],
  loot: [
    { at: { x: 13, y: 2 }, name: 'Golden Sardine', value: 26000, space: 1, category: 'jewel' },
    { at: { x: 11, y: 1 }, name: 'Safe-Deposit Box 7: Pearls', value: 5200, space: 1, category: 'jewel' },
    { at: { x: 16, y: 1 }, name: 'Safe-Deposit Box 9: Bonds', value: 4600, space: 1, category: 'curiosity' },
    {
      at: { x: 20, y: 1 },
      name: 'Bag of Gold Fish-Scale Coins',
      value: 2300,
      space: 2,
      category: 'curiosity',
    },
    { at: { x: 23, y: 1 }, name: 'Silver Herring Paperweight', value: 1100, space: 1, category: 'artifact' },
    {
      at: { x: 26, y: 1 },
      name: 'Portrait of the Founding Fishmonger',
      value: 3700,
      space: 3,
      category: 'painting',
    },
  ],
};

/**
 * Level 19: The aquarium (end of the Harbor). Bright chandeliers around the great tank.
 * Prize: Narwhal Tiara in the VIP lounge (locked door, camera). Guards: Finn, Admiral (captain),
 * Marina, Gill (sniffer), Reef. Light switches: the nearest guard comes to turn them back on.
 */
export const AQUARIUM: LevelDef = {
  id: 'l19-aquarium',
  name: 'The Aquarium Gala',
  tip: 'Light switches: switch the lamps off and the room goes dark, but the nearest guard heads straight for the switch to put them back on.',
  objective: 'Take the Narwhal Tiara from the VIP lounge and slip out through the shark tunnel.',
  ambient: 'dark',
  gaps: 'water',
  xp: 480,
  par: 50,
  rivalEntrances: [
    { x: 26, y: 16 },
    { x: 26, y: 5 },
  ],
  map: [
    '############################',
    '#||||||||||||##.D.........D#',
    'E............##..L....G..L.#',
    '#............##.D.........D#',
    '#####.##############+#####W#',
    '#..........................#',
    '#...L..................L...#',
    '#........||||||||||........#',
    '#........|________|........#',
    'W........|________|........#',
    '#........||||||||||........#',
    '#...L..................L...#',
    '#..........................#',
    '###C##.##############.######',
    '#..D.........L..........D..#',
    '#..........................#',
    '#............@.............#',
    '############################',
  ],
  lamps: [
    { at: { x: 4, y: 6 }, radius: 3 },
    { at: { x: 23, y: 6 }, radius: 3 },
    { at: { x: 4, y: 11 }, radius: 3 },
    { at: { x: 23, y: 11 }, radius: 3 },
    { at: { x: 17, y: 2 }, radius: 2 },
    { at: { x: 25, y: 2 }, radius: 2 },
    { at: { x: 13, y: 14 }, radius: 2 },
  ],
  // The tank glows blue: dim light all around it.
  moonlight: [
    { x: 8, y: 6, w: 12, h: 6 },
    { x: 1, y: 2, w: 12, h: 2 },
  ],
  cameras: [{ at: { x: 24, y: 3 }, sweep: [4, 5], range: 5 }],
  switches: [
    { at: { x: 0, y: 9 }, lamps: [0, 1, 2, 3] },
    { at: { x: 26, y: 4 }, lamps: [4, 5] },
  ],
  guards: [
    {
      name: 'Admiral',
      kind: 'captain',
      start: { x: 8, y: 6 },
      route: [
        { x: 19, y: 6 },
        { x: 19, y: 11 },
        { x: 8, y: 11 },
        { x: 8, y: 6 },
      ],
    },
    {
      name: 'Marina',
      start: { x: 25, y: 5 },
      route: [
        { x: 25, y: 12 },
        { x: 25, y: 5 },
      ],
    },
    {
      name: 'Finn',
      start: { x: 1, y: 15 },
      route: [
        { x: 26, y: 15 },
        { x: 1, y: 15 },
      ],
    },
    {
      name: 'Gill',
      kind: 'sniffer',
      start: { x: 2, y: 12 },
      route: [
        { x: 25, y: 12 },
        { x: 2, y: 12 },
      ],
    },
    {
      name: 'Reef',
      start: { x: 1, y: 3 },
      route: [
        { x: 12, y: 3 },
        { x: 1, y: 3 },
      ],
    },
  ],
  loot: [
    { at: { x: 22, y: 2 }, name: 'Narwhal Tiara', value: 28000, space: 1, category: 'jewel' },
    { at: { x: 16, y: 1 }, name: 'Black Pearl Cufflinks', value: 4100, space: 1, category: 'jewel' },
    {
      at: { x: 26, y: 1 },
      name: 'Gala Raffle Prize: a Golden Goldfish',
      value: 3300,
      space: 1,
      category: 'curiosity',
    },
    {
      at: { x: 16, y: 3 },
      name: 'Ice Sculpture Mold of a Whale',
      value: 1200,
      space: 3,
      category: 'curiosity',
    },
    { at: { x: 26, y: 3 }, name: 'Underwater Sunset, in Oils', value: 5800, space: 3, category: 'painting' },
    { at: { x: 3, y: 14 }, name: 'Coat-Check Mink Stole', value: 2600, space: 2, category: 'curiosity' },
    { at: { x: 24, y: 14 }, name: 'The Gala’s Donations Box', value: 3900, space: 2, category: 'curiosity' },
  ],
};
