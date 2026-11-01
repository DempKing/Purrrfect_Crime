// Level 0: the tutorial. One room per lesson: moving and the camera, light and guards, a sweeping camera,
// crawling through a vent, then picking a lock and taking the centerpiece.
import type { LevelDef } from '../core/level';

export const CORNER_GALLERY: LevelDef = {
  id: 'l0-corner-gallery',
  name: 'The Corner Gallery',
  objective: 'Steal the Moonlit Pearl and anything else that fits, then slip out the side door.',
  ambient: 'dark',
  xp: 60,
  par: 18,
  map: [
    '######################',
    '#....#..L........,,,.#',
    '#.@..............,,,.#',
    '#....#...........,,,.#',
    '#....#...........,,,.#',
    '##################..##',
    '#........#########..C#',
    '#.D...D..######F##..##',
    '#........#####.......#',
    '#...G....#####.......#',
    '#..........xx........#',
    'E......V...xx..V.....#',
    '#........#####.......#',
    '######################',
  ],
  vents: ['', '', '', '', '', '', '', '', '', '', '', '       V=======V'],
  lamps: [{ at: { x: 8, y: 1 }, radius: 2 }],
  moonlight: [
    { x: 11, y: 1, w: 5, h: 2 }, // skylight over the middle of the hall; the far wall stays dark
    { x: 18, y: 5, w: 2, h: 3 }, // the corridor
    { x: 14, y: 8, w: 7, h: 5 }, // the storeroom
    { x: 2, y: 8, w: 5, h: 3 }, // the gallery, around the pearl
  ],
  // Watches the corridor on odd turns and the storeroom on even ones.
  cameras: [{ at: { x: 19, y: 8 }, sweep: [6, 2], range: 5 }],
  guards: [
    {
      name: 'Gus',
      start: { x: 8, y: 3 },
      route: [
        { x: 16, y: 3 },
        { x: 16, y: 2 },
        { x: 7, y: 2 },
        { x: 7, y: 3 },
      ],
    },
  ],
  loot: [
    { at: { x: 4, y: 9 }, name: 'Moonlit Pearl', value: 2400, space: 2, category: 'jewel' },
    { at: { x: 2, y: 7 }, name: 'Silver Sardine Brooch', value: 650, space: 1, category: 'jewel' },
    { at: { x: 6, y: 7 }, name: 'Tiny Bronze Mouse', value: 450, space: 1, category: 'artifact' },
  ],
};
