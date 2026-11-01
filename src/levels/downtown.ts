// Downtown (district 5, the last): Robo-Guards, slot machines, conveyor belts, wet paint, a time-locked vault.
import type { LevelDef } from '../core/level';

/**
 * Level 20: The Grand Bank. Prize: Gold Bullion Mouse in the vault (locked door + lasers).
 * Guards: Robo-Guards RX-1 (banking hall) and RX-2 (lobby), Captain Banks, a dozing manager.
 * The fuse box (maintenance room, vent from the lobby) cuts the lasers and both robots.
 */
export const GRAND_BANK: LevelDef = {
  id: 'l20-grand-bank',
  name: 'The Grand Bank',
  tip: 'Robo-Guards never sleep and ignore noises, decoys and empty cases, but their heat scanners see Leo 4 tiles off in any light. They run on the same power as the lasers: cut the fuse box and they stop dead.',
  objective:
    'Get past the Robo-Guards to the vault, take the Gold Bullion Mouse, and leave through the lobby.',
  ambient: 'dim',
  shadows: [
    { x: 1, y: 1, w: 6, h: 3 }, // the maintenance room
    { x: 1, y: 15, w: 3, h: 2 },
    { x: 5, y: 9, w: 6, h: 1 }, // behind the counters
    { x: 17, y: 9, w: 6, h: 1 },
  ],
  xp: 500,
  par: 24,
  rivalEntrances: [
    { x: 26, y: 13 },
    { x: 26, y: 3 },
  ],
  map: [
    '############################',
    '#......###.S.G..S.##..D..D.#',
    'F....V.###xxxxxxxx##....L..#',
    '#......###.D....D.##.......#',
    '###+#########+#########.####',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,P,,,,,,,,,,P,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,hhhhhh,,,,,,hhhhhh,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '#,,,,,,,P,,,,,,,,,,P,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,,,#',
    '######.##############.######',
    '#L...........L.............#',
    '#..........................E',
    '#..........................#',
    '#.@.V.....................L#',
    '############################',
  ],
  vents: [
    '',
    '',
    '     V',
    '     =',
    '     =====',
    '         =',
    '         =',
    '         =',
    '         =',
    '         =',
    '         =',
    '         =',
    '       ===',
    '       =',
    '       =',
    '       =',
    '    V===',
  ],
  lamps: [
    { at: { x: 1, y: 13 }, radius: 2 },
    { at: { x: 26, y: 16 }, radius: 2 },
    { at: { x: 13, y: 13 }, radius: 2 },
    { at: { x: 24, y: 2 }, radius: 2 },
  ],
  guards: [
    {
      name: 'RX-1',
      kind: 'robo',
      start: { x: 2, y: 5 },
      route: [
        { x: 25, y: 5 },
        { x: 25, y: 11 },
        { x: 2, y: 11 },
        { x: 2, y: 5 },
      ],
    },
    {
      name: 'RX-2',
      kind: 'robo',
      start: { x: 25, y: 14 },
      route: [
        { x: 6, y: 14 },
        { x: 25, y: 14 },
      ],
    },
    {
      name: 'Banks',
      kind: 'captain',
      start: { x: 2, y: 7 },
      route: [
        { x: 25, y: 7 },
        { x: 25, y: 9 },
        { x: 2, y: 9 },
        { x: 2, y: 7 },
      ],
    },
    { name: 'The Manager', kind: 'sleepy', start: { x: 21, y: 2 }, route: [{ x: 21, y: 3 }] },
  ],
  loot: [
    { at: { x: 13, y: 1 }, name: 'Gold Bullion Mouse', value: 30000, space: 2, category: 'jewel' },
    { at: { x: 11, y: 1 }, name: 'Deposit Box of Rare Stamps', value: 4800, space: 1, category: 'curiosity' },
    { at: { x: 16, y: 1 }, name: 'Deposit Box of Emeralds', value: 6900, space: 1, category: 'jewel' },
    { at: { x: 11, y: 3 }, name: 'Bearer Bonds', value: 5500, space: 1, category: 'curiosity' },
    { at: { x: 16, y: 3 }, name: 'The Founder’s Gold Watch', value: 3100, space: 1, category: 'artefact' },
    {
      at: { x: 22, y: 1 },
      name: 'Portrait of the Chairman’s Cat',
      value: 4200,
      space: 3,
      category: 'painting',
    },
    { at: { x: 25, y: 1 }, name: 'Silver Fountain Pen', value: 900, space: 1, category: 'artefact' },
  ],
};

