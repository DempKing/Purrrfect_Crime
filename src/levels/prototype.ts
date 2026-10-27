// Test levels for the prototype milestones.
import type { LevelDef } from '../core/level';

/** M0 warm-up: two rooms, one guard, one prize, everything lit. */
export const GREY_GALLERY: LevelDef = {
  id: 'm0-grey-gallery',
  name: 'The Grey Gallery',
  objective: 'Steal the Moonstone from its plinth, then slip out through the exit.',
  ambient: 'lit',
  map: [
    '###################',
    '#@.....#..........#',
    '#......#..D....D..#',
    '#......#..........#',
    '#..P...#...P..P...#',
    '#.........#G#.....#',
    '#..D...#..........#',
    '#......#...P..P...#',
    '#......#..........E',
    '#..P...#..D....D..#',
    '#.................#',
    '###################',
  ],
  guards: [
    {
      name: 'Brutus',
      start: { x: 9, y: 3 },
      route: [
        { x: 17, y: 3 },
        { x: 17, y: 8 },
        { x: 9, y: 8 },
        { x: 9, y: 3 },
      ],
    },
  ],
  loot: [{ at: { x: 11, y: 5 }, name: 'Moonstone', value: 5000, space: 2 }],
};

/** M1 stealth sandbox: light and shadow, noise, cameras, lasers, locks, vents and an inventory that fills up. */
export const NIGHT_GALLERY: LevelDef = {
  id: 'm1-night-gallery',
  name: 'The Night Gallery',
  objective: 'Steal what fits in your inventory, ideally the Night Opal, and get out the exit before anyone raises the alarm.',
  ambient: 'dark',
  map: [
    '##C#####################',
    '#.....#..........#.....#',
    '#.....#....G.....#.D.D.#',
    '#.V...+..L...L...#.....#',
    '#.....#,,,,,,,,,,#.....#',
    '#######,,,,,,,,,,+.....#',
    '##...##,P.D,,D.P,#..D..#',
    '##.....,,,,,,,,,,#.....#',
    '##xxx##,,,,L,,,,,#....V#',
    '#F...##,P,,,,,,P,#.....#',
    '##...##,,..D...,,#######',
    '#.....#..........#######',
    '#.....#................#',
    '#.....#................E',
    '#.@.V.#................#',
    '#.....#................#',
    '########################',
  ],
  vents: [
    '',
    '',
    '',
    '  V===',
    '     =',
    '     =',
    '     =',
    '     =',
    '     =                V',
    '     =                =',
    '     =                =',
    '     ==================',
    '     =',
    '     =',
    '    V=',
    '',
    '',
  ],
  lamps: [
    { at: { x: 9, y: 3 }, radius: 2 },
    { at: { x: 13, y: 3 }, radius: 2 },
    { at: { x: 11, y: 8 }, radius: 2 },
  ],
  moonlight: [
    { x: 18, y: 1, w: 5, h: 4 },
    { x: 12, y: 12, w: 7, h: 4 },
  ],
  cameras: [
    { at: { x: 14, y: 1 }, sweep: [3, 2], range: 5 },
    { at: { x: 22, y: 12 }, sweep: [3, 4], range: 5 },
  ],
  guards: [
    {
      name: 'Brutus',
      start: { x: 7, y: 4 },
      route: [
        { x: 16, y: 4 },
        { x: 16, y: 9 },
        { x: 7, y: 9 },
        { x: 7, y: 4 },
      ],
    },
    {
      name: 'Bruno',
      start: { x: 8, y: 13 },
      route: [
        { x: 21, y: 13 },
        { x: 21, y: 15 },
        { x: 8, y: 15 },
        { x: 8, y: 13 },
      ],
    },
  ],
  loot: [
    { at: { x: 11, y: 2 }, name: 'Night Opal', value: 12000, space: 3 },
    { at: { x: 10, y: 6 }, name: 'Gilded Sardine Tin', value: 1500, space: 1 },
    { at: { x: 13, y: 6 }, name: 'Porcelain Mouse', value: 2200, space: 1 },
    { at: { x: 11, y: 10 }, name: 'Golden Yarn Ball', value: 3000, space: 2 },
    { at: { x: 19, y: 2 }, name: 'Ruby Collar', value: 4500, space: 1 },
    { at: { x: 21, y: 2 }, name: 'Antique Pocket Watch', value: 2800, space: 1 },
    { at: { x: 20, y: 6 }, name: 'Jade Fish', value: 3500, space: 2 },
  ],
};

export const LEVELS = [NIGHT_GALLERY, GREY_GALLERY];