/**
 * Level 21: Casino Royale-Paws. Slot machines hide all noise but the floor is bright and watched.
 * Prize: Royal Flush Diamond in the high rollers' room (locked door, Robo-Guard Chip).
 * Guards: Ace (captain), Deuce, two cameras; the croupier dozes by the fuse box.
 */
export const CASINO: LevelDef = {
  id: 'l21-casino',
  name: 'Casino Royale-Paws',
  tip: 'The slot machines jingle so loudly that no guard hears anything Leo does on the casino floor: dash, pick, even smash. They can still see him.',
  objective: 'Take the Royal Flush Diamond from the high rollers’ room and walk out of the front doors.',
  ambient: 'dim',
  loud: [{ x: 1, y: 7, w: 26, h: 9 }],
  shadows: [
    { x: 1, y: 4, w: 3, h: 2 },
    { x: 24, y: 2, w: 2, h: 3 },
    { x: 3, y: 10, w: 9, h: 1 }, // between the rows of machines
    { x: 16, y: 13, w: 9, h: 1 },
  ],
  xp: 520,
  par: 30,
  rivalEntrances: [
    { x: 26, y: 15 },
    { x: 26, y: 1 },
  ],
  map: [
    '############################',
    '#,L,,,,,,,,,L##.D........D.#',
    '#,,,,,,,,,,,,##.....G......#',
    'F,,,P,,,,P,,,##............#',
    '#,,,,,,,,,,,,##............#',
    '#,,,,,,,,,,,,##.D........D.#',
    '######.######C######+#######',
    '#..........................#',
    '#..........................#',
    '#..hhhhhhhhh....hhhhhhhhh..#',
    '#............L.............#',
    '#..........................E',
    '#..hhhhhhhhh....hhhhhhhhh..#',
    '#..........................#',
    '#............L.............#',
    '#.@........................#',
    '############################',
    '############################',
  ],
  lamps: [
    { at: { x: 13, y: 10 }, radius: 5 }, // the great chandeliers
    { at: { x: 2, y: 1 }, radius: 2 },
    { at: { x: 12, y: 1 }, radius: 2 },
    { at: { x: 13, y: 14 }, radius: 5 },
  ],
  cameras: [
    { at: { x: 1, y: 7 }, sweep: [0, 1], range: 6 },
    { at: { x: 26, y: 15 }, sweep: [4, 5], range: 6 },
  ],
  guards: [
    {
      name: 'Ace',
      kind: 'captain',
      start: { x: 2, y: 7 },
      route: [
        { x: 25, y: 7 },
        { x: 25, y: 14 },
        { x: 2, y: 14 },
        { x: 2, y: 7 },
      ],
    },
    {
      name: 'Deuce',
      start: { x: 14, y: 8 },
      route: [
        { x: 14, y: 14 },
        { x: 14, y: 8 },
      ],
    },
    {
      name: 'Chip',
      kind: 'robo',
      start: { x: 17, y: 3 },
      route: [
        { x: 24, y: 3 },
        { x: 17, y: 3 },
      ],
    },
    { name: 'The Croupier', kind: 'sleepy', start: { x: 7, y: 2 }, route: [{ x: 7, y: 3 }] },
  ],
  loot: [
    { at: { x: 20, y: 2 }, name: 'Royal Flush Diamond', value: 32000, space: 1, category: 'jewel' },
    { at: { x: 16, y: 1 }, name: 'Golden Dice', value: 3900, space: 1, category: 'curiosity' },
    { at: { x: 25, y: 1 }, name: 'A Stack of Platinum Chips', value: 6400, space: 1, category: 'curiosity' },
    { at: { x: 16, y: 5 }, name: 'Poker Night (Dogs, Losing)', value: 5200, space: 3, category: 'painting' },
    { at: { x: 25, y: 5 }, name: 'Jewelled Roulette Ball', value: 4700, space: 1, category: 'jewel' },
  ],
};

/**
 * Level 22: The Mint. Three conveyor belts move anyone on them 1 tile per turn.
 * Prize: Golden Coin Die in the die vault (locked door). Guards: Robo-Guards Penny and Nickel,
 * Captain Quarter, Shilling, Florin; the assayer dozes. Fuse box at the east end.
 */
export const MINT: LevelDef = {
  id: 'l22-mint',
  name: 'The Mint',
  tip: 'Conveyor belts carry Leo one tile along at the end of every turn he ends on one: a free, silent move, as long as he’s ready for where it takes him.',
  objective: 'Take the Golden Coin Die from the die vault and get back out through the loading bay.',
  ambient: 'dim',
  shadows: [
    { x: 5, y: 8, w: 3, h: 1 },
    { x: 11, y: 8, w: 3, h: 1 },
    { x: 17, y: 8, w: 3, h: 1 },
    { x: 5, y: 11, w: 3, h: 1 },
    { x: 11, y: 11, w: 3, h: 1 },
    { x: 17, y: 11, w: 3, h: 1 },
    { x: 1, y: 16, w: 3, h: 1 },
  ],
  xp: 540,
  par: 19,
  rivalEntrances: [
    { x: 26, y: 1 },
    { x: 1, y: 1 },
  ],
  map: [
    '############################',
    '#.D.....##.D....D.##.D...D.#',
    '#.......##...G....##.......#',
    '#.......##.D....D.##.......#',
    '####.########+#########.####',
    '#L........................L#',
    '#..>>>>>>>>>>>>>>>>>>>>>>..#',
    '#..>>>>>>>>>>>>>>>>>>>>>>..#',
    '#.....P.....P.....P........#',
    '#..<<<<<<<<<<<<<<<<<<<<<<..F',
    '#..<<<<<<<<<<<<<<<<<<<<<<..#',
    '#.....P.....P.....P........#',
    '#..>>>>>>>>>>>>>>>>>>>>>>..#',
    '#..>>>>>>>>>>>>>>>>>>>>>>..#',
    '#L........................L#',
    '####.#######################',
    'E......@.###################',
    '#........###################',
    '############################',
  ],
  lamps: [
    { at: { x: 1, y: 5 }, radius: 2 },
    { at: { x: 26, y: 5 }, radius: 2 },
    { at: { x: 1, y: 14 }, radius: 2 },
    { at: { x: 26, y: 14 }, radius: 2 },
  ],
  guards: [
    {
      name: 'Penny',
      kind: 'robo',
      start: { x: 2, y: 5 },
      route: [
        { x: 25, y: 5 },
        { x: 2, y: 5 },
      ],
    },
    {
      name: 'Nickel',
      kind: 'robo',
      start: { x: 25, y: 14 },
      route: [
        { x: 2, y: 14 },
        { x: 25, y: 14 },
      ],
    },
    {
      name: 'Quarter',
      kind: 'captain',
      start: { x: 1, y: 8 },
      route: [
        { x: 26, y: 8 },
        { x: 1, y: 8 },
      ],
    },
    {
      name: 'Shilling',
      start: { x: 26, y: 11 },
      route: [
        { x: 1, y: 11 },
        { x: 26, y: 11 },
      ],
    },
    // Florin walks up and down across the belts.
    {
      name: 'Florin',
      start: { x: 9, y: 5 },
      route: [
        { x: 9, y: 14 },
        { x: 9, y: 5 },
      ],
    },
    { name: 'The Assayer', kind: 'sleepy', start: { x: 4, y: 2 }, route: [{ x: 4, y: 3 }] },
  ],
  loot: [
    { at: { x: 13, y: 2 }, name: 'Golden Coin Die', value: 34000, space: 1, category: 'artefact' },
    {
      at: { x: 11, y: 1 },
      name: 'Proof Set of the Year of the Cat',
      value: 5600,
      space: 1,
      category: 'curiosity',
    },
    {
      at: { x: 16, y: 1 },
      name: 'The Misprinted Mouse Dollar',
      value: 7200,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 11, y: 3 }, name: 'Gold Planchets', value: 4300, space: 2, category: 'jewel' },
    { at: { x: 16, y: 3 }, name: 'Engraver’s Original Drawing', value: 3800, space: 2, category: 'painting' },
    { at: { x: 2, y: 1 }, name: 'Assay Scales', value: 1300, space: 2, category: 'artefact' },
    {
      at: { x: 21, y: 1 },
      name: 'Bag of Freshly Minted Coins',
      value: 2500,
      space: 2,
      category: 'curiosity',
    },
    {
      at: { x: 25, y: 1 },
      name: 'Coin Counting Machine Handle',
      value: 400,
      space: 1,
      category: 'curiosity',
    },
  ],
};

/**
 * Level 23: Museum of Modern Mischief. A whoopee-cushion floor (loud), and wet paint that leaves
 * paw prints guards follow. Prize: Prank of the Century, guarded by Robo-Guard Warhol.
 * Guards: Frida (sniffer), Captain Pollock, Banksy; Basquiat dozes.
 */
export const MISCHIEF: LevelDef = {
  id: 'l23-mischief',
  name: 'The Museum of Modern Mischief',
  tip: 'Wet paint: step in it and Leo leaves red paw prints for his next four steps. A guard who sees them goes to follow them; they dry after four turns.',
  objective: 'Take the Prank of the Century from the top gallery and leave by the fire door.',
  ambient: 'dim',
  shadows: [
    { x: 1, y: 15, w: 3, h: 2 },
    { x: 7, y: 8, w: 1, h: 1 },
    { x: 12, y: 9, w: 1, h: 1 },
    { x: 20, y: 9, w: 1, h: 1 },
    { x: 1, y: 1, w: 1, h: 4 },
  ],
  xp: 560,
  par: 18,
  rivalEntrances: [
    { x: 26, y: 13 },
    { x: 1, y: 1 },
  ],
  map: [
    '############################',
    '#.D..D.#,D,,,,,,,,D,#.D..D.#',
    '#.......,,L,,G,,,L,,.......#',
    '#......#,,,,,,,,,,,,#......E',
    '#......#,D,,,,,,,,D,#......#',
    '####.########.#########+####',
    '#..........................#',
    '#..%%.......%%.P....%%.....#',
    '#.....P......%.............#',
    '#.%.....%%.P.....%.P....%..#',
    '#%%%%%%%%%%%%%%%%%%%%%P%%%%#',
    '#%%%%%%%%%%%%%%%%%%%%%%%%%%#',
    '######.###########F#.#######',
    '#L.........................#',
    '#.......~~~~~~~~~~~........#',
    '#..........................#',
    '#.@.......................L#',
    '############################',
  ],
  lamps: [
    { at: { x: 10, y: 2 }, radius: 2 },
    { at: { x: 17, y: 2 }, radius: 2 },
    { at: { x: 1, y: 13 }, radius: 2 },
    { at: { x: 26, y: 16 }, radius: 2 },
  ],
  guards: [
    {
      name: 'Warhol',
      kind: 'robo',
      start: { x: 8, y: 3 },
      route: [
        { x: 15, y: 3 },
        { x: 8, y: 3 },
      ],
    },
    {
      name: 'Pollock',
      kind: 'captain',
      start: { x: 1, y: 6 },
      route: [
        { x: 26, y: 6 },
        { x: 26, y: 9 },
        { x: 1, y: 9 },
        { x: 1, y: 6 },
      ],
    },
    {
      name: 'Banksy',
      start: { x: 14, y: 6 },
      route: [
        { x: 14, y: 9 },
        { x: 14, y: 6 },
      ],
    },
    {
      name: 'Frida',
      kind: 'sniffer',
      start: { x: 25, y: 15 },
      route: [
        { x: 5, y: 15 },
        { x: 25, y: 15 },
      ],
    },
    { name: 'Basquiat', kind: 'sleepy', start: { x: 24, y: 3 }, route: [{ x: 24, y: 2 }] },
  ],
  loot: [
    { at: { x: 13, y: 2 }, name: 'The Prank of the Century', value: 36000, space: 3, category: 'painting' },
    { at: { x: 9, y: 1 }, name: 'A Banana Taped to a Fish', value: 6100, space: 1, category: 'curiosity' },
    { at: { x: 18, y: 1 }, name: 'Unmade Cat Bed', value: 4300, space: 3, category: 'artefact' },
    { at: { x: 9, y: 4 }, name: 'Invisible Painting', value: 5000, space: 1, category: 'painting' },
    { at: { x: 18, y: 4 }, name: 'Glass Whoopee Cushion', value: 2800, space: 1, category: 'curiosity' },
    { at: { x: 2, y: 1 }, name: 'Balloon Mouse (Gold)', value: 4700, space: 2, category: 'artefact' },
    { at: { x: 5, y: 1 }, name: 'Soup Can, Signed', value: 1900, space: 1, category: 'curiosity' },
    {
      at: { x: 22, y: 1 },
      name: 'Tape of a Cat Watching Television',
      value: 1200,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 25, y: 1 }, name: 'Neon Sign: MEOW', value: 2600, space: 2, category: 'artefact' },
  ],
};

/**
 * Level 24: City Hall treasury (end of Downtown). Prize: Key to the City in a time-locked vault
 * (dials won't turn before turn 12), behind lasers and Robo-Guard Bylaw. Combination in the mayor's desk.
 * Guards: secretary (dozing), clerk (sniffer), Alderman (captain), usher.
 */
export const TREASURY: LevelDef = {
  id: 'l24-treasury',
  name: 'City Hall Treasury',
  tip: 'The treasury has a time lock: even with the combination, the dials won’t turn before turn 12 (the HUD says when). Find somewhere to wait.',
  objective: 'Open the time-locked treasury, take the Key to the City, and leave by the clock tower stairs.',
  ambient: 'dim',
  timeLock: 12,
  shadows: [
    { x: 1, y: 15, w: 2, h: 2 },
    { x: 11, y: 14, w: 2, h: 3 },
    { x: 14, y: 13, w: 2, h: 2 },
    { x: 1, y: 3, w: 2, h: 2 },
    { x: 9, y: 4, w: 3, h: 1 },
    { x: 7, y: 8, w: 1, h: 2 },
    { x: 19, y: 8, w: 1, h: 2 },
  ],
  xp: 600,
  par: 34,
  rivalEntrances: [
    { x: 26, y: 13 },
    { x: 1, y: 1 },
  ],
  map: [
    '############################',
    '#.....D.#.S....S.##.D....D.#',
    '#.N.....F........##...G....#',
    '#.......#........##........#',
    '#.......#........##.D....D.#',
    '####+#######.#########Q#####',
    '#L,,,,,,,,,,,,,,,,,,xxxxx,L#',
    '#,,,,,,,P,,,,,,,,,P,,,,,,,,#',
    '#,,,,,,,,,,,,P,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,P,,,,,,,,,,,,,#',
    '#,,,,,,,P,,,,,,,,,P,,,,,,,,#',
    '#L,,,,,,,,,,,,,,,,,,,,,,,,L#',
    '#####.################.#####',
    'E...........L#.............#',
    '#..hhhhhhhh..#.............#',
    '#............+.............#',
    '#..hhhhhhhh..#L..........@.#',
    '############################',
  ],
  lamps: [
    { at: { x: 1, y: 6 }, radius: 2 },
    { at: { x: 26, y: 6 }, radius: 2 },
    { at: { x: 1, y: 11 }, radius: 2 },
    { at: { x: 26, y: 11 }, radius: 2 },
    { at: { x: 12, y: 13 }, radius: 2 },
    { at: { x: 14, y: 16 }, radius: 2 },
  ],
  guards: [
    {
      name: 'Alderman',
      kind: 'captain',
      start: { x: 2, y: 7 },
      route: [
        { x: 25, y: 7 },
        { x: 25, y: 10 },
        { x: 2, y: 10 },
        { x: 2, y: 7 },
      ],
    },
    {
      name: 'Bylaw',
      kind: 'robo',
      start: { x: 19, y: 6 },
      route: [
        { x: 25, y: 6 },
        { x: 19, y: 6 },
      ],
    },
    {
      name: 'The Clerk',
      kind: 'sniffer',
      start: { x: 10, y: 3 },
      route: [
        { x: 16, y: 3 },
        { x: 10, y: 3 },
      ],
    },
    { name: 'The Secretary', kind: 'sleepy', start: { x: 5, y: 3 }, route: [{ x: 5, y: 2 }] },
    {
      name: 'The Usher',
      start: { x: 15, y: 13 },
      route: [
        { x: 25, y: 13 },
        { x: 15, y: 13 },
      ],
    },
  ],
  loot: [
    { at: { x: 22, y: 2 }, name: 'Key to the City', value: 40000, space: 1, category: 'artefact' },
    {
      at: { x: 20, y: 1 },
      name: 'The City’s Gold Reserve (One Bar)',
      value: 8000,
      space: 2,
      category: 'jewel',
    },
    { at: { x: 25, y: 1 }, name: 'The Founding Charter', value: 6500, space: 2, category: 'painting' },
    { at: { x: 20, y: 4 }, name: 'Ceremonial Mayoral Chain', value: 5400, space: 1, category: 'jewel' },
    {
      at: { x: 25, y: 4 },
      name: 'Time Capsule (Never Opened)',
      value: 3000,
      space: 3,
      category: 'curiosity',
    },
    {
      at: { x: 10, y: 1 },
      name: 'Sealed Records: The Fish Scandal',
      value: 3500,
      space: 1,
      category: 'curiosity',
    },
    { at: { x: 15, y: 1 }, name: 'Parking Fines Petty Cash', value: 1800, space: 1, category: 'curiosity' },
    { at: { x: 6, y: 1 }, name: 'The Mayor’s Lucky Fish', value: 1200, space: 1, category: 'artefact' },
  ],
};
